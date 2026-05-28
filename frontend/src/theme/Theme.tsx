import _ from 'lodash';
import { createTheme } from '@mui/material/styles';

import { useContext, useEffect } from 'react';

import components from './Components';
import typography from './Typography';
import { shadows, darkshadows } from './Shadows';
import { DarkThemeColors } from './DarkThemeColors';
import { LightThemeColors } from './LightThemeColors';
import { baseDarkTheme, baselightTheme } from './DefaultColors';
import * as locales from '@mui/material/locale';
import { CustomizerContext } from 'src/context/CustomizerContext';
import type { BrandColorTokens } from 'src/context/smartpos/BrandContext';
import type { BrandProfile } from 'src/api/smartpos/brand';

interface BuildThemeConfig {
  direction?: string;
  theme?: string;
  brandColors?: BrandColorTokens;
  brandProfile?: BrandProfile | null;
}

export const BuildTheme = (config: BuildThemeConfig = {}) => {
  const themeOptions = LightThemeColors.find((theme) => theme.name === config.theme);
  const darkthemeOptions = DarkThemeColors.find((theme) => theme.name === config.theme);
  const { activeMode, isBorderRadius } = useContext(CustomizerContext);

  const defaultTheme = activeMode === 'dark' ? baseDarkTheme : baselightTheme;
  const defaultShadow = activeMode === 'dark' ? darkshadows : shadows;
  const themeSelect = activeMode === 'dark' ? darkthemeOptions : themeOptions;

  const baseMode: any = {
    palette: {
      mode: activeMode,
    },
    shape: {
      borderRadius: isBorderRadius,
    },
    shadows: defaultShadow,
    typography: typography,
  };

  // Merge tenant brand colors into the palette — overrides preset theme colors
  const brandColors = config.brandColors;
  const brandProfile = config.brandProfile;
  if (brandColors) {
    baseMode.palette.primary = {
      main: brandColors.primary,
      light: brandColors.primaryLight,
      dark: brandColors.primaryDark,
      contrastText: brandColors.primaryContrast,
    };
    baseMode.palette.secondary = {
      main: brandColors.accent,
      light: brandColors.accentLight,
      dark: brandColors.accentDark,
      contrastText: '#ffffff',
    };
    if (brandColors.secondary) {
      baseMode.palette.text = {
        primary: activeMode === 'dark' ? '#F8FAFC' : '#0F172A',
        secondary: activeMode === 'dark' ? '#94A3B8' : '#64748B',
      };
    }
    if (brandProfile?.fontFamily) {
      baseMode.typography = {
        ...typography,
        fontFamily: brandProfile.fontFamily,
      };
    }
  }

  const theme = createTheme(
    _.merge({}, baseMode, defaultTheme, locales, themeSelect, {
      direction: config.direction,
    }),
  );
  theme.components = components(theme);

  return theme;
};

const ThemeSettings = (config?: BuildThemeConfig) => {
  const { activeTheme, activeDir } = useContext(CustomizerContext);

  const theme = BuildTheme({
    direction: activeDir,
    theme: activeTheme,
    brandColors: config?.brandColors,
    brandProfile: config?.brandProfile,
  });
  useEffect(() => {
    document.dir = activeDir;
  }, [activeDir]);

  return theme;
};

export { ThemeSettings };
