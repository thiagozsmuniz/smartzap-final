/**
 * Builder API Service
 * Handles workflow execution and API key management for the builder
 */

export type ApiKey = {
  id: string
  name: string | null
  keyPrefix: string
  createdAt: string
  lastUsedAt: string | null
  key?: string
}

export const builderApiService = {
  // =============================================================================
  // API KEYS
  // =============================================================================

  listApiKeys: async (): Promise<ApiKey[]> => {
    const response = await fetch('/api/builder/api-keys')
    if (!response.ok) {
      throw new Error('Falha ao carregar chaves de API')
    }
    return response.json()
  },

  createApiKey: async (name?: string | null): Promise<ApiKey> => {
    const response = await fetch('/api/builder/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name || null }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error((error as any)?.error || 'Falha ao criar chave de API')
    }

    return response.json()
  },

  deleteApiKey: async (keyId: string): Promise<void> => {
    const response = await fetch(`/api/builder/api-keys/${keyId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error('Falha ao excluir chave de API')
    }
  },

  // =============================================================================
  // WORKFLOW EXECUTION
  // =============================================================================

  executeWorkflow: async (
    workflowId: string,
    input?: Record<string, unknown>
  ): Promise<{ executionId: string }> => {
    const response = await fetch(`/api/builder/workflow/${workflowId}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: input || {} }),
    })

    if (!response.ok) {
      throw new Error('Falha ao executar o fluxo')
    }

    return response.json()
  },
}
