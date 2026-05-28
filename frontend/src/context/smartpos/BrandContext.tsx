import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import {
  getBrandProfile,
  saveBrandProfile,
  type BrandProfile,
  type BrandProfileUpdate,
} from 'src/api/smartpos/brand';
import { tokenStore } from 'src/api/smartpos/client';
import { brand } from 'src/theme/smartpos/brand';
import { lighten, darken, alpha } from 'src/theme/smartpos/colorUtils';
import { CustomizerContext } from 'src/context/CustomizerContext';

// ── Derived color tokens ────────────────────────────────────────────────────

export interface BrandColorTokens {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primarySoft: string;
  primaryBorder: string;
  primaryContrast: string;
  accent: string;
  accentLight: string;
  accentDark: string;
  accentSoft: string;
  secondary: string;
  secondaryLight: string;
}

export function computeColorTokens(profile: BrandProfile | null, mode: 'light' | 'dark' = 'light'): BrandColorTokens {
  const primary = profile?.primaryColor || brand.primary[600];
  const accent = profile?.accentColor || brand.accent[500];
  const secondary = profile?.secondaryColor || brand.neutral[700];
  const isDark = mode === 'dark';

  return {
    primary: isDark ? lighten(primary, 0.15) : primary,
    primaryLight: lighten(primary, 0.88),
    primaryDark: darken(primary, 0.12),
    primarySoft: isDark ? alpha(primary, 0.15) : alpha(primary, 0.08),
    primaryBorder: isDark ? alpha(primary, 0.30) : alpha(primary, 0.22),
    primaryContrast: '#FFFFFF',
    accent: isDark ? lighten(accent, 0.15) : accent,
    accentLight: lighten(accent, 0.88),
    accentDark: darken(accent, 0.12),
    accentSoft: isDark ? alpha(accent, 0.15) : alpha(accent, 0.08),
    secondary: isDark ? lighten(secondary, 0.30) : secondary,
    secondaryLight: lighten(secondary, 0.90),
  };
}

// ── Context ──────────────────────────────────────────────────────────────────

interface BrandContextValue {
  profile: BrandProfile | null;
  colors: BrandColorTokens;
  designTokens: Record<string, string>;
  loading: boolean;
  error: string | null;
  update: (patch: BrandProfileUpdate) => Promise<void>;
  refresh: () => Promise<void>;
}

const DEFAULT_PROFILE: BrandProfile = {
  id: '', tenantId: '',
  businessName: '', tagline: '', description: '', industry: 'Retail', brandTone: 'Professional',
  primaryColor: brand.primary[600], secondaryColor: brand.neutral[700], accentColor: brand.accent[500],
  fontFamily: 'Inter, system-ui, sans-serif', typographyScale: 'default',
  logoUrl: '', logoSvgUrl: '', logoMonochromeUrl: '', logoThermalUrl: '', faviconUrl: '',
  watermarkUrl: '', stampUrl: '', signatureUrl: '', qrCodeUrl: '',
  website: '', facebook: '', instagram: '', twitter: '', linkedin: '',
  parentBrandId: null, inheritanceMode: 'full_override' as const, lockedFields: null,
  customDomain: '', customDomainVerified: false, customDomainVerificationToken: '',
  status: 'published' as const,
  createdAt: '', updatedAt: '',
};

