import { useState } from 'react';
import { Box, Button, Card, CardContent, Chip, CircularProgress, Collapse, Stack, Typography } from '@mui/material';
import { IconBulb, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { aiGetRecommendations, type Recommendation } from 'src/api/smartpos/ai';
import { brand } from 'src/theme/smartpos/brand';

interface Props {
  reportKind: string;
  factsJson: string;
}

const priorityColor: Record<string, string> = {
  HIGH: brand.error.main, MEDIUM: brand.warning.main, LOW: brand.success.main,
};
const categoryColor: Record<string, string> = {
  INVENTORY: brand.info.main, PRICING: brand.accent[500], SALES: brand.primary[600],
  COST: brand.error.main, GENERAL: brand.neutral[600],
};

export default function AiRecommendations({ reportKind, factsJson }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setOpen(true);
    if (recs.length > 0) return;
    setLoading(true);
    setError(null);
    try {
      const r = await aiGetRecommendations(reportKind, factsJson);
      setRecs(r.recommendations);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate recommendations');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: '12px', mb: 2 }}>
      <CardContent sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" onClick={handleGenerate}
          sx={{ cursor: 'pointer' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: brand.warning.light, color: brand.warning.main, display: 'grid', placeItems: 'center' }}>
              <IconBulb size={18} />
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: 14, color: brand.neutral[900] }}>Smart Recommendations</Typography>
          </Stack>
          {open ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
        </Stack>

        <Collapse in={open}>
          <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${brand.neutral[100]}` }}>
            {loading && <CircularProgress size={20} sx={{ color: brand.accent[500] }} />}
            {error && <Typography sx={{ color: brand.error.main, fontSize: 13 }}>{error}</Typography>}
            {recs.length > 0 && (
              <Stack spacing={1.5}>
                {recs.map((r, i) => (
                  <Box key={i} sx={{ p: 1.5, borderRadius: '8px', border: `1px solid ${brand.neutral[200]}`, bgcolor: brand.neutral[50] }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 13, flex: 1 }}>{r.title}</Typography>
                      <Chip label={r.priority} size="small" sx={{ bgcolor: `${priorityColor[r.priority]}18`, color: priorityColor[r.priority], fontWeight: 700, fontSize: 11 }} />
                      <Chip label={r.category} size="small" sx={{ bgcolor: `${categoryColor[r.category]}18`, color: categoryColor[r.category], fontWeight: 600, fontSize: 11 }} />
                    </Stack>
                    <Typography sx={{ fontSize: 12, color: brand.neutral[600] }}>{r.description}</Typography>
                  </Box>
                ))}
              </Stack>
            )}
            {!loading && !error && recs.length === 0 && (
              <Button variant="outlined" size="small" startIcon={<IconBulb size={14} />}
                onClick={handleGenerate}
                sx={{ borderColor: brand.warning.main, color: brand.warning.main, fontWeight: 600 }}>
                Generate recommendations
              </Button>
            )}
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
}
