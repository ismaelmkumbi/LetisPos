// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import Loadable from '../layouts/full/shared/loadable/Loadable';
import { RequireAuth } from 'src/routes/smartpos/RequireAuth';
import RequireAdmin from 'src/components/smartpos/RequireAdmin';
import PlanGate from 'src/routes/smartpos/PlanGate';
import { commerceAdminRoutes, storefrontRoutes } from './smartpos/CommerceRoutes';

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
const SmartPosAiDemandForecasting = Loadable(
  lazy(() => import('../views/smartpos/ai/DemandForecastingPage')),
);
const SmartPosAiReorderSuggestions = Loadable(
  lazy(() => import('../views/smartpos/ai/ReorderSuggestionsPage')),
);
const SmartPosAiCustomerAnalytics = Loadable(
  lazy(() => import('../views/smartpos/ai/CustomerAnalyticsPage')),
);
const SmartPosAiFraudDetection = Loadable(
  lazy(() => import('../views/smartpos/ai/FraudDetectionPage')),
);
const SmartPosTerminals = Loadable(lazy(() => import('../views/smartpos/pos/TerminalsListPage')));
const SmartPosCustomerDisplay = Loadable(
  lazy(() => import('../views/smartpos/pos/CustomerDisplayPage')),
);
const SmartPosCreditAccount = Loadable(
  lazy(() => import('../views/smartpos/pos/CreditAccountPage')),
);
const SmartPosCollections = Loadable(
  lazy(() => import('../views/smartpos/pos/CollectionsRunPage')),
);
const CameraPage = Loadable(lazy(() => import('../views/smartpos/products/CameraPage')));
const SmartPosIntegrations = Loadable(
  lazy(() => import('../views/smartpos/integrations/IntegrationsPage')),
);
const PaymentGatewaysPage = Loadable(
  lazy(() => import('../views/smartpos/integrations/PaymentGatewaysPage')),
);
const TraEfdPage = Loadable(
  lazy(() => import('../views/smartpos/integrations/TraEfdPage')),
);
const AccountingPage = Loadable(
  lazy(() => import('../views/smartpos/integrations/AccountingPage')),
);
const SmsProvidersPage = Loadable(
  lazy(() => import('../views/smartpos/integrations/SmsProvidersPage')),
);
const WhatsAppPage = Loadable(
  lazy(() => import('../views/smartpos/integrations/WhatsAppPage')),
);
const WebhooksPage = Loadable(
  lazy(() => import('../views/smartpos/integrations/WebhooksPage')),
);
const SmartPosBranches = Loadable(lazy(() => import('../views/smartpos/settings/BranchesPage')));
const SmartPosBilling = Loadable(lazy(() => import('../views/smartpos/settings/BillingPage')));
const SmartPosBillingPlans = Loadable(lazy(() => import('../views/smartpos/settings/BillingPlansPage')));
const SmartPosAuditLogs = Loadable(lazy(() => import('../views/smartpos/admin/AuditLogsPage')));
const SmartPosErrorLogs = Loadable(lazy(() => import('../views/smartpos/admin/ErrorLogsPage')));
const SmartPosApiKeys = Loadable(lazy(() => import('../views/smartpos/admin/ApiKeysPage')));
const SmartPosSessions = Loadable(lazy(() => import('../views/smartpos/admin/SessionsPage')));
const SmartPosDataRetention = Loadable(lazy(() => import('../views/smartpos/admin/DataRetentionPage')));
const SmartPosBackups = Loadable(lazy(() => import('../views/smartpos/admin/BackupsPage')));
const TenantDashboardPage = Loadable(
  lazy(() => import('../views/smartpos/admin/TenantDashboardPage')),
);
const TenantListPage = Loadable(
  lazy(() => import('../views/smartpos/admin/TenantListPage')),
);
const TenantDetailPage = Loadable(
  lazy(() => import('../views/smartpos/admin/TenantDetailPage')),
);
const InvoiceListPage = Loadable(
  lazy(() => import('../views/smartpos/admin/InvoiceListPage')),
);
import TenantBillingPage from '../views/smartpos/billing/TenantBillingPage';
const PaymentHistoryPage = Loadable(
  lazy(() => import('../views/smartpos/billing/PaymentHistoryPage')),
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
const SmartPosHelpCenter = Loadable(
  lazy(() => import('../views/smartpos/support/HelpCenterPage')),
);
const SmartPosTutorials = Loadable(
  lazy(() => import('../views/smartpos/support/TutorialsPage')),
);
const SmartPosSystemStatus = Loadable(
  lazy(() => import('../views/smartpos/support/SystemStatusPage')),
);
const SmartPosContactSupport = Loadable(
  lazy(() => import('../views/smartpos/support/ContactSupportPage')),
);
const SmartPosCustomers = Loadable(
  lazy(() => import('../views/smartpos/customers/CustomersListPage')),
);
const SmartPosCustomerGroups = Loadable(
  lazy(() => import('../views/smartpos/customers/CustomerGroupsPage')),
);
const SmartPosGiftCards = Loadable(
  lazy(() => import('../views/smartpos/customers/GiftCardsPage')),
);
const SmartPosStoreCredit = Loadable(
  lazy(() => import('../views/smartpos/customers/StoreCreditPage')),
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
const SmartPosDamageWaste = Loadable(
  lazy(() => import('../views/smartpos/stock/DamageWastePage')),
);
const SmartPosExpiryTracking = Loadable(
  lazy(() => import('../views/smartpos/stock/ExpiryTrackingPage')),
);
const SmartPosBatchTracking = Loadable(
  lazy(() => import('../views/smartpos/stock/BatchTrackingPage')),
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
const SmartPosSupplierReport = Loadable(lazy(() => import('../views/smartpos/reports/SupplierReportPage')));
const SmartPosFinancialReport = Loadable(lazy(() => import('../views/smartpos/reports/FinancialReportPage')));
const SmartPosEmployeeReport = Loadable(lazy(() => import('../views/smartpos/reports/EmployeeReportPage')));
const SmartPosOperationsReport = Loadable(lazy(() => import('../views/smartpos/reports/OperationsReportPage')));
const SmartPosReportSchedules = Loadable(lazy(() => import('../views/smartpos/reports/ReportSchedulesPage')));
const SmartPosReportBuilder = Loadable(lazy(() => import('../views/smartpos/reports/ReportBuilderPage')));
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
const SmartPosSuspendedSales = Loadable(
  lazy(() => import('../views/smartpos/sales/SuspendedSalesPage')),
);
const SmartPosGoodsReceived = Loadable(
  lazy(() => import('../views/smartpos/purchases/GoodsReceivedPage')),
);
const SmartPosSupplierReturns = Loadable(
  lazy(() => import('../views/smartpos/purchases/SupplierReturnsPage')),
);
const SmartPosSupplierPayments = Loadable(
  lazy(() => import('../views/smartpos/money/SupplierPaymentsPage')),
);
const SmartPosLeads = Loadable(lazy(() => import('../views/smartpos/crm/LeadsPage')));
const SmartPosOpportunities = Loadable(
  lazy(() => import('../views/smartpos/crm/OpportunitiesPage')),
);
const SmartPosFollowUps = Loadable(
  lazy(() => import('../views/smartpos/crm/FollowUpsPage')),
);
const SmartPosActivities = Loadable(
  lazy(() => import('../views/smartpos/crm/ActivitiesPage')),
);
const SmartPosPromotions = Loadable(
  lazy(() => import('../views/smartpos/marketing/PromotionsPage')),
);
const SmartPosCoupons = Loadable(
  lazy(() => import('../views/smartpos/marketing/CouponsPage')),
);
const SmartPosSmsCampaigns = Loadable(
  lazy(() => import('../views/smartpos/marketing/SmsCampaignsPage')),
);
const SmartPosEmailCampaigns = Loadable(
  lazy(() => import('../views/smartpos/marketing/EmailCampaignsPage')),
);
const SmartPosWhatsAppCampaigns = Loadable(
  lazy(() => import('../views/smartpos/marketing/WhatsAppCampaignsPage')),
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
const ResetPassword = Loadable(lazy(() => import('../views/authentication/auth1/ResetPassword')));
const ForgotPassword2 = Loadable(
  lazy(() => import('../views/authentication/auth2/ForgotPassword2')),
);
const TwoSteps = Loadable(lazy(() => import('../views/authentication/auth1/TwoSteps')));
const TwoSteps2 = Loadable(lazy(() => import('../views/authentication/auth2/TwoSteps2')));
const VerificationSent = Loadable(lazy(() => import('../views/authentication/auth1/VerificationSent')));
const Verify = Loadable(lazy(() => import('../views/authentication/auth1/Verify')));
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
      { path: 'accounting/chart-of-accounts', element: <PlanGate minPlan="STARTER" featureName="Chart of Accounts"><SmartPosCoa /></PlanGate> },
      { path: 'accounting/journal-entries', element: <PlanGate minPlan="STARTER" featureName="Journal Entries"><SmartPosJournals /></PlanGate> },
      { path: 'accounting/ledger', element: <PlanGate minPlan="STARTER" featureName="General Ledger"><SmartPosAccountLedger /></PlanGate> },
      { path: 'accounting/financials', element: <PlanGate minPlan="STARTER" featureName="Financial Statements"><SmartPosFinancials /></PlanGate> },
      { path: 'taxes', element: <PlanGate minPlan="STARTER" featureName="Taxes"><SmartPosTaxes /></PlanGate> },
      // HRM
      { path: 'hrm/employees', element: <PlanGate minPlan="PROFESSIONAL" featureName="Employee Management"><SmartPosEmployees /></PlanGate> },
      { path: 'hrm/attendance', element: <PlanGate minPlan="PROFESSIONAL" featureName="Attendance"><SmartPosAttendance /></PlanGate> },
      { path: 'hrm/leave', element: <PlanGate minPlan="PROFESSIONAL" featureName="Leave Management"><SmartPosLeave /></PlanGate> },
      { path: 'hrm/payroll', element: <PlanGate minPlan="PROFESSIONAL" featureName="Payroll"><SmartPosPayroll /></PlanGate> },
      // Recurring invoices
      { path: 'recurring-invoices', element: <SmartPosRecurring /> },
      // Advanced reports
      { path: 'reports/advanced', element: <SmartPosAdvReports /> },
      // AI
      { path: 'ai', element: <PlanGate minPlan="PROFESSIONAL" featureName="AI Insights"><SmartPosAi /></PlanGate> },
      { path: 'ai/forecasting', element: <PlanGate minPlan="PROFESSIONAL" featureName="AI Demand Forecasting"><SmartPosAiDemandForecasting /></PlanGate> },
      { path: 'ai/reorder-suggestions', element: <PlanGate minPlan="PROFESSIONAL" featureName="AI Reorder Suggestions"><SmartPosAiReorderSuggestions /></PlanGate> },
      { path: 'ai/customer-analytics', element: <PlanGate minPlan="PROFESSIONAL" featureName="AI Customer Analytics"><SmartPosAiCustomerAnalytics /></PlanGate> },
      { path: 'ai/fraud-detection', element: <PlanGate minPlan="PROFESSIONAL" featureName="AI Fraud Detection"><SmartPosAiFraudDetection /></PlanGate> },
      // POS terminals admin (display screen below uses BlankLayout)
      { path: 'pos/terminals', element: <SmartPosTerminals /> },
      { path: 'pos/credit/:customerId', element: <RequireAuth><SmartPosCreditAccount /></RequireAuth> },
      { path: 'pos/collections', element: <RequireAuth><SmartPosCollections /></RequireAuth> },
      // Integrations
      { path: 'integrations', element: <PlanGate minPlan="PROFESSIONAL" featureName="Integrations"><SmartPosIntegrations /></PlanGate> },
      { path: 'integrations/payment-gateways', element: <PlanGate minPlan="PROFESSIONAL" featureName="Payment Gateways"><PaymentGatewaysPage /></PlanGate> },
      { path: 'integrations/tra-efd', element: <PlanGate minPlan="PROFESSIONAL" featureName="TRA EFD"><TraEfdPage /></PlanGate> },
      { path: 'integrations/accounting', element: <PlanGate minPlan="PROFESSIONAL" featureName="Accounting Integrations"><AccountingPage /></PlanGate> },
      { path: 'integrations/sms', element: <PlanGate minPlan="PROFESSIONAL" featureName="SMS Providers"><SmsProvidersPage /></PlanGate> },
      { path: 'integrations/whatsapp', element: <PlanGate minPlan="PROFESSIONAL" featureName="WhatsApp API"><WhatsAppPage /></PlanGate> },
      { path: 'integrations/webhooks', element: <PlanGate minPlan="PROFESSIONAL" featureName="Webhooks"><WebhooksPage /></PlanGate> },
      // Billing (tenant self-service)
      { path: 'billing', element: <TenantBillingPage /> },
      { path: 'billing/history', element: <PaymentHistoryPage /> },
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
      { path: 'customers/groups', element: <SmartPosCustomerGroups /> },
      { path: 'customers/gift-cards', element: <SmartPosGiftCards /> },
      { path: 'customers/store-credit', element: <SmartPosStoreCredit /> },
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
      { path: 'stock/damage', element: <SmartPosDamageWaste /> },
      { path: 'stock/expiry', element: <SmartPosExpiryTracking /> },
      { path: 'stock/batches', element: <SmartPosBatchTracking /> },
      // Sales
      { path: 'sales', element: <SmartPosSales /> },
      { path: 'sales/pos', element: <SmartPosPosLaunch /> },
      { path: 'sales/new', element: <SmartPosSaleBuilder /> },
      { path: 'sales/suspended', element: <SmartPosSuspendedSales /> },
      { path: 'sales/:id/edit', element: <SmartPosSaleBuilder /> },
      { path: 'quotations', element: <PlanGate minPlan="STARTER" featureName="Quotations"><SmartPosQuotations /></PlanGate> },
      { path: 'returns', element: <SmartPosReturns /> },
      { path: 'documents/search', element: <PlanGate minPlan="STARTER" featureName="Document Search"><SmartPosDocumentSearch /></PlanGate> },
      // Procurement
      { path: 'purchases', element: <PlanGate minPlan="STARTER" featureName="Purchases"><SmartPosPurchases /></PlanGate> },
      { path: 'purchases/new', element: <PlanGate minPlan="STARTER" featureName="Purchases"><SmartPosPurchaseBuilder /></PlanGate> },
      { path: 'purchases/:id/edit', element: <PlanGate minPlan="STARTER" featureName="Purchases"><SmartPosPurchaseBuilder /></PlanGate> },
      { path: 'purchases/received', element: <PlanGate minPlan="STARTER" featureName="Goods Received"><SmartPosGoodsReceived /></PlanGate> },
      { path: 'purchases/returns', element: <PlanGate minPlan="STARTER" featureName="Supplier Returns"><SmartPosSupplierReturns /></PlanGate> },
      // Money
      { path: 'accounts', element: <PlanGate minPlan="STARTER" featureName="Accounts"><SmartPosAccounts /></PlanGate> },
      { path: 'payments', element: <PlanGate minPlan="STARTER" featureName="Payments"><SmartPosPayments /></PlanGate> },
      { path: 'expenses', element: <PlanGate minPlan="STARTER" featureName="Expenses"><SmartPosExpenses /></PlanGate> },
      { path: 'transfers', element: <PlanGate minPlan="STARTER" featureName="Transfers"><SmartPosTransfers /></PlanGate> },
      { path: 'deposits', element: <PlanGate minPlan="STARTER" featureName="Deposits"><SmartPosDeposits /></PlanGate> },
      { path: 'cash-management', element: <PlanGate minPlan="STARTER" featureName="Cash Management"><SmartPosCashManagement /></PlanGate> },
      { path: 'supplier-payments', element: <PlanGate minPlan="STARTER" featureName="Supplier Payments"><SmartPosSupplierPayments /></PlanGate> },
      // CRM
      { path: 'crm/leads', element: <PlanGate minPlan="PROFESSIONAL" featureName="CRM Leads"><SmartPosLeads /></PlanGate> },
      { path: 'crm/opportunities', element: <PlanGate minPlan="PROFESSIONAL" featureName="CRM Opportunities"><SmartPosOpportunities /></PlanGate> },
      { path: 'crm/follow-ups', element: <PlanGate minPlan="PROFESSIONAL" featureName="CRM Follow-Ups"><SmartPosFollowUps /></PlanGate> },
      { path: 'crm/activities', element: <PlanGate minPlan="PROFESSIONAL" featureName="CRM Activities"><SmartPosActivities /></PlanGate> },
      // Reports hub + individual report pages
      { path: 'reports', element: <PlanGate minPlan="STARTER" featureName="Reports Hub"><SmartPosReportsHub /></PlanGate> },
      { path: 'reports/sales', element: <PlanGate minPlan="STARTER" featureName="Sales Reports"><SmartPosSalesReport /></PlanGate> },
      { path: 'reports/profit-loss', element: <PlanGate minPlan="STARTER" featureName="Profit & Loss"><SmartPosProfitLoss /></PlanGate> },
      { path: 'reports/inventory', element: <PlanGate minPlan="STARTER" featureName="Inventory Reports"><SmartPosInventoryReport /></PlanGate> },
      { path: 'reports/tax', element: <PlanGate minPlan="STARTER" featureName="Tax Reports"><SmartPosTaxReport /></PlanGate> },
      { path: 'reports/purchases', element: <PlanGate minPlan="STARTER" featureName="Purchase Reports"><SmartPosPurchaseReport /></PlanGate> },
      { path: 'reports/payments', element: <PlanGate minPlan="STARTER" featureName="Payment Reports"><SmartPosPaymentReport /></PlanGate> },
      { path: 'reports/customers', element: <PlanGate minPlan="STARTER" featureName="Customer Reports"><SmartPosCustomerReport /></PlanGate> },
      { path: 'reports/suppliers', element: <PlanGate minPlan="STARTER" featureName="Supplier Reports"><SmartPosSupplierReport /></PlanGate> },
      { path: 'reports/financial', element: <PlanGate minPlan="STARTER" featureName="Financial Reports"><SmartPosFinancialReport /></PlanGate> },
      { path: 'reports/employees', element: <PlanGate minPlan="STARTER" featureName="Employee Reports"><SmartPosEmployeeReport /></PlanGate> },
      { path: 'reports/operations', element: <PlanGate minPlan="STARTER" featureName="Operations Report"><SmartPosOperationsReport /></PlanGate> },
      { path: 'reports/schedules', element: <PlanGate minPlan="STARTER" featureName="Report Schedules"><SmartPosReportSchedules /></PlanGate> },
      { path: 'reports/builder', element: <PlanGate minPlan="STARTER" featureName="Report Builder"><SmartPosReportBuilder /></PlanGate> },
      { path: 'reports/exports', element: <PlanGate minPlan="STARTER" featureName="Export Center"><SmartPosReports /></PlanGate> },
      // Settings
      { path: 'settings', element: <SmartPosSettings /> },
      { path: 'settings/users', element: <SmartPosUsersRoles /> },
      { path: 'settings/tenants', element: <Navigate to="/smartpos/admin/tenants/list" replace /> },
      { path: 'settings/locale', element: <SmartPosLocale /> },
      { path: 'settings/onboarding', element: <SmartPosOnboarding /> },
      { path: 'admin/branches', element: <RequireAuth><RequireAdmin><SmartPosBranches /></RequireAdmin></RequireAuth> },
      { path: 'admin/tenants', element: <RequireAuth><RequireAdmin><TenantDashboardPage /></RequireAdmin></RequireAuth> },
      { path: 'admin/tenants/list', element: <RequireAuth><RequireAdmin><TenantListPage /></RequireAdmin></RequireAuth> },
      { path: 'admin/tenants/:id', element: <RequireAuth><RequireAdmin><TenantDetailPage /></RequireAdmin></RequireAuth> },
      { path: 'admin/billing', element: <RequireAuth><RequireAdmin><SmartPosBilling /></RequireAdmin></RequireAuth> },
      { path: 'admin/billing/plans', element: <RequireAuth><RequireAdmin><SmartPosBillingPlans /></RequireAdmin></RequireAuth> },
      { path: 'admin/billing/invoices', element: <RequireAuth><RequireAdmin><InvoiceListPage /></RequireAdmin></RequireAuth> },
      { path: 'admin/audit-logs', element: <RequireAuth><RequireAdmin><PlanGate minPlan="PROFESSIONAL" featureName="Audit Logs"><SmartPosAuditLogs /></PlanGate></RequireAdmin></RequireAuth> },
      { path: 'admin/sessions', element: <RequireAuth><RequireAdmin><PlanGate minPlan="PROFESSIONAL" featureName="Sessions"><SmartPosSessions /></PlanGate></RequireAdmin></RequireAuth> },
      { path: 'admin/api-keys', element: <RequireAuth><RequireAdmin><PlanGate minPlan="PROFESSIONAL" featureName="API Keys"><SmartPosApiKeys /></PlanGate></RequireAdmin></RequireAuth> },
      { path: 'admin/error-logs', element: <RequireAuth><RequireAdmin><SmartPosErrorLogs /></RequireAdmin></RequireAuth> },
      { path: 'admin/data-retention', element: <RequireAuth><RequireAdmin><PlanGate minPlan="PROFESSIONAL" featureName="Data Retention"><SmartPosDataRetention /></PlanGate></RequireAdmin></RequireAuth> },
      { path: 'admin/backups', element: <RequireAuth><RequireAdmin><SmartPosBackups /></RequireAdmin></RequireAuth> },
      // Commerce admin
      commerceAdminRoutes,
      // Marketing
      { path: 'marketing/promotions', element: <PlanGate minPlan="STARTER" featureName="Promotions"><SmartPosPromotions /></PlanGate> },
      { path: 'marketing/coupons', element: <PlanGate minPlan="STARTER" featureName="Coupons"><SmartPosCoupons /></PlanGate> },
      { path: 'marketing/sms-campaigns', element: <PlanGate minPlan="STARTER" featureName="SMS Campaigns"><SmartPosSmsCampaigns /></PlanGate> },
      { path: 'marketing/email-campaigns', element: <PlanGate minPlan="STARTER" featureName="Email Campaigns"><SmartPosEmailCampaigns /></PlanGate> },
      { path: 'marketing/whatsapp-campaigns', element: <PlanGate minPlan="STARTER" featureName="WhatsApp Campaigns"><SmartPosWhatsAppCampaigns /></PlanGate> },
      // Support
      { path: 'support/help', element: <SmartPosHelpCenter /> },
      { path: 'support/tutorials', element: <SmartPosTutorials /> },
      { path: 'support/system-status', element: <SmartPosSystemStatus /> },
      { path: 'support/contact', element: <SmartPosContactSupport /> },
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
      { path: '/auth/reset-password', element: <ResetPassword /> },
      { path: '/auth/two-steps', element: <TwoSteps /> },
      { path: '/auth/two-steps2', element: <TwoSteps2 /> },
      { path: '/auth/verify-sent', element: <VerificationSent /> },
      { path: '/auth/verify', element: <Verify /> },
      { path: '/auth/maintenance', element: <Maintenance /> },
      // Phone camera page — opened by scanning QR code; no auth.
      { path: '/capture/:sessionId', element: <CameraPage /> },
      // Customer-display screen — open in second monitor; no chrome.
      { path: '/smartpos/pos/display/:id', element: <SmartPosCustomerDisplay /> },
      // Storefront — public commerce storefront
      storefrontRoutes,
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
