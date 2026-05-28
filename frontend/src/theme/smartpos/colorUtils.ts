/**
 * Color math utilities shared between BrandContext and useBrandCss.
 * Mirror the logic in backend DesignTokenService.
 */

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#([0-9A-Fa-f]{6})$/.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function lighten(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const r = Math.min(255, rgb.r + Math.round((255 - rgb.r) * amount));
  const g = Math.min(255, rgb.g + Math.round((255 - rgb.g) * amount));
  const b = Math.min(255, rgb.b + Math.round((255 - rgb.b) * amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function darken(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const r = Math.max(0, Math.round(rgb.r * (1 - amount)));
  const g = Math.max(0, Math.round(rgb.g * (1 - amount)));
  const b = Math.max(0, Math.round(rgb.b * (1 - amount)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function alpha(hex: string, a: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(0,0,0,${a})`;
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${a})`;
}

/** WCAG relative luminance — choose white or dark text for contrast */
export function contrastingText(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#FFFFFF';
  const lum = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return lum > 0.55 ? '#0F172A' : '#FFFFFF';
}

/**
 * Build a CDN-friendly optimized image URL with resize and format params.
 * Appends ?w=width&format=webp for images served through an image proxy/CDN.
 * Returns original URL unchanged if it's a data URI or SVG.
 */
export function optimizedAssetUrl(
  url: string | undefined | null,
  width?: number,
  format: 'webp' | 'png' | 'jpg' = 'webp',
): string {
  if (!url) return '';
  if (url.startsWith('data:') || url.endsWith('.svg')) return url;
  const params = new URLSearchParams();
  if (width) params.set('w', String(width));
  params.set('format', format);
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}${params.toString()}`;
}
