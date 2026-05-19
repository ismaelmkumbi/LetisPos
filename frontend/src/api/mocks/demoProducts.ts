import type { StorefrontProduct } from '../../types/commerce';

/**
 * Demo product catalog with real Unsplash images.
 * Used to preview the storefront without a running backend.
 */

const unsplash = (id: string, w = 600) =>
  `https://images.unsplash.com/${id}?w=${w}&fit=crop&auto=format`;

export const demoProducts: StorefrontProduct[] = [
  {
    id: 'demo-prod-001',
    slug: 'wireless-bluetooth-headphones',
    name: 'Wireless Bluetooth Headphones',
    description:
      '<p>Premium sound quality with active noise cancellation. These over-ear headphones deliver deep bass, crystal-clear highs, and up to <strong>40 hours</strong> of battery life. Features Bluetooth 5.3, multipoint connection, and a comfortable memory-foam design.</p><ul><li>Active Noise Cancellation (ANC)</li><li>40-hour battery life</li><li>Bluetooth 5.3 with multipoint</li><li>Built-in microphone for calls</li><li>Foldable design with carrying case</li></ul>',
    price: { amount: 89.99, currency: 'USD', display: '$89.99' },
    compareAtPrice: 149.99,
    images: [
      { url: unsplash('photo-1505740420928-5e560c06d30e'), alt: 'Wireless headphones on table', width: 600, height: 600 },
      { url: unsplash('photo-1583394838336-acd977736f90'), alt: 'Headphones side view', width: 600, height: 600 },
      { url: unsplash('photo-1487215078519-e21cc028cb29'), alt: 'Headphones lifestyle', width: 600, height: 600 },
    ],
    variants: [
      { name: 'Color', values: ['Matte Black', 'Pearl White', 'Navy Blue', 'Rose Gold'] },
    ],
    category: { id: 'cat-electronics', name: 'Electronics', slug: 'electronics' },
    brand: { id: 'brand-soundmax', name: 'SoundMax' },
    stock: { status: 'in_stock', quantity: 145 },
    isFeatured: true,
    seo: { title: 'Wireless Bluetooth Headphones — SoundMax', description: 'Premium ANC wireless headphones with 40-hour battery life.' },
    createdAt: '2026-05-01T00:00:00Z',
  },
  {
    id: 'demo-prod-002',
    slug: 'classic-leather-watch',
    name: 'Classic Leather Watch',
    description:
      '<p>Elegant timepiece with a genuine Italian leather strap and a stainless steel case. Japanese quartz movement ensures precise timekeeping. Water-resistant to <strong>50 meters</strong>.</p><ul><li>Genuine Italian leather strap</li><li>Stainless steel case, 40mm</li><li>Japanese quartz movement</li><li>Water resistant to 50m</li><li>Scratch-resistant sapphire crystal</li></ul>',
    price: { amount: 199.99, currency: 'USD', display: '$199.99' },
    compareAtPrice: 279.99,
    images: [
      { url: unsplash('photo-1523275335684-37898b6baf30'), alt: 'Classic leather watch', width: 600, height: 600 },
      { url: unsplash('photo-1524592094714-0f0654e20314'), alt: 'Watch on wrist', width: 600, height: 600 },
    ],
    variants: [
      { name: 'Strap Color', values: ['Brown', 'Black', 'Tan'] },
      { name: 'Dial', values: ['White', 'Black', 'Navy'] },
    ],
    category: { id: 'cat-fashion', name: 'Fashion', slug: 'fashion' },
    brand: { id: 'brand-horizon', name: 'Horizon Watches' },
    stock: { status: 'low_stock', quantity: 8 },
    isFeatured: true,
    seo: { title: 'Classic Leather Watch — Horizon Watches', description: 'Elegant Italian leather watch with Japanese quartz movement.' },
    createdAt: '2026-05-10T00:00:00Z',
  },
  {
    id: 'demo-prod-003',
    slug: 'organic-cotton-t-shirt',
    name: 'Organic Cotton T-Shirt',
    description:
      '<p>Soft, breathable, and sustainably made from <strong>100% GOTS-certified organic cotton</strong>. Pre-shrunk, ring-spun fabric that holds its shape wash after wash. Available in a relaxed fit.</p>',
    price: { amount: 34.99, currency: 'USD', display: '$34.99' },
    images: [
      { url: unsplash('photo-1521572163474-6864f9cf17ab'), alt: 'Organic cotton t-shirt', width: 600, height: 600 },
      { url: unsplash('photo-1583743814966-8936f5b7be1a'), alt: 'T-shirt lifestyle', width: 600, height: 600 },
    ],
    variants: [
      { name: 'Size', values: ['XS', 'S', 'M', 'L', 'XL', '2XL'] },
      { name: 'Color', values: ['White', 'Black', 'Navy', 'Sage Green', 'Rust'] },
    ],
    category: { id: 'cat-fashion', name: 'Fashion', slug: 'fashion' },
    stock: { status: 'in_stock', quantity: 520 },
    isFeatured: true,
    seo: { title: 'Organic Cotton T-Shirt — Sustainable Basics', description: '100% GOTS-certified organic cotton t-shirt.' },
    createdAt: '2026-05-12T00:00:00Z',
  },
  {
    id: 'demo-prod-004',
    slug: 'portable-bluetooth-speaker',
    name: 'Portable Bluetooth Speaker',
    description:
      '<p>Room-filling 360° sound in a compact, waterproof design. Take it to the beach, the trail, or the backyard. <strong>IP67 waterproof</strong> and dustproof with 20-hour battery life.</p>',
    price: { amount: 59.99, currency: 'USD', display: '$59.99' },
    compareAtPrice: 79.99,
    images: [
      { url: unsplash('photo-1608043152269-423dbba4e7e1'), alt: 'Portable bluetooth speaker', width: 600, height: 600 },
      { url: unsplash('photo-1589003077984-894e133dabab'), alt: 'Speaker on beach', width: 600, height: 600 },
    ],
    variants: [
      { name: 'Color', values: ['Black', 'Blue', 'Red', 'Teal'] },
    ],
    category: { id: 'cat-electronics', name: 'Electronics', slug: 'electronics' },
    brand: { id: 'brand-soundmax', name: 'SoundMax' },
    stock: { status: 'in_stock', quantity: 210 },
    isFeatured: true,
    seo: { title: 'Portable Bluetooth Speaker — SoundMax', description: 'IP67 waterproof portable speaker with 360° sound.' },
    createdAt: '2026-05-08T00:00:00Z',
  },
  {
    id: 'demo-prod-005',
    slug: 'minimalist-backpack',
    name: 'Minimalist Backpack',
    description:
      '<p>Sleek, durable everyday backpack with a padded laptop compartment (fits up to 16"), hidden security pocket, and water-resistant fabric. Perfect for commuting, travel, and campus.</p>',
    price: { amount: 69.99, currency: 'USD', display: '$69.99' },
    compareAtPrice: 89.99,
    images: [
      { url: unsplash('photo-1553062407-98eeb64c6a62'), alt: 'Minimalist backpack', width: 600, height: 600 },
      { url: unsplash('photo-1622560480605-d83c853bc5c3'), alt: 'Backpack worn', width: 600, height: 600 },
    ],
    variants: [
      { name: 'Color', values: ['Black', 'Olive', 'Navy', 'Grey'] },
    ],
    category: { id: 'cat-fashion', name: 'Fashion', slug: 'fashion' },
    brand: { id: 'brand-urbancarry', name: 'UrbanCarry' },
    stock: { status: 'in_stock', quantity: 95 },
    isFeatured: true,
    seo: { title: 'Minimalist Backpack — UrbanCarry', description: 'Water-resistant everyday backpack with padded laptop compartment.' },
    createdAt: '2026-05-05T00:00:00Z',
  },
  {
    id: 'demo-prod-006',
    slug: 'stainless-steel-water-bottle',
    name: 'Insulated Water Bottle 32oz',
    description:
      '<p>Double-wall vacuum insulation keeps drinks cold for <strong>24 hours</strong> or hot for <strong>12 hours</strong>. Made from 18/8 stainless steel. BPA-free, leak-proof, and built to last.</p>',
    price: { amount: 29.99, currency: 'USD', display: '$29.99' },
    images: [
      { url: unsplash('photo-1602143407151-7111542de6e8'), alt: 'Insulated water bottle', width: 600, height: 600 },
      { url: unsplash('photo-1570831739435-6601aa3fa4fb'), alt: 'Water bottle on desk', width: 600, height: 600 },
    ],
    variants: [
      { name: 'Color', values: ['Stainless', 'Matte Black', 'Sage', 'Coral'] },
    ],
    category: { id: 'cat-home', name: 'Home & Living', slug: 'home' },
    stock: { status: 'in_stock', quantity: 430 },
    isFeatured: false,
    seo: { title: '32oz Insulated Water Bottle', description: 'Double-wall vacuum insulated stainless steel bottle.' },
    createdAt: '2026-04-28T00:00:00Z',
  },
  {
    id: 'demo-prod-007',
    slug: 'yoga-mat-premium',
    name: 'Premium Yoga Mat',
    description:
      '<p>Extra thick 6mm yoga mat with alignment lines. Non-slip surface on both sides, eco-friendly TPE material, and lightweight for carrying to the studio or practicing at home.</p>',
    price: { amount: 44.99, currency: 'USD', display: '$44.99' },
    images: [
      { url: unsplash('photo-1601925260368-ae2f83cf8b7f'), alt: 'Premium yoga mat', width: 600, height: 600 },
      { url: unsplash('photo-1544367567-0f2fcb009e0b'), alt: 'Yoga mat rolled', width: 600, height: 600 },
    ],
    variants: [
      { name: 'Color', values: ['Purple', 'Teal', 'Charcoal', 'Blush'] },
    ],
    category: { id: 'cat-sports', name: 'Sports & Outdoors', slug: 'sports' },
    stock: { status: 'in_stock', quantity: 180 },
    isFeatured: false,
    seo: { title: 'Premium Yoga Mat — 6mm Extra Thick', description: 'Non-slip eco-friendly TPE yoga mat with alignment lines.' },
    createdAt: '2026-05-03T00:00:00Z',
  },
  {
    id: 'demo-prod-008',
    slug: 'smartphone-tripod-stand',
    name: 'Adjustable Phone Tripod Stand',
    description:
      '<p>Lightweight aluminum tripod with 360° rotating phone mount. Extends from 20cm to <strong>150cm</strong>. Includes Bluetooth remote for hands-free photos and video. Compatible with all smartphones.</p>',
    price: { amount: 24.99, currency: 'USD', display: '$24.99' },
    compareAtPrice: 39.99,
    images: [
      { url: unsplash('photo-1611532736597-de2d4265fba3'), alt: 'Phone tripod stand', width: 600, height: 600 },
      { url: unsplash('photo-1526170375885-4d8ecf77b99f'), alt: 'Camera on tripod', width: 600, height: 600 },
    ],
    variants: [
      { name: 'Color', values: ['Black', 'Silver'] },
    ],
    category: { id: 'cat-electronics', name: 'Electronics', slug: 'electronics' },
    stock: { status: 'in_stock', quantity: 320 },
    isFeatured: false,
    seo: { title: 'Adjustable Phone Tripod Stand with Bluetooth Remote', description: 'Lightweight aluminum tripod extending to 150cm.' },
    createdAt: '2026-04-20T00:00:00Z',
  },
  {
    id: 'demo-prod-009',
    slug: 'ceramic-coffee-mug-set',
    name: 'Artisan Ceramic Mug Set (4pk)',
    description:
      '<p>Handcrafted ceramic mugs with a matte glaze finish. Each mug holds <strong>350ml</strong>. Microwave and dishwasher safe. Set of 4 in complementary earth tones.</p>',
    price: { amount: 39.99, currency: 'USD', display: '$39.99' },
    images: [
      { url: unsplash('photo-1514228742587-6b1558fcca3d'), alt: 'Ceramic coffee mug set', width: 600, height: 600 },
      { url: unsplash('photo-1497935586351-b67a49e012bf'), alt: 'Mug with coffee', width: 600, height: 600 },
    ],
    variants: [
      { name: 'Set', values: ['Earth Tones', 'Coastal Blues', 'Monochrome'] },
    ],
    category: { id: 'cat-home', name: 'Home & Living', slug: 'home' },
    stock: { status: 'in_stock', quantity: 65 },
    isFeatured: false,
    seo: { title: 'Artisan Ceramic Mug Set — Handcrafted 4-Pack', description: 'Handcrafted ceramic mugs with matte glaze, 350ml each.' },
    createdAt: '2026-05-15T00:00:00Z',
  },
  {
    id: 'demo-prod-010',
    slug: 'running-shoes-ultralight',
    name: 'Ultralight Running Shoes',
    description:
      '<p>Engineered mesh upper with responsive foam midsole. Weighs only <strong>220g</strong> per shoe. Breathable, flexible, and built for daily training and race day alike.</p>',
    price: { amount: 129.99, currency: 'USD', display: '$129.99' },
    compareAtPrice: 159.99,
    images: [
      { url: unsplash('photo-1542291026-7eec264c27ff'), alt: 'Ultralight running shoes', width: 600, height: 600 },
      { url: unsplash('photo-1608231387042-66d1773070a5'), alt: 'Running shoes lifestyle', width: 600, height: 600 },
    ],
    variants: [
      { name: 'Size', values: ['7', '8', '9', '10', '11', '12', '13'] },
      { name: 'Color', values: ['Core Black', 'Cloud White', 'Solar Red'] },
    ],
    category: { id: 'cat-sports', name: 'Sports & Outdoors', slug: 'sports' },
    brand: { id: 'brand-stride', name: 'Stride Athletics' },
    stock: { status: 'in_stock', quantity: 270 },
    isFeatured: true,
    seo: { title: 'Ultralight Running Shoes — Stride Athletics', description: '220g engineered mesh running shoes with responsive foam.' },
    createdAt: '2026-05-14T00:00:00Z',
  },
  {
    id: 'demo-prod-011',
    slug: 'usb-c-hub-adapter',
    name: '7-in-1 USB-C Hub Adapter',
    description:
      '<p>Expand your laptop\'s connectivity with HDMI 4K output, 3x USB-A 3.0, USB-C PD 100W passthrough, SD/microSD card readers, and a 3.5mm audio jack. Works with MacBook, iPad, Chromebook, and Windows laptops.</p>',
    price: { amount: 45.99, currency: 'USD', display: '$45.99' },
    compareAtPrice: 64.99,
    images: [
      { url: unsplash('photo-1625723044792-44de16ccb4e9'), alt: 'USB-C hub adapter', width: 600, height: 600 },
    ],
    category: { id: 'cat-electronics', name: 'Electronics', slug: 'electronics' },
    stock: { status: 'in_stock', quantity: 410 },
    isFeatured: false,
    variants: [],
    seo: { title: '7-in-1 USB-C Hub Adapter — 4K HDMI, 100W PD', description: 'USB-C hub with HDMI 4K, USB-A, SD card reader, and 100W charging.' },
    createdAt: '2026-05-02T00:00:00Z',
  },
  {
    id: 'demo-prod-012',
    slug: 'linen-throw-pillow',
    name: 'Linen Throw Pillow Cover',
    description:
      '<p>Pure European flax linen with an envelope closure. Stonewashed for extra softness. <strong>45 x 45 cm</strong>. Insert not included. OEKO-TEX certified.</p>',
    price: { amount: 24.99, currency: 'USD', display: '$24.99' },
    images: [
      { url: unsplash('photo-1584100936595-c0654b55a2e2'), alt: 'Linen throw pillow', width: 600, height: 600 },
    ],
    variants: [
      { name: 'Color', values: ['Linen White', 'Terracotta', 'Sage', 'Charcoal', 'Dusty Rose'] },
    ],
    category: { id: 'cat-home', name: 'Home & Living', slug: 'home' },
    stock: { status: 'in_stock', quantity: 155 },
    isFeatured: false,
    seo: { title: 'Linen Throw Pillow Cover — European Flax', description: 'Stonewashed pure linen pillow cover, OEKO-TEX certified.' },
    createdAt: '2026-05-09T00:00:00Z',
  },
];
