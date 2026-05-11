// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import Loadable from '../layouts/full/shared/loadable/Loadable';
import { RequireAuth } from 'src/routes/smartpos/RequireAuth';

import { PosLayoutProvider } from 'src/context/smartpos/PosLayoutContext';
/* ***Layouts**** */
const FullLayout = Loadable(lazy(() => import('../layouts/full/FullLayout')));
const BlankLayout = Loadable(lazy(() => import('../layouts/blank/BlankLayout')));

/* ****SmartPOS pages***** */
const SmartPosDashboard = Loadable(lazy(() => import('../views/smartpos/dashboard/DashboardPage')));
const SmartPosLogin = Loadable(lazy(() => import('../views/smartpos/auth/LoginPage')));
const SmartPosPosTerminal = Loadable(lazy(() => import('../views/smartpos/pos/PosTerminalPage')));
const SmartPosPosLaunch = Loadable(
  lazy(() => import('../views/smartpos/pos/PosTerminalLaunchPage')),
);
const SmartPosProducts = Loadable(
  lazy(() => import('../views/smartpos/products/ProductsListPage')),
);
const SmartPosProductDetail = Loadable(
  lazy(() => import('../views/smartpos/products/ProductDetailPage')),
);
const SmartPosSerials = Loadable(lazy(() => import('../views/smartpos/products/SerialsListPage')));
const SmartPosCategories = Loadable(
  lazy(() => import('../views/smartpos/products/CategoriesListPage')),
);
const SmartPosBrands = Loadable(lazy(() => import('../views/smartpos/products/BrandsListPage')));
const SmartPosUnits = Loadable(lazy(() => import('../views/smartpos/products/UnitsListPage')));
const SmartPosBarcodes = Loadable(
  lazy(() => import('../views/smartpos/products/BarcodesListPage')),
);
const SmartPosCountStock = Loadable(
  lazy(() => import('../views/smartpos/products/CountStockPage')),
);
const SmartPosOpeningStock = Loadable(
  lazy(() => import('../views/smartpos/products/OpeningStockImportPage')),
);
const SmartPosImportUpdate = Loadable(
  lazy(() => import('../views/smartpos/products/ImportUpdateOnlyPage')),
);
const SmartPosPrintLabels = Loadable(
  lazy(() => import('../views/smartpos/products/PrintLabelsPage')),
);
const SmartPosBundles = Loadable(
  lazy(() => import('../views/smartpos/products/BundlesListPage')),
);
const SmartPosPriceLists = Loadable(
  lazy(() => import('../views/smartpos/products/PriceListsPage')),
);
const SmartPosPriceListDetail = Loadable(
  lazy(() => import('../views/smartpos/products/PriceListDetailPage')),
);
const SmartPosProductsLayout = Loadable(
  lazy(() => import('../views/smartpos/products/ProductsLayout')),
);
const SmartPosNotifTemplates = Loadable(
  lazy(() => import('../views/smartpos/notifications/TemplatesListPage')),
);
const SmartPosNotifDeliveries = Loadable(
  lazy(() => import('../views/smartpos/notifications/DeliveriesPage')),
);
const SmartPosCoa = Loadable(
  lazy(() => import('../views/smartpos/accounting/ChartOfAccountsPage')),
);
const SmartPosJournals = Loadable(
  lazy(() => import('../views/smartpos/accounting/JournalEntriesPage')),
);
const SmartPosFinancials = Loadable(
  lazy(() => import('../views/smartpos/accounting/FinancialStatementsPage')),
);
const SmartPosAccountLedger = Loadable(
  lazy(() => import('../views/smartpos/accounting/AccountLedgerPage')),
);
const SmartPosEmployees = Loadable(lazy(() => import('../views/smartpos/hrm/EmployeesListPage')));
const SmartPosAttendance = Loadable(lazy(() => import('../views/smartpos/hrm/AttendancePage')));
const SmartPosLeave = Loadable(lazy(() => import('../views/smartpos/hrm/LeaveRequestsPage')));
const SmartPosPayroll = Loadable(lazy(() => import('../views/smartpos/hrm/PayrollPage')));
const SmartPosRecurring = Loadable(
  lazy(() => import('../views/smartpos/recurring/RecurringInvoicesPage')),
);
const SmartPosAdvReports = Loadable(
  lazy(() => import('../views/smartpos/reports/AdvancedReportsPage')),
);
const SmartPosAi = Loadable(lazy(() => import('../views/smartpos/ai/AiInsightsPage')));
const SmartPosTerminals = Loadable(lazy(() => import('../views/smartpos/pos/TerminalsListPage')));
const SmartPosCustomerDisplay = Loadable(
  lazy(() => import('../views/smartpos/pos/CustomerDisplayPage')),
);
const CameraPage = Loadable(lazy(() => import('../views/smartpos/products/CameraPage')));
const SmartPosIntegrations = Loadable(
  lazy(() => import('../views/smartpos/integrations/IntegrationsPage')),
);
const SmartPosI18nAdmin = Loadable(lazy(() => import('../views/smartpos/settings/I18nAdminPage')));
const SmartPosReceiptSettings = Loadable(
  lazy(() => import('../views/smartpos/settings/ReceiptSettingsPage')),
);
const SmartPosTaxPricing = Loadable(
  lazy(() => import('../views/smartpos/settings/TaxPricingPage')),
);
const SmartPosPosBehaviour = Loadable(
  lazy(() => import('../views/smartpos/settings/PosSettingsPage')),
);
const SmartPosLoyalty = Loadable(
  lazy(() => import('../views/smartpos/settings/LoyaltySettingsPage')),
);
const SmartPosNotifications = Loadable(
  lazy(() => import('../views/smartpos/settings/NotificationsSettingsPage')),
);
const SmartPosTemplateEditor = Loadable(
  lazy(() => import('../views/smartpos/settings/TemplateEditorPage')),
);
const SmartPosPrinterSettings = Loadable(
  lazy(() => import('../views/smartpos/settings/PrinterSettingsPage')),
);
const SmartPosCustomers = Loadable(
  lazy(() => import('../views/smartpos/customers/CustomersListPage')),
);
const SmartPosSuppliers = Loadable(
  lazy(() => import('../views/smartpos/suppliers/SuppliersListPage')),
);
const SmartPosSupplierDetail = Loadable(
  lazy(() => import('../views/smartpos/suppliers/SupplierDetailPage')),
);
const SmartPosWarehouses = Loadable(
  lazy(() => import('../views/smartpos/warehouses/WarehousesListPage')),
);
const SmartPosWarehouseDetail = Loadable(
  lazy(() => import('../views/smartpos/warehouses/WarehouseDetailPage')),
);
const SmartPosStockLevels = Loadable(lazy(() => import('../views/smartpos/stock/StockLevelsPage')));
const SmartPosStockAdjustments = Loadable(
  lazy(() => import('../views/smartpos/stock/StockAdjustmentPage')),
);
const SmartPosStockTransfers = Loadable(
  lazy(() => import('../views/smartpos/stock/StockTransferPage')),
);
const SmartPosStockCounts = Loadable(lazy(() => import('../views/smartpos/stock/StockCountPage')));
const SmartPosStockCountDetail = Loadable(
  lazy(() => import('../views/smartpos/stock/StockCountDetailPage')),
);
const SmartPosReorderRules = Loadable(
  lazy(() => import('../views/smartpos/stock/ReorderRulesPage')),
);
const SmartPosSales = Loadable(lazy(() => import('../views/smartpos/sales/SalesListPage')));
const SmartPosSaleBuilder = Loadable(lazy(() => import('../views/smartpos/sales/SaleBuilderPage')));
const SmartPosQuotations = Loadable(
  lazy(() => import('../views/smartpos/quotations/QuotationsListPage')),
);
const SmartPosPurchases = Loadable(
  lazy(() => import('../views/smartpos/purchases/PurchasesListPage')),
);
const SmartPosPurchaseBuilder = Loadable(
  lazy(() => import('../views/smartpos/purchases/PurchaseBuilderPage')),
);
const SmartPosReturns = Loadable(lazy(() => import('../views/smartpos/returns/ReturnsPage')));
const SmartPosAccounts = Loadable(lazy(() => import('../views/smartpos/money/AccountsListPage')));
const SmartPosPayments = Loadable(lazy(() => import('../views/smartpos/money/PaymentsListPage')));
const SmartPosExpenses = Loadable(lazy(() => import('../views/smartpos/money/ExpensesListPage')));
const SmartPosDeposits = Loadable(lazy(() => import('../views/smartpos/money/DepositsListPage')));
const SmartPosTransfers = Loadable(lazy(() => import('../views/smartpos/money/TransfersListPage')));
const SmartPosReports = Loadable(lazy(() => import('../views/smartpos/reports/ReportsPage')));
const SmartPosReportsHub = Loadable(lazy(() => import('../views/smartpos/reports/ReportsHubPage')));
const SmartPosSalesReport = Loadable(lazy(() => import('../views/smartpos/reports/SalesReportPage')));
const SmartPosProfitLoss = Loadable(lazy(() => import('../views/smartpos/reports/ProfitLossPage')));
const SmartPosInventoryReport = Loadable(lazy(() => import('../views/smartpos/reports/InventoryReportPage')));
const SmartPosTaxReport = Loadable(lazy(() => import('../views/smartpos/reports/TaxReportPage')));
const SmartPosPurchaseReport = Loadable(lazy(() => import('../views/smartpos/reports/PurchaseReportPage')));
const SmartPosPaymentReport = Loadable(lazy(() => import('../views/smartpos/reports/PaymentReportPage')));
const SmartPosCustomerReport = Loadable(lazy(() => import('../views/smartpos/reports/CustomerReportPage')));
const SmartPosSettings = Loadable(
  lazy(() => import('../views/smartpos/settings/SettingsPlaceholder')),
);
const SmartPosUsersRoles = Loadable(
  lazy(() =>
    import('../views/smartpos/settings/SettingsPlaceholder').then((m) => ({
      default: m.UsersRolesSettings,
    })),
  ),
);
const SmartPosTenants = Loadable(
  lazy(() =>
    import('../views/smartpos/settings/SettingsPlaceholder').then((m) => ({
      default: m.TenantsSettings,
    })),
  ),
);
const SmartPosLocale = Loadable(
  lazy(() =>
    import('../views/smartpos/settings/SettingsPlaceholder').then((m) => ({
      default: m.LocaleSettings,
    })),
  ),
);
const SmartPosOnboarding = Loadable(
  lazy(() =>
    import('../views/smartpos/settings/SettingsPlaceholder').then((m) => ({
      default: m.OnboardingSettings,
    })),
  ),
);
const SmartPosDocumentSearch = Loadable(
  lazy(() => import('../views/smartpos/documents/DocumentSearchPage')),
);
const SmartPosCashManagement = Loadable(
  lazy(() => import('../views/smartpos/money/CashManagementPage')),
);
const SmartPosTaxes = Loadable(
  lazy(() => import('../views/smartpos/accounting/TaxesPage')),
);

