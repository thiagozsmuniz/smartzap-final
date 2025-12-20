import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { campaignService, type CampaignListResult } from '../services/campaignService';
import { Campaign } from '../types';
import { useRealtimeQuery } from './useRealtimeQuery';

const ITEMS_PER_PAGE = 20;

type CampaignsQueryData =
  | Campaign[]
  | CampaignListResult
  | undefined;

const removeCampaignFromCache = (current: CampaignsQueryData, id: string): CampaignsQueryData => {
  if (!current) return current;
  if (Array.isArray(current)) {
    return current.filter(c => c.id !== id);
  }
  if (typeof current === 'object' && Array.isArray(current.data)) {
    const before = current.data.length;
    const nextData = current.data.filter(c => c.id !== id);
    const removed = before !== nextData.length;
    return {
      ...current,
      data: nextData,
      total: removed ? Math.max(0, (current.total || 0) - 1) : current.total,
    };
  }
  return current;
};

// --- Data Hook (React Query + Realtime) ---
export const useCampaignsQuery = (
  params: { page: number; search: string; status: string },
  initialData?: CampaignListResult
) => {
  const limit = ITEMS_PER_PAGE;
  const offset = Math.max(0, (params.page - 1) * limit);
  return useRealtimeQuery({
    queryKey: ['campaigns', { page: params.page, search: params.search, status: params.status }],
    queryFn: () => campaignService.list({
      limit,
      offset,
      search: params.search,
      status: params.status,
    }),
    initialData,
    placeholderData: (previous) => previous,
    staleTime: 15 * 1000,  // 15 segundos
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // Realtime configuration
    table: 'campaigns',
    events: ['INSERT', 'UPDATE', 'DELETE'],
    debounceMs: 200,
  });
};

// --- Mutations ---
export const useCampaignMutations = () => {
  const queryClient = useQueryClient();

  // Track which IDs are currently being processed
  const [processingDeleteId, setProcessingDeleteId] = useState<string | undefined>(undefined);
  const [processingDuplicateId, setProcessingDuplicateId] = useState<string | undefined>(undefined);
  const [lastDuplicatedCampaignId, setLastDuplicatedCampaignId] = useState<string | undefined>(undefined);

  const deleteMutation = useMutation({
    mutationFn: campaignService.delete,
    // Optimistic update: remove immediately from UI
    onMutate: async (id: string) => {
      setProcessingDeleteId(id);
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['campaigns'] });

      // Get the current data
      const previousData = queryClient.getQueriesData<CampaignsQueryData>({ queryKey: ['campaigns'] });

      // Optimistically remove from all cached pages
      queryClient.setQueriesData<CampaignsQueryData>(
        { queryKey: ['campaigns'] },
        (old) => removeCampaignFromCache(old, id)
      );

      // Also remove from dashboard recent campaigns
      queryClient.setQueryData<Campaign[]>(['recentCampaigns'], (old) =>
        old?.filter(c => c.id !== id) ?? []
      );

      return { previousData };
    },
    onError: (_err, _id, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach(([key, data]) => {
          queryClient.setQueryData(key as QueryKey, data);
        });
      }
    },
    onSuccess: () => {
      // Server-side cache was invalidated via revalidateTag
      // Force refetch to get fresh data from invalidated cache
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['recentCampaigns'] });
    },
    onSettled: () => {
      setProcessingDeleteId(undefined);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: campaignService.duplicate,
    onMutate: async (id: string) => {
      setProcessingDuplicateId(id);
      // Evita refetch simultâneo durante a duplicação
      await queryClient.cancelQueries({ queryKey: ['campaigns'] });
      return { id };
    },
    onSuccess: (clonedCampaign) => {
      setLastDuplicatedCampaignId(clonedCampaign?.id);
      // Server-side cache foi invalidado via revalidateTag (quando aplicável)
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['recentCampaigns'] });
    },
    onSettled: () => {
      setProcessingDuplicateId(undefined);
    },
  });

  return {
    deleteCampaign: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    deletingId: processingDeleteId,

    duplicateCampaign: duplicateMutation.mutate,
    isDuplicating: duplicateMutation.isPending,
    duplicatingId: processingDuplicateId,

    lastDuplicatedCampaignId,
    clearLastDuplicatedCampaignId: () => setLastDuplicatedCampaignId(undefined),
  };
};

// --- Controller Hook (Smart) ---
export const useCampaignsController = (initialData?: CampaignListResult) => {
  // UI State
  const [filter, setFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading, error, refetch } = useCampaignsQuery(
    { page: currentPage, search: searchTerm.trim(), status: filter },
    initialData
  );

  const campaigns = data?.data || [];
  const totalFiltered = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / ITEMS_PER_PAGE));
  const {
    deleteCampaign,
    duplicateCampaign,
    isDeleting,
    deletingId,
    isDuplicating,
    duplicatingId,
    lastDuplicatedCampaignId,
    clearLastDuplicatedCampaignId,
  } = useCampaignMutations();

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchTerm]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Handlers
  const handleDelete = (id: string) => {
    // Deletar diretamente sem confirmação (pode ser desfeito clonando)
    deleteCampaign(id);
  };

  const handleRefresh = () => {
    refetch();
  };

  const handleDuplicate = (id: string) => {
    duplicateCampaign(id);
  };

  return {
    // Data
    campaigns,
    isLoading: isLoading && !data,
    error,

    // State
    filter,
    searchTerm,

    // Setters
    setFilter,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    totalPages,
    totalFiltered,

    // Actions
    onDelete: handleDelete,
    onDuplicate: handleDuplicate,
    onRefresh: handleRefresh,

    // Loading states for specific items
    isDeleting,
    deletingId,
    isDuplicating,
    duplicatingId,

    // Redirect helper (wrapper pode observar isso e navegar)
    lastDuplicatedCampaignId,
    clearLastDuplicatedCampaignId,
  };
};
