/**
 * Shared logo generation utilities — used by BrandLogoUploader and AIBrandingAssistant.
 * Generates document-ready tenant SVGs from brand profile data.
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

const markGlyph = (
  industry: string,
  description: string,
  stroke: string,
  fill: string,
) => {
  const context = `${industry} ${description}`.toLowerCase();
  if (context.includes('pharmacy') || context.includes('health')) {
    return `<path d="M120 76v34M103 93h34" stroke="${stroke}" stroke-width="13" stroke-linecap="round" opacity=".34"/><circle cx="120" cy="93" r="44" stroke="${fill}" stroke-width="10" opacity=".42"/>`;
  }
  if (context.includes('restaurant') || context.includes('food')) {
    return `<path d="M101 54v81M121 54v81M141 54v81M96 92h50" stroke="${stroke}" stroke-width="10" stroke-linecap="round" opacity=".32"/><path d="M166 54c16 30 16 58 0 84" stroke="${fill}" stroke-width="11" stroke-linecap="round" opacity=".58"/>`;
  }
  if (context.includes('fashion') || context.includes('apparel')) {
    return `<path d="M74 92l34-31h24l34 31-20 23-14-11v50H108v-50l-14 11z" fill="${stroke}" opacity=".28"/><path d="M108 61c4 10 20 10 24 0" stroke="${fill}" stroke-width="8" stroke-linecap="round" opacity=".55"/>`;
  }
  if (context.includes('hardware') || context.includes('automotive')) {
    return `<path d="M76 142l64-64 20 20-64 64z" fill="${stroke}" opacity=".30"/><path d="M73 75l18-18 28 28-18 18z" fill="${fill}" opacity=".72"/><path d="M139 78l14-14 23 23-14 14z" fill="${fill}" opacity=".48"/>`;
  }
  if (context.includes('education')) {
    return `<path d="M63 88l57-28 57 28-57 28z" fill="${stroke}" opacity=".30"/><path d="M90 112v30l30 15 30-15v-30" stroke="${fill}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" opacity=".62"/>`;
  }
  return `<path d="M72 68h96v74H72z" fill="${stroke}" opacity=".28"/><path d="M88 94h64M88 118h42" stroke="${fill}" stroke-width="10" stroke-linecap="round" opacity=".7"/><path d="M72 68l48 39 48-39" stroke="${fill}" stroke-width="10" stroke-linejoin="round" opacity=".55"/>`;
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
  const tagline = escapeXml(profile.tagline || profile.industry || 'Quality service');
  const initials = escapeXml(initialsFor(profile.businessName));
  const symbol = industrySymbol(profile.industry, description, isMono ? '#111827' : accent);
  const glyph = markGlyph(
    profile.industry,
    description,
    isMono ? '#D1D5DB' : '#FFFFFF',
    isMono ? '#9CA3AF' : accent,
  );
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
  <circle cx="64" cy="64" r="35" fill="#FFFFFF" opacity=".14"/>
  <path d="M35 82c13 16 45 18 62-5" stroke="#fff" stroke-width="9" stroke-linecap="round" opacity=".82"/>
  <path d="M40 45c16-17 50-17 66 0" stroke="${accent}" stroke-width="10" stroke-linecap="round" opacity=".9"/>
  <text x="64" y="75" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="32" font-weight="900" fill="#fff" opacity=".98">${initials}</text>
  <circle cx="96" cy="32" r="12" fill="${accent}" opacity=".95"/>
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
  <circle cx="124" cy="120" r="72" fill="${isMono ? '#F3F4F6' : '#FFFFFF'}" opacity="${isMono ? '.86' : '.14'}"/>
  <path d="M62 166c29 28 91 30 125-8" stroke="#fff" stroke-width="15" stroke-linecap="round" opacity=".78"/>
  <path d="M70 73c30-30 78-34 113-5" stroke="${isMono ? '#111827' : accent}" stroke-width="16" stroke-linecap="round" opacity=".88"/>
  ${glyph}
  <text x="124" y="132" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="44" font-weight="900" fill="#fff" opacity=".98">${initials}</text>
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
