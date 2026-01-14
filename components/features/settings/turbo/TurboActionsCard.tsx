'use client';

import React from 'react';
import { Loader2, RefreshCw } from 'lucide-react';

export interface TurboActionsCardProps {
  onReset: () => void;
  isSaving?: boolean;
}

export function TurboActionsCard({
  onReset,
  isSaving,
}: TurboActionsCardProps) {
  return (
    <div className="bg-zinc-900/40 border border-white/10 rounded-xl p-4">
      <div className="text-xs text-gray-500">Acoes</div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          onClick={onReset}
          disabled={!!isSaving}
          className="h-10 px-3 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-lg transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
          title="Reseta o targetMps para startMps"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Resetar aprendizado
        </button>
      </div>
    </div>
  );
}
