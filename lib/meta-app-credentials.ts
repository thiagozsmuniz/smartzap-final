import { settingsDb } from '@/lib/supabase-db'

export type MetaAppCredentialsSource = 'db' | 'env' | 'none'

export interface MetaAppCredentials {
  appId: string
  appSecret: string
  source: MetaAppCredentialsSource
}

/**
 * Credenciais do App da Meta (opcional).
 *
 * Usadas para validação forte de tokens via Graph API `/debug_token`.
 *
 * Prioridade:
 * 1) Supabase `settings` (metaAppId/metaAppSecret)
 * 2) Env vars (META_APP_ID/META_APP_SECRET)
 */
export async function getMetaAppCredentials(): Promise<MetaAppCredentials | null> {
  try {
    // IMPORTANTE: settingsDb.getAll() retorna apenas um subconjunto (AppSettings) e
    // não inclui chaves arbitrárias como metaAppId/metaAppSecret.
    // Então precisamos ler as chaves diretamente.
    const [dbAppId, dbSecret] = await Promise.all([
      settingsDb.get('metaAppId'),
      settingsDb.get('metaAppSecret'),
    ])

    const appId = String(dbAppId || '').trim() || String(process.env.META_APP_ID || '').trim()
    const appSecret = String(dbSecret || '').trim() || String(process.env.META_APP_SECRET || '').trim()

    if (!appId || !appSecret) return null

    const source: MetaAppCredentialsSource =
      String(dbAppId || '').trim() && String(dbSecret || '').trim() ? 'db'
      : (String(process.env.META_APP_ID || '').trim() && String(process.env.META_APP_SECRET || '').trim() ? 'env' : 'none')

    return { appId, appSecret, source }
  } catch {
    const appId = String(process.env.META_APP_ID || '').trim()
    const appSecret = String(process.env.META_APP_SECRET || '').trim()
    if (!appId || !appSecret) return null
    return { appId, appSecret, source: 'env' }
  }
}

export async function getMetaAppConfigPublic(): Promise<{
  source: MetaAppCredentialsSource
  appId: string | null
  hasAppSecret: boolean
  isConfigured: boolean
}> {
  try {
    const [dbAppIdRaw, dbSecretRaw] = await Promise.all([
      settingsDb.get('metaAppId'),
      settingsDb.get('metaAppSecret'),
    ])

    const dbAppId = String(dbAppIdRaw || '').trim()
    const dbSecret = String(dbSecretRaw || '').trim()

    const envAppId = String(process.env.META_APP_ID || '').trim()
    const envSecret = String(process.env.META_APP_SECRET || '').trim()

    const appId = (dbAppId || envAppId) || null
    const hasAppSecret = Boolean(dbSecret || envSecret)

    const source: MetaAppCredentialsSource =
      dbAppId || dbSecret ? 'db'
      : (envAppId || envSecret ? 'env' : 'none')

    return {
      source,
      appId,
      hasAppSecret,
      isConfigured: Boolean(appId && hasAppSecret),
    }
  } catch {
    const envAppId = String(process.env.META_APP_ID || '').trim()
    const envSecret = String(process.env.META_APP_SECRET || '').trim()
    const appId = envAppId || null
    const hasAppSecret = Boolean(envSecret)
    const source: MetaAppCredentialsSource = (envAppId || envSecret) ? 'env' : 'none'
    return {
      source,
      appId,
      hasAppSecret,
      isConfigured: Boolean(appId && hasAppSecret),
    }
  }
}