/* ****Pages***** */
const ModernDash = Loadable(lazy(() => import('../views/dashboard/Modern')));
const EcommerceDash = Loadable(lazy(() => import('../views/dashboard/Ecommerce')));

/* ****Apps***** */
// const Blog = Loadable(lazy(() => import('../views/apps/blog/Blog')));
// const BlogDetail = Loadable(lazy(() => import('../views/apps/blog/BlogPost')));
const Contacts = Loadable(lazy(() => import('../views/apps/contacts/Contacts')));
const Chats = Loadable(lazy(() => import('../views/apps/chat/Chat')));
const Notes = Loadable(lazy(() => import('../views/apps/notes/Notes')));
const Tickets = Loadable(lazy(() => import('../views/apps/tickets/Tickets')));
const Ecommerce = Loadable(lazy(() => import('../views/apps/eCommerce/Ecommerce')));
const EcommerceDetail = Loadable(lazy(() => import('../views/apps/eCommerce/EcommerceDetail')));
const EcommerceAddProduct = Loadable(
  lazy(() => import('../views/apps/eCommerce/EcommerceAddProduct')),
);
const EcommerceEditProduct = Loadable(
  lazy(() => import('../views/apps/eCommerce/EcommerceEditProduct')),
);
const EcomProductList = Loadable(lazy(() => import('../views/apps/eCommerce/EcomProductList')));
const EcomProductCheckout = Loadable(
  lazy(() => import('../views/apps/eCommerce/EcommerceCheckout')),
);
const Calendar = Loadable(lazy(() => import('../views/apps/calendar/BigCalendar')));
const UserProfile = Loadable(lazy(() => import('../views/apps/user-profile/UserProfile')));
const Followers = Loadable(lazy(() => import('../views/apps/user-profile/Followers')));
const Friends = Loadable(lazy(() => import('../views/apps/user-profile/Friends')));
const Gallery = Loadable(lazy(() => import('../views/apps/user-profile/Gallery')));
const Email = Loadable(lazy(() => import('../views/apps/email/Email')));
const InvoiceList = Loadable(lazy(() => import('../views/apps/invoice/List')));
const InvoiceCreate = Loadable(lazy(() => import('../views/apps/invoice/Create')));
const InvoiceDetail = Loadable(lazy(() => import('../views/apps/invoice/Detail')));
const InvoiceEdit = Loadable(lazy(() => import('../views/apps/invoice/Edit')));
const Kanban = Loadable(lazy(() => import('../views/apps/kanban/Kanban')));

