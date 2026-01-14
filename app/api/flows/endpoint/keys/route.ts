/**
 * API para gerenciar chaves RSA do Flow Endpoint
 *
 * GET - Retorna chave publica atual (para configurar na Meta)
 * POST - Gera novo par de chaves
 * DELETE - Remove chaves configuradas
 */

import { NextResponse } from 'next/server'
import { settingsDb } from '@/lib/supabase-db'
import { isSupabaseConfigured } from '@/lib/supabase'
import {
  generateKeyPair,
  isValidPrivateKey,
} from '@/lib/whatsapp/flow-endpoint-crypto'
import { getWhatsAppCredentials } from '@/lib/whatsapp-credentials'
import { metaSetEncryptionPublicKey, metaGetEncryptionPublicKey } from '@/lib/meta-flows-api'

const PRIVATE_KEY_SETTING = 'whatsapp_flow_private_key'
const PUBLIC_KEY_SETTING = 'whatsapp_flow_public_key'

/**
 * GET - Retorna status das chaves e chave publica
 */
export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Supabase nao configurado' }, { status: 400 })
    }

    const [privateKey, publicKey] = await Promise.all([
      settingsDb.get(PRIVATE_KEY_SETTING),
      settingsDb.get(PUBLIC_KEY_SETTING),
    ])

    const hasPrivateKey = !!privateKey && isValidPrivateKey(privateKey)
    const hasPublicKey = !!publicKey

    // Verifica se a chave esta registrada na Meta
    let metaRegistered = false
    const credentials = await getWhatsAppCredentials()
    if (credentials?.accessToken && credentials?.businessAccountId && hasPublicKey) {
      try {
        const metaKey = await metaGetEncryptionPublicKey({
          accessToken: credentials.accessToken,
          wabaId: credentials.businessAccountId,
        })
        metaRegistered = !!metaKey.publicKey
      } catch {
        // Ignora erros ao verificar - pode ser que a API nao suporte ou permissoes
      }
    }

    return NextResponse.json({
      configured: hasPrivateKey && hasPublicKey,
      hasPrivateKey,
      hasPublicKey,
      metaRegistered,
      publicKey: hasPublicKey ? publicKey : null,
      endpointUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/api/flows/endpoint`
        : process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}/api/flows/endpoint`
          : process.env.NEXT_PUBLIC_APP_URL
            ? `${process.env.NEXT_PUBLIC_APP_URL}/api/flows/endpoint`
            : null,
    })
  } catch (error) {
    console.error('[flow-endpoint-keys] GET error:', error)
    return NextResponse.json(
      { error: 'Erro ao verificar chaves' },
      { status: 500 }
    )
  }
}

/**
 * POST - Gera novo par de chaves e registra automaticamente na Meta
 *
 * Body opcional:
 * - privateKey: string (importar chave existente)
 * - publicKey: string (importar chave existente)
 */
export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Supabase nao configurado' }, { status: 400 })
    }

    // Verifica se tem credenciais do WhatsApp para registrar na Meta
    const credentials = await getWhatsAppCredentials()
    if (!credentials?.accessToken || !credentials?.businessAccountId) {
      return NextResponse.json(
        { error: 'Configure suas credenciais do WhatsApp antes de gerar as chaves.' },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({}))

    let privateKey: string
    let publicKey: string

    // Se usuario forneceu chaves, usa elas
    if (body.privateKey && body.publicKey) {
      if (!isValidPrivateKey(body.privateKey)) {
        return NextResponse.json(
          { error: 'Chave privada invalida' },
          { status: 400 }
        )
      }
      privateKey = body.privateKey
      publicKey = body.publicKey
    } else {
      // Gera novo par de chaves
      const keyPair = generateKeyPair()
      privateKey = keyPair.privateKey
      publicKey = keyPair.publicKey
    }

    // Registra a chave publica na Meta automaticamente
    let metaRegistered = false
    let metaError: string | null = null
    try {
      await metaSetEncryptionPublicKey({
        accessToken: credentials.accessToken,
        wabaId: credentials.businessAccountId,
        publicKey,
      })
      metaRegistered = true
    } catch (err) {
      metaError = err instanceof Error ? err.message : 'Erro ao registrar na Meta'
      console.error('[flow-endpoint-keys] Meta registration error:', err)
    }

    // Salva as chaves localmente (mesmo se falhar na Meta, pode tentar depois)
    await Promise.all([
      settingsDb.set(PRIVATE_KEY_SETTING, privateKey),
      settingsDb.set(PUBLIC_KEY_SETTING, publicKey),
    ])

    if (metaRegistered) {
      return NextResponse.json({
        success: true,
        metaRegistered: true,
        message: 'Chaves geradas e registradas na Meta automaticamente!',
      })
    } else {
      return NextResponse.json({
        success: true,
        metaRegistered: false,
        publicKey,
        message: 'Chaves geradas localmente, mas falhou ao registrar na Meta.',
        metaError,
        instructions: [
          'A chave foi salva localmente mas nao foi possivel registrar na Meta automaticamente.',
          'Isso pode acontecer se o Access Token nao tiver permissao whatsapp_business_encryption.',
          'Voce pode tentar novamente ou registrar manualmente via API.',
        ],
      })
    }
  } catch (error) {
    console.error('[flow-endpoint-keys] POST error:', error)
    return NextResponse.json(
      { error: 'Erro ao gerar chaves' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Remove chaves configuradas
 */
export async function DELETE() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Supabase nao configurado' }, { status: 400 })
    }

    await Promise.all([
      settingsDb.set(PRIVATE_KEY_SETTING, ''),
      settingsDb.set(PUBLIC_KEY_SETTING, ''),
    ])

    return NextResponse.json({
      success: true,
      message: 'Chaves removidas',
    })
  } catch (error) {
    console.error('[flow-endpoint-keys] DELETE error:', error)
    return NextResponse.json(
      { error: 'Erro ao remover chaves' },
      { status: 500 }
    )
  }
}
