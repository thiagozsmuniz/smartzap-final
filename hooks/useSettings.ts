import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { settingsService } from '../services/settingsService';
import { AppSettings } from '../types';
import { useAccountLimits } from './useAccountLimits';
import {
  checkAccountHealth,
  quickHealthCheck,
  getHealthSummary,
  type AccountHealth
} from '../lib/account-health';
import { Database, Zap, MessageSquare, Bot } from 'lucide-react';
import React from 'react';
import { SetupStep } from '../components/features/settings/SetupWizardView';

interface WebhookInfo {
  webhookUrl: string;
  webhookToken: string;
  stats: {
    lastEventAt: string | null;
    todayDelivered: number;
    todayRead: number;
    todayFailed: number;
  } | null;
}

interface WebhookSubscriptionStatus {
  ok: boolean;
  wabaId?: string;
  messagesSubscribed?: boolean;
  subscribedFields?: string[];
  apps?: Array<{ id?: string; name?: string; subscribed_fields?: string[] }>;
  error?: string;
  details?: unknown;
}

// System health status
interface HealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    database: {
      status: 'ok' | 'error' | 'not_configured';
      provider?: 'supabase' | 'none';
      latency?: number;
      message?: string;
    };
    qstash: {
      status: 'ok' | 'error' | 'not_configured';
      message?: string;
    };
    whatsapp: {
      status: 'ok' | 'error' | 'not_configured';
      source?: 'db' | 'env' | 'none';
      phoneNumber?: string;
      message?: string;
    };
  };
  // Vercel project info for dynamic linking
  vercel?: {
    dashboardUrl: string | null;
    storesUrl: string | null;
    env: string;
  };
  timestamp: string;
}

// Phone number from Meta API
export interface PhoneNumber {
  id: string;
  display_phone_number: string;
  verified_name?: string;
  quality_rating?: string;
  webhook_configuration?: {
    phone_number?: string;
    whatsapp_business_account?: string;
    application?: string;
  };
}

// Domain option for webhook URL selection
export interface DomainOption {
  url: string;
  source: string;
  recommended: boolean;
}

