# LetisPOS — Business Identity Engine Architecture

> "Every tenant should feel LetisPOS was custom-built for their company."

## Current State (May 2026)

- `brand_profiles` table: 1 row per tenant — business name, 3 colors, font, asset URLs, social links
- `document_themes` table: per-document-type overrides inheriting from brand
- `brand_assets` table: uploaded logos with variant tracking (monochrome, thermal, favicon)
- `brand_ai_jobs` table: async AI brand job tracking
- `BrandProfileService`: CRUD with `@Cacheable`, cascade propagation to `DocumentTheme`
- `TemplateCompiler`: Handlebars-based document HTML with brand CSS injection
- `DalleImageGenerationProvider`: OpenAI image-gen for logos with brand-safe prompts
- `BrandAiController`: proxy to ai-service for palette, font, theme generation
- Frontend `BrandContext`: 12 derived color tokens from 3 hex colors
- Frontend `AIBrandingAssistant`: chat panel with quick actions
- Frontend `BrandLogoUploader`: drag-drop with AI analysis

## Architecture Overview

```
┌────────────────────────────────────────────────────────────────────┐
│                        TENANT SETUP FLOW                           │
│                                                                    │
│  [Onboarding Wizard] → [AI Brand Kit Gen] → [Live Preview]        │
│       │                      │                    │                │
│       ▼                      ▼                    ▼                │
│  ┌─────────────────────────────────────────────────────────┐      │
│  │                 BRAND SERVICE (Java)                     │      │
│  │                                                         │      │
│  │  ┌───────────┐  ┌───────────┐  ┌──────────────────┐   │      │
│  │  │ Profile   │  │ Design    │  │ Template         │   │      │
│  │  │ API       │  │ Tokens    │  │ Engine           │   │      │
│  │  │           │  │ API       │  │                  │   │      │
│  │  │ CRUD      │  │ Compile   │  │ Store / Version  │   │      │
│  │  │ Cache     │  │ Validate  │  │ Render / Preview │   │      │
│  │  └───────────┘  └───────────┘  └──────────────────┘   │      │
│  │                                                         │      │
│  │  ┌───────────┐  ┌───────────┐  ┌──────────────────┐   │      │
│  │  │ Asset     │  │ AI Brand  │  │ Inheritance      │   │      │
│  │  │ Manager   │  │ Gateway   │  │ Engine           │   │      │
│  │  └───────────┘  └───────────┘  └──────────────────┘   │      │
│  └──────────────────────┬──────────────────────────────────┘      │
│                         │                                         │
│         ┌───────────────┼───────────────┐                        │
│         ▼               ▼               ▼                        │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ AI       │  │ PDF Renderer │  │ Thermal      │               │
│  │ Service  │  │ (Puppeteer)  │  │ Service      │               │
│  │          │  │              │  │ (ESC/POS)    │               │
│  │ OpenAI   │  │ HTML→PDF     │  │              │               │
│  │ Claude   │  │ S3 upload    │  │ Byte stream  │               │
│  └──────────┘  └──────────────┘  └──────────────┘               │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                    CONSUMPTION LAYER                       │    │
│  │                                                          │    │
│  │  Web App (React)     Mobile App (RN)     External         │    │
│  │  ┌──────────────┐   ┌──────────────┐    ┌──────────┐    │    │
│  │  │ BrandContext  │   │ BrandProvider │    │ Customer  │    │    │
│  │  │ ThemeInjector │   │ ThemeInjector│    │ Portal    │    │    │
│  │  │ MUI + Tailwind│   │ StyleSheet   │    │ (public)  │    │    │
│  │  └──────────────┘   └──────────────┘    └──────────┘    │    │
│  │                                                          │    │
│  │  Email Templates    WhatsApp        Auth Pages           │    │
│  │  (inline CSS)       (text+brand)    (tenant subdomain)   │    │
│  └──────────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────────┘
```

## Design Token System (CSS Custom Properties)

### Token Naming Convention

Prefix: `--bp-` (brand property). Dot notation in code → kebab-case in CSS.

```
Code path                      CSS variable
color.primary              →   --bp-color-primary
color.primary-light        →   --bp-color-primary-light
surface.card               →   --bp-surface-card
text.primary               →   --bp-text-primary
font.body                  →   --bp-font-body
```

