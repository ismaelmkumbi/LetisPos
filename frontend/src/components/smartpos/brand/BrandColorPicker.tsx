/**
 * BrandColorPicker — premium color input with swatch preview, hex validation,
 * and MUI-compatible color picker fallback.
 */
import { useState, useCallback, useMemo } from 'react';
import { Box, Chip, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { brand } from 'src/theme/smartpos/brand';
import { checkContrast, gradeText, gradeColor } from 'src/branding/utils/contrastChecker';

interface BrandColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  hint?: string;
}

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = HEX_RE.exec(hex);
  if (!m) return null;
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function isDark(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  return rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114 < 140;
}

export default function BrandColorPicker({
  label,
  value,
  onChange,
  hint,
}: BrandColorPickerProps) {
  const [input, setInput] = useState(value);
  const valid = HEX_RE.test(input);

  const wcag = useMemo(() => {
    if (!valid) return null;
    return checkContrast(input, '#FFFFFF');
  }, [input, valid]);

  const handleBlur = useCallback(() => {
    if (HEX_RE.test(input)) {
      onChange(input);
    } else {
      setInput(value); // revert
    }
  }, [input, value, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && HEX_RE.test(input)) onChange(input);
    },
    [input, onChange],
  );

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Tooltip title={valid ? input : 'Invalid hex'} arrow>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '10px',
              bgcolor: valid ? input : brand.neutral[200],
              border: `2px solid ${brand.neutral[200]}`,
              boxShadow: `0 2px 8px ${input}30`,
              flexShrink: 0,
              cursor: 'pointer',
              transition: 'transform 0.15s ease',
              '&:hover': { transform: 'scale(1.08)' },
            }}
            onClick={() => {
              // Native color picker via hidden input
              const inp = document.createElement('input');
              inp.type = 'color';
              inp.value = input;
              inp.addEventListener('change', (e) => {
                const v = (e.target as HTMLInputElement).value;
                setInput(v);
                onChange(v);
              });
              inp.click();
            }}
          />
        </Tooltip>
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="caption"
            sx={{ fontWeight: 700, color: brand.neutral[700], display: 'block', mb: 0.25 }}
          >
            {label}
          </Typography>
          <TextField
            size="small"
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, 7))}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            error={input.length >= 7 && !valid}
          sx={{
              maxWidth: 160,
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontFamily: 'monospace',
                fontWeight: 700,
                bgcolor: isDark(input) && valid ? brand.neutral[800] : '#fff',
                '& .MuiOutlinedInput-input': {
                  color: valid && isDark(input) ? '#fff' : brand.neutral[800],
                },
              },
            }}
          />
        </Box>
      </Stack>
      {hint && (
        <Typography variant="caption" sx={{ color: brand.neutral[400], mt: 0.25, display: 'block', ml: 6.5 }}>
          {hint}
        </Typography>
      )}
      {wcag && (
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.5, ml: 6.5 }}>
          <Chip
            label={`${gradeText(wcag)}`}
            size="small"
            sx={{
              fontSize: '0.62rem', fontWeight: 800, height: 20,
              bgcolor: gradeColor(wcag) === 'success' ? brand.success.light
                : gradeColor(wcag) === 'warning' ? brand.warning.light : brand.error.light,
              color: gradeColor(wcag) === 'success' ? brand.success.dark
                : gradeColor(wcag) === 'warning' ? brand.warning.dark : brand.error.dark,
            }}
          />
          <Typography variant="caption" sx={{ fontSize: '0.58rem', color: brand.neutral[400], fontWeight: 600 }}>
            vs white — ratio {wcag.ratio.toFixed(1)}:1
          </Typography>
        </Stack>
      )}
    </Box>
  );
}
