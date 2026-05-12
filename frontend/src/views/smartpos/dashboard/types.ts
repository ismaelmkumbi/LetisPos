import type React from 'react';
import type { Period } from 'src/api/smartpos/reports';
import type { Trend } from './utils';

export type { Period, Trend };

export interface GreetingBarProps {
  period: Period;
  warehouseId: string;
  warehouses: import('src/api/smartpos/inventory').Warehouse[];
  dateRangeLabel: string;
  isDark: boolean;
  onPeriodChange: (p: Period) => void;
  onWarehouseChange: (id: string) => void;
}

export interface MetricCardProps {
  label: string;
  value: string;
  change: string | null;
  icon: React.ReactNode;
  color: string;
  series: number[];
}

export interface AlertStripProps {
  tone: 'success' | 'warning' | 'error';
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
}

export interface PaymentRowProps {
  label: string;
  value: number;
  color: string;
  total: number;
}
