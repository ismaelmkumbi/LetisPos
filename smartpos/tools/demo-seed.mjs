#!/usr/bin/env node

/**
 * Letis POS demo data seeder.
 *
 * Seeds realistic Tanzania retail data through the API gateway so backend
 * validation, service events, stock movements, payments, and reports stay in
 * sync. This script intentionally avoids direct database writes.
 *
 * Usage:
 *   SMARTPOS_API_BASE_URL=http://localhost:8080 \
 *   SMARTPOS_ADMIN_EMAIL=admin@smartpos.local \
 *   SMARTPOS_ADMIN_PASSWORD=Admin@12345 \
 *   node smartpos/tools/demo-seed.mjs
 */

const cfg = {
  baseUrl: process.env.SMARTPOS_API_BASE_URL ?? process.env.API_BASE_URL ?? 'http://localhost:8080',
  email: process.env.SMARTPOS_ADMIN_EMAIL ?? 'admin@smartpos.local',
  password: process.env.SMARTPOS_ADMIN_PASSWORD ?? 'Admin@12345',
  currency: process.env.SMARTPOS_DEMO_CURRENCY ?? 'TZS',
  runCode: process.env.SMARTPOS_DEMO_RUN_CODE ?? timestampCode(),
  productCount: intEnv('SMARTPOS_DEMO_PRODUCTS', 72),
  customerCount: intEnv('SMARTPOS_DEMO_CUSTOMERS', 45),
  supplierCount: intEnv('SMARTPOS_DEMO_SUPPLIERS', 18),
  purchaseCount: intEnv('SMARTPOS_DEMO_PURCHASES', 18),
  saleCount: intEnv('SMARTPOS_DEMO_SALES', 120),
  expenseCount: intEnv('SMARTPOS_DEMO_EXPENSES', 40),
  returnCount: intEnv('SMARTPOS_DEMO_RETURNS', 8),
};

let accessToken = '';

const state = {
  warehouses: [],
  accounts: [],
  categories: [],
  brands: [],
  units: [],
  products: [],
  customers: [],
  suppliers: [],
  purchases: [],
  sales: [],
  payments: [],
  expenses: [],
  returns: [],
};

const categoryNames = [
  'Fast Moving Consumer Goods',
  'Beverages',
  'Bakery',
  'Household Essentials',
  'Personal Care',
  'Electronics Accessories',
  'Stationery',
  'Mobile Money Services',
];

const brandNames = [
  'Azam', 'Bakhresa', 'MeTL', 'Kilimanjaro Fresh', 'Serengeti Choice',
  'Uhuru Goods', 'Mwanza Traders', 'Zanzibar Home', 'Dar Retail Co.',
  'Arusha Organics', 'Tanga Supplies', 'Letis Private Label',
];

const productTemplates = [
  ['Sukari Kilo 1kg', 2200, 2800], ['Mchele Mbeya 5kg', 11200, 14500],
  ['Unga wa Ngano 2kg', 3400, 4300], ['Unga wa Sembe 2kg', 2800, 3600],
  ['Mafuta ya Kupikia 1L', 4700, 6200], ['Chai Majani 250g', 2400, 3300],
  ['Kahawa Instant 100g', 6200, 8200], ['Maziwa UHT 1L', 2600, 3500],
  ['Maji 1.5L', 750, 1200], ['Soda 350ml', 850, 1200],
  ['Juisi 1L', 2600, 3600], ['Mkate Fresh', 1500, 2200],
  ['Sabuni ya Kufulia 1kg', 3600, 4800], ['Dawa ya Meno 100ml', 2500, 3800],
  ['Shampoo 250ml', 5200, 7200], ['Tissue Pack 10 rolls', 6200, 8500],
  ['Battery AA Pack', 3000, 4500], ['USB Cable Type-C', 6500, 10000],
  ['Notebook A4', 1800, 2800], ['Pen Blue Pack', 2200, 3500],
  ['Rice Cooker 1.8L', 42000, 62000], ['Kettle Electric', 28000, 42000],
  ['Headphones', 18000, 28000], ['Phone Charger', 12000, 18000],
];

