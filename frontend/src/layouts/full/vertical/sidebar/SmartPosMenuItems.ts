/**
 * SmartPOS sidebar navigation.
 *
 * Menu is organised by user workflow with full structure.
 * Unimplemented routes show a "soon" chip badge.
 *
 * Titles are i18n keys resolved via the `smartpos` namespace so the menu
 * live-switches language along with the rest of the UI.
 */
import type { ElementType } from 'react';
import type { TFunction } from 'i18next';
import {
  IconDashboard,
  IconCashRegister,
  IconReceipt,
  IconFileInvoice,
  IconArrowBackUp,
  IconShoppingCart,
  IconPackage,
  IconUsers,
  IconTruck,
  IconBuildingWarehouse,
  IconBox,
  IconCoin,
  IconWallet,
  IconArrowsTransferDown,
  IconReceipt2,
  IconChartBar,
  IconDownload,
  IconSettings,
  IconUserShield,
  IconBuilding,
  IconWorld,
  IconBarcode,
  IconRepeat,
  IconChartInfographic,
  IconSparkles,
  IconBell,
  IconBookmarks,
  IconCalculator,
  IconClipboardCheck,
  IconUsersGroup,
  IconClock,
  IconBeach,
  IconDeviceDesktop,
  IconFileImport,
  IconPlug,
  IconPrinter,
  IconLanguage,
  IconTag,
  IconBuildingStore,
  IconRuler,
  IconUpload,
  IconPercentage,
  IconGift,
  IconBellRinging,
  IconAdjustmentsAlt,
  IconCreditCard,
  IconSend,
  IconAlertTriangle,
  IconHistory,
  IconHelp,
  IconKey,
  IconBrain,
} from '@tabler/icons-react';

export interface MenuItem {
  id?: string;
  title?: string;
  subheader?: string;
  icon?: ElementType;
  href?: string;
  children?: MenuItem[];
  chip?: string;
  chipColor?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
}

const soon = { chip: 'soon', chipColor: 'warning' as const };

/**
 * Build the SmartPOS menu with a bound `t` function so titles refresh
 * whenever the active locale changes. Call from SidebarItems on each
 * render.
 */
