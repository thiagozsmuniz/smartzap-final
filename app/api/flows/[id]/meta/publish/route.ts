import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
export const revalidate = 0

import { supabase } from '@/lib/supabase'
import { getWhatsAppCredentials } from '@/lib/whatsapp-credentials'
import {
  metaCreateFlow,
  metaGetFlowDetails,
  metaGetFlowPreview,
  metaPublishFlow,
  metaUpdateFlowMetadata,
  metaUploadFlowJsonAsset,
} from '@/lib/meta-flows-api'
import { MetaGraphApiError } from '@/lib/meta-flows-api'
import { generateFlowJsonFromFormSpec, normalizeFlowFormSpec, validateFlowFormSpec } from '@/lib/flow-form'
import { validateMetaFlowJson } from '@/lib/meta-flow-json-validator'
import { settingsDb } from '@/lib/supabase-db'

/**
 * Detecta se o Flow JSON e dinamico (usa data_exchange)
 */
function isDynamicFlow(flowJson: unknown): boolean {
  if (!flowJson || typeof flowJson !== 'object') return false
  const json = flowJson as Record<string, unknown>
  // Flow JSON 3.0+ com data_api_version indica flow dinamico
  return json.data_api_version === '3.0'
}

const ENDPOINT_URL_SETTING = 'whatsapp_flow_endpoint_url'

/**
 * Retorna a URL do endpoint se configurado
 */