const customerNames = [
  'Asha Mushi', 'Juma Mwinyi', 'Neema Joseph', 'Baraka Kessy', 'Grace Lema',
  'Hassan Said', 'Mariam Ally', 'Peter John', 'Rehema Massawe', 'Daudi Kimaro',
  'Fatma Omar', 'Emmanuel Mboya', 'Zawadi Charles', 'Moses Msuya', 'Halima Juma',
  'Salim Rashid', 'Agnes Paulo', 'Yusuf Abdallah', 'Rosemary George', 'Abel Sanga',
];

const supplierNames = [
  'Dar Wholesale Market', 'Kariakoo Distribution', 'Azam Logistics',
  'Mwanza Lake Suppliers', 'Arusha FMCG Depot', 'Tanga Packaging House',
  'Zanzibar Imports Ltd', 'Dodoma General Traders', 'Mbeya Fresh Foods',
  'Coast Mobile Accessories',
];

const cities = ['Dar es Salaam', 'Arusha', 'Mwanza', 'Dodoma', 'Mbeya', 'Tanga', 'Morogoro', 'Zanzibar'];

main().catch((err) => {
  console.error('\nSeed failed:', err.message);
  if (err.details) console.error(err.details);
  process.exit(1);
});

async function main() {
  banner('Letis POS demo data seed');
  console.log(`Gateway: ${cfg.baseUrl}`);
  console.log(`Currency: ${cfg.currency}`);
  console.log(`Run code: ${cfg.runCode}`);

  await login();
  await seedWarehouses();
  await seedAccounts();
  await seedCatalog();
  await seedParties();
  await seedInventory();
  await seedPurchases();
  await seedSales();
  await seedExpenses();
  await seedReturns();

  summary();
}

async function login() {
  section('Login');
  const data = await api('/api/v1/auth/login', {
    method: 'POST',
    body: { email: cfg.email, password: cfg.password },
    auth: false,
  });
  accessToken = data.accessToken;
  console.log(`Logged in as ${data.user?.email ?? cfg.email}`);
}

async function seedWarehouses() {
  section('Warehouses');

  const existing = await safeGet('/api/v1/warehouses', []);
  const demoWarehouses = [
    { code: `DAR-${cfg.runCode}`, name: `Demo Dar Main ${cfg.runCode}`, city: 'Dar es Salaam', country: 'Tanzania', phone: '+255 22 211 1000' },
    { code: `ARU-${cfg.runCode}`, name: `Demo Arusha Branch ${cfg.runCode}`, city: 'Arusha', country: 'Tanzania', phone: '+255 27 254 1000' },
    { code: `MWZ-${cfg.runCode}`, name: `Demo Mwanza Branch ${cfg.runCode}`, city: 'Mwanza', country: 'Tanzania', phone: '+255 28 250 1000' },
  ];

  state.warehouses = [...existing];
  for (const wh of demoWarehouses) {
    const created = await createOrFind({
      list: state.warehouses,
      matcher: (x) => x.code === wh.code || x.name === wh.name,
      create: () => api('/api/v1/warehouses', { method: 'POST', body: wh }),
    });
    pushUnique(state.warehouses, created, 'id');
  }

  console.log(`Warehouses available: ${state.warehouses.length}`);
}

async function seedAccounts() {
  section('Accounts');

  state.accounts = await safeGet('/api/v1/accounts', []);
  const required = [
    { name: `Demo Cash Drawer ${cfg.runCode}`, number: `CASH-${cfg.runCode}`, type: 'CASH', currency: cfg.currency, initialBalance: 1500000, notes: 'Demo cash drawer' },
    { name: `Demo M-Pesa Till ${cfg.runCode}`, number: `MPESA-${cfg.runCode}`, type: 'MOBILE_MONEY', currency: cfg.currency, initialBalance: 800000, notes: 'Demo mobile money account' },
    { name: `Demo Bank Account ${cfg.runCode}`, number: `BANK-${cfg.runCode}`, type: 'BANK', currency: cfg.currency, initialBalance: 5000000, notes: 'Demo bank settlement account' },
  ];

  for (const account of required) {
    const created = await createOrFind({
      list: state.accounts,
      matcher: (x) => x.number === account.number || x.name === account.name,
      create: () => api('/api/v1/accounts', { method: 'POST', body: account }),
    });
    pushUnique(state.accounts, created, 'id');
  }

  console.log(`Accounts available: ${state.accounts.length}`);
}