export function buildSmartPosMenu(t: TFunction): MenuItem[] {
  let n = 0;
  const uid = () => `smp-${++n}`;

  return [
    // ── Dashboard ───────────────────────────────────────────────────────
    { id: uid(), title: t('smartpos:nav.dashboard'), icon: IconDashboard, href: '/smartpos/dashboard' },

    // ── Operate ─────────────────────────────────────────────────────────
    { subheader: 'Operate' },
    {
      id: uid(), title: t('smartpos:nav.pos_terminal'), icon: IconCashRegister, href: '/smartpos/sales/pos',
      chip: 'LIVE', chipColor: 'secondary',
    },
    { id: uid(), title: t('smartpos:nav.sales'), icon: IconReceipt, href: '/smartpos/sales' },
    { id: uid(), title: t('smartpos:nav.quotations'), icon: IconFileInvoice, href: '/smartpos/quotations' },
    { id: uid(), title: t('smartpos:nav.returns'), icon: IconArrowBackUp, href: '/smartpos/returns' },
    { id: uid(), title: 'Suspended Sales', icon: IconClock, ...soon },
    { id: uid(), title: t('smartpos:nav.recurring_invoices'), icon: IconRepeat, href: '/smartpos/recurring-invoices' },

    // ── Products ────────────────────────────────────────────────────────
    { subheader: 'Products' },
    { id: uid(), title: 'Products', icon: IconPackage, href: '/smartpos/products' },
    { id: uid(), title: t('smartpos:nav.categories'), icon: IconTag, href: '/smartpos/products/categories' },
    { id: uid(), title: t('smartpos:nav.brands'), icon: IconBuildingStore, href: '/smartpos/products/brands' },
    { id: uid(), title: t('smartpos:nav.units'), icon: IconRuler, href: '/smartpos/products/units' },
    { id: uid(), title: 'Variants', icon: IconBox, href: '/smartpos/products?variant=true' },
    { id: uid(), title: t('smartpos:nav.barcodes'), icon: IconBarcode, href: '/smartpos/products/barcodes' },
    { id: uid(), title: t('smartpos:nav.serials'), icon: IconBookmarks, href: '/smartpos/products/serials' },
    { id: uid(), title: 'Bundles / Kits', icon: IconPackage, ...soon },
    { id: uid(), title: 'Price Lists', icon: IconReceipt2, ...soon },
    { id: uid(), title: 'Product Labels', icon: IconPrinter, href: '/smartpos/products/print-labels' },
    { id: uid(), title: 'Opening Stock', icon: IconUpload, href: '/smartpos/products/opening-stock' },
    { id: uid(), title: 'Import Products', icon: IconFileImport, href: '/smartpos/products/import-update' },

    // ── Inventory ───────────────────────────────────────────────────────
    { subheader: 'Inventory' },
    { id: uid(), title: t('smartpos:nav.warehouses'), icon: IconBuildingWarehouse, href: '/smartpos/warehouses' },
    { id: uid(), title: 'Stock Levels', icon: IconBox, href: '/smartpos/stock' },
    { id: uid(), title: 'Stock Adjustments', icon: IconAdjustmentsAlt, href: '/smartpos/stock/adjustments' },
    { id: uid(), title: 'Stock Transfers', icon: IconArrowsTransferDown, href: '/smartpos/stock/transfers' },
    { id: uid(), title: 'Stock Counts', icon: IconClipboardCheck, href: '/smartpos/stock/counts' },
    { id: uid(), title: 'Reorder Rules', icon: IconAlertTriangle, ...soon },
    { id: uid(), title: 'Expiry Tracking', icon: IconClock, ...soon },
    { id: uid(), title: 'Batch / Lot Tracking', icon: IconBookmarks, ...soon },
    { id: uid(), title: 'Damage & Waste', icon: IconAlertTriangle, ...soon },

    // ── Purchases ───────────────────────────────────────────────────────
    { subheader: 'Purchases' },
    { id: uid(), title: t('smartpos:nav.purchases'), icon: IconShoppingCart, href: '/smartpos/purchases' },
    { id: uid(), title: 'Goods Received', icon: IconPackage, ...soon },
    { id: uid(), title: 'Supplier Returns', icon: IconArrowBackUp, ...soon },
    { id: uid(), title: 'Supplier Payments', icon: IconCoin, ...soon },

    // ── Customers ───────────────────────────────────────────────────────
    { subheader: 'Customers' },
    { id: uid(), title: t('smartpos:nav.customers'), icon: IconUsers, href: '/smartpos/customers' },
    { id: uid(), title: 'Customer Groups', icon: IconUsersGroup, ...soon },
    { id: uid(), title: 'Loyalty Program', icon: IconGift, href: '/smartpos/settings/loyalty' },
    { id: uid(), title: 'Gift Cards', icon: IconCreditCard, ...soon },
    { id: uid(), title: 'Store Credit', icon: IconWallet, ...soon },

    // ── Suppliers ───────────────────────────────────────────────────────
    { subheader: 'Suppliers' },
    { id: uid(), title: t('smartpos:nav.suppliers'), icon: IconTruck, href: '/smartpos/suppliers' },
    { id: uid(), title: 'Supplier Groups', icon: IconUsersGroup, ...soon },

    // ── Finance ─────────────────────────────────────────────────────────
    { subheader: 'Finance' },
    { id: uid(), title: t('smartpos:nav.accounts'), icon: IconWallet, href: '/smartpos/accounts' },
    { id: uid(), title: t('smartpos:nav.payments'), icon: IconCoin, href: '/smartpos/payments' },
    { id: uid(), title: t('smartpos:nav.expenses'), icon: IconReceipt2, href: '/smartpos/expenses' },
    { id: uid(), title: 'Cash Management', icon: IconCashRegister, ...soon },
    { id: uid(), title: t('smartpos:nav.transfers'), icon: IconArrowsTransferDown, href: '/smartpos/transfers' },
    {
      id: uid(), title: t('smartpos:nav.accounting'), icon: IconCalculator,
      children: [
        { id: uid(), title: t('smartpos:nav.chart_of_accounts'), icon: IconCalculator, href: '/smartpos/accounting/chart-of-accounts' },
        { id: uid(), title: t('smartpos:nav.journal_entries'), icon: IconReceipt2, href: '/smartpos/accounting/journal-entries' },
        { id: uid(), title: 'General Ledger', icon: IconBookmarks, ...soon },
        { id: uid(), title: 'Trial Balance', icon: IconCalculator, ...soon },
        { id: uid(), title: 'Balance Sheet', icon: IconChartBar, ...soon },
        { id: uid(), title: 'Profit & Loss', icon: IconChartInfographic, ...soon },
      ],
    },
    { id: uid(), title: 'Taxes', icon: IconPercentage, ...soon },

    // ── Reports ─────────────────────────────────────────────────────────
    { subheader: 'Reports' },
    { id: uid(), title: 'Reports Hub', icon: IconChartBar, href: '/smartpos/reports' },
    { id: uid(), title: 'Sales Reports', icon: IconChartBar, href: '/smartpos/reports/sales' },
    { id: uid(), title: 'Purchase Reports', icon: IconShoppingCart, href: '/smartpos/reports/purchases' },
    { id: uid(), title: 'Inventory Reports', icon: IconPackage, href: '/smartpos/reports/inventory' },
    { id: uid(), title: 'Financial Reports', icon: IconChartInfographic, ...soon },
    { id: uid(), title: 'Tax Reports', icon: IconPercentage, href: '/smartpos/reports/tax' },
    { id: uid(), title: 'Customer Reports', icon: IconUsers, href: '/smartpos/reports/customers' },
    { id: uid(), title: 'Supplier Reports', icon: IconTruck, ...soon },
    { id: uid(), title: 'Employee Reports', icon: IconUsersGroup, ...soon },
    { id: uid(), title: 'Export Center', icon: IconDownload, href: '/smartpos/reports/exports' },

    // ── People ──────────────────────────────────────────────────────────
    { subheader: 'People' },
    { id: uid(), title: t('smartpos:nav.employees'), icon: IconUsersGroup, href: '/smartpos/hrm/employees' },
    { id: uid(), title: t('smartpos:nav.attendance'), icon: IconClock, href: '/smartpos/hrm/attendance' },
    { id: uid(), title: t('smartpos:nav.leave_requests'), icon: IconBeach, href: '/smartpos/hrm/leave' },
    { id: uid(), title: t('smartpos:nav.payroll'), icon: IconWallet, href: '/smartpos/hrm/payroll' },
    { id: uid(), title: t('smartpos:nav.users_roles'), icon: IconUserShield, href: '/smartpos/settings/users' },

    // ── Marketing ───────────────────────────────────────────────────────
    { subheader: 'Marketing' },
    { id: uid(), title: 'Promotions', icon: IconGift, ...soon },
    { id: uid(), title: 'Coupons', icon: IconPercentage, ...soon },
    { id: uid(), title: 'SMS Campaigns', icon: IconSend, ...soon },
    { id: uid(), title: 'Email Campaigns', icon: IconSend, ...soon },
    { id: uid(), title: 'WhatsApp Campaigns', icon: IconSend, ...soon },

    // ── CRM ─────────────────────────────────────────────────────────────
    { subheader: 'CRM' },
    { id: uid(), title: 'Leads', icon: IconUsers, ...soon },
    { id: uid(), title: 'Opportunities', icon: IconChartBar, ...soon },
    { id: uid(), title: 'Follow-Ups', icon: IconBell, ...soon },
    { id: uid(), title: 'Activities', icon: IconClipboardCheck, ...soon },

    // ── E-Commerce ──────────────────────────────────────────────────────
    { subheader: 'E-Commerce' },
    { id: uid(), title: 'Online Orders', icon: IconShoppingCart, ...soon },
    { id: uid(), title: 'Delivery Management', icon: IconTruck, ...soon },
    { id: uid(), title: 'Website Settings', icon: IconWorld, ...soon },
    { id: uid(), title: 'Marketplace Sync', icon: IconBuildingStore, ...soon },

    // ── Integrations ────────────────────────────────────────────────────
    { subheader: 'Integrations' },
    { id: uid(), title: 'Payment Gateways', icon: IconCreditCard, ...soon },
    { id: uid(), title: 'TRA EFD', icon: IconFileInvoice, ...soon },
    { id: uid(), title: 'Accounting Integrations', icon: IconCalculator, ...soon },
    { id: uid(), title: 'SMS Providers', icon: IconSend, ...soon },
    { id: uid(), title: 'WhatsApp API', icon: IconSend, ...soon },
    { id: uid(), title: 'Delivery Services', icon: IconTruck, ...soon },
    { id: uid(), title: 'Webhooks', icon: IconPlug, ...soon },
    { id: uid(), title: 'API Keys', icon: IconKey, ...soon },
    { id: uid(), title: t('smartpos:nav.integrations'), icon: IconPlug, href: '/smartpos/integrations' },

    // ── AI Assistant ────────────────────────────────────────────────────
    { subheader: 'AI Assistant' },
    { id: uid(), title: t('smartpos:nav.ai_insights'), icon: IconSparkles, href: '/smartpos/ai' },
    { id: uid(), title: 'Demand Forecasting', icon: IconBrain, ...soon },
    { id: uid(), title: 'Reorder Suggestions', icon: IconAlertTriangle, ...soon },
    { id: uid(), title: 'Customer Analytics', icon: IconUsers, ...soon },
    { id: uid(), title: 'Fraud Detection', icon: IconAlertTriangle, ...soon },
    { id: uid(), title: 'Smart Recommendations', icon: IconBrain, ...soon },

    // ── Administration ──────────────────────────────────────────────────
    { subheader: 'Administration' },
    { id: uid(), title: t('smartpos:nav.preferences'), icon: IconSettings, href: '/smartpos/settings' },
    { id: uid(), title: 'Branches', icon: IconBuilding, ...soon },
    { id: uid(), title: t('smartpos:nav.pos_terminals'), icon: IconDeviceDesktop, href: '/smartpos/pos/terminals' },
    { id: uid(), title: t('smartpos:nav.receipt_settings'), icon: IconReceipt, href: '/smartpos/settings/receipt' },
    { id: uid(), title: 'Tax & Pricing', icon: IconPercentage, href: '/smartpos/settings/tax-pricing' },
    { id: uid(), title: t('smartpos:nav.languages_admin'), icon: IconLanguage, href: '/smartpos/settings/i18n' },
    { id: uid(), title: t('smartpos:nav.localization'), icon: IconWorld, href: '/smartpos/settings/locale' },
    { id: uid(), title: 'Audit Logs', icon: IconHistory, ...soon },
    { id: uid(), title: 'Backups', icon: IconDownload, ...soon },
    { id: uid(), title: 'Subscription & Billing', icon: IconCreditCard, ...soon },
    { id: uid(), title: t('smartpos:nav.tenants'), icon: IconBuilding, href: '/smartpos/settings/tenants' },
    { id: uid(), title: 'Notifications', icon: IconBellRinging, href: '/smartpos/settings/notifications' },

    // ── Support ─────────────────────────────────────────────────────────
    { subheader: 'Support' },
    { id: uid(), title: 'Help Center', icon: IconHelp, ...soon },
    { id: uid(), title: 'Tutorials', icon: IconHelp, ...soon },
    { id: uid(), title: 'System Status', icon: IconChartBar, ...soon },
    { id: uid(), title: 'Contact Support', icon: IconBell, ...soon },
  ];
}

// Backwards-compat: default export retains the English menu for any caller
// that doesn't have a `t` binding yet (e.g. storybook, tests).
import i18n from 'src/i18n/smartpos';
const SmartPosMenuItems: MenuItem[] = buildSmartPosMenu(i18n.t.bind(i18n));
export default SmartPosMenuItems;
