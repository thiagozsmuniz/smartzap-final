import React, { useEffect, useRef, useState } from 'react';
import { AISettings } from './AISettings';
import { TestContactPanel } from './TestContactPanel';
import { AutoSuppressionPanel } from './AutoSuppressionPanel';
import { WorkflowExecutionPanel } from './WorkflowExecutionPanel';
import { MetaAppPanel } from './MetaAppPanel';
import { StatusCard } from './StatusCard';
import { TurboConfigSection } from './TurboConfigSection';
import { WebhookConfigSection } from './WebhookConfigSection';
import { CalendarBookingPanel } from './CalendarBookingPanel';
import { CredentialsForm } from './CredentialsForm';
import type { SettingsViewProps } from './types';

// Re-export types for consumers
export type { SettingsViewProps } from './types';

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  setSettings,
  isLoading,
  isSaving,
  onSave,
  // onSaveSettings - reserved for future use
  onDisconnect,
  accountLimits,
  // tierName - reserved for future use
  limitsError,
  limitsErrorMessage,
  limitsLoading,
  onRefreshLimits,
  webhookUrl,
  webhookToken,
  webhookStats,
  webhookSubscription,
  webhookSubscriptionLoading,
  webhookSubscriptionMutating,
  onRefreshWebhookSubscription,
  onSubscribeWebhookMessages,
  onUnsubscribeWebhookMessages,
  phoneNumbers,
  phoneNumbersLoading,
  onRefreshPhoneNumbers,
  onSetWebhookOverride,
  onRemoveWebhookOverride,
  availableDomains,
  webhookPath,
  hideHeader,

  onTestConnection,
  isTestingConnection,

  // AI Props
  aiSettings,
  aiSettingsLoading,
  saveAIConfig,
  removeAIKey,
  isSavingAI,

  // Meta App
  metaApp,
  metaAppLoading,
  refreshMetaApp,
  // Test Contact Props - Supabase
  testContact,
  saveTestContact,
  removeTestContact,
  isSavingTestContact,

  // Turbo
  whatsappThrottle,
  whatsappThrottleLoading,
  saveWhatsAppThrottle,
  isSavingWhatsAppThrottle,

  // Auto-supressão
  autoSuppression,
  autoSuppressionLoading,
  saveAutoSuppression,
  isSavingAutoSuppression,

  // Calendar Booking
  calendarBooking,
  calendarBookingLoading,
  saveCalendarBooking,
  isSavingCalendarBooking,

  // Workflow Execution (global)
  workflowExecution,
  workflowExecutionLoading,
  saveWorkflowExecution,
  isSavingWorkflowExecution,

}) => {
  // Always start collapsed
  const [isEditing, setIsEditing] = useState(false);

  // Refs para UX: o formulário de credenciais fica bem abaixo do card.
  // Sem scroll automático, parece que o botão "Editar" não funcionou.
  const statusCardRef = useRef<HTMLDivElement | null>(null);
  const credentialsFormRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Quando o usuário ativa o modo edição, rolar até o formulário.
    if (!isEditing) return;

    // Aguarda o render do bloco condicional.
    const t = window.setTimeout(() => {
      credentialsFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);

    return () => window.clearTimeout(t);
  }, [isEditing]);

  if (isLoading) return <div className="text-white">Carregando configurações...</div>;

  return (
    <div>
      {!hideHeader && (
        <>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Configurações</h1>
          <p className="text-gray-400 mb-10">Gerencie sua conexão com a WhatsApp Business API</p>
        </>
      )}

      <div className="space-y-8">
        {/* Status Card */}
        <StatusCard
          ref={statusCardRef}
          settings={settings}
          limitsLoading={limitsLoading}
          limitsError={limitsError}
          limitsErrorMessage={limitsErrorMessage}
          accountLimits={accountLimits}
          onRefreshLimits={onRefreshLimits}
          onDisconnect={onDisconnect}
          isEditing={isEditing}
          onToggleEdit={() => setIsEditing((v) => !v)}
        />

        {/* AI Settings Section - New! */}
        {settings.isConnected && saveAIConfig && (
          <AISettings
            settings={aiSettings}
            isLoading={!!aiSettingsLoading}
            onSave={saveAIConfig}
            onRemoveKey={removeAIKey}
            isSaving={!!isSavingAI}
          />
        )}

        {/* Meta App (opcional) — debug_token e diagnóstico avançado */}
        {settings.isConnected && (
          <MetaAppPanel
            metaApp={metaApp}
            metaAppLoading={metaAppLoading}
            refreshMetaApp={refreshMetaApp}
          />
        )}

        {/* Credentials Form - Only visible if disconnected OR editing */}
        {(!settings.isConnected || isEditing) && (
          <CredentialsForm
            ref={credentialsFormRef}
            settings={settings}
            setSettings={setSettings}
            onSave={onSave}
            onClose={() => setIsEditing(false)}
            isSaving={isSaving}
            onTestConnection={onTestConnection}
            isTestingConnection={isTestingConnection}
            metaApp={metaApp}
            refreshMetaApp={refreshMetaApp}
          />
        )}

        {/* Workflow Builder Default moved to /workflows */}

        {/* Calendar Booking Section */}
        {settings.isConnected && (
          <CalendarBookingPanel
            isConnected={settings.isConnected}
            calendarBooking={calendarBooking}
            calendarBookingLoading={calendarBookingLoading}
            saveCalendarBooking={saveCalendarBooking}
            isSavingCalendarBooking={isSavingCalendarBooking}
          />
        )}

        {/* Test Contact Section */}
        {settings.isConnected && (
          <TestContactPanel
            testContact={testContact}
            saveTestContact={saveTestContact}
            removeTestContact={removeTestContact}
            isSaving={isSavingTestContact}
          />
        )}

        {/* WhatsApp Turbo (Adaptive Throttle) */}
        {settings.isConnected && saveWhatsAppThrottle && (
          <TurboConfigSection
            whatsappThrottle={whatsappThrottle}
            whatsappThrottleLoading={whatsappThrottleLoading}
            saveWhatsAppThrottle={saveWhatsAppThrottle}
            isSaving={isSavingWhatsAppThrottle}
            settings={settings}
          />
        )}

        {/* Proteção de Qualidade (Auto-supressão) */}
        {settings.isConnected && saveAutoSuppression && (
          <AutoSuppressionPanel
            autoSuppression={autoSuppression}
            autoSuppressionLoading={autoSuppressionLoading}
            saveAutoSuppression={saveAutoSuppression}
            isSaving={isSavingAutoSuppression}
          />
        )}

        {/* Execução do workflow (global) */}
        {settings.isConnected && saveWorkflowExecution && (
          <WorkflowExecutionPanel
            workflowExecution={workflowExecution}
            workflowExecutionLoading={workflowExecutionLoading}
            saveWorkflowExecution={saveWorkflowExecution}
            isSaving={isSavingWorkflowExecution}
          />
        )}


        {/* Webhook Configuration Section */}
        {settings.isConnected && webhookUrl && (
          <WebhookConfigSection
            webhookUrl={webhookUrl}
            webhookToken={webhookToken}
            webhookStats={webhookStats}
            webhookPath={webhookPath}
            webhookSubscription={webhookSubscription}
            webhookSubscriptionLoading={webhookSubscriptionLoading}
            webhookSubscriptionMutating={webhookSubscriptionMutating}
            onRefreshWebhookSubscription={onRefreshWebhookSubscription}
            onSubscribeWebhookMessages={onSubscribeWebhookMessages}
            onUnsubscribeWebhookMessages={onUnsubscribeWebhookMessages}
            phoneNumbers={phoneNumbers}
            phoneNumbersLoading={phoneNumbersLoading}
            onRefreshPhoneNumbers={onRefreshPhoneNumbers}
            onSetWebhookOverride={onSetWebhookOverride}
            onRemoveWebhookOverride={onRemoveWebhookOverride}
            availableDomains={availableDomains}
          />
        )}
      </div>
    </div>
  );
};
