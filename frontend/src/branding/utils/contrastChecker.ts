/**
 * WCAG 2.1 contrast ratio calculations.
 * Used by the brand color picker to validate accessibility of chosen colors.
 *
 * AA requirements:
 *   Normal text (body):  4.5:1
 *   Large text (≥18px):  3.0:1
 * AAA requirements:
 *   Normal text (body):  7.0:1
 *   Large text (≥18px):  4.5:1
 */

export interface ContrastResult {
  ratio: number;           // e.g. 5.24
  aa: boolean;             // passes AA for normal text
  aaLarge: boolean;        // passes AA for large text
  aaa: boolean;            // passes AAA for normal text
  aaaLarge: boolean;       // passes AAA for large text
  fgHex: string;
  bgHex: string;
}

/** Relative luminance per WCAG 2.1 sRGB formula */
function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Calculate WCAG contrast ratio between two hex colours */
export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Full contrast check result for a foreground/background pair */
export function checkContrast(fgHex: string, bgHex: string): ContrastResult {
  const ratio = contrastRatio(fgHex, bgHex);
  return {
    ratio: Math.round(ratio * 100) / 100,
    aa: ratio >= 4.5,
    aaLarge: ratio >= 3.0,
    aaa: ratio >= 7.0,
    aaaLarge: ratio >= 4.5,
    fgHex,
    bgHex,
  };
}

/**
 * Check a brand primary colour against both white and dark text.
 * Returns results for both pairings plus a recommendation.
 */
export function checkBrandColorContrast(primaryHex: string) {
  const onWhite = checkContrast(primaryHex, '#FFFFFF');
  const onDark = checkContrast(primaryHex, '#0F172A');

  // Which background yields better contrast for text on the primary?
  return {
    asForeground: onWhite,     // primary-as-bg with white text
    asBackground: onDark,      // primary-as-fg on dark bg
    textOnPrimary: checkContrast('#FFFFFF', primaryHex),
    darkTextOnPrimary: checkContrast('#0F172A', primaryHex),
    recommendation:
      onWhite.aa
        ? 'pass' as const
        : onDark.aa
          ? 'marginal' as const
          : 'fail' as const,
  };
}

/** Standard WCAG grade label */
export function gradeText(result: ContrastResult): string {
  if (result.aaa) return 'AAA';
  if (result.aa) return 'AA';
  if (result.aaLarge) return 'AA (Large)';
  return 'Fail';
}

export function gradeColor(result: ContrastResult): 'success' | 'warning' | 'error' {
  if (result.aa) return 'success';
  if (result.aaLarge) return 'warning';
  return 'error';
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#([0-9A-Fa-f]{6})$/.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
