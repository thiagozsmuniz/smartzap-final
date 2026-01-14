"use client";

import { Copy, Key, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/builder/ui/button";
import { Input } from "@/components/builder/ui/input";
import { Label } from "@/components/builder/ui/label";
import { Spinner } from "@/components/builder/ui/spinner";
import { ConfirmOverlay } from "./confirm-overlay";
import { Overlay } from "./overlay";
import { useOverlay } from "./overlay-provider";
import { builderApiService, type ApiKey } from "@/services/builderApiService";

type ApiKeysOverlayProps = {
  overlayId: string;
};

/**
 * Overlay for creating a new API key.
 * Pushed onto the stack from ApiKeysOverlay.
 */
function CreateApiKeyOverlay({
  overlayId,
  onCreated,
}: {
  overlayId: string;
  onCreated: (key: ApiKey) => void;
}) {
  const { pop } = useOverlay();
  const [keyName, setKeyName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const newKey = await builderApiService.createApiKey(keyName || null);
      onCreated(newKey);
      toast.success("Chave de API criada");
      pop();
    } catch (error) {
      console.error("Failed to create API key:", error);
      toast.error(
        error instanceof Error ? error.message : "Falha ao criar chave de API"
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <Overlay
      actions={[{ label: "Criar", onClick: handleCreate, loading: creating }]}
      overlayId={overlayId}
      title="Criar chave de API"
    >
      <p className="mb-4 text-muted-foreground text-sm">
        Crie uma nova chave para autenticação de webhooks
      </p>
      <div className="space-y-2">
        <Label htmlFor="key-name">Rotulo (opcional)</Label>
        <Input
          id="key-name"
          onChange={(e) => setKeyName(e.target.value)}
          placeholder="ex: Producao, Testes"
          value={keyName}
        />
      </div>
    </Overlay>
  );
}

/**
 * Main API Keys management overlay.
 */
export function ApiKeysOverlay({ overlayId }: ApiKeysOverlayProps) {
  const { push, closeAll } = useOverlay();
  const [loading, setLoading] = useState(true);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadApiKeys = useCallback(async () => {
    setLoading(true);
    try {
      const keys = await builderApiService.listApiKeys();
      setApiKeys(keys);
    } catch (error) {
      console.error("Failed to load API keys:", error);
      toast.error("Falha ao carregar chaves de API");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApiKeys();
  }, [loadApiKeys]);

  const handleKeyCreated = (newKey: ApiKey) => {
    setNewlyCreatedKey(newKey.key ?? null);
    setApiKeys((prev) => [newKey, ...prev]);
  };

  const handleDelete = async (keyId: string) => {
    setDeleting(keyId);
    try {
      await builderApiService.deleteApiKey(keyId);
      setApiKeys((prev) => prev.filter((k) => k.id !== keyId));
      toast.success("Chave de API excluida");
    } catch (error) {
      console.error("Failed to delete API key:", error);
      toast.error("Falha ao excluir chave de API");
    } finally {
      setDeleting(null);
    }
  };

  const openDeleteConfirm = (keyId: string) => {
    push(ConfirmOverlay, {
      title: "Excluir chave de API",
      message:
        "Tem certeza que deseja excluir esta chave? Webhooks que usam essa chave vao parar imediatamente.",
      confirmLabel: "Excluir",
      confirmVariant: "destructive" as const,
      destructive: true,
      onConfirm: () => handleDelete(keyId),
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Cópiado");
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("pt-BR", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <Overlay
      actions={[
        {
          label: "Nova chave de API",
          variant: "outline",
          onClick: () =>
            push(CreateApiKeyOverlay, { onCreated: handleKeyCreated }),
        },
        { label: "Concluir", onClick: closeAll },
      ]}
      overlayId={overlayId}
      title="Chaves de API"
    >
      <p className="-mt-2 mb-4 text-muted-foreground text-sm">
        Gerencie chaves de API para autenticação de webhooks
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Newly created key warning */}
          {newlyCreatedKey && (
            <div className="rounded-md border border-yellow-500/50 bg-yellow-500/10 p-3">
              <p className="mb-2 font-medium text-sm text-yellow-600 dark:text-yellow-400">
                Copie sua chave agora. Voce nao podera ver novamente!
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-muted px-2 py-1 font-mono text-xs">
                  {newlyCreatedKey}
                </code>
                <Button
                  onClick={() => copyToClipboard(newlyCreatedKey)}
                  size="sm"
                  variant="outline"
                >
                  <Copy className="size-4" />
                </Button>
              </div>
              <Button
                className="mt-2"
                onClick={() => setNewlyCreatedKey(null)}
                size="sm"
                variant="ghost"
              >
                Fechar
              </Button>
            </div>
          )}

          {/* API Keys list */}
          {apiKeys.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              <Key className="mx-auto mb-2 size-8 opacity-50" />
              <p>Nenhuma chave de API ainda</p>
              <p className="text-xs">
                Crie uma chave para autenticar webhooks
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {apiKeys.map((apiKey) => (
                <div
                  className="flex items-center justify-between rounded-md border p-3"
                  key={apiKey.id}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                        {apiKey.keyPrefix}...
                      </code>
                      {apiKey.name && (
                        <span className="truncate text-sm">{apiKey.name}</span>
                      )}
                    </div>
                    <p className="mt-1 text-muted-foreground text-xs">
                      Criada em {formatDate(apiKey.createdAt)}
                      {apiKey.lastUsedAt &&
                        ` · Ultimo uso ${formatDate(apiKey.lastUsedAt)}`}
                    </p>
                  </div>
                  <Button
                    disabled={deleting === apiKey.id}
                    onClick={() => openDeleteConfirm(apiKey.id)}
                    size="sm"
                    variant="ghost"
                  >
                    {deleting === apiKey.id ? (
                      <Spinner className="size-4" />
                    ) : (
                      <Trash2 className="size-4 text-destructive" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Overlay>
  );
}
