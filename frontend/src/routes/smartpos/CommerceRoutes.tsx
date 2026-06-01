import React, { lazy } from 'react';
import { Outlet } from 'react-router';
import Loadable from '../../layouts/full/shared/loadable/Loadable';
import { RequireAuth } from './RequireAuth';
import RequireAdmin from '../../components/smartpos/RequireAdmin';

// Admin pages (placeholders for now — real pages built in later tasks)
const CommerceDashboard = Loadable(lazy(() => import('../../views/commerce/admin/CommerceDashboard')));
const StoreSettings = Loadable(lazy(() => import('../../views/commerce/admin/StoreSettings')));
const ProductPublishing = Loadable(lazy(() => import('../../views/commerce/admin/ProductPublishing')));
const CategoryDisplay = Loadable(lazy(() => import('../../views/commerce/admin/CategoryDisplay')));
const ThemeCustomizer = Loadable(lazy(() => import('../../views/commerce/admin/ThemeCustomizer')));
const ShippingZones = Loadable(lazy(() => import('../../views/commerce/admin/ShippingZones')));
const NavigationBuilder = Loadable(lazy(() => import('../../views/commerce/admin/NavigationBuilder')));
const PageEditor = Loadable(lazy(() => import('../../views/commerce/admin/PageEditor')));
const BannerManager = Loadable(lazy(() => import('../../views/commerce/admin/BannerManager')));
const SeoSettings = Loadable(lazy(() => import('../../views/commerce/admin/SeoSettings')));
const DomainManager = Loadable(lazy(() => import('../../views/commerce/admin/DomainManager')));
const CommerceOrders = Loadable(lazy(() => import('../../views/commerce/admin/CommerceOrders')));
const GoLiveChecklist = Loadable(lazy(() => import('../../views/commerce/admin/GoLiveChecklist')));

// Storefront
const StorefrontLayout = Loadable(lazy(() => import('../../layouts/storefront/StorefrontLayout')));
const HomePage = Loadable(lazy(() => import('../../views/commerce/storefront/HomePage')));
const ProductDetailPage = Loadable(lazy(() => import('../../views/commerce/storefront/ProductDetailPage')));
const ProductListPage = Loadable(lazy(() => import('../../views/commerce/storefront/ProductListPage')));
const SearchResultsPage = Loadable(lazy(() => import('../../views/commerce/storefront/SearchResultsPage')));
const CartPage = Loadable(lazy(() => import('../../views/commerce/storefront/CartPage')));
const CheckoutPage = Loadable(lazy(() => import('../../views/commerce/storefront/CheckoutPage')));
const OrderConfirmationPage = Loadable(lazy(() => import('../../views/commerce/storefront/OrderConfirmationPage')));
const CustomerLoginPage = Loadable(lazy(() => import('../../views/commerce/storefront/CustomerLoginPage')));
const CustomerRegisterPage = Loadable(lazy(() => import('../../views/commerce/storefront/CustomerRegisterPage')));
const CustomerAccountPage = Loadable(lazy(() => import('../../views/commerce/storefront/CustomerAccountPage')));
const CustomerOrdersPage = Loadable(lazy(() => import('../../views/commerce/storefront/CustomerOrdersPage')));
const CustomerAddressesPage = Loadable(lazy(() => import('../../views/commerce/storefront/CustomerAddressesPage')));
const StorePage = Loadable(lazy(() => import('../../views/commerce/storefront/StorePage')));

// Admin layout wrapper
import { CommerceAdminProvider } from '../../context/CommerceContext';

const CommerceAdminLayout: React.FC = () => (
  <CommerceAdminProvider>
    <Outlet />
  </CommerceAdminProvider>
);

// Export route configs
export const commerceAdminRoutes = {
  path: 'admin/commerce',
  element: <RequireAuth><RequireAdmin><CommerceAdminLayout /></RequireAdmin></RequireAuth>,
  children: [
    { index: true, element: <CommerceDashboard /> },
    { path: 'settings', element: <StoreSettings /> },
    { path: 'products', element: <ProductPublishing /> },
    { path: 'categories', element: <CategoryDisplay /> },
    { path: 'theme', element: <ThemeCustomizer /> },
    { path: 'shipping', element: <ShippingZones /> },
    { path: 'navigation', element: <NavigationBuilder /> },
    { path: 'pages', element: <PageEditor /> },
    { path: 'banners', element: <BannerManager /> },
    { path: 'seo', element: <SeoSettings /> },
    { path: 'domains', element: <DomainManager /> },
    { path: 'orders', element: <CommerceOrders /> },
    { path: 'go-live', element: <GoLiveChecklist /> },
  ],
};

export const storefrontRoutes = {
  path: '/store/:slug',
  element: <StorefrontLayout />,
  children: [
    { index: true, element: <HomePage /> },
    { path: 'products/:id', element: <ProductDetailPage /> },
    { path: 'categories/:categoryId', element: <ProductListPage /> },
    { path: 'search', element: <SearchResultsPage /> },
    { path: 'cart', element: <CartPage /> },
    { path: 'checkout', element: <CheckoutPage /> },
    { path: 'order-confirmed/:orderId', element: <OrderConfirmationPage /> },
    { path: 'login', element: <CustomerLoginPage /> },
    { path: 'register', element: <CustomerRegisterPage /> },
    { path: 'account', element: <CustomerAccountPage /> },
    { path: 'account/orders', element: <CustomerOrdersPage /> },
    { path: 'account/addresses', element: <CustomerAddressesPage /> },
    { path: 'page/:key', element: <StorePage /> },
  ],
};
