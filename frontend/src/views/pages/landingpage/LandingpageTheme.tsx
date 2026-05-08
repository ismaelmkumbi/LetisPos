import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ThemeTokens } from './themes/types';
import { refinedEnterprise } from './themes/refined-enterprise';
import { boldEnergetic } from './themes/bold-energetic';
import { brutalistHonest } from './themes/brutalist-honest';

const themes: Record<string, ThemeTokens> = {
  'refined-enterprise': refinedEnterprise,
  'bold-energetic': boldEnergetic,
  'brutalist-honest': brutalistHonest,
};

const STORAGE_KEY = 'letis-lp-theme';
const DEFAULT_THEME = 'refined-enterprise';

interface ThemeContextValue {
  theme: string;
  setTheme: (key: string) => void;
  tokens: ThemeTokens;
  themeKeys: string[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useLpTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useLpTheme must be used within LpThemeProvider');
  return ctx;
}

function applyTokens(tokens: ThemeTokens): void {
  const root = document.documentElement;
  root.style.setProperty('--lp-bg', tokens.bg);
  root.style.setProperty('--lp-text', tokens.text);
  root.style.setProperty('--lp-text-muted', tokens.textMuted);
  root.style.setProperty('--lp-accent', tokens.accent);
  root.style.setProperty('--lp-accent-soft', tokens.accentSoft);
  root.style.setProperty('--lp-accent-hover', tokens.accentHover);
  root.style.setProperty('--lp-surface', tokens.surface);
  root.style.setProperty('--lp-surface-hover', tokens.surfaceHover);
  root.style.setProperty('--lp-border', tokens.border);
  root.style.setProperty('--lp-hero-bg', tokens.heroBg);
  root.style.setProperty('--lp-hero-text', tokens.heroText);
  root.style.setProperty('--lp-cta-bg', tokens.ctaBg);
  root.style.setProperty('--lp-cta-text', tokens.ctaText);
  root.style.setProperty('--lp-cta-secondary-bg', tokens.ctaSecondaryBg);
  root.style.setProperty('--lp-cta-secondary-text', tokens.ctaSecondaryText);
  root.style.setProperty('--lp-cta-secondary-border', tokens.ctaSecondaryBorder);
  root.style.setProperty('--lp-font-display', tokens.fontDisplay);
  root.style.setProperty('--lp-font-body', tokens.fontBody);
}

export function LpThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored && themes[stored] ? stored : DEFAULT_THEME;
    } catch {
      return DEFAULT_THEME;
    }
  });

  const tokens = themes[theme];

  useEffect(() => {
    applyTokens(tokens);
  }, [tokens]);

  const setTheme = useCallback((key: string) => {
    if (themes[key]) {
      setThemeState(key);
      try {
        localStorage.setItem(STORAGE_KEY, key);
      } catch {
        // localStorage unavailable — silently ignore
      }
    }
  }, []);

  const value: ThemeContextValue = {
    theme,
    setTheme,
    tokens,
    themeKeys: Object.keys(themes),
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
