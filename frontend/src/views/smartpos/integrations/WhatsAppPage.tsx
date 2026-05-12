/**
 * WhatsApp API — configure WhatsApp Business API for customer communication.
 * WhatsApp delivery is handled by the notification service.
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
import { IconBrandWhatsapp } from '@tabler/icons-react';

import PageHeader from 'src/components/smartpos/PageHeader';
import { brand } from 'src/theme/smartpos/brand';

/* ------------------------------------------------------------------ */

export default function WhatsAppPage() {
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
      // TODO: wire to real API when WhatsApp config endpoint is available
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
        title="WhatsApp API"
        subtitle="Configure WhatsApp Business API for customer communication"
      />

      <Alert severity="info" sx={{ mb: 3 }}>
        WhatsApp delivery is handled by the notification service. Once
        configured, you can send order confirmations, payment receipts, and
        delivery updates via WhatsApp.
      </Alert>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Stack spacing={2.5}>
        {/* Twilio WhatsApp Card */}
        <Card variant="outlined" sx={{ p: 2.5 }}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: '10px',
                bgcolor: brand.success.light,
                color: brand.success.dark,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${brand.neutral[200]}`,
                flexShrink: 0,
              }}
            >
              <IconBrandWhatsapp size={22} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                Twilio WhatsApp
              </Typography>
              <Typography variant="body2" color="text.secondary">
                WhatsApp Business API via Twilio for customer messaging.
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
              helperText="WhatsApp Business phone number in E.164 format"
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
