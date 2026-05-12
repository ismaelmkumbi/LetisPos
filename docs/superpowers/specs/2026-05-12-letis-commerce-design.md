# Letis Commerce — Design Specification

**Date**: 2026-05-12
**Status**: Ready for Review
**Author**: Product & Architecture Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision](#2-product-vision)
3. [Business Value](#3-business-value)
4. [Core Features](#4-core-features)
5. [System Architecture](#5-system-architecture)
6. [Database Design Overview](#6-database-design-overview)
7. [Backend Architecture](#7-backend-architecture)
8. [Frontend Architecture](#8-frontend-architecture)
9. [Integration with Existing Letis POS Modules](#9-integration-with-existing-letis-pos-modules)
10. [Development Phases](#10-development-phases)
11. [Milestones](#11-milestones)
12. [Backend Engineer Detailed Task Breakdown](#12-backend-engineer-detailed-task-breakdown)
13. [Frontend Engineer Detailed Task Breakdown](#13-frontend-engineer-detailed-task-breakdown)
14. [API Contract Guidelines](#14-api-contract-guidelines)
15. [Testing Strategy](#15-testing-strategy)
16. [Security Considerations](#16-security-considerations)
17. [Performance and Scalability](#17-performance-and-scalability)
18. [Monetization Strategy](#18-monetization-strategy)
19. [Risks and Mitigation](#19-risks-and-mitigation)
20. [Recommended MVP Scope](#20-recommended-mvp-scope)

---

## 1. Executive Summary

Letis Commerce is an **optional extension module** within the Letis POS platform that enables merchants to create and manage fully integrated online stores. It is not a separate product, not a replacement for Letis POS, and not a transformation of the platform. It is a module that merchants activate when they choose to sell online.

The module leverages every existing Letis POS subsystem — products, inventory, pricing, customers, orders, payments, reports, auth, and permissions — ensuring zero data duplication and real-time synchronization. A single new backend microservice (`commerce-service`) owns only commerce-specific concerns: storefront settings, themes, SEO metadata, shipping zones, navigation menus, and published product overlays.

The public storefront runs within the existing React SPA under `/store/:slug` routes using a separate public-facing layout. Admin configuration screens live under `/admin/commerce/*` within the existing dashboard layout, reusing the same MUI component library, API client, and permission system.

**Core architecture principle**: Commerce Service orchestrates; it never duplicates. Product data, inventory counts, order processing, payment capture, and customer records remain 100% in their respective services.

---

## 2. Product Vision

**"Sell in-store and online from one unified platform."**

A merchant using Letis POS wakes up, checks their dashboard, and sees yesterday's sales — both from the physical register and from their online store — in a single view. Inventory adjustments from walk-in sales are reflected online in real time. When an online order comes in, it appears in the same order queue as in-store orders. The merchant never reconciles two systems because there is only one system.

The online store is not a separate entity. It is simply another sales channel — like having a second register, but on the internet.

### Guiding Principles

1. **Unified data, not duplicated data.** Every entity (product, order, customer, payment) lives in one place.
2. **Optional, not mandatory.** Commerce is a module merchants enable. Zero impact on non-commerce tenants.
3. **Progressive sophistication.** MVP does the basics well. Advanced features (page builder, blog, multi-currency) come in later phases without rearchitecting.
4. **Consistent UX.** Admin screens for commerce feel identical to existing Letis POS admin screens — same patterns, same components, same interaction model.
5. **Storefront freedom.** The public storefront has its own visual identity, themeable per merchant, while the admin stays consistent.

---

## 3. Business Value

### For Merchants

| Value | Description |
|-------|-------------|
| **Single source of truth** | No syncing products, inventory, or orders between POS and ecommerce platforms |
| **Faster time-to-market** | Publish existing POS products online in minutes, not weeks |
| **Lower TCO** | One platform subscription instead of POS + Shopify/WooCommerce |
| **Unified analytics** | Combined in-store + online reporting in one dashboard |
| **Reduced errors** | Real-time inventory prevents overselling across channels |

### For Letis POS (the business)

| Value | Description |
|-------|-------------|
| **New revenue stream** | Monthly subscription tier for commerce module |
| **Increased stickiness** | Merchants who sell online are far less likely to churn |
| **Competitive positioning** | Full-stack POS + ecommerce at a price point competitors can't match |
| **Data moat** | Combined online + offline purchase data enables superior AI/analytics |
| **Upsell path** | Free POS → Commerce module → Advanced Commerce (multi-location, multi-currency) |

---

## 4. Core Features

### MVP (Phase 1)

| Feature | Description |
|---------|-------------|
| **Store settings** | Store name, contact info, social links, currency, timezone, tax display |
| **Product publishing** | Toggle products from POS catalog to online store; set online-specific price, SEO |
| **Categories** | Organize published products into browsable category tree |
| **Search** | Full-text product search with typo tolerance |
| **Product detail page** | Images, variants, price, description, stock status, add-to-cart |
| **Shopping cart** | Persistent cart (localStorage guest; server-side for logged-in customers) |
| **Checkout** | Multi-step: shipping → payment → review → confirm |
| **Customer accounts** | Registration, login, order history, saved addresses |
| **Payment integration** | Stripe (card, mobile money where available) |
| **Shipping settings** | Zones, flat-rate / weight-based / free shipping rules |
| **Order synchronization** | Online orders flow into existing Sales Service order tables |
| **Basic theme customization** | Logo, colors (primary/secondary/accent), fonts, homepage layout sections |
| **Custom domain support** | CNAME-based domain mapping with auto-provisioned TLS (via Caddy/Traefik) |
| **SEO basics** | Per-product meta title/description, OG tags, sitemap.xml, robots.txt |
| **Navigation menus** | Header and footer menu builder |
| **Store pages** | About, Contact, FAQ, Terms, Privacy (rich text) |

### Phase 2

| Feature | Description |
|---------|-------------|
| **Reviews & ratings** | Customer product reviews with moderation |
| **Wishlist** | Saved items for logged-in customers |
| **Abandoned cart recovery** | Email reminders for carts inactive > 4 hours |
| **Discount codes** | Reuse existing POS promotions, apply to online checkout |
| **Advanced theme** | Hero layouts, collection grids, announcement bar, custom CSS |
| **Inventory visibility** | "Only X left" / "Low stock" / "Out of stock" badges |
| **Related products** | Manual + automatic (same category) cross-sells |
| **Email notifications** | Order confirmation, shipping update, welcome email |

### Phase 3

| Feature | Description |
|---------|-------------|
| **Drag-and-drop page builder** | Visual editor for homepage and landing pages |
| **Blog / CMS** | Article management with rich text, categories, tags |
| **Marketing automation** | Email campaigns, cart recovery flows, welcome sequences |
| **Multi-language** | Storefront translations, per-language product content |
| **Multi-currency** | Display and accept multiple currencies |
| **Advanced analytics** | Funnel analysis, conversion rate, customer LTV |
| **Social commerce** | Product feeds for Facebook/Instagram shops, buy buttons |

---

## 5. System Architecture

### Overview

```
                          ┌──────────────────────────────┐
                          │     Letis POS React SPA       │
                          │                              │
                          │  ┌─────────────────────────┐ │
                          │  │ Admin Routes (/admin/*) │ │
                          │  │ ┌─────────────────────┐ │ │
                          │  │ │ Commerce Admin      │ │ │
                          │  │ │ /admin/commerce/*   │ │ │
                          │  │ └─────────────────────┘ │ │
                          │  └─────────────────────────┘ │
                          │  ┌─────────────────────────┐ │
                          │  │ Public Routes (/store/*)│ │
                          │  │ StorefrontLayout        │ │
                          │  │ No auth sidebar          │ │
                          │  └─────────────────────────┘ │
                          └──────────────┬───────────────┘
                                         │ HTTP/2 (JWT)
                                         ▼
                          ┌──────────────────────────────┐
                          │   Spring Cloud Gateway :8080  │
                          │   Rate-limit, JWT validation  │
                          └──────────────┬───────────────┘
                                         │
            ┌────────────────────────────┼────────────────────────────┐
            ▼                ▼           ▼           ▼                ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │ Commerce Svc │ │ Product Svc  │ │ Inventory Svc│ │ Payment Svc  │ ...
    │   :8097      │ │   :8083      │ │   :8084      │ │   :8086      │
    │              │ │              │ │              │ │              │
    │ Owns:        │ │ Owns:        │ │ Owns:        │ │ Owns:        │
    │ - store      │ │ - products   │ │ - stock      │ │ - payments   │
    │   settings   │ │ - categories │ │ - warehouses │ │ - Stripe     │
    │ - themes     │ │ - brands     │ │ - transfers  │ │ - accounts   │
    │ - SEO data   │ │ - variants   │ │              │ │              │
    │ - shipping   │ │ - price lists│ │              │ │              │
    │   zones      │ │              │ │              │ │              │
    │ - navigation │ │              │ │              │ │              │
    │ - pages      │ │              │ │              │ │              │
    │ - domains    │ │              │ │              │ │              │
    └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
           │                │                │                │
           └────────────────┴────────────────┴────────────────┘
                                    │
                            ┌───────┴────────┐
                            │   PostgreSQL   │
                            │  (per-service  │
                            │   schema)      │
                            └────────────────┘
```

### Inter-Service Communication

Commerce Service communicates with other services via REST (synchronous) for reads and Kafka (asynchronous via Outbox pattern) for writes that affect other services.

**Synchronous (REST)** — used when the storefront needs immediate data:

- `GET product-service/api/v1/products/{id}` — product detail
- `GET product-service/api/v1/categories` — category tree
- `GET inventory-service/api/v1/stock/warehouse/{id}/product/{id}` — stock level

**Asynchronous (Kafka)** — used for events that cross service boundaries:

- `OrderPlaced` event → Sales Service creates the order record
- `PaymentReceived` event → Payment Service records the transaction
- `InventoryReserved` event → Inventory Service decrements stock

### Service Port Assignment

| Service | Port | Notes |
|---------|------|-------|
| commerce-service | **8097** | New — follows existing port numbering |

---

## 6. Database Design Overview

### New Schema: `commerce_db`

All tables are in a new PostgreSQL schema owned by commerce-service. They follow the same conventions as existing services: UUID primary keys, `tenant_id` multi-tenancy, `created_at`/`updated_at`/`deleted_at` soft-delete, and `@Version` optimistic locking.

#### Core Tables

**stores**
```sql
CREATE TABLE stores (
    id              UUID PRIMARY KEY,
    tenant_id       UUID NOT NULL UNIQUE,  -- one store per tenant
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(100) NOT NULL UNIQUE,
    status          VARCHAR(20) NOT NULL DEFAULT 'inactive', -- active, inactive, maintenance
    contact_email   VARCHAR(255),
    contact_phone   VARCHAR(50),
    address_line1   VARCHAR(255),
    address_line2   VARCHAR(255),
    city            VARCHAR(100),
    state           VARCHAR(100),
    country         VARCHAR(100),
    postal_code     VARCHAR(20),
    currency        VARCHAR(3) NOT NULL DEFAULT 'USD',
    timezone        VARCHAR(50) NOT NULL DEFAULT 'UTC',
    tax_display     VARCHAR(20) NOT NULL DEFAULT 'exclusive',
    social_facebook VARCHAR(500),
    social_instagram VARCHAR(500),
    social_twitter  VARCHAR(500),
    order_prefix    VARCHAR(10) DEFAULT 'ONL-',
    created_at      TIMESTAMPTZ NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL,
    deleted_at      TIMESTAMPTZ,
    version         BIGINT NOT NULL DEFAULT 0
);
```

**published_products**
```sql
CREATE TABLE published_products (
    id              UUID PRIMARY KEY,
    tenant_id       UUID NOT NULL,
    product_id      UUID NOT NULL,          -- FK to product-service.products
    store_id        UUID NOT NULL REFERENCES stores(id),
    slug            VARCHAR(300) NOT NULL,
    meta_title      VARCHAR(70),
    meta_description VARCHAR(320),
    og_image_url    VARCHAR(1000),
    gallery_urls    TEXT[],                  -- additional images for PDP
    is_featured     BOOLEAN NOT NULL DEFAULT false,
    display_order   INT NOT NULL DEFAULT 0,
    custom_price    DECIMAL(19,4),           -- override POS price if set
    published_at    TIMESTAMPTZ,
    unpublished_at  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL,
    deleted_at      TIMESTAMPTZ,
    version         BIGINT NOT NULL DEFAULT 0,
    UNIQUE(tenant_id, product_id),
    UNIQUE(store_id, slug)
);
CREATE INDEX idx_published_products_store ON published_products(store_id, tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_published_products_slug ON published_products(slug) WHERE deleted_at IS NULL;
```

**categories_display**
```sql
CREATE TABLE categories_display (
    id              UUID PRIMARY KEY,
    tenant_id       UUID NOT NULL,
    store_id        UUID NOT NULL REFERENCES stores(id),
    category_id     UUID NOT NULL,           -- FK to product-service.categories
    name_override   VARCHAR(255),
    description     TEXT,
    image_url       VARCHAR(1000),
    display_order   INT NOT NULL DEFAULT 0,
    is_visible      BOOLEAN NOT NULL DEFAULT true,
    parent_id       UUID REFERENCES categories_display(id),
    created_at      TIMESTAMPTZ NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL,
    deleted_at      TIMESTAMPTZ,
    version         BIGINT NOT NULL DEFAULT 0
);
```

**themes**
```sql
CREATE TABLE themes (
    id              UUID PRIMARY KEY,
    tenant_id       UUID NOT NULL,
    store_id        UUID NOT NULL UNIQUE REFERENCES stores(id),
    name            VARCHAR(100) NOT NULL DEFAULT 'Default',
    settings        JSONB NOT NULL DEFAULT '{}',  -- full theme config as JSON
    -- Example settings JSON:
    -- {
    --   "colors": {"primary": "#4f46e5", "secondary": "#f59e0b", "accent": "#10b981"},
    --   "fonts": {"heading": "Inter", "body": "Inter"},
    --   "homepage": {"hero_layout": "fullwidth", "featured_count": 8},
    --   "header": {"style": "centered", "sticky": true},
    --   "footer": {"style": "three_column", "show_social": true},
    --   "css_overrides": ""
    -- }
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL,
    version         BIGINT NOT NULL DEFAULT 0
);
```

**shipping_zones**
```sql
CREATE TABLE shipping_zones (
    id              UUID PRIMARY KEY,
    tenant_id       UUID NOT NULL,
    store_id        UUID NOT NULL REFERENCES stores(id),
    name            VARCHAR(255) NOT NULL,
    countries       TEXT[] NOT NULL,           -- ISO country codes
    regions         TEXT[],                    -- state/province codes, null = all
    rates           JSONB NOT NULL DEFAULT '[]',
    -- Example rates JSON:
    -- [
    --   {"type": "flat_rate", "name": "Standard", "amount": 5.00, "min_days": 3, "max_days": 7},
    --   {"type": "free", "name": "Free Shipping", "min_order": 100.00},
    --   {"type": "weight_based", "name": "Express", "ranges": [
    --     {"max_weight_kg": 1, "amount": 10.00},
    --     {"max_weight_kg": 5, "amount": 25.00}
    --   ]}
    -- ]
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL,
    deleted_at      TIMESTAMPTZ,
    version         BIGINT NOT NULL DEFAULT 0
);
```

**custom_domains**
```sql
CREATE TABLE custom_domains (
    id              UUID PRIMARY KEY,
    tenant_id       UUID NOT NULL,
    store_id        UUID NOT NULL REFERENCES stores(id),
    domain          VARCHAR(255) NOT NULL UNIQUE,
    is_verified     BOOLEAN NOT NULL DEFAULT false,
    verification_code VARCHAR(64),
    ssl_status      VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at      TIMESTAMPTZ NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL,
    version         BIGINT NOT NULL DEFAULT 0
);
```

**store_pages**
```sql
CREATE TABLE store_pages (
    id              UUID PRIMARY KEY,
    tenant_id       UUID NOT NULL,
    store_id        UUID NOT NULL REFERENCES stores(id),
    key             VARCHAR(50) NOT NULL,      -- about, contact, faq, terms, privacy, shipping-policy
    title           VARCHAR(255) NOT NULL,
    body            TEXT NOT NULL,              -- rich text HTML
    meta_title      VARCHAR(70),
    meta_description VARCHAR(320),
    is_visible      BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL,
    deleted_at      TIMESTAMPTZ,
    version         BIGINT NOT NULL DEFAULT 0,
    UNIQUE(store_id, key)
);
```

**navigation_menus**
```sql
CREATE TABLE navigation_menus (
    id              UUID PRIMARY KEY,
    tenant_id       UUID NOT NULL,
    store_id        UUID NOT NULL REFERENCES stores(id),
    location        VARCHAR(20) NOT NULL,       -- header, footer, mobile
    items           JSONB NOT NULL DEFAULT '[]',
    -- Example items JSON:
    -- [
    --   {"label": "Home", "type": "page", "page_key": "home", "order": 1},
    --   {"label": "Shop", "type": "category", "category_id": "...", "order": 2},
    --   {"label": "About", "type": "page", "page_key": "about", "order": 3},
    --   {"label": "Contact", "type": "link", "url": "/store/mystore/page/contact", "order": 4}
    -- ]
    created_at      TIMESTAMPTZ NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL,
    version         BIGINT NOT NULL DEFAULT 0,
    UNIQUE(store_id, location)
);
```

**seo_defaults**
```sql
CREATE TABLE seo_defaults (
    id              UUID PRIMARY KEY,
    tenant_id       UUID NOT NULL,
    store_id        UUID NOT NULL UNIQUE REFERENCES stores(id),
    site_title       VARCHAR(70),
    site_description VARCHAR(320),
    og_image_url    VARCHAR(1000),
    twitter_handle  VARCHAR(50),
    google_analytics_id VARCHAR(50),
    google_site_verification VARCHAR(100),
    structured_data JSONB,                     -- Organization schema
    created_at      TIMESTAMPTZ NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL,
    version         BIGINT NOT NULL DEFAULT 0
);
```

**marketing_banners**
```sql
CREATE TABLE marketing_banners (
    id              UUID PRIMARY KEY,
    tenant_id       UUID NOT NULL,
    store_id        UUID NOT NULL REFERENCES stores(id),
    name            VARCHAR(255) NOT NULL,
    location        VARCHAR(20) NOT NULL,       -- hero, announcement_bar, promo_grid, product_page
    content_html    TEXT,
    image_url       VARCHAR(1000),
    link_url        VARCHAR(1000),
    background_color VARCHAR(7),
    is_active       BOOLEAN NOT NULL DEFAULT false,
    starts_at       TIMESTAMPTZ,
    ends_at         TIMESTAMPTZ,
    display_order   INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL,
    deleted_at      TIMESTAMPTZ,
    version         BIGINT NOT NULL DEFAULT 0
);
```

**store_settings**
```sql
CREATE TABLE store_settings (
    id              UUID PRIMARY KEY,
    tenant_id       UUID NOT NULL,
    store_id        UUID NOT NULL UNIQUE REFERENCES stores(id),
    settings        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL,
    version         BIGINT NOT NULL DEFAULT 0
);
```

### Entity Relationship Summary

```
stores 1──1 store_settings
stores 1──N published_products
stores 1──N categories_display
stores 1──1 themes
stores 1──N shipping_zones
stores 1──N custom_domains
stores 1──N store_pages
stores 1──1 navigation_menus (per location)
stores 1──1 seo_defaults
stores 1──N marketing_banners
```

---

## 7. Backend Architecture

### Commerce Service Structure

Following the existing clean architecture pattern:

```
commerce-service/
├── pom.xml
├── src/main/java/io/smartpos/commerce/
│   ├── CommerceApplication.java
│   ├── api/
│   │   ├── storefront/
│   │   │   ├── StorefrontProductController.java      -- public product browsing
│   │   │   ├── StorefrontCategoryController.java     -- public category browsing
│   │   │   ├── StorefrontCartController.java          -- public cart endpoints
│   │   │   ├── StorefrontCheckoutController.java      -- public checkout
│   │   │   ├── StorefrontCustomerController.java      -- customer registration/login
│   │   │   ├── StorefrontPageController.java           -- public CMS pages
│   │   │   └── StorefrontThemeController.java          -- public theme endpoint
│   │   ├── admin/
│   │   │   ├── StoreSettingsController.java           -- admin: store config
│   │   │   ├── ProductPublishingController.java       -- admin: publish/unpublish products
│   │   │   ├── CategoryDisplayController.java         -- admin: category display setup
│   │   │   ├── ThemeController.java                   -- admin: theme customization
│   │   │   ├── ShippingZoneController.java            -- admin: shipping zone CRUD
│   │   │   ├── NavigationController.java              -- admin: menu builder
│   │   │   ├── PageController.java                    -- admin: CMS page CRUD
│   │   │   ├── BannerController.java                  -- admin: marketing banners
│   │   │   ├── SeoController.java                     -- admin: SEO defaults
│   │   │   ├── DomainController.java                  -- admin: custom domains
│   │   │   └── CommerceAnalyticsController.java       -- admin: commerce dashboard stats
│   │   ├── dto/
│   │   │   ├── storefront/                            -- public-facing DTOs
│   │   │   └── admin/                                 -- admin DTOs
│   │   └── GlobalExceptionHandler.java
│   ├── application/
│   │   ├── StoreService.java
│   │   ├── ProductPublishingService.java
│   │   ├── CategoryDisplayService.java
│   │   ├── ThemeService.java
│   │   ├── ShippingZoneService.java
│   │   ├── NavigationService.java
│   │   ├── PageService.java
│   │   ├── BannerService.java
│   │   ├── SeoService.java
│   │   ├── DomainService.java
│   │   ├── StorefrontQueryService.java                -- composite queries across services
│   │   ├── CartService.java
│   │   ├── CheckoutService.java
│   │   └── SitemapService.java
│   ├── domain/
│   │   ├── model/                                     -- JPA entities (all DB tables above)
│   │   └── repository/                                -- Spring Data repositories
│   └── infrastructure/
│       ├── config/
│       │   ├── RedisCacheConfig.java
│       │   ├── RestClientConfig.java
│       │   └── KafkaConfig.java
│       ├── security/
│       │   └── SecurityConfig.java
│       ├── client/
│       │   ├── ProductServiceClient.java              -- REST client for product-service
│       │   ├── InventoryServiceClient.java            -- REST client for inventory-service
│       │   ├── SalesServiceClient.java                -- REST client for sales-service
│       │   ├── PaymentServiceClient.java              -- REST client for payment-service
│       │   ├── CrmServiceClient.java                  -- REST client for crm-service
│       │   └── NotificationServiceClient.java         -- REST client for notification-service
│       └── storage/
│           └── StorefrontImageService.java            -- MinIO image uploads
└── src/main/resources/
    ├── application.yml
    └── db/migration/                                  -- Flyway migrations
```

### Key Design Decisions

1. **No dual-write problem.** Commerce service only writes to its own tables. It calls other services via REST/events, never directly touches their databases.

2. **Composite queries at the commerce layer.** The `StorefrontQueryService` aggregates data from multiple services. Example: building a product detail page calls product-service (product info) + inventory-service (stock level) + commerce tables (SEO metadata, gallery). Results are cached in Redis with cache-busting on product or inventory changes.

3. **Cart strategy.** Guest carts live in Redis (TTL: 7 days). Customer carts are persisted to a `carts` table in commerce_db for cross-device access. On login, guest cart merges into customer cart.

4. **Order flow.** Checkout creates an order in Sales Service (reusing existing sales tables). Commerce service emits `OrderPlaced` event. Payment is captured by Payment Service (reusing Stripe integration). Commerce only stores the cart-to-order transition state.

5. **Custom domains.** A `domain → store_slug` mapping table. The React app reads the `Host` header at bootstrap to determine which store to load. No server-side routing changes needed in MVP — Caddy/Traefik handles TLS termination and forwards to the SPA.

### Permissions

New permissions registered in auth-service:

| Permission | Description |
|------------|-------------|
| `commerce.view` | View commerce dashboard and settings |
| `commerce.settings` | Manage store settings |
| `commerce.products` | Publish/unpublish products |
| `commerce.theme` | Customize storefront theme |
| `commerce.shipping` | Manage shipping zones and rates |
| `commerce.navigation` | Manage navigation menus |
| `commerce.pages` | Manage CMS pages |
| `commerce.orders` | View online orders |
| `commerce.analytics` | View commerce analytics |
| `commerce.domains` | Manage custom domains |
| `commerce.admin` | Full commerce admin access (super) |

---

## 8. Frontend Architecture

### Route Structure

```
                    ┌──────────────┐
                    │  React App   │
                    └──────┬───────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
   FullLayout         BlankLayout        StorefrontLayout
   (sidebar+header)   (login, etc.)      (public storefront)
        │                                    │
        │ /admin/commerce/*                  │ /store/:slug/*
        │                                    │
   ┌────┴────────┐              ┌────────────┼────────────┐
   │ Commerce    │              │            │            │
   │ Admin Views │              ▼            ▼            ▼
   └─────────────┘        ProductList   ProductDetail   Cart/Checkout
                                     │
                              Customer Account
```

### Directory Structure (Frontend additions)

```
frontend/src/
├── views/
│   ├── smartpos/                    -- existing POS views (unchanged)
│   └── commerce/                    -- NEW: commerce-specific views
│       ├── admin/
│       │   ├── CommerceDashboard.tsx
│       │   ├── StoreSettings.tsx
│       │   ├── ProductPublishing.tsx
│       │   ├── CategoryDisplay.tsx
│       │   ├── ThemeCustomizer.tsx
│       │   ├── ShippingZones.tsx
│       │   ├── NavigationBuilder.tsx
│       │   ├── PageEditor.tsx
│       │   ├── BannerManager.tsx
│       │   ├── SeoSettings.tsx
│       │   ├── DomainManager.tsx
│       │   └── CommerceOrders.tsx
│       └── storefront/
│           ├── StorefrontLayout.tsx
│           ├── HomePage.tsx
│           ├── ProductListPage.tsx
│           ├── ProductDetailPage.tsx
│           ├── SearchResultsPage.tsx
│           ├── CartPage.tsx
│           ├── CheckoutPage.tsx
│           ├── OrderConfirmationPage.tsx
│           ├── CustomerAccountPage.tsx
│           ├── CustomerOrdersPage.tsx
│           ├── CustomerAddressesPage.tsx
│           ├── CustomerLoginPage.tsx
│           ├── CustomerRegisterPage.tsx
│           └── StorePage.tsx
├── components/
│   └── commerce/                    -- NEW: commerce shared components
│       ├── ProductCard.tsx
│       ├── ProductGrid.tsx
│       ├── CategoryNav.tsx
│       ├── CartDrawer.tsx
│       ├── CartSummary.tsx
│       ├── CheckoutSteps.tsx
│       ├── ShippingForm.tsx
│       ├── PaymentForm.tsx
│       ├── OrderSummary.tsx
│       ├── SearchBar.tsx
│       ├── StoreHeader.tsx
│       ├── StoreFooter.tsx
│       ├── NavigationMenu.tsx
│       ├── BannerCarousel.tsx
│       ├── FeaturedProducts.tsx
│       ├── ThemeProvider.tsx
│       └── SeoHead.tsx
├── api/
│   └── smartpos/
│       └── commerce.ts              -- NEW: commerce API functions
├── context/
│   └── CommerceContext/             -- NEW: commerce state management
│       └── index.tsx
├── hooks/
│   └── useStorefront.ts             -- NEW: storefront-specific hooks
├── routes/
│   ├── Router.tsx                   -- MODIFIED: add commerce routes
│   └── smartpos/
│       └── CommerceRoutes.tsx       -- NEW: commerce route definitions
└── types/
    └── commerce.ts                  -- NEW: commerce TypeScript types
```

### State Management

The commerce module uses two context providers:

1. **CommerceAdminContext** — wraps `/admin/commerce/*` routes. Holds store settings, published products list, theme config. Used by admin screens.

2. **StorefrontContext** — wraps `/store/:slug/*` routes. Holds current store config, cart, customer session. Used by the public storefront.

Both use the same API client (`src/api/smartpos/client.ts`) with the same JWT auto-refresh logic.

### SEO Approach (MVP)

For the MVP, SEO is handled via:
1. **React Helmet** for per-page `<title>`, `<meta>`, and Open Graph tags
2. **`/api/v1/storefront/{slug}/sitemap.xml`** — dynamically generated sitemap of all published products and pages
3. **`/robots.txt`** — served by the gateway, pointing to the sitemap
4. Search engines render JavaScript well enough for indexing. A future Phase 2 enhancement adds prerendering via `react-snap` or a headless Chrome rendering service.

---

## 9. Integration with Existing Letis POS Modules

### Products
- **Read**: Storefront queries products via product-service REST API (already has paginated search, category/brand filters)
- **Extend**: `published_products` table adds SEO metadata and gallery images. Product model already has `featured` and `hideOnline` flags
- **Enhancement needed**: Add a `GET /api/v1/products/by-ids?ids=...` bulk endpoint to product-service for storefront category pages

### Inventory
- **Read**: Storefront queries stock via inventory-service for "In Stock" / "Out of Stock" / "Only X left" display
- **Reserve**: Checkout calls inventory-service to reserve stock (existing reserve endpoint)
- **Real-time sync**: When POS sale reduces stock, inventory-service emits `StockChanged` event. Commerce listens to invalidate its Redis cache

### Sales / Orders
- **Create**: Checkout creates an order in sales-service via `POST /api/v1/sales` (reuse existing endpoint)
- **Channel marker**: Add `channel = 'ONLINE'` to the sales order. Sales Service already tracks `source` or we add a `channel` field
- **Sync**: Online orders appear in the same order management UI as POS orders — zero change needed for order listing screens

### Payments
- **Process**: Checkout sends payment to payment-service (reuses Stripe integration)
- **Mark**: Payment record gets `source = 'ONLINE'` for reporting
- **Existing flow**: PaymentService already handles Stripe webhooks, refunds, etc. No changes needed

### Customers
- **Reuse**: Online customer registration creates a customer record in CRM Service
- **Link**: `customer_id` on orders links online purchases to the same customer profile used in-store
- **Auth**: Customer login uses a new `/api/v1/auth/customer-login` endpoint (or extends existing auth with a `user_type` claim)

### Reports
- **Enrich**: Reports already query sales and payment data. With `channel` field, reports can segment by online vs in-store
- **New dashboard**: Commerce admin dashboard shows online-specific KPIs (conversion rate, AOV, top products)

### Notifications
- **Reuse**: Order confirmation emails use notification-service templates
- **New templates**: `order_confirmation_online`, `shipping_update`, `welcome_customer`

### Permissions
- **Extend**: auth-service gets new `commerce.*` permissions (listed above)
- **Roles**: Default admin role includes all `commerce.*` permissions. Custom roles can be restricted

---

## 10. Development Phases

### Phase 1 — MVP (Weeks 1-8)

**Goal**: A merchant can activate commerce, publish products, and accept online orders.

**Scope**: Store settings, product publishing, categories, search, product detail, cart, checkout, customer accounts, payment (Stripe), shipping zones, order sync, basic theme, custom domain, SEO basics, navigation, pages.

### Phase 2 — Growth (Weeks 9-14)

**Goal**: Increase conversion and customer retention.

**Scope**: Reviews, wishlist, abandoned cart recovery, discount codes, advanced theme options, inventory visibility badges, related products, email notifications.

### Phase 3 — Scale (Weeks 15+)

**Goal**: Enterprise features for larger merchants.

**Scope**: Page builder, blog/CMS, marketing automation, multi-language, multi-currency, advanced analytics, social commerce.

---

## 11. Milestones

| Milestone | Week | Deliverables | Success Criteria |
|-----------|------|-------------|------------------|
| **M0: Foundation** | 1 | DB schema, commerce-service skeleton, gateway routes, security config | Service starts, connects to DB, passes health check |
| **M1: Store & Products** | 2-3 | Store settings CRUD, product publishing (admin), storefront product listing + detail (public) | Merchant can publish 10 products and browse them on the storefront |
| **M2: Cart & Checkout** | 4-5 | Cart, checkout flow, Stripe payment, order creation in sales-service | Complete an order from product page → payment → order appears in POS |
| **M3: Customer Experience** | 5-6 | Customer registration/login, order history, addresses, navigation menus, CMS pages | Customer can create account, see past orders, store has full navigation |
| **M4: Shipping & Theme** | 6-7 | Shipping zones with rates, theme customizer, marketing banners, SEO | Merchant customizes store look, sets up shipping rules |
| **M5: Domain & Polish** | 7-8 | Custom domains, sitemap, robots.txt, performance optimization, bug fixes | Store accessible via custom domain, Lighthouse score > 80 |
| **M6: MVP Launch** | 8 | End-to-end testing, security review, documentation, launch | 5 beta merchants transacting successfully |

---

## 12. Backend Engineer Detailed Task Breakdown

### BE-001: Commerce Service Scaffold
- **Title**: Create commerce-service Maven module with Spring Boot scaffold
- **Objective**: Establish the new service with proper project structure, configuration, and infrastructure wiring
- **Implementation steps**:
  1. Create `backend/commerce-service/pom.xml` as a child module of the root POM
  2. Add root POM `<module>commerce-service</module>` entry
  3. Create `CommerceApplication.java` with `@SpringBootApplication`
  4. Create `application.yml` with DB connection, Redis, Kafka config
  5. Create `SecurityConfig.java` with JWT resource server config matching existing services
  6. Create `RestClientConfig.java` with load-balanced `RestClient` beans for inter-service calls
  7. Create `RedisCacheConfig.java` with TTL-based cache config
  8. Create `db/migration/` directory for Flyway
  9. Add `commerce_db` to `ops/infra/postgres/init-databases.sql`
  10. Add gateway routes for commerce-service (`/api/v1/storefront/**`, `/api/v1/commerce/**`)
- **Database changes**: New `commerce_db` database in PostgreSQL
- **API endpoints**: Health check via Spring Actuator
- **Dependencies**: gateway (route registration), ops (DB init), root POM
- **Acceptance criteria**: Service starts, connects to DB, health endpoint returns 200, gateway routes requests
- **Priority**: P0 (blocks everything)
- **Complexity**: Medium (3 story points)

### BE-002: Store Entity & CRUD
- **Title**: Store entity, migration, repository, and admin CRUD endpoints
- **Objective**: Create the core store entity that represents a merchant's online storefront
- **Implementation steps**:
  1. Write Flyway migration V1__create_stores.sql
  2. Create `Store.java` entity with all fields from schema
  3. Create `StoreRepository.java` extending `JpaRepository`
  4. Create `StoreService.java` with create, get, update, activate, deactivate
  5. Create `StoreSettingsController.java` with `GET/PUT /api/v1/commerce/settings`
  6. Create DTOs: `StoreDto`, `UpdateStoreRequest`
  7. Auto-create a store row when a tenant activates the commerce module
- **Database changes**: `stores` table
- **API endpoints**:
  - `GET /api/v1/commerce/settings` — get store config
  - `PUT /api/v1/commerce/settings` — update store config
- **Dependencies**: BE-001
- **Acceptance criteria**: Store CRUD works, tenant-scoped, soft-delete functional
- **Priority**: P0
- **Complexity**: Medium (3 SP)

### BE-003: Product Publishing
- **Title**: Publish/unpublish products from POS catalog to storefront
- **Objective**: Allow merchants to select existing POS products and make them available on the online store with SEO metadata and gallery images
- **Implementation steps**:
  1. Write Flyway migration V2__create_published_products.sql
  2. Create `PublishedProduct.java` entity
  3. Create `PublishedProductRepository.java`
  4. Create `ProductServiceClient.java` for REST calls to product-service
  5. Create `ProductPublishingService.java` with:
     - publish(productId, metadata) — creates published_product row
     - unpublish(productId) — soft-deletes the row
     - searchPublished(storeId, query, categoryId, pageable) — composite search
  6. Create `ProductPublishingController.java` (admin):
     - `POST /api/v1/commerce/products/publish`
     - `DELETE /api/v1/commerce/products/{productId}/unpublish`
     - `GET /api/v1/commerce/products` — list published products
     - `PUT /api/v1/commerce/products/{id}` — update SEO/display settings
  7. Create `StorefrontProductController.java` (public):
     - `GET /api/v1/storefront/{slug}/products` — paginated product list
     - `GET /api/v1/storefront/{slug}/products/{idOrSlug}` — product detail with stock
     - `GET /api/v1/storefront/{slug}/products/featured` — featured products
  8. Create `StorefrontQueryService.java` that composites product-service + inventory-service + published_products data
  9. Cache product detail responses in Redis (TTL: 5 min, busted on publish/unpublish)
- **Database changes**: `published_products` table
- **API endpoints**: Listed in steps 6-7
- **Dependencies**: BE-002, product-service (existing), inventory-service (existing)
- **Acceptance criteria**: Merchant can publish a POS product, set SEO metadata, and it appears on the storefront with real-time stock
- **Priority**: P0
- **Complexity**: Large (8 SP)

### BE-004: Category Display Management
- **Title**: Category tree display management for storefront navigation
- **Objective**: Let merchants organize which categories appear on the storefront, in what order, with custom images and descriptions
- **Implementation steps**:
  1. Write Flyway migration V3__create_categories_display.sql
  2. Create `CategoryDisplay.java` entity and repository
  3. Create `CategoryDisplayService.java`
  4. Create `CategoryDisplayController.java` (admin CRUD)
  5. Create `StorefrontCategoryController.java` (public read)
  6. Composite with product-service categories to build the full tree
- **Database changes**: `categories_display` table
- **API endpoints**:
  - Admin: `GET/POST/PUT/DELETE /api/v1/commerce/categories`
  - Public: `GET /api/v1/storefront/{slug}/categories`
- **Dependencies**: BE-002
- **Acceptance criteria**: Category tree renders on storefront, orderable, with images
- **Priority**: P0
- **Complexity**: Medium (5 SP)

### BE-005: Cart Service
- **Title**: Guest and customer shopping cart with Redis persistence
- **Objective**: Implement add-to-cart, cart retrieval, item update/remove, and guest-to-customer merge
- **Implementation steps**:
  1. Create `CartService.java`:
     - Guest carts: Redis hash `cart:{cartId}` with TTL 7 days
     - Customer carts: PostgreSQL `carts` + `cart_items` tables (V4 migration) + Redis cache
  2. Create `StorefrontCartController.java`:
     - `POST /api/v1/storefront/{slug}/cart/items` — add item (validates stock)
     - `GET /api/v1/storefront/{slug}/cart` — get cart (by cartId cookie or session)
     - `PUT /api/v1/storefront/{slug}/cart/items/{itemId}` — update quantity
     - `DELETE /api/v1/storefront/{slug}/cart/items/{itemId}` — remove item
     - `POST /api/v1/storefront/{slug}/cart/merge` — merge guest cart into customer cart on login
  3. Add stock validation on add-to-cart (checks inventory-service)
  4. Implement cart expiration job (cleanup expired Redis carts daily)
- **Database changes**: `carts`, `cart_items` tables
- **API endpoints**: Listed in step 2
- **Dependencies**: BE-002, inventory-service
- **Acceptance criteria**: Add items to cart, persist across page reloads, merge on login, validate stock
- **Priority**: P0
- **Complexity**: Medium (5 SP)

### BE-006: Checkout & Order Creation
- **Title**: Checkout flow that creates orders in Sales Service
- **Objective**: Convert a cart into an order: collect shipping, calculate totals, capture payment, create order in sales-service
- **Implementation steps**:
  1. Create `CheckoutService.java`:
     - `validateCart(cartId)` — final stock check
     - `calculateShipping(cart, address, zoneId)` — compute shipping rate
     - `createOrder(cart, shippingAddress, billingAddress, shippingMethod, customerId)`:
       a. Reserve inventory via inventory-service
       b. Create order in sales-service via REST
       c. Capture payment via payment-service
       d. Clear cart
       e. Emit `OrderPlaced` event to Kafka
  2. Create `StorefrontCheckoutController.java`:
     - `POST /api/v1/storefront/{slug}/checkout/shipping-rates` — get available rates
     - `POST /api/v1/storefront/{slug}/checkout` — submit order
  3. Create `SalesServiceClient.java` for order creation
  4. Create `PaymentServiceClient.java` for payment capture
  5. Create `InventoryServiceClient.java` for stock reservation
  6. Implement idempotency key to prevent double orders
- **Database changes**: `orders` table in sales-service gets `channel` column (coordinated change)
- **API endpoints**: Listed in step 2
- **Dependencies**: BE-005, sales-service, payment-service, inventory-service
- **Acceptance criteria**: Complete checkout creates order in sales-service with correct line items, tax, shipping, and payment; inventory is decremented
- **Priority**: P0
- **Complexity**: Large (13 SP)

**Enhanced with Product Spec Notes**: The checkout process must also:
- Validate that the cart total, tax, and shipping haven't changed since the customer last viewed them
- Support both guest checkout (no account) and logged-in customer checkout
- Handle shipping address validation (at minimum, required fields present)
- Provide clear error messages for payment failures (insufficient funds, card declined, etc.)
- Log all checkout steps for debugging failed orders
- Include tax calculation logic:
  * Determine tax rate based on shipping destination
  * Apply tax based on store's `tax_display` setting (inclusive/exclusive)
  * Handle tax-exempt products if supported
- Handle inventory edge case: if stock drops to zero between cart-add and checkout, show "item no longer available" error instead of crashing
- Support order notes/customer comments field
- Track the source channel explicitly: `channel = 'ONLINE'` on the order
- Emit structured `OrderPlaced` event with full line items for notification-service consumption

### BE-007: Customer Auth & Registration for Storefront
- **Title**: Customer registration, login, and profile management via storefront
- **Objective**: Allow storefront visitors to create accounts, log in, and manage their profile and addresses
- **Implementation steps**:
  1. Extend auth-service or create commerce-managed customer auth:
     - `POST /api/v1/storefront/{slug}/customers/register` — creates customer in CRM + auth credentials
     - `POST /api/v1/storefront/{slug}/customers/login` — returns customer JWT
     - `POST /api/v1/storefront/{slug}/customers/refresh` — refresh customer token
  2. Create `StorefrontCustomerController.java`:
     - `GET /api/v1/storefront/{slug}/customers/me` — profile
     - `PUT /api/v1/storefront/{slug}/customers/me` — update profile
     - `GET /api/v1/storefront/{slug}/customers/me/orders` — order history
     - `GET/POST/PUT/DELETE /api/v1/storefront/{slug}/customers/me/addresses` — saved addresses
  3. Customer JWT includes: `sub`, `tenant_id`, `customer_id`, `role=CUSTOMER`
  4. Security config: `/api/v1/storefront/**` paths are public-read; customer mutations require customer JWT
- **Database changes**: `customer_addresses` table (or extend CRM if addresses exist there)
- **API endpoints**: Listed in steps 1-2
- **Dependencies**: BE-002, crm-service, auth-service
- **Acceptance criteria**: Customer can register, login, see order history, manage addresses
- **Priority**: P0
- **Complexity**: Large (8 SP)

### BE-008: Shipping Zones & Rates
- **Title**: Shipping zone and rate configuration
- **Objective**: Allow merchants to define geographic shipping zones with rate rules (flat rate, free above threshold, weight-based)
- **Implementation steps**:
  1. Write Flyway migration V5__create_shipping_zones.sql
  2. Create `ShippingZone.java` entity and repository
  3. Create `ShippingZoneService.java` with CRUD
  4. Create `ShippingZoneController.java` (admin):
     - `GET/POST /api/v1/commerce/shipping-zones`
     - `GET/PUT/DELETE /api/v1/commerce/shipping-zones/{id}`
  5. Implement rate calculation: given a cart and destination address, find matching zone, compute lowest available rate
  6. Expose rate calculation via checkout shipping-rates endpoint (BE-006)
- **Database changes**: `shipping_zones` table
- **API endpoints**: Listed in step 4
- **Dependencies**: BE-002
- **Acceptance criteria**: Merchant creates zone "East Africa" with flat $10 rate; customer in Kenya sees $10 shipping at checkout
- **Priority**: P0
- **Complexity**: Medium (5 SP)

### BE-009: Theme Management
- **Title**: Storefront theme customization API
- **Objective**: CRUD API for theme settings (colors, fonts, layout choices) stored as JSONB
- **Implementation steps**:
  1. Write Flyway migration V6__create_themes.sql
  2. Create `Theme.java` entity and repository
  3. Create `ThemeService.java`
  4. Create `ThemeController.java` (admin):
     - `GET/PUT /api/v1/commerce/theme` — get/update active theme
     - `POST /api/v1/commerce/theme/preview` — preview theme without saving
  5. Create `StorefrontThemeController.java` (public):
     - `GET /api/v1/storefront/{slug}/theme` — returns active theme (no auth needed)
- **Database changes**: `themes` table
- **API endpoints**: Listed in steps 4-5
- **Dependencies**: BE-002
- **Acceptance criteria**: Merchant changes primary color; storefront re-renders with new color on next page load
- **Priority**: P1
- **Complexity**: Small (3 SP)

### BE-010: Navigation Menu Builder
- **Title**: Header and footer navigation menu API
- **Objective**: CRUD for navigation menus stored as ordered JSONB arrays
- **Implementation steps**:
  1. Write Flyway migration V7__create_navigation_menus.sql
  2. Create `NavigationMenu.java` entity and repository
  3. Create `NavigationService.java`
  4. Create `NavigationController.java` (admin):
     - `GET/PUT /api/v1/commerce/navigation/{location}` — get/update menu for header/footer
  5. Public endpoint: `GET /api/v1/storefront/{slug}/navigation` returns all menus
- **Database changes**: `navigation_menus` table
- **API endpoints**: Listed in steps 4-5
- **Dependencies**: BE-002
- **Acceptance criteria**: Merchant reorders navigation items; storefront reflects new order
- **Priority**: P1
- **Complexity**: Small (3 SP)

### BE-011: CMS Pages
- **Title**: Store page management (About, Contact, FAQ, Terms, etc.)
- **Objective**: Rich text page CRUD with automatic routing on storefront
- **Implementation steps**:
  1. Write Flyway migration V8__create_store_pages.sql
  2. Create `StorePage.java` entity and repository
  3. Create `PageService.java`
  4. Create `PageController.java` (admin CRUD)
  5. Create `StorefrontPageController.java` (public read by key)
- **Database changes**: `store_pages` table
- **API endpoints**:
  - Admin: `GET/POST/PUT/DELETE /api/v1/commerce/pages`
  - Public: `GET /api/v1/storefront/{slug}/pages/{key}`
- **Dependencies**: BE-002
- **Acceptance criteria**: Merchant creates "About Us" page; renders at `/store/{slug}/page/about`
- **Priority**: P1
- **Complexity**: Small (3 SP)

### BE-012: Marketing Banners
- **Title**: Marketing banner management
- **Objective**: CRUD for promotional banners with scheduling
- **Implementation steps**:
  1. Write Flyway migration V9__create_marketing_banners.sql
  2. Create `MarketingBanner.java` entity and repository
  3. Create `BannerService.java` with date-range filtering
  4. Create `BannerController.java` (admin CRUD)
  5. Public endpoint returns only currently active banners
- **Database changes**: `marketing_banners` table
- **API endpoints**:
  - Admin: `GET/POST/PUT/DELETE /api/v1/commerce/banners`
  - Public: `GET /api/v1/storefront/{slug}/banners`
- **Dependencies**: BE-002
- **Acceptance criteria**: Scheduled banner appears/disappears automatically based on start/end dates
- **Priority**: P2
- **Complexity**: Small (3 SP)

### BE-013: SEO Defaults & Sitemap
- **Title**: Global SEO settings and dynamic sitemap generation
- **Objective**: Store-wide SEO defaults and auto-generated XML sitemap
- **Implementation steps**:
  1. Write Flyway migration V10__create_seo_defaults.sql
  2. Create `SeoDefaults.java` entity and repository
  3. Create `SeoService.java`
  4. Create `SeoController.java` (admin GET/PUT)
  5. Create `SitemapService.java` — generates XML sitemap of all published products + pages
  6. Create `SitemapController.java` (public):
     - `GET /api/v1/storefront/{slug}/sitemap.xml`
  7. Add robots.txt route to gateway: `GET /robots.txt` → commerce-service, returns static txt pointing to sitemap
- **Database changes**: `seo_defaults` table
- **API endpoints**: Listed in steps 4, 6
- **Dependencies**: BE-002, BE-003
- **Acceptance criteria**: `sitemap.xml` contains all published products and pages; Google Search Console validates it
- **Priority**: P1
- **Complexity**: Small (3 SP)

### BE-014: Custom Domain Management
- **Title**: Custom domain verification and mapping
- **Objective**: Allow merchants to map custom domains to their storefront
- **Implementation steps**:
  1. Write Flyway migration V11__create_custom_domains.sql
  2. Create `CustomDomain.java` entity and repository
  3. Create `DomainService.java`:
     - `addDomain(storeId, domain)` — generates verification code
     - `verifyDomain(domainId)` — checks DNS TXT record
     - `getStoreByDomain(domain)` — resolves domain → store slug
  4. Create `DomainController.java` (admin):
     - `POST /api/v1/commerce/domains` — add domain
     - `POST /api/v1/commerce/domains/{id}/verify` — trigger verification
     - `GET /api/v1/commerce/domains/{id}/status` — check verification status
     - `DELETE /api/v1/commerce/domains/{id}` — remove domain
  5. Create public endpoint: `GET /api/v1/storefront/resolve` — given Host header, returns store slug (used by frontend bootstrap)
- **Database changes**: `custom_domains` table
- **API endpoints**: Listed in steps 4-5
- **Dependencies**: BE-002
- **Acceptance criteria**: Merchant adds `shop.mystore.com`, verifies DNS, storefront loads at custom domain
- **Priority**: P1
- **Complexity**: Medium (5 SP)

### BE-015: Store Settings Extension
- **Title**: Extended store settings with JSONB settings blob
- **Objective**: Flexible key-value store for additional store configuration
- **Implementation steps**:
  1. Write Flyway migration V12__create_store_settings.sql
  2. Create `StoreSettings.java` entity and repository
  3. Create `StoreSettingsService.java`
  4. Extend `StoreSettingsController.java` with `PUT /api/v1/commerce/settings/extended`
- **Database changes**: `store_settings` table
- **Dependencies**: BE-002
- **Acceptance criteria**: Arbitrary settings stored and retrieved
- **Priority**: P2
- **Complexity**: Small (2 SP)

### BE-016: Commerce Analytics Endpoints
- **Title**: Commerce-specific analytics data API
- **Objective**: Provide aggregated commerce metrics for the admin dashboard
- **Implementation steps**:
  1. Create `CommerceAnalyticsController.java` (admin):
     - `GET /api/v1/commerce/analytics/summary` — orders, revenue, AOV, conversion rate (period-filtered)
     - `GET /api/v1/commerce/analytics/top-products` — best-selling online products
     - `GET /api/v1/commerce/analytics/orders-over-time` — daily order counts
  2. Create service that queries sales-service + payment-service for online-channel data
- **Database changes**: None (read-only from existing services)
- **API endpoints**: Listed in step 1
- **Dependencies**: BE-006, sales-service, payment-service
- **Acceptance criteria**: Dashboard shows online order count, revenue, and top products for last 30 days
- **Priority**: P1
- **Complexity**: Medium (5 SP)

### BE-017: Product Search
- **Title**: Full-text product search with PostgreSQL tsvector
- **Objective**: Fast, typo-tolerant product search for the storefront
- **Implementation steps**:
  1. Add `search_vector` column to `published_products` via migration
  2. Create database trigger to update tsvector on insert/update
  3. Create `StorefrontSearchController.java`:
     - `GET /api/v1/storefront/{slug}/search?q=...&category=...&sort=...&page=...`
  4. Implement search query with `ts_rank`, `ts_headline`, and trigram similarity for typo tolerance
  5. Cache popular search results in Redis
- **Database changes**: `search_vector` column on `published_products`
- **API endpoints**: Listed in step 3
- **Dependencies**: BE-003
- **Acceptance criteria**: Search for "sneker" returns "Sneakers"; results ranked by relevance
- **Priority**: P0
- **Complexity**: Medium (5 SP)

### BE-018: Inter-Service Client Resilience
- **Title**: Circuit breakers and retries for inter-service REST calls
- **Objective**: Ensure commerce-service degrades gracefully when dependent services are unavailable
- **Implementation steps**:
  1. Add Resilience4j to commerce-service pom.xml
  2. Configure circuit breakers for each service client (product, inventory, sales, payment)
  3. Configure retry with exponential backoff (max 3 retries)
  4. Add fallback responses: product-service down → show cached data; inventory-service down → hide stock level
  5. Add health indicators for each downstream service
- **Database changes**: None
- **API endpoints**: Health endpoint includes downstream status
- **Dependencies**: BE-003, BE-005, BE-006
- **Acceptance criteria**: When product-service is down, storefront shows cached products instead of error page
- **Priority**: P1
- **Complexity**: Medium (5 SP)

### BE-019: Kafka Event Publishing
- **Title**: Outbox-based event publishing for commerce domain events
- **Objective**: Reliably publish commerce events to Kafka for consumption by other services
- **Implementation steps**:
  1. Add outbox-relay dependency (existing shared lib)
  2. Define event types: `OrderPlaced`, `ProductPublished`, `ProductUnpublished`, `StoreActivated`, `StoreDeactivated`
  3. Write outbox events in same transaction as domain writes
  4. Configure Kafka topics in application.yml
- **Database changes**: Outbox table (managed by outbox-relay lib)
- **Dependencies**: BE-001, outbox-relay lib
- **Acceptance criteria**: OrderPlaced event published to Kafka within 1 second of order creation
- **Priority**: P1
- **Complexity**: Medium (5 SP)

### BE-020: Storefront API Rate Limiting
- **Title**: Rate limiting for public storefront endpoints
- **Objective**: Protect commerce APIs from abuse while allowing legitimate traffic
- **Implementation steps**:
  1. Configure gateway rate limiter for storefront routes:
     - Product browsing: 100 req/min per IP
     - Search: 30 req/min per IP
     - Cart: 60 req/min per IP
     - Checkout: 10 req/min per IP
  2. Add IP-based and token-based rate limit resolvers
  3. Return 429 with `Retry-After` header when exceeded
- **Database changes**: None (Redis-based at gateway)
- **Dependencies**: BE-001, gateway
- **Acceptance criteria**: Rapid search requests receive 429; normal browsing unaffected
- **Priority**: P1
- **Complexity**: Small (2 SP)

---

## 13. Frontend Engineer Detailed Task Breakdown

### FE-001: Route & Layout Setup
- **Title**: Commerce route definitions and storefront/admin layouts
- **Objective**: Set up the route structure and layout components for both admin and storefront views
- **Pages/components to build**:
  1. `CommerceRoutes.tsx` — route definitions for `/admin/commerce/*` and `/store/:slug/*`
  2. `StorefrontLayout.tsx` — public layout (header, content, footer, no sidebar)
  3. `CommerceAdminLayout.tsx` — wrapper that reuses FullLayout with commerce-specific breadcrumbs
  4. Update `Router.tsx` to include commerce routes
  5. `ThemeProvider.tsx` — loads theme from API and injects CSS custom properties
- **API integrations required**: `GET /api/v1/storefront/{slug}/theme` for theme loading
- **Dependencies**: BE-001 (gateway routes)
- **Acceptance criteria**: Navigating to `/store/teststore` renders StorefrontLayout; `/admin/commerce/dashboard` renders within FullLayout
- **Priority**: P0 (blocks all FE work)
- **Complexity**: Medium (5 SP)

### FE-002: Commerce Admin — Store Settings
- **Title**: Store settings configuration page
- **Objective**: Merchant can configure store name, contact info, social links, currency, timezone, and tax settings
- **Pages/components to build**:
  1. `views/commerce/admin/StoreSettings.tsx` — form with sections:
     - General (name, slug, status)
     - Contact (email, phone, address)
     - Regional (currency, timezone, tax display)
     - Social links
  2. Reuse existing form patterns: `EditDrawer` or inline forms, same validation style
- **API integrations required**:
  - `GET /api/v1/commerce/settings`
  - `PUT /api/v1/commerce/settings`
- **Dependencies**: BE-002, FE-001
- **Acceptance criteria**: Save store settings; reload page shows persisted values; validation errors displayed inline
- **Priority**: P0
- **Complexity**: Medium (5 SP)

### FE-003: Commerce Admin — Product Publishing
- **Title**: Product publishing management page
- **Objective**: Merchant can browse POS products, toggle them online, set SEO/display settings per product
- **Pages/components to build**:
  1. `views/commerce/admin/ProductPublishing.tsx` — table of all POS products with online status toggle
  2. `ProductPublishDrawer.tsx` — slide-out panel for per-product SEO, slug, gallery, featured flag
  3. Reuse `DataTable.tsx`, `FilterBar.tsx` components
  4. Batch actions: "Publish selected", "Unpublish selected"
- **API integrations required**:
  - `GET /api/v1/products` (existing) — POS product catalog
  - `GET /api/v1/commerce/products` — published product metadata
  - `POST /api/v1/commerce/products/publish`
  - `DELETE /api/v1/commerce/products/{id}/unpublish`
  - `PUT /api/v1/commerce/products/{id}`
- **Dependencies**: BE-003, FE-001
- **Acceptance criteria**: Toggle a product online; appears in storefront; set custom slug and SEO; changes persist
- **Priority**: P0
- **Complexity**: Large (8 SP)

### FE-004: Commerce Admin — Category Display
- **Title**: Category display management page
- **Objective**: Manage category visibility, ordering, and display settings for the storefront
- **Pages/components to build**:
  1. `views/commerce/admin/CategoryDisplay.tsx` — drag-to-reorder category tree
  2. `CategoryEditModal.tsx` — edit name override, description, image
  3. Reuse existing category data from product-service
- **API integrations required**:
  - `GET /api/v1/categories` (existing)
  - `GET/POST/PUT/DELETE /api/v1/commerce/categories`
- **Dependencies**: BE-004, FE-001
- **Acceptance criteria**: Reorder categories; changes reflect on storefront navigation
- **Priority**: P0
- **Complexity**: Medium (5 SP)

### FE-005: Commerce Admin — Theme Customizer
- **Title**: Visual theme customization page
- **Objective**: Merchant can customize storefront colors, fonts, and layout options with live preview
- **Pages/components to build**:
  1. `views/commerce/admin/ThemeCustomizer.tsx` — split view: controls on left, preview on right
  2. Color pickers for primary, secondary, accent, background, text
  3. Font family selector (Google Fonts subset)
  4. Homepage layout options (hero style, featured product count)
  5. Header/footer style toggles
  6. Custom CSS textarea (with syntax highlighting)
  7. Preview pane renders a mini storefront with current theme values
- **API integrations required**:
  - `GET /api/v1/commerce/theme`
  - `PUT /api/v1/commerce/theme`
  - `POST /api/v1/commerce/theme/preview`
- **Dependencies**: BE-009, FE-001
- **Acceptance criteria**: Change primary color → preview updates immediately → save → storefront uses new color
- **Priority**: P1
- **Complexity**: Large (8 SP)

### FE-006: Commerce Admin — Shipping Zones
- **Title**: Shipping zone and rate configuration page
- **Objective**: Merchant defines shipping zones with countries/regions and rate rules
- **Pages/components to build**:
  1. `views/commerce/admin/ShippingZones.tsx` — list of zones with expandable rate tables
  2. `ShippingZoneForm.tsx` — create/edit zone with country multi-select and rate builder
  3. Rate type forms: flat rate, free above threshold, weight-based with ranges
- **API integrations required**:
  - `GET/POST/PUT/DELETE /api/v1/commerce/shipping-zones`
- **Dependencies**: BE-008, FE-001
- **Acceptance criteria**: Create zone "East Africa" with $10 flat rate; edit; delete; all persist
- **Priority**: P0
- **Complexity**: Medium (5 SP)

### FE-007: Commerce Admin — Navigation Builder
- **Title**: Visual navigation menu builder
- **Objective**: Drag-and-drop menu builder for header and footer navigation
- **Pages/components to build**:
  1. `views/commerce/admin/NavigationBuilder.tsx` — two tabs: Header, Footer
  2. Drag-and-drop menu item list with: label, type (page/category/link), target
  3. Add menu item modal with type-specific fields
  4. Nested menu support (dropdowns) — 2 levels max
- **API integrations required**:
  - `GET/PUT /api/v1/commerce/navigation/{location}`
  - `GET /api/v1/commerce/pages` (for page linking)
  - `GET /api/v1/commerce/categories` (for category linking)
- **Dependencies**: BE-010, FE-004
- **Acceptance criteria**: Build 5-item header menu with one dropdown; save; storefront renders correct menu
- **Priority**: P1
- **Complexity**: Medium (5 SP)

### FE-008: Commerce Admin — Page Editor
- **Title**: Rich text page editor for CMS pages
- **Objective**: Create and edit About, Contact, FAQ, Terms, and other store pages
- **Pages/components to build**:
  1. `views/commerce/admin/PageEditor.tsx` — list of pages + editor
  2. Rich text editor integration — use TipTap or Quill (lightweight, MUI-compatible)
  3. SEO metadata fields per page (meta title, description)
  4. Preview button that opens storefront page in new tab
- **API integrations required**:
  - `GET/POST/PUT/DELETE /api/v1/commerce/pages`
- **Dependencies**: BE-011, FE-001
- **Acceptance criteria**: Create "About Us" page with formatted text; save; renders on storefront
- **Priority**: P1
- **Complexity**: Medium (5 SP)

### FE-009: Commerce Admin — Banner Manager
- **Title**: Marketing banner management
- **Objective**: Create, schedule, and manage promotional banners
- **Pages/components to build**:
  1. `views/commerce/admin/BannerManager.tsx` — banner list with status indicators
  2. `BannerForm.tsx` — create/edit with: name, location, image upload, link, colors, date range
  3. Image upload integration (reuse existing image upload from product-service)
- **API integrations required**:
  - `GET/POST/PUT/DELETE /api/v1/commerce/banners`
  - Image upload endpoint (existing from product-service)
- **Dependencies**: BE-012, FE-001
- **Acceptance criteria**: Create hero banner; activate; appears on storefront; deactivates after end date
- **Priority**: P2
- **Complexity**: Small (3 SP)

### FE-010: Commerce Admin — SEO Settings
- **Title**: Global SEO configuration page
- **Objective**: Set site-wide SEO defaults, Google Analytics ID, social sharing image
- **Pages/components to build**:
  1. `views/commerce/admin/SeoSettings.tsx` — form with:
     - Site title template
     - Default meta description
     - OG image upload
     - Twitter handle
     - Google Analytics measurement ID
     - Google site verification code
- **API integrations required**:
  - `GET/PUT /api/v1/commerce/seo`
- **Dependencies**: BE-013, FE-001
- **Acceptance criteria**: Set GA ID; save; storefront pages include GA script
- **Priority**: P1
- **Complexity**: Small (3 SP)

### FE-011: Commerce Admin — Domain Manager
- **Title**: Custom domain management page
- **Objective**: Add, verify, and manage custom domains
- **Pages/components to build**:
  1. `views/commerce/admin/DomainManager.tsx` — domain list with verification status
  2. `AddDomainDialog.tsx` — domain input + DNS instructions display
  3. Verification status polling (check every 30s when pending)
- **API integrations required**:
  - `POST /api/v1/commerce/domains`
  - `POST /api/v1/commerce/domains/{id}/verify`
  - `GET /api/v1/commerce/domains/{id}/status`
  - `DELETE /api/v1/commerce/domains/{id}`
- **Dependencies**: BE-014, FE-001
- **Acceptance criteria**: Add domain; see DNS instructions; verify; status shows "Active"
- **Priority**: P1
- **Complexity**: Small (3 SP)

### FE-012: Commerce Admin — Dashboard
- **Title**: Commerce overview dashboard
- **Objective**: At-a-glance commerce KPIs for the merchant
- **Pages/components to build**:
  1. `views/commerce/admin/CommerceDashboard.tsx` — grid of metric cards and charts
  2. Metric cards: Online orders (today/week/month), Online revenue, Conversion rate, AOV
  3. Charts: Orders over time (line chart), Top products (bar chart) — reuse existing Recharts/ApexCharts
  4. Recent orders table
- **API integrations required**:
  - `GET /api/v1/commerce/analytics/summary`
  - `GET /api/v1/commerce/analytics/top-products`
  - `GET /api/v1/commerce/analytics/orders-over-time`
- **Dependencies**: BE-016, FE-001
- **Acceptance criteria**: Dashboard loads with real data; period selectors filter charts
- **Priority**: P1
- **Complexity**: Medium (5 SP)

### FE-013: Commerce Admin — Orders View
- **Title**: Online orders management page
- **Objective**: View and manage orders placed through the online store
- **Pages/components to build**:
  1. `views/commerce/admin/CommerceOrders.tsx` — orders table reusing existing order table components
  2. Filter by: status, date range, customer
  3. Order detail drawer (read-only or with status update)
  4. Reuse existing order management patterns from POS
- **API integrations required**:
  - `GET /api/v1/sales` (existing, filtered by channel=ONLINE)
  - `GET /api/v1/sales/{id}` (existing)
- **Dependencies**: BE-006, FE-001
- **Acceptance criteria**: Orders table shows online orders; filterable; detail view works
- **Priority**: P1
- **Complexity**: Medium (5 SP)

### FE-014: Storefront — Homepage
- **Title**: Public storefront homepage
- **Objective**: Dynamic homepage that renders based on theme settings and published products
- **Pages/components to build**:
  1. `views/commerce/storefront/HomePage.tsx` — sections determined by theme:
     - Hero banner (from marketing banners)
     - Featured products grid
     - Category highlights
     - Announcement bar (from marketing banners)
  2. `components/commerce/BannerCarousel.tsx` — hero slider
  3. `components/commerce/FeaturedProducts.tsx` — product grid section
  4. `components/commerce/ProductCard.tsx` — reusable product card (image, name, price, "Add to Cart")
- **API integrations required**:
  - `GET /api/v1/storefront/{slug}/products/featured`
  - `GET /api/v1/storefront/{slug}/categories`
  - `GET /api/v1/storefront/{slug}/banners`
  - `GET /api/v1/storefront/{slug}/theme`
- **Dependencies**: BE-003, BE-004, BE-012, BE-009
- **Acceptance criteria**: Homepage renders with hero, featured products, category links; responsive; fast load
- **Priority**: P0
- **Complexity**: Large (8 SP)

### FE-015: Storefront — Product Listing
- **Title**: Category and search product listing pages
- **Objective**: Browsable product grid with filters, sorting, and pagination
- **Pages/components to build**:
  1. `views/commerce/storefront/ProductListPage.tsx` — category view
  2. `views/commerce/storefront/SearchResultsPage.tsx` — search results
  3. `components/commerce/ProductGrid.tsx` — responsive grid (2/3/4 columns)
  4. Filter sidebar: category, price range, brand (reuse FilterBar patterns)
  5. Sort dropdown: price asc/desc, newest, name
  6. Pagination or infinite scroll
- **API integrations required**:
  - `GET /api/v1/storefront/{slug}/products` (with filters)
  - `GET /api/v1/storefront/{slug}/search?q=...`
  - `GET /api/v1/storefront/{slug}/categories`
- **Dependencies**: BE-003, BE-017, FE-014
- **Acceptance criteria**: Browse category → see products → filter by price → sort → paginate; search returns relevant results
- **Priority**: P0
- **Complexity**: Large (8 SP)

### FE-016: Storefront — Product Detail Page
- **Title**: Product detail page with variant selection and add-to-cart
- **Objective**: Full product detail page with images, variants, stock status, and purchase flow
- **Pages/components to build**:
  1. `views/commerce/storefront/ProductDetailPage.tsx`
  2. Image gallery with zoom (lightweight — CSS-based or simple library)
  3. Variant selector (size, color, etc.)
  4. Quantity selector
  5. Stock status indicator ("In Stock", "Only 3 left", "Out of Stock")
  6. Add to cart button (with loading state)
  7. Product description (rendered HTML)
  8. Breadcrumb: Home > Category > Product
  9. `SeoHead.tsx` — React Helmet for meta tags
- **API integrations required**:
  - `GET /api/v1/storefront/{slug}/products/{idOrSlug}`
  - `POST /api/v1/storefront/{slug}/cart/items`
- **Dependencies**: BE-003, BE-005, FE-014
- **Acceptance criteria**: Product page shows images, variants, price, stock; add to cart works; SEO tags are correct
- **Priority**: P0
- **Complexity**: Large (8 SP)

### FE-017: Storefront — Shopping Cart
- **Title**: Cart page with quantity management and checkout CTA
- **Objective**: Full cart page showing line items, totals, and checkout button
- **Pages/components to build**:
  1. `views/commerce/storefront/CartPage.tsx`
  2. `components/commerce/CartSummary.tsx` — subtotal, shipping (estimated), tax, total
  3. `components/commerce/CartDrawer.tsx` — slide-out cart (shown from any page)
  4. Line item: image, name, variant, unit price, quantity editor, line total, remove
  5. Empty cart state with "Continue Shopping" CTA
  6. Cross-sell / related products section
- **API integrations required**:
  - `GET /api/v1/storefront/{slug}/cart`
  - `PUT /api/v1/storefront/{slug}/cart/items/{id}`
  - `DELETE /api/v1/storefront/{slug}/cart/items/{id}`
- **Dependencies**: BE-005, FE-014
- **Acceptance criteria**: Cart shows correct items, quantities, and totals; updating quantity recalculates; remove item works
- **Priority**: P0
- **Complexity**: Medium (5 SP)

### FE-018: Storefront — Checkout
- **Title**: Multi-step checkout flow
- **Objective**: Smooth 3-step checkout: shipping → payment → review → confirm
- **Pages/components to build**:
  1. `views/commerce/storefront/CheckoutPage.tsx`
  2. `components/commerce/CheckoutSteps.tsx` — step indicator
  3. Step 1 — Shipping: address form, shipping method selection (radio cards with price/days)
  4. Step 2 — Payment: Stripe Elements card input, billing address (same as shipping toggle)
  5. Step 3 — Review: order summary, line items, totals, place order button
  6. `views/commerce/storefront/OrderConfirmationPage.tsx` — success page with order number
  7. Guest checkout: optional account creation prompt on confirmation page
- **API integrations required**:
  - `POST /api/v1/storefront/{slug}/checkout/shipping-rates`
  - `POST /api/v1/storefront/{slug}/checkout`
  - Stripe.js for card element (client-side tokenization)
- **Dependencies**: BE-006, BE-008
- **Acceptance criteria**: Complete checkout flow; order created; confirmation page shown; order appears in admin
- **Priority**: P0
- **Complexity**: Large (13 SP)

### FE-019: Storefront — Customer Account
- **Title**: Customer account pages (login, register, profile, orders, addresses)
- **Objective**: Full customer account management on the storefront
- **Pages/components to build**:
  1. `views/commerce/storefront/CustomerLoginPage.tsx`
  2. `views/commerce/storefront/CustomerRegisterPage.tsx`
  3. `views/commerce/storefront/CustomerAccountPage.tsx` — profile form
  4. `views/commerce/storefront/CustomerOrdersPage.tsx` — order history table
  5. `views/commerce/storefront/CustomerAddressesPage.tsx` — saved addresses CRUD
  6. Account nav sidebar (Orders, Addresses, Profile, Logout)
- **API integrations required**:
  - `POST /api/v1/storefront/{slug}/customers/register`
  - `POST /api/v1/storefront/{slug}/customers/login`
  - `GET/PUT /api/v1/storefront/{slug}/customers/me`
  - `GET /api/v1/storefront/{slug}/customers/me/orders`
  - `GET/POST/PUT/DELETE /api/v1/storefront/{slug}/customers/me/addresses`
- **Dependencies**: BE-007
- **Acceptance criteria**: Register, login, view orders, manage addresses; session persists across page reloads
- **Priority**: P0
- **Complexity**: Large (8 SP)

### FE-020: Storefront — Navigation & Footer
- **Title**: Dynamic header navigation and footer from menu API
- **Objective**: Render navigation menus as configured by the merchant
- **Pages/components to build**:
  1. `components/commerce/StoreHeader.tsx` — logo, navigation, search icon, cart icon with count badge, account icon
  2. `components/commerce/StoreFooter.tsx` — multi-column footer with navigation, contact, social links, copyright
  3. `components/commerce/NavigationMenu.tsx` — recursive menu renderer (supports 2-level dropdowns)
  4. `components/commerce/SearchBar.tsx` — search input with autocomplete
  5. Mobile responsive: hamburger menu, slide-out cart
- **API integrations required**:
  - `GET /api/v1/storefront/{slug}/navigation`
  - `GET /api/v1/storefront/{slug}/theme`
- **Dependencies**: BE-010, BE-009
- **Acceptance criteria**: Header shows correct nav items; dropdowns work; mobile hamburger works; cart badge updates
- **Priority**: P1
- **Complexity**: Medium (5 SP)

### FE-021: Storefront — CMS Pages
- **Title**: Dynamic CMS page rendering
- **Objective**: Render store pages (About, Contact, FAQ) from CMS data
- **Pages/components to build**:
  1. `views/commerce/storefront/StorePage.tsx` — generic page renderer
  2. Contact page variant with contact form (optional, can be in rich text)
  3. Breadcrumb integration
- **API integrations required**:
  - `GET /api/v1/storefront/{slug}/pages/{key}`
- **Dependencies**: BE-011
- **Acceptance criteria**: Navigate to `/store/{slug}/page/about`; renders formatted content
- **Priority**: P1
- **Complexity**: Small (3 SP)

### FE-022: Storefront — SEO Head Component
- **Title**: Dynamic SEO meta tags for all storefront pages
- **Objective**: Every storefront page renders correct title, description, OG tags, and structured data
- **Pages/components to build**:
  1. `components/commerce/SeoHead.tsx` — React Helmet wrapper
  2. Integrate into: HomePage, ProductListPage, ProductDetailPage, SearchResultsPage, StorePage
  3. Structured data (JSON-LD): Product schema on PDP, BreadcrumbList, Organization on homepage
- **API integrations required**: SEO data comes from respective API responses
- **Dependencies**: BE-013, FE-014 through FE-021
- **Acceptance criteria**: Product page has correct `<title>`, `<meta name="description">`, `og:image`; Google Rich Results Test passes
- **Priority**: P1
- **Complexity**: Small (3 SP)

### FE-023: Commerce API Client
- **Title**: Commerce API functions and types
- **Objective**: TypeScript API client and types for all commerce endpoints
- **Pages/components to build**:
  1. `api/smartpos/commerce.ts` — all commerce API functions using the existing `api` (axios) instance
  2. `types/commerce.ts` — TypeScript interfaces for all commerce entities
- **API integrations required**: All commerce backend endpoints
- **Dependencies**: BE-002 through BE-017 (types mirror DTOs)
- **Acceptance criteria**: All API functions typed; request/response types match backend DTOs
- **Priority**: P0 (parallel with backend)
- **Complexity**: Medium (5 SP)

### FE-024: Commerce Context Provider
- **Title**: Commerce state management context
- **Objective**: Centralized state for commerce admin and storefront
- **Pages/components to build**:
  1. `context/CommerceContext/index.tsx` — two providers:
     - `CommerceAdminProvider` — store settings, published products list, theme config
     - `StorefrontProvider` — current store, cart, customer session, theme
  2. Cart state: add, remove, update quantity, clear, merge
  3. Customer state: login, logout, profile
- **API integrations required**: All commerce APIs through FE-023
- **Dependencies**: FE-023
- **Acceptance criteria**: Components can access commerce state via context hooks; cart persists in localStorage; customer session persists
- **Priority**: P0
- **Complexity**: Medium (5 SP)

### FE-025: Responsive Storefront
- **Title**: Mobile-responsive design for all storefront pages
- **Objective**: Storefront works seamlessly on mobile devices (320px — 428px width)
- **Pages/components to build**:
  1. Mobile navigation (hamburger menu with slide-out)
  2. Mobile-optimized product grid (2 columns)
  3. Mobile cart as full-screen overlay
  4. Mobile checkout (stacked layout, large touch targets)
  5. Mobile account pages (stacked, no sidebar)
  6. Touch-friendly quantity selectors and buttons
- **API integrations required**: None (presentation only)
- **Dependencies**: FE-014 through FE-021
- **Acceptance criteria**: All storefront pages pass mobile layout review; tap targets >= 44px; no horizontal scroll
- **Priority**: P1
- **Complexity**: Medium (5 SP)

### FE-026: Loading & Error States
- **Title**: Loading skeletons and error boundaries for storefront
- **Objective**: Polished loading and error experiences for all storefront pages
- **Pages/components to build**:
  1. Product card skeleton (pulsing placeholder)
  2. Product grid skeleton
  3. Product detail skeleton
  4. Cart skeleton
  5. Error boundary component with "Try Again" button
  6. Offline indicator ("You appear to be offline")
  7. Empty states: no products found, empty cart, no orders
- **API integrations required**: None (presentation only)
- **Dependencies**: FE-014 through FE-021
- **Acceptance criteria**: During API load, skeleton placeholders show; on error, user sees helpful message with retry
- **Priority**: P2
- **Complexity**: Small (3 SP)

---

## 14. API Contract Guidelines

### URL Naming Conventions

- **Storefront (public)**: `/api/v1/storefront/{storeSlug}/...`
- **Admin**: `/api/v1/commerce/...`

### Request/Response Standards

- All request/response bodies are JSON
- Dates in ISO 8601 format
- Pagination follows existing Letis POS convention: Spring `Page` with `content`, `totalElements`, `totalPages`, `number`, `size`
- Errors follow existing `GlobalExceptionHandler` pattern:

```json
{
  "status": 400,
  "error": "Bad Request",
  "message": "Product is already published",
  "path": "/api/v1/commerce/products/publish",
  "timestamp": "2026-05-12T10:30:00Z"
}
```

### Storefront API Design (Public-Facing)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/storefront/{slug}/theme` | GET | None | Active theme settings |
| `/api/v1/storefront/{slug}/navigation` | GET | None | All navigation menus |
| `/api/v1/storefront/{slug}/products` | GET | None | Paginated product list |
| `/api/v1/storefront/{slug}/products/featured` | GET | None | Featured products |
| `/api/v1/storefront/{slug}/products/{idOrSlug}` | GET | None | Product detail + stock |
| `/api/v1/storefront/{slug}/categories` | GET | None | Category tree |
| `/api/v1/storefront/{slug}/search` | GET | None | Full-text search |
| `/api/v1/storefront/{slug}/pages/{key}` | GET | None | CMS page by key |
| `/api/v1/storefront/{slug}/banners` | GET | None | Active banners |
| `/api/v1/storefront/{slug}/sitemap.xml` | GET | None | XML sitemap |
| `/api/v1/storefront/{slug}/cart` | GET | Cart cookie | Get cart |
| `/api/v1/storefront/{slug}/cart/items` | POST | Cart cookie | Add to cart |
| `/api/v1/storefront/{slug}/cart/items/{id}` | PUT/DELETE | Cart cookie | Update/remove item |
| `/api/v1/storefront/{slug}/cart/merge` | POST | Customer JWT | Merge guest→customer |
| `/api/v1/storefront/{slug}/checkout/shipping-rates` | POST | Cart cookie | Get shipping rates |
| `/api/v1/storefront/{slug}/checkout` | POST | Cart cookie | Submit order |
| `/api/v1/storefront/{slug}/customers/register` | POST | None | Register |
| `/api/v1/storefront/{slug}/customers/login` | POST | None | Login |
| `/api/v1/storefront/{slug}/customers/me` | GET/PUT | Customer JWT | Profile |
| `/api/v1/storefront/{slug}/customers/me/orders` | GET | Customer JWT | Order history |
| `/api/v1/storefront/{slug}/customers/me/addresses` | CRUD | Customer JWT | Saved addresses |
| `/api/v1/storefront/resolve` | GET | None | Domain → store slug |

### Admin API Design

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/commerce/settings` | GET/PUT | commerce.settings | Store settings |
| `/api/v1/commerce/products` | GET | commerce.products | List published products |
| `/api/v1/commerce/products/publish` | POST | commerce.products | Publish a product |
| `/api/v1/commerce/products/{id}` | PUT | commerce.products | Update published product |
| `/api/v1/commerce/products/{id}/unpublish` | DELETE | commerce.products | Unpublish product |
| `/api/v1/commerce/categories` | CRUD | commerce.products | Category display |
| `/api/v1/commerce/theme` | GET/PUT | commerce.theme | Theme settings |
| `/api/v1/commerce/shipping-zones` | CRUD | commerce.shipping | Shipping zones |
| `/api/v1/commerce/navigation/{location}` | GET/PUT | commerce.navigation | Menu builder |
| `/api/v1/commerce/pages` | CRUD | commerce.pages | CMS pages |
| `/api/v1/commerce/banners` | CRUD | commerce.products | Marketing banners |
| `/api/v1/commerce/seo` | GET/PUT | commerce.settings | SEO defaults |
| `/api/v1/commerce/domains` | POST/DELETE | commerce.domains | Custom domains |
| `/api/v1/commerce/domains/{id}/verify` | POST | commerce.domains | Verify domain |
| `/api/v1/commerce/domains/{id}/status` | GET | commerce.domains | Domain status |
| `/api/v1/commerce/analytics/summary` | GET | commerce.analytics | KPI summary |
| `/api/v1/commerce/analytics/top-products` | GET | commerce.analytics | Top products |
| `/api/v1/commerce/analytics/orders-over-time` | GET | commerce.analytics | Order timeline |

### Field Standards for Storefront Product Response

```json
{
  "id": "uuid",
  "slug": "product-slug",
  "name": "Product Name",
  "description": "<p>Rich HTML description</p>",
  "price": {"amount": 29.99, "currency": "USD", "display": "$29.99"},
  "compareAtPrice": null,
  "images": [
    {"url": "...", "alt": "...", "width": 800, "height": 800}
  ],
  "variants": [
    {"name": "Size", "values": ["S", "M", "L", "XL"]},
    {"name": "Color", "values": ["Red", "Blue"]}
  ],
  "category": {"id": "uuid", "name": "Category Name", "slug": "category-slug"},
  "brand": {"id": "uuid", "name": "Brand Name"},
  "stock": {"status": "in_stock", "quantity": 42, "lowStockThreshold": 5},
  "isFeatured": true,
  "seo": {"title": "...", "description": "..."},
  "createdAt": "2026-05-12T10:00:00Z"
}
```

---

## 15. Testing Strategy

### Backend Testing

| Layer | Tool | Coverage Target | Notes |
|-------|------|-----------------|-------|
| Unit (services) | JUnit 5 + Mockito | 80%+ | Mock all external dependencies |
| Unit (domain) | JUnit 5 | 90%+ | Entity lifecycle, soft delete |
| Integration | SpringBootTest + TestContainers | 70%+ | Real PostgreSQL, real Redis |
| Contract | Spring Cloud Contract | All public APIs | Verify storefront API contracts |
| Inter-service | WireMock | Critical paths | Test circuit breaker and retry behavior |
| API | REST Assured or MockMvc | All endpoints | Auth, validation, pagination |

### Frontend Testing

| Layer | Tool | Coverage Target | Notes |
|-------|------|-----------------|-------|
| Unit (components) | Vitest + React Testing Library | 70%+ | Props, user interactions, states |
| Integration (pages) | Vitest + MSW (Mock Service Worker) | Critical paths | Full page render with mocked API |
| E2E | Playwright (existing setup) | Happy paths | Add-to-cart → checkout → order confirmation |
| Visual regression | Playwright screenshots | Storefront pages | Catch visual regressions on theme changes |
| Accessibility | axe-core / jest-axe | WCAG 2.1 AA | Storefront must be accessible |

### Key Test Scenarios

1. **Product publishing sync**: Publish a product → appears on storefront → update POS price → storefront reflects new price within cache TTL
2. **Inventory consistency**: POS sale reduces stock → storefront shows updated stock → can't oversell
3. **Cart stock validation**: Add to cart → another customer buys last item → checkout shows "item unavailable"
4. **Order flow**: Guest cart → checkout → payment → order in sales-service → inventory decremented
5. **Customer merge**: Guest adds to cart → creates account → cart items preserved
6. **Custom domain**: Verify domain → visit storefront at custom domain → loads correct store
7. **Theme isolation**: Change store A's theme → store A's storefront updates → store B's storefront unchanged
8. **Rate limiting**: 11 checkout requests in 1 minute → 429 response → 12th request rejected

---

## 16. Security Considerations

### Authentication & Authorization

1. **Customer vs Staff JWTs**: Customer JWTs use a different `role` claim (`ROLE_CUSTOMER`). Staff tokens have `ROLE_ADMIN`/`ROLE_STAFF`. Commerce service validates which endpoints accept which role.
2. **Storefront token scope**: Customer JWT is scoped to a single tenant. Cross-tenant access is rejected.
3. **Cart cookie**: Guest cart uses a signed cookie (`cart_id`). Cart manipulation checks ownership (cart belongs to this session/customer).

### Payment Security

1. **PCI compliance**: Card numbers never touch commerce-service. Stripe Elements tokenizes on the frontend. Only a `paymentMethodId` is sent to the backend.
2. **Idempotency**: Every checkout request includes an `Idempotency-Key` header. Duplicate submissions (double-click protection) return the original result.
3. **Amount validation**: Commerce-service recalculates the order total server-side before charging. Frontend-provided amounts are never trusted.

### Data Protection

1. **Multi-tenancy**: All queries filter by `tenant_id`. The `TenantContext` from the shared lib ensures this is automatic.
2. **PII**: Customer addresses, emails, and phone numbers are stored in CRM service (existing PII controls). Commerce only stores the `customer_id` reference.
3. **Soft delete**: All commerce tables use `deleted_at` with `@SQLRestriction`, matching the existing pattern.
4. **Rate limiting**: Public storefront endpoints are rate-limited at the gateway (Redis-backed).

### Infrastructure

1. **TLS**: Custom domains get auto-provisioned TLS certificates (via Caddy/Traefik with Let's Encrypt).
2. **Secrets**: Stripe keys, DB credentials — all from environment variables, never in code or config files.
3. **CORS**: Gateway CORS already whitelists allowed origins. Custom domains need to be added to the allowlist (programmatically, via domain verification).

---

## 17. Performance and Scalability

### Caching Strategy

| Data | Cache Location | TTL | Invalidation |
|------|---------------|-----|-------------|
| Product detail (storefront) | Redis | 5 min | Busted on publish/unpublish/price change |
| Category tree (storefront) | Redis | 15 min | Busted on category display update |
| Theme settings | Redis | 30 min | Busted on theme save |
| Navigation menus | Redis | 30 min | Busted on navigation save |
| Shipping zone rates | Redis | 60 min | Busted on zone update |
| Popular search results | Redis | 10 min | LRU eviction |
| Guest carts | Redis | 7 days | Expiry + explicit clear on checkout |
| Sitemap | Redis | 1 hour | Regenerated on product publish |

### Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Storefront page load (TTI) | < 2.5s | With code splitting |
| Product API response | < 200ms p95 | Cached; < 500ms uncached |
| Search response | < 300ms p95 | PostgreSQL full-text + trigram |
| Cart operations | < 100ms p95 | Redis-based |
| Checkout (end-to-end) | < 3s p95 | Includes Stripe API call |
| Lighthouse Performance | > 80 | Mobile, 3G |
| Lighthouse SEO | > 90 | |

### Scalability Considerations

1. **Stateless services**: All commerce-service instances are stateless. Horizontal scale behind the gateway.
2. **DB connection pooling**: HikariCP with appropriate pool size (default 10 per instance).
3. **Redis cluster**: For production, Redis sentinel or cluster for HA.
4. **CDN**: Product images served via MinIO with CDN in front (or S3/CloudFront).
5. **Kafka partitioning**: Commerce events partitioned by `tenant_id` for ordered processing per tenant.

---

## 18. Monetization Strategy

### Tiered Commerce Module Pricing

| Tier | Price | Features | Target |
|------|-------|----------|--------|
| **Starter** | $29/mo | Basic storefront, 500 products, 1 shipping zone, standard theme | Micro-merchants testing online sales |
| **Growth** | $79/mo | 5,000 products, unlimited shipping zones, advanced theme, custom domain, reviews, wishlist, abandoned cart | Growing SMEs |
| **Business** | $199/mo | Unlimited products, page builder, blog, multi-currency, marketing automation, priority support | Established retailers |

### Implementation

- Commerce module activation checks billing-service for subscription tier
- Feature gates based on tier stored in `store_settings` or billing-service
- 14-day free trial on Starter tier
- Annual billing discount (2 months free)

---

## 19. Risks and Mitigation

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| **Cart abandonment hurts conversion** | High | High | Start with guest checkout (no account required). Add abandoned cart recovery in Phase 2. |
| **Inventory sync latency causes overselling** | High | Medium | Real-time stock check at checkout, not just at cart-add. Reserve inventory during payment flow. |
| **Payment failures frustrate customers** | High | Medium | Clear error messages from Stripe. Support retry. Show which specific card errors occur. |
| **Custom domain TLS complexity** | Medium | Medium | Use Caddy/Traefik which auto-handles Let's Encrypt. Limit to simple CNAME setup. |
| **Storefront feels slow compared to Shopify** | Medium | Medium | Aggressive Redis caching. Code splitting. Image optimization (srcset, WebP). |
| **Storefront theming becomes a support burden** | Low | Medium | Limit theme customization to a finite set of options (no full custom CSS in MVP). |
| **Database load from search** | Medium | Low | PostgreSQL full-text search is sufficient for MVP. Add Elasticsearch only if needed in Phase 2+. |
| **SPA SEO underperforms** | Medium | Medium | Implement sitemap, meta tags, structured data. Monitor Google Search Console. If indexing is poor, add prerendering in Phase 2. |

---

## 20. Recommended MVP Scope

### Must Have (MVP)

- [ ] Store settings (name, contact, currency, timezone)
- [ ] Product publishing (toggle POS products online, set SEO metadata)
- [ ] Category display (organize, order, add images)
- [ ] Product search (full-text with typo tolerance)
- [ ] Product listing page (filters, sort, pagination)
- [ ] Product detail page (images, variants, stock, add-to-cart)
- [ ] Shopping cart (guest + customer, persistent)
- [ ] Checkout (3-step: shipping → payment → confirm)
- [ ] Stripe payment integration
- [ ] Shipping zones with flat rate + free shipping rules
- [ ] Customer registration, login, order history, addresses
- [ ] Order creation in sales-service with `channel = 'ONLINE'`
- [ ] Basic theme (colors, fonts, logo)
- [ ] Navigation menu builder (header + footer)
- [ ] CMS pages (About, Contact, FAQ, Terms)
- [ ] Custom domain support
- [ ] SEO basics (meta tags, sitemap, robots.txt)
- [ ] Commerce admin dashboard with KPIs

### Not in MVP (Phase 2+)

- [ ] Reviews and ratings
- [ ] Wishlist
- [ ] Abandoned cart recovery
- [ ] Discount codes for online checkout
- [ ] Advanced theme options (custom CSS, layout variants)
- [ ] Related products
- [ ] Email notifications (use manual order status check in MVP)
- [ ] Marketing automation
- [ ] Drag-and-drop page builder
- [ ] Blog / CMS
- [ ] Multi-language
- [ ] Multi-currency
- [ ] Social commerce

### Task Count Summary

| Category | MVP Tasks | Phase 2 Tasks | Total |
|----------|-----------|---------------|-------|
| Backend | BE-001 through BE-020 (20 tasks) | — | 20 |
| Frontend | FE-001 through FE-026 (26 tasks) | — | 26 |
| **Total** | **46 tasks** | — | **46** |

### Estimated Effort

| Team | Story Points | Engineers | Estimated Calendar Weeks |
|------|-------------|-----------|--------------------------|
| Backend | ~98 SP | 2 | 8 weeks |
| Frontend | ~149 SP | 3 | 8 weeks |
| **Combined** | **~247 SP** | **5** | **8 weeks** |

---

## A. BACKEND ENGINEER MASTER PROMPT

```
You are a senior Spring Boot backend engineer working on Letis POS.

=================================================================
TASK: Implement the backend for LETIS COMMERCE — an optional
ecommerce module within Letis POS.
=================================================================

CONTEXT:
Letis POS is a Spring Boot microservice platform with 17 services
(gateway, auth, user, product, inventory, sales, payment, report,
notification, hrm, ai, integration, document, billing, audit, crm,
control-hub) plus 2 shared libs (common, outbox-relay).

Each service follows clean architecture:
  api/ → controllers + DTOs
  application/ → service layer
  domain/ → JPA entities + repositories
  infrastructure/ → security, config, REST clients

Services communicate via REST (sync) and Kafka via Outbox (async).
Multi-tenant (tenant_id on every table). JWT auth with @PreAuthorize.
PostgreSQL 16 (one schema per service), Redis, MinIO.

The Product model already has `featured` and `hideOnline` fields —
the codebase anticipated ecommerce.

=================================================================
YOUR TASKS (in order):
=================================================================

1. SCAFFOLD commerce-service
   - Create backend/commerce-service/ as a Spring Boot 3 / Java 21
     Maven module. Follow the exact structure of product-service.
   - Add to root pom.xml <modules>.
   - Create application.yml with:
     * server.port=8097
     * PostgreSQL connection (commerce_db)
     * Redis connection
     * Kafka bootstrap servers
   - Add gateway routes:
     * /api/v1/storefront/** → commerce-service (public)
     * /api/v1/commerce/** → commerce-service (admin, authed)
   - Add commerce_db to ops/infra/postgres/init-databases.sql
   - Wire up SecurityConfig.java (JWT resource server, match existing
     service pattern from product-service).
   - Add RestClientConfig, RedisCacheConfig.
   - Dependencies: spring-boot-starter-web, spring-boot-starter-data-jpa,
     spring-boot-starter-security, oauth2-resource-server, postgresql,
     flyway-core, redis, kafka, resilience4j, outbox-relay lib,
     lombok, mapstruct (optional).

2. CREATE DATABASE SCHEMA (Flyway migrations)
   Create these tables in order. Every table has: id UUID PK,
   tenant_id UUID, created_at/updated_at TIMESTAMPTZ, version BIGINT,
   deleted_at TIMESTAMPTZ with @SQLRestriction.

   V1__create_stores.sql — store settings per tenant
   V2__create_published_products.sql — product→storefront overlay
   V3__create_categories_display.sql — category nav config
   V4__create_carts.sql + cart_items — persistent customer carts
   V5__create_shipping_zones.sql — zone + rate config (JSONB rates)
   V6__create_themes.sql — theme config as JSONB
   V7__create_navigation_menus.sql — menu items as JSONB
   V8__create_store_pages.sql — CMS pages (rich text)
   V9__create_marketing_banners.sql — promotional banners
   V10__create_seo_defaults.sql — global SEO config
   V11__create_custom_domains.sql — domain verification
   V12__create_store_settings.sql — extended JSONB settings

   [Full schema details provided earlier in section 6]

3. IMPLEMENT DOMAIN + SERVICE + CONTROLLER FOR EACH TABLE
   For each table: JPA entity → Spring Data repository → service class
   → admin controller (authed) → storefront controller (public).

   Priority order:
   a) Store settings (most foundational)
   b) Product publishing + storefront product API
   c) Category display + storefront category API
   d) Cart service (guest=Redis, customer=DB)
   e) Checkout + order creation
   f) Customer auth (registration/login/profile/addresses/orders)
   g) Shipping zones + rate calculation
   h) Theme management
   i) Navigation menus
   j) CMS pages
   k) Marketing banners
   l) SEO defaults + sitemap generation
   m) Custom domains
   n) Commerce analytics endpoints
   o) Product search (PostgreSQL tsvector + trigram)

4. INTER-SERVICE CLIENTS
   Create REST clients for:
   - ProductServiceClient (GET products, categories, brands)
   - InventoryServiceClient (GET stock levels, reserve stock)
   - SalesServiceClient (POST create order)
   - PaymentServiceClient (POST capture payment)
   - CrmServiceClient (GET/POST customers)
   - NotificationServiceClient (POST send email)

   Each client needs:
   - Base URL from application.yml (with env var overrides)
   - Circuit breaker (Resilience4j — 50% failure → open, 30s half-open)
   - Retry with exponential backoff (max 3, 100ms→200ms→400ms)
   - Fallback: return cached data or degrade gracefully

5. STOREFRONT QUERY SERVICE
   Create StorefrontQueryService that composites data from multiple
   services for storefront product detail and listing pages.
   - Product detail = product-service (product) + inventory-service
     (stock) + published_products (SEO/gallery) — cached in Redis
   - Product listing = published_products (slugs/IDs) + product-service
     (bulk fetch) — cached with per-category keys
   - Cache invalidation on product publish/unpublish events

6. CART STRATEGY
   - Guest cart: Redis hash cart:{id}, TTL 7 days. cart_id in signed
     cookie (HMAC).
   - Customer cart: carts + cart_items tables in PostgreSQL, cached
     in Redis for reads.
   - On customer login: merge guest cart into customer cart
     (deduplicate by product_id + variant combination).
   - Cart validation at checkout: re-check stock availability for
     every item.

7. CHECKOUT FLOW
   POST /api/v1/storefront/{slug}/checkout:
   a) Validate cart not empty
   b) Re-check stock for all items (call inventory-service)
   c) Calculate shipping rate (match zone → apply rate rules)
   d) Calculate tax based on destination + store settings
   e) Reserve inventory (call inventory-service)
   f) Create order in sales-service (POST /api/v1/sales with
      channel='ONLINE')
   g) Capture payment via payment-service
   h) On payment success: confirm inventory reservation
   i) On payment failure: release inventory reservation
   j) Clear cart
   k) Emit OrderPlaced Kafka event via outbox
   l) Return order confirmation with order ID and number
   IMPORTANT: Use idempotency key (Idempotency-Key header) to
   prevent double orders on retry.

8. CUSTOMER AUTH
   Customers authenticate separately from POS staff:
   - Register: creates customer in CRM service + auth credentials
     in auth-service (or commerce-managed credential table)
   - Login: returns customer JWT with claims {sub, tenant_id,
     customer_id, role: "CUSTOMER"}
   - Customer JWT is scoped: can only access their own orders,
     addresses, and cart
   - Security config: /api/v1/storefront/** is public-read;
     customer-mutation endpoints require customer JWT;
     /api/v1/commerce/** requires staff JWT with commerce.* perms

9. PERMISSIONS
   Register these permissions in auth-service:
   commerce.view, commerce.settings, commerce.products,
   commerce.theme, commerce.shipping, commerce.navigation,
   commerce.pages, commerce.orders, commerce.analytics,
   commerce.domains, commerce.admin

10. TESTING
    - Unit tests: All service classes (Mockito, JUnit 5)
    - Integration tests: Controllers with MockMvc + TestContainers
      (real PostgreSQL + Redis)
    - Test critical paths: publish product → appears on storefront;
      checkout → order in sales-service; cart merge on login

=================================================================
PATTERNS TO FOLLOW:
=================================================================

- Controllers: @RestController, @RequestMapping("/api/v1/..."),
  @PreAuthorize, @Valid on request bodies, return Page<T> for lists,
  ResponseEntity for mutations
- Services: @Transactional, tenant-scoped via TenantContext
- Entities: @SQLRestriction("deleted_at IS NULL"), @Version,
  @PrePersist/@PreUpdate for timestamps
- Config: match existing patterns in product-service exactly
- Error handling: throw ResponseStatusException or custom exceptions
  caught by GlobalExceptionHandler
- Caching: @Cacheable/@CacheEvict with RedisCacheConfig

=================================================================
DELIVERABLES:
=================================================================

1. Working commerce-service that starts and connects to all infra
2. All database tables created via Flyway
3. All admin CRUD endpoints operational
4. All storefront public endpoints operational
5. Cart + checkout flow working end-to-end
6. Customer auth flow working
7. Inter-service clients with resilience patterns
8. Test coverage ≥ 70%
9. Gateway routes configured
10. Kafka events publishing (outbox pattern)

=================================================================
NOTE: Commerce service NEVER writes to another service's database.
It orchestrates via REST and events. Product, inventory, order,
payment, and customer data remain 100% in their respective services.
```

---

## B. FRONTEND ENGINEER MASTER PROMPT

```
You are a senior React/TypeScript frontend engineer working on
Letis POS.

=================================================================
TASK: Implement the frontend for LETIS COMMERCE — an optional
ecommerce module within Letis POS.
=================================================================

CONTEXT:
The Letis POS frontend is a React 18 + TypeScript + Vite SPA using
MUI v5, TanStack Table, React Router 6, Recharts/ApexCharts, SWR
for data fetching, and i18next for internationalization.

Existing structure:
  src/
  ├── views/           — page components (smartpos/ has all POS pages)
  ├── components/      — shared components (smartpos/, tables/, shared/)
  ├── api/smartpos/    — API client (axios with JWT auto-refresh)
  ├── context/         — React contexts (EcommerceContext exists but
  │                      uses mock data — we're replacing/building real)
  ├── routes/          — route definitions
  ├── layouts/         — FullLayout (dashboard), BlankLayout (login)
  ├── theme/           — MUI theme customization
  ├── hooks/           — custom hooks
  └── utils/           — utilities

The Product model already has `featured` and `hideOnline` fields.

We are using Option A architecture: the storefront lives in the
SAME React SPA as the admin. Public storefront pages use a new
StorefrontLayout (no sidebar, public design) under /store/:slug/*.
Admin pages use the existing FullLayout under /admin/commerce/*.

=================================================================
YOUR TASKS (in order):
=================================================================

1. ROUTE & LAYOUT SETUP
   - Create src/routes/smartpos/CommerceRoutes.tsx
   - Define routes:
     * /admin/commerce/dashboard
     * /admin/commerce/settings
     * /admin/commerce/products
     * /admin/commerce/categories
     * /admin/commerce/theme
     * /admin/commerce/shipping
     * /admin/commerce/navigation
     * /admin/commerce/pages
     * /admin/commerce/banners
     * /admin/commerce/seo
     * /admin/commerce/domains
     * /admin/commerce/orders
     * /admin/commerce/analytics (summary child)
     * /store/:slug (homepage)
     * /store/:slug/products/:id (product detail)
     * /store/:slug/categories/:id (category listing)
     * /store/:slug/search (search results)
     * /store/:slug/cart
     * /store/:slug/checkout
     * /store/:slug/order-confirmed/:orderId
     * /store/:slug/account (customer profile)
     * /store/:slug/account/orders
     * /store/:slug/account/addresses
     * /store/:slug/login
     * /store/:slug/register
     * /store/:slug/page/:key (CMS pages)
   - Update src/routes/Router.tsx to include CommerceRoutes
   - Create src/layouts/storefront/StorefrontLayout.tsx
     * Public layout: header + main content + footer
     * No sidebar. No MUI Drawer. Clean, public-facing design.
     * The header and footer content come from the navigation API
       and theme API.
   - Create src/views/commerce/admin/ directory and
     src/views/commerce/storefront/ directory

2. API CLIENT & TYPES
   - Create src/api/smartpos/commerce.ts with ALL commerce API
     functions using the existing `api` (axios) instance
   - Create src/types/commerce.ts with TypeScript interfaces:
     Store, PublishedProduct, CategoryDisplay, Theme, ShippingZone,
     NavigationMenu, StorePage, MarketingBanner, SeoDefaults,
     CustomDomain, Cart, CartItem, CheckoutRequest, CustomerInfo,
     CustomerAddress, OrderSummary, CommerceAnalytics, ProductSearchResult
   - Define all request/response types

3. STATE MANAGEMENT
   - Create src/context/CommerceContext/index.tsx with:
     * CommerceAdminProvider — wraps /admin/commerce/* routes
       - Store settings state
       - Published products state
       - Theme state (for preview)
     * StorefrontProvider — wraps /store/:slug/* routes
       - Current store (from slug)
       - Cart state (add/remove/update/clear, synced to API)
       - Customer session (login/logout, persistent)
       - Theme (loaded from API, applied via CSS custom properties)
   - Cart syncs to localStorage for guest persistence
   - On customer login: cart merges server-side, then re-fetched

4. ADMIN SCREENS (in priority order)
   Build these pages within src/views/commerce/admin/. Each page
   reuses existing Letis POS patterns (DataTable, EditDrawer,
   FilterBar, MetricCard, PageHeader, etc.):

   a) StoreSettings.tsx
      - Form: name, contact, address, currency, timezone, tax display, social links
      - GET/PUT /api/v1/commerce/settings

   b) ProductPublishing.tsx
      - Table of POS products with online toggle
      - Drawer for per-product SEO, gallery, featured flag
      - Batch publish/unpublish
      - GET /api/v1/products (existing) + GET /api/v1/commerce/products
      - POST publish, DELETE unpublish, PUT update

   c) CategoryDisplay.tsx
      - Tree view with drag-to-reorder (use a lightweight DnD lib or
        manual up/down buttons)
      - Edit modal for name override, description, image
      - GET /api/v1/categories (existing) + GET/POST/PUT /api/v1/commerce/categories

   d) CommerceDashboard.tsx
      - Metric cards: online orders (today/week/month), revenue, AOV, conversion rate
      - Charts: orders over time (line), top products (bar) — reuse Recharts
      - Recent online orders table
      - GET /api/v1/commerce/analytics/*

   e) CommerceOrders.tsx
      - Orders table filtered by channel=ONLINE
      - Reuse existing order table pattern from POS
      - GET /api/v1/sales (existing)

   f) ShippingZones.tsx
      - Zone list with expandable rate tables
      - Zone form: country multi-select, rate builder (flat/free/weight-based)
      - CRUD /api/v1/commerce/shipping-zones

   g) ThemeCustomizer.tsx
      - Split view: controls (left) + live preview (right)
      - Color pickers, font selectors, layout toggles, custom CSS textarea
      - GET/PUT /api/v1/commerce/theme

   h) NavigationBuilder.tsx
      - Header and Footer tabs
      - Drag-and-drop menu items with add/edit/delete
      - GET/PUT /api/v1/commerce/navigation/{location}

   i) PageEditor.tsx
      - Page list + rich text editor
      - Integrate TipTap or Quill editor (lightweight, MUI-compatible)
      - SEO meta fields per page
      - CRUD /api/v1/commerce/pages

   j) BannerManager.tsx
      - Banner list with status indicators
      - Create/edit form with image upload, date range scheduling
      - CRUD /api/v1/commerce/banners

   k) SeoSettings.tsx
      - Form: site title, meta description, OG image, GA ID, site verification
      - GET/PUT /api/v1/commerce/seo

   l) DomainManager.tsx
      - Domain list with verification status
      - Add domain dialog with DNS instructions
      - Verify button with polling
      - POST/DELETE /api/v1/commerce/domains,
        POST verify, GET status

5. STOREFRONT PAGES (in priority order)
   Build these pages within src/views/commerce/storefront/. Each page
   is a PUBLIC-FACING page — design quality must be HIGH. Use MUI
   components but styled to match the merchant's theme, not the
   default MUI look.

   a) HomePage.tsx
      - Sections determined by theme settings: hero banner,
        featured products grid, category highlights
      - GET featured products, categories, banners, theme

   b) ProductListPage.tsx (category + search results both use this
      or a shared grid component)
      - Product grid (responsive: 2/3/4 columns)
      - Filter sidebar: category, price range
      - Sort: price asc/desc, newest, name
      - Pagination or infinite scroll
      - GET products (with filters), search

   c) ProductDetailPage.tsx
      - Image gallery with zoom
      - Variant selector (Size, Color, etc.)
      - Quantity selector
      - Stock status badge
      - Add to cart button (with loading state)
      - Rich HTML description
      - Breadcrumb
      - SEO meta tags via React Helmet

   d) CartPage.tsx + CartDrawer.tsx
      - Line items: image, name, variant, qty editor, line total, remove
      - CartSummary: subtotal, shipping estimate, tax, total
      - Empty cart state
      - Cross-sell section
      - CartDrawer slides out from any page

   e) CheckoutPage.tsx
      - 3-step indicator: Shipping → Payment → Review
      - Step 1: Address form + shipping method selection
      - Step 2: Stripe Elements card input
      - Step 3: Order review + Place Order button
      - OrderConfirmationPage.tsx: success with order number

   f) CustomerLoginPage.tsx + CustomerRegisterPage.tsx
      - Clean login/register forms
      - Social login placeholders (Phase 2)
      - Redirect back to previous page after login

   g) CustomerAccountPage.tsx + CustomerOrdersPage.tsx +
      CustomerAddressesPage.tsx
      - Account nav: Profile, Orders, Addresses, Logout
      - Profile: name, email, phone
      - Orders: table with status badges
      - Addresses: CRUD with form

   h) StorePage.tsx
      - Generic CMS page renderer
      - Renders rich HTML from API
      - Contact page variant with optional form

6. SHARED COMMERCE COMPONENTS
   Build in src/components/commerce/:
   - ProductCard.tsx — image, name, price, quick-add-to-cart button
   - ProductGrid.tsx — responsive grid wrapper
   - StoreHeader.tsx — logo, nav, search, cart icon (with badge), account icon
   - StoreFooter.tsx — multi-column footer with nav, contact, social
   - NavigationMenu.tsx — recursive menu renderer (2-level dropdowns)
   - SearchBar.tsx — search input with autocomplete dropdown
   - CartSummary.tsx — subtotal, shipping, tax, total
   - CheckoutSteps.tsx — step indicator component
   - ShippingForm.tsx — address form
   - PaymentForm.tsx — Stripe Elements wrapper
   - OrderSummary.tsx — order line items read-only
   - BannerCarousel.tsx — hero slider
   - FeaturedProducts.tsx — product grid section
   - ThemeProvider.tsx — loads theme CSS custom properties
   - SeoHead.tsx — React Helmet wrapper for meta tags

7. THEME SYSTEM
   The ThemeProvider component:
   - Fetches GET /api/v1/storefront/{slug}/theme
   - Injects CSS custom properties on :root:
     --commerce-primary, --commerce-secondary, --commerce-accent,
     --commerce-bg, --commerce-text, --commerce-font-heading,
     --commerce-font-body
   - All storefront components use these CSS variables, NOT hardcoded
     MUI colors. This is how merchants customize their storefront look.
   - MUI ThemeProvider still wraps everything for baseline — the CSS
     variables override what's needed for storefront-specific styling.

8. RESPONSIVE DESIGN
   ALL storefront pages must work on mobile (320px — 428px):
   - Product grid: 1-2 columns on mobile
   - Navigation: hamburger menu
   - Cart: full-screen overlay
   - Checkout: stacked single-column
   - Account: no sidebar, stacked nav
   - Touch targets: minimum 44px × 44px

9. SEO IMPLEMENTATION
   - Use react-helmet-async for all storefront pages
   - Product pages: title, meta description, og:title, og:description,
     og:image, og:url, product:price, product:availability
   - Homepage: site title, meta description, og:image
   - Category pages: category name as title
   - Structured data (JSON-LD): Product schema on PDP, BreadcrumbList,
     Organization on homepage

10. LOADING & ERROR STATES
    - Skeleton loaders for: product grid, product detail, cart, checkout
    - Error boundary with "Something went wrong" + retry button
    - Empty states: no products found (with clear filters CTA), empty
      cart (with "Start Shopping" CTA), no orders
    - Offline banner (reuse existing OfflineBanner component)

11. INTEGRATION NOTES
    - Use the existing API client (src/api/smartpos/client.ts) — all
      commerce API functions use the same `api` axios instance
    - JWT auto-refresh works for both staff and customer tokens
    - The gateway routes /api/v1/storefront/** as public (no auth
      required for reads) and /api/v1/commerce/** as authed staff
    - Stripe.js is loaded dynamically in the checkout page only
      (code splitting — lazy load stripe-js)

=================================================================
DESIGN PRINCIPLES:
=================================================================

- Storefront must feel like a professional online store, NOT an
  admin dashboard. Clean, modern, consumer-facing design.
- Admin screens must feel identical to existing Letis POS pages.
  Reuse DataTable, EditDrawer, FilterBar, PageHeader, MetricCard.
- Mobile-first for storefront. Admin can be desktop-first.
- The theme system is the #1 differentiator — make it work perfectly.
- Every component handles loading, error, empty, and populated states.

=================================================================
DELIVERABLES:
=================================================================

1. All routes navigable and layouts rendering correctly
2. All admin screens functional with real API integration
3. All storefront pages functional with real API integration
4. Complete checkout flow working (add to cart → checkout → order confirmed)
5. Customer auth (register → login → order history → manage addresses)
6. Theme system working (admin changes color → storefront reflects it)
7. Mobile-responsive storefront
8. SEO meta tags and structured data on all storefront pages
9. All TypeScript types defined and passing (no `any` types)
10. Loading skeletons, error boundaries, and empty states for all pages
11. Integration tests for critical storefront flows (Playwright)
```

---

*End of Letis Commerce Design Specification*
