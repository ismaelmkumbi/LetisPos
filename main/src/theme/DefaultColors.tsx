/**
 * Letis POS — base MUI palette (light + dark).
 *
 * All color values come from src/theme/smartpos/brand.ts.
 * The structural shape (baselightTheme / baseDarkTheme) must be preserved
 * so downstream consumers (Theme.tsx, component overrides) keep working.
 */
import { brand } from './smartpos/brand';

const baselightTheme = {
  direction: 'ltr',
  palette: {
    primary: {
      main:          brand.primary[600],
      light:         brand.primary[50],
      dark:          brand.primary[700],
      contrastText:  '#ffffff',
    },
    secondary: {
      main:          brand.accent[500],
      light:         brand.accent[50],
      dark:          brand.accent[700],
      contrastText:  '#ffffff',
    },
    success: {
      main:          brand.success.main,
      light:         brand.success.light,
      dark:          brand.success.dark,
      contrastText:  '#ffffff',
    },
    info: {
      main:          brand.info.main,
      light:         brand.info.light,
      dark:          brand.info.dark,
      contrastText:  '#ffffff',
    },
    error: {
      main:          brand.error.main,
      light:         brand.error.light,
      dark:          brand.error.dark,
      contrastText:  '#ffffff',
    },
    warning: {
      main:          brand.warning.main,
      light:         brand.warning.light,
      dark:          brand.warning.dark,
      contrastText:  '#ffffff',
    },
    purple: {
      A50:  brand.primary[50],
      A100: brand.primary[700],
      A200: brand.primary[600],
    },
    grey: {
      100: brand.neutral[50],
      200: brand.neutral[100],
      300: brand.neutral[200],
      400: brand.neutral[400],
      500: brand.neutral[500],
      600: brand.neutral[800],
    },
    text: {
      primary:   brand.neutral[900],
      secondary: brand.neutral[600],
    },
    action: {
      disabledBackground: 'rgba(15,23,42,0.08)',
      hoverOpacity: 0.04,
      hover: brand.primary[50],
    },
    divider: brand.neutral[200],
    background: {
      default: brand.neutral[50],
      paper:   '#ffffff',
    },
  },
};

const baseDarkTheme = {
  direction: 'ltr',
  palette: {
    primary: {
      main:          brand.primary[400],   // lifted one stop for dark-surface contrast
      light:         brand.primary[900],
      dark:          brand.primary[600],
      contrastText:  '#ffffff',
    },
    secondary: {
      main:          brand.accent[400],
      light:         brand.accent[900],
      dark:          brand.accent[600],
      contrastText:  '#ffffff',
    },
    success: {
      main:          brand.success.main,
      light:         '#0F3B2E',
      dark:          brand.success.dark,
      contrastText:  '#ffffff',
    },
    info: {
      main:          brand.info.main,
      light:         '#0B2240',
      dark:          brand.info.dark,
      contrastText:  '#ffffff',
    },
    error: {
      main:          brand.error.main,
      light:         '#3F1D1D',
      dark:          brand.error.dark,
      contrastText:  '#ffffff',
    },
    warning: {
      main:          brand.warning.main,
      light:         '#3F2E12',
      dark:          brand.warning.dark,
      contrastText:  '#ffffff',
    },
    purple: {
      A50:  brand.primary[900],
      A100: brand.primary[400],
      A200: brand.primary[600],
    },
    grey: {
      100: brand.neutral[800],
      200: brand.neutral[700],
      300: brand.neutral[600],
      400: brand.neutral[400],
      500: brand.neutral[200],
      600: brand.neutral[50],
    },
    text: {
      primary:   brand.neutral[50],
      secondary: brand.neutral[400],
    },
    action: {
      disabledBackground: 'rgba(226,232,240,0.10)',
      hoverOpacity: 0.07,
      hover: 'rgba(42, 143, 132,0.12)',
    },
    divider: brand.neutral[700],
    background: {
      default: '#0F1829',
      dark:    '#0F1829',
      paper:   brand.neutral[800],
    },
  },
};

export { baseDarkTheme, baselightTheme };
