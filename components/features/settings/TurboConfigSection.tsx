'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Zap } from 'lucide-react';
import { toast } from 'sonner';
import {
  TurboStatusCard,
  TurboPhoneCard,
  TurboActionsCard,
  TurboPlannerSection,
  TurboConfigForm,
  type TurboDraft,
  type TurboPlan,
} from './turbo';

// Types
interface WhatsAppThrottleConfig {
  enabled: boolean;
  sendConcurrency?: number;
  batchSize?: number;
  startMps: number;
  maxMps: number;
  minMps: number;
  cooldownSec: number;
  minIncreaseGapSec: number;
  sendFloorDelayMs: number;
}

interface WhatsAppThrottleState {
  targetMps: number;
  cooldownUntil?: string | null;
  lastIncreaseAt?: string | null;
  lastDecreaseAt?: string | null;
  updatedAt?: string | null;
}

export interface TurboConfigSectionProps {
  whatsappThrottle?: {
    ok: boolean;
    source?: 'db' | 'env';
    phoneNumberId?: string | null;
    config?: WhatsAppThrottleConfig;
    state?: WhatsAppThrottleState | null;
  } | null;
  whatsappThrottleLoading?: boolean;
  saveWhatsAppThrottle?: (data: Partial<WhatsAppThrottleConfig> & { resetState?: boolean }) => Promise<void>;
  isSaving?: boolean;
  settings: {
    phoneNumberId?: string | null;
  };
}

export function TurboConfigSection({
  whatsappThrottle,
  whatsappThrottleLoading,
  saveWhatsAppThrottle,
  isSaving,
  settings,
}: TurboConfigSectionProps) {
  const turboConfig = whatsappThrottle?.config;
  const turboState = whatsappThrottle?.state;

  const [isEditing, setIsEditing] = useState(false);
  const [turboDraft, setTurboDraft] = useState<TurboDraft>(() => ({
    enabled: turboConfig?.enabled ?? false,
    sendConcurrency: (turboConfig as any)?.sendConcurrency ?? 1,
    batchSize: (turboConfig as any)?.batchSize ?? 10,
    startMps: turboConfig?.startMps ?? 30,
    maxMps: turboConfig?.maxMps ?? 80,
    minMps: turboConfig?.minMps ?? 5,
    cooldownSec: turboConfig?.cooldownSec ?? 30,
    minIncreaseGapSec: turboConfig?.minIncreaseGapSec ?? 10,
    sendFloorDelayMs: turboConfig?.sendFloorDelayMs ?? 0,
  }));

  // Keep draft in sync when server data arrives
  useEffect(() => {
    if (!turboConfig) return;
    setTurboDraft({
      enabled: turboConfig.enabled,
      sendConcurrency: (turboConfig as any)?.sendConcurrency ?? 1,
      batchSize: (turboConfig as any)?.batchSize ?? 10,
      startMps: turboConfig.startMps,
      maxMps: turboConfig.maxMps,
      minMps: turboConfig.minMps,
      cooldownSec: turboConfig.cooldownSec,
      minIncreaseGapSec: turboConfig.minIncreaseGapSec,
      sendFloorDelayMs: turboConfig.sendFloorDelayMs,
    });
  }, [
    turboConfig?.enabled,
    (turboConfig as any)?.sendConcurrency,
    (turboConfig as any)?.batchSize,
    turboConfig?.startMps,
    turboConfig?.maxMps,
    turboConfig?.minMps,
    turboConfig?.cooldownSec,
    turboConfig?.minIncreaseGapSec,
    turboConfig?.sendFloorDelayMs,
  ]);

  const handleSave = async () => {
    if (!saveWhatsAppThrottle) return;

    if (turboDraft.minMps > turboDraft.maxMps) {
      toast.error('minMps nao pode ser maior que maxMps');
      return;
    }
    if (turboDraft.startMps < turboDraft.minMps || turboDraft.startMps > turboDraft.maxMps) {
      toast.error('startMps deve estar entre minMps e maxMps');
      return;
    }

    await saveWhatsAppThrottle({
      enabled: turboDraft.enabled,
      sendConcurrency: turboDraft.sendConcurrency,
      batchSize: turboDraft.batchSize,
      startMps: turboDraft.startMps,
      maxMps: turboDraft.maxMps,
      minMps: turboDraft.minMps,
      cooldownSec: turboDraft.cooldownSec,
      minIncreaseGapSec: turboDraft.minIncreaseGapSec,
      sendFloorDelayMs: turboDraft.sendFloorDelayMs,
    });
    setIsEditing(false);
  };

  const handleReset = async () => {
    if (!saveWhatsAppThrottle) return;
    await saveWhatsAppThrottle({ resetState: true });
    toast.success('Aprendizado do modo turbo reiniciado (target voltou pro startMps)');
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (turboConfig) {
      setTurboDraft({
        enabled: turboConfig.enabled,
        sendConcurrency: (turboConfig as any)?.sendConcurrency ?? 1,
        batchSize: (turboConfig as any)?.batchSize ?? 10,
        startMps: turboConfig.startMps,
        maxMps: turboConfig.maxMps,
        minMps: turboConfig.minMps,
        cooldownSec: turboConfig.cooldownSec,
        minIncreaseGapSec: turboConfig.minIncreaseGapSec,
        sendFloorDelayMs: turboConfig.sendFloorDelayMs,
      });
    }
  };

  const handleApplyPlannerSuggestion = (plan: TurboPlan) => {
    setIsEditing(true);
    setTurboDraft((s) => ({
      ...s,
      sendConcurrency: plan.recommended.sendConcurrency,
      batchSize: plan.recommended.batchSize,
      startMps: plan.recommended.startMps,
      maxMps: plan.recommended.maxMps,
    }));
  };

  return (
    <div className="glass-panel rounded-2xl p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
            <span className="w-1 h-6 bg-primary-500 rounded-full"></span>
            <Zap size={18} className="text-primary-400" />
            Modo Turbo (Beta)
          </h3>
          <p className="text-sm text-gray-400">
            Ajuste automatico de taxa baseado em feedback do Meta (ex.: erro <span className="font-mono">130429</span>). Ideal para campanhas grandes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/settings/performance"
            className="h-10 px-4 rounded-xl bg-white/5 text-white hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-sm font-medium"
            title="Abrir central de performance (baseline/historico)"
          >
            Performance
          </Link>
          <Link
            href="/settings/meta-diagnostics"
            className="h-10 px-4 rounded-xl bg-white/5 text-white hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-sm font-medium"
            title="Abrir central de diagnostico Meta (Graph API + infra + acoes)"
          >
            Diagnostico
          </Link>
          <button
            onClick={() => setIsEditing((v) => !v)}
            className="h-10 px-4 rounded-xl bg-white/5 text-white hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-sm font-medium"
          >
            {isEditing ? 'Fechar' : 'Configurar'}
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <TurboStatusCard
          loading={whatsappThrottleLoading}
          config={turboConfig}
          state={turboState}
          source={whatsappThrottle?.source}
        />

        <TurboPhoneCard
          phoneNumberId={whatsappThrottle?.phoneNumberId}
          settingsPhoneNumberId={settings.phoneNumberId}
        />

        <TurboActionsCard
          onReset={handleReset}
          isSaving={isSaving}
        />
      </div>

      <TurboPlannerSection
        turboState={turboState}
        onApplySuggestion={handleApplyPlannerSuggestion}
      />

      {isEditing && (
        <TurboConfigForm
          draft={turboDraft}
          onDraftChange={setTurboDraft}
          onSave={handleSave}
          onCancel={handleCancel}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
