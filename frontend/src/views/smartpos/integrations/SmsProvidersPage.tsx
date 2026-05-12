/**
 * SMS Providers — configure SMS gateway for transactional alerts and campaigns.
 * SMS delivery is handled by the notification service.
 */
import { useState } from 'react';
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
import { IconMessage } from '@tabler/icons-react';

import PageHeader from 'src/components/smartpos/PageHeader';
import { brand } from 'src/theme/smartpos/brand';

/* ------------------------------------------------------------------ */

export default function SmsProvidersPage() {
  const [localEnabled, setLocalEnabled] = useState(false);
  const [accountSid, setAccountSid] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [fromNumber, setFromNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      // TODO: wire to real API when SMS config endpoint is available
      // Uses getIntegrationConfigs() / updateProviderConfig('twilio', ...)
      await new Promise((r) => setTimeout(r, 500));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title="SMS Providers"
        subtitle="Configure SMS gateway for notifications and campaigns"
      />

      <Alert severity="info" sx={{ mb: 3 }}>
        SMS delivery is handled by the notification service. Once configured,
        SMS will be available for transactional alerts, order confirmations, and
        marketing campaigns.
      </Alert>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Stack spacing={2.5}>
        {/* Twilio Card */}
        <Card variant="outlined" sx={{ p: 2.5 }}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: '10px',
                bgcolor: brand.error.light,
                color: brand.error.dark,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${brand.neutral[200]}`,
                flexShrink: 0,
              }}
            >
              <IconMessage size={22} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                Twilio
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Programmable SMS for transactional alerts, OTPs, and marketing.
              </Typography>
            </Box>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Chip
                label={localEnabled ? 'Enabled' : 'Disabled'}
                size="small"
                sx={{
                  bgcolor: localEnabled ? brand.success.light : brand.neutral[100],
                  color: localEnabled ? brand.success.dark : brand.neutral[600],
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
              label="Account SID"
              size="small"
              fullWidth
              value={accountSid}
              onChange={(e) => setAccountSid(e.target.value)}
              disabled={!localEnabled}
            />
            <TextField
              label="Auth Token"
              type="password"
              size="small"
              fullWidth
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              disabled={!localEnabled}
            />
            <TextField
              label="From Number"
              size="small"
              fullWidth
              value={fromNumber}
              onChange={(e) => setFromNumber(e.target.value)}
              disabled={!localEnabled}
              helperText="Twilio phone number or alphanumeric sender ID"
            />
          </Stack>

          <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
            <Button
              variant="contained"
              size="small"
              onClick={handleSave}
              disabled={saving}
            >
              {saved ? 'Saved' : saving ? 'Saving…' : 'Save'}
            </Button>
          </Stack>
        </Card>
      </Stack>
    </Box>
  );
}
