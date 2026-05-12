import { api } from './client';
import type {
  Store, UpdateStoreRequest, PublishedProduct, PublishProductRequest,
  StorefrontProduct, Cart, CartItem, AddToCartRequest, CheckoutRequest,
  CheckoutResponse, ShippingRate, CustomerAuthResponse, CustomerProfile,
  CustomerAddress, AddressInput, Theme, ThemeSettings, NavigationMenu,
  StorePage, ShippingZone, MarketingBanner, SeoDefaults, CustomDomain,
  CommerceSummary, TopProduct, OrdersOverTime, NavigationItem,
} from '../../types/commerce';

// ── Admin APIs ──

export const commerceAdmin = {
  getSettings: () =>
    api.get<Store>('/api/v1/commerce/settings').then(r => r.data),

  updateSettings: (req: UpdateStoreRequest) =>
    api.put<Store>('/api/v1/commerce/settings', req).then(r => r.data),

  listPublishedProducts: (search?: string, page = 0, size = 20) =>
    api.get<{ content: PublishedProduct[]; totalElements: number }>(
      '/api/v1/commerce/products', { params: { search, page, size } }
    ).then(r => r.data),

  publishProduct: (req: PublishProductRequest) =>
    api.post<PublishedProduct>('/api/v1/commerce/products/publish', req).then(r => r.data),

  updatePublishedProduct: (id: string, req: PublishProductRequest) =>
    api.put<PublishedProduct>(`/api/v1/commerce/products/${id}`, req).then(r => r.data),

  unpublishProduct: (productId: string) =>
    api.delete(`/api/v1/commerce/products/${productId}/unpublish`),

  getCategoryDisplay: () =>
    api.get('/api/v1/commerce/categories').then(r => r.data),

  updateCategoryDisplay: (categories: any[]) =>
    api.put('/api/v1/commerce/categories', categories).then(r => r.data),

  getTheme: () =>
    api.get<Theme>('/api/v1/commerce/theme').then(r => r.data),

  updateTheme: (settings: ThemeSettings) =>
    api.put<Theme>('/api/v1/commerce/theme', settings).then(r => r.data),

  getShippingZones: () =>
    api.get<ShippingZone[]>('/api/v1/commerce/shipping-zones').then(r => r.data),

  createShippingZone: (zone: Omit<ShippingZone, 'id'>) =>
    api.post<ShippingZone>('/api/v1/commerce/shipping-zones', zone).then(r => r.data),

  updateShippingZone: (id: string, zone: Partial<ShippingZone>) =>
    api.put<ShippingZone>(`/api/v1/commerce/shipping-zones/${id}`, zone).then(r => r.data),

  deleteShippingZone: (id: string) =>
    api.delete(`/api/v1/commerce/shipping-zones/${id}`),

  getNavigation: (location: 'header' | 'footer') =>
    api.get<NavigationMenu>(`/api/v1/commerce/navigation/${location}`).then(r => r.data),

  updateNavigation: (location: 'header' | 'footer', items: NavigationItem[]) =>
    api.put<NavigationMenu>(`/api/v1/commerce/navigation/${location}`, { items }).then(r => r.data),

  getPages: () =>
    api.get<StorePage[]>('/api/v1/commerce/pages').then(r => r.data),

  getPage: (id: string) =>
    api.get<StorePage>(`/api/v1/commerce/pages/${id}`).then(r => r.data),

  createPage: (page: Omit<StorePage, 'id'>) =>
    api.post<StorePage>('/api/v1/commerce/pages', page).then(r => r.data),

  updatePage: (id: string, page: Partial<StorePage>) =>
    api.put<StorePage>(`/api/v1/commerce/pages/${id}`, page).then(r => r.data),

  deletePage: (id: string) =>
    api.delete(`/api/v1/commerce/pages/${id}`),

  getBanners: () =>
    api.get<MarketingBanner[]>('/api/v1/commerce/banners').then(r => r.data),

  createBanner: (banner: Omit<MarketingBanner, 'id'>) =>
    api.post<MarketingBanner>('/api/v1/commerce/banners', banner).then(r => r.data),

  updateBanner: (id: string, banner: Partial<MarketingBanner>) =>
    api.put<MarketingBanner>(`/api/v1/commerce/banners/${id}`, banner).then(r => r.data),

  deleteBanner: (id: string) =>
    api.delete(`/api/v1/commerce/banners/${id}`),

  getSeo: () =>
    api.get<SeoDefaults>('/api/v1/commerce/seo').then(r => r.data),

  updateSeo: (seo: Partial<SeoDefaults>) =>
    api.put<SeoDefaults>('/api/v1/commerce/seo', seo).then(r => r.data),

  getDomains: () =>
    api.get<CustomDomain[]>('/api/v1/commerce/domains').then(r => r.data),

  addDomain: (domain: string) =>
    api.post<CustomDomain>('/api/v1/commerce/domains', { domain }).then(r => r.data),

  verifyDomain: (id: string) =>
    api.post<CustomDomain>(`/api/v1/commerce/domains/${id}/verify`).then(r => r.data),

  deleteDomain: (id: string) =>
    api.delete(`/api/v1/commerce/domains/${id}`),

  getAnalyticsSummary: (period?: string) =>
    api.get<CommerceSummary>('/api/v1/commerce/analytics/summary', { params: { period } }).then(r => r.data),

  getTopProducts: (period?: string) =>
    api.get<TopProduct[]>('/api/v1/commerce/analytics/top-products', { params: { period } }).then(r => r.data),

  getOrdersOverTime: (period?: string) =>
    api.get<OrdersOverTime[]>('/api/v1/commerce/analytics/orders-over-time', { params: { period } }).then(r => r.data),
};

