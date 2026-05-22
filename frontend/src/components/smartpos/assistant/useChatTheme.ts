import { useContext } from 'react';
import { alpha, useTheme } from '@mui/material/styles';
import { CustomizerContext } from 'src/context/CustomizerContext';

interface ChatColors {
  bg: string;
  surface: string;
  surfaceHover: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentGlow: string;
  accentBg: string;
  accentBorder: string;
  userBg: string;
  userBorder: string;
  userText: string;
  aiBg: string;
  aiBorder: string;
  inputBg: string;
  inputBorder: string;
  inputFocusBorder: string;
  inputFocusGlow: string;
  sendBg: string;
  sendText: string;
  fabBg: string;
  fabBorder: string;
  fabIcon: string;
  tableHeaderBg: string;
  tableRowBorder: string;
  metricBg: string;
  overlayBg: string;
  noiseOpacity: number;
  radialGlow: string;
  success: string;
  error: string;
  errorBg: string;
  errorHoverBg: string;
  codeBg: string;
  codeHeaderBg: string;
}

export function useChatTheme(): ChatColors {
  const theme = useTheme();
  const ctx = useContext(CustomizerContext);
  const isDark = (ctx?.activeMode ?? theme.palette.mode) === 'dark';
  const accent = theme.palette.primary.main;
  const accentDark = theme.palette.primary.dark || accent;
  const paper = theme.palette.background.paper;
  const base = theme.palette.background.default;
  const text = theme.palette.text.primary;
  const textSecondary = theme.palette.text.secondary;
  const divider = theme.palette.divider;

  return {
    bg: base,
    surface: alpha(paper, isDark ? 0.72 : 0.92),
    surfaceHover: alpha(accent, isDark ? 0.12 : 0.07),
    border: alpha(divider, isDark ? 0.7 : 0.9),
    text,
    textSecondary,
    textMuted: alpha(textSecondary, isDark ? 0.55 : 0.7),
    accent,
    accentGlow: alpha(accent, isDark ? 0.2 : 0.14),
    accentBg: alpha(accent, isDark ? 0.12 : 0.08),
    accentBorder: alpha(accent, isDark ? 0.28 : 0.22),
    userBg: isDark ? alpha(accent, 0.22) : accent,
    userBorder: alpha(accentDark, isDark ? 0.35 : 0.24),
    userText: theme.palette.primary.contrastText,
    aiBg: isDark ? alpha(paper, 0.76) : alpha(accent, 0.045),
    aiBorder: alpha(accent, isDark ? 0.16 : 0.14),
    inputBg: alpha(paper, isDark ? 0.62 : 0.86),
    inputBorder: alpha(divider, isDark ? 0.75 : 0.95),
    inputFocusBorder: alpha(accent, 0.45),
    inputFocusGlow: `0 0 0 3px ${alpha(accent, isDark ? 0.12 : 0.1)}`,
    sendBg: accent,
    sendText: theme.palette.primary.contrastText,
    fabBg: paper,
    fabBorder: alpha(divider, 0.9),
    fabIcon: text,
    tableHeaderBg: alpha(accent, isDark ? 0.12 : 0.06),
    tableRowBorder: alpha(divider, isDark ? 0.48 : 0.7),
    metricBg: isDark ? alpha(accent, 0.12) : alpha(accent, 0.055),
    overlayBg: base,
    noiseOpacity: isDark ? 0.012 : 0.006,
    radialGlow: `radial-gradient(circle at top right, ${alpha(accent, isDark ? 0.1 : 0.07)} 0%, transparent 70%)`,
    success: theme.palette.success.main,
    error: theme.palette.error.main,
    errorBg: alpha(theme.palette.error.main, isDark ? 0.16 : 0.1),
    errorHoverBg: alpha(theme.palette.error.main, isDark ? 0.24 : 0.16),
    codeBg: isDark ? alpha('#020617', 0.9) : alpha(theme.palette.grey[100], 0.95),
    codeHeaderBg: isDark ? alpha('#0f172a', 0.92) : alpha(theme.palette.grey[200], 0.92),
  };
}
