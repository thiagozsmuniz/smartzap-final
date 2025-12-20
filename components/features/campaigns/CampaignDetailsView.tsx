import React, { useMemo, useState, useEffect } from 'react';
import { PrefetchLink } from '@/components/ui/PrefetchLink';
import { ChevronLeft, ChevronDown, Clock, CheckCircle2, Eye, AlertCircle, Download, Search, Filter, RefreshCw, Pause, Play, Calendar, Loader2, X, FileText, Ban, Pencil } from 'lucide-react';
import { Campaign, CampaignStatus, Message, MessageStatus, Template, RealtimeLatencyTelemetry } from '../../../types';
import { TemplatePreviewRenderer } from '../templates/TemplatePreviewRenderer';
import { templateService } from '../../../services';
import { ContactQuickEditModal } from '@/components/features/contacts/ContactQuickEditModal';
import { humanizePrecheckReason } from '@/lib/precheck-humanizer';
import { Page, PageHeader, PageTitle } from '@/components/ui/page';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { computeCampaignUiCounters } from '@/lib/campaign-ui-counters';

interface DetailCardProps {
  title: string;
  value: string;
  subvalue: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
  onClick?: () => void;
  isActive?: boolean;
}

const DetailCard = ({ title, value, subvalue, icon: Icon, color, onClick, isActive }: DetailCardProps) => (
  <div
    onClick={onClick}
    className={`glass-panel p-6 rounded-2xl border-l-4 transition-all duration-200 ${onClick ? 'cursor-pointer hover:bg-white/5' : 'cursor-default'} ${isActive ? 'ring-2 ring-white/20 bg-white/5' : ''}`}
    style={{ borderLeftColor: color }}
  >
    <div className="flex justify-between items-start mb-2">
      <div>
        <p className="text-sm text-gray-400 font-medium">{title}</p>
        <h3 className="text-3xl font-bold text-white mt-1">{value}</h3>
      </div>
      <div className={`p-2 rounded-lg bg-white/5 text-white`}>
        <Icon size={20} color={color} />
      </div>
    </div>
    <p className="text-xs text-gray-500">{subvalue}</p>
  </div>
);