// ui components
const MuiAlert = Loadable(lazy(() => import('../views/ui-components/MuiAlert')));
const MuiAccordion = Loadable(lazy(() => import('../views/ui-components/MuiAccordion')));
const MuiAvatar = Loadable(lazy(() => import('../views/ui-components/MuiAvatar')));
const MuiChip = Loadable(lazy(() => import('../views/ui-components/MuiChip')));
const MuiDialog = Loadable(lazy(() => import('../views/ui-components/MuiDialog')));
const MuiList = Loadable(lazy(() => import('../views/ui-components/MuiList')));
const MuiPopover = Loadable(lazy(() => import('../views/ui-components/MuiPopover')));
const MuiRating = Loadable(lazy(() => import('../views/ui-components/MuiRating')));
const MuiTabs = Loadable(lazy(() => import('../views/ui-components/MuiTabs')));
const MuiTooltip = Loadable(lazy(() => import('../views/ui-components/MuiTooltip')));
const MuiTransferList = Loadable(lazy(() => import('../views/ui-components/MuiTransferList')));
const MuiTypography = Loadable(lazy(() => import('../views/ui-components/MuiTypography')));

// form elements
const MuiAutoComplete = Loadable(
  lazy(() => import('../views/forms/form-elements/MuiAutoComplete')),
);
const MuiButton = Loadable(lazy(() => import('../views/forms/form-elements/MuiButton')));
const MuiCheckbox = Loadable(lazy(() => import('../views/forms/form-elements/MuiCheckbox')));
const MuiRadio = Loadable(lazy(() => import('../views/forms/form-elements/MuiRadio')));
const MuiSlider = Loadable(lazy(() => import('../views/forms/form-elements/MuiSlider')));
const MuiDateTime = Loadable(lazy(() => import('../views/forms/form-elements/MuiDateTime')));
const MuiSwitch = Loadable(lazy(() => import('../views/forms/form-elements/MuiSwitch')));

