import { useState } from 'react';
import { Box, Button, Card, CardContent, Chip, CircularProgress, Grid, Skeleton, Stack, Typography } from '@mui/material';
import { IconBulb } from '@tabler/icons-react';
import { aiGetRecommendations, type Recommendation } from 'src/api/smartpos/ai';
import { brand } from 'src/theme/smartpos/brand';

interface Props {
  reportKind: string;
  factsJson: string;
  cacheKey?: string;
}

const priorityColors: Record<string, { bg: string; color: string; border: string }> = {
  HIGH: { bg: brand.error.light, color: brand.error.dark, border: brand.error.main },
  MEDIUM: { bg: brand.warning.light, color: brand.warning.dark, border: brand.warning.main },
  LOW: { bg: brand.success.light, color: brand.success.dark, border: brand.success.main },
};

const categoryColors: Record<string, string> = {
  INVENTORY: brand.info.main, PRICING: brand.accent[500], SALES: brand.primary[600],
  COST: brand.error.main, GENERAL: brand.neutral[600],
};

export default function SmartInsights({ reportKind, factsJson }: Props) {
  const [loading, setLoading] = useState(false);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await aiGetRecommendations(reportKind, factsJson);
      setRecs(r.recommendations);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', mb: 1.5 }}>Smart Insights</Typography>
        <Grid container spacing={1.5}>
          {[1, 2, 3].map((i) => (
            <Grid key={i} size={{ xs: 12, md: 4 }}>
              <Skeleton variant="rounded" height={100} sx={{ borderRadius: '10px' }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (recs.length === 0 && !error) {
    return (
      <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: '12px', mb: 2 }}>
        <CardContent sx={{ p: 2 }}>
          <Button fullWidth variant="outlined" onClick={handleGenerate}
            startIcon={<IconBulb size={16} />}
            sx={{ borderColor: brand.warning.main, color: brand.warning.main, fontWeight: 700, borderRadius: '10px', py: 1.5 }}>
            Generate Smart Insights
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box sx={{ mb: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconBulb size={16} color={brand.warning.main} />
          <Typography sx={{ fontWeight: 800, fontSize: '0.85rem' }}>Smart Insights</Typography>
          <Chip label={`${recs.length} actions`} size="small"
            sx={{ bgcolor: brand.warning.light, color: brand.warning.dark, fontWeight: 700, fontSize: '0.65rem', height: 20, borderRadius: '6px' }} />
        </Stack>
        <Button size="small" onClick={handleGenerate}
          sx={{ textTransform: 'none', fontSize: '0.7rem', fontWeight: 600, color: brand.neutral[500] }}>
          Refresh
        </Button>
      </Stack>

      {error && <Typography sx={{ color: brand.error.main, fontSize: 12, mb: 1 }}>{error}</Typography>}

      <Grid container spacing={1.5}>
        {recs.map((rec) => {
          const p = priorityColors[rec.priority] || priorityColors.MEDIUM;
          return (
            <Grid key={rec.title} size={{ xs: 12, md: 4 }}>
              <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderLeft: `3px solid ${p.border}`, borderRadius: '10px', height: '100%', bgcolor: p.bg, transition: 'transform 0.12s ease', '&:hover': { transform: 'translateY(-1px)' } }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Stack direction="row" spacing={0.5} sx={{ mb: 1 }}>
                    <Chip label={rec.priority} size="small"
                      sx={{ bgcolor: `${p.color}22`, color: p.color, fontWeight: 800, fontSize: '0.6rem', height: 18, borderRadius: '4px' }} />
                    <Chip label={rec.category} size="small"
                      sx={{ bgcolor: `${categoryColors[rec.category] || brand.neutral[600]}18`, color: categoryColors[rec.category] || brand.neutral[600], fontWeight: 700, fontSize: '0.6rem', height: 18, borderRadius: '4px' }} />
                  </Stack>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 0.5 }}>{rec.title}</Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: brand.neutral[600], lineHeight: 1.5 }}>{rec.description}</Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
