import { Campaign } from '../types';
import { campaignService } from './campaignService';

export interface ChartDataPoint {
  name: string;
  sent: number;
  read: number;
}

export interface DashboardStats {
  sent24h: string;
  deliveryRate: string;
  activeCampaigns: string;
  failedMessages: string;
  chartData: ChartDataPoint[];
}

// API response from /api/dashboard/stats
interface StatsAPIResponse {
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalFailed: number;
  activeCampaigns: number;
  deliveryRate: number;
}

export const dashboardService = {
  /**
   * Buscar stats do dashboard direto da API otimizada.
   * A API faz uma única query SQL agregada no servidor.
   * Observação: sem cache para manter o dashboard “ao vivo”.
   */
  getStats: async (): Promise<DashboardStats> => {
    // Fazer ambas chamadas em PARALELO
    const [statsResponse, campaignsResult] = await Promise.all([
      fetch('/api/dashboard/stats', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      }),
      campaignService.list({ limit: 7, offset: 0, search: '', status: 'All' })
    ]);
    
    // Parse das respostas
    const stats: StatsAPIResponse = statsResponse.ok 
      ? await statsResponse.json() 
      : { totalSent: 0, totalDelivered: 0, totalRead: 0, totalFailed: 0, activeCampaigns: 0, deliveryRate: 0 };
    
    const campaigns: Campaign[] = campaignsResult?.data || [];
    
    // Chart data das campanhas recentes
    const chartData = campaigns.slice(0, 7).map(c => ({
      name: c.name?.substring(0, 3) || '?',
      sent: c.recipients || 0,
      read: c.read || 0
    })).reverse();
    
    return {
      sent24h: stats.totalSent.toLocaleString(),
      deliveryRate: `${stats.deliveryRate}%`,
      activeCampaigns: stats.activeCampaigns.toString(),
      failedMessages: stats.totalFailed.toString(),
      chartData
    };
  },

  /**
   * Buscar campanhas recentes (top 5).
   * Sem cache para manter o dashboard “ao vivo”.
   */
  getRecentCampaigns: async (): Promise<Campaign[]> => {
    try {
      const result = await campaignService.list({ limit: 5, offset: 0, search: '', status: 'All' });
      return result.data || [];
    } catch {
      return [];
    }
  }
};
