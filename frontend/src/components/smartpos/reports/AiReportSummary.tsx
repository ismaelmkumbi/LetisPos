import { useState } from 'react';
import { Box, Button, Card, CardContent, CircularProgress, Collapse, Stack, Typography } from '@mui/material';
import { IconSparkles, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { aiNarrate, type InsightResponse } from 'src/api/smartpos/ai';
import { brand } from 'src/theme/smartpos/brand';

interface Props {
  reportKind: string;
  factsJson: string;
}

export default function AiReportSummary({ reportKind, factsJson }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InsightResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setOpen(true);
    if (result) return;
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

  return (
    <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: '12px', mb: 2 }}>
      <CardContent sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" onClick={handleGenerate}
          sx={{ cursor: 'pointer' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: brand.accent[50], color: brand.accent[500], display: 'grid', placeItems: 'center' }}>
              <IconSparkles size={18} />
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: 14, color: brand.neutral[900] }}>Smart Summary</Typography>
          </Stack>
          {open ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
        </Stack>

        <Collapse in={open}>
          <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${brand.neutral[100]}` }}>
            {loading && <CircularProgress size={20} sx={{ color: brand.accent[500] }} />}
            {error && <Typography sx={{ color: brand.error.main, fontSize: 13 }}>{error}</Typography>}
            {result && (
              <Box sx={{ whiteSpace: 'pre-wrap', fontSize: 13, color: brand.neutral[800], lineHeight: 1.7 }}>
                {result.narrative}
              </Box>
            )}
            {!result && !loading && !error && (
              <Button variant="outlined" size="small" startIcon={<IconSparkles size={14} />}
                onClick={handleGenerate}
                sx={{ borderColor: brand.accent[300], color: brand.accent[600], fontWeight: 600 }}>
                Generate insight
              </Button>
            )}
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
}
