/**
 * SmartPOS sidebar navigation.
 *
 * Distinct from the Modernize demo menu (MenuItems.ts). Titles are i18n
 * keys resolved via the `smartpos` namespace so the menu live-switches
 * language along with the rest of the UI.
 */
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
  // SmartPOS extension icons
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
} from '@tabler/icons-react';

export interface MenuItem {
  id?: string;
  title?: string;
  subheader?: string;
  icon?: any;
  href?: string;
  children?: MenuItem[];
  chip?: string;
  chipColor?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
}

/**
 * Build the SmartPOS menu with a bound `t` function so titles refresh
 * whenever the active locale changes. Call from SidebarItems on each
 * render.
 */
export function buildSmartPosMenu(t: TFunction): MenuItem[] {
  let n = 0;
  const uid = () => `smp-${++n}`;

  return [
    // Overview
    { subheader: t('smartpos:nav.overview') },
    { id: uid(), title: t('smartpos:nav.dashboard'), icon: IconDashboard, href: '/smartpos/dashboard' },

    // Sales
    { subheader: t('smartpos:nav.sales_group') },
    { id: uid(), title: t('smartpos:nav.pos_terminal'), icon: IconCashRegister, href: '/smartpos/pos',
      chip: 'LIVE', chipColor: 'secondary' },
    { id: uid(), title: t('smartpos:nav.sales'),              icon: IconReceipt,      href: '/smartpos/sales' },
    { id: uid(), title: t('smartpos:nav.quotations'),         icon: IconFileInvoice,  href: '/smartpos/quotations' },
    { id: uid(), title: t('smartpos:nav.returns'),            icon: IconArrowBackUp,  href: '/smartpos/returns' },
    { id: uid(), title: t('smartpos:nav.recurring_invoices'), icon: IconRepeat,       href: '/smartpos/recurring-invoices' },
    { id: uid(), title: t('smartpos:nav.pos_terminals'), icon: IconDeviceDesktop, href: '/smartpos/pos/terminals' },

    // Procurement
    { subheader: t('smartpos:nav.procurement') },
    { id: uid(), title: t('smartpos:nav.purchases'), icon: IconShoppingCart, href: '/smartpos/purchases' },
    { id: uid(), title: t('smartpos:nav.suppliers'), icon: IconTruck,        href: '/smartpos/suppliers' },

    // Catalog
    {
      id: uid(), title: t('smartpos:nav.products'), icon: IconPackage,
      children: [
        { id: uid(), title: 'All Products', icon: IconPackage, href: '/smartpos/products' },
        { id: uid(), title: t('smartpos:nav.categories'), icon: IconTag, href: '/smartpos/products/categories' },
        { id: uid(), title: t('smartpos:nav.brands'),     icon: IconBuildingStore, href: '/smartpos/products/brands' },
        { id: uid(), title: t('smartpos:nav.units'),      icon: IconRuler, href: '/smartpos/products/units' },
        { id: uid(), title: t('smartpos:nav.barcodes'),    icon: IconBarcode, href: '/smartpos/products/barcodes' },
        { id: uid(), title: t('smartpos:nav.serials'),     icon: IconBookmarks, href: '/smartpos/products/serials' },
        { id: uid(), title: 'Count Stock',                 icon: IconClipboardCheck, href: '/smartpos/products/count-stock' },
        { id: uid(), title: 'Opening Stock',               icon: IconUpload, href: '/smartpos/products/opening-stock' },
        { id: uid(), title: 'Import (Update Only)',        icon: IconFileImport, href: '/smartpos/products/import-update' },
        { id: uid(), title: 'Print Labels',                icon: IconPrinter, href: '/smartpos/products/print-labels' },
      ],
    },
    { id: uid(), title: t('smartpos:nav.customers'),  icon: IconUsers,              href: '/smartpos/customers' },
    { id: uid(), title: t('smartpos:nav.warehouses'), icon: IconBuildingWarehouse,  href: '/smartpos/warehouses' },
    { id: uid(), title: t('smartpos:nav.stock'),      icon: IconBox,                href: '/smartpos/stock' },

    // Money
    { subheader: t('smartpos:nav.money') },
    { id: uid(), title: t('smartpos:nav.payments'),  icon: IconCoin,                href: '/smartpos/payments' },
    { id: uid(), title: t('smartpos:nav.accounts'),  icon: IconWallet,              href: '/smartpos/accounts' },
    { id: uid(), title: t('smartpos:nav.transfers'), icon: IconArrowsTransferDown, href: '/smartpos/transfers' },
    { id: uid(), title: t('smartpos:nav.expenses'),  icon: IconReceipt2,            href: '/smartpos/expenses' },

    // Accounting
    { subheader: t('smartpos:nav.accounting') },
    { id: uid(), title: t('smartpos:nav.chart_of_accounts'),    icon: IconCalculator, href: '/smartpos/accounting/chart-of-accounts' },
    { id: uid(), title: t('smartpos:nav.journal_entries'),      icon: IconReceipt2,   href: '/smartpos/accounting/journal-entries' },
    { id: uid(), title: t('smartpos:nav.financial_statements'), icon: IconChartBar,   href: '/smartpos/accounting/financials' },

    // HRM
    { subheader: t('smartpos:nav.hrm') },
    { id: uid(), title: t('smartpos:nav.employees'),       icon: IconUsersGroup, href: '/smartpos/hrm/employees' },
    { id: uid(), title: t('smartpos:nav.attendance'),      icon: IconClock,      href: '/smartpos/hrm/attendance' },
    { id: uid(), title: t('smartpos:nav.leave_requests'),  icon: IconBeach,      href: '/smartpos/hrm/leave' },
    { id: uid(), title: t('smartpos:nav.payroll'),         icon: IconWallet,     href: '/smartpos/hrm/payroll' },

    // Reports
    { subheader: t('smartpos:nav.reports_group') },
    { id: uid(), title: t('smartpos:nav.reports'),           icon: IconChartBar,         href: '/smartpos/reports' },
    { id: uid(), title: t('smartpos:nav.advanced_reports'),  icon: IconChartInfographic, href: '/smartpos/reports/advanced' },
    { id: uid(), title: t('smartpos:nav.ai_insights'),       icon: IconSparkles,         href: '/smartpos/ai',
      chip: 'AI', chipColor: 'secondary' },
    { id: uid(), title: t('smartpos:nav.async_exports'),     icon: IconDownload,         href: '/smartpos/exports' },

    // Notifications
    { subheader: t('smartpos:nav.notifications_group') },
    { id: uid(), title: t('smartpos:nav.notification_templates'),  icon: IconBookmarks, href: '/smartpos/notifications/templates' },
    { id: uid(), title: t('smartpos:nav.notification_deliveries'), icon: IconBell,      href: '/smartpos/notifications/deliveries' },

    // Integrations
    { id: uid(), title: t('smartpos:nav.integrations'), icon: IconPlug, href: '/smartpos/integrations' },

    // Settings
    { subheader: t('smartpos:nav.settings') },
    { id: uid(), title: t('smartpos:nav.users_roles'),     icon: IconUserShield, href: '/smartpos/settings/users' },
    { id: uid(), title: t('smartpos:nav.tenants'),         icon: IconBuilding,   href: '/smartpos/settings/tenants' },
    { id: uid(), title: t('smartpos:nav.languages_admin'), icon: IconLanguage,   href: '/smartpos/settings/i18n' },
    { id: uid(), title: t('smartpos:nav.localization'),    icon: IconWorld,      href: '/smartpos/settings/locale' },
    { id: uid(), title: t('smartpos:nav.preferences'),     icon: IconSettings,   href: '/smartpos/settings' },
  ];
}

// Backwards-compat: default export retains the English menu for any caller
// that doesn't have a `t` binding yet (e.g. storybook, tests).
import i18n from 'src/i18n/smartpos';
const SmartPosMenuItems: MenuItem[] = buildSmartPosMenu(i18n.t.bind(i18n));
export default SmartPosMenuItems;
