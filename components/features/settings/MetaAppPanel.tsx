'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { RefreshCw, ExternalLink, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { settingsService } from '@/services/settingsService';

export interface MetaAppPanelProps {
  metaApp?: {
    source: 'none' | 'db' | 'env';
    appId: string | null;
    hasAppSecret: boolean;
    isConfigured: boolean;
  } | null;
  metaAppLoading?: boolean;
  refreshMetaApp?: () => void;
}

export function MetaAppPanel({
  metaApp,
  metaAppLoading,
  refreshMetaApp,
}: MetaAppPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [appIdDraft, setAppIdDraft] = useState('');
  const [appSecretDraft, setAppSecretDraft] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleStartEdit = () => {
    setIsEditing(true);
    setAppIdDraft(metaApp?.appId || '');
    setAppSecretDraft('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setAppSecretDraft('');
  };

  const handleSave = async () => {
    try {
      if (!appIdDraft.trim() || !appSecretDraft.trim()) {
        toast.error('App ID e App Secret são obrigatórios');
        return;
      }

      setIsSaving(true);
      await settingsService.saveMetaAppConfig({
        appId: appIdDraft.trim(),
        appSecret: appSecretDraft.trim(),
      });

      toast.success('Meta App salvo com sucesso');
      setIsEditing(false);
      setAppSecretDraft('');
      refreshMetaApp?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    try {
      setIsSaving(true);
      await settingsService.removeMetaAppConfig();
      toast.success('Meta App removido (DB)');
      refreshMetaApp?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao remover');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div id="test-contact" className="glass-panel rounded-2xl p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <span className="w-1 h-6 bg-sky-500 rounded-full"></span>
            Meta App (opcional)
          </h3>
          <p className="text-sm text-gray-400">
            Habilita validação forte do token via <span className="font-mono">/debug_token</span> no Diagnóstico da Meta
            (expiração, escopos, app_id e granular_scopes).
            <br />
            O <b>App Secret</b> fica no servidor (Supabase) e <b>nunca</b> é exibido no frontend.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refreshMetaApp?.()}
            className="h-10 px-4 rounded-lg bg-white/5 text-white hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-sm font-medium inline-flex items-center gap-2 whitespace-nowrap"
          >
            <RefreshCw size={14} /> Atualizar
          </button>
          <Link
            href="/settings/meta-diagnostics"
            className="h-10 px-4 rounded-lg bg-white/5 text-white hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-sm font-medium inline-flex items-center gap-2 whitespace-nowrap"
          >
            <ExternalLink size={14} /> Abrir diagnóstico
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
          <div className="text-xs text-gray-400">Status</div>
          <div className="mt-1 text-sm text-white">
            {metaAppLoading ? 'Carregando…' : metaApp?.isConfigured ? 'Configurado' : 'Não configurado'}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
          <div className="text-xs text-gray-400">App ID</div>
          <div className="mt-1 text-sm text-white font-mono">
            {metaAppLoading ? '—' : metaApp?.appId || '—'}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
          <div className="text-xs text-gray-400">Fonte</div>
          <div className="mt-1 text-sm text-white">
            {metaAppLoading ? '—' : metaApp?.source === 'db' ? 'Banco (Supabase)' : metaApp?.source === 'env' ? 'Env vars' : '—'}
          </div>
        </div>
      </div>

      <div className="mt-6">
        {!isEditing ? (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleStartEdit}
              className="h-10 px-4 rounded-xl bg-white/5 text-white hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-sm font-medium inline-flex items-center gap-2 whitespace-nowrap"
            >
              <Edit2 size={14} /> Configurar App ID/Secret
            </button>

            {metaApp?.source === 'db' && metaApp?.isConfigured && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={isSaving}
                className="h-10 px-4 rounded-xl bg-red-500/10 text-red-200 hover:bg-red-500/20 border border-red-500/20 transition-all text-sm font-medium inline-flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
              >
                <Trash2 size={14} /> Remover do banco
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-zinc-900/30 p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Meta App ID</label>
                <input
                  type="text"
                  value={appIdDraft}
                  onChange={(e) => setAppIdDraft(e.target.value)}
                  placeholder="ex: 123456789012345"
                  className="w-full px-4 py-3 bg-zinc-900/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/40 outline-none font-mono text-sm text-white transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Meta App Secret</label>
                <input
                  type="password"
                  value={appSecretDraft}
                  onChange={(e) => setAppSecretDraft(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full px-4 py-3 bg-zinc-900/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/40 outline-none font-mono text-sm text-white transition-all"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Por segurança, nunca mostramos o secret atual. Para trocar, cole um novo e salve.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="h-10 px-4 rounded-xl border border-white/10 text-gray-300 font-medium hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="h-10 px-5 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-bold transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
