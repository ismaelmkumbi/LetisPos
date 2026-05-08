import React from 'react';
import { Box, Stack, Tooltip, Typography } from '@mui/material';
import { IconCheck, IconPalette } from '@tabler/icons-react';
import { useLpTheme } from '../LandingpageTheme';

const themeOptions: Record<string, { label: string; short: string; swatches: string[] }> = {
  'refined-enterprise': {
    label: 'Refined Enterprise',
    short: 'Refined',
    swatches: ['#0F172A', '#16A34A', '#F8FAFC'],
  },
  'bold-energetic': {
    label: 'Bright Retail',
    short: 'Bright',
    swatches: ['#ECFDF5', '#16A34A', '#0F172A'],
  },
  'brutalist-honest': {
    label: 'Honest Mono',
    short: 'Honest',
    swatches: ['#FFFBEB', '#0F172A', '#4ADE80'],
  },
};

const ThemeToggle: React.FC = () => {
  const { theme, setTheme, themeKeys } = useLpTheme();

  return (
    <Box
      sx={{
        position: 'fixed',
        right: { xs: 12, md: 24 },
        bottom: { xs: 86, md: 24 },
        zIndex: 1250,
        p: 0.75,
        borderRadius: '16px',
        border: '1px solid var(--lp-border)',
        bgcolor: 'rgba(15, 23, 42, 0.90)',
        backdropFilter: 'blur(18px)',
        boxShadow: '0 18px 50px rgba(0,0,0,0.32)',
      }}
    >
      <Stack direction="row" spacing={0.75} alignItems="center">
        <Box
          sx={{
            width: 36,
            height: 36,
            display: { xs: 'none', sm: 'grid' },
            placeItems: 'center',
            borderRadius: '12px',
            color: '#FFFFFF',
            bgcolor: 'rgba(255,255,255,0.06)',
            border: '1px solid var(--lp-border)',
          }}
        >
          <IconPalette size={18} />
        </Box>

        {themeKeys.map((key) => {
          const option = themeOptions[key] || {
            label: key,
            short: key,
            swatches: ['var(--lp-bg)', 'var(--lp-accent)', 'var(--lp-text)'],
          };
          const active = key === theme;

          return (
            <Tooltip key={key} title={option.label} placement="top">
              <Box
                component="button"
                type="button"
                onClick={() => setTheme(key)}
                aria-label={`Use ${option.label} theme`}
                aria-pressed={active}
                sx={{
                  minWidth: { xs: 44, sm: 94 },
                  height: 36,
                  px: { xs: 0.75, sm: 1 },
                  border: active ? '1px solid var(--lp-accent)' : '1px solid var(--lp-border)',
                  borderRadius: '12px',
                  bgcolor: active ? 'var(--lp-accent-soft)' : 'rgba(255,255,255,0.035)',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.7,
                  boxShadow: active ? '0 0 0 3px rgba(74, 222, 128, 0.12)' : 'none',
                  transition: 'transform 0.18s ease, border-color 0.18s ease, background 0.18s ease',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    borderColor: 'var(--lp-accent)',
                  },
                }}
              >
                <Stack direction="row" spacing={0.25}>
                  {option.swatches.map((color) => (
                    <Box
                      key={color}
                      sx={{
                        width: 9,
                        height: 18,
                        borderRadius: '999px',
                        bgcolor: color,
                        border: '1px solid rgba(255,255,255,0.28)',
                      }}
                    />
                  ))}
                </Stack>
                <Typography
                  component="span"
                  sx={{
                    display: { xs: 'none', sm: 'block' },
                    fontSize: '0.72rem',
                    fontWeight: 850,
                    lineHeight: 1,
                  }}
                >
                  {option.short}
                </Typography>
                {active && (
                  <Box sx={{ display: { xs: 'none', sm: 'flex' }, color: 'var(--lp-accent)' }}>
                    <IconCheck size={14} />
                  </Box>
                )}
              </Box>
            </Tooltip>
          );
        })}
      </Stack>
    </Box>
  );
};

export default ThemeToggle;
