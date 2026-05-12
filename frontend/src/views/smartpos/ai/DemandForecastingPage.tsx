/**
 * Demand Forecasting — AI-powered sales predictions for inventory planning.
 * Uses real forecasting API backed by ai-service.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import {
  IconArrowUpRight,
  IconArrowDownRight,
  IconMinus,
  IconBrain,
  IconRefresh,
} from '@tabler/icons-react';

import PageHeader from 'src/components/smartpos/PageHeader';
import { brand } from 'src/theme/smartpos/brand';
import { getForecasting, type ForecastItem } from 'src/api/smartpos/ai';

export default function DemandForecastingPage() {
  const [forecasts, setForecasts] = useState<ForecastItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);

  const loadForecast = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getForecasting();
      setForecasts(data);
      setGenerated(true);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to load forecast';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-load on first render
  useEffect(() => { loadForecast(); }, [loadForecast]);

  const maxDemand = forecasts.length > 0 ? Math.max(...forecasts.map((f) => f.projectedDemand), 1) : 1;

  return (
    <>
      <PageHeader
        title="Demand Forecasting"
        subtitle="AI-powered sales predictions for inventory planning"
        action={{
          label: loading ? 'Loading…' : 'Generate Forecast',
          icon: loading ? <CircularProgress size={14} color="inherit" /> : <IconBrain size={16} />,
          onClick: loadForecast,
          variant: 'accent',
        }}
      />

      {/* Info card */}
      <Card
        elevation={0}
        sx={{
          mb: 2.5,
          p: 2,
          border: `1px solid ${brand.info.light}`,
          borderRadius: '8px',
          bgcolor: brand.info.light,
        }}
      >
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <IconBrain size={18} color={brand.info.main} style={{ marginTop: 2 }} />
          <Typography variant="body2" sx={{ color: brand.info.dark, fontWeight: 500, lineHeight: 1.5 }}>
            AI model analyzes historical sales data to predict future demand. Accuracy improves with more data.
          </Typography>
        </Stack>
      </Card>

      {/* Error state */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} action={
          <Button size="small" onClick={loadForecast} startIcon={<IconRefresh size={14} />}>Retry</Button>
        }>
          {error}
        </Alert>
      )}

      {/* Empty state */}
      {!generated && !loading && !error && (
        <Card
          elevation={0}
          sx={{
            p: 6,
            textAlign: 'center',
            border: `1px solid ${brand.neutral[200]}`,
            borderRadius: '8px',
            bgcolor: brand.neutral[50],
          }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '14px',
              bgcolor: brand.neutral[100],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2,
            }}
          >
            <IconBrain size={28} color={brand.neutral[400]} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: brand.neutral[700], mb: 0.5 }}>
            No forecast generated yet
          </Typography>
          <Typography variant="body2" sx={{ color: brand.neutral[500], mb: 3 }}>
            Click &ldquo;Generate Forecast&rdquo; to run the AI prediction model on your sales data.
          </Typography>
          <Button
            variant="contained"
            startIcon={<IconBrain size={16} />}
            onClick={loadForecast}
            sx={{
              bgcolor: brand.accent[500],
              '&:hover': { bgcolor: brand.accent[600] },
              fontWeight: 700,
              borderRadius: '10px',
            }}
          >
            Generate Forecast
          </Button>
        </Card>
      )}

      {/* Loading state */}
      {loading && (
        <Stack spacing={2}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Card
              key={`sk-${i}`}
              elevation={0}
              sx={{
                p: 2,
                border: `1px solid ${brand.neutral[200]}`,
                borderRadius: '8px',
                bgcolor: brand.neutral[50],
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ width: '40%', height: 14, bgcolor: brand.neutral[200], borderRadius: '6px', mb: 1 }} />
                  <Box sx={{ width: '60%', height: 10, bgcolor: brand.neutral[100], borderRadius: '6px' }} />
                </Box>
                <Box sx={{ width: 100, height: 32, bgcolor: brand.neutral[200], borderRadius: '8px' }} />
              </Stack>
            </Card>
          ))}
        </Stack>
      )}

      {/* Forecast results */}
      {generated && !loading && forecasts.length > 0 && (
        <Stack spacing={2.5}>
          {/* Forecast cards grid */}
          <Grid container spacing={2}>
            {forecasts.map((f) => (
              <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={f.productId}>
                <Card
                  elevation={0}
                  sx={{
                    p: 2,
                    border: `1px solid ${brand.neutral[200]}`,
                    borderRadius: '8px',
                    bgcolor: '#fff',
                    transition: 'border-color 0.15s ease',
                    '&:hover': { borderColor: brand.primary[300] },
                  }}
                >
                  <Stack spacing={1.5}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: brand.neutral[900], lineHeight: 1.3 }}>
                          {f.productName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 500 }}>
                          {f.productCode}
                        </Typography>
                      </Box>
                      <Chip
                        label={`${f.confidence}% confidence`}
                        size="small"
                        sx={{
                          height: 22,
                          fontWeight: 700,
                          fontSize: '0.65rem',
                          borderRadius: '6px',
                          bgcolor: f.confidence >= 90 ? brand.success.light : f.confidence >= 80 ? brand.warning.light : brand.error.light,
                          color: f.confidence >= 90 ? brand.success.dark : f.confidence >= 80 ? brand.warning.dark : brand.error.dark,
                        }}
                      />
                    </Stack>

                    <Stack direction="row" spacing={2} alignItems="center">
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 500, display: 'block', mb: 0.5 }}>
                          Projected Demand
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: brand.neutral[900], lineHeight: 1.2 }}>
                          {f.projectedDemand.toLocaleString()}
                          <Typography component="span" variant="caption" sx={{ fontWeight: 500, color: brand.neutral[400], ml: 0.5 }}>
                            units
                          </Typography>
                        </Typography>
                      </Box>

                      <Stack direction="row" alignItems="center" spacing={0.25}>
                        {f.trend === 'UP' ? (
                          <IconArrowUpRight size={16} color={brand.success.main} stroke={2.5} />
                        ) : f.trend === 'DOWN' ? (
                          <IconArrowDownRight size={16} color={brand.error.main} stroke={2.5} />
                        ) : (
                          <IconMinus size={16} color={brand.neutral[400]} stroke={2.5} />
                        )}
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 700,
                            color: f.trend === 'UP' ? brand.success.dark : f.trend === 'DOWN' ? brand.error.dark : brand.neutral[500],
                            fontSize: '0.75rem',
                          }}
                        >
                          {f.trend}
                        </Typography>
                      </Stack>
                    </Stack>

                    {/* Inline bar chart */}
                    <Box>
                      <Box
                        sx={{
                          height: 8,
                          borderRadius: '4px',
                          bgcolor: brand.neutral[100],
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          sx={{
                            height: '100%',
                            width: `${Math.round((f.projectedDemand / maxDemand) * 100)}%`,
                            borderRadius: '4px',
                            background: `linear-gradient(90deg, ${brand.primary[400]}, ${brand.primary[600]})`,
                            transition: 'width 0.6s ease',
                          }}
                        />
                      </Box>
                    </Box>

                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 500 }}>
                        Stock: <strong style={{ color: brand.neutral[700] }}>{f.currentStock}</strong>
                      </Typography>
                      {f.weeksOfData > 0 && (
                        <Typography variant="caption" sx={{ color: brand.neutral[400], fontWeight: 500 }}>
                          {f.weeksOfData} weeks of data
                        </Typography>
                      )}
                    </Stack>
                  </Stack>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Regenerate button */}
          <Stack direction="row" justifyContent="center">
            <Button
              variant="outlined"
              startIcon={loading ? <CircularProgress size={14} /> : <IconRefresh size={16} />}
              onClick={loadForecast}
              disabled={loading}
              sx={{
                borderColor: brand.neutral[300],
                color: brand.neutral[700],
                fontWeight: 700,
                borderRadius: '10px',
                '&:hover': { borderColor: brand.primary[400], color: brand.primary[700], bgcolor: brand.primary[50] },
              }}
            >
              Refresh Forecast
            </Button>
          </Stack>
        </Stack>
      )}
    </>
  );
}