### Full Token List (~45 tokens)

**Core palette:** `color.primary`, `color.primary-light`, `color.primary-dark`, `color.primary-soft`, `color.primary-border`, `color.primary-contrast`, `color.secondary`, `color.secondary-light`, `color.accent`, `color.accent-light`, `color.accent-dark`, `color.accent-soft`

**Semantic:** `color.success`, `color.success-light`, `color.warning`, `color.warning-light`, `color.error`, `color.error-light`, `color.info`, `color.info-light`

**Surfaces:** `surface.page`, `surface.card`, `surface.header`, `surface.sidebar`, `surface.hover`, `surface.selected`

**Text:** `text.primary`, `text.secondary`, `text.inverse`, `text.link`

**Borders:** `border.default`, `border.strong`, `border.focus`

**Radii:** `radius.sm`, `radius.md`, `radius.lg`, `radius.xl`

**Typography:** `font.body`, `font.heading`, `font.mono`, `font.size-xs` through `font.size-3xl`

### Flow

1. Tenant updates primary color in settings
2. `PUT /api/v1/brand/profile` → DB write + `@CacheEvict({"brandProfile", "designTokens"})`
3. Frontend `BrandContext` re-fetches profile
4. `useBrandCss` recomputes tokens and calls `document.documentElement.style.setProperty()` for each
5. All components referencing `var(--bp-*)` repaint automatically — no page refresh

## Database Schema (Completed + Planned)

### Completed
- `brand_profiles` (V16) — 1 row per tenant, identity + colors + asset URLs + social links
- `brand_assets` (V19) — uploaded logos with variant tracking
- `brand_ai_jobs` (V16) — async AI job tracking
- `document_themes` (V18) — per-document-type overrides
- `design_tokens` (V20) — per-tenant token overrides (empty initially, service generates defaults)

### Planned
- `email_branding` — email template storage per tenant
- `receipt_branding` — thermal receipt config (paper width, font sizes, cut behavior)
- `brand_templates` — stored, versioned document templates
- `brand_template_versions` — immutable version snapshots
- `brand_presets` — system-provided industry templates
- `brand_profile_versions` — audit trail of brand changes

## AI Features (Current + Planned)

### Working
- AI palette generation (`POST /api/v1/brand/ai/generate-palette`)
- AI font suggestions (`POST /api/v1/brand/ai/suggest-fonts`)
- AI document theme generation (`POST /api/v1/brand/ai/generate-theme`)
- AI logo image generation via DALL-E/GPT Image (`POST /api/v1/brand/ai/logo-image`)
- AI chat assistant (`POST /api/v1/brand/ai/chat`)
- Logo analysis with heuristics (`POST /api/v1/brand/ai/analyze-logo`)
- SVG logo variant generator (fallback when AI unavailable)

### Planned
- AI complete brand kit generator (one-click: logo + palette + fonts + tokens + templates)
- AI brand consistency checker (scans all surfaces, returns score + fixes)
- AI receipt beautification
- AI invoice template designer
- AI onboarding wizard (5-minute setup)
- AI smart recommendations (industry-benchmarked)
- AI slogan & copy generator

## Template Engine Architecture

```
Template = Layout + Blocks + Theme

Layout: page size, margins, orientation, column arrangement
Blocks: ordered list of content blocks (header, items, totals, etc.)
Theme: design token references (colors, fonts, spacing)
```

Blocks are composable:
```
blocks/
  header.hbs       — logo + company info + document title
  customer.hbs     — bill-to / ship-to
  items-table.hbs  — line items with configurable columns
  totals.hbs       — subtotal, discount, tax, grand total
  signature.hbs    — signature lines
  terms.hbs        — terms & conditions
  footer.hbs       — company footer with page numbers
  qr-code.hbs      — QR code placement
  watermark.hbs    — background watermark
```

Template hierarchy:
```
System default template
  → Industry preset override
    → Tenant template (full custom)
```

## Brand Inheritance Models

