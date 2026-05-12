/**
 * TRA EFD — Tanzania Revenue Authority Electronic Fiscal Device integration.
 * Currently implements ZATCA (Saudi Arabia) Phase-1 QR codes with TRA EFD
 * Phase 1 planned for Tanzanian compliance.
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import {
  IconFileInvoice,
  IconArrowRight,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

import { getIntegrationConfigs, type IntegrationConfig } from 'src/api/smartpos/integrations';
import PageHeader from 'src/components/smartpos/PageHeader';
import { brand } from 'src/theme/smartpos/brand';

/* ------------------------------------------------------------------ */

export default function TraEfdPage() {
  const navigate = useNavigate();
  const [configs, setConfigs] = useState<IntegrationConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getIntegrationConfigs()
      .then((data) => { if (!cancelled) { setConfigs(data); setError(null); } })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const zatcaConfig = configs.find((c) => c.provider === 'ZATCA');
  const zatcaEnabled = zatcaConfig?.enabled ?? false;

  return (
    <Box>
      <PageHeader
        title="TRA EFD"
        subtitle="Tanzania Revenue Authority — Electronic Fiscal Device integration"
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Alert severity="info" sx={{ mb: 3 }}>
        EFD integration ensures your POS generates compliant tax invoices with
        QR codes as required by tax authorities. ZATCA (Saudi Arabia) Phase-1
        is implemented as a reference; TRA EFD Phase-1 will follow for Tanzanian
        compliance.
      </Alert>

      <Stack spacing={2.5}>
        {/* ZATCA Card */}
        <Card variant="outlined" sx={{ p: 2.5 }}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1.5 }}>
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: '10px',
                bgcolor: brand.accent[50],
                color: brand.accent[700],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${brand.neutral[200]}`,
                flexShrink: 0,
              }}
            >
              <IconFileInvoice size={22} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                ZATCA QR Code Generator (Phase 1)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Saudi Arabia ZATCA B2C simplified e-invoicing — generates
                base64 TLV QR payloads for thermal receipts.
              </Typography>
            </Box>
            <Chip
              label={zatcaEnabled ? 'Active' : 'Not Configured'}
              size="small"
              sx={{
                bgcolor: zatcaEnabled ? brand.success.light : brand.neutral[100],
                color: zatcaEnabled ? brand.success.dark : brand.neutral[600],
                fontWeight: 600,
                fontSize: '0.7rem',
              }}
            />
          </Stack>
          <Stack direction="row" justifyContent="flex-end">
            <Button
              size="small"
              endIcon={<IconArrowRight size={16} />}
              onClick={() => navigate('/smartpos/integrations', { state: { tab: 'zatca' } })}
            >
              Open QR Generator
            </Button>
          </Stack>
        </Card>

        {/* TRA EFD Card */}
        <Card variant="outlined" sx={{ p: 2.5 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: '10px',
                bgcolor: brand.warning.light,
                color: brand.warning.dark,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${brand.neutral[200]}`,
                flexShrink: 0,
              }}
            >
              <IconFileInvoice size={22} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                TRA EFD Integration
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tanzania Revenue Authority fiscal device integration for
                compliant invoice generation with QR codes.
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
          <Alert severity="warning" sx={{ mt: 1.5 }}>
            Coming soon — TRA EFD Phase 1 (QR code generation) will be
            implemented for Tanzanian compliance. The ZATCA implementation above
            serves as the architectural reference.
          </Alert>
        </Card>
      </Stack>
    </Box>
  );
}
