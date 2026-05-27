/**
 * Brand Identity API — tenant-level brand profile, assets, and AI operations.
 * Backed by /api/v1/brand (brand-service or sales-service).
 */
import { api } from './client';
import type { UUID } from './types';

// ── Types ──────────────────────────────────────────────────────────────────

export interface BrandProfile {
  id: UUID;
  tenantId: UUID;

  // Business identity
  businessName: string;
  tagline: string;
  description: string;
  industry: string;
  brandTone: string;

  // Visual identity
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  typographyScale: 'compact' | 'default' | 'spacious';

  // Asset URLs (CDN-backed, S3/MinIO)
  logoUrl: string;
  logoSvgUrl: string;
  logoMonochromeUrl: string;
  logoThermalUrl: string;
  faviconUrl: string;
  watermarkUrl: string;
  stampUrl: string;
  signatureUrl: string;
  qrCodeUrl: string;

  // Social / web
  website: string;
  facebook: string;
  instagram: string;
  twitter: string;
  linkedin: string;

  createdAt: string;
  updatedAt: string;
}

export type BrandProfileUpdate = Partial<
  Omit<BrandProfile, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>
>;

export interface BrandAsset {
  id: UUID;
  tenantId: UUID;
  name: string;
  category: 'logo' | 'favicon' | 'watermark' | 'stamp' | 'signature' | 'qr' | 'other';
  format: 'png' | 'svg' | 'jpg' | 'webp' | 'pdf';
  variant: 'original' | 'monochrome' | 'thermal' | 'favicon' | 'thumbnail';
  url: string;
  width: number | null;
  height: number | null;
  sizeBytes: number;
  aiGenerated: boolean;
  createdAt: string;
}

export interface BrandAssetUpload {
  file: File;
  category: BrandAsset['category'];
  name?: string;
}

export interface AiBrandRequest {
  prompt: string;
  context?: {
    businessName?: string;
    industry?: string;
    description?: string;
    style?: string;
    currentColors?: string[];
  };
}

export interface AiBrandResponse {
  message: string;
  suggestions?: {
    colors?: string[];
    fonts?: { family: string; category: string }[];
    logoConcepts?: { description: string; style: string }[];
    themes?: { name: string; primaryColor: string; accentColor: string }[];
  };
  generatedAssets?: BrandAsset[];
}

export interface AiLogoImageRequest {
  businessName?: string;
  industry?: string;
  description?: string;
  userPrompt?: string;
  style?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  count?: number;
  size?: string;
  tenantSlug?: string;
}

export interface AiGeneratedLogoImage {
  url: string;
  prompt: string;
  provider: string;
  model: string;
  bytes: number;
}

export interface AiLogoImageResponse {
  provider: string;
  model?: string;
  images: AiGeneratedLogoImage[];
  message: string;
}

export interface AiAnalyzeLogoResponse {
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  sharpness: number;
  hasTransparency: boolean;
  readability: number;
  scalability: number;
  printSuitability: number;
  thermalCompatibility: number;
  suggestions: string[];
}

// ── API ────────────────────────────────────────────────────────────────────

/** Fetch the tenant's brand profile (create default if none exists). */
export async function getBrandProfile(): Promise<BrandProfile> {
  const { data } = await api.get<BrandProfile>('/api/v1/brand/profile');
  return data;
}

/** Create or update the brand profile. */
export async function saveBrandProfile(
  body: BrandProfileUpdate,
): Promise<BrandProfile> {
  const { data } = await api.put<BrandProfile>('/api/v1/brand/profile', body);
  return data;
}

/** Reset brand profile to defaults. */
export async function resetBrandProfile(): Promise<BrandProfile> {
  const { data } = await api.post<BrandProfile>('/api/v1/brand/profile/reset');
  return data;
}

// ── Assets ─────────────────────────────────────────────────────────────────

/** List all brand assets for the tenant. */
export async function listBrandAssets(
  category?: BrandAsset['category'],
): Promise<BrandAsset[]> {
  const { data } = await api.get<BrandAsset[]>('/api/v1/brand/assets', {
    params: category ? { category } : undefined,
  });
  return data;
}

