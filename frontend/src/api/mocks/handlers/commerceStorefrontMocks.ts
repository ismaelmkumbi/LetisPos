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
      { id: 'section-dashboard', key: 'section-dashboard', label: 'Home', icon: null, route: null, sectionHeader: true, children: [
        { id: 'menu-dashboard', key: 'menu-dashboard', label: 'Dashboard', icon: 'layout-dashboard', route: '/smartpos/dashboard', sectionHeader: false, children: [] },
      ]},
      { id: 'section-sales', key: 'section-sales', label: 'Sales Desk', icon: null, route: null, sectionHeader: true, children: [
        { id: 'menu-pos', key: 'menu-pos', label: 'Point of Sale', icon: 'cash-register', route: '/smartpos/sales/pos', sectionHeader: false, children: [] },
        { id: 'menu-sales', key: 'menu-sales', label: 'Sales', icon: 'shopping-cart', route: '/smartpos/sales', sectionHeader: false, children: [] },
      ]},
      { id: 'section-products', key: 'section-products', label: 'Products', icon: null, route: null, sectionHeader: true, children: [
        { id: 'menu-products', key: 'menu-products', label: 'Products', icon: 'package', route: '/smartpos/products', sectionHeader: false, children: [] },
        { id: 'menu-categories', key: 'menu-categories', label: 'Categories', icon: 'category', route: '/smartpos/products/categories', sectionHeader: false, children: [] },
      ]},
      { id: 'section-stock', key: 'section-stock', label: 'Stock Management', icon: null, route: null, sectionHeader: true, children: [
        { id: 'menu-stock', key: 'menu-stock', label: 'Stock', icon: 'boxes', route: '/smartpos/stock', sectionHeader: false, children: [] },
      ]},
      { id: 'section-purchasing', key: 'section-purchasing', label: 'Purchasing', icon: null, route: null, sectionHeader: true, children: [
        { id: 'menu-purchases', key: 'menu-purchases', label: 'Purchases', icon: 'truck', route: '/smartpos/purchases', sectionHeader: false, children: [] },
      ]},
      { id: 'section-customers', key: 'section-customers', label: 'Customers & Suppliers', icon: null, route: null, sectionHeader: true, children: [
        { id: 'menu-customers', key: 'menu-customers', label: 'Customers', icon: 'users', route: '/smartpos/customers', sectionHeader: false, children: [] },
        { id: 'menu-suppliers', key: 'menu-suppliers', label: 'Suppliers', icon: 'truck-delivery', route: '/smartpos/suppliers', sectionHeader: false, children: [] },
      ]},
      { id: 'section-finance', key: 'section-finance', label: 'Finance', icon: null, route: null, sectionHeader: true, children: [
        { id: 'menu-payments', key: 'menu-payments', label: 'Payments', icon: 'cash', route: '/smartpos/payments', sectionHeader: false, children: [] },
        { id: 'menu-accounting', key: 'menu-accounting', label: 'Accounting', icon: 'calculator', route: '/smartpos/accounting/chart-of-accounts', sectionHeader: false, children: [] },
      ]},
      { id: 'section-reports', key: 'section-reports', label: 'Reports', icon: null, route: null, sectionHeader: true, children: [
        { id: 'menu-reports', key: 'menu-reports', label: 'Reports', icon: 'chart-bar', route: '/smartpos/reports/advanced', sectionHeader: false, children: [] },
      ]},
      { id: 'section-marketing', key: 'section-marketing', label: 'Marketing', icon: null, route: null, sectionHeader: true, children: [
        { id: 'menu-marketing', key: 'menu-marketing', label: 'Marketing', icon: 'megaphone', route: '/smartpos/marketing/promotions', sectionHeader: false, children: [] },
      ]},
      { id: 'section-hrm', key: 'section-hrm', label: 'HR & Payroll', icon: null, route: null, sectionHeader: true, children: [
        { id: 'menu-hrm', key: 'menu-hrm', label: 'HR & Payroll', icon: 'users-group', route: '/smartpos/hrm/employees', sectionHeader: false, children: [] },
      ]},
      { id: 'section-crm', key: 'section-crm', label: 'CRM', icon: null, route: null, sectionHeader: true, children: [
        { id: 'menu-crm', key: 'menu-crm', label: 'CRM', icon: 'address-book', route: '/smartpos/crm/leads', sectionHeader: false, children: [] },
      ]},
      { id: 'section-ecommerce', key: 'section-ecommerce', label: 'E-Commerce', icon: null, route: null, sectionHeader: true, children: [
        { id: 'menu-ecommerce', key: 'menu-ecommerce', label: 'E-Commerce', icon: 'world', route: '/smartpos/admin/commerce', sectionHeader: false, children: [] },
      ]},
      { id: 'section-ai', key: 'section-ai', label: 'AI & Insights', icon: null, route: null, sectionHeader: true, children: [
        { id: 'menu-ai', key: 'menu-ai', label: 'AI Insights', icon: 'brain', route: '/smartpos/ai', sectionHeader: false, children: [] },
      ]},
      { id: 'section-admin', key: 'section-admin', label: 'Settings & Admin', icon: null, route: null, sectionHeader: true, children: [
        { id: 'menu-settings', key: 'menu-settings', label: 'Settings', icon: 'settings', route: '/smartpos/settings/i18n', sectionHeader: false, children: [] },
        { id: 'menu-features', key: 'menu-features', label: 'Feature Manager', icon: 'adjustments-alt', route: '/smartpos/admin/features', sectionHeader: false, children: [] },
      ]},
      { id: 'section-support', key: 'section-support', label: 'Support', icon: null, route: null, sectionHeader: true, children: [
        { id: 'menu-support', key: 'menu-support', label: 'Support', icon: 'help-circle', route: '/smartpos/support/help', sectionHeader: false, children: [] },
      ]},
    ])
  ),

  // ── Feature & Menu Admin ──
  http.get('http://localhost:8080/api/v1/admin/features', () =>
    HttpResponse.json([
      { id: 'f001', key: 'pos.use', label: 'POS Terminal Access', description: 'Access the POS terminal', category: 'SALES', active: true, sortOrder: 1 },
      { id: 'f002', key: 'sale.view', label: 'View Sales', description: null, category: 'SALES', active: true, sortOrder: 2 },
      { id: 'f003', key: 'sale.create', label: 'Create Sales', description: null, category: 'SALES', active: true, sortOrder: 3 },
      { id: 'f004', key: 'sale.return', label: 'Sales Returns', description: null, category: 'SALES', active: true, sortOrder: 4 },
      { id: 'f005', key: 'product.view', label: 'View Products', description: null, category: 'PRODUCTS', active: true, sortOrder: 5 },
      { id: 'f006', key: 'product.create', label: 'Create Products', description: null, category: 'PRODUCTS', active: true, sortOrder: 6 },
      { id: 'f007', key: 'category.manage', label: 'Manage Categories', description: null, category: 'PRODUCTS', active: true, sortOrder: 7 },
      { id: 'f008', key: 'stock.view', label: 'View Stock', description: null, category: 'STOCK', active: true, sortOrder: 8 },
      { id: 'f009', key: 'stock.transfer', label: 'Stock Transfers', description: null, category: 'STOCK', active: true, sortOrder: 9 },
      { id: 'f010', key: 'purchase.view', label: 'View Purchases', description: null, category: 'PURCHASING', active: true, sortOrder: 10 },
      { id: 'f011', key: 'purchase.create', label: 'Create Purchases', description: null, category: 'PURCHASING', active: true, sortOrder: 11 },
      { id: 'f012', key: 'purchase.return', label: 'Purchase Returns', description: null, category: 'PURCHASING', active: true, sortOrder: 12 },
      { id: 'f013', key: 'payment.view', label: 'View Payments', description: null, category: 'FINANCE', active: true, sortOrder: 13 },
      { id: 'f014', key: 'payment.record', label: 'Record Payments', description: null, category: 'FINANCE', active: true, sortOrder: 14 },
      { id: 'f015', key: 'payment.refund', label: 'Refund Payments', description: null, category: 'FINANCE', active: true, sortOrder: 15 },
      { id: 'f016', key: 'account.manage', label: 'Manage Accounts', description: null, category: 'FINANCE', active: true, sortOrder: 16 },
      { id: 'f017', key: 'expense.manage', label: 'Manage Expenses', description: null, category: 'FINANCE', active: true, sortOrder: 17 },
      { id: 'f018', key: 'accounting.module', label: 'Accounting Module', description: null, category: 'FINANCE', active: true, sortOrder: 18 },
      { id: 'f019', key: 'hrm.module', label: 'HR & Payroll Module', description: null, category: 'HRM', active: true, sortOrder: 19 },
      { id: 'f020', key: 'hrm.view', label: 'View HR', description: null, category: 'HRM', active: true, sortOrder: 20 },
      { id: 'f021', key: 'hrm.manage', label: 'Manage HR', description: null, category: 'HRM', active: true, sortOrder: 21 },
      { id: 'f022', key: 'hrm.attendance.write', label: 'Write Attendance', description: null, category: 'HRM', active: true, sortOrder: 22 },
      { id: 'f023', key: 'hrm.leave.request', label: 'Request Leave', description: null, category: 'HRM', active: true, sortOrder: 23 },
      { id: 'f024', key: 'hrm.leave.approve', label: 'Approve Leave', description: null, category: 'HRM', active: true, sortOrder: 24 },
      { id: 'f025', key: 'hrm.payroll.view', label: 'View Payroll', description: null, category: 'HRM', active: true, sortOrder: 25 },
      { id: 'f026', key: 'hrm.payroll.manage', label: 'Manage Payroll', description: null, category: 'HRM', active: true, sortOrder: 26 },
      { id: 'f027', key: 'crm.module', label: 'CRM Module', description: null, category: 'CRM', active: true, sortOrder: 27 },
      { id: 'f028', key: 'marketing.module', label: 'Marketing Module', description: null, category: 'MARKETING', active: true, sortOrder: 28 },
      { id: 'f029', key: 'ai.module', label: 'AI & Insights Module', description: null, category: 'AI', active: true, sortOrder: 29 },
      { id: 'f030', key: 'ai.insight', label: 'AI Insights', description: null, category: 'AI', active: true, sortOrder: 30 },
      { id: 'f031', key: 'ai.chat', label: 'AI Chat', description: null, category: 'AI', active: true, sortOrder: 31 },
      { id: 'f032', key: 'admin', label: 'Admin Access', description: null, category: 'ADMIN', active: true, sortOrder: 32 },
      { id: 'f033', key: 'user.view', label: 'View Users', description: null, category: 'ADMIN', active: true, sortOrder: 33 },
      { id: 'f034', key: 'role.manage', label: 'Manage Roles', description: null, category: 'ADMIN', active: true, sortOrder: 34 },
      { id: 'f035', key: 'billing.manage', label: 'Manage Billing', description: null, category: 'ADMIN', active: true, sortOrder: 35 },
      { id: 'f036', key: 'audit.view', label: 'View Audit Logs', description: null, category: 'ADMIN', active: true, sortOrder: 36 },
      { id: 'f037', key: 'session.manage', label: 'Manage Sessions', description: null, category: 'ADMIN', active: true, sortOrder: 37 },
      { id: 'f038', key: 'integration.module', label: 'Integration Module', description: null, category: 'INTEGRATIONS', active: true, sortOrder: 38 },
      { id: 'f039', key: 'integration.woo', label: 'WooCommerce', description: null, category: 'INTEGRATIONS', active: true, sortOrder: 39 },
      { id: 'f040', key: 'report.sales', label: 'Sales Reports', description: null, category: 'REPORTS', active: true, sortOrder: 40 },
      { id: 'f041', key: 'report.financial', label: 'Financial Reports', description: null, category: 'REPORTS', active: true, sortOrder: 41 },
      { id: 'f042', key: 'report.custom', label: 'Custom Reports', description: null, category: 'REPORTS', active: true, sortOrder: 42 },
      { id: 'f043', key: 'notification.view', label: 'View Notifications', description: null, category: 'NOTIFICATIONS', active: true, sortOrder: 43 },
      { id: 'f044', key: 'notification.send', label: 'Send Notifications', description: null, category: 'NOTIFICATIONS', active: true, sortOrder: 44 },
    ])
  ),

  http.get('http://localhost:8080/api/v1/admin/features/assignments', () =>
    HttpResponse.json([
      // STARTER plan features
      { id: 'a001', featureKey: 'pos.use', assignmentLevel: 'PLAN', targetId: 'STARTER', granted: true, createdBy: null, createdAt: '2026-05-19T00:00:00Z' },
      { id: 'a002', featureKey: 'sale.view', assignmentLevel: 'PLAN', targetId: 'STARTER', granted: true, createdBy: null, createdAt: '2026-05-19T00:00:00Z' },
      { id: 'a003', featureKey: 'sale.create', assignmentLevel: 'PLAN', targetId: 'STARTER', granted: true, createdBy: null, createdAt: '2026-05-19T00:00:00Z' },
      { id: 'a004', featureKey: 'sale.return', assignmentLevel: 'PLAN', targetId: 'STARTER', granted: true, createdBy: null, createdAt: '2026-05-19T00:00:00Z' },
      { id: 'a005', featureKey: 'product.view', assignmentLevel: 'PLAN', targetId: 'STARTER', granted: true, createdBy: null, createdAt: '2026-05-19T00:00:00Z' },
      { id: 'a006', featureKey: 'product.create', assignmentLevel: 'PLAN', targetId: 'STARTER', granted: true, createdBy: null, createdAt: '2026-05-19T00:00:00Z' },
      { id: 'a007', featureKey: 'category.manage', assignmentLevel: 'PLAN', targetId: 'STARTER', granted: true, createdBy: null, createdAt: '2026-05-19T00:00:00Z' },
      { id: 'a008', featureKey: 'stock.view', assignmentLevel: 'PLAN', targetId: 'STARTER', granted: true, createdBy: null, createdAt: '2026-05-19T00:00:00Z' },
      { id: 'a009', featureKey: 'stock.transfer', assignmentLevel: 'PLAN', targetId: 'STARTER', granted: true, createdBy: null, createdAt: '2026-05-19T00:00:00Z' },
      { id: 'a010', featureKey: 'payment.view', assignmentLevel: 'PLAN', targetId: 'STARTER', granted: true, createdBy: null, createdAt: '2026-05-19T00:00:00Z' },
      { id: 'a011', featureKey: 'payment.record', assignmentLevel: 'PLAN', targetId: 'STARTER', granted: true, createdBy: null, createdAt: '2026-05-19T00:00:00Z' },
      { id: 'a012', featureKey: 'report.sales', assignmentLevel: 'PLAN', targetId: 'STARTER', granted: true, createdBy: null, createdAt: '2026-05-19T00:00:00Z' },
      { id: 'a013', featureKey: 'notification.view', assignmentLevel: 'PLAN', targetId: 'STARTER', granted: true, createdBy: null, createdAt: '2026-05-19T00:00:00Z' },
      // BUSINESS additions
      { id: 'a014', featureKey: 'purchase.view', assignmentLevel: 'PLAN', targetId: 'BUSINESS', granted: true, createdBy: null, createdAt: '2026-05-19T00:00:00Z' },
      { id: 'a015', featureKey: 'purchase.create', assignmentLevel: 'PLAN', targetId: 'BUSINESS', granted: true, createdBy: null, createdAt: '2026-05-19T00:00:00Z' },
      { id: 'a016', featureKey: 'purchase.return', assignmentLevel: 'PLAN', targetId: 'BUSINESS', granted: true, createdBy: null, createdAt: '2026-05-19T00:00:00Z' },
      { id: 'a017', featureKey: 'payment.refund', assignmentLevel: 'PLAN', targetId: 'BUSINESS', granted: true, createdBy: null, createdAt: '2026-05-19T00:00:00Z' },
      { id: 'a018', featureKey: 'account.manage', assignmentLevel: 'PLAN', targetId: 'BUSINESS', granted: true, createdBy: null, createdAt: '2026-05-19T00:00:00Z' },
      { id: 'a019', featureKey: 'expense.manage', assignmentLevel: 'PLAN', targetId: 'BUSINESS', granted: true, createdBy: null, createdAt: '2026-05-19T00:00:00Z' },
      { id: 'a020', featureKey: 'accounting.module', assignmentLevel: 'PLAN', targetId: 'BUSINESS', granted: true, createdBy: null, createdAt: '2026-05-19T00:00:00Z' },
      { id: 'a021', featureKey: 'marketing.module', assignmentLevel: 'PLAN', targetId: 'BUSINESS', granted: true, createdBy: null, createdAt: '2026-05-19T00:00:00Z' },
      // PROFESSIONAL additions
      { id: 'a022', featureKey: 'hrm.module', assignmentLevel: 'PLAN', targetId: 'PROFESSIONAL', granted: true, createdBy: null, createdAt: '2026-05-19T00:00:00Z' },
      { id: 'a023', featureKey: 'hrm.view', assignmentLevel: 'PLAN', targetId: 'PROFESSIONAL', granted: true, createdBy: null, createdAt: '2026-05-19T00:00:00Z' },
      { id: 'a024', featureKey: 'hrm.manage', assignmentLevel: 'PLAN', targetId: 'PROFESSIONAL', granted: true, createdBy: null, createdAt: '2026-05-19T00:00:00Z' },
      { id: 'a025', featureKey: 'hrm.attendance.write', assignmentLevel: 'PLAN', targetId: 'PROFESSIONAL', granted: true, createdBy: null, createdAt: '2026-05-19T00:00:00Z' },
      { id: 'a026', featureKey: 'hrm.leave.request', assignmentLevel: 'PLAN', targetId: 'PROFESSIONAL', granted: true, createdBy: null, createdAt: '2026-05-19T00:00:00Z' },
      { id: 'a027', featureKey: 'hrm.leave.approve', assignmentLevel: 'PLAN', targetId: 'PROFESSIONAL', granted: true, createdBy: null, createdAt: '2026-05-19T00:00:00Z' },
      { id: 'a028', featureKey: 'hrm.payroll.view', assignmentLevel: 'PLAN', targetId: 'PROFESSIONAL', granted: true, createdBy: null, createdAt: '2026-05-19T00:00:00Z' },
      { id: 'a029', featureKey: 'hrm.payroll.manage', assignmentLevel: 'PLAN', targetId: 'PROFESSIONAL', granted: true, createdBy: null, createdAt: '2026-05-19T00:00:00Z' },
      { id: 'a030', featureKey: 'crm.module', assignmentLevel: 'PLAN', targetId: 'PROFESSIONAL', granted: true, createdBy: null, createdAt: '2026-05-19T00:00:00Z' },
      { id: 'a031', featureKey: 'ai.module', assignmentLevel: 'PLAN', targetId: 'PROFESSIONAL', granted: true, createdBy: null, createdAt: '2026-05-19T00:00:00Z' },
      { id: 'a032', featureKey: 'ai.insight', assignmentLevel: 'PLAN', targetId: 'PROFESSIONAL', granted: true, createdBy: null, createdAt: '2026-05-19T00:00:00Z' },
      { id: 'a033', featureKey: 'ai.chat', assignmentLevel: 'PLAN', targetId: 'PROFESSIONAL', granted: true, createdBy: null, createdAt: '2026-05-19T00:00:00Z' },
      { id: 'a034', featureKey: 'integration.module', assignmentLevel: 'PLAN', targetId: 'PROFESSIONAL', granted: true, createdBy: null, createdAt: '2026-05-19T00:00:00Z' },
      { id: 'a035', featureKey: 'integration.woo', assignmentLevel: 'PLAN', targetId: 'PROFESSIONAL', granted: true, createdBy: null, createdAt: '2026-05-19T00:00:00Z' },
      { id: 'a036', featureKey: 'audit.view', assignmentLevel: 'PLAN', targetId: 'PROFESSIONAL', granted: true, createdBy: null, createdAt: '2026-05-19T00:00:00Z' },
      { id: 'a037', featureKey: 'session.manage', assignmentLevel: 'PLAN', targetId: 'PROFESSIONAL', granted: true, createdBy: null, createdAt: '2026-05-19T00:00:00Z' },
      { id: 'a038', featureKey: 'notification.send', assignmentLevel: 'PLAN', targetId: 'PROFESSIONAL', granted: true, createdBy: null, createdAt: '2026-05-19T00:00:00Z' },
      // ENTERPRISE additions
      { id: 'a039', featureKey: 'admin', assignmentLevel: 'PLAN', targetId: 'ENTERPRISE', granted: true, createdBy: null, createdAt: '2026-05-19T00:00:00Z' },
      { id: 'a040', featureKey: 'role.manage', assignmentLevel: 'PLAN', targetId: 'ENTERPRISE', granted: true, createdBy: null, createdAt: '2026-05-19T00:00:00Z' },
      { id: 'a041', featureKey: 'billing.manage', assignmentLevel: 'PLAN', targetId: 'ENTERPRISE', granted: true, createdBy: null, createdAt: '2026-05-19T00:00:00Z' },
      { id: 'a042', featureKey: 'report.custom', assignmentLevel: 'PLAN', targetId: 'ENTERPRISE', granted: true, createdBy: null, createdAt: '2026-05-19T00:00:00Z' },
    ])
  ),

  http.post('http://localhost:8080/api/v1/admin/features/assignments', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      id: 'a-new-' + Date.now(),
      featureKey: body.featureKey,
      assignmentLevel: body.assignmentLevel,
      targetId: body.targetId,
      granted: body.granted ?? true,
      createdBy: null,
      createdAt: new Date().toISOString(),
    }, { status: 201 });
  }),

  http.delete('http://localhost:8080/api/v1/admin/features/assignments/:id', () =>
    new HttpResponse(null, { status: 204 })
  ),
];

function getProductRating(productId: string): number {
  let hash = 0;
  for (let i = 0; i < productId.length; i++) { hash = ((hash << 5) - hash) + productId.charCodeAt(i); hash |= 0; }
  return 3.0 + (Math.abs(hash) % 21) / 10;
}