// forms
const FormLayouts = Loadable(lazy(() => import('../views/forms/FormLayouts')));
const FormCustom = Loadable(lazy(() => import('../views/forms/FormCustom')));
const FormHorizontal = Loadable(lazy(() => import('../views/forms/FormHorizontal')));
const FormVertical = Loadable(lazy(() => import('../views/forms/FormVertical')));
const FormWizard = Loadable(lazy(() => import('../views/forms/FormWizard')));
const FormValidation = Loadable(lazy(() => import('../views/forms/FormValidation')));
const TiptapEditor = Loadable(lazy(() => import('../views/forms/from-tiptap/TiptapEditor')));

// pages
const RollbaseCASL = Loadable(lazy(() => import('../views/pages/rollbaseCASL/RollbaseCASL')));
const Faq = Loadable(lazy(() => import('../views/pages/faq/Faq')));
const Pricing = Loadable(lazy(() => import('../views/pages/pricing/Pricing')));
const AccountSetting = Loadable(
  lazy(() => import('../views/pages/account-setting/AccountSetting')),
);

// charts
const AreaChart = Loadable(lazy(() => import('../views/charts/AreaChart')));
const CandlestickChart = Loadable(lazy(() => import('../views/charts/CandlestickChart')));
const ColumnChart = Loadable(lazy(() => import('../views/charts/ColumnChart')));
const DoughnutChart = Loadable(lazy(() => import('../views/charts/DoughnutChart')));
const GredientChart = Loadable(lazy(() => import('../views/charts/GredientChart')));
const RadialbarChart = Loadable(lazy(() => import('../views/charts/RadialbarChart')));
const LineChart = Loadable(lazy(() => import('../views/charts/LineChart')));

// tables
const BasicTable = Loadable(lazy(() => import('../views/tables/BasicTable')));
const EnhanceTable = Loadable(lazy(() => import('../views/tables/EnhanceTable')));
const PaginationTable = Loadable(lazy(() => import('../views/tables/PaginationTable')));
const FixedHeaderTable = Loadable(lazy(() => import('../views/tables/FixedHeaderTable')));
const CollapsibleTable = Loadable(lazy(() => import('../views/tables/CollapsibleTable')));
const SearchTable = Loadable(lazy(() => import('../views/tables/SearchTable')));

//react tables
const ReactBasicTable = Loadable(lazy(() => import('../views/react-tables/basic/page')));
const ReactColumnVisibilityTable = Loadable(
  lazy(() => import('../views/react-tables/columnvisibility/page')),
);
const ReactDenseTable = Loadable(lazy(() => import('../views/react-tables/dense/page')));
const ReactDragDropTable = Loadable(lazy(() => import('../views/react-tables/drag-drop/page')));
const ReactEditableTable = Loadable(lazy(() => import('../views/react-tables/editable/page')));
const ReactEmptyTable = Loadable(lazy(() => import('../views/react-tables/empty/page')));
const ReactExpandingTable = Loadable(lazy(() => import('../views/react-tables/expanding/page')));
const ReactFilterTable = Loadable(lazy(() => import('../views/react-tables/filtering/page')));
const ReactPaginationTable = Loadable(lazy(() => import('../views/react-tables/pagination/page')));
const ReactRowSelectionTable = Loadable(
  lazy(() => import('../views/react-tables/row-selection/page')),
);
const ReactSortingTable = Loadable(lazy(() => import('../views/react-tables/sorting/page')));
const ReactStickyTable = Loadable(lazy(() => import('../views/react-tables/sticky/page')));

//mui charts
const BarCharts = Loadable(lazy(() => import('../views/muicharts/barcharts/page')));
const GaugeCharts = Loadable(lazy(() => import('../views/muicharts/gaugecharts/page')));
const AreaCharts = Loadable(lazy(() => import('../views/muicharts/linecharts/area/page')));
const LineCharts = Loadable(lazy(() => import('../views/muicharts/linecharts/line/page')));
const PieCharts = Loadable(lazy(() => import('../views/muicharts/piecharts/page')));
const ScatterCharts = Loadable(lazy(() => import('../views/muicharts/scattercharts/page')));
const SparklineCharts = Loadable(lazy(() => import('../views/muicharts/sparklinecharts/page')));

