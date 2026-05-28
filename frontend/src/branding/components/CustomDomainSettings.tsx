import { useState, useCallback } from 'react';
import {
  Box, Button, Stack, TextField, Typography, Chip, Alert, CircularProgress,
} from '@mui/material';
import { IconWorld, IconCheck, IconX, IconRefresh } from '@tabler/icons-react';
import { useBrand } from 'src/context/smartpos/BrandContext';
import { api } from 'src/api/smartpos/client';

export default function CustomDomainSettings() {
  const { profile, refresh } = useBrand();
  const [domain, setDomain] = useState(profile?.customDomain || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);

  const customDomain = profile?.customDomain;
  const isVerified = profile?.customDomainVerified;

  const handleRequest = useCallback(async () => {
    if (!domain || domain.includes(' ') || !domain.includes('.')) {
      setError('Enter a valid domain (e.g. pos.mybusiness.com)');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post('/api/v1/brand/domain/request', { domain });
      setVerificationToken(data.customDomainVerificationToken);
      await refresh();
    } catch {
      setError('Could not request domain. Try again.');
    } finally {
      setLoading(false);
    }
  }, [domain, refresh]);

  const handleVerify = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await api.post('/api/v1/brand/domain/verify');
      await refresh();
      setVerificationToken(null);
    } catch {
      setError('Domain verification failed. Ensure the TXT record is set and propagated.');
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const handleRemove = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await api.post('/api/v1/brand/domain/remove');
      await refresh();
      setDomain('');
      setVerificationToken(null);
    } catch {
      setError('Could not remove domain.');
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <IconWorld size={18} color="var(--bp-color-primary, #16A34A)" />
        <Typography sx={{ fontWeight: 800, fontSize: '0.88rem' }}>
          Custom Domain
        </Typography>
      </Stack>

      {customDomain ? (
        <Box
          sx={{
            p: 2,
            borderRadius: '12px',
            border: '1px solid var(--bp-border-default, #E2E8F0)',
            bgcolor: isVerified ? 'var(--bp-success-light, #DCFCE7)' : 'var(--bp-warning-light, #FEF3C7)',
          }}
        >
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
                {customDomain}
              </Typography>
              <Chip
                icon={isVerified ? <IconCheck size={14} /> : <IconX size={14} />}
                label={isVerified ? 'Verified' : 'Pending verification'}
                size="small"
                sx={{
                  fontWeight: 700, fontSize: '0.65rem',
                  bgcolor: isVerified ? 'var(--bp-success-main, #22C55E)' : 'var(--bp-warning-main, #F59E0B)',
                  color: isVerified ? '#fff' : '#92400E',
                }}
              />
            </Stack>

            {!isVerified && verificationToken && (
              <Alert severity="info" sx={{ fontSize: '0.7rem', borderRadius: '10px' }}>
                Add this TXT record to your DNS:{' '}
                <Typography component="span" sx={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.68rem' }}>
                  letispos-verify={verificationToken}
                </Typography>
              </Alert>
            )}

            <Stack direction="row" spacing={1}>
              {!isVerified && (
                <Button
                  size="small" variant="contained"
                  startIcon={loading ? <CircularProgress size={14} /> : <IconRefresh size={14} />}
                  onClick={handleVerify} disabled={loading}
                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px',
                    bgcolor: 'var(--bp-color-primary, #16A34A)',
                    '&:hover': { bgcolor: 'var(--bp-color-primary-dark, #15803D)' },
                  }}
                >
                  Verify Now
                </Button>
              )}
              <Button
                size="small" variant="outlined" color="error"
                onClick={handleRemove} disabled={loading}
                sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.72rem', borderRadius: '8px' }}
              >
                Remove Domain
              </Button>
            </Stack>
          </Stack>
        </Box>
      ) : (
        <Box sx={{ p: 2, borderRadius: '12px', border: '1px solid var(--bp-border-default, #E2E8F0)' }}>
          <Stack spacing={1.5}>
            <Typography sx={{ fontSize: '0.72rem', color: 'var(--bp-text-secondary, #64748B)' }}>
              Use your own domain (e.g. <strong>pos.mybusiness.com</strong>) for a fully white-labeled experience.
            </Typography>
            <TextField
              size="small"
              fullWidth
              placeholder="pos.mybusiness.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600,
                },
              }}
            />
            <Button
              variant="contained"
              size="small"
              startIcon={loading ? <CircularProgress size={14} /> : <IconWorld size={14} />}
              onClick={handleRequest}
              disabled={loading || !domain}
              sx={{
                alignSelf: 'flex-start', textTransform: 'none', fontWeight: 700, borderRadius: '8px',
                bgcolor: 'var(--bp-color-primary, #16A34A)',
                '&:hover': { bgcolor: 'var(--bp-color-primary-dark, #15803D)' },
              }}
            >
              Request Domain
            </Button>
          </Stack>
        </Box>
      )}

      {error && (
        <Typography sx={{ mt: 1, fontSize: '0.7rem', color: 'var(--bp-error, #EF4444)', fontWeight: 600 }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}