async function seedCatalog() {
  section('Catalog');

  state.units = await safeGet('/api/v1/units', []);
  if (!state.units.length) {
    const unit = await api('/api/v1/units', {
      method: 'POST',
      body: { name: 'Piece', shortName: 'pc', conversionFactor: 1 },
    });
    state.units.push(unit);
  }

  const existingCategories = await safeGet('/api/v1/categories', []);
  state.categories = [...existingCategories];
  for (const [idx, name] of categoryNames.entries()) {
    const body = {
      code: `DEMO-CAT-${cfg.runCode}-${idx + 1}`,
      name: `Demo ${name} ${cfg.runCode}`,
      description: 'Demo category for Tanzania retail POS testing',
    };
    const created = await createOrFind({
      list: state.categories,
      matcher: (x) => x.code === body.code || x.name === body.name,
      create: () => api('/api/v1/categories', { method: 'POST', body }),
    });
    pushUnique(state.categories, created, 'id');
  }

  const existingBrands = await safeGet('/api/v1/brands', []);
  state.brands = [...existingBrands];
  for (const [idx, name] of brandNames.entries()) {
    const body = {
      name: `Demo ${name} ${cfg.runCode}`,
      description: 'Demo brand for Letis POS sample inventory',
    };
    const created = await createOrFind({
      list: state.brands,
      matcher: (x) => x.name === body.name,
      create: () => api('/api/v1/brands', { method: 'POST', body }),
    });
    pushUnique(state.brands, created, 'id');
  }

  const existingProductsPage = await safeGet('/api/v1/products', { content: [] }, {
    params: { search: `DEMO-${cfg.runCode}`, size: Math.max(cfg.productCount, 100), sort: 'name,asc' },
  });
  state.products = [...(existingProductsPage.content ?? [])];

  for (let i = 0; i < cfg.productCount; i++) {
    const tpl = productTemplates[i % productTemplates.length];
    const suffix = i + 1;
    const product = {
      code: `DEMO-${cfg.runCode}-P${String(suffix).padStart(3, '0')}`,
      name: `${tpl[0]} Demo ${suffix}`,
      description: `Demo Tanzania retail product generated by Letis POS seed run ${cfg.runCode}`,
      categoryId: pick(state.categories).id,
      brandId: pick(state.brands).id,
      unitId: state.units[0].id,
      cost: moneyRound(tpl[1] * rand(0.9, 1.2)),
      price: moneyRound(tpl[2] * rand(0.95, 1.3)),
      taxMethod: 'INCLUSIVE',
      taxRate: [0, 0, 18][i % 3],
      stockAlert: int(8, 35),
      type: 'STANDARD',
      status: true,
      sellable: true,
      warrantyMonths: i % 9 === 0 ? 12 : undefined,
      trackSerial: i % 19 === 0,
    };

    const created = await createOrFind({
      list: state.products,
      matcher: (x) => x.code === product.code,
      create: () => api('/api/v1/products', { method: 'POST', body: product }),
    });
    pushUnique(state.products, created, 'id');
    progress(i + 1, cfg.productCount, 'products');
  }

  console.log(`\nProducts available: ${state.products.length}`);
}