//mui charts
const SimpletreeCustomization = Loadable(
  lazy(() => import('../views/mui-trees/simpletree/simpletree-customization/page')),
);
const SimpletreeExpansion = Loadable(
  lazy(() => import('../views/mui-trees/simpletree/simpletree-expansion/page')),
);
const SimpletreeFocus = Loadable(
  lazy(() => import('../views/mui-trees/simpletree/simpletree-focus/page')),
);
const SimpletreeItems = Loadable(
  lazy(() => import('../views/mui-trees/simpletree/simpletree-items/page')),
);
const SimpletreeSelection = Loadable(
  lazy(() => import('../views/mui-trees/simpletree/simpletree-selection/page')),
);

// widget
const WidgetCards = Loadable(lazy(() => import('../views/widgets/cards/WidgetCards')));
const WidgetBanners = Loadable(lazy(() => import('../views/widgets/banners/WidgetBanners')));
const WidgetCharts = Loadable(lazy(() => import('../views/widgets/charts/WidgetCharts')));

// authentication
const Login = Loadable(lazy(() => import('../views/authentication/auth1/Login')));
const Login2 = Loadable(lazy(() => import('../views/authentication/auth2/Login2')));
const Register = Loadable(lazy(() => import('../views/authentication/auth1/Register')));
const Register2 = Loadable(lazy(() => import('../views/authentication/auth2/Register2')));
const ForgotPassword = Loadable(lazy(() => import('../views/authentication/auth1/ForgotPassword')));
const ForgotPassword2 = Loadable(
  lazy(() => import('../views/authentication/auth2/ForgotPassword2')),
);
const TwoSteps = Loadable(lazy(() => import('../views/authentication/auth1/TwoSteps')));
const TwoSteps2 = Loadable(lazy(() => import('../views/authentication/auth2/TwoSteps2')));
const Error = Loadable(lazy(() => import('../views/authentication/Error')));
const Maintenance = Loadable(lazy(() => import('../views/authentication/Maintenance')));

// landingpage
const Landingpage = Loadable(lazy(() => import('../views/pages/landingpage/Landingpage')));

// front end pages
const Homepage = Loadable(lazy(() => import('../views/pages/frontend-pages/Homepage')));
const About = Loadable(lazy(() => import('../views/pages/frontend-pages/About')));
const Contact = Loadable(lazy(() => import('../views/pages/frontend-pages/Contact')));
const Portfolio = Loadable(lazy(() => import('../views/pages/frontend-pages/Portfolio')));
const PagePricing = Loadable(lazy(() => import('../views/pages/frontend-pages/Pricing')));
const BlogPage = Loadable(lazy(() => import('../views/pages/frontend-pages/Blog')));
const BlogPost = Loadable(lazy(() => import('../views/pages/frontend-pages/BlogPost')));

