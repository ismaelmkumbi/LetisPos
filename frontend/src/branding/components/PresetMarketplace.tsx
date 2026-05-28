import { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, Chip, Grid, Stack, Typography, Button, CircularProgress,
} from '@mui/material';
import { IconPalette, IconSparkles } from '@tabler/icons-react';
import { useBrand } from 'src/context/smartpos/BrandContext';
import { api } from 'src/api/smartpos/client';

interface Preset {
  id: string;
  name: string;
  industry: string;
  description: string;
  paletteJson: string;
  typographyJson: string;
  isPremium: boolean;
}

function parsePalette(json: string): { primary: string; secondary: string; accent: string } | null {
  try { return JSON.parse(json); } catch { return null; }
}

function parseTypography(json: string): { heading: string; body: string } | null {
  try { return JSON.parse(json); } catch { return null; }
}

const INDUSTRIES = [
  'All', 'Pharmacy', 'Restaurant', 'Retail', 'Salon', 'Supermarket',
  'Hardware', 'Electronics', 'Hotel', 'Clinic', 'Law Firm', 'Bakery', 'Auto Parts',
];

export default function PresetMarketplace() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [filter, setFilter] = useState('All');
  const { refresh } = useBrand();

  useEffect(() => {
    setLoading(true);
    const params = filter !== 'All' ? `?industry=${encodeURIComponent(filter)}` : '';
    api.get(`/api/v1/brand/presets${params}`)
      .then(({ data }) => setPresets(data))
      .catch(() => setPresets([]))
      .finally(() => setLoading(false));
  }, [filter]);

  const handleApply = useCallback(async (presetId: string) => {
    setApplying(presetId);
    try {
      await api.post(`/api/v1/brand/presets/${presetId}/apply`);
      await refresh();
    } catch {
      // Silently fail — user can retry
    } finally {
      setApplying(null);
    }
  }, [refresh]);

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <IconSparkles size={18} color="var(--bp-color-primary, #16A34A)" />
        <Typography sx={{ fontWeight: 800, fontSize: '0.88rem' }}>
          Brand Preset Marketplace
        </Typography>
      </Stack>

      {/* Industry filter chips */}
      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 2, rowGap: 0.5 }}>
        {INDUSTRIES.map((ind) => (
          <Chip
            key={ind}
            label={ind}
            size="small"
            onClick={() => setFilter(ind)}
            variant={filter === ind ? 'filled' : 'outlined'}
            sx={{
              fontWeight: 600, fontSize: '0.68rem',
              bgcolor: filter === ind ? 'var(--bp-color-primary, #16A34A)' : undefined,
              color: filter === ind ? '#fff' : 'var(--bp-text-secondary, #64748B)',
              borderColor: 'var(--bp-border-default, #E2E8F0)',
            }}
          />
        ))}
      </Stack>

      {loading ? (
        <Stack alignItems="center" sx={{ py: 3 }}>
          <CircularProgress size={24} sx={{ color: 'var(--bp-color-primary, #16A34A)' }} />
        </Stack>
      ) : (
        <Grid container spacing={1.5}>
          {presets.map((preset) => {
            const palette = parsePalette(preset.paletteJson);
            const typo = parseTypography(preset.typographyJson);
            const isApplying = applying === preset.id;

            return (
              <Grid key={preset.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: '12px',
                    border: '1px solid var(--bp-border-default, #E2E8F0)',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      borderColor: 'var(--bp-color-primary-border, rgba(22,163,74,0.22))',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                    },
                  }}
                >
                  <Stack spacing={1.5}>
                    {/* Palette swatches */}
                    {palette && (
                      <Stack direction="row" spacing={0.75}>
                        {[palette.primary, palette.secondary, palette.accent].map((c) => (
                          <Box
                            key={c}
                            sx={{
                              width: 32, height: 32, borderRadius: '8px',
                              bgcolor: c, border: '1px solid rgba(0,0,0,0.08)',
                            }}
                          />
                        ))}
                      </Stack>
                    )}

                    <Box>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <Typography sx={{ fontWeight: 800, fontSize: '0.8rem' }}>
                          {preset.name}
                        </Typography>
                        {preset.isPremium && (
                          <Chip label="Premium" size="small"
                            sx={{ fontSize: '0.58rem', fontWeight: 700, height: 18,
                              bgcolor: 'var(--bp-color-accent-soft, rgba(245,158,11,0.08))',
                              color: 'var(--bp-color-accent-dark, #D97706)' }}
                          />
                        )}
                      </Stack>
                      <Typography sx={{ fontSize: '0.65rem', color: 'var(--bp-text-secondary, #64748B)', mt: 0.25 }}>
                        {preset.description}
                      </Typography>
                    </Box>

                    {typo && (
                      <Typography sx={{ fontSize: '0.6rem', color: 'var(--bp-text-secondary, #64748B)', fontWeight: 600 }}>
                        Font: {typo.heading.split(',')[0]}
                      </Typography>
                    )}

                    <Button
                      fullWidth
                      size="small"
                      variant="outlined"
                      startIcon={isApplying ? <CircularProgress size={14} /> : <IconPalette size={14} />}
                      onClick={() => handleApply(preset.id)}
                      disabled={isApplying}
                      sx={{
                        textTransform: 'none', fontWeight: 700, fontSize: '0.72rem',
                        borderRadius: '8px',
                        borderColor: 'var(--bp-color-primary-border, rgba(22,163,74,0.22))',
                        color: 'var(--bp-color-primary, #16A34A)',
                        '&:hover': {
                          borderColor: 'var(--bp-color-primary, #16A34A)',
                          bgcolor: 'var(--bp-color-primary-soft, rgba(22,163,74,0.08))',
                        },
                      }}
                    >
                      {isApplying ? 'Applying...' : 'Apply Preset'}
                    </Button>
                  </Stack>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}
