// ── Store ──
export interface Store {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  status: 'inactive' | 'active' | 'maintenance';
  contactEmail?: string;
  contactPhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  currency: string;
  timezone: string;
  taxDisplay: 'inclusive' | 'exclusive';
  socialFacebook?: string;
  socialInstagram?: string;
  socialTwitter?: string;
  orderPrefix: string;
}

export interface UpdateStoreRequest {
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  currency?: string;
  timezone?: string;
  taxDisplay?: string;
  socialFacebook?: string;
  socialInstagram?: string;
  socialTwitter?: string;
  orderPrefix?: string;
}

// ── Published Product ──
export interface PublishedProduct {
  id: string;
  storeId: string;
  productId: string;
  slug: string;
  metaTitle?: string;
  metaDescription?: string;
  ogImageUrl?: string;
  galleryUrls?: string[];
  isFeatured: boolean;
  displayOrder: number;
  customPrice?: number;
  publishedAt: string;
  unpublishedAt?: string;
}

export interface PublishProductRequest {
  productId: string;
  slug?: string;
  metaTitle?: string;
  metaDescription?: string;
  ogImageUrl?: string;
  galleryUrls?: string[];
  featured?: boolean;
  displayOrder?: number;
  customPrice?: number;
}

// ── Storefront Product (composite response) ──
export interface StorefrontProduct {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: { amount: number; currency: string; display: string };
  compareAtPrice?: number;
  images: { url: string; alt: string; width: number; height: number }[];
  variants: { name: string; values: string[] }[];
  category: { id: string; name: string; slug: string };
  brand?: { id: string; name: string };
  stock: { status: 'in_stock' | 'low_stock' | 'out_of_stock'; quantity: number };
  isFeatured: boolean;
  seo: { title: string; description: string };
  createdAt: string;
}

// ── Cart ──
export interface Cart {
  id: string;
  items: CartItem[];
  subtotal: number;
  itemCount: number;
}

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  variantData?: Record<string, string>;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface AddToCartRequest {
  productId: string;
  variantData?: Record<string, string>;
  quantity: number;
}

// ── Checkout ──
export interface CheckoutRequest {
  cartId: string;
  shippingAddress: AddressInput;
  billingAddress: AddressInput;
  billingSameAsShipping: boolean;
  shippingMethod: string;
  customerNotes?: string;
}

export interface AddressInput {
  firstName: string;
  lastName: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  phone?: string;
}

export interface ShippingRate {
  id: string;
  name: string;
  type: 'flat_rate' | 'free' | 'weight_based';
  amount: number;
  minDays: number;
  maxDays: number;
  currency: string;
}

export interface CheckoutResponse {
  orderId: string;
  orderNumber: string;
  status: string;
  total: number;
  currency: string;
}

// ── Customer ──
export interface CustomerAuthResponse {
  accessToken: string;
  customerId: string;
  name: string;
  email: string;
}

export interface CustomerProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

export interface CustomerAddress {
  id: string;
  label: string;
  firstName: string;
  lastName: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  phone?: string;
  isDefault: boolean;
}

// ── Theme ──
export interface ThemeSettings {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  fonts: { heading: string; body: string };
  homepage: { heroLayout: string; featuredCount: number };
  header: { style: string; sticky: boolean };
  footer: { style: string; showSocial: boolean };
  cssOverrides: string;
}

export interface Theme {
  id: string;
  name: string;
  settings: ThemeSettings;
  isActive: boolean;
}

// ── Navigation ──
export interface NavigationItem {
  label: string;
  type: 'page' | 'category' | 'link';
  pageKey?: string;
  categoryId?: string;
  url?: string;
  order: number;
  children?: NavigationItem[];
}

export interface NavigationMenu {
  id: string;
  location: 'header' | 'footer' | 'mobile';
  items: NavigationItem[];
}

// ── CMS Pages ──
export interface StorePage {
  id: string;
  key: string;
  title: string;
  body: string;
  metaTitle?: string;
  metaDescription?: string;
  isVisible: boolean;
}

// ── Shipping Zone ──
export interface ShippingRateConfig {
  type: 'flat_rate' | 'free' | 'weight_based';
  name: string;
  amount?: number;
  minOrder?: number;
  minDays?: number;
  maxDays?: number;
  ranges?: { maxWeightKg: number; amount: number }[];
}

export interface ShippingZone {
  id: string;
  name: string;
  countries: string[];
  regions?: string[];
  rates: ShippingRateConfig[];
  isActive: boolean;
}

// ── Banners ──
export interface MarketingBanner {
  id: string;
  name: string;
  location: 'hero' | 'announcement_bar' | 'promo_grid' | 'product_page';
  contentHtml?: string;
  imageUrl?: string;
  linkUrl?: string;
  backgroundColor?: string;
  isActive: boolean;
  startsAt?: string;
  endsAt?: string;
  displayOrder: number;
}

// ── SEO ──
export interface SeoDefaults {
  id: string;
  siteTitle: string;
  siteDescription: string;
  ogImageUrl?: string;
  twitterHandle?: string;
  googleAnalyticsId?: string;
  googleSiteVerification?: string;
}

// ── Domain ──
export interface CustomDomain {
  id: string;
  domain: string;
  isVerified: boolean;
  verificationCode?: string;
  sslStatus: 'pending' | 'active' | 'error';
}

// ── Analytics ──
export interface CommerceSummary {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  conversionRate: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  totalSold: number;
  totalRevenue: number;
}

export interface OrdersOverTime {
  date: string;
  count: number;
  revenue: number;
}
