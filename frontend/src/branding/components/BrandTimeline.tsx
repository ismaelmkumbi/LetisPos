import { useState, useEffect, useCallback } from 'react';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { IconHistory, IconGitCommit } from '@tabler/icons-react';
import { api } from 'src/api/smartpos/client';

interface BrandVersion {
  id: string;
  versionNumber: number;
  changeSummary: string;
  changedBy: string | null;
  createdAt: string;
}

export default function BrandTimeline() {
  const [versions, setVersions] = useState<BrandVersion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/v1/brand/profile/versions');
      setVersions(data);
    } catch { setVersions([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  if (loading) {
    return (
      <Stack alignItems="center" sx={{ py: 2 }}>
        <CircularProgress size={20} sx={{ color: 'var(--bp-color-primary, #16A34A)' }} />
      </Stack>
    );
  }

  if (versions.length === 0) return null;

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
        <IconHistory size={18} color="var(--bp-color-primary, #16A34A)" />
        <Typography sx={{ fontWeight: 800, fontSize: '0.82rem' }}>Change History</Typography>
        <Typography sx={{ fontSize: '0.65rem', color: 'var(--bp-text-secondary, #64748B)', fontWeight: 600 }}>
          ({versions.length} versions)
        </Typography>
      </Stack>

      <Stack spacing={0.75}>
        {versions.slice(0, 8).map((v) => (
          <Stack key={v.id} direction="row" spacing={1.5} alignItems="flex-start"
            sx={{
              p: 1, borderRadius: '8px',
              border: '1px solid var(--bp-border-default, #E2E8F0)',
              bgcolor: 'var(--bp-surface-card, #FFF)',
            }}
          >
            <IconGitCommit size={14} style={{ marginTop: 2, color: 'var(--bp-text-secondary, #64748B)' }} />
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 700 }}>
                v{v.versionNumber}: {v.changeSummary}
              </Typography>
              <Typography sx={{ fontSize: '0.58rem', color: 'var(--bp-text-secondary, #64748B)' }}>
                {v.createdAt ? new Date(v.createdAt).toLocaleDateString() : ''}
              </Typography>
            </Box>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