// ── Storefront Public APIs ──

export const storefront = {
  getTheme: (slug: string) =>
    api.get<Theme>(`/api/v1/storefront/${slug}/theme`).then(r => r.data),

  getNavigation: (slug: string) =>
    api.get<{ header: NavigationMenu; footer: NavigationMenu }>(`/api/v1/storefront/${slug}/navigation`).then(r => r.data),

  getFeaturedProducts: (slug: string) =>
    api.get<StorefrontProduct[]>(`/api/v1/storefront/${slug}/products/featured`).then(r => r.data),

  getProducts: (slug: string, params: { categoryId?: string; search?: string; sort?: string; page?: number; size?: number }) =>
    api.get<{ content: StorefrontProduct[]; totalElements: number; totalPages: number }>(
      `/api/v1/storefront/${slug}/products`, { params }
    ).then(r => r.data),

  getProduct: (slug: string, idOrSlug: string) =>
    api.get<StorefrontProduct>(`/api/v1/storefront/${slug}/products/${idOrSlug}`).then(r => r.data),

  search: (slug: string, query: string, page = 0, size = 20) =>
    api.get<{ content: StorefrontProduct[]; totalElements: number }>(
      `/api/v1/storefront/${slug}/search`, { params: { q: query, page, size } }
    ).then(r => r.data),

  getCategories: (slug: string) =>
    api.get(`/api/v1/storefront/${slug}/categories`).then(r => r.data),

  getPage: (slug: string, key: string) =>
    api.get<StorePage>(`/api/v1/storefront/${slug}/pages/${key}`).then(r => r.data),

  getBanners: (slug: string) =>
    api.get<MarketingBanner[]>(`/api/v1/storefront/${slug}/banners`).then(r => r.data),

  getCart: (slug: string) =>
    api.get<Cart>(`/api/v1/storefront/${slug}/cart`).then(r => r.data),

  addToCart: (slug: string, req: AddToCartRequest) =>
    api.post<CartItem>(`/api/v1/storefront/${slug}/cart/items`, req).then(r => r.data),

  updateCartItem: (slug: string, itemId: string, quantity: number) =>
    api.put<CartItem>(`/api/v1/storefront/${slug}/cart/items/${itemId}`, { quantity }).then(r => r.data),

  removeCartItem: (slug: string, itemId: string) =>
    api.delete(`/api/v1/storefront/${slug}/cart/items/${itemId}`),

  getShippingRates: (slug: string, cartId: string, country: string, postalCode?: string) =>
    api.post<ShippingRate[]>(`/api/v1/storefront/${slug}/checkout/shipping-rates`, { cartId, country, postalCode }).then(r => r.data),

  checkout: (slug: string, req: CheckoutRequest) =>
    api.post<CheckoutResponse>(`/api/v1/storefront/${slug}/checkout`, req).then(r => r.data),

  register: (slug: string, req: { firstName: string; lastName: string; email: string; password: string }) =>
    api.post<CustomerAuthResponse>(`/api/v1/storefront/${slug}/customers/register`, req).then(r => r.data),

  login: (slug: string, email: string, password: string) =>
    api.post<CustomerAuthResponse>(`/api/v1/storefront/${slug}/customers/login`, { email, password }).then(r => r.data),

  getProfile: (slug: string) =>
    api.get<CustomerProfile>(`/api/v1/storefront/${slug}/customers/me`).then(r => r.data),

  updateProfile: (slug: string, profile: Partial<CustomerProfile>) =>
    api.put<CustomerProfile>(`/api/v1/storefront/${slug}/customers/me`, profile).then(r => r.data),

  getOrders: (slug: string) =>
    api.get(`/api/v1/storefront/${slug}/customers/me/orders`).then(r => r.data),

  getAddresses: (slug: string) =>
    api.get<CustomerAddress[]>(`/api/v1/storefront/${slug}/customers/me/addresses`).then(r => r.data),

  createAddress: (slug: string, address: AddressInput & { label: string }) =>
    api.post<CustomerAddress>(`/api/v1/storefront/${slug}/customers/me/addresses`, address).then(r => r.data),

  updateAddress: (slug: string, id: string, address: Partial<AddressInput & { label: string }>) =>
    api.put<CustomerAddress>(`/api/v1/storefront/${slug}/customers/me/addresses/${id}`, address).then(r => r.data),

  deleteAddress: (slug: string, id: string) =>
    api.delete(`/api/v1/storefront/${slug}/customers/me/addresses/${id}`),

  resolveStore: () =>
    api.get<{ storeSlug: string }>('/api/v1/storefront/resolve').then(r => r.data),
};
