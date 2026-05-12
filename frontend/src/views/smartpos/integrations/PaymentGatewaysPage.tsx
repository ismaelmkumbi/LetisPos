/**
 * Payment Gateways — configure mobile money and card payment processors.
 */
import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
  Link as MuiLink,
} from '@mui/material';
import {
  IconDeviceMobile,
  IconBuildingBank,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';

import PageHeader from 'src/components/smartpos/PageHeader';
import { brand } from 'src/theme/smartpos/brand';

/* ------------------------------------------------------------------ */

interface GatewayDef {
  provider: string;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ size?: number }>;
  comingSoon: boolean;
  billingLink?: string;
  configFields?: { key: string; label: string; type?: string }[];
}

const GATEWAY_DEFS: GatewayDef[] = [
  {
    provider: 'mpesa',
    label: 'M-Pesa',
    subtitle: 'Vodacom Tanzania — Lipa Na M-Pesa',
    icon: IconDeviceMobile,
    comingSoon: false,
    configFields: [
      { key: 'consumerKey', label: 'Consumer Key' },
      { key: 'consumerSecret', label: 'Consumer Secret', type: 'password' },
      { key: 'passkey', label: 'Passkey', type: 'password' },
      { key: 'shortcode', label: 'Shortcode' },
    ],
  },
  {
    provider: 'tigopesa',
    label: 'Tigo Pesa',
    subtitle: 'Tigo Tanzania',
    icon: IconDeviceMobile,
    comingSoon: true,
  },
  {
    provider: 'airtel',
    label: 'Airtel Money',
    subtitle: 'Airtel Tanzania',
    icon: IconDeviceMobile,
    comingSoon: true,
  },
  {
    provider: 'stripe',
    label: 'Stripe',
    subtitle: 'Card payments & checkout',
    icon: IconBuildingBank,
    comingSoon: false,
    billingLink: '/smartpos/admin/billing',
  },
];

/* ------------------------------------------------------------------ */

export default function PaymentGatewaysPage() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [formFields, setFormFields] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  const updateField = (provider: string, key: string, value: string) => {
    setFormFields((s) => ({ ...s, [`${provider}.${key}`]: value }));
  };

  const handleSave = (provider: string) => {
    // TODO: wire to real API when MPesa Daraja integration is built
    setSaved((s) => ({ ...s, [provider]: true }));
    setTimeout(() => setSaved((s) => ({ ...s, [provider]: false })), 3000);
  };

  return (
    <Box>
      <PageHeader
        title="Payment Gateways"
        subtitle="Configure payment processing integrations"
      />

      <Alert severity="info" sx={{ mb: 3 }}>
        Payment gateways let customers pay via mobile money, cards, or bank
        transfer at checkout. Stripe is configured through Billing Settings.
      </Alert>

      <Stack spacing={2}>
        {GATEWAY_DEFS.map((gw) => {
          const isEnabled = enabled[gw.provider] ?? false;
          const wasSaved = saved[gw.provider];

          return (
            <Card key={gw.provider} variant="outlined" sx={{ p: 2.5 }}>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: gw.comingSoon ? 0 : 2 }}>
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: '10px',
                    bgcolor: brand.primary[50],
                    color: brand.primary[700],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `1px solid ${brand.neutral[200]}`,
                    flexShrink: 0,
                  }}
                >
                  <gw.icon size={22} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {gw.label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {gw.subtitle}
                  </Typography>
                </Box>
                {!gw.comingSoon && !gw.billingLink && (
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Chip
                      label={isEnabled ? 'Enabled' : 'Disabled'}
                      size="small"
                      sx={{
                        bgcolor: isEnabled ? brand.success.light : brand.neutral[100],
                        color: isEnabled ? brand.success.dark : brand.neutral[600],
                        fontWeight: 600,
                        fontSize: '0.7rem',
                      }}
                    />
                    <Switch
                      checked={isEnabled}
                      onChange={(_, v) => setEnabled((s) => ({ ...s, [gw.provider]: v }))}
                    />
                  </Stack>
                )}
                {gw.billingLink && (
                  <Chip
                    label="Billing Settings"
                    size="small"
                    component={Link}
                    to={gw.billingLink}
                    clickable
                    sx={{
                      bgcolor: brand.accent[50],
                      color: brand.accent[700],
                      fontWeight: 600,
                      fontSize: '0.7rem',
                      textDecoration: 'none',
                    }}
                  />
                )}
              </Stack>

              {gw.comingSoon && (
                <Alert severity="warning" sx={{ ml: 6.75, mt: 0.5 }}>
                  Coming soon — {gw.label} integration will be added in a future release.
                </Alert>
              )}

              {gw.provider === 'mpesa' && (
                <>
                  <Stack spacing={1.5} sx={{ ml: 6.75 }}>
                    {gw.configFields?.map((field) => (
                      <TextField
                        key={field.key}
                        label={field.label}
                        type={field.type ?? 'text'}
                        size="small"
                        fullWidth
                        value={formFields[`${gw.provider}.${field.key}`] ?? ''}
                        onChange={(e) => updateField(gw.provider, field.key, e.target.value)}
                        disabled={!isEnabled}
                      />
                    ))}
                    <TextField
                      select
                      label="Environment"
                      size="small"
                      fullWidth
                      value={formFields[`${gw.provider}.environment`] ?? 'sandbox'}
                      onChange={(e) => updateField(gw.provider, 'environment', e.target.value)}
                      disabled={!isEnabled}
                    >
                      <MenuItem value="sandbox">Sandbox</MenuItem>
                      <MenuItem value="live">Live</MenuItem>
                    </TextField>
                  </Stack>

                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ ml: 6.75, mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Coming soon — M-Pesa Daraja API integration
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handleSave(gw.provider)}
                      disabled={!isEnabled}
                    >
                      {wasSaved ? 'Saved' : 'Save'}
                    </Button>
                  </Stack>
                </>
              )}

              {gw.provider === 'stripe' && (
                <Typography variant="body2" color="text.secondary" sx={{ ml: 6.75, mt: 0.5 }}>
                  Stripe configuration is managed in{' '}
                  <MuiLink component={Link} to="/smartpos/admin/billing" underline="hover">
                    Billing Settings
                  </MuiLink>
                  . Add your API keys and configure pricing plans there.
                </Typography>
              )}
            </Card>
          );
        })}
      </Stack>
    </Box>
  );
}
