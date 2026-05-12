/**
 * Accounting Integrations — connect your POS to accounting software.
 * Currently supports QuickBooks Online with Xero planned.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { IconCalculator } from '@tabler/icons-react';

import {
  getIntegrationConfigs,
  updateProviderConfig,
  pushQbInvoice,
  type IntegrationConfig,
} from 'src/api/smartpos/integrations';
import PageHeader from 'src/components/smartpos/PageHeader';
import { brand } from 'src/theme/smartpos/brand';

/* ------------------------------------------------------------------ */

export default function AccountingPage() {
  const [configs, setConfigs] = useState<IntegrationConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testBusy, setTestBusy] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const qbConfig = configs.find((c) => c.provider === 'QUICKBOOKS');
  const qbEnabled = qbConfig?.enabled ?? false;
  const parsedConfig = (() => {
    try { return qbConfig ? JSON.parse(qbConfig.config) : {}; }
    catch { return {}; }
  })();

  const [companyId, setCompanyId] = useState(parsedConfig.companyId ?? '');
  const [accessToken, setAccessToken] = useState(parsedConfig.accessToken ?? '');
  const [localEnabled, setLocalEnabled] = useState(qbEnabled);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getIntegrationConfigs();
      setConfigs(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load configs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  useEffect(() => {
    setCompanyId(parsedConfig.companyId ?? '');
    setAccessToken(parsedConfig.accessToken ?? '');
    setLocalEnabled(qbEnabled);
  }, [qbConfig]); // eslint-disable-line react-hooks/exhaustive-deps

  const isChanged =
    localEnabled !== qbEnabled ||
    companyId !== (parsedConfig.companyId ?? '') ||
    accessToken !== (parsedConfig.accessToken ?? '');

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateProviderConfig('QUICKBOOKS', {
        enabled: localEnabled,
        config: { companyId, accessToken },
      });
      await fetchConfigs();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleTestPush = async () => {
    setTestBusy(true);
    setTestResult(null);
    try {
      // Quick test push with dummy data
      await pushQbInvoice('00000000-0000-0000-0000-000000000000' as never, {
        test: true,
        companyId,
      });
      setTestResult('success');
    } catch (e) {
      setTestResult(e instanceof Error ? e.message : 'Test push failed');
    } finally {
      setTestBusy(false);
    }
  };

  if (loading) {
    return (
      <Box>
        <PageHeader
          title="Accounting Integrations"
          subtitle="Connect your POS to accounting software"
        />
        <Typography color="text.secondary">Loading…</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title="Accounting Integrations"
        subtitle="Connect your POS to accounting software"
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Stack spacing={2.5}>
        {/* QuickBooks Card */}
        <Card variant="outlined" sx={{ p: 2.5 }}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: '10px',
                bgcolor: brand.info.light,
                color: brand.info.dark,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${brand.neutral[200]}`,
                flexShrink: 0,
              }}
            >
              <IconCalculator size={22} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                QuickBooks Online
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Push invoices, payments, and financial data to QuickBooks.
              </Typography>
            </Box>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Chip
                label={qbConfig ? (qbEnabled ? 'Configured' : 'Disabled') : 'Not Configured'}
                size="small"
                sx={{
                  bgcolor: qbEnabled ? brand.success.light : brand.neutral[100],
                  color: qbEnabled ? brand.success.dark : brand.neutral[600],
                  fontWeight: 600,
                  fontSize: '0.7rem',
                }}
              />
              <Switch
                checked={localEnabled}
                onChange={(_, v) => setLocalEnabled(v)}
              />
            </Stack>
          </Stack>

          <Stack spacing={1.5} sx={{ ml: 6.75 }}>
            <TextField
              label="Company ID"
              size="small"
              fullWidth
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              disabled={!localEnabled}
            />
            <TextField
              label="Access Token"
              type="password"
              size="small"
              fullWidth
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              disabled={!localEnabled}
            />
          </Stack>

          {testResult && (
            <Alert
              severity={testResult === 'success' ? 'success' : 'error'}
              sx={{ ml: 6.75, mt: 1.5 }}
              onClose={() => setTestResult(null)}
            >
              {testResult === 'success'
                ? 'Test invoice pushed successfully.'
                : testResult}
            </Alert>
          )}

          <Stack direction="row" justifyContent="space-between" sx={{ ml: 6.75, mt: 2 }}>
            <Button
              size="small"
              variant="outlined"
              onClick={handleTestPush}
              disabled={!localEnabled || testBusy}
            >
              {testBusy ? 'Pushing…' : 'Push Invoice (Test)'}
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={handleSave}
              disabled={!isChanged || saving}
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </Stack>
        </Card>

        {/* Xero Card */}
        <Card variant="outlined" sx={{ p: 2.5 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: '10px',
                bgcolor: brand.neutral[100],
                color: brand.neutral[500],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${brand.neutral[200]}`,
                flexShrink: 0,
              }}
            >
              <IconCalculator size={22} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                Xero
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Cloud-based accounting software for small businesses.
              </Typography>
            </Box>
            <Chip
              label="Coming Soon"
              size="small"
              sx={{
                bgcolor: brand.warning.light,
                color: brand.warning.dark,
                fontWeight: 600,
                fontSize: '0.7rem',
              }}
            />
          </Stack>
        </Card>
      </Stack>
    </Box>
  );
}
