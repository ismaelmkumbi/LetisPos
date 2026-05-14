/**
 * Warm Brutalism — auth page theme tokens.
 *
 * Distinct from the main brand palette (green). Used exclusively on
 * LetisAuthLayout, AuthRegister, AuthLoginForm, and the welcome dashboard.
 *
 * Palette: charcoal ink, warm paper, gold/clay accents, deep green.
 * Typography: Newsreader (serif headlines) + DM Sans (ui body).
 */

const _ink = '#1a1a16';
const _gold = '#c2843a';
const _clay = '#c4724a';
const _green = '#1b5e2f';

/** Convert hex to rgba CSS value. */
const rgba = (hex: string, a: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
};

export const wb = {
  ink: _ink,
  inkLight: '#3d3d36',
  paper: '#fafaf7',
  paperMuted: '#f3f2ee',
  gold: _gold,
  goldLight: '#f5e6d3',
  clay: _clay,
  clayLight: '#faf0e9',
  green: _green,
  greenLight: '#e8f5e9',
  greenMid: '#2e7d3a',
  border: '#e6e4dd',
  borderStrong: '#d4d2ca',

  radius: {
    sm: '6px',
    md: '10px',
    lg: '18px',
    xl: '24px',
  },

  shadow: {
    card: '0 1px 2px rgba(26,26,22,0.04), 0 4px 16px rgba(26,26,22,0.06)',
    elevated: '0 1px 2px rgba(26,26,22,0.05), 0 8px 32px rgba(26,26,22,0.09)',
  },

  font: {
    display: '"Newsreader", Georgia, serif',
    body: '"DM Sans", -apple-system, sans-serif',
  },

  /** Dark column background with grain texture via CSS */
  darkBg: `
    radial-gradient(ellipse at 25% 30%, ${rgba(_gold, 0.12)} 0%, transparent 55%),
    radial-gradient(ellipse at 70% 75%, ${rgba(_green, 0.08)} 0%, transparent 50%),
    linear-gradient(165deg, ${_ink} 0%, #2a2820 40%, #1f221b 100%)
  `,

  /** Light page background */
  lightBg: `
    radial-gradient(ellipse at 15% 20%, ${rgba(_clay, 0.04)} 0%, transparent 60%),
    radial-gradient(ellipse at 85% 80%, ${rgba(_green, 0.03)} 0%, transparent 60%)
  `,
} as const;

export type WarmBrutalismTokens = typeof wb;
