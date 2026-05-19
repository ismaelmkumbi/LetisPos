import { http, HttpResponse } from 'msw';
import { demoProducts } from '../demoProducts';

const BASE = 'http://localhost:8080/api/v1/storefront/:slug';

// ── In-memory state for demo mode ──
interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string | undefined;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}
let demoCart: { id: string; items: CartItem[] } = { id: 'demo-cart', items: [] };
let demoWishlist: Set<string> = new Set();

function cartResponse() {
  const subtotal = demoCart.items.reduce((sum, i) => sum + i.lineTotal, 0);
  return { id: demoCart.id, items: demoCart.items, subtotal, itemCount: demoCart.items.length };
}

/**
 * MSW handlers for commerce storefront API.
 * Supports full filtering, cart persistence, and auth.
 */
export const commerceStorefrontMocks = [
  // ── Theme ──
  http.get(`${BASE}/theme`, () =>
    HttpResponse.json({
      id: 'demo-theme', name: 'Demo Store', isActive: true,
      settings: {
        colors: { primary: '#1a1a2e', secondary: '#16213e', accent: '#ff6b35', background: '#ffffff', text: '#1a1a1a' },
        fonts: { heading: 'Outfit', body: 'Inter' },
        homepage: { heroLayout: 'fullwidth', featuredCount: 8 },
        header: { style: 'centered', sticky: true },
        footer: { style: 'three_column', showSocial: true },
        cssOverrides: '',
      },
    })
  ),

  // ── Banners ──
  http.get(`${BASE}/banners`, () =>
    HttpResponse.json([{
      id: 'demo-banner-hero', name: 'Hero Banner', location: 'hero',
      contentHtml: '<strong>Discover Amazing</strong><br/>Products Today',
      imageUrl: null, isActive: true, displayOrder: 0,
    }])
  ),

  // ── Featured Products ──
  http.get(`${BASE}/products/featured`, () =>
    HttpResponse.json(demoProducts.filter(p => p.isFeatured))
  ),

  // ── Products (with full filtering) ──
  http.get(`${BASE}/products`, ({ request }) => {
    const url = new URL(request.url);
    const categoryId = url.searchParams.get('categoryId');
    const search = url.searchParams.get('search');
    const sort = url.searchParams.get('sort') || '';
    const minPrice = parseFloat(url.searchParams.get('minPrice') || '');
    const maxPrice = parseFloat(url.searchParams.get('maxPrice') || '');
    const brandParam = url.searchParams.get('brand');
    const rating = parseFloat(url.searchParams.get('rating') || '');
    const inStock = url.searchParams.get('inStock') === 'true';
    const page = parseInt(url.searchParams.get('page') || '0', 10);
    const size = parseInt(url.searchParams.get('size') || '20', 10);

    let results = [...demoProducts];

    if (categoryId && categoryId !== 'all') {
      results = results.filter(p => p.category.id === categoryId || p.category.slug === categoryId);
    }
    if (search) {
      const q = search.toLowerCase();
      results = results.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.category.name.toLowerCase().includes(q));
    }
    if (!isNaN(minPrice)) results = results.filter(p => p.price.amount >= minPrice);
    if (!isNaN(maxPrice)) results = results.filter(p => p.price.amount <= maxPrice);
    if (brandParam) {
      const brands = brandParam.split(',').map(b => b.trim().toLowerCase());
      results = results.filter(p => p.brand?.name && brands.includes(p.brand.name.toLowerCase()));
    }
    if (!isNaN(rating)) results = results.filter(p => getProductRating(p.id) >= rating);
    if (inStock) results = results.filter(p => p.stock.status !== 'out_of_stock');

    switch (sort) {
      case 'newest': results.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); break;
      case 'priceAsc': results.sort((a, b) => a.price.amount - b.price.amount); break;
      case 'priceDesc': results.sort((a, b) => b.price.amount - a.price.amount); break;
      case 'name': results.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'discount': results.sort((a, b) => {
        const dA = a.compareAtPrice ? (1 - a.price.amount / a.compareAtPrice) : 0;
        const dB = b.compareAtPrice ? (1 - b.price.amount / b.compareAtPrice) : 0;
        return dB - dA;
      }); break;
    }

    const totalElements = results.length;
    const totalPages = Math.ceil(totalElements / size);
    const paginated = results.slice(page * size, page * size + size);

    return HttpResponse.json({ content: paginated, totalElements, totalPages });
  }),

  // ── Single Product ──
  http.get(`${BASE}/products/:id`, ({ params }) => {
    const product = demoProducts.find(p => p.id === params.id || p.slug === params.id);
    return product ? HttpResponse.json(product) : new HttpResponse(null, { status: 404 });
  }),

  // ── Categories ──
  http.get(`${BASE}/categories`, () =>
    HttpResponse.json([
      { id: 'cat-electronics', name: 'Electronics', slug: 'electronics', displayOrder: 1 },
      { id: 'cat-fashion', name: 'Fashion', slug: 'fashion', displayOrder: 2 },
      { id: 'cat-home', name: 'Home & Living', slug: 'home', displayOrder: 3 },
      { id: 'cat-sports', name: 'Sports & Outdoors', slug: 'sports', displayOrder: 4 },
    ])
  ),

  // ── Cart (in-memory, persists across navigation) ──
  http.get(`${BASE}/cart`, () => HttpResponse.json(cartResponse())),

  http.post(`${BASE}/cart/items`, async ({ request }) => {
    const body = await request.json() as { productId: string; quantity: number; variantData?: Record<string, string> };
    const product = demoProducts.find(p => p.id === body.productId);
    if (!product) return new HttpResponse(null, { status: 404 });

    const existing = demoCart.items.find(i => i.productId === body.productId);
    if (existing) {
      existing.quantity += body.quantity || 1;
      existing.lineTotal = existing.unitPrice * existing.quantity;
      return HttpResponse.json(existing);
    }

    const item: CartItem = {
      id: 'ci-' + Date.now(),
      productId: product.id,
      productName: product.name,
      productImage: product.images[0]?.url,
      quantity: body.quantity || 1,
      unitPrice: product.price.amount,
      lineTotal: product.price.amount * (body.quantity || 1),
    };
    demoCart.items.push(item);
    return HttpResponse.json(item);
  }),

  http.put(`${BASE}/cart/items/:itemId`, async ({ params, request }) => {
    const body = await request.json() as { quantity: number };
    const idx = demoCart.items.findIndex(i => i.id === params.itemId);
    if (idx === -1) return new HttpResponse(null, { status: 404 });
    if (body.quantity <= 0) {
      demoCart.items.splice(idx, 1);
      return HttpResponse.json({ removed: true });
    }
    demoCart.items[idx].quantity = body.quantity;
    demoCart.items[idx].lineTotal = demoCart.items[idx].unitPrice * body.quantity;
    return HttpResponse.json(demoCart.items[idx]);
  }),

  http.delete(`${BASE}/cart/items/:itemId`, ({ params }) => {
    demoCart.items = demoCart.items.filter(i => i.id !== params.itemId);
    return new HttpResponse(null, { status: 204 });
  }),

  // ── Search ──
  http.get(`${BASE}/search`, ({ request }) => {
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') || '').toLowerCase();
    const results = q
      ? demoProducts.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.category.name.toLowerCase().includes(q))
      : demoProducts;
    return HttpResponse.json({ content: results, totalElements: results.length });
  }),

  // ── Navigation ──
  http.get(`${BASE}/navigation`, () =>
    HttpResponse.json({
      header: { id: 'nav-header', location: 'header', items: [] },
      footer: { id: 'nav-footer', location: 'footer', items: [] },
    })
  ),

  // ── Checkout ──
  http.post(`${BASE}/checkout`, async () => {
    const orderNumber = 'DEMO-' + Math.floor(Math.random() * 90000 + 10000);
    const total = demoCart.items.reduce((sum, i) => sum + i.lineTotal, 0);
    demoCart = { id: 'demo-cart', items: [] }; // clear cart after order
    return HttpResponse.json({
      orderId: 'demo-order-' + Date.now(),
      orderNumber,
      status: 'CONFIRMED',
      total,
      currency: 'USD',
    });
  }),

  http.post(`${BASE}/checkout/shipping-rates`, () =>
    HttpResponse.json([
      { id: 'standard', name: 'Standard Shipping', type: 'flat_rate', amount: 5.00, minDays: 3, maxDays: 7, currency: 'USD' },
      { id: 'express', name: 'Express Shipping', type: 'flat_rate', amount: 15.00, minDays: 1, maxDays: 2, currency: 'USD' },
    ])
  ),

  // ── Pages ──
  http.get(`${BASE}/pages/:key`, ({ params }) =>
    HttpResponse.json({
      id: 'demo-page', key: params.key as string,
      title: (params.key as string).charAt(0).toUpperCase() + (params.key as string).slice(1),
      body: '<p>This is a demo page. Add your content here.</p>', isVisible: true,
    })
  ),

  // ── Customer Auth ──
  http.get(`${BASE}/customers/me`, () => new HttpResponse(null, { status: 401 })),

  http.post(`${BASE}/customers/register`, async ({ request }) => {
    const body = await request.json() as { firstName: string; lastName: string; email: string; password: string };
    return HttpResponse.json({
      token: 'demo-jwt-token',
      customer: {
        id: 'cust-' + Date.now(),
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
      },
    });
  }),

  http.post(`${BASE}/customers/login`, async ({ request }) => {
    const body = await request.json() as { email: string; password: string };
    return HttpResponse.json({
      token: 'demo-jwt-token',
      customer: {
        id: 'cust-demo',
        firstName: 'Demo',
        lastName: 'User',
        email: body.email,
      },
    });
  }),

  // ── Wishlist ──
  http.get(`${BASE}/wishlist`, () =>
    HttpResponse.json({ productIds: Array.from(demoWishlist) })
  ),

  http.post(`${BASE}/wishlist/:productId`, ({ params }) => {
    demoWishlist.add(params.productId as string);
    return HttpResponse.json({ added: true });
  }),

  http.delete(`${BASE}/wishlist/:productId`, ({ params }) => {
    demoWishlist.delete(params.productId as string);
    return new HttpResponse(null, { status: 204 });
  }),

  // ── Menu ──
  http.get('http://localhost:8080/api/v1/menu', () =>
    HttpResponse.json([
      { id: 'menu-dashboard', key: 'dashboard', label: 'Dashboard', icon: 'IconDashboard', route: '/dashboard', sectionHeader: false, children: [] },
      { id: 'menu-pos', key: 'pos', label: 'Point of Sale', icon: 'IconCashRegister', route: '/pos', sectionHeader: false, children: [] },
      { id: 'menu-inventory', key: 'inventory', label: 'Inventory', icon: 'IconPackages', route: '/inventory', sectionHeader: false, children: [] },
      { id: 'menu-accounting', key: 'accounting', label: 'Accounting', icon: 'IconCalculator', route: '/accounting', sectionHeader: false, children: [] },
      { id: 'menu-reports', key: 'reports', label: 'Reports', icon: 'IconReportAnalytics', route: '/reports', sectionHeader: false, children: [] },
      { id: 'menu-commerce', key: 'commerce', label: 'Commerce', icon: 'IconBuildingStore', route: '/commerce', sectionHeader: true, children: [
        { id: 'menu-commerce-dashboard', key: 'commerce-dashboard', label: 'Dashboard', icon: 'IconDashboard', route: '/commerce/dashboard', sectionHeader: false, children: [] },
        { id: 'menu-commerce-products', key: 'commerce-products', label: 'Products', icon: 'IconPackages', route: '/commerce/products', sectionHeader: false, children: [] },
      ]},
    ])
  ),
];

function getProductRating(productId: string): number {
  let hash = 0;
  for (let i = 0; i < productId.length; i++) { hash = ((hash << 5) - hash) + productId.charCodeAt(i); hash |= 0; }
  return 3.0 + (Math.abs(hash) % 21) / 10;
}