const BrandContext = createContext<BrandContextValue | undefined>(undefined);

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<BrandProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { activeMode } = useContext(CustomizerContext);

  const fetch = useCallback(async () => {
    if (!tokenStore.get()) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const p = await getBrandProfile();
      setProfile(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load brand profile');
      setProfile(DEFAULT_PROFILE);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const update = useCallback(async (patch: BrandProfileUpdate) => {
    const updated = await saveBrandProfile(patch);
    setProfile(updated);
  }, []);

  const colors = useMemo(() => {
    const mode = activeMode === 'dark' ? 'dark' : 'light';
    return computeColorTokens(profile, mode);
  }, [profile, activeMode]);
  const designTokens = useMemo<Record<string, string>>(() => {
    if (!profile) return {};
    const mode = activeMode === 'dark' ? 'dark' : 'light';
    return computeDesignTokens(profile, mode);
  }, [profile, activeMode]);

  const value = useMemo<BrandContextValue>(
    () => ({ profile, colors, designTokens, loading, error, update, refresh: fetch }),
    [profile, colors, designTokens, loading, error, update, fetch],
  );

  return (
    <BrandContext.Provider value={value}>
      {children}
    </BrandContext.Provider>
  );
}

export function computeDesignTokens(profile: BrandProfile, mode: 'light' | 'dark' = 'light'): Record<string, string> {
  const primary = profile.primaryColor || brand.primary[600];
  const secondary = profile.secondaryColor || brand.neutral[700];
  const accent = profile.accentColor || brand.accent[500];
  const isDark = mode === 'dark';

  const out: Record<string, string> = {};

  // Core palette — adjust for dark mode (lift primary for contrast on dark surfaces)
  out['color.primary'] = isDark ? lighten(primary, 0.15) : primary;
  out['color.primary-light'] = lighten(primary, 0.88);
  out['color.primary-dark'] = darken(primary, 0.12);
  out['color.primary-soft'] = isDark ? alpha(primary, 0.15) : alpha(primary, 0.08);
  out['color.primary-border'] = isDark ? alpha(primary, 0.30) : alpha(primary, 0.22);
  out['color.primary-contrast'] = '#FFFFFF';

  out['color.secondary'] = isDark ? lighten(secondary, 0.30) : secondary;
  out['color.secondary-light'] = lighten(secondary, 0.90);

  out['color.accent'] = isDark ? lighten(accent, 0.15) : accent;
  out['color.accent-light'] = lighten(accent, 0.88);
  out['color.accent-dark'] = darken(accent, 0.12);
  out['color.accent-soft'] = isDark ? alpha(accent, 0.15) : alpha(accent, 0.08);

  // Semantic — keep bright for visibility
  out['color.success'] = '#22C55E';
  out['color.success-light'] = lighten('#22C55E', 0.88);
  out['color.warning'] = '#F59E0B';
  out['color.warning-light'] = lighten('#F59E0B', 0.88);
  out['color.error'] = isDark ? '#F87171' : '#EF4444';
  out['color.error-light'] = lighten('#EF4444', 0.88);
  out['color.info'] = isDark ? '#60A5FA' : '#3B82F6';
  out['color.info-light'] = lighten('#3B82F6', 0.88);

  // Surfaces — invert for dark mode
  out['surface.page'] = isDark ? '#0F172A' : '#F8FAFC';
  out['surface.card'] = isDark ? '#1E293B' : '#FFFFFF';
  out['surface.header'] = primary;
  out['surface.sidebar'] = isDark ? '#020617' : '#1E293B';
  out['surface.hover'] = isDark ? alpha(primary, 0.12) : alpha(primary, 0.08);
  out['surface.selected'] = isDark ? alpha(primary, 0.18) : alpha(primary, 0.12);

  // Text — invert for dark mode
  out['text.primary'] = isDark ? '#F8FAFC' : '#0F172A';
  out['text.secondary'] = isDark ? '#94A3B8' : '#64748B';
  out['text.inverse'] = isDark ? '#0F172A' : '#FFFFFF';
  out['text.link'] = isDark ? lighten(primary, 0.20) : primary;

  // Borders — darken for dark mode
  out['border.default'] = isDark ? '#334155' : '#E2E8F0';
  out['border.strong'] = isDark ? '#475569' : '#CBD5E1';
  out['border.focus'] = isDark ? lighten(primary, 0.20) : primary;

  // Radii
  out['radius.sm'] = '4px';
  out['radius.md'] = '8px';
  out['radius.lg'] = '12px';
  out['radius.xl'] = '16px';

  // Typography
  const fontFamily = profile.fontFamily || 'Inter, system-ui, sans-serif';
  out['font.body'] = fontFamily;
  out['font.heading'] = fontFamily;
  out['font.mono'] = "'JetBrains Mono', 'Fira Code', monospace";

  // Sizes
  out['font.size-xs'] = '0.75rem';
  out['font.size-sm'] = '0.875rem';
  out['font.size-base'] = '1rem';
  out['font.size-lg'] = '1.125rem';
  out['font.size-xl'] = '1.25rem';
  out['font.size-2xl'] = '1.5rem';
  out['font.size-3xl'] = '1.875rem';

  return out;
}

export function useBrand(): BrandContextValue {
  const ctx = useContext(BrandContext);
  if (!ctx) throw new Error('useBrand must be used within BrandProvider');
  return ctx;
}

export { BrandContext };
