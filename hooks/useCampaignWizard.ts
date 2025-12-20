import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@/lib/navigation';
import { toast } from 'sonner';
import { campaignService, contactService, templateService } from '../services';
import { settingsService } from '../services/settingsService';
import { CampaignStatus, ContactStatus, MessageStatus, Template, TestContact } from '../types';
import { useAccountLimits } from './useAccountLimits';
import { CampaignValidation } from '../lib/meta-limits';
import { countTemplateVariables } from '../lib/template-validator';
import { getCountryCallingCodeFromPhone, normalizePhoneNumber } from '@/lib/phone-formatter';
import { getBrazilUfFromPhone, isBrazilPhone } from '@/lib/br-geo';

export const useCampaignWizardController = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);

  // Form State
  const [name, setName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [recipientSource, setRecipientSource] = useState<'all' | 'specific' | 'test' | null>(null);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [contactSearchTerm, setContactSearchTerm] = useState('');

  // Jobs/Ive audience presets (simple, fast decisions)
  type AudiencePresetId =
    | 'opt_in'
    | 'new_7d'
    | 'tag_top'
    | 'no_tags'
    | 'manual'
    | 'all'
    | 'test'
    | null;

  type AudienceCriteria = {
    status: 'OPT_IN' | 'OPT_OUT' | 'UNKNOWN' | 'ALL';
    includeTag?: string | null;
    createdWithinDays?: number | null;
    excludeOptOut?: boolean;
    noTags?: boolean;
    uf?: string | null; // BR only (derivado via DDD)
    ddi?: string | null; // País (DDI) derivado do telefone (ex.: "55")
    customFieldKey?: string | null;
    customFieldMode?: 'exists' | 'equals' | null;
    customFieldValue?: string | null;
  };

  const [audiencePreset, setAudiencePreset] = useState<AudiencePresetId>(null);
  const [audienceCriteria, setAudienceCriteria] = useState<AudienceCriteria>({
    status: 'OPT_IN',
    includeTag: null,
    createdWithinDays: null,
    excludeOptOut: true,
    noTags: false,
    uf: null,
    ddi: null,
    customFieldKey: null,
    customFieldMode: null,
    customFieldValue: null,
  });

  // Template Variables State - Official Meta API Structure
  // header: array of values for header {{1}}, {{2}}, etc.
  // body: array of values for body {{1}}, {{2}}, etc.
  // buttons: optional Record for button URL variables
  const [templateVariables, setTemplateVariables] = useState<{ header: string[], body: string[], buttons?: Record<string, string> }>({ header: [], body: [] });

  // Scheduling State
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [isScheduling, setIsScheduling] = useState(false);

  // Validation Modal State
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [validationResult, setValidationResult] = useState<CampaignValidation | null>(null);

  // Pré-check (dry-run) state
  const [precheckResult, setPrecheckResult] = useState<any>(null);
  const [isPrechecking, setIsPrechecking] = useState(false);
  const lastAutoPrecheckKeyRef = useRef<string>('');

  // Test contact: garante um contactId real (necessário para campaign_contacts e workflow)
  const [resolvedTestContactId, setResolvedTestContactId] = useState<string | null>(null);
  const [isEnsuringTestContact, setIsEnsuringTestContact] = useState(false);

  // Account Limits Hook
  const { validate, limits, isLoading: limitsLoading, tierName } = useAccountLimits();

  // --- Queries ---
  const contactsQuery = useQuery({
    queryKey: ['contacts'],
    queryFn: contactService.getAll,
    enabled: step >= 2,
    staleTime: 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const templatesQuery = useQuery({
    queryKey: ['templates'],
    queryFn: templateService.getAll,
    select: (data) => data.filter(t => t.status === 'APPROVED'),
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Get settings (mostly for limits/credentials)
  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: settingsService.get,
    staleTime: 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // NEW: Fetch test contact from DB (Source of Truth)
  const testContactQuery = useQuery({
    queryKey: ['testContact'],
    queryFn: settingsService.getTestContact,
    staleTime: 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Prefer DB data, fallback to settings (legacy/local)
  const testContact = testContactQuery.data || settingsQuery.data?.testContact;

  // Quando a fonte é "Contato de Teste", criamos (ou atualizamos) um contato no banco por telefone
  // para obter um contactId real. Isso evita:
  // - pré-check ignorando por MISSING_CONTACT_ID
  // - criação de campanha quebrando por campaign_contacts exigir contact_id
  useEffect(() => {
    let cancelled = false;

    const ensure = async () => {
      if (recipientSource !== 'test' || !testContact?.phone) {
        setResolvedTestContactId(null);
        setIsEnsuringTestContact(false);
        return;
      }

      setIsEnsuringTestContact(true);
      try {
        const saved = await contactService.add({
          name: testContact.name || 'Contato de Teste',
          phone: testContact.phone,
          email: null,
          status: ContactStatus.OPT_IN,
          tags: [],
          custom_fields: {},
        } as any);

        if (!cancelled) {
          setResolvedTestContactId(saved?.id || null);
        }
      } catch (e: any) {
        if (!cancelled) {
          setResolvedTestContactId(null);
          toast.error(e?.message || 'Não foi possível preparar o contato de teste para envio');
        }
      } finally {
        if (!cancelled) setIsEnsuringTestContact(false);
      }
    };

    ensure();
    return () => {
      cancelled = true;
    };
  }, [recipientSource, testContact?.phone, testContact?.name]);

  // Initialize name
  useEffect(() => {
    if (!name) {
      const date = new Date().toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' });
      setName(`Campanha ${date}`);
    }
  }, []);

  // Update selected contact IDs when switching to "all"
  useEffect(() => {
    if (recipientSource === 'all' && contactsQuery.data) {
      setSelectedContactIds(contactsQuery.data.map(c => c.id));
    } else if (recipientSource === 'test') {
      // Test mode doesn't use contact IDs - handled separately
      setSelectedContactIds([]);
    }
  }, [recipientSource, contactsQuery.data]);

  // --- Mutations ---
  const createCampaignMutation = useMutation({
    mutationFn: campaignService.create,
    onMutate: async (input) => {
      // Generate temp ID for immediate navigation
      const tempId = `temp_${Date.now()}`;

      // 🚀 PRE-SET cache with PENDING messages BEFORE API call
      const contacts = input.selectedContacts || [];
      const pendingMessages = contacts.map((contact, index) => ({
        id: `msg_${tempId}_${index}`,
        campaignId: tempId,
        contactId: contact.id,
        contactName: contact.name || contact.phone,
        contactPhone: contact.phone,
        status: MessageStatus.PENDING,
        sentAt: '-',
      }));

      // Pre-populate the campaign in cache
      const pendingCampaign = {
        id: tempId,
        name: input.name,
        templateName: input.templateName,
        recipients: input.recipients,
        // Prévia leve (não salvar a lista inteira para não explodir memória)
        pendingContacts: contacts.slice(0, 50).map(c => ({
          name: c.name || '',
          phone: c.phone,
        })),
        sent: 0,
        delivered: 0,
        read: 0,
        skipped: 0,
        failed: 0,
        status: (input.scheduledAt ? 'SCHEDULED' : 'SENDING') as CampaignStatus,
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData(['campaign', tempId], pendingCampaign);

      // Importante:
      // A tela de detalhes usa queryKey ['campaignMessages', id, filterStatus, includeRead].
      // Aqui pré-populamos o formato esperado para evitar “Carregando...” enquanto o backend
      // faz pré-check/dispatch (pode levar ~10s).
      queryClient.setQueryData(['campaignMessages', tempId, null, false], {
        messages: pendingMessages,
        stats: {
          total: pendingMessages.length,
          pending: pendingMessages.length,
          sent: 0,
          delivered: 0,
          read: 0,
          skipped: 0,
          failed: 0,
        },
        pagination: {
          limit: pendingMessages.length,
          offset: 0,
          total: pendingMessages.length,
          hasMore: false,
        },
      });

      // Navigate IMMEDIATELY (before API responds)
      navigate(`/campaigns/${tempId}`);

      return { tempId };
    },
    onSuccess: (campaign, _input, context) => {
      const tempId = context?.tempId;

      // Copy cached data to real campaign ID
      if (tempId) {
        const cachedMessages = queryClient.getQueryData(['campaignMessages', tempId, null, false]);
        if (cachedMessages) {
          queryClient.setQueryData(['campaignMessages', campaign.id, null, false], cachedMessages);
        }
        // Clean up temp cache
        queryClient.removeQueries({ queryKey: ['campaign', tempId] });
        queryClient.removeQueries({ queryKey: ['campaignMessages', tempId] });
      }

      // Preenche imediatamente o cache da campanha real (evita flicker após replace)
      if (campaign?.id) {
        queryClient.setQueryData(['campaign', campaign.id], campaign);
      }

      queryClient.invalidateQueries({ queryKey: ['campaigns'] });

      // Navigate to real campaign (replaces temp URL)
      navigate(`/campaigns/${campaign.id}`, { replace: true });

      if (campaign?.status === 'Agendado') {
        toast.success('Campanha criada e agendada com sucesso!');
      } else {
        toast.success('Campanha criada e disparada com sucesso!');
      }
    },
    onError: (_error, _input, context) => {
      // Clean up temp cache on error
      if (context?.tempId) {
        queryClient.removeQueries({ queryKey: ['campaign', context.tempId] });
        queryClient.removeQueries({ queryKey: ['campaignMessages', context.tempId] });
      }
      toast.error('Erro ao criar campanha.');
      navigate('/campaigns');
    }
  });

  // --- Logic ---
  const allContacts = contactsQuery.data || [];
  const totalContacts = allContacts.length;
  const selectedContacts = allContacts.filter(c => selectedContactIds.includes(c.id));

  // Supressões globais por telefone (best-effort): mantém UI/contagens alinhadas com o backend.
  const suppressionsQuery = useQuery({
    queryKey: ['phoneSuppressionsActive', contactsQuery.dataUpdatedAt],
    enabled: (contactsQuery.data?.length || 0) > 0,
    queryFn: async (): Promise<{ phones: string[] }> => {
      const phones = Array.from(
        new Set((contactsQuery.data || []).map((c: any) => String(c?.phone || '').trim()).filter(Boolean))
      );

      if (phones.length === 0) return { phones: [] };

      const res = await fetch('/api/phone-suppressions/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phones }),
      });

      if (!res.ok) {
        // best-effort: se falhar, seguimos sem supressões para não travar o wizard
        return { phones: [] };
      }

      return res.json();
    },
    select: (data) => {
      const normalized = (data?.phones || [])
        .map((p) => normalizePhoneNumber(String(p || '').trim()))
        .filter(Boolean);
      return new Set(normalized);
    },
    staleTime: 30 * 1000,
  });

  const suppressedPhones = suppressionsQuery.data || new Set<string>();

  const topTag = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of allContacts) {
      for (const t of c.tags || []) {
        const key = String(t || '').trim();
        if (!key) continue;
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
    let best: { tag: string; count: number } | null = null;
    for (const [tag, count] of counts.entries()) {
      if (!best || count > best.count) best = { tag, count };
    }
    return best?.tag || null;
  }, [allContacts]);

  const audienceStats = useMemo(() => {
    let eligible = 0;
    let optInEligible = 0;
    let suppressed = 0;
    let topTagEligible = 0;
    let noTagsEligible = 0;
    const ufCounts = new Map<string, number>();
    const tagCounts = new Map<string, { label: string; count: number }>();
    const ddiCounts = new Map<string, number>();
    const customFieldCounts = new Map<string, number>();

    const top = (topTag || '').trim().toLowerCase();

    for (const c of allContacts) {
      const phone = normalizePhoneNumber(String((c as any)?.phone || '').trim());
      const isSuppressed = !!phone && suppressedPhones.has(phone);
      if (isSuppressed) suppressed += 1;

      // Regra de negócio: opt-out nunca entra em audiência
      if (c.status === ContactStatus.OPT_OUT) continue;
      if (isSuppressed) continue;

      eligible += 1;
      if (c.status === ContactStatus.OPT_IN) optInEligible += 1;

      const tags = (c.tags || []).map((t) => String(t || '').trim().toLowerCase()).filter(Boolean);
      if (tags.length === 0) noTagsEligible += 1;
      if (top && tags.includes(top)) topTagEligible += 1;

      // Tags (elegíveis) - para seletor de tags no UI
      for (const rawTag of c.tags || []) {
        const label = String(rawTag || '').trim();
        if (!label) continue;
        const key = label.toLowerCase();
        const curr = tagCounts.get(key);
        if (!curr) tagCounts.set(key, { label, count: 1 });
        else tagCounts.set(key, { label: curr.label, count: curr.count + 1 });
      }

      // UF (apenas BR) - calculado on-the-fly via DDD
      if (isBrazilPhone(String((c as any)?.phone || '').trim())) {
        const uf = getBrazilUfFromPhone(String((c as any)?.phone || '').trim());
        if (uf) ufCounts.set(uf, (ufCounts.get(uf) || 0) + 1);
      }

      // DDI (País)
      {
        const ddi = getCountryCallingCodeFromPhone(String((c as any)?.phone || '').trim());
        if (ddi) ddiCounts.set(ddi, (ddiCounts.get(ddi) || 0) + 1);
      }

      // Campos personalizados (conta quantos contatos elegíveis possuem cada key preenchida)
      {
        const cf = (c as any)?.custom_fields as Record<string, any> | undefined;
        if (cf && typeof cf === 'object') {
          for (const k of Object.keys(cf)) {
            const key = String(k || '').trim();
            if (!key) continue;
            const v = (cf as any)[key];
            const isEmpty = v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
            if (isEmpty) continue;
            customFieldCounts.set(key, (customFieldCounts.get(key) || 0) + 1);
          }
        }
      }
    }

    const brUfCounts = Array.from(ufCounts.entries())
      .map(([uf, count]) => ({ uf, count }))
      .sort((a, b) => b.count - a.count || a.uf.localeCompare(b.uf));

    const tagCountsEligible = Array.from(tagCounts.values())
      .map(({ label, count }) => ({ tag: label, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));

    const ddiCountsEligible = Array.from(ddiCounts.entries())
      .map(([ddi, count]) => ({ ddi, count }))
      .sort((a, b) => b.count - a.count || a.ddi.localeCompare(b.ddi));

    const customFieldCountsEligible = Array.from(customFieldCounts.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));

    return {
      eligible,
      optInEligible,
      suppressed,
      topTagEligible,
      noTagsEligible,
      brUfCounts,
      tagCountsEligible,
      ddiCountsEligible,
      customFieldCountsEligible,
    };
  }, [allContacts, suppressedPhones, topTag]);

  const computeContactIdsByCriteria = (criteria: AudienceCriteria) => {
    const now = Date.now();
    const withinMs = criteria.createdWithinDays ? criteria.createdWithinDays * 24 * 60 * 60 * 1000 : null;

    const out: string[] = [];
    for (const c of allContacts) {
      // Guard-rails de negócio (alinha com backend):
      // - opt-out: nunca enviar
      // - suprimidos: nunca enviar
      if (c.status === 'OPT_OUT') continue;
      const normalizedPhone = normalizePhoneNumber(String((c as any)?.phone || '').trim());
      if (normalizedPhone && suppressedPhones.has(normalizedPhone)) continue;

      // UF (BR)
      if (criteria.uf) {
        const targetUf = String(criteria.uf).trim().toUpperCase();
        if (targetUf) {
          const uf = getBrazilUfFromPhone(String((c as any)?.phone || '').trim());
          if (!uf || uf !== targetUf) continue;
        }
      }

      // DDI (País)
      if (criteria.ddi) {
        const target = String(criteria.ddi).trim().replace(/^\+/, '');
        if (target) {
          const ddi = getCountryCallingCodeFromPhone(String((c as any)?.phone || '').trim());
          if (!ddi || String(ddi) !== target) continue;
        }
      }

      // status
      if (criteria.status !== 'ALL') {
        if (c.status !== criteria.status) continue;
      }

      // no tags
      const tags = c.tags || [];
      if (criteria.noTags) {
        if (tags.length !== 0) continue;
      }

      // include tag
      if (criteria.includeTag) {
        const target = String(criteria.includeTag).trim().toLowerCase();
        if (!target) continue;
        const has = tags.some((t) => String(t || '').trim().toLowerCase() === target);
        if (!has) continue;
      }

      // custom field
      if (criteria.customFieldKey) {
        const key = String(criteria.customFieldKey).trim();
        if (!key) continue;
        const cf = (c as any)?.custom_fields as Record<string, any> | undefined;
        const raw = cf && typeof cf === 'object' ? (cf as any)[key] : undefined;
        const isEmpty = raw === null || raw === undefined || (typeof raw === 'string' && raw.trim() === '');

        const mode = criteria.customFieldMode ?? 'exists';
        if (mode === 'exists') {
          if (isEmpty) continue;
        } else if (mode === 'equals') {
          if (isEmpty) continue;
          const expected = String(criteria.customFieldValue ?? '').trim().toLowerCase();
          if (!expected) continue;
          const actual = String(raw).trim().toLowerCase();
          if (actual !== expected) continue;
        }
      }

      // created within
      if (withinMs) {
        const createdAt = (c as any).createdAt || (c as any).created_at;
        if (!createdAt) continue;
        const ts = new Date(String(createdAt)).getTime();
        if (!Number.isFinite(ts)) continue;
        if (now - ts > withinMs) continue;
      }

      out.push(c.id);
    }
    return out;
  };

  const applyAudienceCriteria = (criteria: AudienceCriteria, preset?: Exclude<AudiencePresetId, null>) => {
    setRecipientSource('specific');
    setAudiencePreset(preset ?? 'manual');
    setAudienceCriteria(criteria);
    const ids = computeContactIdsByCriteria(criteria);
    setSelectedContactIds(ids);
  };

  const selectAudiencePreset = (preset: Exclude<AudiencePresetId, null>) => {
    if (preset === 'test') {
      setRecipientSource('test');
      setAudiencePreset('test');
      setSelectedContactIds([]);
      return;
    }

    if (preset === 'all') {
      // "Todos" no Jobs-mode = todos elegíveis (exclui OPT_OUT por segurança)
      applyAudienceCriteria(
        {
          status: 'ALL',
          includeTag: null,
          createdWithinDays: null,
          excludeOptOut: true,
          noTags: false,
          uf: null,
          ddi: null,
          customFieldKey: null,
          customFieldMode: null,
          customFieldValue: null,
        },
        'all'
      );
      return;
    }

    if (preset === 'manual') {
      setRecipientSource('specific');
      setAudiencePreset('manual');
      setAudienceCriteria({
        status: 'ALL',
        includeTag: null,
        createdWithinDays: null,
        excludeOptOut: false,
        noTags: false,
        uf: null,
        ddi: null,
        customFieldKey: null,
        customFieldMode: null,
        customFieldValue: null,
      });
      setSelectedContactIds([]);
      return;
    }

    if (preset === 'opt_in') {
      applyAudienceCriteria(
        {
          status: 'OPT_IN',
          includeTag: null,
          createdWithinDays: null,
          excludeOptOut: true,
          noTags: false,
          uf: null,
          ddi: null,
          customFieldKey: null,
          customFieldMode: null,
          customFieldValue: null,
        },
        'opt_in'
      );
      return;
    }

    if (preset === 'new_7d') {
      applyAudienceCriteria(
        {
          status: 'OPT_IN',
          includeTag: null,
          createdWithinDays: 7,
          excludeOptOut: true,
          noTags: false,
          uf: null,
          ddi: null,
          customFieldKey: null,
          customFieldMode: null,
          customFieldValue: null,
        },
        'new_7d'
      );
      return;
    }

    if (preset === 'tag_top') {
      if (!topTag) {
        applyAudienceCriteria(
          {
            status: 'OPT_IN',
            includeTag: null,
            createdWithinDays: null,
            excludeOptOut: true,
            noTags: false,
            uf: null,
            ddi: null,
            customFieldKey: null,
            customFieldMode: null,
            customFieldValue: null,
          },
          'opt_in'
        );
        return;
      }
      applyAudienceCriteria(
        {
          status: 'OPT_IN',
          includeTag: topTag,
          createdWithinDays: null,
          excludeOptOut: true,
          noTags: false,
          uf: null,
          ddi: null,
          customFieldKey: null,
          customFieldMode: null,
          customFieldValue: null,
        },
        'tag_top'
      );
      return;
    }

    if (preset === 'no_tags') {
      applyAudienceCriteria(
        {
          status: 'OPT_IN',
          includeTag: null,
          createdWithinDays: null,
          excludeOptOut: true,
          noTags: true,
          uf: null,
          ddi: null,
          customFieldKey: null,
          customFieldMode: null,
          customFieldValue: null,
        },
        'no_tags'
      );
    }
  };

  // Default audience (Jobs-mode): novos (7d), once contacts are available.
  useEffect(() => {
    if (step !== 2) return;
    if (audiencePreset) return;
    if (!allContacts || allContacts.length === 0) return;
    // Default (simples): Todos (já exclui opt-out + supressões)
    selectAudiencePreset('all');
  }, [step, allContacts.length, audiencePreset]);

  // Filter contacts by search term (name, phone, email, tags)
  const filteredContacts = useMemo(() => {
    if (!contactSearchTerm.trim()) return allContacts;
    const term = contactSearchTerm.toLowerCase().trim();
    return allContacts.filter(contact => {
      const nameMatch = contact.name?.toLowerCase().includes(term);
      const phoneMatch = contact.phone?.toLowerCase().includes(term);
      const emailMatch = contact.email?.toLowerCase().includes(term);
      const tagsMatch = contact.tags?.some(tag => tag.toLowerCase().includes(term));
      return nameMatch || phoneMatch || emailMatch || tagsMatch;
    });
  }, [allContacts, contactSearchTerm]);

  // Calculate recipient count - 1 for test mode, otherwise selected contacts
  const recipientCount = recipientSource === 'test' && testContact ? 1 : selectedContacts.length;

  // Get contacts for sending - test contact or selected contacts (includes email and custom_fields for variable resolution)
  const contactsForSending = recipientSource === 'test' && testContact
    ? (() => {
      const testId = resolvedTestContactId;
      if (!testId) return [];
      return [
        {
          id: testId,
          contactId: testId,
          name: testContact.name || testContact.phone,
          phone: testContact.phone,
          email: (testContact as any).email || '',
          custom_fields: (testContact as any).custom_fields || {},
        },
      ];
    })()
    : selectedContacts.map(c => ({ id: c.id, contactId: c.id, name: c.name || c.phone, phone: c.phone, email: c.email || '', custom_fields: c.custom_fields || {} }));

  const availableTemplates = templatesQuery.data || [];
  const selectedTemplate = availableTemplates.find(t => t.id === selectedTemplateId);

  // Calculate all template variables with detailed info about where each is used
  const templateVariableInfo = useMemo(() => {
    if (!selectedTemplate) return { body: [], header: [], buttons: [], totalExtra: 0 };

    const components = selectedTemplate.components || [];
    const result = {
      body: [] as { index: number; key: string; placeholder: string; context: string }[],
      header: [] as { index: number; key: string; placeholder: string; context: string }[],
      buttons: [] as { index: number; key: string; buttonIndex: number; buttonText: string; context: string }[],
      totalExtra: 0,
    };

    // Generic Regex to match {{1}} OR {{variable_name}}
    const varRegex = /\{\{([\w\d_]+)\}\}/g;

    // Helper to extract numeric index or return string key
    const getVarId = (match: string): { isNum: boolean, val: string } => {
      const clean = match.replace(/[{}]/g, '');
      const num = parseInt(clean);
      return { isNum: !isNaN(num), val: clean };
    };

    // Parse body variables (deduplicate - same variable may appear multiple times in text)
    const bodyComponent = components.find(c => c.type === 'BODY');
    if (bodyComponent?.text) {
      const matches = bodyComponent.text.match(varRegex) || [];
      const seenKeys = new Set<string>();
      matches.forEach((match) => {
        const { isNum, val } = getVarId(match);
        // Skip if we've already seen this variable
        if (seenKeys.has(val)) return;
        seenKeys.add(val);

        result.body.push({
          index: isNum ? parseInt(val) : 0, // 0 for named
          key: val,
          placeholder: match,
          context: `Variável do corpo (${match})`
        });
      });
    }

    // Parse header variables (deduplicate - same variable may appear multiple times)
    const headerComponent = components.find(c => c.type === 'HEADER');
    if (headerComponent?.format === 'TEXT' && headerComponent?.text) {
      const matches = headerComponent.text.match(varRegex) || [];
      const seenKeys = new Set<string>();
      matches.forEach((match) => {
        const { isNum, val } = getVarId(match);
        // Skip if we've already seen this variable
        if (seenKeys.has(val)) return;
        seenKeys.add(val);

        result.header.push({
          index: isNum ? parseInt(val) : 0,
          key: val,
          placeholder: match,
          context: `Variável do cabeçalho (${match})`
        });
      });
    }

    // Parse button variables (URL)
    const buttonsComponent = components.find(c => c.type === 'BUTTONS');
    if (buttonsComponent?.buttons) {
      buttonsComponent.buttons.forEach((btn: any, btnIndex: number) => {
        if (btn.type === 'URL' && btn.url) {
          const matches = btn.url.match(varRegex) || [];
          matches.forEach((match: string) => {
            const { isNum, val } = getVarId(match);
            result.buttons.push({
              index: isNum ? parseInt(val) : 0, // Usually just 1
              key: val,
              buttonIndex: btnIndex,
              buttonText: btn.text || `Botão ${btnIndex + 1}`,
              context: `Variável da URL (${match})`
            });
          });
        }
      });
    }

    // Calculate total extra variables (not used for limits logic directly locally but good for UI)
    result.totalExtra = result.body.length + result.header.length + result.buttons.length;

    return result;
  }, [selectedTemplate]);

  // For backward compatibility - count of extra variables
  const templateVariableCount = templateVariableInfo.totalExtra;

  // AUTO-MAPPING & Reset
  // Strategy: Only auto-fill when Meta variable name EXACTLY matches our system fields
  // System fields: nome, telefone, email (Portuguese)
  useEffect(() => {
    const systemFields = ['nome', 'telefone', 'email'];

    // Build header array - one value per header variable
    const headerVars = templateVariableInfo.header
      .sort((a, b) => a.index - b.index)
      .map(v => {
        const lowerKey = v.key.toLowerCase();
        return systemFields.includes(lowerKey) ? `{{${lowerKey}}}` : '';
      });

    // Build body array - one value per body variable
    const bodyVars = templateVariableInfo.body
      .sort((a, b) => a.index - b.index)
      .map(v => {
        const lowerKey = v.key.toLowerCase();
        return systemFields.includes(lowerKey) ? `{{${lowerKey}}}` : '';
      });

    setTemplateVariables({ header: headerVars, body: bodyVars });
  }, [templateVariableInfo]);

  // 🔴 LIVE VALIDATION - Check limits in real-time as user selects contacts
  const liveValidation = useMemo(() => {
    if (recipientCount === 0) return null;
    return validate(recipientCount);
  }, [recipientCount, validate]);

  const isOverLimit = liveValidation ? !liveValidation.canSend : false;
  // Use the limit from validation (respects DEBUG mode) not from API limits
  const currentLimit = liveValidation?.currentLimit || limits?.maxUniqueUsersPerDay || 250;

  const toggleContact = (contactId: string) => {
    setSelectedContactIds(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleNext = () => {
    if (step === 1) {
      if (!name) { toast.error('Por favor insira o nome da campanha'); return; }
      if (!selectedTemplateId) { toast.error('Por favor selecione um template'); return; }
    }
    if (step === 2) {
      if (!recipientSource) { toast.error('Por favor selecione uma fonte de destinatários'); return; }
      if (recipientSource === 'specific' && selectedContactIds.length === 0) {
        toast.error('Por favor selecione pelo menos um contato');
        return;
      }
      if (recipientSource === 'test' && !testContact) {
        toast.error('Contato de teste não configurado. Configure em Ajustes.');
        return;
      }
    }
    setStep((prev) => Math.min(prev + 1, 3));
  };

  const handleBack = () => setStep((prev) => Math.max(prev - 1, 1));

  const runPrecheck = async (options?: { silent?: boolean; force?: boolean }) => {
    if (!selectedTemplate?.name) {
      if (!options?.silent) toast.error('Selecione um template antes de validar');
      return;
    }

    // Em modo teste, pode existir um pequeno delay até termos o contactId resolvido.
    // Evita UX confusa de "Selecione pelo menos um contato".
    if (recipientSource === 'test' && testContact && !resolvedTestContactId) {
      if (!options?.silent) toast.info('Preparando contato de teste…');
      return;
    }

    if (!contactsForSending || contactsForSending.length === 0) {
      if (!options?.silent) toast.error('Selecione pelo menos um contato');
      return;
    }

    setIsPrechecking(true);
    try {
      const result = await campaignService.precheck({
        templateName: selectedTemplate.name,
        contacts: contactsForSending,
        templateVariables:
          (templateVariables.header.length > 0 || templateVariables.body.length > 0 || (templateVariables.buttons && Object.keys(templateVariables.buttons).length > 0))
            ? templateVariables
            : undefined,
      });

      setPrecheckResult(result);

      const skipped = result?.totals?.skipped ?? 0;
      const valid = result?.totals?.valid ?? 0;
      if (!options?.silent) {
        if (skipped > 0) {
          toast.warning(`Pré-check: ${valid} válidos, ${skipped} serão ignorados (ver detalhes)`);
        } else {
          toast.success(`Pré-check OK: ${valid} destinatários válidos`);
        }
      }

      return result;
    } catch (e: any) {
      if (!options?.silent) toast.error(e?.message || 'Falha ao validar destinatários');
      return null;
    } finally {
      setIsPrechecking(false);
    }
  };

  const handlePrecheck = async (): Promise<void> => {
    await runPrecheck({ silent: false, force: true });
  };

  // Auto pré-check no Step 3 (debounce). Mantém UX: o usuário "bate o olho" e já vê o que está faltando.
  const autoPrecheckKey = useMemo(() => {
    if (!selectedTemplate?.name) return '';
    if (!contactsForSending || contactsForSending.length === 0) return '';
    // Evita chaves gigantes: usamos apenas contagem + variáveis.
    const varsHash = JSON.stringify(templateVariables);
    const contactsVersion = contactsQuery.dataUpdatedAt || 0;
    const testContactVersion = testContactQuery.dataUpdatedAt || 0;
    return `${selectedTemplate.name}|${contactsForSending.length}|${varsHash}|c${contactsVersion}|t${testContactVersion}`;
  }, [
    selectedTemplate?.name,
    contactsForSending.length,
    templateVariables,
    contactsQuery.dataUpdatedAt,
    testContactQuery.dataUpdatedAt,
  ]);

  useEffect(() => {
    if (step !== 3) return;
    if (!autoPrecheckKey) return;
    if (isPrechecking) return;
    if (createCampaignMutation.isPending) return;

    const t = setTimeout(() => {
      if (lastAutoPrecheckKeyRef.current === autoPrecheckKey) return;
      lastAutoPrecheckKeyRef.current = autoPrecheckKey;
      runPrecheck({ silent: true });
    }, 650);

    return () => clearTimeout(t);
  }, [step, autoPrecheckKey, isPrechecking, createCampaignMutation.isPending]);

  // INTELLIGENT VALIDATION - Prevents users from sending campaigns that exceed limits
  const handleSend = async (scheduleTime?: string) => {
    if (recipientSource === 'test' && testContact && !resolvedTestContactId) {
      toast.info('Preparando contato de teste…');
      return;
    }

    // Validate that all required template variables are filled
    if (templateVariableCount > 0) {
      // Check if we have enough keys filled? 
      // Actually we should check against templateVariableInfo requirements.
      // For now, simpler check: do we have at least `templateVariableCount` keys?
      // Or better: are any values empty?
      // Since we initialize empty, we rely on user filling them.

      const isFilled = (v: unknown) => {
        if (typeof v !== 'string') return false;
        return v.trim().length > 0;
      };

      const filledCount =
        [...templateVariables.header, ...templateVariables.body].filter(isFilled).length +
        Object.values(templateVariables.buttons || {}).filter(isFilled).length;
      if (filledCount < templateVariableCount) {
        toast.error(`Preencha todas as variáveis do template (${templateVariableCount - filledCount} pendentes)`);
        return;
      }
    }

    // Dry-run pré-check antes de criar/disparar (UX). Backend continua blindado.
    // Regra: se NENHUM válido, não cria a campanha.
    const result = await runPrecheck();
    if (result?.totals && result.totals.valid === 0) {
      toast.error('Nenhum destinatário válido para envio. Corrija os contatos ignorados e valide novamente.');
      return;
    }

    // Validate campaign against account limits
    const validation = validate(recipientCount);
    setValidationResult(validation);

    // If campaign is blocked, show modal with explanation
    if (!validation.canSend) {
      setShowBlockModal(true);
      return;
    }

    // Show warnings if any (but allow to proceed)
    if (validation.warnings.length > 0) {
      validation.warnings.forEach(warning => {
        toast.warning(warning);
      });
    }

    // Proceed with campaign creation
    createCampaignMutation.mutate({
      name: recipientSource === 'test' ? `[TESTE] ${name}` : name,
      templateName: selectedTemplate?.name || 'unknown_template',
      recipients: recipientCount,
      selectedContacts: contactsForSending,
      selectedContactIds: recipientSource === 'test' ? [] : selectedContactIds, // Save for resume functionality
      scheduledAt: scheduleTime || scheduledAt || undefined, // Use provided time or state
      templateVariables: (templateVariables.header.length > 0 || templateVariables.body.length > 0) ? templateVariables : undefined,
    });
  };

  // Schedule campaign for later
  const handleSchedule = (scheduleTime: string) => {
    setScheduledAt(scheduleTime);
    handleSend(scheduleTime);
  };

  // Close the block modal
  const closeBlockModal = () => {
    setShowBlockModal(false);
    setValidationResult(null);
  };

  return {
    step,
    setStep,
    name,
    setName,
    selectedTemplateId,
    setSelectedTemplateId,
    recipientSource,
    setRecipientSource,
    totalContacts,
    recipientCount,
    allContacts,
    filteredContacts,
    contactSearchTerm,
    setContactSearchTerm,
    selectedContacts,
    selectedContactIds,
    toggleContact,

    // Jobs/Ive audience
    audiencePreset,
    audienceCriteria,
    topTag,
    applyAudienceCriteria,
    selectAudiencePreset,
    audienceStats,
    availableTemplates,
    selectedTemplate,
    handleNext,
    handleBack,
    handlePrecheck,
    handleSend,
    isCreating: createCampaignMutation.isPending,
    // Pré-check (dry-run)
    precheckResult,
    isPrechecking,

    // Test Contact
    testContact,
    isEnsuringTestContact,

    // Template Variables (for {{2}}, {{3}}, etc.)
    templateVariables,
    setTemplateVariables,
    templateVariableCount,
    templateVariableInfo, // Detailed info about each variable location

    // Account Limits & Validation state
    accountLimits: limits,
    isBlockModalOpen: showBlockModal,
    setIsBlockModalOpen: setShowBlockModal,
    blockReason: validationResult,
    tierName,

    // Live validation (real-time as user selects)
    liveValidation,
    isOverLimit,
    currentLimit,

    // Scheduling
    scheduledAt,
    setScheduledAt,
    isScheduling,
    setIsScheduling,
    handleSchedule,
  };
};
