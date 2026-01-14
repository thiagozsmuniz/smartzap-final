import React, { forwardRef, useEffect, useState } from 'react';
import { HelpCircle, Save, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AppSettings } from '../../../types';
import type { MetaAppInfo } from './types';
import { settingsService } from '@/services/settingsService';

interface CredentialsFormProps {
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
  onSave: () => void;
  onClose: () => void;
  isSaving: boolean;
  onTestConnection?: () => void;
  isTestingConnection?: boolean;
  metaApp?: MetaAppInfo | null;
  refreshMetaApp?: () => void;
}

export const CredentialsForm = forwardRef<HTMLDivElement, CredentialsFormProps>(
  (
    {
      settings,
      setSettings,
      onSave,
      onClose,
      isSaving,
      onTestConnection,
      isTestingConnection,
      metaApp,
      refreshMetaApp,
    },
    ref
  ) => {
    // Meta App ID (rapido) - usado para uploads do Template Builder (header_handle)
    const [metaAppIdQuick, setMetaAppIdQuick] = useState('');

    useEffect(() => {
      setMetaAppIdQuick(metaApp?.appId || '');
    }, [metaApp?.appId]);

    const handleSave = () => {
      onSave();
      onClose();

      // Best-effort: salva Meta App ID junto, sem bloquear o salvamento do WhatsApp.
      const nextAppId = metaAppIdQuick.trim();
      const currentAppId = String(metaApp?.appId || '').trim();
      if (nextAppId && nextAppId !== currentAppId) {
        settingsService
          .saveMetaAppConfig({ appId: nextAppId, appSecret: '' })
          .then(() => {
            refreshMetaApp?.();
          })
          .catch((e) => {
            // Nao bloqueia o fluxo principal.
            toast.warning(e instanceof Error ? e.message : 'Falha ao salvar Meta App ID');
          });
      }
    };

    return (
      <div
        ref={ref}
        className="glass-panel rounded-2xl p-8 animate-in slide-in-from-top-4 duration-300 scroll-mt-24"
      >
        <h3 className="text-lg font-semibold text-white mb-8 flex items-center gap-2">
          <span className="w-1 h-6 bg-primary-500 rounded-full"></span>
          Configuracao da API
        </h3>

        <div className="space-y-6">
          {/* Phone Number ID */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              ID do Numero de Telefone <span className="text-primary-500">*</span>
            </label>
            <div className="relative group">
              <input
                type="text"
                value={settings.phoneNumberId}
                onChange={(e) => setSettings({ ...settings, phoneNumberId: e.target.value })}
                placeholder="ex: 298347293847"
                className="w-full px-4 py-3 bg-zinc-900/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 outline-none font-mono text-sm text-white transition-all group-hover:border-white/20"
              />
              <div
                className="absolute right-4 top-3.5 text-gray-600 cursor-help hover:text-white transition-colors"
                title="Encontrado no Meta Business Manager"
              >
                <HelpCircle size={16} />
              </div>
            </div>
          </div>

          {/* Business Account ID */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              ID da Conta Comercial (Business ID) <span className="text-primary-500">*</span>
            </label>
            <div className="relative group">
              <input
                type="text"
                value={settings.businessAccountId}
                onChange={(e) => setSettings({ ...settings, businessAccountId: e.target.value })}
                placeholder="ex: 987234987234"
                className="w-full px-4 py-3 bg-zinc-900/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 outline-none font-mono text-sm text-white transition-all group-hover:border-white/20"
              />
              <div
                className="absolute right-4 top-3.5 text-gray-600 cursor-help hover:text-white transition-colors"
                title="Encontrado no Meta Business Manager"
              >
                <HelpCircle size={16} />
              </div>
            </div>
          </div>

          {/* Access Token */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Token de Acesso do Usuario do Sistema <span className="text-primary-500">*</span>
            </label>
            <div className="relative group">
              <input
                type="password"
                value={settings.accessToken}
                onChange={(e) => setSettings({ ...settings, accessToken: e.target.value })}
                placeholder="EAAG........"
                className="w-full px-4 py-3 bg-zinc-900/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 outline-none font-mono text-sm text-white transition-all group-hover:border-white/20 tracking-widest"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2 font-mono">Armazenamento criptografado SHA-256.</p>
          </div>

          {/* Meta App ID (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Meta App ID <span className="text-gray-500">(opcional)</span>
            </label>
            <div className="relative group">
              <input
                type="text"
                value={metaAppIdQuick}
                onChange={(e) => setMetaAppIdQuick(e.target.value)}
                placeholder="ex: 123456789012345"
                className="w-full px-4 py-3 bg-zinc-900/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 outline-none font-mono text-sm text-white transition-all group-hover:border-white/20"
              />
              <div
                className="absolute right-4 top-3.5 text-gray-600 cursor-help hover:text-white transition-colors"
                title="Necessario para upload de midia no header do Template Builder (Resumable Upload API)."
              >
                <HelpCircle size={16} />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Usado apenas para gerar <span className="font-mono">header_handle</span> (upload de
              imagem/video/documento/GIF) no Template Builder.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-10 pt-8 border-t border-white/5 flex justify-end gap-4">
          <button
            className="h-10 px-6 rounded-xl border border-white/10 text-gray-300 font-medium hover:bg-white/5 transition-colors flex items-center gap-2"
            onClick={() => onTestConnection?.()}
            disabled={!!isTestingConnection}
          >
            {isTestingConnection ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <RefreshCw size={18} />
            )}
            {isTestingConnection ? 'Testando...' : 'Testar Conexao'}
          </button>
          <button
            className="h-10 px-8 rounded-xl bg-white text-black font-bold hover:bg-gray-200 transition-colors flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save size={18} /> {isSaving ? 'Salvando...' : 'Salvar Config'}
          </button>
        </div>
      </div>
    );
  }
);

CredentialsForm.displayName = 'CredentialsForm';
