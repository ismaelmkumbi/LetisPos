import type React from 'react';
import type { Period } from 'src/api/smartpos/reports';
import type { Trend, Delta } from './utils';

export type { Period, Trend, Delta };

export interface GreetingBarProps {
  period: Period;
  warehouseId: string;
  warehouses: import('src/api/smartpos/inventory').Warehouse[];
  dateRangeLabel: string;
  isDark: boolean;
  onPeriodChange: (p: Period) => void;
  onWarehouseChange: (id: string) => void;
  lastUpdated?: number | null;
  onRefresh?: () => void;
}

export interface MetricCardProps {
  label: string;
  value: string;
  change: string | null;
  icon: React.ReactNode;
  color: string;
  series: number[];
  delta?: Delta;
  onClick?: () => void;
}

export interface AlertStripProps {
  tone: 'success' | 'warning' | 'error' | 'fraud';
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  to: string;
}

export interface SmallStatProps {
  label: string;
  value: string;
  tone: 'success' | 'warning' | 'error' | 'info' | 'purple';
  icon?: React.ReactNode;
  delta?: Delta;
}

export interface PaymentRowProps {
  label: string;
  value: number;
  color: string;
  total: number;
}

export interface GoalProgressProps {
  currentRevenue: number;
  currentOrders: number;
  currentMargin: number;
  tenantId: string;
}