export const useSettingsController = () => {
  const queryClient = useQueryClient();

  // Account limits (tier, quality, etc.)
  const {
    limits: accountLimits,
    refreshLimits,
    tierName,
    isError: limitsError,
    errorMessage: limitsErrorMessage,
    isLoading: limitsLoading,
    hasLimits
  } = useAccountLimits();

  // Local state for form
  const [formSettings, setFormSettings] = useState<AppSettings>({
    phoneNumberId: '',
    businessAccountId: '',
    accessToken: '',
    isConnected: false
  });

  // Account Health State
  const [accountHealth, setAccountHealth] = useState<AccountHealth | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  // Connection test state (Settings -> Configuração da API)
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // --- Queries ---
  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: settingsService.get,
  });

  // Webhook info query
  const webhookQuery = useQuery({
    queryKey: ['webhookInfo'],
    queryFn: async (): Promise<WebhookInfo> => {
      const response = await fetch('/api/webhook/info');
      if (!response.ok) throw new Error('Failed to fetch webhook info');
      return response.json();
    },
    enabled: !!settingsQuery.data?.isConnected, // Only fetch when connected
    staleTime: 30 * 1000, // Cache for 30 seconds
  });

  // Meta subscription status (WABA subscribed_apps) — needed to receive `messages`
  const webhookSubscriptionQuery = useQuery({
    queryKey: ['metaWebhookSubscription'],
    queryFn: async (): Promise<WebhookSubscriptionStatus> => {
      const response = await fetch('/api/meta/webhooks/subscription');
      // We intentionally return the body even on non-2xx to display details in UI
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return {
          ok: false,
          error: (data as any)?.error || 'Falha ao consultar subscription',
          details: (data as any)?.details,
        };
      }
      return data as WebhookSubscriptionStatus;
    },
    enabled: !!settingsQuery.data?.isConnected,
    // Importante: esse status costuma confundir (Meta UI vs subscribed_apps).
    // Para evitar mostrar “Inativo” com cache ao navegar para Configurações,
    // sempre revalida ao montar.
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0,
    retry: false,
  });

  // Phone numbers query (for webhook override management)
  // Backend usa credenciais salvas (Supabase settings / env) — não precisa passar do frontend
  const phoneNumbersQuery = useQuery({
    queryKey: ['phoneNumbers'],
    queryFn: async (): Promise<PhoneNumber[]> => {
      const response = await fetch('/api/phone-numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // Body vazio: backend usa credenciais salvas (Supabase/env)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch phone numbers');
      }
      return response.json();
    },
    enabled: !!settingsQuery.data?.isConnected,
    staleTime: 60 * 1000, // Cache for 1 minute
    retry: false, // Don't retry on auth errors
  });

  // AI Settings Query
  const aiSettingsQuery = useQuery({
    queryKey: ['aiSettings'],
    queryFn: settingsService.getAIConfig,
    staleTime: 60 * 1000,
  });

  // Meta App (opcional): permite debug_token no diagnóstico
  const metaAppQuery = useQuery({
    queryKey: ['metaAppConfig'],
    queryFn: settingsService.getMetaAppConfig,
    staleTime: 60 * 1000,
  })

  // Test Contact Query - persisted in Supabase
  const testContactQuery = useQuery({
    queryKey: ['testContact'],
    queryFn: settingsService.getTestContact,
    staleTime: 60 * 1000,
  });

  // WhatsApp Turbo (Adaptive Throttle)
  const whatsappThrottleQuery = useQuery({
    queryKey: ['whatsappThrottle'],
    queryFn: settingsService.getWhatsAppThrottle,
    enabled: !!settingsQuery.data?.isConnected,
    staleTime: 30 * 1000,
    retry: false,
  });

  // Auto-supressão (Proteção de Qualidade)
  const autoSuppressionQuery = useQuery({
    queryKey: ['autoSuppression'],
    queryFn: settingsService.getAutoSuppression,
    enabled: !!settingsQuery.data?.isConnected,
    staleTime: 30 * 1000,
    retry: false,
  })

  // Available domains query (auto-detect from Vercel)
  const domainsQuery = useQuery({
    queryKey: ['availableDomains'],
    queryFn: async (): Promise<{ domains: DomainOption[]; webhookPath: string; currentSelection: string | null }> => {
      const response = await fetch('/api/settings/domains');
      if (!response.ok) throw new Error('Failed to fetch domains');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // System status query (consolidated: health + usage + vercel info)
  const systemQuery = useQuery({
    queryKey: ['systemStatus'],
    queryFn: async () => {
      const response = await fetch('/api/system');
      if (!response.ok) throw new Error('Failed to fetch system status');
      return response.json();
    },
    staleTime: 60 * 1000, // Cache for 1 minute
    // No polling - user can manually refresh if needed
  });

  // Backward compatible healthQuery accessor
  const healthQuery = {
    data: systemQuery.data?.health ? {
      ...systemQuery.data.health,
      vercel: systemQuery.data.vercel,
      timestamp: systemQuery.data.timestamp,
    } : undefined,
    isLoading: systemQuery.isLoading,
  };

  // Sync form with data when loaded
  useEffect(() => {
    if (settingsQuery.data) {
      setFormSettings(settingsQuery.data);
    }
  }, [settingsQuery.data]);

  // --- Mutations ---
  const saveMutation = useMutation({
    mutationFn: settingsService.save,
    onSuccess: (data) => {
      queryClient.setQueryData(['settings'], data);
      toast.success('Configuração salva com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao salvar configuração.');
    }
  });

  const saveAIMutation = useMutation({
    mutationFn: settingsService.saveAIConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiSettings'] });
      toast.success('Configuração de IA salva com sucesso!');
    },
    // Error is handled inline in the component
  });

  const removeAIMutation = useMutation({
    mutationFn: settingsService.removeAIKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiSettings'] });
    },
    onError: () => {
      toast.error('Erro ao remover chave de IA.');
    }
  });

  // Test Contact Mutations - Supabase
  const saveTestContactMutation = useMutation({
    mutationFn: settingsService.saveTestContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testContact'] });
      toast.success('Contato de teste salvo!');
    },
    onError: () => {
      toast.error('Erro ao salvar contato de teste.');
    }
  });

  const removeTestContactMutation = useMutation({
    mutationFn: settingsService.removeTestContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testContact'] });
      toast.success('Contato de teste removido!');
    },
    onError: () => {
      toast.error('Erro ao remover contato de teste.');
    }
  });

  const saveWhatsAppThrottleMutation = useMutation({
    mutationFn: settingsService.saveWhatsAppThrottle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsappThrottle'] });
      toast.success('Configuração do modo turbo salva!');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Erro ao salvar modo turbo');
    }
  });

  const saveAutoSuppressionMutation = useMutation({
    mutationFn: settingsService.saveAutoSuppression,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['autoSuppression'] })
      toast.success('Configuração de auto-supressão salva!')
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Erro ao salvar auto-supressão')
    },
  })

  const subscribeWebhookMessagesMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/meta/webhooks/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: ['messages'] }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((data as any)?.error || 'Erro ao inscrever messages');
      }

      return data;
    },
    onSuccess: async (data: any) => {
      await queryClient.invalidateQueries({ queryKey: ['metaWebhookSubscription'] });
      await queryClient.refetchQueries({ queryKey: ['metaWebhookSubscription'] });

      const confirmed = !!data?.confirmed;
      if (confirmed) {
        toast.success('Inscrição do campo "messages" ativada!');
      } else {
        toast.warning('Inscrição solicitada, mas a Meta ainda não confirmou.', {
          description: 'Clique em “Atualizar status” em alguns segundos (ou tente de novo).',
        });
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Erro ao ativar inscrição');
    },
  });

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    const toastId = toast.loading('Testando conexão com a Meta…');
    try {
      // Se o usuário ainda não salvou as credenciais, testamos com o que está no formulário.
      // Se estiver mascarado (***configured***), o backend usa credenciais salvas.
      const result = await settingsService.testConnection({
        phoneNumberId: formSettings.phoneNumberId,
        businessAccountId: formSettings.businessAccountId,
        accessToken: formSettings.accessToken,
      });

      toast.dismiss(toastId);

      // Se o backend conseguiu inferir o WABA e o usuário não preencheu, auto-preenche.
      if (!formSettings.businessAccountId && result?.wabaId) {
        setFormSettings((prev) => ({
          ...prev,
          businessAccountId: String(result.wabaId),
        }));
      }

      const phone = result.displayPhoneNumber || result.phoneNumberId || 'OK';
      toast.success('Teste de conexão bem-sucedido!', {
        description: result.verifiedName
          ? `${phone} • ${result.verifiedName}${(!formSettings.businessAccountId && result?.wabaId) ? `\nWABA preenchido automaticamente: ${result.wabaId}` : ''}`
          : `${phone}${(!formSettings.businessAccountId && result?.wabaId) ? `\nWABA preenchido automaticamente: ${result.wabaId}` : ''}`,
      });
    } catch (err: any) {
      toast.dismiss(toastId);
      const msg = err?.message || 'Falha ao testar conexão';
      const details = err?.details;

      const hintTitle = (details as any)?.details?.hintTitle as string | undefined
      const hint = (details as any)?.details?.hint as string | undefined
      const nextSteps = (details as any)?.details?.nextSteps as string[] | undefined
      const fbtraceId = (details as any)?.details?.fbtraceId as string | undefined

      const stepsPreview = Array.isArray(nextSteps) && nextSteps.length
        ? nextSteps.slice(0, 2).map((s) => `• ${s}`).join('\n')
        : null

      const descriptionParts = [
        hintTitle ? `${hintTitle}: ${msg}` : msg,
        hint ? hint : null,
        stepsPreview,
        fbtraceId ? `fbtrace_id: ${fbtraceId}` : null,
      ].filter(Boolean)

      toast.error('Falha no teste de conexão', {
        description: descriptionParts.join('\n'),
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const unsubscribeWebhookMessagesMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/meta/webhooks/subscription', {
        method: 'DELETE',
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((data as any)?.error || 'Erro ao remover inscrição');
      }

      return data;
    },
    onSuccess: async (data: any) => {
      await queryClient.invalidateQueries({ queryKey: ['metaWebhookSubscription'] });
      await queryClient.refetchQueries({ queryKey: ['metaWebhookSubscription'] });

      const confirmed = data?.confirmed;
      if (confirmed === true) {
        toast.success('Inscrição removida.');
      } else {
        toast.message('Remoção solicitada.', {
          description: 'Atualize o status para confirmar no WABA.',
        });
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Erro ao remover inscrição');
    },
  });

  const handleSave = async () => {
    // 1. Optimistic Update
    const pendingSettings = { ...formSettings, isConnected: true };

    try {
      // 2. Fetch Real Data from Meta
      const metaData = await settingsService.fetchPhoneDetails({
        phoneNumberId: formSettings.phoneNumberId,
        accessToken: formSettings.accessToken
      });

      // 3. Merge Data
      const finalSettings = {
        ...pendingSettings,
        displayPhoneNumber: metaData.display_phone_number,
        qualityRating: metaData.quality_rating,
        verifiedName: metaData.verified_name
      };

      // 4. Save
      saveMutation.mutate(finalSettings);
    } catch (error) {
      toast.error('Erro ao conectar com a Meta API. Verifique as credenciais.');
      console.error(error);
    }
  };

  const handleDisconnect = () => {
    const newSettings = { ...formSettings, isConnected: false };
    saveMutation.mutate(newSettings);
    setAccountHealth(null);
  };

  // Direct save settings (for test contact, etc.)
  const handleSaveSettings = (settings: AppSettings) => {
    setFormSettings(settings);
    saveMutation.mutate(settings);
  };

  // Check account health
  const handleCheckHealth = async () => {
    setIsCheckingHealth(true);
    try {
      const health = await checkAccountHealth();
      setAccountHealth(health);

      const summary = getHealthSummary(health);
      if (health.isHealthy) {
        toast.success(summary.title);
      } else if (health.status === 'degraded') {
        toast.warning(summary.title);
      } else {
        toast.error(summary.title);
      }
    } catch (error) {
      toast.error('Erro ao verificar saúde da conta');
    } finally {
      setIsCheckingHealth(false);
    }
  };

  // Quick health check (for pre-send validation)
  const canSendCampaign = async (): Promise<{ canSend: boolean; reason?: string }> => {
    return quickHealthCheck();
  };

  // Set webhook override for a phone number
  const setWebhookOverride = async (phoneNumberId: string, callbackUrl: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/phone-numbers/${phoneNumberId}/webhook/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // accessToken é obtido no servidor a partir das credenciais salvas (Supabase/env)
          callbackUrl,
          // Preflight por padrão: retorna erro mais claro quando Preview está protegido (401)
          preflight: true,
          force: false,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        const title = (error as any)?.error || 'Erro ao configurar webhook';
        const hint = (error as any)?.hint || (error as any)?.action;
        const code = (error as any)?.code;

        if (hint) {
          toast.error(title, {
            description: code ? `${hint} (código: ${code})` : hint,
          });
        } else {
          toast.error(title);
        }
        return false;
      }

      toast.success('Webhook configurado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['phoneNumbers'] });
      return true;
    } catch (error) {
      toast.error('Erro ao configurar webhook');
      return false;
    }
  };

  // Remove webhook override for a phone number
  const removeWebhookOverride = async (phoneNumberId: string): Promise<boolean> => {
    try {
      // Sem body: servidor busca credenciais salvas (Supabase/env)
      const response = await fetch(`/api/phone-numbers/${phoneNumberId}/webhook/override`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Erro ao remover webhook');
        return false;
      }

      toast.success('Webhook removido!');
      queryClient.invalidateQueries({ queryKey: ['phoneNumbers'] });
      return true;
    } catch (error) {
      toast.error('Erro ao remover webhook');
      return false;
    }
  };

  // Build setup wizard steps based on health status
  const setupSteps = useMemo((): SetupStep[] => {
    const health = healthQuery.data;

    return [
      {
        id: 'qstash',
        title: 'QStash (Upstash)',
        description: 'Filas de mensagens para processamento assíncrono de campanhas. Configure pelo assistente (/setup).',
        status: health?.services.qstash?.status === 'ok'
          ? 'configured'
          : health?.services.qstash?.status === 'error'
            ? 'error'
            : 'pending',
        icon: React.createElement(Zap, { size: 20, className: 'text-purple-400' }),
        actionLabel: 'Abrir assistente',
        actionUrl: '/setup',
        errorMessage: health?.services.qstash?.message,
        isRequired: true,
      },
      {
        id: 'whatsapp',
        title: 'WhatsApp Business API',
        description: 'Credenciais da Meta para enviar mensagens. (Opcional no início — você pode configurar depois.)',
        status: health?.services.whatsapp?.status === 'ok'
          ? 'configured'
          : health?.services.whatsapp?.status === 'error'
            ? 'error'
            : 'pending',
        icon: React.createElement(MessageSquare, { size: 20, className: 'text-green-400' }),
        errorMessage: health?.services.whatsapp?.message,
        isRequired: false,
      },
    ];
  }, [healthQuery.data]);

  // Check if setup is needed (any required step not configured)
  const needsSetup = useMemo(() => {
    const health = healthQuery.data;
    if (!health) return false; // Don't show wizard while loading - show settings instead

    // Setup é necessário apenas para infra mínima (QStash).
    // WhatsApp é opcional e pode ser configurado depois.
    return health.services.qstash?.status !== 'ok';
  }, [healthQuery.data]);

  // Check if infrastructure is ready (QStash configured)
  const infrastructureReady = useMemo(() => {
    const health = healthQuery.data;
    if (!health) return false;

    return health.services.qstash?.status === 'ok';
  }, [healthQuery.data]);

  // Check if all steps are configured
  const allConfigured = useMemo(() => {
    return setupSteps.every(step => step.status === 'configured');
  }, [setupSteps]);

  return {
    // Settings with testContact merged from Supabase
    settings: {
      ...formSettings,
      testContact: testContactQuery.data || formSettings.testContact,
    },
    setSettings: setFormSettings,
    isLoading: settingsQuery.isLoading || testContactQuery.isLoading,
    isSaving: saveMutation.isPending,
    onSave: handleSave,
    onSaveSettings: handleSaveSettings,
    onDisconnect: handleDisconnect,

    // Test connection (sem salvar)
    onTestConnection: handleTestConnection,
    isTestingConnection,
    // Account limits
    accountLimits,
    refreshLimits,
    tierName,
    limitsError,
    limitsErrorMessage,
    limitsLoading,
    hasLimits,
    // Account health
    accountHealth,
    isCheckingHealth,
    onCheckHealth: handleCheckHealth,
    canSendCampaign,
    getHealthSummary: accountHealth ? () => getHealthSummary(accountHealth) : null,
    // Webhook info
    webhookUrl: webhookQuery.data?.webhookUrl,
    webhookToken: webhookQuery.data?.webhookToken,
    webhookStats: webhookQuery.data?.stats,
    // Meta webhook subscription (messages)
    webhookSubscription: webhookSubscriptionQuery.data,
    webhookSubscriptionLoading: webhookSubscriptionQuery.isLoading,
    refreshWebhookSubscription: () => queryClient.invalidateQueries({ queryKey: ['metaWebhookSubscription'] }),
    subscribeWebhookMessages: subscribeWebhookMessagesMutation.mutateAsync,
    unsubscribeWebhookMessages: unsubscribeWebhookMessagesMutation.mutateAsync,
    webhookSubscriptionMutating: subscribeWebhookMessagesMutation.isPending || unsubscribeWebhookMessagesMutation.isPending,
    // Phone numbers for webhook override
    phoneNumbers: phoneNumbersQuery.data || [],
    phoneNumbersLoading: phoneNumbersQuery.isLoading,
    refreshPhoneNumbers: () => queryClient.invalidateQueries({ queryKey: ['phoneNumbers'] }),
    setWebhookOverride,
    removeWebhookOverride,
    // Available domains for webhook URL
    availableDomains: domainsQuery.data?.domains || [],
    webhookPath: domainsQuery.data?.webhookPath || '/api/webhook',
    selectedDomain: domainsQuery.data?.currentSelection || null,
    // System health
    systemHealth: healthQuery.data || null,
    systemHealthLoading: healthQuery.isLoading,
    refreshSystemHealth: () => queryClient.invalidateQueries({ queryKey: ['systemHealth'] }),
    // Setup wizard
    setupSteps,
    needsSetup,
    infrastructureReady,
    allConfigured,
    // AI Settings
    aiSettings: aiSettingsQuery.data,
    aiSettingsLoading: aiSettingsQuery.isLoading,
    saveAIConfig: saveAIMutation.mutateAsync,
    removeAIKey: removeAIMutation.mutateAsync,
    isSavingAI: saveAIMutation.isPending,

    // Meta App (opcional)
    metaApp: metaAppQuery.data || null,
    metaAppLoading: metaAppQuery.isLoading,
    refreshMetaApp: () => queryClient.invalidateQueries({ queryKey: ['metaAppConfig'] }),
    // Test Contact - persisted in Supabase
    testContact: testContactQuery.data || null,
    testContactLoading: testContactQuery.isLoading,
    saveTestContact: saveTestContactMutation.mutateAsync,
    removeTestContact: removeTestContactMutation.mutateAsync,
    isSavingTestContact: saveTestContactMutation.isPending,

    // WhatsApp Turbo
    whatsappThrottle: whatsappThrottleQuery.data || null,
    whatsappThrottleLoading: whatsappThrottleQuery.isLoading,
    saveWhatsAppThrottle: saveWhatsAppThrottleMutation.mutateAsync,
    isSavingWhatsAppThrottle: saveWhatsAppThrottleMutation.isPending,

    // Auto-supressão (Proteção de Qualidade)
    autoSuppression: autoSuppressionQuery.data || null,
    autoSuppressionLoading: autoSuppressionQuery.isLoading,
    saveAutoSuppression: saveAutoSuppressionMutation.mutateAsync,
    isSavingAutoSuppression: saveAutoSuppressionMutation.isPending,
  };
};  
