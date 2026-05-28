import { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, CircularProgress, LinearProgress, Stack, Typography,
} from '@mui/material';
import { IconHeart, IconRefresh, IconArrowRight } from '@tabler/icons-react';
import { api } from 'src/api/smartpos/client';

interface HealthScore {
  score: number;
  grade: string;
  completeness: number;
  consistency: number;
  assetQuality: number;
  suggestions: string[];
}

const GRADE_COLORS: Record<string, string> = {
  A: '#22C55E', B: '#3B82F6', C: '#F59E0B', D: '#F97316', F: '#EF4444',
};

export default function BrandHealthCard() {
  const [health, setHealth] = useState<HealthScore | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/v1/brand/ai/health-score');
      setHealth(data);
    } catch {
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  if (loading) {
    return (
      <Stack alignItems="center" sx={{ py: 3 }}>
        <CircularProgress size={24} sx={{ color: 'var(--bp-color-primary, #16A34A)' }} />
      </Stack>
    );
  }

  if (!health) return null;

  const gradeColor = GRADE_COLORS[health.grade] || '#94A3B8';

  return (
    <Box
      sx={{
        p: 2.5,
        borderRadius: '14px',
        border: '1px solid var(--bp-border-default, #E2E8F0)',
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <IconHeart size={20} color="var(--bp-color-primary, #16A34A)" />
        <Typography sx={{ fontWeight: 800, fontSize: '0.88rem' }}>
          Brand Health
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Button size="small" onClick={fetch}
          startIcon={<IconRefresh size={14} />}
          sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.68rem', minWidth: 0 }}>
          Refresh
        </Button>
      </Stack>

      {/* Score gauge */}
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Box
          sx={{
            width: 64, height: 64, borderRadius: '50%',
            border: `4px solid ${gradeColor}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Stack alignItems="center">
            <Typography sx={{ fontSize: '1.1rem', fontWeight: 900, color: gradeColor, lineHeight: 1 }}>
              {health.score}
            </Typography>
            <Typography sx={{ fontSize: '0.55rem', fontWeight: 800, color: gradeColor }}>
              {health.grade}
            </Typography>
          </Stack>
        </Box>
        <Box sx={{ flex: 1 }}>
          {[
            { label: 'Completeness', value: health.completeness, max: 40 },
            { label: 'Consistency', value: health.consistency, max: 30 },
            { label: 'Asset Quality', value: health.assetQuality, max: 30 },
          ].map((bar) => (
            <Stack key={bar.label} direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <Typography sx={{ fontSize: '0.58rem', fontWeight: 600, color: 'var(--bp-text-secondary, #64748B)', width: 80 }}>
                {bar.label}
              </Typography>
              <Box sx={{ flex: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={(bar.value / bar.max) * 100}
                  sx={{
                    height: 6, borderRadius: 3,
                    bgcolor: 'var(--bp-border-default, #E2E8F0)',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: bar.value / bar.max > 0.7 ? '#22C55E' : bar.value / bar.max > 0.4 ? '#F59E0B' : '#EF4444',
                      borderRadius: 3,
                    },
                  }}
                />
              </Box>
              <Typography sx={{ fontSize: '0.58rem', fontWeight: 700, width: 32, textAlign: 'right' }}>
                {bar.value}/{bar.max}
              </Typography>
            </Stack>
          ))}
        </Box>
      </Stack>

      {/* Suggestions */}
      {health.suggestions.length > 0 && (
        <Box>
          <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--bp-text-secondary, #64748B)', mb: 0.75 }}>
            Quick Wins
          </Typography>
          <Stack spacing={0.5}>
            {health.suggestions.map((s, i) => (
              <Stack key={i} direction="row" spacing={0.75} alignItems="center"
                sx={{
                  p: 0.75, borderRadius: '8px',
                  bgcolor: 'var(--bp-surface-page, #F8FAFC)',
                  border: '1px solid var(--bp-border-default, #E2E8F0)',
                }}
              >
                <IconArrowRight size={14} color="var(--bp-color-primary, #16A34A)" />
                <Typography sx={{ fontSize: '0.68rem', fontWeight: 600, flex: 1 }}>
                  {s}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
}
