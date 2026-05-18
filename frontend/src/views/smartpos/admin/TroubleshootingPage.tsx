import { useState, useCallback } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, CardActions,
  Button, Alert, Chip, Stack, CircularProgress,
} from '@mui/material';
import { IconRefresh, IconHistory, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { runWacBackfill, runSaleCostBackfill } from 'src/api/smartpos/admin';
import PageHeader from 'src/components/smartpos/PageHeader';

type OpState = 'idle' | 'running' | 'success' | 'error';

interface OpResult {
  state: OpState;
  message: string;
  lastRun: string | null;
}

const initialResult: OpResult = { state: 'idle', message: '', lastRun: null };

export default function TroubleshootingPage() {
  const [wacResult, setWacResult] = useState<OpResult>(initialResult);
  const [saleCostResult, setSaleCostResult] = useState<OpResult>(initialResult);

  const handleWacBackfill = useCallback(async () => {
    setWacResult({ state: 'running', message: '', lastRun: null });
    try {
      const res = await runWacBackfill();
      const now = new Date().toLocaleString();
      if (res.updated > 0) {
        setWacResult({
          state: 'success',
          message: `Updated ${res.updated} stock records with purchase costs (${res.costsFound} cost entries found).`,
          lastRun: now,
        });
      } else if (res.costsFound === 0) {
        setWacResult({
          state: 'success',
          message: 'No purchase data found for this tenant. Stock must be received via purchase orders first.',
          lastRun: now,
        });
      } else {
        setWacResult({
          state: 'success',
          message: 'All stock costs are already up to date. No changes needed.',
          lastRun: now,
        });
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setWacResult({
        state: 'error',
        message: err?.response?.data?.message || err?.message || 'Backfill failed. Check server logs.',
        lastRun: null,
      });
    }
  }, []);

  const handleSaleCostBackfill = useCallback(async () => {
    setSaleCostResult({ state: 'running', message: '', lastRun: null });
    try {
      const res = await runSaleCostBackfill();
      const now = new Date().toLocaleString();
      if (res.updated > 0) {
        setSaleCostResult({
          state: 'success',
          message: `Fixed ${res.updated} historical sale lines with purchase cost data (${res.skipped} skipped, ${res.total} total lines checked)`,
          lastRun: now,
        });
      } else if (res.total > 0) {
        setSaleCostResult({
          state: 'success',
          message: `All ${res.total} historical sales already have cost data`,
          lastRun: now,
        });
      } else {
        setSaleCostResult({
          state: 'success',
          message: 'All historical sales already have cost data. Nothing to fix.',
          lastRun: now,
        });
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setSaleCostResult({
        state: 'error',
        message: err?.response?.data?.message || err?.message || 'Backfill failed. Check server logs.',
        lastRun: null,
      });
    }
  }, []);

  const operations = [
    {
      title: 'Recalculate Product Costs',
      icon: <IconRefresh size={24} />,
      description:
        'Seeds weighted average cost for existing stock from the most recent purchase costs. Run this if products are showing 0% or 100% margins on the Business Pulse card.',
      result: wacResult,
      onRun: handleWacBackfill,
    },
    {
      title: 'Fix Historical Sale Costs',
      icon: <IconHistory size={24} />,
      description:
        'Updates cost of goods sold on past sales that were recorded before the cost tracking feature. Run after \'Recalculate Product Costs\' if historical margins look wrong.',
      result: saleCostResult,
      onRun: handleSaleCostBackfill,
    },
  ];

  const resultAlert = (result: OpResult) => {
    if (result.state === 'running') return null;
    if (result.state === 'idle') return null;
    return (
      <Alert
        severity={result.state === 'error' ? 'error' : 'success'}
        icon={result.state === 'error' ? <IconAlertCircle /> : <IconCheck />}
        sx={{ mt: 1.5 }}
      >
        <Typography variant="body2">{result.message}</Typography>
        {result.lastRun && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            Last run: {result.lastRun}
          </Typography>
        )}
      </Alert>
    );
  };

  return (
    <Box sx={{ pb: 4 }}>
      <PageHeader title="Troubleshooting" subtitle="Administrative operations and data repairs" />

      <Grid container spacing={2} sx={{ mt: 1 }}>
        {operations.map((op) => (
          <Grid size={{ xs: 12, md: 6 }} key={op.title}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px' }}>
              <CardContent>
                <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 1 }}>
                  <Box sx={{ color: 'primary.main', mt: 0.3 }}>{op.icon}</Box>
                  <Box>
                    <Typography variant="h6" fontWeight={700} fontSize={16}>
                      {op.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {op.description}
                    </Typography>
                  </Box>
                </Stack>
                {resultAlert(op.result)}
              </CardContent>
              <CardActions sx={{ px: 2, pb: 2 }}>
                <Button
                  variant="contained"
                  color={op.result.state === 'error' ? 'error' : 'primary'}
                  disabled={op.result.state === 'running'}
                  onClick={op.onRun}
                  startIcon={op.result.state === 'running' ? <CircularProgress size={14} /> : <IconRefresh size={14} />}
                  sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                >
                  {op.result.state === 'running' ? 'Running…' : 'Run'}
                </Button>
                {op.result.state === 'idle' && (
                  <Chip label="Ready" size="small" color="default" variant="outlined" sx={{ ml: 1 }} />
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