async function getFlowEndpointUrl(): Promise<string | null> {
  const privateKey = await settingsDb.get('whatsapp_flow_private_key')
  if (!privateKey) return null

  // Monta a URL do endpoint
  const envEndpointUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/api/flows/endpoint`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}/api/flows/endpoint`
      : process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/flows/endpoint`
        : null
  const storedEndpointUrl = await settingsDb.get(ENDPOINT_URL_SETTING)
  const resolved = envEndpointUrl || storedEndpointUrl || null
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/1294d6ce-76f2-430d-96ab-3ae4d7527327',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H6',location:'app/api/flows/[id]/meta/publish/route.ts:55',message:'flow endpoint url resolved',data:{hasEnvEndpointUrl:Boolean(envEndpointUrl),hasStoredEndpointUrl:Boolean(storedEndpointUrl),hasResolvedEndpointUrl:Boolean(resolved)},timestamp:Date.now()})}).catch(()=>{});
  // #endregion agent log
  return resolved
}

const PublishSchema = z
  .object({
    publish: z.boolean().optional().default(true),
    categories: z.array(z.string().min(1).max(60)).optional().default(['OTHER']),
    // Se true, tenta atualizar (asset) caso já exista meta_flow_id (DRAFT).
    updateIfExists: z.boolean().optional().default(true),
  })
  .strict()

function extractFlowJson(row: any): unknown {
  const savedFlowJson = row?.flow_json
  const savedDataApiVersion =
    savedFlowJson && typeof savedFlowJson === 'object'
      ? (savedFlowJson as Record<string, unknown>).data_api_version
      : null

  // Se o flow_json salvo for dinâmico, preserve-o para não perder data_exchange.
  if (savedDataApiVersion === '3.0') {
    return savedFlowJson
  }

  // Prioridade: regenerar do spec.form se existir (flows estáticos).
  // Isso garante que qualquer mudança no generateFlowJsonFromFormSpec
  // (ex: inclusão do payload no on-click-action) seja aplicada automaticamente.
  const form = row?.spec?.form
  if (form) {
    const normalized = normalizeFlowFormSpec(form, row?.name || 'Flow')
    return generateFlowJsonFromFormSpec(normalized)
  }

  // Fallback: flow_json persistido (para flows legados sem spec.form)
  if (savedFlowJson) return savedFlowJson

  // Último fallback: gerar vazio
  const emptyNormalized = normalizeFlowFormSpec({}, row?.name || 'Flow')
  return generateFlowJsonFromFormSpec(emptyNormalized)
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  let wantsDebug = false

  try {
    const input = PublishSchema.parse(await req.json().catch(() => ({})))
    wantsDebug = req.headers.get('x-debug-client') === '1'

    const credentials = await getWhatsAppCredentials()
    if (!credentials?.accessToken || !credentials.businessAccountId) {
      return NextResponse.json(
        {
          error: 'WhatsApp não configurado. Defina Access Token e WABA ID nas Configurações.',
        },
        { status: 400 }
      )
    }

    // Busca o flow local
    const { data, error } = await supabase.from('flows').select('*').eq('id', id).limit(1)
    if (error) return NextResponse.json({ error: error.message || 'Falha ao buscar flow' }, { status: 500 })

    const row = Array.isArray(data) ? data[0] : (data as any)
    if (!row) return NextResponse.json({ error: 'Flow não encontrado' }, { status: 404 })

    let flowJson = extractFlowJson(row)
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/1294d6ce-76f2-430d-96ab-3ae4d7527327',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1',location:'app/api/flows/[id]/meta/publish/route.ts:104',message:'extractFlowJson result',data:{flowId:id,hasSpecForm:Boolean(row?.spec?.form),hasFlowJson:Boolean(row?.flow_json),flowJsonVersion:(flowJson as any)?.version ?? null,flowJsonDataApiVersion:(flowJson as any)?.data_api_version ?? null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion agent log

    // Validação “local” (rápida) para evitar publicar algo obviamente inválido.
    // A validação oficial é da Meta e vem em validation_errors.
    const formIssues = row?.spec?.form ? validateFlowFormSpec(normalizeFlowFormSpec(row.spec.form, row?.name || 'Flow')) : []
    if (formIssues.length > 0) {
      return NextResponse.json(
        {
          error: 'Ajustes necessários antes de publicar',
          issues: formIssues,
        },
        { status: 400 }
      )
    }

    // Validação do schema do Flow JSON (mais próximo do que a Meta espera) antes de chamar a Graph API.
    // Isso evita o "(100) Invalid parameter" sem contexto.
    let localValidation = validateMetaFlowJson(flowJson)
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/1294d6ce-76f2-430d-96ab-3ae4d7527327',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H2',location:'app/api/flows/[id]/meta/publish/route.ts:124',message:'local validation result',data:{flowId:id,isValid:localValidation.isValid,issuesCount:Array.isArray((localValidation as any)?.issues)?(localValidation as any).issues.length:null,usesDataApiVersion:((flowJson as any)?.data_api_version === '3.0')},timestamp:Date.now()})}).catch(()=>{});
    // #endregion agent log
    if (!localValidation.isValid) {
      const errors = Array.isArray(localValidation.errors) ? localValidation.errors.slice(0, 6) : []
      const warnings = Array.isArray(localValidation.warnings) ? localValidation.warnings.slice(0, 6) : []
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/1294d6ce-76f2-430d-96ab-3ae4d7527327',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H5',location:'app/api/flows/[id]/meta/publish/route.ts:131',message:'local validation details',data:{flowId:id,errorsCount:Array.isArray(localValidation.errors)?localValidation.errors.length:null,warningsCount:Array.isArray(localValidation.warnings)?localValidation.warnings.length:null,errors, warnings},timestamp:Date.now()})}).catch(()=>{});
      // #endregion agent log
    }

    // Se o flow_json persistido estiver legado/inválido, tentamos regenerar do spec.form automaticamente.
    if (!localValidation.isValid && row?.spec?.form) {
      const normalized = normalizeFlowFormSpec(row.spec.form, row?.name || 'Flow')
      const regenerated = generateFlowJsonFromFormSpec(normalized)
      const regeneratedValidation = validateMetaFlowJson(regenerated)

      if (regeneratedValidation.isValid) {
        flowJson = regenerated
        localValidation = regeneratedValidation
      }
    }

    if (!localValidation.isValid) {
      const now = new Date().toISOString()
      await supabase
        .from('flows')
        .update({
          updated_at: now,
          meta_last_checked_at: now,
          meta_validation_errors: { source: 'local', ...localValidation },
        })
        .eq('id', id)

      return NextResponse.json(
        {
          error: 'Flow JSON inválido para a Meta. Corrija os itens antes de publicar.',
          validation: localValidation,
        },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()

    let metaFlowId: string | null = typeof row?.meta_flow_id === 'string' && row.meta_flow_id.trim() ? row.meta_flow_id.trim() : null

    let validationErrors: unknown = null
    let metaStatus: string | null = null
    let previewUrl: string | null = null

    if (!metaFlowId) {
      // Verifica se e um flow dinamico e precisa de endpoint
      const dynamic = isDynamicFlow(flowJson)
      let endpointUri: string | undefined

      if (dynamic) {
        const url = await getFlowEndpointUrl()
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/1294d6ce-76f2-430d-96ab-3ae4d7527327',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H3',location:'app/api/flows/[id]/meta/publish/route.ts:172',message:'dynamic flow endpoint resolution',data:{flowId:id,hasEndpointUrl:Boolean(url)},timestamp:Date.now()})}).catch(()=>{});
        // #endregion agent log
        if (!url) {
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/1294d6ce-76f2-430d-96ab-3ae4d7527327',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H3',location:'app/api/flows/[id]/meta/publish/route.ts:176',message:'dynamic flow missing endpoint',data:{flowId:id},timestamp:Date.now()})}).catch(()=>{});
          // #endregion agent log
          return NextResponse.json(
            {
              error: 'Flow dinamico requer endpoint configurado. Va em Configuracoes > MiniApp Dinamico e gere as chaves.',
            },
            { status: 400 }
          )
        }
        endpointUri = url
      }

      const flowJsonObj = flowJson && typeof flowJson === 'object' ? (flowJson as Record<string, unknown>) : null
      const screens = Array.isArray((flowJsonObj as any)?.screens) ? (flowJsonObj as any).screens : []
      const screenIds = screens.map((s: any) => String(s?.id || '')).filter(Boolean).slice(0, 6)
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/1294d6ce-76f2-430d-96ab-3ae4d7527327',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H6',location:'app/api/flows/[id]/meta/publish/route.ts:189',message:'meta create flow payload summary',data:{flowId:id,hasEndpointUri:Boolean(endpointUri),dataApiVersion:(flowJsonObj as any)?.data_api_version ?? null,flowJsonVersion:(flowJsonObj as any)?.version ?? null,screensCount:Array.isArray(screens)?screens.length:null,screenIds},timestamp:Date.now()})}).catch(()=>{});
      // #endregion agent log

      // Criar na Meta (com publish opcional em um único request)
      const baseName = String(row?.name || 'Flow').trim() || 'Flow'
      const suffix = ` #${String(id).slice(0, 6)}`
      const maxNameLength = 60
      const maxBaseLength = Math.max(1, maxNameLength - suffix.length)
      const uniqueName = `${baseName.slice(0, maxBaseLength)}${suffix}`
      const created = await metaCreateFlow({
        accessToken: credentials.accessToken,
        wabaId: credentials.businessAccountId,
        name: uniqueName,
        categories: input.categories.length > 0 ? input.categories : ['OTHER'],
        flowJson,
        publish: !!input.publish,
        endpointUri,
      })

      metaFlowId = created.id
      validationErrors = created.validation_errors ?? null

      // Atualiza detalhes (status etc.)
      const details = await metaGetFlowDetails({ accessToken: credentials.accessToken, flowId: metaFlowId })
      metaStatus = details.status || null

      // Preview
      const preview = await metaGetFlowPreview({ accessToken: credentials.accessToken, flowId: metaFlowId })
      previewUrl = typeof preview?.preview?.preview_url === 'string' ? preview.preview.preview_url : null
    } else {
      // Já existe: tentar atualizar (apenas se ainda for possível)
      let details = await metaGetFlowDetails({ accessToken: credentials.accessToken, flowId: metaFlowId })
      metaStatus = details.status || null

      // Se está publicado, não dá para modificar; nesse caso, orientamos clonar.
      if (metaStatus === 'PUBLISHED') {
        return NextResponse.json(
          {
            error:
              'Esse Flow já está PUBLISHED na Meta e não pode ser alterado. Crie um novo Flow (clone) ou remova o Flow ID da Meta para publicar como novo.',
            metaFlowId,
            metaStatus,
          },
          { status: 409 }
        )
      }

      if (input.updateIfExists) {
        await metaUpdateFlowMetadata({
          accessToken: credentials.accessToken,
          flowId: metaFlowId,
          name: String(row?.name || 'Flow'),
          categories: input.categories.length > 0 ? input.categories : ['OTHER'],
        })

        const uploaded = await metaUploadFlowJsonAsset({
          accessToken: credentials.accessToken,
          flowId: metaFlowId,
          flowJson,
        })
        validationErrors = uploaded.validation_errors ?? null

        if (input.publish) {
          await metaPublishFlow({ accessToken: credentials.accessToken, flowId: metaFlowId })
        }

        details = await metaGetFlowDetails({ accessToken: credentials.accessToken, flowId: metaFlowId })
        metaStatus = details.status || null

        const preview = await metaGetFlowPreview({ accessToken: credentials.accessToken, flowId: metaFlowId })
        previewUrl = typeof preview?.preview?.preview_url === 'string' ? preview.preview.preview_url : null
      }
    }

    // Persistir no Supabase
    const update: Record<string, unknown> = {
      updated_at: now,
      meta_flow_id: metaFlowId,
      meta_status: metaStatus,
      meta_preview_url: previewUrl,
      meta_validation_errors: validationErrors,
      meta_last_checked_at: now,
      ...(metaStatus === 'PUBLISHED' ? { meta_published_at: now } : {}),
    }

    const { data: updated, error: updErr } = await supabase.from('flows').update(update).eq('id', id).select('*').limit(1)
    if (updErr) {
      return NextResponse.json(
        {
          error: updErr.message || 'Falha ao salvar status do Flow',
          metaFlowId,
          metaStatus,
          metaPreviewUrl: previewUrl,
          validationErrors,
        },
        { status: 500 }
      )
    }

    const updatedRow = Array.isArray(updated) ? updated[0] : (updated as any)

    return NextResponse.json({
      ok: true,
      metaFlowId,
      metaStatus,
      metaPreviewUrl: previewUrl,
      validationErrors,
      row: updatedRow,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Falha ao publicar Flow'

    // Em dev, devolvemos detalhes do erro da Graph API para facilitar debug (sem incluir token).
    if ((process.env.NODE_ENV !== 'production' || wantsDebug) && error instanceof MetaGraphApiError) {
      return NextResponse.json(
        {
          error: msg,
          meta: {
            status: error.status,
            graphError: (error.data as any)?.error ?? error.data,
          },
          debug: wantsDebug
            ? {
                status: error.status,
                graphError: (error.data as any)?.error ?? error.data,
              }
            : undefined,
        },
        { status: 400 }
      )
    }

    if (error instanceof MetaGraphApiError) {
      const graphError = (error.data as any)?.error ?? error.data
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/1294d6ce-76f2-430d-96ab-3ae4d7527327',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H7',location:'app/api/flows/[id]/meta/publish/route.ts:294',message:'meta graph error',data:{status:error.status,code:graphError?.code ?? null,subcode:graphError?.error_subcode ?? null,message:graphError?.message ?? null,fbtraceId:graphError?.fbtrace_id ?? null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion agent log
      if (wantsDebug) {
        return NextResponse.json(
          {
            error: msg,
            debug: {
              status: error.status,
              graphError: (error.data as any)?.error ?? error.data,
            },
          },
          { status: 400 }
        )
      }
    }

    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
