import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboardService';
import { useRealtimeQuery } from './useRealtimeQuery';

// Polling interval: 30 seconds (fallback when Realtime unavailable)
const POLLING_INTERVAL = 30000;

export const useDashboardController = (initialData?: { stats: any, recentCampaigns: any[] }) => {
  // Stats with Realtime updates - subscribes to campaigns table for live metrics
  const statsQuery = useRealtimeQuery({
    queryKey: ['dashboardStats'],
    queryFn: dashboardService.getStats,
    initialData: initialData?.stats,
    placeholderData: (previous) => previous,
    refetchInterval: POLLING_INTERVAL,
    staleTime: 15000,
    gcTime: 60000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    // Realtime configuration
    table: 'campaigns',
    events: ['INSERT', 'UPDATE'],
    debounceMs: 500, // Dashboard can be slower
  });

  // Recent campaigns with Realtime updates
  const recentCampaignsQuery = useRealtimeQuery({
    queryKey: ['recentCampaigns'],
    queryFn: dashboardService.getRecentCampaigns,
    initialData: initialData?.recentCampaigns,
    placeholderData: (previous) => previous,
    refetchInterval: POLLING_INTERVAL,
    staleTime: 20000,
    gcTime: 120000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    // Realtime configuration
    table: 'campaigns',
    events: ['INSERT', 'UPDATE', 'DELETE'],
    debounceMs: 500,
  });

  return {
    stats: statsQuery.data,
    recentCampaigns: recentCampaignsQuery.data,
    isLoading: statsQuery.isLoading && !statsQuery.data,
    isFetching: statsQuery.isFetching || recentCampaignsQuery.isFetching,
    isError: statsQuery.isError || recentCampaignsQuery.isError,
    refetch: () => {
      statsQuery.refetch();
      recentCampaignsQuery.refetch();
    }
  };
};