async function seedParties() {
  section('Customers and suppliers');

  const customerPage = await safeGet('/api/v1/customers', { content: [] }, {
    params: { search: `DEMO-${cfg.runCode}`, size: Math.max(cfg.customerCount, 100), sort: 'name,asc' },
  });
  state.customers = [...(customerPage.content ?? [])];

  for (let i = 0; i < cfg.customerCount; i++) {
    const name = `${customerNames[i % customerNames.length]} Demo ${i + 1}`;
    const code = `DEMO-${cfg.runCode}-C${String(i + 1).padStart(3, '0')}`;
    const body = {
      code,
      name,
      email: `customer${i + 1}.${cfg.runCode}@example.co.tz`,
      phone: `+2557${String(10000000 + i * 137).slice(0, 8)}`,
      taxNumber: i % 5 === 0 ? `TIN-${cfg.runCode}-${1000 + i}` : undefined,
      address: `${int(1, 120)} Nyerere Road`,
      city: cities[i % cities.length],
      country: 'Tanzania',
      creditLimit: moneyRound(rand(100000, 2500000)),
      notes: 'Demo customer for Letis POS testing',
    };
    const created = await createOrFind({
      list: state.customers,
      matcher: (x) => x.code === code || x.email === body.email,
      create: () => api('/api/v1/customers', { method: 'POST', body }),
    });
    pushUnique(state.customers, created, 'id');
    progress(i + 1, cfg.customerCount, 'customers');
  }

  const supplierPage = await safeGet('/api/v1/suppliers', { content: [] }, {
    params: { search: `DEMO-${cfg.runCode}`, size: Math.max(cfg.supplierCount, 100), sort: 'name,asc' },
  });
  state.suppliers = [...(supplierPage.content ?? [])];

  for (let i = 0; i < cfg.supplierCount; i++) {
    const code = `DEMO-${cfg.runCode}-S${String(i + 1).padStart(3, '0')}`;
    const body = {
      code,
      name: `${supplierNames[i % supplierNames.length]} Demo ${i + 1}`,
      email: `supplier${i + 1}.${cfg.runCode}@example.co.tz`,
      phone: `+2556${String(20000000 + i * 193).slice(0, 8)}`,
      taxNumber: `SUP-TIN-${cfg.runCode}-${2000 + i}`,
      address: `${int(1, 80)} Market Street`,
      city: cities[(i + 2) % cities.length],
      country: 'Tanzania',
      notes: 'Demo supplier for replenishment testing',
    };
    const created = await createOrFind({
      list: state.suppliers,
      matcher: (x) => x.code === code || x.email === body.email,
      create: () => api('/api/v1/suppliers', { method: 'POST', body }),
    });
    pushUnique(state.suppliers, created, 'id');
    progress(i + 1, cfg.supplierCount, 'suppliers');
  }

  console.log(`\nCustomers: ${state.customers.length}; suppliers: ${state.suppliers.length}`);
}

async function seedInventory() {
  section('Inventory opening stock');

  const warehouse = state.warehouses[0];
  if (!warehouse) throw new Error('No warehouse available for inventory seed');

  const chunkSize = 20;
  for (let offset = 0; offset < state.products.length; offset += chunkSize) {
    const chunk = state.products.slice(offset, offset + chunkSize);
    const body = {
      warehouseId: warehouse.id,
      reason: 'DEMO_OPENING_STOCK',
      notes: `Opening stock for demo run ${cfg.runCode}`,
      lines: chunk.map((p) => ({
        productId: p.id,
        qtyDelta: int(35, 220),
      })),
    };
    await bestEffort(() => api('/api/v1/adjustments', { method: 'POST', body }), 'stock adjustment');
    progress(Math.min(offset + chunkSize, state.products.length), state.products.length, 'stock lines');
  }
  console.log('');
}

async function seedPurchases() {
  section('Purchases');

  if (!state.suppliers.length || !state.products.length) return;
  const warehouse = state.warehouses[0];

  for (let i = 0; i < cfg.purchaseCount; i++) {
    const supplier = pick(state.suppliers);
    const lines = sample(state.products, int(4, 10)).map((p) => ({
      productId: p.id,
      productName: p.name,
      productCode: p.code,
      unitPrice: p.cost,
      qty: int(8, 60),
      taxRate: p.taxRate ?? 0,
      taxMethod: 'INCLUSIVE',
    }));
    const body = {
      date: daysAgoIso(int(5, 90)),
      supplierId: supplier.id,
      warehouseId: warehouse.id,
      lines,
      discount: [0, 0, 25000, 50000][i % 4],
      shipping: [0, 10000, 20000, 35000][i % 4],
      currency: cfg.currency,
      exchangeRate: 1,
      notes: `Demo purchase ${i + 1} for replenishment history`,
    };

    const purchase = await bestEffort(() => api('/api/v1/purchases', { method: 'POST', body }), 'purchase create');
    if (purchase?.id) {
      state.purchases.push(purchase);
      const received = await bestEffort(() => api(`/api/v1/purchases/${purchase.id}/receive`, { method: 'POST' }), 'purchase receive');
      if (received) state.purchases[state.purchases.length - 1] = received;
    }
    progress(i + 1, cfg.purchaseCount, 'purchases');
  }
  console.log('');
}

