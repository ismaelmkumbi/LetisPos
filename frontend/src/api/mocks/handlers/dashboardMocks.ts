/**
 * MSW handlers — SmartPOS dashboard mock data.
 * Realistic Tanzanian SME data for all dashboard endpoints.
 */
import { http, HttpResponse, delay } from 'msw';

const BASE = '*';

// ── helpers ─────────────────────────────────────────────────────────────────

const rand = (min: number, max: number) => Math.round(min + Math.random() * (max - min));
const money = (v: number) => v;
const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) => {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

// Generate daily sales series for last 30 days
function salesSeries(days: number): { date: string; net: number; count: number }[] {
  const series: { date: string; net: number; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const dayOfWeek = d.getDay();
    // Weekends have lower sales
    const factor = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.4 : 1;
    const base = rand(800000, 1800000) * factor;
    series.push({
      date: d.toISOString().slice(0, 10),
      net: base,
      count: rand(15, 45),
    });
  }
  return series;
}

const series = salesSeries(30);
const todaySeries = series[series.length - 1];

// ── Dashboard KPI ────────────────────────────────────────────────────────────

export const dashboardKpiHandler = http.get(`${BASE}/api/v1/reports/dashboard`, async () => {
  await delay(200);
  return HttpResponse.json({
    from: today(),
    to: today(),
    sales: {
      count: todaySeries.count,
      gross: money(todaySeries.net * 1.18),
      tax: money(todaySeries.net * 0.18),
      discount: money(rand(10000, 50000)),
      net: money(todaySeries.net),
      paid: money(todaySeries.net * 0.85),
      due: money(todaySeries.net * 0.15),
    },
    purchases: {
      count: rand(3, 8),
      gross: money(rand(400000, 900000)),
      paid: money(rand(300000, 700000)),
      due: money(rand(50000, 200000)),
    },
    payments: {
      count: todaySeries.count,
      totalIn: money(todaySeries.net * 0.85 + rand(50000, 150000)),
      totalOut: money(rand(200000, 500000)),
    },
    expenses: {
      total: money(rand(80000, 250000)),
      count: rand(2, 6),
    },
    inventory: {
      distinctProducts: rand(120, 350),
      totalOnHand: money(rand(8000000, 25000000)),
      totalAvailable: money(rand(6000000, 20000000)),
      lowStockLines: rand(3, 12),
    },
    salesSeries: series,
    topProducts: [
      { productId: 'p1', name: 'Maize Flour (50kg)', qty: rand(20, 40), revenue: money(rand(400000, 700000)) },
      { productId: 'p2', name: 'Cooking Oil (5L)', qty: rand(30, 60), revenue: money(rand(300000, 600000)) },
      { productId: 'p3', name: 'Sugar (25kg)', qty: rand(15, 30), revenue: money(rand(250000, 500000)) },
      { productId: 'p4', name: 'Rice (25kg)', qty: rand(10, 25), revenue: money(rand(200000, 450000)) },
      { productId: 'p5', name: 'Cement (50kg)', qty: rand(5, 15), revenue: money(rand(150000, 350000)) },
    ],
    netProfit: money(todaySeries.net - rand(400000, 900000) - rand(80000, 250000)),
  });
});

// ── Payment Method Mix ──────────────────────────────────────────────────────

export const paymentMethodMixHandler = http.get(`${BASE}/api/v1/payments/by-method`, async () => {
  await delay(150);
  const total = todaySeries.net * 0.85;
  return HttpResponse.json([
    { method: 'M-Pesa', total: money(total * 0.45), count: rand(12, 25) },
    { method: 'Airtel Money', total: money(total * 0.15), count: rand(4, 10) },
    { method: 'Cash', total: money(total * 0.25), count: rand(8, 15) },
    { method: 'Tigo Pesa', total: money(total * 0.10), count: rand(3, 6) },
    { method: 'Bank Transfer', total: money(total * 0.05), count: rand(1, 3) },
  ]);
});

// ── Recent Sales ────────────────────────────────────────────────────────────

const customers = [
  'Jane Daudi', 'John Magesa', 'Ali Khamis', 'Fatma Omar', 'Peter Mushi',
  'Grace Shayo', 'David Mwanga', 'Anna Juma',
];

export const listSalesHandler = http.get(`${BASE}/api/v1/sales`, async () => {
  await delay(200);
  const sales = Array.from({ length: 5 }, (_, i) => ({
    id: `sale-${1000 + i}`,
    ref: `INV-${String(2400 + i).padStart(4, '0')}`,
    date: i === 0 ? today() : daysAgo(i),
    createdAt: new Date().toISOString(),
    status: 'CONFIRMED' as const,
    customerId: `c${i + 1}`,
    customerName: customers[i],
    grandTotal: money(rand(15000, 450000)),
    net: money(rand(12000, 380000)),
  }));
  return HttpResponse.json({ content: sales, totalPages: 1, totalElements: 5 });
});

// ── Expiring Batches ────────────────────────────────────────────────────────

export const expiringBatchesHandler = http.get(`${BASE}/api/v1/stock/batches/expiring`, async () => {
  await delay(100);
  return HttpResponse.json([
    { id: 'b1', productId: 'p1', productName: 'Maize Flour (50kg)', onHand: 8, expiryDate: daysAgo(-5) },
    { id: 'b2', productId: 'p3', productName: 'Sugar (25kg)', onHand: 4, expiryDate: daysAgo(-8) },
    { id: 'b3', productId: 'p9', productName: 'Wheat Flour (10kg)', onHand: 6, expiryDate: daysAgo(-12) },
  ]);
});

// ── Forecast ────────────────────────────────────────────────────────────────

export const forecastHandler = http.get(`${BASE}/api/v1/reports/forecast`, async () => {
  await delay(200);
  const historical = series.slice(-14);
  const projected = Array.from({ length: 7 }, (_, i) => ({
    date: new Date(Date.now() + (i + 1) * 86400000).toISOString().slice(0, 10),
    value: money(rand(700000, 1600000)),
  }));
  return HttpResponse.json({ historical, projected });
});

// ── AR Aging ────────────────────────────────────────────────────────────────

export const arAgingHandler = http.get(`${BASE}/api/v1/reports/payments/aging`, async () => {
  await delay(100);
  return HttpResponse.json({
    buckets: [
      { label: '0-30 days', daysFrom: 0, daysTo: 30, amount: money(250000), invoiceCount: 8 },
      { label: '31-60 days', daysFrom: 31, daysTo: 60, amount: money(180000), invoiceCount: 4 },
      { label: '61-90 days', daysFrom: 61, daysTo: 90, amount: money(85000), invoiceCount: 2 },
      { label: '90+ days', daysFrom: 91, daysTo: 999, amount: money(45000), invoiceCount: 1 },
    ],
    totalOutstanding: money(560000),
  });
});

// ── Warehouses ──────────────────────────────────────────────────────────────

export const listWarehousesHandler = http.get(`${BASE}/api/v1/stock/warehouses`, async () => {
  await delay(100);
  return HttpResponse.json([
    { id: 'w1', code: 'MAIN', name: 'Main Branch — Mwenge', city: 'Dar es Salaam', country: 'TZ', phone: '+255 712 345 678', email: '', zip: '', notes: '', active: true },
  ]);
});

// ── Dashboard Intelligence Status ───────────────────────────────────────────

export const dashboardStatusHandler = http.get(`${BASE}/api/v1/dashboard/status`, async () => {
  await delay(150);
  return HttpResponse.json({
    success: true,
    data: {
      service: 'report-service',
      version: '0.1.0-SNAPSHOT',
      serverTime: new Date().toISOString(),
      aiServiceReachable: true,
      salesServiceReachable: true,
      inventoryServiceReachable: true,
      paymentServiceReachable: true,
    },
  });
});

// ── Executive Summary ───────────────────────────────────────────────────────

export const executiveSummaryHandler = http.get(`${BASE}/api/v1/dashboard/executive-summary`, async () => {
  await delay(300);
  return HttpResponse.json({
    success: true,
    data: {
      bullets: [
        { category: 'HEADLINE', text: `Revenue of TSh ${todaySeries.net.toLocaleString()} with an 18.5% profit margin. Your business is profitable today.`, linkTo: null },
        { category: 'CHANGE', text: `Revenue is up 12% compared to yesterday, across ${todaySeries.count} orders.`, linkTo: 'revenueChart' },
        { category: 'ATTENTION', text: '8 low-stock items need restocking. 25% customer churn risk. 2 flagged transactions require your attention.', linkTo: 'inventory' },
        { category: 'RECOMMENDATION', text: 'Review the 8 low-stock items and create purchase orders before they run out. Maize Flour and Sugar are critically low.', linkTo: null },
      ],
      kpiSnapshot: {
        revenue: todaySeries.net,
        netProfit: money(todaySeries.net * 0.185),
        orderCount: todaySeries.count,
        profitMargin: 18.5,
        lowStockLines: 8,
        totalCustomers: 420,
        churnRisk: 0.25,
        repeatRate: 62,
      },
      alertSummary: { fraudAlerts: 2, stockAlerts: 8, paymentAlerts: 1 },
      provider: 'template',
    },
  });
});

// ── Demand Forecast ─────────────────────────────────────────────────────────

export const demandForecastHandler = http.get(`${BASE}/api/v1/dashboard/demand-forecast`, async () => {
  await delay(200);
  return HttpResponse.json({
    success: true,
    data: {
      products: [
        { productId: 'p1', productName: 'Maize Flour (50kg)', projectedDemand: 45, confidence: 85, trend: 'UP', weeksOfData: 12 },
        { productId: 'p3', productName: 'Sugar (25kg)', projectedDemand: 38, confidence: 78, trend: 'UP', weeksOfData: 12 },
        { productId: 'p2', productName: 'Cooking Oil (5L)', projectedDemand: 32, confidence: 72, trend: 'STABLE', weeksOfData: 10 },
        { productId: 'p4', productName: 'Rice (25kg)', projectedDemand: 28, confidence: 65, trend: 'DOWN', weeksOfData: 12 },
        { productId: 'p8', productName: 'Milk Powder (500g)', projectedDemand: 25, confidence: 60, trend: 'UP', weeksOfData: 8 },
      ],
      dateFrom: today(),
      dateTo: daysAgo(-7),
    },
  });
});

// ── Reorder Recommendations ─────────────────────────────────────────────────

export const reorderRecommendationsHandler = http.get(`${BASE}/api/v1/dashboard/reorder-recommendations`, async () => {
  await delay(200);
  return HttpResponse.json({
    success: true,
    data: {
      recommendations: [
        { productId: 'p1', productName: 'Maize Flour (50kg)', currentStock: 2, minQty: 10, suggestedQty: 45, dailyVelocity: 5.2, urgency: 'HIGH', expectedShortageDate: daysAgo(-2) },
        { productId: 'p3', productName: 'Sugar (25kg)', currentStock: 4, minQty: 8, suggestedQty: 30, dailyVelocity: 3.8, urgency: 'HIGH', expectedShortageDate: today() },
        { productId: 'p9', productName: 'Wheat Flour (10kg)', currentStock: 5, minQty: 8, suggestedQty: 20, dailyVelocity: 2.1, urgency: 'MEDIUM', expectedShortageDate: daysAgo(-3) },
        { productId: 'p6', productName: 'Cement (50kg)', currentStock: 3, minQty: 5, suggestedQty: 15, dailyVelocity: 1.5, urgency: 'MEDIUM', expectedShortageDate: daysAgo(-4) },
        { productId: 'p12', productName: 'Soap (Carton)', currentStock: 8, minQty: 12, suggestedQty: 25, dailyVelocity: 1.2, urgency: 'LOW', expectedShortageDate: daysAgo(-7) },
      ],
    },
  });
});

// ── Profit Opportunities ────────────────────────────────────────────────────

export const profitOpportunitiesHandler = http.get(`${BASE}/api/v1/dashboard/profit-opportunities`, async () => {
  await delay(200);
  return HttpResponse.json({
    success: true,
    data: {
      items: [
        { productId: 'p2', productName: 'Cooking Oil (5L)', category: 'Groceries', currentMargin: 8.5, unitsSold30d: 120, estimatedMonthlyImpact: money(85000), reason: 'Margin 8.5% below category average of 18%' },
        { productId: 'p7', productName: 'Bar Soap (Box)', category: 'Household', currentMargin: 10.2, unitsSold30d: 85, estimatedMonthlyImpact: money(45000), reason: 'Margin 10.2% below category average of 22%' },
        { productId: 'p11', productName: 'Bottled Water (Case)', category: 'Beverages', currentMargin: 12.0, unitsSold30d: 200, estimatedMonthlyImpact: money(72000), reason: 'Margin 12% below category average of 25%' },
        { productId: 'p5', productName: 'Milk (1L)', category: 'Dairy', currentMargin: 13.5, unitsSold30d: 95, estimatedMonthlyImpact: money(38000), reason: 'Margin 13.5% below category average of 20%' },
      ],
      totalEstimatedMonthlyImpact: money(240000),
    },
  });
});

// ── Customer Retention ──────────────────────────────────────────────────────

export const customerRetentionHandler = http.get(`${BASE}/api/v1/dashboard/customer-retention`, async () => {
  await delay(200);
  return HttpResponse.json({
    success: true,
    data: {
      atRiskCustomers: [
        { customerId: 'c1', name: 'Jane Daudi', lastVisitDays: 45, lifetimeValue: money(2400000), segment: 'At Risk', visits: 28 },
        { customerId: 'c2', name: 'John Magesa', lastVisitDays: 38, lifetimeValue: money(1800000), segment: 'At Risk', visits: 22 },
        { customerId: 'c3', name: 'Ali Khamis', lastVisitDays: 32, lifetimeValue: money(1500000), segment: 'At Risk', visits: 18 },
        { customerId: 'c8', name: 'Peter Mushi', lastVisitDays: 95, lifetimeValue: money(950000), segment: 'Lost', visits: 12 },
        { customerId: 'c9', name: 'Anna Juma', lastVisitDays: 120, lifetimeValue: money(720000), segment: 'Lost', visits: 9 },
      ],
      totalAtRiskRevenue: money(7370000),
      totalCustomers: 420,
      churnRisk: 0.25,
    },
  });
});

// ── Cash Flow Forecast ──────────────────────────────────────────────────────

function cashFlowProjections() {
  const projections: {
    date: string; openingBalance: number; inflows: number;
    outflows: number; closingBalance: number; isDangerDay: boolean;
  }[] = [];
  let balance = 3500000; // opening
  for (let i = 0; i < 30; i++) {
    const inflows = rand(600000, 1400000);
    const outflows = i === 15 ? 2200000 : i === 22 ? 1800000 : rand(200000, 500000);
    const closing = balance + inflows - outflows;
    projections.push({
      date: new Date(Date.now() + i * 86400000).toISOString().slice(0, 10),
      openingBalance: balance,
      inflows,
      outflows,
      closingBalance: closing,
      isDangerDay: closing < 500000,
    });
    balance = closing;
  }
  return projections;
}

export const cashFlowForecastHandler = http.get(`${BASE}/api/v1/dashboard/cash-flow-forecast`, async () => {
  await delay(250);
  const projections = cashFlowProjections();
  return HttpResponse.json({
    success: true,
    data: {
      dailyProjections: projections,
      openingBalance: 3500000,
      lowestBalance: Math.min(...projections.map(p => p.closingBalance)),
      lowestBalanceDate: projections.find(p => p.closingBalance === Math.min(...projections.map(x => x.closingBalance)))?.date ?? today(),
      safetyThreshold: 500000,
    },
  });
});

// ── Anomaly Alerts ──────────────────────────────────────────────────────────

export const anomalyAlertsHandler = http.get(`${BASE}/api/v1/reports/anomalies`, async () => {
  await delay(150);
  return HttpResponse.json([
    { metric: 'Revenue', currentValue: money(todaySeries.net), averageValue: money(rand(900000, 1200000)), deviation: 1.3, severity: 'warning' },
    { metric: 'Expenses', currentValue: money(rand(200000, 300000)), averageValue: money(rand(120000, 180000)), deviation: 1.8, severity: 'warning' },
  ]);
});

// ── Top Performers ──────────────────────────────────────────────────────────

export const topProductsHandler = http.get(`${BASE}/api/v1/reports/top-products`, async () => {
  await delay(150);
  return HttpResponse.json([
    { id: 'p1', name: 'Maize Flour (50kg)', value: money(600000), percentage: 22 },
    { id: 'p2', name: 'Cooking Oil (5L)', value: money(480000), percentage: 18 },
    { id: 'p3', name: 'Sugar (25kg)', value: money(420000), percentage: 15 },
    { id: 'p4', name: 'Rice (25kg)', value: money(350000), percentage: 12 },
    { id: 'p6', name: 'Cement (50kg)', value: money(280000), percentage: 10 },
  ]);
});

export const topCustomersHandler = http.get(`${BASE}/api/v1/reports/top-customers`, async () => {
  await delay(150);
  return HttpResponse.json([
    { id: 'c1', name: 'Jane Daudi', value: money(850000), percentage: 18 },
    { id: 'c2', name: 'John Magesa', value: money(720000), percentage: 15 },
    { id: 'c5', name: 'Grace Shayo', value: money(650000), percentage: 13 },
    { id: 'c3', name: 'Ali Khamis', value: money(580000), percentage: 12 },
    { id: 'c4', name: 'Fatma Omar', value: money(450000), percentage: 9 },
  ]);
});

export const topSuppliersHandler = http.get(`${BASE}/api/v1/reports/top-suppliers`, async () => {
  await delay(150);
  return HttpResponse.json([
    { id: 's1', name: 'Tanzania Wholesale Ltd', value: money(1200000), percentage: 35 },
    { id: 's2', name: 'Dar Commodities Co', value: money(950000), percentage: 28 },
    { id: 's3', name: 'Mwenge Distributors', value: money(650000), percentage: 19 },
    { id: 's4', name: 'East Africa Supplies', value: money(420000), percentage: 12 },
    { id: 's5', name: 'Coast Traders Ltd', value: money(250000), percentage: 7 },
  ]);
});

// ── Aggregated export ───────────────────────────────────────────────────────

export const dashboardMockHandlers = [
  dashboardKpiHandler,
  paymentMethodMixHandler,
  listSalesHandler,
  expiringBatchesHandler,
  forecastHandler,
  arAgingHandler,
  listWarehousesHandler,
  dashboardStatusHandler,
  executiveSummaryHandler,
  demandForecastHandler,
  reorderRecommendationsHandler,
  profitOpportunitiesHandler,
  customerRetentionHandler,
  cashFlowForecastHandler,
  anomalyAlertsHandler,
  topProductsHandler,
  topCustomersHandler,
  topSuppliersHandler,
];