1. **Single brand** (default) — one brand profile per tenant
2. **Location inheritance** — Location B inherits from Location A, overrides logo + address only
3. **Franchise** — Master brand locks colors/fonts/logo; franchisees can only change business name, address, contact

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + MUI |
| Mobile | React Native + BrandProvider (planned) |
| Backend | Spring Boot 3 (Java 21), Maven |
| PDF Renderer | Node.js + Puppeteer (planned) |
| Template Engine | Handlebars (Java: jknack) |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Storage | MinIO (on-prem) / S3 (cloud) |
| AI | OpenAI (DALL-E / GPT Image) + Claude (brand consulting) |
| Queue | Planned: RabbitMQ / SQS for async PDF gen |

## Implementation Roadmap

### Phase 1: MVP Branding (Weeks 1-4)
> Every tenant can set logo + colors + font, and it propagates everywhere reliably.

- [x] `design_tokens` table + seed
- [x] `DesignTokenService` (compile + CSS output)
- [x] `GET /api/v1/brand/tokens` + `/css` endpoints
- [x] `ThemeInjector` — CSS variables on `:root`
- [x] `colorUtils.ts` — shared color math
- [x] `BrandContext` refactored, exports `computeDesignTokens`
- [x] `TemplateCompiler.compileWithTokens()` method
- [x] Cache eviction on brand update
- [x] Auth pages consume brand CSS variables
- [x] `email_branding` table + basic email template rendering
- [x] `receipt_branding` table + ESC/POS receipt formatting
- [x] Live preview panel (invoice, receipt, email, dashboard mockup)
- [x] Accessibility contrast checker in color picker

### Phase 2: Advanced Branding (Weeks 5-8)
> Templates are customizable, versioned, and previewable.

- [x] `brand_templates` table + CRUD API + versioning *(already existed)*
- [x] Block-based template editor *(already existed)*
- [x] PDF rendering service *(Gotenberg, already existed)*
- [x] Brand preset marketplace (12 industry presets)
- [x] Brand inheritance (parent/child with locked fields)
- [x] Custom domain / subdomain support
- [x] Dark/light mode per-tenant token sets
- [x] Multi-surface preview simulator *(done in Phase 1)*

### Phase 3: AI Branding (Weeks 9-12)
> AI generates complete brand kits. One click from nothing to fully branded.

- [x] AI complete brand kit generator
- [x] AI brand consistency checker
- [x] AI receipt beautification *(via generate-copy endpoint)*
- [x] AI invoice template designer *(via complete-kit endpoint)*
- [x] AI onboarding wizard (5-minute setup)
- [x] AI smart recommendations *(via chat + industry context)*
- [x] AI slogan & copy generator
- [x] Brand health scoring dashboard

### Phase 4: Enterprise (Weeks 13-16)
> Multi-location, franchise, approval workflows, campaign branding.

- [x] Brand approval workflow (draft → review → publish)
- [x] Multi-location branding with inheritance *(Phase 2)*
- [x] Franchise branding with field locking *(Phase 2)*
- [x] Brand analytics dashboard
- [x] Campaign/seasonal branding scheduler
- [ ] Multi-brand per tenant *(deferred — breaks 1:1 constraint)*
- [x] Brand change audit log
- [x] Theme export/import

### Phase 5: Scaling (Weeks 17-20)
> Handle 10,000+ tenants with zero-perceptible latency.

- [x] CDN integration for token CSS endpoints
- [x] Edge caching strategy (stale-while-revalidate)
- [x] Asset optimization pipeline (auto-WebP, responsive sizes)
- [ ] Multi-region deployment *(ops/infrastructure)*
- [x] White-label mobile app *(mobile config endpoint)*
- [x] Performance monitoring

## Key Files

