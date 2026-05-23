/**
 * React Query hooks for dashboard data.
 * Caches API responses so re-visiting the dashboard shows stale data instantly
 * while fresh data loads in the background (stale-while-revalidate).
 */
import { keepPreviousData, useQueries, useQuery } from '@tanstack/react-query';
import { listWarehouses, type Warehouse } from 'src/api/smartpos/inventory';
import {
  getDashboard, getPaymentMethodMix, getForecast, getArAging,
  getTopProductsV2, getTopCustomersV2, getTopSuppliersV2,
  getAnomalies,
  type Period,
} from 'src/api/smartpos/reports';
import { listSales } from 'src/api/smartpos/sales';
import { getExpiringBatches } from 'src/api/smartpos/batches';
import {
  getDemandForecast, getReorderRecommendations, getProfitOpportunities,
  getCustomerRetention, getCashFlowForecast,
} from 'src/api/smartpos/dashboardIntelligence';
import { periodRange, previousPeriod } from './utils';

/** Stagger helper — spreads concurrent requests by `index * delayMs`. */
function stagger<T>(fn: () => Promise<T>, index: number, delayMs = 30): Promise<T> {
  return new Promise((resolve, reject) =>
    setTimeout(() => fn().then(resolve, reject), index * delayMs),
  );
}

/** Main dashboard KPIs + chart series — waves of 3 then 4 to avoid gateway
 *  reactive-pipeline race conditions that close HTTP/2 connections. */
export function useDashboardData(
  period: Period,
  warehouseId: string | undefined,
  tenantId: string | undefined,
) {
  const range = periodRange(period);
  const prev = previousPeriod(period);

  return useQueries({
    queries: [
      // Wave 1 — critical KPIs (indices 0-2, no stagger delay)
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
            ? stagger(() => getDashboard({ period: prev, warehouseId }), 0)
            : Promise.resolve(null),
        enabled: !!tenantId && !!prev,
        staleTime: 60_000,
        placeholderData: keepPreviousData,
      },
      {
        queryKey: ['dashboard', 'paymentMix', range.dateFrom, range.dateTo, tenantId],
        queryFn: () => stagger(() => getPaymentMethodMix(range), 1),
        enabled: !!tenantId,
        staleTime: 30_000,
        placeholderData: keepPreviousData,
      },
      // Wave 2 — secondary data (indices 3-6, staggered 30-120ms)
      {
        queryKey: ['dashboard', 'recentSales', range, warehouseId, tenantId],
        queryFn: () =>
          stagger(() =>
            listSales({
              ...range, warehouseId, status: 'CONFIRMED',
              page: 0, size: 5, sort: 'date,desc',
            }), 3),
        enabled: !!tenantId,
        staleTime: 30_000,
        placeholderData: keepPreviousData,
      },
      {
        queryKey: ['dashboard', 'expiringBatches', tenantId],
        queryFn: () => stagger(() => getExpiringBatches({ withinDays: 30 }), 4),
        enabled: !!tenantId,
        staleTime: 60_000,
        placeholderData: keepPreviousData,
      },
      {
        queryKey: ['dashboard', 'forecast', period, warehouseId, tenantId],
        queryFn: () => stagger(() => getForecast({ period, warehouseId, days: 30 }), 5),
        enabled: !!tenantId,
        staleTime: 60_000,
        placeholderData: keepPreviousData,
      },
      {
        queryKey: ['dashboard', 'arAging', tenantId],
        queryFn: () => stagger(() => getArAging(), 6),
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
        recentSalesUnavailable: results[3].isError,
        expiringBatches: results[4].data ?? [],
        forecast: results[5].data ?? null,
        arAging: results[6].data ?? null,
        isLoading: results[0].isLoading,
        isFetching: results.some((r) => r.isFetching),
        isError: results[0].isError,
        error: results[0].error,
        dataUpdatedAt: results[0].dataUpdatedAt,
      };
    },
  });
}

/** AI intelligence widgets — fetched lazily, each independently cached. */
export function useDashboardIntelligence(
  warehouseId: string | undefined,
  tenantId: string | undefined,
  enabled = true,
) {
  const wid = warehouseId || undefined;

  const demandForecast = useQuery({
    queryKey: ['dashboard', 'demandForecast', wid, tenantId],
    queryFn: () => getDemandForecast(7, wid),
    enabled: enabled && !!tenantId,
    staleTime: 60_000,
    select: (resp) => resp.data,
    placeholderData: keepPreviousData,
  });

  const reorderRecs = useQuery({
    queryKey: ['dashboard', 'reorderRecs', wid, tenantId],
    queryFn: () => getReorderRecommendations(wid),
    enabled: enabled && !!tenantId,
    staleTime: 60_000,
    select: (resp) => resp.data,
    placeholderData: keepPreviousData,
  });

  const profitOpps = useQuery({
    queryKey: ['dashboard', 'profitOpps', wid, tenantId],
    queryFn: () => getProfitOpportunities(wid),
    enabled: enabled && !!tenantId,
    staleTime: 60_000,
    select: (resp) => resp.data,
    placeholderData: keepPreviousData,
  });

  const customerRetention = useQuery({
    queryKey: ['dashboard', 'customerRetention', tenantId],
    queryFn: () => getCustomerRetention(),
    enabled: enabled && !!tenantId,
    staleTime: 60_000,
    select: (resp) => resp.data,
    placeholderData: keepPreviousData,
  });

  const cashFlowForecast = useQuery({
    queryKey: ['dashboard', 'cashFlowForecast', tenantId],
    queryFn: () => getCashFlowForecast(30),
    enabled: enabled && !!tenantId,
    staleTime: 60_000,
    select: (resp) => resp.data,
    placeholderData: keepPreviousData,
  });

  return { demandForecast, reorderRecs, profitOpps, customerRetention, cashFlowForecast };
}

/** Warehouses — cached with long staleTime since they change rarely. */
export function useWarehouses(tenantId: string | undefined) {
  return useQuery({
    queryKey: ['warehouses', tenantId],
    queryFn: () => listWarehouses().then((rows) => rows.filter((r) => r.active)),
    enabled: !!tenantId,
    staleTime: 5 * 60_000,
    select: (rows) => rows as Warehouse[],
  });
}

/** Top performers — cached per period/warehouse. */
export function useTopPerformers(
  period: Period,
  warehouseId: string | undefined,
  tenantId: string | undefined,
  enabled: boolean,
  limit = 5,
) {
  const wid = warehouseId || undefined;

  const products = useQuery({
    queryKey: ['dashboard', 'topProducts', period, wid, tenantId],
    queryFn: () => getTopProductsV2({ period, warehouseId: wid, limit }),
    enabled: enabled && !!tenantId,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  const customers = useQuery({
    queryKey: ['dashboard', 'topCustomers', period, wid, tenantId],
    queryFn: () => getTopCustomersV2({ period, warehouseId: wid, limit }),
    enabled: enabled && !!tenantId,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  const suppliers = useQuery({
    queryKey: ['dashboard', 'topSuppliers', period, wid, tenantId],
    queryFn: () => getTopSuppliersV2({ period, warehouseId: wid, limit }),
    enabled: enabled && !!tenantId,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  return { products, customers, suppliers };
}

/** Anomaly alerts — cached per warehouse, silently suppresses errors. */
export function useAnomalies(warehouseId: string | undefined, tenantId: string | undefined, enabled: boolean) {
  const wid = warehouseId || undefined;

  return useQuery({
    queryKey: ['dashboard', 'anomalies', wid, tenantId],
    queryFn: () => getAnomalies({ warehouseId: wid }),
    enabled: enabled && !!tenantId,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}