const Router = [
  // ---- Landing page (public) ----
  { path: '/', element: <Landingpage /> },

  // ---- SmartPOS POS terminal — full-screen kiosk, no admin sidebar/header ----
  {
    path: '/smartpos/pos',
    element: (
      <RequireAuth>
        <PosLayoutProvider>
          <SmartPosPosTerminal />
        </PosLayoutProvider>
      </RequireAuth>
    ),
  },

  // ---- SmartPOS (protected) ----
  {
    path: '/smartpos',
    element: (
      <RequireAuth>
        <FullLayout />
      </RequireAuth>
    ),
    children: [
      { path: '', element: <Navigate to="/smartpos/dashboard" replace /> },
      { path: 'dashboard', element: <SmartPosDashboard /> },
      // Redirect legacy /smartpos/serials → /smartpos/products/serials
      { path: 'serials', element: <Navigate to="/smartpos/products/serials" replace /> },
      // Catalog
      {
        path: 'products',
        element: <SmartPosProductsLayout />,
        children: [
          { path: '', element: <SmartPosProducts /> },
          { path: 'new', element: <SmartPosProductDetail /> },
          { path: 'categories', element: <SmartPosCategories /> },
          { path: 'brands', element: <SmartPosBrands /> },
          { path: 'units', element: <SmartPosUnits /> },
          { path: 'barcodes', element: <SmartPosBarcodes /> },
          { path: 'serials', element: <SmartPosSerials /> },
          { path: 'count-stock', element: <SmartPosCountStock /> },
          { path: 'opening-stock', element: <SmartPosOpeningStock /> },
          { path: 'import-update', element: <SmartPosImportUpdate /> },
          { path: 'print-labels', element: <SmartPosPrintLabels /> },
          { path: 'bundles', element: <SmartPosBundles /> },
          { path: 'price-lists', element: <SmartPosPriceLists /> },
          { path: 'price-lists/:id', element: <SmartPosPriceListDetail /> },
          { path: ':id', element: <SmartPosProductDetail /> },
          { path: ':id/edit', element: <SmartPosProductDetail /> },
        ],
      },
      // Notifications
      { path: 'notifications/templates', element: <SmartPosNotifTemplates /> },
      { path: 'notifications/deliveries', element: <SmartPosNotifDeliveries /> },
      // Accounting
      { path: 'accounting/chart-of-accounts', element: <SmartPosCoa /> },
      { path: 'accounting/journal-entries', element: <SmartPosJournals /> },
      { path: 'accounting/ledger', element: <SmartPosAccountLedger /> },
      { path: 'accounting/financials', element: <SmartPosFinancials /> },
      { path: 'taxes', element: <SmartPosTaxes /> },
      // HRM
      { path: 'hrm/employees', element: <SmartPosEmployees /> },
      { path: 'hrm/attendance', element: <SmartPosAttendance /> },
      { path: 'hrm/leave', element: <SmartPosLeave /> },
      { path: 'hrm/payroll', element: <SmartPosPayroll /> },
      // Recurring invoices
      { path: 'recurring-invoices', element: <SmartPosRecurring /> },
      // Advanced reports
      { path: 'reports/advanced', element: <SmartPosAdvReports /> },
      // AI
      { path: 'ai', element: <SmartPosAi /> },
      // POS terminals admin (display screen below uses BlankLayout)
      { path: 'pos/terminals', element: <SmartPosTerminals /> },
      // Integrations
      { path: 'integrations', element: <SmartPosIntegrations /> },
      // Settings
      { path: 'settings/i18n', element: <SmartPosI18nAdmin /> },
      { path: 'settings/receipt', element: <SmartPosReceiptSettings /> },
      { path: 'settings/tax-pricing', element: <SmartPosTaxPricing /> },
      { path: 'settings/pos-behaviour', element: <SmartPosPosBehaviour /> },
      { path: 'settings/loyalty', element: <SmartPosLoyalty /> },
      { path: 'settings/notifications', element: <SmartPosNotifications /> },
      { path: 'settings/templates', element: <SmartPosTemplateEditor /> },
      { path: 'settings/printers', element: <SmartPosPrinterSettings /> },
      { path: 'customers', element: <SmartPosCustomers /> },
      { path: 'suppliers', element: <SmartPosSuppliers /> },
      { path: 'suppliers/:id', element: <SmartPosSupplierDetail /> },
      { path: 'warehouses', element: <SmartPosWarehouses /> },
      { path: 'warehouses/:id', element: <SmartPosWarehouseDetail /> },
      { path: 'stock', element: <SmartPosStockLevels /> },
      { path: 'stock/adjustments', element: <SmartPosStockAdjustments /> },
      { path: 'stock/transfers', element: <SmartPosStockTransfers /> },
      { path: 'stock/counts', element: <SmartPosStockCounts /> },
      { path: 'stock/counts/:id', element: <SmartPosStockCountDetail /> },
      { path: 'stock/reorder-rules', element: <SmartPosReorderRules /> },
      // Sales
      { path: 'sales', element: <SmartPosSales /> },
      { path: 'sales/pos', element: <SmartPosPosLaunch /> },
      { path: 'sales/new', element: <SmartPosSaleBuilder /> },
      { path: 'sales/:id/edit', element: <SmartPosSaleBuilder /> },
      { path: 'quotations', element: <SmartPosQuotations /> },
      { path: 'returns', element: <SmartPosReturns /> },
      { path: 'documents/search', element: <SmartPosDocumentSearch /> },
      // Procurement
      { path: 'purchases', element: <SmartPosPurchases /> },
      { path: 'purchases/new', element: <SmartPosPurchaseBuilder /> },
      { path: 'purchases/:id/edit', element: <SmartPosPurchaseBuilder /> },
      // Money
      { path: 'accounts', element: <SmartPosAccounts /> },
      { path: 'payments', element: <SmartPosPayments /> },
      { path: 'expenses', element: <SmartPosExpenses /> },
      { path: 'transfers', element: <SmartPosTransfers /> },
      { path: 'deposits', element: <SmartPosDeposits /> },
      { path: 'cash-management', element: <SmartPosCashManagement /> },
      // Reports hub + individual report pages
      { path: 'reports', element: <SmartPosReportsHub /> },
      { path: 'reports/sales', element: <SmartPosSalesReport /> },
      { path: 'reports/profit-loss', element: <SmartPosProfitLoss /> },
      { path: 'reports/inventory', element: <SmartPosInventoryReport /> },
      { path: 'reports/tax', element: <SmartPosTaxReport /> },
      { path: 'reports/purchases', element: <SmartPosPurchaseReport /> },
      { path: 'reports/payments', element: <SmartPosPaymentReport /> },
      { path: 'reports/customers', element: <SmartPosCustomerReport /> },
      { path: 'reports/exports', element: <SmartPosReports /> },
      // Settings
      { path: 'settings', element: <SmartPosSettings /> },
      { path: 'settings/users', element: <SmartPosUsersRoles /> },
      { path: 'settings/tenants', element: <SmartPosTenants /> },
      { path: 'settings/locale', element: <SmartPosLocale /> },
      { path: 'settings/onboarding', element: <SmartPosOnboarding /> },
    ],
  },
  // ---- Modernize demo (left intact while we build; can be stripped later) ----
  {
    path: '/',
    element: <FullLayout />,
    children: [
      { path: '/dashboards/modern', exact: true, element: <ModernDash /> },
      { path: '/dashboards/ecommerce', exact: true, element: <EcommerceDash /> },
      { path: '/apps/contacts', element: <Contacts /> },
      // { path: '/apps/blog/posts', element: <Blog /> },
      // { path: '/frontend-pages/blog/detail/:id', element: <BlogDetail /> },
      { path: '/apps/chats', element: <Chats /> },
      { path: '/apps/email', element: <Email /> },
      { path: '/apps/notes', element: <Notes /> },
      { path: '/apps/tickets', element: <Tickets /> },
      { path: '/apps/ecommerce/shop', element: <Ecommerce /> },
      { path: '/apps/ecommerce/eco-product-list', element: <EcomProductList /> },
      { path: '/apps/ecommerce/eco-checkout', element: <EcomProductCheckout /> },
      { path: '/apps/ecommerce/add-product', element: <EcommerceAddProduct /> },
      { path: '/apps/ecommerce/edit-product', element: <EcommerceEditProduct /> },
      { path: '/apps/ecommerce/detail/:id', element: <EcommerceDetail /> },
      { path: '/apps/followers', element: <Followers /> },
      { path: '/apps/friends', element: <Friends /> },
      { path: '/apps/gallery', element: <Gallery /> },
      { path: '/apps/kanban', element: <Kanban /> },
      { path: '/apps/invoice/list', element: <InvoiceList /> },
      { path: '/apps/invoice/create', element: <InvoiceCreate /> },
      { path: '/apps/invoice/detail/:id', element: <InvoiceDetail /> },
      { path: '/apps/invoice/edit/:id', element: <InvoiceEdit /> },
      { path: '/user-profile', element: <UserProfile /> },
      { path: '/apps/calendar', element: <Calendar /> },
      { path: '/ui-components/alert', element: <MuiAlert /> },
      { path: '/ui-components/accordion', element: <MuiAccordion /> },
      { path: '/ui-components/avatar', element: <MuiAvatar /> },
      { path: '/ui-components/chip', element: <MuiChip /> },
      { path: '/ui-components/dialog', element: <MuiDialog /> },
      { path: '/ui-components/list', element: <MuiList /> },
      { path: '/ui-components/popover', element: <MuiPopover /> },
      { path: '/ui-components/rating', element: <MuiRating /> },
      { path: '/ui-components/tabs', element: <MuiTabs /> },
      { path: '/ui-components/tooltip', element: <MuiTooltip /> },
      { path: '/ui-components/transfer-list', element: <MuiTransferList /> },
      { path: '/ui-components/typography', element: <MuiTypography /> },
      { path: '/pages/casl', element: <RollbaseCASL /> },
      { path: '/pages/pricing', element: <Pricing /> },
      { path: '/pages/faq', element: <Faq /> },
      { path: '/pages/account-settings', element: <AccountSetting /> },
      { path: '/tables/basic', element: <BasicTable /> },
      { path: '/tables/enhanced', element: <EnhanceTable /> },
      { path: '/tables/pagination', element: <PaginationTable /> },
      { path: '/tables/fixed-header', element: <FixedHeaderTable /> },
      { path: '/tables/collapsible', element: <CollapsibleTable /> },
      { path: '/tables/search', element: <SearchTable /> },
      { path: '/forms/form-elements/autocomplete', element: <MuiAutoComplete /> },
      { path: '/forms/form-elements/button', element: <MuiButton /> },
      { path: '/forms/form-elements/checkbox', element: <MuiCheckbox /> },
      { path: '/forms/form-elements/radio', element: <MuiRadio /> },
      { path: '/forms/form-elements/slider', element: <MuiSlider /> },
      { path: '/forms/form-elements/date-time', element: <MuiDateTime /> },
      { path: '/forms/form-elements/switch', element: <MuiSwitch /> },
      { path: '/forms/form-elements/switch', element: <MuiSwitch /> },
      { path: '/forms/form-layouts', element: <FormLayouts /> },
      { path: '/forms/form-custom', element: <FormCustom /> },
      { path: '/forms/form-wizard', element: <FormWizard /> },
      { path: '/forms/form-validation', element: <FormValidation /> },
      { path: '/forms/form-horizontal', element: <FormHorizontal /> },
      { path: '/forms/form-vertical', element: <FormVertical /> },
      { path: '/forms/form-tiptap', element: <TiptapEditor /> },
      { path: '/charts/area-chart', element: <AreaChart /> },
      { path: '/charts/line-chart', element: <LineChart /> },
      { path: '/charts/gredient-chart', element: <GredientChart /> },
      { path: '/charts/candlestick-chart', element: <CandlestickChart /> },
      { path: '/charts/column-chart', element: <ColumnChart /> },
      { path: '/charts/doughnut-pie-chart', element: <DoughnutChart /> },
      { path: '/charts/radialbar-chart', element: <RadialbarChart /> },
      { path: '/widgets/cards', element: <WidgetCards /> },
      { path: '/widgets/banners', element: <WidgetBanners /> },
      { path: '/widgets/charts', element: <WidgetCharts /> },
      { path: '/react-tables/basic', element: <ReactBasicTable /> },
      { path: '/react-tables/column-visiblity', element: <ReactColumnVisibilityTable /> },
      { path: '/react-tables/drag-drop', element: <ReactDragDropTable /> },
      { path: '/react-tables/dense', element: <ReactDenseTable /> },
      { path: '/react-tables/editable', element: <ReactEditableTable /> },
      { path: '/react-tables/empty', element: <ReactEmptyTable /> },
      { path: '/react-tables/expanding', element: <ReactExpandingTable /> },
      { path: '/react-tables/filter', element: <ReactFilterTable /> },
      { path: '/react-tables/pagination', element: <ReactPaginationTable /> },
      { path: '/react-tables/row-selection', element: <ReactRowSelectionTable /> },
      { path: '/react-tables/sorting', element: <ReactSortingTable /> },
      { path: '/react-tables/sticky', element: <ReactStickyTable /> },

      { path: '/muicharts/barcharts', element: <BarCharts /> },
      { path: '/muicharts/gaugecharts', element: <GaugeCharts /> },
      { path: '/muicharts/linecharts/area', element: <AreaCharts /> },
      { path: '/muicharts/linecharts/line', element: <LineCharts /> },
      { path: '/muicharts/piecharts', element: <PieCharts /> },
      { path: '/muicharts/scattercharts', element: <ScatterCharts /> },
      { path: '/muicharts/sparklinecharts', element: <SparklineCharts /> },

      {
        path: '/mui-trees/simpletree/simpletree-customization',
        element: <SimpletreeCustomization />,
      },
      { path: '/mui-trees/simpletree/simpletree-expansion', element: <SimpletreeExpansion /> },
      { path: '/mui-trees/simpletree/simpletree-focus', element: <SimpletreeFocus /> },
      { path: '/mui-trees/simpletree/simpletree-items', element: <SimpletreeItems /> },
      { path: '/mui-trees/simpletree/simpletree-selection', element: <SimpletreeSelection /> },

      { path: '*', element: <Navigate to="/auth/404" /> },
    ],
  },
  {
    path: '/',
    element: <BlankLayout />,
    children: [
      { path: '/auth/404', element: <Error /> },
      { path: '/auth/403', element: <Error /> },
      { path: '/auth/login', element: <SmartPosLogin /> },
      { path: '/auth/login-demo', element: <Login /> },
      { path: '/auth/login2', element: <Login2 /> },
      { path: '/auth/register', element: <Register /> },
      { path: '/auth/register2', element: <Register2 /> },
      { path: '/auth/forgot-password', element: <ForgotPassword /> },
      { path: '/auth/forgot-password2', element: <ForgotPassword2 /> },
      { path: '/auth/two-steps', element: <TwoSteps /> },
      { path: '/auth/two-steps2', element: <TwoSteps2 /> },
      { path: '/auth/maintenance', element: <Maintenance /> },
      // Phone camera page — opened by scanning QR code; no auth.
      { path: '/capture/:sessionId', element: <CameraPage /> },
      // Customer-display screen — open in second monitor; no chrome.
      { path: '/smartpos/pos/display/:id', element: <SmartPosCustomerDisplay /> },
      { path: '/landingpage', element: <Landingpage /> },
      { path: '/frontend-pages/homepage', element: <Homepage /> },
      { path: '/frontend-pages/about', element: <About /> },
      { path: '/frontend-pages/contact', element: <Contact /> },
      { path: '/frontend-pages/portfolio', element: <Portfolio /> },
      { path: '/frontend-pages/pricing', element: <PagePricing /> },
      { path: '/frontend-pages/blog', element: <BlogPage /> },
      { path: '/frontend-pages/blog/detail/:id', element: <BlogPost /> },
      { path: '*', element: <Navigate to="/auth/404" /> },
    ],
  },
];
const router = createBrowserRouter(Router);

export default router;
