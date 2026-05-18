/**
 * Centralized plan gate configuration — single source of truth for which
 * billing plan unlocks which features.
 *
 * Used by PlanGate (route-level), sidebar filterByPlan (UI-level), and
 * hasPlan() (programmatic). Kept in sync with the backend
 * FeatureGateFilter.java PLAN_GATES / REPORT_GATES maps.
 */

/** Plan hierarchy — higher ordinal = more features. Mirrors backend BillingPlan.java. */
export const PLAN_LEVEL: Record<string, number> = {
  FREE: 0, STARTER: 1, BUSINESS: 2, PROFESSIONAL: 3, ENTERPRISE: 4,
};

export interface FeatureGate {
  /** Feature area key (matches SmartPosMenuItems minPlan values) */
  key: string;
  /** Human-readable name for upgrade prompts */
  label: string;
  /** Minimum billing plan required */
  minPlan: string;
}

/**
 * Every gated feature area with its minimum plan.
 * Adding a gate here automatically applies it in PlanGate, sidebar
 * filtering, and hasPlan() checks.
 */
export const FEATURE_GATES: FeatureGate[] = [
  // ── STARTER features ─────────────────────────────────────────────────
  { key: 'quotations',       label: 'Quotations',              minPlan: 'STARTER' },
  { key: 'purchases',        label: 'Purchases',               minPlan: 'STARTER' },
  { key: 'supplierPayments', label: 'Supplier Payments',       minPlan: 'STARTER' },
  { key: 'documents',        label: 'Document Search',         minPlan: 'STARTER' },
  { key: 'accounting',       label: 'Accounting',              minPlan: 'STARTER' },
  { key: 'taxes',            label: 'Taxes',                   minPlan: 'STARTER' },
  { key: 'deposits',         label: 'Deposits',                minPlan: 'STARTER' },
  { key: 'cashManagement',   label: 'Cash Management',         minPlan: 'STARTER' },
  { key: 'branches',         label: 'Branches',                minPlan: 'STARTER' },
  { key: 'marketing',        label: 'Marketing',               minPlan: 'STARTER' },
  { key: 'promotions',       label: 'Promotions',              minPlan: 'STARTER' },
  { key: 'coupons',          label: 'Coupons',                 minPlan: 'STARTER' },
  { key: 'reports',          label: 'Advanced Reports',        minPlan: 'STARTER' },
  { key: 'exports',          label: 'Export Center',           minPlan: 'STARTER' },

  // ── PROFESSIONAL features ────────────────────────────────────────────
  { key: 'hrm',              label: 'HR & Payroll',            minPlan: 'PROFESSIONAL' },
  { key: 'crm',              label: 'CRM',                     minPlan: 'PROFESSIONAL' },
  { key: 'ecommerce',        label: 'E-Commerce',              minPlan: 'PROFESSIONAL' },
  { key: 'integrations',     label: 'Integrations',            minPlan: 'PROFESSIONAL' },
  { key: 'ai',               label: 'AI & Insights',           minPlan: 'PROFESSIONAL' },
  { key: 'auditLogs',        label: 'Audit Logs',              minPlan: 'PROFESSIONAL' },
  { key: 'apiKeys',          label: 'API Keys',                minPlan: 'PROFESSIONAL' },
  { key: 'sessions',         label: 'Session Management',      minPlan: 'PROFESSIONAL' },
  { key: 'dataRetention',    label: 'Data Retention',          minPlan: 'PROFESSIONAL' },

  // ── ENTERPRISE features ──────────────────────────────────────────────
  { key: 'customReports',    label: 'Custom Reports',          minPlan: 'ENTERPRISE' },
  { key: 'scheduledReports', label: 'Scheduled Reports',       minPlan: 'ENTERPRISE' },
];

/**
 * Check whether a given billing plan satisfies a minimum plan requirement.
 * SUPER_ADMIN bypass must be checked by the caller.
 */
export function planHasAccess(currentPlan: string, minPlan: string): boolean {
  return (PLAN_LEVEL[currentPlan] ?? 0) >= (PLAN_LEVEL[minPlan] ?? 0);
}

/**
 * Look up a feature gate by key.
 */
export function getFeatureGate(key: string): FeatureGate | undefined {
  return FEATURE_GATES.find((g) => g.key === key);
}