/** Upload a brand asset. Returns the created asset record with CDN URL. */
export async function uploadBrandAsset({
  file,
  category,
  name,
}: BrandAssetUpload): Promise<BrandAsset> {
  const form = new FormData();
  form.append('file', file);
  form.append('category', category);
  if (name) form.append('name', name);
  const { data } = await api.post<BrandAsset>('/api/v1/brand/assets', form, {
    headers: { 'Content-Type': null as never },
    timeout: 60_000,
  });
  return data;
}

/** Delete a brand asset. */
export async function deleteBrandAsset(assetId: UUID): Promise<void> {
  await api.delete(`/api/v1/brand/assets/${assetId}`);
}

// ── AI Branding ────────────────────────────────────────────────────────────

/** Send a prompt to the AI branding assistant. */
export async function aiBrandChat(request: AiBrandRequest): Promise<AiBrandResponse> {
  const { data } = await api.post<AiBrandResponse>(
    '/api/v1/brand/ai/chat',
    request,
  );
  return data;
}

/** Analyze an uploaded logo for quality, scalability, print readiness. */
export async function aiAnalyzeLogo(
  file: File,
): Promise<AiAnalyzeLogoResponse> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post<AiAnalyzeLogoResponse>(
    '/api/v1/brand/ai/analyze-logo',
    form,
    { headers: { 'Content-Type': null as never }, timeout: 30_000 },
  );
  return data;
}

/** Request AI to generate logo variants (SVG, monochrome, thermal, favicon). */
export async function aiGenerateLogoVariants(): Promise<BrandAsset[]> {
  const { data } = await api.post<BrandAsset[]>(
    '/api/v1/brand/ai/generate-variants',
  );
  return data;
}

/** Request the AI service to generate real logo images with the configured image provider. */
export async function aiGenerateLogoImage(
  request: AiLogoImageRequest,
): Promise<AiLogoImageResponse> {
  const { data } = await api.post<AiLogoImageResponse>(
    '/api/v1/brand/ai/logo-image',
    request,
    { timeout: 90_000 },
  );
  return data;
}

/**
 * Render a sample invoice / receipt / quotation from the tenant's
 * current brand profile + synthetic line items. No real sale required —
 * the perfect "see what your documents look like" preview during setup.
 */
export interface MockDocumentPreview {
  documentType: string;
  documentNumber: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  brand: {
    businessName: string;
    tagline?: string;
    logoUrl?: string;
    primaryColor: string;
    secondaryColor?: string;
    accentColor?: string;
    fontFamily?: string;
    website?: string;
  };
  customer: { name: string; email?: string; phone?: string; address?: string };
  lines: Array<{ name: string; quantity: number; unitPrice: number; total: number }>;
  totals: { subtotal: number; taxRate: string; taxAmount: number; grandTotal: number };
  mock: boolean;
  notice: string;
}

export async function previewMockDocument(
  documentType: string = 'tax-invoice',
  sampleStyle: 'small' | 'typical' | 'large' = 'typical',
): Promise<MockDocumentPreview> {
  const { data } = await api.post<MockDocumentPreview>(
    '/api/v1/brand/document-themes/preview-mock',
    { documentType, sampleStyle },
  );
  return data;
}

/** Request AI to generate a color palette from the current logo. */
export async function aiGeneratePalette(): Promise<string[]> {
  const { data } = await api.post<{ colors: string[] }>(
    '/api/v1/brand/ai/generate-palette',
  );
  return data.colors;
}

/** Request AI to suggest font pairings based on brand profile. */
export async function aiSuggestFonts(): Promise<
  { family: string; category: string; preview: string }[]
> {
  const { data } = await api.post<{
    fonts: { family: string; category: string; preview: string }[];
  }>('/api/v1/brand/ai/suggest-fonts');
  return data.fonts;
}

/** Generate a document theme from brand colors. */
export async function aiGenerateTheme(): Promise<{
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  surfaceColor: string;
  textColor: string;
  borderColor: string;
}> {
  const { data } = await api.post<{
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    surfaceColor: string;
    textColor: string;
    borderColor: string;
  }>('/api/v1/brand/ai/generate-theme');
  return data;
}
