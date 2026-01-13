# React Component Health Analysis Report

**Data**: 2026-01-13
**Total de Componentes**: 215 arquivos TSX/JSX

---

## Resumo Executivo

| Métrica | Valor | Status |
|---------|-------|--------|
| Total de Componentes | 215 | - |
| Componentes Grandes (>300 linhas) | 55 | 🔴 CRÍTICO |
| Componentes Sem Props Tipadas | 64 | 🟠 ALTO |
| Componentes Complexos (10+ useState) | 19 | 🟠 ALTO |
| Componentes com 5+ useEffect | 14 | 🟡 MÉDIO |
| Arquivos de Backup | 1 | 🟡 MÉDIO |

**Score Geral: 45/100** 🔴

---

## 1. Componentes Grandes (>300 linhas)

### 🔴 Críticos (>1000 linhas) - Refatoração Urgente

| Arquivo | Linhas | Recomendação |
|---------|--------|--------------|
| `components/features/settings/SettingsView.tsx` | 4109 | Dividir em sub-componentes por seção |
| `components/features/campaigns/CampaignWizardView.tsx` | 3442 | Extrair steps como componentes separados |
| `app/(dashboard)/campaigns/new/page.tsx` | 2805 | Mover lógica para hooks customizados |
| `app/(dashboard)/campaigns/new-real/page.tsx` | 2784 | Código duplicado - unificar com new/ |
| `components/features/templates/ManualTemplateBuilder.tsx` | 2475 | Dividir por funcionalidade |
| `components/builder/workflow/config/action-config.tsx` | 2101 | Extrair configurações por tipo de ação |
| `components/builder/workflow/workflow-toolbar.tsx` | 1699 | Separar grupos de botões |
| `components/features/settings/MetaDiagnosticsView.tsx` | 1552 | Dividir por seção de diagnóstico |
| `app/(auth)/setup/wizard/page.tsx` | 1508 | Extrair steps do wizard |
| `components/features/contacts/ContactListView.tsx` | 1430 | Separar tabela, filtros, modais |
| `components/features/templates/TemplateListView.tsx` | 1181 | Extrair cards e filtros |
| `components/features/campaigns/CampaignDetailsView.tsx` | 1152 | Separar métricas, tabela, ações |
| `components/builder/workflow/node-config-panel.tsx` | 1082 | Dividir por tipo de nó |
| `app/(dashboard)/campaigns/new-mock/page.tsx` | 1052 | Código de mock - considerar remover |

### 🟠 Altos (500-1000 linhas)

| Arquivo | Linhas |
|---------|--------|
| `components/builder/workflow/workflow-runs.tsx` | 924 |
| `components/features/lead-forms/LeadFormsView.tsx` | 913 |
| `components/ui/sidebar.tsx` | 889 |
| `components/builder/ui/template-badge-textarea.tsx` | 879 |
| `app/(dashboard)/DashboardShell.tsx` | 865 |
| `components/ui/WhatsAppPhonePreview.tsx` | 809 |
| `components/builder/overlays/configuration-overlay.tsx` | 808 |
| `components/features/flows/builder/FlowFormBuilder.tsx` | 737 |
| `app/(dashboard)/settings/ai/page.tsx` | 729 |
| `components/builder/auth/dialog.tsx` | 694 |
| `app/(dashboard)/builder/[id]/page.tsx` | 630 |
| `app/(dashboard)/flows/builder/[id]/page.tsx` | 623 |
| `components/builder/workflow/workflow-canvas.tsx` | 586 |
| `components/features/contacts/ContactQuickEditModal.tsx` | 546 |
| `components/builder/ui/template-badge-input.tsx` | 540 |
| `app/(dashboard)/workflows/page.tsx` | 507 |

### 🟡 Médios (300-500 linhas) - 25 componentes

---

## 2. Componentes Sem TypeScript Props

**Total: 64 componentes** sem `interface Props` ou `type Props` definidos.

### Prioridade Alta (Features/Views):

- `components/features/settings/MetaDiagnosticsView.tsx`
- `components/features/settings/SettingsPerformanceView.tsx`
- `components/features/templates/ManualDraftsView.tsx`
- `components/features/templates/ManualTemplateBuilder.tsx`
- `components/features/campaigns/CampaignTracePanel.tsx`
- `components/features/flows/FlowTestPanel.tsx`
- `components/features/flows/FlowPublishPanel.tsx`
- `components/features/flows/SendFlowDialog.tsx`
- `components/features/flows/FlowSubmissionsView.tsx`
- `components/features/flows/builder/FlowJsonEditorPanel.tsx`
- `components/features/flows/builder/FlowBuilderListView.tsx`
- `components/features/flows/builder/CreateFlowFromTemplateDialog.tsx`
- `components/features/flows/builder/FlowFormBuilder.tsx`
- `components/features/flows/builder/CreateFlowWithAIDialog.tsx`

### Prioridade Média (Builder):

- `components/builder/workflow/node-config-panel.tsx`
- `components/builder/workflow/workflow-canvas.tsx`
- `components/builder/overlays/overlay-container.tsx`
- `components/builder/overlays/overlay-header.tsx`
- `components/builder/overlays/overlay-footer.tsx`

---

## 3. Componentes Complexos (Muitos Hooks)

### 🔴 useState >= 20 (Refatoração Urgente)