### Backend
| File | Purpose |
|------|---------|
| `sales-service/.../domain/model/BrandProfile.java` | JPA entity |
| `sales-service/.../domain/model/DocumentTheme.java` | Per-doc-type theme entity |
| `sales-service/.../application/BrandProfileService.java` | Profile CRUD + cache |
| `sales-service/.../application/DesignTokenService.java` | Token compilation + CSS gen |
| `sales-service/.../application/DocumentThemeService.java` | Theme inheritance + cascade |
| `sales-service/.../api/BrandController.java` | Profile REST API |
| `sales-service/.../api/BrandTokenController.java` | Token REST API + CDN caching + mobile config |
| `sales-service/.../api/ReceiptBrandingController.java` | Receipt branding REST API |
| `sales-service/.../api/EmailBrandingController.java` | Email branding REST API |
| `sales-service/.../api/BrandAiController.java` | AI proxy controller |
| `sales-service/.../application/ReceiptBrandingService.java` | Receipt branding CRUD + cache |
| `sales-service/.../application/EmailBrandingService.java` | Email branding CRUD + cache |
| `sales-service/.../domain/model/ReceiptBranding.java` | Receipt branding JPA entity |
| `sales-service/.../domain/model/EmailBranding.java` | Email branding JPA entity |
| `sales-service/.../db/migration/V21__receipt_branding.sql` | Receipt branding schema |
| `sales-service/.../db/migration/V22__email_branding.sql` | Email branding schema |
| `sales-service/.../db/migration/V23__brand_presets.sql` | 12 industry presets + seed |
| `sales-service/.../db/migration/V24__brand_inheritance.sql` | Inheritance + locked fields |
| `sales-service/.../db/migration/V25__custom_domain.sql` | Custom domain columns |
| `sales-service/.../db/migration/V26__brand_versions.sql` | Audit log versions table |
| `sales-service/.../db/migration/V27__brand_campaigns.sql` | Campaign scheduler table |
| `sales-service/.../db/migration/V28__brand_approval.sql` | Approval status column |
| `sales-service/.../domain/model/BrandProfileVersion.java` | Version entity |
| `sales-service/.../domain/repository/BrandProfileVersionRepository.java` | Version repository |
| `sales-service/.../application/BrandPresetService.java` | Preset browse + apply |
| `sales-service/.../api/BrandPresetController.java` | Preset REST API |
| `sales-service/.../domain/model/BrandPreset.java` | Preset JPA entity |
| `sales-service/.../api/BrandAiController.java` | AI endpoints: complete-kit, health-score, generate-copy, consistency-check |
| `document-service/.../application/TemplateCompiler.java` | Document HTML generation |
| `ai-service/.../brand/DalleImageGenerationProvider.java` | OpenAI image gen |

### Frontend
| File | Purpose |
|------|---------|
| `src/context/smartpos/BrandContext.tsx` | Brand state + token computation |
| `src/branding/hooks/useBrandCss.ts` | CSS variable injection |
| `src/branding/components/ThemeInjector.tsx` | Side-effect component |
| `src/theme/smartpos/brand.ts` | System default brand palette |
| `src/theme/smartpos/colorUtils.ts` | Shared color math utilities |
| `src/theme/Theme.tsx` | MUI theme builder |
| `src/api/smartpos/brand.ts` | Brand API client |
| `src/components/smartpos/assistant/AIBrandingAssistant.tsx` | AI chat panel |
| `src/branding/components/BrandPreviewPanel.tsx` | Multi-surface live preview (invoice, receipt, email, dashboard) |
| `src/branding/utils/contrastChecker.ts` | WCAG contrast ratio checker |
| `src/components/smartpos/brand/BrandLogoUploader.tsx` | Logo upload + AI gen |
| `src/branding/components/PresetMarketplace.tsx` | Preset browser with industry filters |
| `src/branding/components/CustomDomainSettings.tsx` | White-label domain config + DNS verification |
| `src/branding/components/ApprovalWorkflow.tsx` | Approval status badge + submit/approve/reject/archive |
| `src/branding/components/BrandTimeline.tsx` | Version history timeline |
| `src/branding/components/CampaignManager.tsx` | Seasonal campaign scheduler |
| `src/branding/components/BrandAnalyticsCard.tsx` | Brand usage analytics card |
| `src/branding/components/OnboardingWizard.tsx` | 5-step AI-powered brand setup wizard |
| `src/branding/hooks/useBrandPerformance.ts` | Performance instrumentation |
| `src/branding/components/PerfIndicator.tsx` | Dev-mode performance overlay |
| `src/branding/components/BrandHealthCard.tsx` | Brand health score gauge + quick wins |
| `src/components/smartpos/brand/BrandColorPicker.tsx` | Color input with WCAG contrast indicator |
