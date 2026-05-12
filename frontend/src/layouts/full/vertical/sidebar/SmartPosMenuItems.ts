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
  IconSearch,
  IconCashBanknote,
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
  IconBook,
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
  IconDeviceMobile,
  IconBug,
  IconDatabase,
  IconReceiptTax,
  IconMail,
  IconMessage,
  IconBrandWhatsapp,
  IconWebhook,
  IconCategory,
  IconPalette,
  IconAd,
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
  minPlan?: string;  // minimum billing plan to show this item
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
    { id: uid(), title: t('smartpos:nav.quotations'), icon: IconFileInvoice, href: '/smartpos/quotations', minPlan: 'BUSINESS' },
    { id: uid(), title: t('smartpos:nav.returns'), icon: IconArrowBackUp, href: '/smartpos/returns' },
    { id: uid(), title: 'Suspended Sales', icon: IconClock, href: '/smartpos/sales/suspended' },
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
    { id: uid(), title: 'Bundles / Kits', icon: IconPackage, href: '/smartpos/products/bundles' },
    { id: uid(), title: 'Price Lists', icon: IconReceipt2, href: '/smartpos/products/price-lists' },
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
    { id: uid(), title: 'Reorder Rules', icon: IconAlertTriangle, href: '/smartpos/stock/reorder-rules' },
    { id: uid(), title: 'Expiry Tracking', icon: IconClock, href: '/smartpos/stock/expiry' },
    { id: uid(), title: 'Batch / Lot Tracking', icon: IconBookmarks, href: '/smartpos/stock/batches' },
    { id: uid(), title: 'Damage & Waste', icon: IconAlertTriangle, href: '/smartpos/stock/damage' },

    // ── Purchases ───────────────────────────────────────────────────────
    { subheader: 'Purchases', minPlan: 'BUSINESS' },
    { id: uid(), title: t('smartpos:nav.purchases'), icon: IconShoppingCart, href: '/smartpos/purchases', minPlan: 'BUSINESS' },
    { id: uid(), title: 'Goods Received', icon: IconPackage, href: '/smartpos/purchases/received', minPlan: 'BUSINESS' },
    { id: uid(), title: 'Supplier Returns', icon: IconArrowBackUp, href: '/smartpos/purchases/returns', minPlan: 'BUSINESS' },
    { id: uid(), title: 'Supplier Payments', icon: IconCoin, href: '/smartpos/supplier-payments', minPlan: 'BUSINESS' },

    // ── Documents ────────────────────────────────────────────────────────
    { subheader: 'Documents' },
    { id: uid(), title: 'Document Search', icon: IconSearch, href: '/smartpos/documents/search', minPlan: 'BUSINESS' },

    // ── Customers ───────────────────────────────────────────────────────
    { subheader: 'Customers' },
    { id: uid(), title: t('smartpos:nav.customers'), icon: IconUsers, href: '/smartpos/customers' },
    { id: uid(), title: 'Customer Groups', icon: IconUsersGroup, href: '/smartpos/customers/groups' },
    { id: uid(), title: 'Loyalty Program', icon: IconGift, href: '/smartpos/settings/loyalty' },
    { id: uid(), title: 'Gift Cards', icon: IconCreditCard, href: '/smartpos/customers/gift-cards' },
    { id: uid(), title: 'Store Credit', icon: IconWallet, href: '/smartpos/customers/store-credit' },

    // ── Suppliers ───────────────────────────────────────────────────────
    { subheader: 'Suppliers' },
    { id: uid(), title: t('smartpos:nav.suppliers'), icon: IconTruck, href: '/smartpos/suppliers' },
    { id: uid(), title: 'Supplier Groups', icon: IconUsersGroup, ...soon, minPlan: 'BUSINESS' },

    // ── Money ─────────────────────────────────────────────────────────
    { subheader: 'Money' },
    { id: uid(), title: t('smartpos:nav.accounts'), icon: IconWallet, href: '/smartpos/accounts' },
    { id: uid(), title: t('smartpos:nav.payments'), icon: IconCoin, href: '/smartpos/payments' },
    { id: uid(), title: t('smartpos:nav.expenses'), icon: IconReceipt2, href: '/smartpos/expenses' },
    { id: uid(), title: 'Deposits', icon: IconCashBanknote, href: '/smartpos/deposits' },
    { id: uid(), title: 'Cash Management', icon: IconCashRegister, href: '/smartpos/cash-management' },
    { id: uid(), title: t('smartpos:nav.transfers'), icon: IconArrowsTransferDown, href: '/smartpos/transfers' },
    {
      id: uid(), title: t('smartpos:nav.accounting'), icon: IconCalculator,
      minPlan: 'BUSINESS',
      children: [
        { id: uid(), title: t('smartpos:nav.chart_of_accounts'), icon: IconCalculator, href: '/smartpos/accounting/chart-of-accounts', minPlan: 'BUSINESS' },
        { id: uid(), title: t('smartpos:nav.journal_entries'), icon: IconReceipt2, href: '/smartpos/accounting/journal-entries', minPlan: 'BUSINESS' },
        { id: uid(), title: 'General Ledger', icon: IconBook, href: '/smartpos/accounting/ledger', minPlan: 'BUSINESS' },
        { id: uid(), title: 'Financial Statements', icon: IconChartInfographic, href: '/smartpos/accounting/financials', minPlan: 'BUSINESS' },
        { id: uid(), title: 'Taxes', icon: IconPercentage, href: '/smartpos/taxes', minPlan: 'BUSINESS' },
      ],
    },
    // ── Reports ─────────────────────────────────────────────────────────
    { subheader: 'Reports' },
    { id: uid(), title: 'Reports Hub', icon: IconChartBar, href: '/smartpos/reports' },
    { id: uid(), title: 'Sales Reports', icon: IconChartBar, href: '/smartpos/reports/sales', minPlan: 'BUSINESS' },
    { id: uid(), title: 'Purchase Reports', icon: IconShoppingCart, href: '/smartpos/reports/purchases', minPlan: 'BUSINESS' },
    { id: uid(), title: 'Inventory Reports', icon: IconPackage, href: '/smartpos/reports/inventory', minPlan: 'BUSINESS' },
    { id: uid(), title: 'Financial Reports', icon: IconChartInfographic, href: '/smartpos/reports/financial', minPlan: 'BUSINESS' },
    { id: uid(), title: 'Tax Reports', icon: IconPercentage, href: '/smartpos/reports/tax', minPlan: 'BUSINESS' },
    { id: uid(), title: 'Customer Reports', icon: IconUsers, href: '/smartpos/reports/customers', minPlan: 'BUSINESS' },
    { id: uid(), title: 'Supplier Reports', icon: IconTruck, href: '/smartpos/reports/suppliers', minPlan: 'BUSINESS' },
    { id: uid(), title: 'Employee Reports', icon: IconUsersGroup, href: '/smartpos/reports/employees', minPlan: 'BUSINESS' },
    { id: uid(), title: 'Operations Report', icon: IconClipboardCheck, href: '/smartpos/reports/operations', minPlan: 'BUSINESS' },
    { id: uid(), title: 'Export Center', icon: IconDownload, href: '/smartpos/reports/exports', minPlan: 'BUSINESS' },

    // ── People ──────────────────────────────────────────────────────────
    { subheader: 'People', minPlan: 'PROFESSIONAL' },
    { id: uid(), title: t('smartpos:nav.employees'), icon: IconUsersGroup, href: '/smartpos/hrm/employees', minPlan: 'PROFESSIONAL' },
    { id: uid(), title: t('smartpos:nav.attendance'), icon: IconClock, href: '/smartpos/hrm/attendance', minPlan: 'PROFESSIONAL' },
    { id: uid(), title: t('smartpos:nav.leave_requests'), icon: IconBeach, href: '/smartpos/hrm/leave', minPlan: 'PROFESSIONAL' },
    { id: uid(), title: t('smartpos:nav.payroll'), icon: IconWallet, href: '/smartpos/hrm/payroll', minPlan: 'PROFESSIONAL' },
    // ── Marketing ───────────────────────────────────────────────────────
    { subheader: 'Marketing', minPlan: 'BUSINESS' },
    { id: uid(), title: 'Promotions', icon: IconGift, href: '/smartpos/marketing/promotions', minPlan: 'BUSINESS' },
    { id: uid(), title: 'Coupons', icon: IconPercentage, href: '/smartpos/marketing/coupons', minPlan: 'BUSINESS' },
    { id: uid(), title: 'SMS Campaigns', icon: IconSend, href: '/smartpos/marketing/sms-campaigns', minPlan: 'BUSINESS' },
    { id: uid(), title: 'Email Campaigns', icon: IconMail, href: '/smartpos/marketing/email-campaigns', minPlan: 'BUSINESS' },
    { id: uid(), title: 'WhatsApp Campaigns', icon: IconBrandWhatsapp, href: '/smartpos/marketing/whatsapp-campaigns', minPlan: 'BUSINESS' },

    // ── CRM ─────────────────────────────────────────────────────────────
    { subheader: 'CRM', minPlan: 'PROFESSIONAL' },
    { id: uid(), title: 'Leads', icon: IconUsers, href: '/smartpos/crm/leads', minPlan: 'PROFESSIONAL' },
    { id: uid(), title: 'Opportunities', icon: IconChartBar, href: '/smartpos/crm/opportunities', minPlan: 'PROFESSIONAL' },
    { id: uid(), title: 'Follow-Ups', icon: IconBell, href: '/smartpos/crm/follow-ups', minPlan: 'PROFESSIONAL' },
    { id: uid(), title: 'Activities', icon: IconClipboardCheck, href: '/smartpos/crm/activities', minPlan: 'PROFESSIONAL' },

    // ── E-Commerce ──────────────────────────────────────────────────────
    { subheader: 'E-Commerce', minPlan: 'PROFESSIONAL' },
    { id: uid(), title: 'Dashboard', icon: IconDashboard, href: '/smartpos/admin/commerce', minPlan: 'PROFESSIONAL' },
    { id: uid(), title: 'Orders', icon: IconShoppingCart, href: '/smartpos/admin/commerce/orders', minPlan: 'PROFESSIONAL' },
    { id: uid(), title: 'Products', icon: IconPackage, href: '/smartpos/admin/commerce/products', minPlan: 'PROFESSIONAL' },
    { id: uid(), title: 'Categories', icon: IconCategory, href: '/smartpos/admin/commerce/categories', minPlan: 'PROFESSIONAL' },
    { id: uid(), title: 'Store Settings', icon: IconSettings, href: '/smartpos/admin/commerce/settings', minPlan: 'PROFESSIONAL' },
    { id: uid(), title: 'Theme', icon: IconPalette, href: '/smartpos/admin/commerce/theme', minPlan: 'PROFESSIONAL' },
    { id: uid(), title: 'Shipping', icon: IconTruck, href: '/smartpos/admin/commerce/shipping', minPlan: 'PROFESSIONAL' },
    { id: uid(), title: 'Banners', icon: IconAd, href: '/smartpos/admin/commerce/banners', minPlan: 'PROFESSIONAL' },
    { id: uid(), title: 'Online Orders', icon: IconShoppingCart, ...soon, minPlan: 'BUSINESS' },
    { id: uid(), title: 'Delivery Management', icon: IconTruck, ...soon, minPlan: 'BUSINESS' },
    { id: uid(), title: 'Website Settings', icon: IconWorld, ...soon, minPlan: 'BUSINESS' },
    { id: uid(), title: 'Marketplace Sync', icon: IconBuildingStore, ...soon, minPlan: 'PROFESSIONAL' },

    // ── Integrations ────────────────────────────────────────────────────
    { subheader: 'Integrations', minPlan: 'PROFESSIONAL' },
    { id: uid(), title: t('smartpos:nav.integrations'), icon: IconPlug, href: '/smartpos/integrations', minPlan: 'PROFESSIONAL' },
    { id: uid(), title: 'Payment Gateways', icon: IconCreditCard, href: '/smartpos/integrations/payment-gateways', minPlan: 'PROFESSIONAL' },
    { id: uid(), title: 'TRA EFD', icon: IconReceiptTax, href: '/smartpos/integrations/tra-efd', minPlan: 'PROFESSIONAL' },
    { id: uid(), title: 'Accounting', icon: IconCalculator, href: '/smartpos/integrations/accounting', minPlan: 'PROFESSIONAL' },
    { id: uid(), title: 'SMS Providers', icon: IconMessage, href: '/smartpos/integrations/sms', minPlan: 'PROFESSIONAL' },
    { id: uid(), title: 'WhatsApp API', icon: IconBrandWhatsapp, href: '/smartpos/integrations/whatsapp', minPlan: 'PROFESSIONAL' },
    { id: uid(), title: 'Webhooks', icon: IconWebhook, href: '/smartpos/integrations/webhooks', minPlan: 'PROFESSIONAL' },
    { id: uid(), title: 'SEO', icon: IconSearch, href: '/smartpos/admin/commerce/seo', minPlan: 'PROFESSIONAL' },
    { id: uid(), title: 'Domains', icon: IconWorld, href: '/smartpos/admin/commerce/domains', minPlan: 'PROFESSIONAL' },

    // ── AI Assistant ────────────────────────────────────────────────────
    { subheader: 'AI Assistant', minPlan: 'PROFESSIONAL' },
    { id: uid(), title: t('smartpos:nav.ai_insights'), icon: IconSparkles, href: '/smartpos/ai', minPlan: 'PROFESSIONAL' },
    { id: uid(), title: 'Demand Forecasting', icon: IconBrain, href: '/smartpos/ai/forecasting', minPlan: 'PROFESSIONAL' },
    { id: uid(), title: 'Reorder Suggestions', icon: IconAlertTriangle, href: '/smartpos/ai/reorder-suggestions', minPlan: 'PROFESSIONAL' },
    { id: uid(), title: 'Customer Analytics', icon: IconUsers, href: '/smartpos/ai/customer-analytics', minPlan: 'PROFESSIONAL' },
    { id: uid(), title: 'Fraud Detection', icon: IconAlertTriangle, href: '/smartpos/ai/fraud-detection', minPlan: 'PROFESSIONAL' },
    { id: uid(), title: 'Smart Recommendations', icon: IconBrain, ...soon, minPlan: 'PROFESSIONAL' },

    // ── Administration ──────────────────────────────────────────────────
    { subheader: 'Administration' },
    { id: uid(), title: t('smartpos:nav.preferences'), icon: IconSettings, href: '/smartpos/settings' },
    { id: uid(), title: t('smartpos:nav.users_roles'), icon: IconUserShield, href: '/smartpos/settings/users' },
    { id: uid(), title: 'Branches', icon: IconBuilding, href: '/smartpos/admin/branches' },
    { id: uid(), title: t('smartpos:nav.pos_terminals'), icon: IconDeviceDesktop, href: '/smartpos/pos/terminals' },
    { id: uid(), title: t('smartpos:nav.receipt_settings'), icon: IconReceipt, href: '/smartpos/settings/receipt' },
    { id: uid(), title: 'Printer Settings', icon: IconPrinter, href: '/smartpos/settings/printers' },
    { id: uid(), title: 'Tax & Pricing', icon: IconPercentage, href: '/smartpos/settings/tax-pricing' },
    { id: uid(), title: t('smartpos:nav.languages_admin'), icon: IconLanguage, href: '/smartpos/settings/i18n' },
    { id: uid(), title: t('smartpos:nav.localization'), icon: IconWorld, href: '/smartpos/settings/locale' },
    { id: uid(), title: 'Audit Logs', icon: IconHistory, href: '/smartpos/admin/audit-logs', minPlan: 'PROFESSIONAL' },
    { id: uid(), title: 'Data Retention', icon: IconDatabase, href: '/smartpos/admin/data-retention', minPlan: 'PROFESSIONAL' },
    { id: uid(), title: 'Sessions', icon: IconDeviceMobile, href: '/smartpos/admin/sessions', minPlan: 'PROFESSIONAL' },
    { id: uid(), title: 'API Keys', icon: IconKey, href: '/smartpos/admin/api-keys', minPlan: 'PROFESSIONAL' },
    { id: uid(), title: 'Error Logs', icon: IconBug, href: '/smartpos/admin/error-logs' },
    { id: uid(), title: 'Backups', icon: IconDownload, href: '/smartpos/admin/backups' },
    { id: uid(), title: 'Subscription & Billing', icon: IconCreditCard, href: '/smartpos/admin/billing' },
    { id: uid(), title: t('smartpos:nav.tenants'), icon: IconBuilding, href: '/smartpos/settings/tenants' },
    { id: uid(), title: 'Notifications', icon: IconBellRinging, href: '/smartpos/settings/notifications' },

    // ── Support ─────────────────────────────────────────────────────────
    { subheader: 'Support' },
    { id: uid(), title: 'Help Center', icon: IconHelp, href: '/smartpos/support/help' },
    { id: uid(), title: 'Tutorials', icon: IconHelp, href: '/smartpos/support/tutorials' },
    { id: uid(), title: 'System Status', icon: IconChartBar, href: '/smartpos/support/system-status' },
    { id: uid(), title: 'Contact Support', icon: IconBell, href: '/smartpos/support/contact' },
  ];
}

// Backwards-compat: default export retains the English menu for any caller
// that doesn't have a `t` binding yet (e.g. storybook, tests).
import i18n from 'src/i18n/smartpos';
const SmartPosMenuItems: MenuItem[] = buildSmartPosMenu(i18n.t.bind(i18n));
export default SmartPosMenuItems;