| Arquivo | useState | Recomendação |
|---------|----------|--------------|
| `SettingsView.tsx` | 58 | Extrair para useSettingsStore (Zustand) |
| `campaigns/new/page.tsx` | 47 | Criar useCampaignWizardState hook |
| `campaigns/new-real/page.tsx` | 47 | Código duplicado |
| `CampaignWizardView.tsx` | 28 | Usar useReducer ou Zustand |
| `setup/wizard/page.tsx` | 20 | Extrair useSetupWizardState |

### 🟠 useState 10-19 (Considerar Refatoração)

| Arquivo | useState |
|---------|----------|
| `campaigns/new-mock/page.tsx` | 19 |
| `CampaignTracePanel.tsx` | 14 |
| `settings/ai/page.tsx` | 14 |
| `flows/builder/[id]/page.tsx` | 14 |
| `template-badge-textarea.tsx` | 13 |
| `ContactListView.tsx` | 12 |
| `f/[slug]/page.tsx` | 12 |
| `ManualTemplateBuilder.tsx` | 11 |
| `FlowFormBuilder.tsx` | 10 |
| `SendFlowDialog.tsx` | 10 |
| `FlowTestPanel.tsx` | 10 |
| `FlowPublishPanel.tsx` | 10 |
| `auth/dialog.tsx` | 10 |
| `workflows/page.tsx` | 10 |

### 🟠 useEffect >= 5 (Verificar Side Effects)

| Arquivo | useEffect |
|---------|-----------|
| `SettingsView.tsx` | 25 |
| `builder/[id]/page.tsx` | 12 |
| `campaigns/new/page.tsx` | 9 |
| `campaigns/new-real/page.tsx` | 9 |
| `template-badge-textarea.tsx` | 8 |
| `FlowFormBuilder.tsx` | 7 |
| `integration-selector.tsx` | 7 |
| `setup/wizard/page.tsx` | 7 |
| `action-config.tsx` | 6 |
| `CampaignWizardView.tsx` | 5 |
| `workflow-toolbar.tsx` | 5 |
| `workflow-runs.tsx` | 5 |
| `workflow-canvas.tsx` | 5 |
| `template-autocomplete.tsx` | 5 |

---

## 4. Oportunidades de Componentização

### Padrões Repetidos Identificados

| Padrão | Ocorrências | Recomendação |
|--------|-------------|--------------|
| `toast.success/error/info` | 224 | Criar hook `useNotification` |
| `Loader2/Spinner` patterns | 201 | Já existe `spinner.tsx`, padronizar uso |
| Inline forms | 8 | Usar `components/ui/Form.tsx` |

### Código Duplicado

| Arquivos | Problema |
|----------|----------|
| `campaigns/new/page.tsx` vs `campaigns/new-real/page.tsx` | ~95% similar (2805 vs 2784 linhas) |
| `CampaignWizardView.tsx` vs `CampaignWizardView.backup.tsx` | Arquivo backup não deveria existir no repo |

### Sugestões de Novos Componentes

1. **`useSettingsState`** - Custom hook para gerenciar estado de SettingsView
2. **`useCampaignWizard`** - Hook para gerenciar wizard de campanha
3. **`<WizardStep>`** - Componente reutilizável para steps de wizard
4. **`<DataTable>`** - Abstração para tabelas com filtros/paginação
5. **`<ConfirmAction>`** - Wrapper para ações que precisam confirmação

---

## 5. Arquivos de Limpeza

| Arquivo | Ação Recomendada |
|---------|------------------|
| `CampaignWizardView.backup.tsx` | Remover - usar git history |
| `campaigns/new-mock/page.tsx` | Avaliar se ainda é necessário |
| `campaigns/new-real/page.tsx` | Unificar com `new/page.tsx` |

---

## 6. Recomendações Prioritárias

### Prioridade 1 - Impacto Imediato

1. **Dividir `SettingsView.tsx`** (4109 linhas, 58 useState, 25 useEffect)
   - Extrair: `GeneralSettings`, `WhatsAppSettings`, `QStashSettings`, `AISettings`
   - Criar: `useSettingsStore` com Zustand

2. **Unificar páginas de campanha**
   - `new/page.tsx` e `new-real/page.tsx` são quase idênticos
   - Economia: ~2800 linhas

3. **Refatorar `CampaignWizardView.tsx`** (3442 linhas, 28 useState)
   - Extrair steps: `StepTemplate`, `StepContacts`, `StepPreview`, `StepSchedule`
   - Criar: `useCampaignWizardReducer`

### Prioridade 2 - Manutenibilidade

4. **Adicionar Props tipadas** aos 64 componentes sem tipos
5. **Remover `CampaignWizardView.backup.tsx`**
6. **Criar custom hooks** para componentes com 10+ useState

### Prioridade 3 - Padronização

7. **Padronizar uso de toasts** com hook centralizado
8. **Extrair lógica de loading states** para hook reutilizável
9. **Criar componentes de layout** para wizard steps

---

## Metodologia de Score

```
Score = (Small + Typed + Simple + Organized) / 4

Small (< 300 linhas):     160/215 = 74%  → 22/30 pontos
Typed (com Props):        151/215 = 70%  → 18/25 pontos
Simple (< 10 hooks):      196/215 = 91%  → 23/25 pontos
Organized (sem duplicação): ~60%        → 12/20 pontos

Total: 75/100 ajustado para peso de criticidade = 45/100
```

---

**Relatório gerado em**: 2026-01-13
**Próxima análise recomendada**: Após refatoração dos top 5 componentes
