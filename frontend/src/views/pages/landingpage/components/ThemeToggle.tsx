import React from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import { IconPaint } from '@tabler/icons-react';
import { useLpTheme } from '../LandingpageTheme';

const themeLabels: Record<string, string> = {
  'refined-enterprise': 'Refined Enterprise',
  'bold-energetic': 'Bold & Energetic',
  'brutalist-honest': 'Brutalist Honest',
};

const ThemeToggle: React.FC = () => {
  const { theme, setTheme, themeKeys } = useLpTheme();

  const cycleTheme = () => {
    const idx = themeKeys.indexOf(theme);
    const next = themeKeys[(idx + 1) % themeKeys.length];
    setTheme(next);
  };

  return (
    <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000 }}>
      <Tooltip title={`Theme: ${themeLabels[theme] || theme}`} placement="left">
        <IconButton
          onClick={cycleTheme}
          sx={{
            width: 44,
            height: 44,
            bgcolor: 'var(--lp-surface)',
            color: 'var(--lp-text)',
            border: '1px solid var(--lp-border)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
            '&:hover': {
              bgcolor: 'var(--lp-surface-hover)',
            },
          }}
        >
          <IconPaint size={20} />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default ThemeToggle;
