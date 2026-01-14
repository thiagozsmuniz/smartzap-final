'use client';

import React from 'react';
import type { ContactStatsData } from './types';

export interface ContactStatsProps {
  stats: ContactStatsData;
}

export const ContactStats: React.FC<ContactStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      <div className="glass-panel p-6 rounded-2xl">
        <p className="text-sm text-gray-500 font-medium mb-1">Total de Contatos</p>
        <p className="text-3xl font-bold text-white">{(stats?.total ?? 0).toLocaleString()}</p>
      </div>
      <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-emerald-500">
        <p className="text-sm text-emerald-500/80 font-medium mb-1">Opt-in Ativos</p>
        <p className="text-3xl font-bold text-emerald-400">{(stats?.optIn ?? 0).toLocaleString()}</p>
      </div>
      <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-zinc-700">
        <p className="text-sm text-gray-500 font-medium mb-1">Inativos / Opt-out</p>
        <p className="text-3xl font-bold text-gray-400">{(stats?.optOut ?? 0).toLocaleString()}</p>
      </div>
    </div>
  );
};
