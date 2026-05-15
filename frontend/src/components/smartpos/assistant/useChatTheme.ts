import { useContext } from 'react';
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
}

const darkColors: ChatColors = {
  bg: '#0f0f14',
  surface: 'rgba(22,22,30,0.6)',
  surfaceHover: 'rgba(255,255,255,0.05)',
  border: 'rgba(255,255,255,0.06)',
  text: '#f0efe9',
  textSecondary: '#8b8b96',
  textMuted: 'rgba(255,255,255,0.25)',
  accent: '#f4b731',
  accentGlow: 'rgba(244,183,49,0.15)',
  accentBg: 'rgba(244,183,49,0.08)',
  accentBorder: 'rgba(244,183,49,0.15)',
  userBg: 'rgba(255,255,255,0.06)',
  userBorder: 'rgba(255,255,255,0.06)',
  userText: '#e0ded5',
  aiBg: 'linear-gradient(135deg, rgba(244,183,49,0.06) 0%, rgba(244,183,49,0.02) 100%)',
  aiBorder: 'rgba(244,183,49,0.1)',
  inputBg: 'rgba(255,255,255,0.04)',
  inputBorder: 'rgba(255,255,255,0.08)',
  inputFocusBorder: 'rgba(244,183,49,0.35)',
  inputFocusGlow: '0 0 20px rgba(244,183,49,0.08)',
  sendBg: 'linear-gradient(135deg, #f4b731 0%, #e5a820 100%)',
  sendText: '#0f0f14',
  fabBg: 'linear-gradient(135deg, rgba(22,22,30,0.95) 0%, rgba(30,30,40,0.9) 100%)',
  fabBorder: 'rgba(255,255,255,0.08)',
  fabIcon: '#e0ded5',
  tableHeaderBg: 'rgba(255,255,255,0.05)',
  tableRowBorder: 'rgba(255,255,255,0.03)',
  metricBg: 'linear-gradient(135deg, rgba(244,183,49,0.08) 0%, rgba(244,183,49,0.02) 100%)',
  overlayBg: '#0f0f14',
  noiseOpacity: 0.015,
  radialGlow: 'radial-gradient(circle at top right, rgba(244,183,49,0.04) 0%, transparent 70%)',
};

const lightColors: ChatColors = {
  bg: '#fafafa',
  surface: 'rgba(255,255,255,0.85)',
  surfaceHover: 'rgba(0,0,0,0.03)',
  border: 'rgba(0,0,0,0.06)',
  text: '#1a1a2e',
  textSecondary: '#6b6b80',
  textMuted: 'rgba(0,0,0,0.25)',
  accent: '#b8860b',
  accentGlow: 'rgba(184,134,11,0.12)',
  accentBg: 'rgba(184,134,11,0.06)',
  accentBorder: 'rgba(184,134,11,0.2)',
  userBg: '#1a1a2e',
  userBorder: 'rgba(0,0,0,0.08)',
  userText: '#ffffff',
  aiBg: 'linear-gradient(135deg, rgba(184,134,11,0.05) 0%, rgba(184,134,11,0.01) 100%)',
  aiBorder: 'rgba(184,134,11,0.15)',
  inputBg: 'rgba(0,0,0,0.03)',
  inputBorder: 'rgba(0,0,0,0.08)',
  inputFocusBorder: 'rgba(184,134,11,0.4)',
  inputFocusGlow: '0 0 16px rgba(184,134,11,0.06)',
  sendBg: 'linear-gradient(135deg, #b8860b 0%, #9a7209 100%)',
  sendText: '#ffffff',
  fabBg: 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)',
  fabBorder: 'rgba(0,0,0,0.08)',
  fabIcon: '#1a1a2e',
  tableHeaderBg: 'rgba(0,0,0,0.03)',
  tableRowBorder: 'rgba(0,0,0,0.04)',
  metricBg: 'linear-gradient(135deg, rgba(184,134,11,0.06) 0%, rgba(184,134,11,0.01) 100%)',
  overlayBg: '#ffffff',
  noiseOpacity: 0.008,
  radialGlow: 'radial-gradient(circle at top right, rgba(184,134,11,0.03) 0%, transparent 70%)',
};

export function useChatTheme(): ChatColors {
  const ctx = useContext(CustomizerContext);
  if (!ctx) return darkColors;
  return ctx.activeMode === 'dark' ? darkColors : lightColors;
}