async function seedSales() {
  section('POS sales and payments');

  const warehouse = state.warehouses[0];
  const cashAccount = state.accounts.find((a) => a.type === 'CASH') ?? state.accounts[0];
  const mpesaAccount = state.accounts.find((a) => a.type === 'MOBILE_MONEY') ?? cashAccount;
  if (!warehouse || !cashAccount || !state.products.length) throw new Error('Missing warehouse/account/products for sales seed');

  for (let i = 0; i < cfg.saleCount; i++) {
    const customer = i % 4 === 0 ? null : pick(state.customers);
    const items = sample(state.products, int(1, 5));
    const lines = items.map((p) => ({
      productId: p.id,
      productName: p.name,
      productCode: p.code,
      unitPrice: p.price,
      qty: int(1, i % 12 === 0 ? 8 : 4),
      discount: i % 11 === 0 ? 500 : 0,
      discountType: 'FIXED',
      taxRate: p.taxRate ?? 0,
      taxMethod: 'INCLUSIVE',
    }));

    const body = {
      date: daysAgoIso(int(0, 60)),
      customerId: customer?.id,
      warehouseId: warehouse.id,
      lines,
      discount: i % 14 === 0 ? 1000 : 0,
      shipping: 0,
      currency: cfg.currency,
      exchangeRate: 1,
      notes: `Demo POS sale ${i + 1}`,
      isPos: true,
    };

    const sale = await bestEffort(() => api('/api/v1/pos/sales', { method: 'POST', body }), 'POS sale');
    if (sale?.id) {
      state.sales.push(sale);
      const method = i % 3 === 0 ? 'MPESA' : 'CASH';
      const account = method === 'MPESA' ? mpesaAccount : cashAccount;
      const payment = await bestEffort(() => api('/api/v1/payments', {
        method: 'POST',
        body: {
          date: sale.date ?? body.date,
          referenceType: 'SALE',
          referenceId: sale.id,
          accountId: account.id,
          amount: sale.grandTotal ?? estimatedTotal(lines),
          currency: cfg.currency,
          method,
          externalRef: method === 'MPESA' ? `MPESA-${cfg.runCode}-${i + 1}` : undefined,
          notes: `Demo ${method} payment`,
        },
      }), 'record payment');
      if (payment) state.payments.push(payment);
    }
    progress(i + 1, cfg.saleCount, 'sales');
  }
  console.log('');
}

async function seedExpenses() {
  section('Expenses');

  const account = state.accounts.find((a) => a.type === 'CASH') ?? state.accounts[0];
  if (!account) return;

  const categories = await ensureExpenseCategories();
  const descriptions = [
    'Shop rent', 'Internet bundle', 'Security services', 'Packaging bags',
    'Transport to Kariakoo', 'Electricity token', 'Staff lunch', 'Minor repairs',
    'Cleaning supplies', 'POS paper rolls',
  ];

  for (let i = 0; i < cfg.expenseCount; i++) {
    const category = categories[i % categories.length];
    const expense = await bestEffort(() => api('/api/v1/expenses', {
      method: 'POST',
      body: {
        date: daysAgoIso(int(0, 60)),
        accountId: account.id,
        categoryId: category?.id,
        amount: moneyRound(rand(8000, 280000)),
        currency: cfg.currency,
        description: `${descriptions[i % descriptions.length]} ${cfg.runCode}`,
        notes: 'Demo operating expense',
      },
    }), 'expense');
    if (expense) state.expenses.push(expense);
    progress(i + 1, cfg.expenseCount, 'expenses');
  }
  console.log('');
}

async function seedReturns() {
  section('Returns');

  if (!state.sales.length) {
    const salesPage = await safeGet('/api/v1/sales', { content: [] }, {
      params: { status: 'CONFIRMED', page: 0, size: Math.max(cfg.returnCount * 4, 50), sort: 'date,desc' },
    });
    state.sales = salesPage.content ?? [];
  }

  const eligibleSales = state.sales.filter((s) => Array.isArray(s.lines) && s.lines.length > 0);
  for (let i = 0; i < Math.min(cfg.returnCount, eligibleSales.length); i++) {
    const sale = eligibleSales[i * 3] ?? eligibleSales[i];
    const line = sale.lines[0];
    if (!line) continue;
    const ret = await bestEffort(() => api(`/api/v1/sales/${sale.id}/returns`, {
      method: 'POST',
      body: {
        date: daysAgoIso(int(0, 14)),
        reason: 'Demo customer return / damaged item',
        lines: [{
          productId: line.productId,
          variantId: line.variantId ?? undefined,
          productName: line.productName,
          unitPrice: line.unitPrice,
          qty: 1,
        }],
      },
    }), 'sale return');
    if (ret) state.returns.push(ret);
    progress(i + 1, Math.min(cfg.returnCount, eligibleSales.length), 'returns');
  }
  console.log('');
}

