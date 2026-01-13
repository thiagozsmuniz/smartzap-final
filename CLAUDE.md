# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SmartZap é um SaaS de automação de marketing via WhatsApp, construído com Next.js 16 (App Router), React 19, Supabase (PostgreSQL) e Upstash QStash. Integra Meta WhatsApp Cloud API (v24.0) para mensagens com template e Vercel AI SDK para geração de conteúdo.

## Development Commands

```bash
npm run dev              # Dev server (Turbopack)
npm run build            # Production build
npm run lint             # ESLint

npm run test             # Vitest (unit tests)
npm run test:watch       # Vitest watch mode
npm run test:ui          # Vitest UI dashboard
npm run test:coverage    # Coverage report

npm run test:e2e         # Playwright E2E tests
npm run test:e2e:ui      # Playwright interactive UI
npm run test:e2e:headed  # E2E with browser visible

npm run test:all         # Unit + E2E tests
```

## Architecture

### Frontend Pattern: Page → Hook → Service → API

```
app/(dashboard)/campaigns/page.tsx    # Thin page: wires hook to view
    ↓
hooks/useCampaigns.ts                 # Controller hook: React Query + UI state
    ↓
services/campaignService.ts           # API calls (fetch wrapper)
    ↓
app/api/campaigns/route.ts            # API Route → Supabase DB
```

- **Pages**: "thin" components that only connect hooks to views
- **Hooks**: controller pattern with React Query + local state + derived state
- **Services**: typed fetch wrappers for API routes
- **API Routes**: validation (Zod), business logic, DB operations

### Backend Pattern: Serverless + Queues

```
API Routes (Next.js)  →  QStash Workflow  →  Meta WhatsApp API
        ↓                     ↓
  Supabase DB           (queue/durable steps)
```

### Key Directories

```
app/                    # Next.js App Router
  (auth)/               # Auth pages (login)
  (dashboard)/          # Dashboard pages
  api/                  # API routes (28+ sub-directories)

components/
  features/             # Feature-specific view components
  ui/                   # shadcn/ui components
  builder/              # Workflow builder components

hooks/                  # Controller hooks (React Query pattern)
services/               # API client layer
lib/                    # Business logic & utilities
  ai/                   # AI providers & prompts
  builder/              # Workflow executor
  whatsapp/             # WhatsApp API integration

types.ts                # All TypeScript interfaces & enums
supabase/migrations/    # SQL migrations (31+ files)
```

## Key Patterns

### Component/Controller Separation

```tsx
// components/features/campaigns/CampaignListView.tsx - PURE presentational
interface CampaignListViewProps {
  campaigns: Campaign[];
  onDelete: (id: string) => void;
  onRowClick: (id: string) => void;
}

// hooks/useCampaigns.ts - Controller hook
export const useCampaignsController = () => {
  const { data } = useCampaignsQuery();
  const [filter, setFilter] = useState('All');
  const filteredCampaigns = useMemo(() => ...);
  return { campaigns, filter, setFilter, onDelete };
};
```

### Database Layer (No ORM)

```typescript
// lib/supabase-db.ts - Direct Supabase queries
await supabase.from('campaigns').select('*').eq('id', campaignId)

// Abstracted CRUD
campaignDb.getAll()
campaignDb.create({ name, templateName })
```

### WhatsApp Credentials

Credentials are fetched from Supabase `settings` table first, with env vars as fallback:

```typescript
import { getWhatsAppCredentials } from '@/lib/whatsapp-credentials'
const credentials = await getWhatsAppCredentials()
```

### Error Handling

```typescript
// lib/whatsapp-errors.ts - 44+ error codes mapped
mapWhatsAppError(131042)  // → { type: 'payment', message: '...', action: '...' }
isCriticalError(code)     // Payment, auth errors
isOptOutError(code)       // User blocked business
```

### Phone Number Handling

```typescript
// lib/phone-formatter.ts - E.164 format required
normalizePhoneNumber('+5511999999999')
validatePhoneNumber(phone)  // Uses libphonenumber-js
```

## Workflow Engine

Workflow execution uses Upstash Workflow SDK with durable steps:

```
lib/builder/workflow-executor.workflow.ts  # Main executor
lib/builder/nodes/                         # Node-specific handlers
```

Node types: `start`, `message`, `template`, `menu`, `input`, `condition`, `delay`, `ai_agent`, `handoff`, `end`

## Meta WhatsApp API (v24.0)

### Template Payload Structure

```json
{
  "messaging_product": "whatsapp",
  "to": "+5511999999999",
  "type": "template",
  "template": {
    "name": "template_name",
    "language": { "code": "pt_BR" },
    "components": [
      { "type": "header", "parameters": [{ "type": "image", "image": { "id": "..." } }] },
      { "type": "body", "parameters": [{ "type": "text", "text": "{{1}} value" }] }
    ]
  }
}
```

### Rate Limits

- **Cloud API**: Up to 1000 msgs/sec
- **Pair limit**: 1 msg/6 sec to same user (error 131056)
- **Retry**: Exponential backoff per Meta recommendation

## Database Schema (Key Tables)

- `settings` - Config (credentials, tokens)
- `campaigns` - Campaign metadata + counters (sent/delivered/read/failed)
- `campaign_contacts` - Per-contact status + message_id
- `contacts` - Contact info + custom fields
- `templates` - Template cache (synced from Meta)
- `flows` - Workflow definitions
- `account_alerts` - Health alerts

## Environment Variables

Required:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`
- `QSTASH_TOKEN`
- `MASTER_PASSWORD` (login password)
- `SMARTZAP_API_KEY`, `SMARTZAP_ADMIN_KEY`

Optional:
- `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID` (fallback if not in DB)
- `GEMINI_API_KEY` (AI features)

## Language Conventions

- **Code**: English (variable names, function names)
- **Comments/Documentation**: Portuguese (pt-BR)
- **UI text**: Portuguese (pt-BR)

## Styling

- Tailwind CSS v4 with shadcn/ui components
- Primary colors: `primary-400/500/600` (emerald/green)
- Backgrounds: `zinc-800/900/950`
- Icons: lucide-react exclusively

## Types Reference

```typescript
// types.ts
CampaignStatus: DRAFT | SCHEDULED | SENDING | COMPLETED | PAUSED | FAILED
TemplateCategory: 'MARKETING' | 'UTILIDADE' | 'AUTENTICACAO'
ContactStatus: OPT_IN | OPT_OUT | UNKNOWN
```

## Known Behaviors

- **Edge cache flash-back**: Deleted items may momentarily reappear due to Vercel 10s TTL cache
- **Payment alerts**: Auto-shown on error 131042, auto-dismissed when delivery succeeds after fix
