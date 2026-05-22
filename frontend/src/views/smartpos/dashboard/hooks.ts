/**
 * React Query hooks for dashboard data.
 * Caches API responses so re-visiting the dashboard shows stale data instantly
 * while fresh data loads in the background (stale-while-revalidate).
 */
import { keepPreviousData, useQueries, useQuery } from '@tanstack/react-query';
import {
  getDashboard, getPaymentMethodMix, getForecast, getArAging,
  type Period,
} from 'src/api/smartpos/reports';
import { listSales } from 'src/api/smartpos/sales';
import { getExpiringBatches } from 'src/api/smartpos/batches';
import {
  getDemandForecast, getReorderRecommendations, getProfitOpportunities,
  getCustomerRetention, getCashFlowForecast,
} from 'src/api/smartpos/dashboardIntelligence';
import { periodRange, previousPeriod } from './utils';

/** Main dashboard KPIs + chart series (always fetched). */
export function useDashboardData(
  period: Period,
  warehouseId: string | undefined,
  tenantId: string | undefined,
) {
  const range = periodRange(period);
  const prev = previousPeriod(period);

  return useQueries({
    queries: [
      {
        queryKey: ['dashboard', 'main', period, warehouseId, tenantId],
        queryFn: () => getDashboard({ period, warehouseId }),
        enabled: !!tenantId,
        staleTime: 30_000,
        placeholderData: keepPreviousData,
      },
      {
        queryKey: ['dashboard', 'prev', prev, warehouseId, tenantId],
        queryFn: () =>
          prev
            ? getDashboard({ period: prev, warehouseId })
            : Promise.resolve(null),
        enabled: !!tenantId && !!prev,
        staleTime: 60_000,
        placeholderData: keepPreviousData,
      },
      {
        queryKey: ['dashboard', 'paymentMix', range.dateFrom, range.dateTo, tenantId],
        queryFn: () => getPaymentMethodMix(range),
        enabled: !!tenantId,
        staleTime: 30_000,
        placeholderData: keepPreviousData,
      },
      {
        queryKey: ['dashboard', 'recentSales', range, warehouseId, tenantId],
        queryFn: () =>
          listSales({
            ...range,
            warehouseId,
            status: 'CONFIRMED',
            page: 0,
            size: 5,
            sort: 'date,desc',
          }),
        enabled: !!tenantId,
        staleTime: 30_000,
        placeholderData: keepPreviousData,
      },
      {
        queryKey: ['dashboard', 'expiringBatches', tenantId],
        queryFn: () => getExpiringBatches({ withinDays: 30 }),
        enabled: !!tenantId,
        staleTime: 60_000,
        placeholderData: keepPreviousData,
      },
      {
        queryKey: ['dashboard', 'forecast', period, warehouseId, tenantId],
        queryFn: () => getForecast({ period, warehouseId, days: 30 }),
        enabled: !!tenantId,
        staleTime: 60_000,
        placeholderData: keepPreviousData,
      },
      {
        queryKey: ['dashboard', 'arAging', tenantId],
        queryFn: () => getArAging(),
        enabled: !!tenantId,
        staleTime: 60_000,
        placeholderData: keepPreviousData,
      },
    ],
    combine(results) {
      return {
        data: results[0].data ?? null,
        previousData: results[1].data ?? null,
        paymentMix: results[2].data ?? [],
        paymentMixUnavailable: results[2].isError,
        recentSales: results[3].data?.content ?? [],
        expiringBatches: results[4].data ?? [],
        forecast: results[5].data ?? null,
        arAging: results[6].data ?? null,
        isLoading: results[0].isLoading,
        isFetching: results.some((r) => r.isFetching),
        isError: results[0].isError,
        error: results[0].error,
      };
    },
  });
}

/** AI intelligence widgets — fetched lazily, each independently cached. */
export function useDashboardIntelligence(
  warehouseId: string | undefined,
  tenantId: string | undefined,
) {
  const wid = warehouseId || undefined;

  const demandForecast = useQuery({
    queryKey: ['dashboard', 'demandForecast', wid, tenantId],
    queryFn: () => getDemandForecast(7, wid),
    enabled: !!tenantId,
    staleTime: 60_000,
    select: (resp) => resp.data,
    placeholderData: keepPreviousData,
  });

  const reorderRecs = useQuery({
    queryKey: ['dashboard', 'reorderRecs', wid, tenantId],
    queryFn: () => getReorderRecommendations(wid),
    enabled: !!tenantId,
    staleTime: 60_000,
    select: (resp) => resp.data,
    placeholderData: keepPreviousData,
  });

  const profitOpps = useQuery({
    queryKey: ['dashboard', 'profitOpps', wid, tenantId],
    queryFn: () => getProfitOpportunities(wid),
    enabled: !!tenantId,
    staleTime: 60_000,
    select: (resp) => resp.data,
    placeholderData: keepPreviousData,
  });

  const customerRetention = useQuery({
    queryKey: ['dashboard', 'customerRetention', tenantId],
    queryFn: () => getCustomerRetention(),
    enabled: !!tenantId,
    staleTime: 60_000,
    select: (resp) => resp.data,
    placeholderData: keepPreviousData,
  });

  const cashFlowForecast = useQuery({
    queryKey: ['dashboard', 'cashFlowForecast', tenantId],
    queryFn: () => getCashFlowForecast(30),
    enabled: !!tenantId,
    staleTime: 60_000,
    select: (resp) => resp.data,
    placeholderData: keepPreviousData,
  });

  return { demandForecast, reorderRecs, profitOpps, customerRetention, cashFlowForecast };
}
