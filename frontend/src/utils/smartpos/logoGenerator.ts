/**
 * Shared logo generation utilities — used by BrandLogoUploader and AIBrandingAssistant.
 * Generates Letis-style SVGs from tenant brand profile data.
 */
import { brand } from 'src/theme/smartpos/brand';
import type { BrandProfile } from 'src/api/smartpos/brand';

export const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const svgDataUri = (svg: string) =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

export const initialsFor = (name: string | undefined | null) => {
  if (!name) return 'LP';
  const clean = name.trim();
  if (!clean) return 'LP';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

export const industrySymbol = (
  industry: string,
  description: string,
  color: string,
) => {
  const context = `${industry} ${description}`.toLowerCase();
  if (context.includes('pharmacy') || context.includes('health')) {
    return `<path d="M500 150h28v30h30v28h-30v30h-28v-30h-30v-28h30z" fill="${color}" opacity=".96"/>`;
  }
  if (context.includes('restaurant') || context.includes('food')) {
    return `<path d="M480 148h10v86h-10zm26 0h10v86h-10zm26 0h10v86h-10zm-52 42h62v16h-62z" fill="${color}" opacity=".96"/>`;
  }
  if (context.includes('fashion') || context.includes('apparel')) {
    return `<path d="M466 178l34-28h38l34 28-20 24-16-12v48h-68v-48l-16 12z" fill="${color}" opacity=".96"/>`;
  }
  if (context.includes('hardware') || context.includes('automotive')) {
    return `<path d="M470 214l64-64 20 20-64 64zm3-68l16-16 23 23-16 16z" fill="${color}" opacity=".96"/>`;
  }
  if (context.includes('education')) {
    return `<path d="M462 176l58-28 58 28-58 28zm24 22l34 16 34-16v34l-34 16-34-16z" fill="${color}" opacity=".96"/>`;
  }
  return `<rect x="468" y="150" width="88" height="88" rx="18" fill="${color}" opacity=".96"/><path d="M488 190h48M488 212h34" stroke="#fff" stroke-width="9" stroke-linecap="round" opacity=".85"/>`;
};

export type LogoMode = 'full' | 'mono' | 'thermal' | 'favicon';

export function buildLetisStyleLogoSvg(
  profile: BrandProfile,
  description: string,
  mode: LogoMode,
): string {
  const isMono = mode === 'mono' || mode === 'thermal';
  const primary = isMono ? '#111827' : profile.primaryColor || brand.primary[600];
  const secondary = isMono ? '#111827' : profile.secondaryColor || brand.neutral[700];
  const accent = isMono ? '#111827' : profile.accentColor || brand.primary[300];
  const surface = mode === 'thermal' ? '#FFFFFF' : '#F8FAFC';
  const businessName = escapeXml(profile.businessName || 'My Business');
  const tagline = escapeXml(profile.tagline || profile.industry || 'Powered by Letis POS');
  const initials = escapeXml(initialsFor(profile.businessName));
  const symbol = industrySymbol(profile.industry, description, isMono ? '#111827' : accent);
  const showText = mode === 'full';
  const showGradient = mode === 'full' || mode === 'favicon';

  if (mode === 'favicon') {
    return `
<svg width="128" height="128" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="tenantLogoGradient" x1="8" y1="8" x2="120" y2="120" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${primary}"/>
      <stop offset="1" stop-color="${brand.primary[600]}"/>
    </linearGradient>
  </defs>
  <rect x="8" y="8" width="112" height="112" rx="28" fill="url(#tenantLogoGradient)"/>
  <path d="M45 31v55h42l14-14-14-5H67V31z" fill="#fff" opacity=".97"/>
  <path d="M86 86l28-28-13-13v27H86z" fill="#fff" opacity=".58"/>
  <rect x="84" y="22" width="26" height="20" rx="7" fill="${accent}" opacity=".95"/>
  <text x="64" y="78" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="900" fill="#fff" opacity=".96">${initials}</text>
</svg>`.trim();
  }

  return `
<svg width="640" height="240" viewBox="0 0 640 240" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="tenantLogoGradient" x1="32" y1="28" x2="200" y2="204" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${showGradient ? primary : secondary}"/>
      <stop offset="1" stop-color="${showGradient ? brand.primary[600] : secondary}"/>
    </linearGradient>
  </defs>
  <rect width="640" height="240" rx="34" fill="${mode === 'thermal' ? '#FFFFFF' : surface}"/>
  <rect x="32" y="28" width="184" height="184" rx="44" fill="${showGradient ? 'url(#tenantLogoGradient)' : primary}"/>
  <path d="M88 70v92h72l22-22-22-8h-34V70z" fill="#fff" opacity=".97"/>
  <path d="M160 162l44-44-20-20v42h-24z" fill="#fff" opacity=".58"/>
  <rect x="158" y="54" width="40" height="30" rx="9" fill="${isMono ? '#111827' : accent}" opacity=".95"/>
  <text x="124" y="146" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="900" fill="${isMono ? '#111827' : primary}" opacity=".95">${initials}</text>
  ${showText ? `
  <text x="252" y="106" font-family="Inter, Arial, sans-serif" font-size="42" font-weight="850" fill="${secondary}">${businessName}</text>
  <text x="254" y="146" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="650" fill="${brand.neutral[500]}">${tagline}</text>
  <path d="M254 172h172" stroke="${primary}" stroke-width="8" stroke-linecap="round"/>
  ${symbol}
  ` : ''}
</svg>`.trim();
}

export interface LogoVariants {
  logoUrl: string;
  logoSvgUrl: string;
  logoMonochromeUrl: string;
  logoThermalUrl: string;
  faviconUrl: string;
}

export interface LogoVariantSvgs {
  full: string;
  mono: string;
  thermal: string;
  favicon: string;
}

export function generateLogoVariantSvgs(
  profile: BrandProfile,
  description: string,
): LogoVariantSvgs {
  return {
    full: buildLetisStyleLogoSvg(profile, description, 'full'),
    mono: buildLetisStyleLogoSvg(profile, description, 'mono'),
    thermal: buildLetisStyleLogoSvg(profile, description, 'thermal'),
    favicon: buildLetisStyleLogoSvg(profile, description, 'favicon'),
  };
}

export function generateAllLogoVariants(
  profile: BrandProfile,
  description: string,
): LogoVariants {
  const { full, mono, thermal, favicon } = generateLogoVariantSvgs(profile, description);

  return {
    logoUrl: svgDataUri(full),
    logoSvgUrl: svgDataUri(full),
    logoMonochromeUrl: svgDataUri(mono),
    logoThermalUrl: svgDataUri(thermal),
    faviconUrl: svgDataUri(favicon),
  };
}