const MessageStatusBadge = ({ status }: { status: MessageStatus }) => {
  const styles: Record<string, string> = {
    [MessageStatus.PENDING]: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    [MessageStatus.READ]: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    [MessageStatus.DELIVERED]: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    [MessageStatus.SENT]: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
    [MessageStatus.SKIPPED]: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
    [MessageStatus.FAILED]: 'text-red-400 bg-red-500/10 border-red-500/20',
    // Fallback para valores antigos em inglês
    'Pending': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    'Read': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    'Delivered': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    'Sent': 'text-gray-400 bg-gray-500/10 border-gray-500/20',
    'Failed': 'text-red-400 bg-red-500/10 border-red-500/20',
  };

  const icons: Record<string, React.ReactNode> = {
    [MessageStatus.PENDING]: <Loader2 size={12} className="mr-1 animate-spin" />,
    [MessageStatus.READ]: <Eye size={12} className="mr-1" />,
    [MessageStatus.DELIVERED]: <CheckCircle2 size={12} className="mr-1" />,
    [MessageStatus.SENT]: <Clock size={12} className="mr-1" />,
    [MessageStatus.SKIPPED]: <Ban size={12} className="mr-1" />,
    [MessageStatus.FAILED]: <AlertCircle size={12} className="mr-1" />,
    // Fallback para valores antigos em inglês
    'Pending': <Loader2 size={12} className="mr-1 animate-spin" />,
    'Read': <Eye size={12} className="mr-1" />,
    'Delivered': <CheckCircle2 size={12} className="mr-1" />,
    'Sent': <Clock size={12} className="mr-1" />,
    'Failed': <AlertCircle size={12} className="mr-1" />,
  };

  // Mapa de tradução para garantir exibição em PT-BR
  const labels: Record<string, string> = {
    [MessageStatus.PENDING]: 'Pendente',
    [MessageStatus.READ]: 'Lido',
    [MessageStatus.DELIVERED]: 'Entregue',
    [MessageStatus.SENT]: 'Enviado',
    [MessageStatus.SKIPPED]: 'Ignorado',
    [MessageStatus.FAILED]: 'Falhou',
    // Fallback para valores antigos em inglês
    'Pending': 'Pendente',
    'Read': 'Lido',
    'Delivered': 'Entregue',
    'Sent': 'Enviado',
    'Failed': 'Falhou',
  };

  const style = styles[status] || 'text-gray-400 bg-gray-500/10 border-gray-500/20';
  const icon = icons[status] || <Clock size={12} className="mr-1" />;
  const label = labels[status] || status;

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${style}`}>
      {icon} {label}
    </span>
  );
};

// Template Preview Modal
const TemplatePreviewModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  templateName: string;
}> = ({ isOpen, onClose, templateName }) => {
  const [template, setTemplate] = useState<Template | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && templateName) {
      setIsLoading(true);
      templateService.getAll().then(templates => {
        const found = templates.find(t => t.name === templateName);
        setTemplate(found || null);
        setIsLoading(false);
      }).catch(() => {
        setTemplate(null);
        setIsLoading(false);
      });
    }
  }, [isOpen, templateName]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-primary-400" />
            <h3 className="text-lg font-bold text-white">{templateName}</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 bg-[#0b141a] max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
            </div>
          ) : template ? (
            <TemplatePreviewRenderer components={template.components} />
          ) : (
            <p className="text-gray-500 text-center py-8">Template não encontrado</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Navigate function type compatible with Next.js
type NavigateFn = (path: string, options?: { replace?: boolean }) => void;

interface CampaignDetailsViewProps {
  campaign?: Campaign;
  messages: Message[];
  messageStats?: {
    total: number;
    pending: number;
    sent: number;
    delivered: number;
    read: number;
    skipped: number;
    failed: number;
  } | null;
  realStats?: {
    sent: number;
    failed: number;
    skipped: number;
    delivered: number;
    read: number;
    total: number;
  } | null;
  metrics?: any | null;
  isLoading: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  navigate: NavigateFn;
  // Actions
  onPause?: () => void;
  onResume?: () => void;
  onStart?: () => void;
  onCancelSchedule?: () => void;
  onCancelSend?: () => void;
  onResendSkipped?: () => void;
  isPausing?: boolean;
  isResuming?: boolean;
  isStarting?: boolean;
  isCancelingSchedule?: boolean;
  isCancelingSend?: boolean;
  isResendingSkipped?: boolean;
  canPause?: boolean;
  canResume?: boolean;
  canStart?: boolean;
  canCancelSchedule?: boolean;
  canCancelSend?: boolean;
  // Realtime status
  isRealtimeConnected?: boolean;
  shouldShowRefreshButton?: boolean;
  isRefreshing?: boolean;
  refetch?: () => void;
  filterStatus?: MessageStatus | null;
  setFilterStatus?: (status: MessageStatus | null) => void;
  telemetry?: RealtimeLatencyTelemetry | null;
  // Pagination (Load more)
  onLoadMore?: () => void;
  canLoadMore?: boolean;
  isLoadingMore?: boolean;
  // Delivered filter mode
  includeReadInDelivered?: boolean;
  setIncludeReadInDelivered?: (value: boolean) => void;
}

export const CampaignDetailsView: React.FC<CampaignDetailsViewProps> = ({
  campaign,
  messages,
  messageStats,
  realStats,
  metrics,
  isLoading,
  searchTerm,
  setSearchTerm,
  navigate,
  onPause,
  onResume,
  onStart,
  onCancelSchedule,
  onCancelSend,
  onResendSkipped,
  isPausing,
  isResuming,
  isStarting,
  isCancelingSchedule,
  isCancelingSend,
  isResendingSkipped,
  canPause,
  canResume,
  canStart,
  canCancelSchedule,
  canCancelSend,
  isRealtimeConnected,
  shouldShowRefreshButton,
  isRefreshing,
  refetch,
  filterStatus,
  setFilterStatus,
  telemetry,
  onLoadMore,
  canLoadMore,
  isLoadingMore,
  includeReadInDelivered,
  setIncludeReadInDelivered,
}) => {
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);
  const [isPerfOpen, setIsPerfOpen] = useState(false);
  const [isPerfTechOpen, setIsPerfTechOpen] = useState(false);
  const [quickEditContactId, setQuickEditContactId] = useState<string | null>(null);
  const [quickEditFocus, setQuickEditFocus] = useState<any>(null);

  const perf = metrics?.current || null;
  const baseline = Array.isArray(metrics?.baseline) ? metrics.baseline : [];

  const formatDurationMs = (ms: number | null | undefined) => {
    if (!ms || ms <= 0) return '—';
    const totalSec = Math.round(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return m > 0 ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`;
  };

  const formatThroughput = (mps: number | null | undefined) => {
    if (!Number.isFinite(mps as number) || (mps as number) <= 0) return '—';
    const v = mps as number;
    const perMin = v * 60;
    return `${v.toFixed(2)} msg/s (${perMin.toFixed(1)} msg/min)`;
  };

  const formatMs = (ms: number | null | undefined) => {
    if (!Number.isFinite(ms as number) || (ms as number) <= 0) return '—';
    const v = ms as number;
    return v >= 1000 ? `${(v / 1000).toFixed(2)}s` : `${Math.round(v)}ms`;
  };

  const baselineThroughputMedian = useMemo(() => {
    const vals = baseline
      .map((r: any) => Number(r?.throughput_mps))
      .filter((n: number) => Number.isFinite(n) && n > 0)
      .sort((a: number, b: number) => a - b);

    if (!vals.length) return null;
    const mid = Math.floor(vals.length / 2);
    return vals.length % 2 === 1 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2;
  }, [baseline]);

  const perfSourceLabel = useMemo(() => {
    const s = String(metrics?.source || '').trim();
    if (s === 'run_metrics') return { label: 'Dados: avançados', tone: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20' };
    if (s === 'campaigns_fallback') return { label: 'Dados: básicos', tone: 'text-amber-200 bg-amber-500/10 border-amber-500/20' };
    if (!s) return { label: 'Dados: —', tone: 'text-gray-500 bg-zinc-900/60 border-white/10' };
    return { label: `Dados: ${s}`, tone: 'text-gray-500 bg-zinc-900/60 border-white/10' };
  }, [metrics?.source]);

  const limiterInfo = useMemo(() => {
    const saw429 = perf?.saw_throughput_429;
    const metaAvg = Number(perf?.meta_avg_ms);
    const hasMetaAvg = Number.isFinite(metaAvg) && metaAvg > 0;

    if (saw429 === true) {
      return {
        value: 'Rate limit',
        subvalue: 'A Meta sinalizou 130429 (throughput). Reduza a pressão (mps/concurrency) ou aumente o cooldown.',
        color: '#f59e0b',
      };
    }

    if (saw429 === false) {
      return {
        value: 'OK',
        subvalue: hasMetaAvg
          ? `Sem 130429. Latência média da Meta: ${formatMs(metaAvg)}.`
          : 'Sem 130429 detectado nesta execução.',
        color: '#3b82f6',
      };
    }

    // Unknown
    if (metrics?.source === 'campaigns_fallback') {
      return {
        value: '—',
        subvalue: 'Sinais da Meta (130429/latência) exigem métricas avançadas (run_metrics).',
        color: '#3b82f6',
      };
    }

    // Fonte avançada, mas sem telemetria útil (ex.: execução curta demais ou batch_metrics não foi registrado)
    return {
      value: 'Sem telemetria',
      subvalue: 'Esta execução não registrou sinal de 130429 nem latência média da Meta. Rode uma campanha maior ou verifique se os batches estão gravando métricas.',
      color: '#3b82f6',
    };
  }, [metrics?.source, perf?.meta_avg_ms, perf?.saw_throughput_429]);

  if (isLoading || !campaign) return <div className="p-10 text-center text-gray-500">Carregando...</div>;

  // UX: quando navegamos de forma otimista para um id temporário (temp_*),
  // o backend ainda está fazendo pré-check e preparando os registros.
  // Mostramos uma tela explícita de “Preparando campanha…” para evitar a sensação de travamento.
  const isTempCampaign = campaign.id?.startsWith('temp_');
  if (isTempCampaign) {
    const recipientsCount =
      Number(campaign.recipients || 0)
      || (Array.isArray(campaign.pendingContacts) ? campaign.pendingContacts.length : 0)
      || (Array.isArray(messages) ? messages.length : 0)
      || 0;

    return (
      <Page className="pb-20">
        <PageHeader>
          <div className="min-w-0">
            <PrefetchLink
              href="/campaigns"
              className="text-xs text-gray-500 hover:text-white mb-2 inline-flex items-center gap-1 transition-colors"
            >
              <ChevronLeft size={12} /> Voltar para Lista
            </PrefetchLink>

            <div className="flex flex-wrap items-center gap-2">
              <PageTitle className="flex items-center gap-3">
                <Loader2 size={18} className="animate-spin text-primary-400" />
                Preparando campanha…
              </PageTitle>
              <span className="text-xs px-2 py-1 rounded border bg-zinc-800 border-zinc-700 text-gray-400">
                {campaign.status}
              </span>
            </div>

            <p className="text-gray-400 text-sm mt-1">
              {campaign.name} • {recipientsCount} destinatário(s)
              {campaign.templateName ? (
                <span className="ml-2">• Template: <span className="font-medium">{campaign.templateName}</span></span>
              ) : null}
            </p>
          </div>
        </PageHeader>

        <div className="mt-8 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-white/10">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <Loader2 size={18} className="animate-spin text-primary-400" />
              </div>
              <div className="min-w-0">
                <h3 className="text-white font-semibold">Estamos preparando o envio</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Isso pode levar alguns segundos (principalmente com listas maiores). Assim que o pré-check terminar,
                  esta tela muda automaticamente para o envio ao vivo.
                </p>

                <div className="mt-5 grid gap-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-300">
                    <Clock size={14} className="text-gray-400" />
                    Validando contatos e normalizando telefones
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <Ban size={14} className="text-gray-400" />
                    Verificando opt-out e supressões
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <FileText size={14} className="text-gray-400" />
                    Preparando registros para envio (campanha_contatos)
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <CheckCircle2 size={14} className="text-gray-400" />
                    Enfileirando o workflow de disparo
                  </div>
                </div>
              </div>
            </div>
          </div>

          {Array.isArray(campaign.pendingContacts) && campaign.pendingContacts.length > 0 && (
            <div className="glass-panel p-6 rounded-2xl border border-white/10">
              <h4 className="text-white font-semibold">Prévia dos destinatários</h4>
              <p className="text-sm text-gray-400 mt-1">
                Lista carregada localmente (a ordem final pode mudar após o pré-check).
              </p>

              <div className="mt-4 divide-y divide-white/5">
                {campaign.pendingContacts.slice(0, 8).map((c, idx) => (
                  <div key={`${c.phone}_${idx}`} className="py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm text-white truncate">{c.name || 'Contato'}</div>
                      <div className="text-xs text-gray-400 truncate">{c.phone}</div>
                    </div>
                    <MessageStatusBadge status={MessageStatus.PENDING} />
                  </div>
                ))}

                {campaign.pendingContacts.length > 8 && (
                  <div className="pt-3 text-xs text-gray-500">
                    + {campaign.pendingContacts.length - 8} outro(s)…
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 text-xs text-gray-500">
            <AlertCircle size={14} className="mt-0.5" />
            Se ficar preso aqui por mais de 1–2 minutos, verifique sua configuração da Meta/Supabase e tente novamente.
          </div>
        </div>
      </Page>
    );
  }

  // Preferimos stats do backend (paginado), mas fazemos fallback para contagem local
  // porque em alguns ambientes o contador da campanha pode ficar desatualizado.
  const skippedCount = (messageStats?.skipped ?? realStats?.skipped ?? campaign.skipped ?? 0);

  // Stats "ao vivo" para alimentar os cards principais.
  // Observação importante:
  // - `messageStats` vem agregado do endpoint de mensagens (ideal), mas pode ficar temporariamente
  //   menor por inconsistências/transição de status ou condições de paginação/refetch.
  // - `campaign.*` é o contador persistido na tabela `campaigns` (atualizado por workflow/webhook).
  // Para evitar regressões visuais (ex.: cair para 50 quando a campanha já tem 165 entregues),
  // exibimos sempre o MAIOR valor observado entre as fontes.
  const liveStats = messageStats ?? realStats ?? null;
  const hasLiveStats = Boolean(liveStats);

  const uiCounters = computeCampaignUiCounters({
    campaign: {
      sent: campaign.sent,
      delivered: campaign.delivered,
      read: campaign.read,
      failed: campaign.failed,
    },
    live: liveStats,
  });

  const sentCountForUi = uiCounters.sent;
  const deliveredTotalForUi = uiCounters.deliveredTotal;
  const readCountForUi = uiCounters.read;
  const failedCountForUi = uiCounters.failed;
  // "Entregues" (não lidas) = status atual delivered
  const deliveredOnlyCountForUi = uiCounters.delivered;
  // Performance sent-only "ao vivo" (melhora UX durante SENDING)
  // - Usamos first_dispatch_at / last_sent_at quando disponíveis.
  // - Se last_sent_at ainda não existe, estimamos usando Date.now() e mostramos isso no subtexto.
  const isSendingNow = campaign.status === CampaignStatus.SENDING;
  const dispatchStartIso = (perf as any)?.first_dispatch_at || (campaign as any)?.firstDispatchAt || null;
  const dispatchEndIsoFromDb = (perf as any)?.last_sent_at || (campaign as any)?.lastSentAt || null;
  const dispatchEndIsoEstimated = (!dispatchEndIsoFromDb && isSendingNow && dispatchStartIso)
    ? new Date().toISOString()
    : null;
  const dispatchEndIso = dispatchEndIsoFromDb || dispatchEndIsoEstimated;
  const dispatchDurationMsLive = (dispatchStartIso && dispatchEndIso)
    ? Math.max(0, new Date(dispatchEndIso).getTime() - new Date(dispatchStartIso).getTime())
    : null;
  const throughputMpsLive = (dispatchDurationMsLive && dispatchDurationMsLive > 0)
    ? (Number(sentCountForUi || 0) / (dispatchDurationMsLive / 1000))
    : null;
  const isPerfEstimatedLive = Boolean(dispatchEndIsoEstimated);
  const throughputMpsForUi = isPerfEstimatedLive ? throughputMpsLive : Number(perf?.throughput_mps);
  const dispatchDurationMsForUi = isPerfEstimatedLive ? dispatchDurationMsLive : Number(perf?.dispatch_duration_ms);

  // Format scheduled time for display
  const scheduledTimeDisplay = campaign.scheduledAt
    ? new Date(campaign.scheduledAt).toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
    : null;
  const campaignStatusClass =
    campaign.status === CampaignStatus.COMPLETED
      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
      : campaign.status === CampaignStatus.SENDING
        ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
        : campaign.status === CampaignStatus.CANCELLED
          ? 'bg-zinc-800 border-zinc-700/70 text-gray-300'
        : campaign.status === CampaignStatus.PAUSED
          ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
          : campaign.status === CampaignStatus.SCHEDULED
            ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
            : campaign.status === CampaignStatus.FAILED
              ? 'bg-red-500/10 border-red-500/20 text-red-400'
              : 'bg-zinc-800 border-zinc-700 text-gray-400';

  return (
    <Page className="pb-20">
      <PageHeader>
        <div className="min-w-0">
          <PrefetchLink
            href="/campaigns"
            className="text-xs text-gray-500 hover:text-white mb-2 inline-flex items-center gap-1 transition-colors"
          >
            <ChevronLeft size={12} /> Voltar para Lista
          </PrefetchLink>

          <div className="flex flex-wrap items-center gap-2">
            <PageTitle className="flex items-center gap-3">
              {campaign.name}
            </PageTitle>

            <span className={`text-xs px-2 py-1 rounded border ${campaignStatusClass}`}>
              {campaign.status}
            </span>

            {isRealtimeConnected && (
              <span className="inline-flex items-center gap-2 text-xs text-primary-400">
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-500" />
                Ao vivo
              </span>
            )}
          </div>

          <p className="text-gray-400 text-sm mt-1">
            ID: {campaign.id} • Criado em{' '}
            {campaign.createdAt ? new Date(campaign.createdAt).toLocaleDateString('pt-BR') : 'agora'}
            {campaign.templateName && (
              <button
                onClick={() => setShowTemplatePreview(true)}
                className="ml-2 text-primary-400 hover:text-primary-300 transition-colors cursor-pointer"
              >
                • Template:{' '}
                <span className="font-medium underline underline-offset-2">{campaign.templateName}</span>
              </button>
            )}
            {scheduledTimeDisplay && campaign.status === CampaignStatus.SCHEDULED && (
              <span className="ml-2 text-purple-400">
                <Calendar size={12} className="inline mr-1" />
                Agendado para {scheduledTimeDisplay}
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {/* Start button for scheduled campaigns */}
          {canStart && (
            <button
              onClick={onStart}
              disabled={isStarting}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-500 border border-primary-500/20 rounded-lg text-white transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50"
            >
              {isStarting ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
              {isStarting ? 'Iniciando...' : 'Iniciar Agora'}
            </button>
          )}

          {/* Cancel schedule (scheduled campaigns only) */}
          {canCancelSchedule && (
            <button
              onClick={onCancelSchedule}
              disabled={isCancelingSchedule}
              className="px-4 py-2 bg-zinc-900 border border-white/10 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50"
              title="Cancela o agendamento e volta a campanha para Rascunho"
            >
              {isCancelingSchedule ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />}
              {isCancelingSchedule ? 'Cancelando...' : 'Cancelar agendamento'}
            </button>
          )}

          {/* Cancel sending (sending/paused campaigns) */}
          {canCancelSend && (
            <button
              onClick={onCancelSend}
              disabled={isCancelingSend}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 border border-red-500/20 rounded-lg text-white transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50"
              title="Interrompe o envio e marca a campanha como Cancelada"
            >
              {isCancelingSend ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />}
              {isCancelingSend ? 'Cancelando...' : 'Cancelar envio'}
            </button>
          )}

          {/* Pause button for sending campaigns */}
          {canPause && (
            <button
              onClick={onPause}
              disabled={isPausing}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 border border-amber-500/20 rounded-lg text-white transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50"
            >
              {isPausing ? <Loader2 size={16} className="animate-spin" /> : <Pause size={16} />}
              {isPausing ? 'Pausando...' : 'Pausar'}
            </button>
          )}

          {/* Resume button for paused campaigns */}
          {canResume && (
            <button
              onClick={onResume}
              disabled={isResuming}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-500 border border-primary-500/20 rounded-lg text-white transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50"
            >
              {isResuming ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
              {isResuming ? 'Retomando...' : 'Retomar'}
            </button>
          )}

          {/* Refresh button - shown when realtime is disconnected for completed campaigns */}
          {shouldShowRefreshButton && (
            <button
              onClick={refetch}
              disabled={isRefreshing}
              className="px-4 py-2 bg-zinc-900 border border-white/10 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50"
            >
              {isRefreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              {isRefreshing ? 'Atualizando...' : 'Atualizar'}
            </button>
          )}

          {/* Resend skipped */}
          {skippedCount > 0 && (
            <button
              onClick={onResendSkipped}
              disabled={!onResendSkipped || !!isResendingSkipped}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 border border-amber-500/20 rounded-lg text-white transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50"
              title="Revalida contatos ignorados e reenfileira apenas os válidos"
            >
              {isResendingSkipped ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />}
              {isResendingSkipped ? 'Reenviando...' : `Reenviar ignorados (${skippedCount})`}
            </button>
          )}

          <button className="px-4 py-2 bg-zinc-900 border border-white/10 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2 text-sm font-medium">
            <Download size={16} /> Relatório CSV
          </button>
        </div>
      </PageHeader>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <DetailCard
          title="Enviadas"
          value={Number(sentCountForUi || 0).toLocaleString()}
          subvalue={`${campaign.recipients ?? 0} destinatários`}
          icon={Clock}
          color="#a1a1aa"
          isActive={filterStatus === MessageStatus.SENT}
          onClick={() => setFilterStatus?.(filterStatus === MessageStatus.SENT ? null : MessageStatus.SENT)}
        />
        <DetailCard
          title="Entregues"
          value={Number(deliveredTotalForUi || 0).toLocaleString()}
          subvalue={(deliveredTotalForUi || 0) > 0
            ? `${(((Number(deliveredTotalForUi || 0)) / (campaign.recipients ?? 1)) * 100).toFixed(1)}% taxa de entrega${deliveredOnlyCountForUi > 0 ? ` • ${Number(deliveredOnlyCountForUi).toLocaleString()} não lidas` : ''}`
            : (hasLiveStats ? 'Aguardando webhook' : 'Aguardando webhook')}
          icon={CheckCircle2}
          color="#10b981"
          isActive={filterStatus === MessageStatus.DELIVERED}
          onClick={() => {
            if (!setFilterStatus) return

            const isActiveNow = filterStatus === MessageStatus.DELIVERED
            if (isActiveNow) {
              setFilterStatus(null)
              return
            }

            // Padrão "enterprise": KPI Entregues é cumulativo (delivered + read).
            // Ao clicar no card, abrimos a visão cumulativa para a lista bater com o número.
            setFilterStatus(MessageStatus.DELIVERED)
            setIncludeReadInDelivered?.(true)
          }}
        />
        <DetailCard
          title="Lidas"
          value={Number(readCountForUi || 0).toLocaleString()}
          subvalue={(readCountForUi || 0) > 0
            ? `${(((Number(readCountForUi || 0)) / (campaign.recipients ?? 1)) * 100).toFixed(1)}% taxa de abertura`
            : (hasLiveStats ? 'Aguardando webhook' : 'Aguardando webhook')}
          icon={Eye}
          color="#3b82f6"
          isActive={filterStatus === MessageStatus.READ}
          onClick={() => setFilterStatus?.(filterStatus === MessageStatus.READ ? null : MessageStatus.READ)}
        />
        <DetailCard
          title="Ignoradas"
          value={skippedCount.toLocaleString()}
          subvalue="Variáveis/telefones inválidos (pré-check)"
          icon={Ban}
          color="#f59e0b"
          isActive={filterStatus === MessageStatus.SKIPPED}
          onClick={() => setFilterStatus?.(filterStatus === MessageStatus.SKIPPED ? null : MessageStatus.SKIPPED)}
        />
        <DetailCard
          title="Falhas"
          value={Number(failedCountForUi || 0).toLocaleString()}
          subvalue="Números inválidos ou bloqueio"
          icon={AlertCircle}
          color="#ef4444"
          isActive={filterStatus === MessageStatus.FAILED}
          onClick={() => setFilterStatus?.(filterStatus === MessageStatus.FAILED ? null : MessageStatus.FAILED)}
        />
      </div>

      {/* Performance / Baseline (sent-only) */}
      <Collapsible
        open={isPerfOpen}
        onOpenChange={setIsPerfOpen}
        className="mt-4 glass-panel rounded-2xl p-5 border border-white/5"
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-start justify-between gap-4 text-left"
            aria-label={isPerfOpen ? 'Recolher performance do disparo' : 'Expandir performance do disparo'}
          >
            <div>
              <h3 className="text-white font-bold">Velocidade do disparo</h3>
              <p className="text-xs text-gray-500">
                Conta apenas o período do primeiro envio até o último envio (sent-only).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-[10px] uppercase tracking-wider rounded-full px-2 py-1 border ${perfSourceLabel.tone}`}>
                {perfSourceLabel.label}
              </span>
              <ChevronDown
                size={16}
                className={`text-gray-500 transition-transform ${isPerfOpen ? 'rotate-180' : ''}`}
              />
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-4">
          {metrics?.source === 'campaigns_fallback' && (metrics as any)?.hint && (
            <div className="text-xs text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              <div className="font-medium">Métricas avançadas indisponíveis</div>
              <div className="mt-1 text-amber-200/80">{(metrics as any).hint}</div>
            </div>
          )}

          <div className={`${metrics?.source === 'campaigns_fallback' && (metrics as any)?.hint ? 'mt-4' : ''} grid grid-cols-1 sm:grid-cols-3 gap-4`}>
            <div className="sm:col-span-2">
              <DetailCard
                title="Velocidade (throughput)"
                value={formatThroughput(throughputMpsForUi)}
                subvalue={(() => {
                  const mps = Number(throughputMpsForUi);
                  const hasMps = Number.isFinite(mps) && mps > 0;

                  if (!hasMps) {
                    if (!perf?.first_dispatch_at) return 'Ainda não iniciou (sem first_dispatch_at).';
                    if (!perf?.last_sent_at) return 'Em andamento (sem last_sent_at).';
                    return 'Ainda sem dados suficientes para medir throughput.';
                  }

                  const baselineText = baselineThroughputMedian
                    ? `Baseline (mediana): ${baselineThroughputMedian.toFixed(2)} msg/s`
                    : 'Sem baseline suficiente (rode mais campanhas para comparar).';

                  if (isPerfEstimatedLive) {
                    return `Ao vivo (estimado). ${baselineText}`;
                  }

                  return baselineText;
                })()}
                icon={CheckCircle2}
                color="#10b981"
              />
            </div>

            <DetailCard
              title="Tempo total"
              value={formatDurationMs(dispatchDurationMsForUi)}
              subvalue="Do primeiro envio até o último envio"
              icon={Clock}
              color="#a1a1aa"
            />
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <DetailCard
              title="Limitador atual"
              value={limiterInfo.value}
              subvalue={limiterInfo.subvalue}
              icon={AlertCircle}
              color={limiterInfo.color}
            />

            <div className="sm:col-span-2 glass-panel p-5 rounded-2xl border border-white/5">
              <Collapsible open={isPerfTechOpen} onOpenChange={setIsPerfTechOpen}>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between gap-4 text-left"
                    aria-label={isPerfTechOpen ? 'Recolher detalhes técnicos' : 'Expandir detalhes técnicos'}
                  >
                    <div>
                      <div className="text-sm text-gray-300 font-medium">Detalhes técnicos</div>
                      <div className="text-xs text-gray-500">Config aplicada e identificadores (para diagnóstico)</div>
                    </div>
                    <ChevronDown
                      size={16}
                      className={`text-gray-500 transition-transform ${isPerfTechOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent className="mt-3">
                  <div className="text-xs text-gray-400 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="bg-zinc-900/50 border border-white/10 rounded-lg p-3">
                      <div className="text-gray-500">Config efetiva</div>
                      <div className="mt-1 font-mono">
                        conc={perf?.config?.effective?.concurrency ?? '—'} | batch={perf?.config?.effective?.configuredBatchSize ?? '—'}
                      </div>
                    </div>
                    <div className="bg-zinc-900/50 border border-white/10 rounded-lg p-3">
                      <div className="text-gray-500">Turbo (adaptive)</div>
                      <div className="mt-1 font-mono">
                        {perf?.config?.adaptive
                          ? `enabled=${String(perf.config.adaptive.enabled)} maxMps=${perf.config.adaptive.maxMps}`
                          : '—'}
                      </div>
                    </div>
                    <div className="bg-zinc-900/50 border border-white/10 rounded-lg p-3">
                      <div className="text-gray-500">Hash de config</div>
                      <div className="mt-1 font-mono">{perf?.config_hash ?? '—'}</div>
                    </div>
                  </div>

                  <div className="mt-2 text-[11px] text-gray-500">
                    {perf?.trace_id ? (
                      <span>ID da execução: <span className="font-mono text-gray-400">{perf.trace_id}</span></span>
                    ) : (
                      <span>ID da execução: <span className="font-mono text-gray-400">—</span></span>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {telemetry && (
        <div className="mt-4 glass-panel rounded-2xl p-5 border border-white/5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-white font-bold">Debug • Telemetria de latência</h3>
              <p className="text-xs text-gray-500">
                Best-effort. Útil para entender se o atraso está no broadcast, no realtime do DB ou no refetch.
              </p>
            </div>
            <span className="text-[10px] uppercase tracking-wider rounded-full px-2 py-1 border text-amber-200 bg-amber-500/10 border-amber-500/20">
              experimental
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-zinc-900/50 border border-white/10 rounded-lg p-3">
              <div className="text-gray-500 text-xs">Broadcast → UI</div>
              {telemetry.broadcast ? (
                <div className="mt-2 text-xs text-gray-300 space-y-1">
                  <div>
                    server→client: <span className="font-mono text-gray-200">{Math.round(telemetry.broadcast.serverToClientMs)}ms</span>
                  </div>
                  <div>
                    client→paint: <span className="font-mono text-gray-200">{Math.round(telemetry.broadcast.handlerToPaintMs)}ms</span>
                  </div>
                  <div>
                    total: <span className="font-mono text-gray-200">{Math.round(telemetry.broadcast.serverToPaintMs)}ms</span>
                  </div>
                  <div className="pt-1 text-[11px] text-gray-500">
                    trace: <span className="font-mono">{telemetry.broadcast.traceId || '—'}</span> • seq:{' '}
                    <span className="font-mono">{telemetry.broadcast.seq}</span>
                  </div>
                </div>
              ) : (
                <div className="mt-2 text-xs text-gray-500">Aguardando evento…</div>
              )}
            </div>

            <div className="bg-zinc-900/50 border border-white/10 rounded-lg p-3">
              <div className="text-gray-500 text-xs">DB realtime → UI</div>
              {telemetry.dbChange ? (
                <div className="mt-2 text-xs text-gray-300 space-y-1">
                  <div>
                    commit→client: <span className="font-mono text-gray-200">{Math.round(telemetry.dbChange.commitToClientMs)}ms</span>
                  </div>
                  <div>
                    client→paint: <span className="font-mono text-gray-200">{Math.round(telemetry.dbChange.handlerToPaintMs)}ms</span>
                  </div>
                  <div>
                    total: <span className="font-mono text-gray-200">{Math.round(telemetry.dbChange.commitToPaintMs)}ms</span>
                  </div>
                  <div className="pt-1 text-[11px] text-gray-500">
                    {telemetry.dbChange.table} • {telemetry.dbChange.eventType}
                  </div>
                </div>
              ) : (
                <div className="mt-2 text-xs text-gray-500">Aguardando mudança…</div>
              )}
            </div>

            <div className="bg-zinc-900/50 border border-white/10 rounded-lg p-3">
              <div className="text-gray-500 text-xs">Refetch (React Query)</div>
              {telemetry.refetch ? (
                <div className="mt-2 text-xs text-gray-300 space-y-1">
                  <div>
                    duração: <span className="font-mono text-gray-200">{Math.round(telemetry.refetch.durationMs ?? 0)}ms</span>
                  </div>
                  <div className="pt-1 text-[11px] text-gray-500">
                    motivo: <span className="font-mono">{telemetry.refetch.reason || '—'}</span>
                  </div>
                </div>
              ) : (
                <div className="mt-2 text-xs text-gray-500">Sem refetch recente</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Message Log */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="font-bold text-white flex items-center gap-2">
            Logs de Envio{' '}
            <span className="text-xs font-normal text-gray-500 bg-zinc-900 px-2 py-0.5 rounded-full">
              {Number(messageStats?.total ?? messages.length).toLocaleString()}
            </span>
          </h3>

          <div className="flex gap-2">
            {filterStatus === MessageStatus.DELIVERED && setIncludeReadInDelivered && (
              <button
                type="button"
                onClick={() => setIncludeReadInDelivered(!includeReadInDelivered)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center gap-2 ${
                  includeReadInDelivered
                    ? 'bg-blue-500/10 border-blue-500/20 text-blue-300 hover:bg-blue-500/15'
                    : 'bg-zinc-900/50 border-white/10 text-gray-300 hover:text-white hover:bg-white/5'
                }`}
                title={includeReadInDelivered
                  ? 'Mostrando entregues + lidas (cumulativo)'
                  : 'Mostrando apenas entregues (não lidas)'}
              >
                <Eye size={14} />
                {includeReadInDelivered ? 'Inclui lidas' : 'Só não lidas'}
              </button>
            )}

            <div className="flex items-center gap-2 bg-zinc-900/50 border border-white/10 rounded-lg px-3 py-1.5 w-full sm:w-64 focus-within:border-primary-500/50 transition-all">
              <Search size={14} className="text-gray-500" />
              <input
                type="text"
                placeholder="Buscar destinatário..."
                className="bg-transparent border-none outline-none text-sm w-full text-white placeholder-gray-600"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg border border-white/10 transition-colors">
              <Filter size={16} />
            </button>
            <button className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg border border-white/10 transition-colors">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-gray-400 uppercase text-xs tracking-wider">
              <tr>
                <th className="px-6 py-3 font-medium">Destinatário</th>
                <th className="px-6 py-3 font-medium">Telefone</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Horário</th>
                <th className="px-6 py-3 font-medium">Info</th>
                <th className="px-6 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {messages.map((msg) => (
                <tr key={msg.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-3 font-medium text-gray-200">{msg.contactName}</td>
                  <td className="px-6 py-3 font-mono text-xs text-gray-500">{msg.contactPhone}</td>
                  <td className="px-6 py-3">
                    <MessageStatusBadge status={msg.status} />
                  </td>
                  <td className="px-6 py-3 text-gray-500 text-xs">{msg.sentAt}</td>
                  <td className="px-6 py-3">
                    {msg.error ? (
                      <span
                        className={`text-xs flex items-center gap-1 ${
                          msg.status === MessageStatus.SKIPPED
                            ? 'text-amber-300'
                            : 'text-red-400'
                        }`}
                      >
                        {msg.status === MessageStatus.SKIPPED ? <Ban size={10} /> : <AlertCircle size={10} />}
                        {(() => {
                          const h = humanizePrecheckReason(String(msg.error || ''));
                          return (
                            <span>{h.title}</span>
                          );
                        })()}
                      </span>
                    ) : (
                      <span className="text-gray-600 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    {msg.contactId && msg.status === MessageStatus.SKIPPED && msg.error ? (
                      <button
                        onClick={() => {
                          const h = humanizePrecheckReason(String(msg.error));
                          setQuickEditContactId(msg.contactId!);
                          setQuickEditFocus(h?.focus || null);
                        }}
                        className="inline-flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors"
                        title="Corrigir contato sem sair da campanha"
                      >
                        <Pencil size={12} /> Corrigir contato
                      </button>
                    ) : (
                      <span className="text-gray-600 text-xs">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {messages.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Nenhum registro encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
          {(() => {
            const total = Number(messageStats?.total ?? messages.length)
            const shown = Number(messages.length)
            if (!total) return null
            if (shown >= total) return null

            const showLoadMore = Boolean(canLoadMore && onLoadMore)

            return (
              <div className="p-4 border-t border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-xs text-gray-500">
                  Mostrando <span className="font-mono text-gray-300">{shown}</span> de{' '}
                  <span className="font-mono text-gray-300">{total}</span>
                </div>

                {showLoadMore ? (
                  <button
                    type="button"
                    onClick={onLoadMore}
                    disabled={!!isLoadingMore}
                    className="px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2 text-xs font-medium disabled:opacity-50"
                  >
                    {isLoadingMore ? <Loader2 size={14} className="animate-spin" /> : null}
                    {isLoadingMore ? 'Carregando...' : 'Carregar mais'}
                  </button>
                ) : (
                  <div className="text-xs text-gray-600">(Esta tela carrega até 100 por vez)</div>
                )}
              </div>
            )
          })()}
        </div>
      </div>

      <ContactQuickEditModal
        isOpen={!!quickEditContactId}
        contactId={quickEditContactId}
        onClose={() => {
          setQuickEditContactId(null);
          setQuickEditFocus(null);
        }}
        focus={quickEditFocus}
        mode={quickEditFocus ? 'focused' : 'full'}
        title="Corrigir contato"
      />

      {/* Template Preview Modal */}
      <TemplatePreviewModal
        isOpen={showTemplatePreview}
        onClose={() => setShowTemplatePreview(false)}
        templateName={campaign.templateName}
      />
    </Page>
  );
};
