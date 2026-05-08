import { useState } from 'react';
import { Box, Button, Card, CardContent, CircularProgress, Skeleton, Stack, Typography, Chip } from '@mui/material';
import { IconSparkles, IconRefresh } from '@tabler/icons-react';
import { aiNarrate, type InsightResponse } from 'src/api/smartpos/ai';
import { brand } from 'src/theme/smartpos/brand';

interface Props {
  reportKind: string;
  factsJson: string;
  cacheKey?: string;
}

export default function ExecutiveSummary({ reportKind, factsJson }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InsightResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await aiNarrate({ reportKind, factsJson });
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate summary');
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <Card elevation={0} sx={{ border: `1px solid ${brand.error.light}`, borderRadius: '12px', mb: 2 }}>
        <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ color: brand.error.main, fontSize: 13 }}>{error}</Typography>
          <Button size="small" onClick={handleGenerate} startIcon={<IconRefresh size={14} />}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  if (!result) {
    return (
      <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: '12px', mb: 2 }}>
        <CardContent sx={{ p: 2 }}>
          {loading ? (
            <Stack spacing={1}>
              <Skeleton variant="text" width="90%" />
              <Skeleton variant="text" width="75%" />
              <Skeleton variant="text" width="60%" />
            </Stack>
          ) : (
            <Button fullWidth variant="outlined" onClick={handleGenerate}
              startIcon={<IconSparkles size={16} />}
              sx={{ borderColor: brand.accent[300], color: brand.accent[600], fontWeight: 700, borderRadius: '10px', py: 1.5 }}>
              Generate Executive Summary
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card elevation={0} sx={{ border: `1px solid ${brand.primary[200]}`, borderRadius: '12px', mb: 2, background: `linear-gradient(135deg, ${brand.primary[50]} 0%, #fff 100%)` }}>
      <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <IconSparkles size={16} color={brand.primary[600]} />
          <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', color: brand.primary[700] }}>Executive Summary</Typography>
          <Chip label="AI" size="small" sx={{ bgcolor: brand.primary[100], color: brand.primary[700], fontWeight: 700, fontSize: '0.65rem', height: 20, borderRadius: '6px' }} />
          <Box sx={{ flex: 1 }} />
          <Button size="small" onClick={handleGenerate} startIcon={loading ? <CircularProgress size={12} /> : <IconRefresh size={12} />}
            sx={{ textTransform: 'none', fontSize: '0.7rem', fontWeight: 600, color: brand.neutral[500], '&:hover': { color: brand.primary[600] } }}>
            {loading ? 'Refreshing…' : 'Regenerate'}
          </Button>
        </Stack>
        <Typography sx={{ fontSize: '0.875rem', lineHeight: 1.75, color: brand.neutral[800] }}>
          {result.narrative}
        </Typography>
      </CardContent>
    </Card>
  );
}