async function ensureExpenseCategories() {
  let categories = await safeGet('/api/v1/expenses/categories', []);
  if (categories.length) return categories;

  const names = ['Rent', 'Utilities', 'Transport', 'Packaging', 'Staff Welfare', 'Repairs'];
  for (const name of names) {
    const category = await bestEffort(() => api('/api/v1/expenses/categories', {
      method: 'POST',
      body: { name: `Demo ${name} ${cfg.runCode}`, description: 'Demo expense category' },
    }), 'expense category');
    if (category) categories.push(category);
  }
  return categories;
}

async function api(path, opts = {}) {
  const method = opts.method ?? 'GET';
  const url = new URL(path, cfg.baseUrl);
  if (opts.params) {
    Object.entries(opts.params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    });
  }

  const headers = {
    Accept: 'application/json',
    ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
    ...(opts.auth === false ? {} : { Authorization: `Bearer ${accessToken}` }),
  };

  const res = await fetch(url, {
    method,
    headers,
    body: opts.body ? JSON.stringify(stripUndefined(opts.body)) : undefined,
  });

  const text = await res.text();
  const data = text ? tryJson(text) : null;
  if (!res.ok) {
    const err = new Error(`${method} ${url.pathname} failed (${res.status})`);
    err.details = typeof data === 'object' ? JSON.stringify(data, null, 2) : text;
    throw err;
  }
  return data;
}

async function safeGet(path, fallback, opts = {}) {
  try {
    return await api(path, opts);
  } catch (err) {
    console.warn(`Warning: ${path} not available yet (${err.message})`);
    return fallback;
  }
}

async function bestEffort(fn, label) {
  try {
    return await fn();
  } catch (err) {
    console.warn(`\nSkipped ${label}: ${err.message}`);
    if (process.env.SMARTPOS_DEMO_VERBOSE === 'true' && err.details) console.warn(err.details);
    return null;
  }
}

async function createOrFind({ list, matcher, create }) {
  const found = list.find(matcher);
  if (found) return found;
  try {
    return await create();
  } catch (err) {
    const refound = list.find(matcher);
    if (refound) return refound;
    throw err;
  }
}

function summary() {
  section('Seed summary');
  console.table({
    warehouses: state.warehouses.length,
    accounts: state.accounts.length,
    categories: state.categories.length,
    brands: state.brands.length,
    units: state.units.length,
    products: state.products.length,
    customers: state.customers.length,
    suppliers: state.suppliers.length,
    purchases: state.purchases.length,
    sales: state.sales.length,
    payments: state.payments.length,
    expenses: state.expenses.length,
    returns: state.returns.length,
  });
  console.log('\nOpen the frontend dashboard and POS terminal to review realistic data.');
}

function intEnv(name, fallback) {
  const value = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function timestampCode() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function daysAgoIso(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function tryJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function stripUndefined(value) {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, stripUndefined(v)]),
  );
}

function pick(items) {
  if (!items.length) throw new Error('Cannot pick from empty collection');
  return items[int(0, items.length - 1)];
}

function sample(items, count) {
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, items.length));
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function int(min, max) {
  return Math.floor(rand(min, max + 1));
}

function moneyRound(value) {
  return Math.round(value / 100) * 100;
}

function estimatedTotal(lines) {
  return lines.reduce((sum, line) => sum + (line.unitPrice * line.qty), 0);
}

function banner(text) {
  console.log(`\n${'='.repeat(text.length + 4)}\n  ${text}\n${'='.repeat(text.length + 4)}`);
}

function section(text) {
  console.log(`\n-- ${text} --`);
}

function progress(done, total, label) {
  if (total <= 0) return;
  const every = Math.max(1, Math.floor(total / 10));
  if (done === total || done % every === 0) {
    process.stdout.write(`\r${label}: ${done}/${total}`);
  }
}

function pushUnique(items, item, key) {
  if (!item) return items.length;
  if (!items.some((existing) => existing?.[key] === item?.[key])) items.push(item);
  return items.length;
}
