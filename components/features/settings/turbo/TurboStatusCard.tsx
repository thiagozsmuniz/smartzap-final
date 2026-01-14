'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

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

export interface TurboStatusCardProps {
  loading?: boolean;
  config?: WhatsAppThrottleConfig;
  state?: WhatsAppThrottleState | null;
  source?: 'db' | 'env';
}

export function TurboStatusCard({
  loading,
  config,
  state,
  source,
}: TurboStatusCardProps) {
  return (
    <div className="bg-zinc-900/40 border border-white/10 rounded-xl p-4">
      <div className="text-xs text-gray-500">Status</div>
      {loading ? (
        <div className="mt-2 text-sm text-gray-400 flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" /> Carregando...
        </div>
      ) : (
        <div className="mt-2">
          <div className="text-sm text-white">
            {config?.enabled ? (
              <span className="text-emerald-300 font-medium">Ativo</span>
            ) : (
              <span className="text-gray-300 font-medium">Inativo</span>
            )}
            <span className="text-gray-500"> . </span>
            <span className="text-xs text-gray-400">fonte: {source || '-'}</span>
          </div>
          <div className="mt-2 text-xs text-gray-400">
            Target atual: <span className="font-mono text-white">{typeof state?.targetMps === 'number' ? state.targetMps : '-'}</span> mps
          </div>
          {state?.cooldownUntil && (
            <div className="mt-1 text-xs text-amber-300">
              Cooldown ate: <span className="font-mono">{new Date(state.cooldownUntil).toLocaleString('pt-BR')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
