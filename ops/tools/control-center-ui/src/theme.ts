/** Letis Control Center — mirrors the LetisPOS brand palette */

export const brand = {
  primary: {
    50: '#ECFDF5', 100: '#DCFCE7', 200: '#BBF7D0', 300: '#86EFAC',
    400: '#4ADE80', 500: '#22C55E', 600: '#16A34A', 700: '#15803D',
    800: '#166534', 900: '#14532D',
  },
  neutral: {
    50: '#F8FAFC', 100: '#F1F5F9', 200: '#E2E8F0', 300: '#CBD5E1',
    400: '#94A3B8', 500: '#64748B', 600: '#334155', 700: '#1E293B',
    800: '#111827', 900: '#0F172A',
  },
  success: { light: '#DCFCE7', main: '#22C55E', dark: '#15803D' },
  warning: { light: '#FEF3C7', main: '#F59E0B', dark: '#B45309' },
  error: { light: '#FEE2E2', main: '#EF4444', dark: '#B91C1C' },
  info: { light: '#EFF6FF', main: '#3B82F6', dark: '#1D4ED8' },
  purple: { light: '#F3E8FF', main: '#8B5CF6', dark: '#6D28D9' },
} as const;

export const darkBrand = {
  primary: brand.primary[500],
  primaryDark: brand.primary[700],
  primarySoft: brand.primary[50],
  surface: brand.neutral[800],
  background: '#0B1120',
  cardBg: brand.neutral[800],
  border: brand.neutral[700],
  text: brand.neutral[50],
  textMuted: brand.neutral[400],
  success: brand.success.main,
  warning: brand.warning.main,
  error: brand.error.main,
  info: brand.info.main,
};
