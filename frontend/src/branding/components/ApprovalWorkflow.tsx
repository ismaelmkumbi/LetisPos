import { useState, useCallback } from 'react';
import { Box, Button, Chip, Stack, Typography, CircularProgress } from '@mui/material';
import { IconSend, IconCheck, IconX, IconArchive } from '@tabler/icons-react';
import { useBrand } from 'src/context/smartpos/BrandContext';
import { api } from 'src/api/smartpos/client';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: '#92400E', bg: '#FEF3C7' },
  pending_review: { label: 'Pending Review', color: '#1E40AF', bg: '#DBEAFE' },
  published: { label: 'Published', color: '#065F46', bg: '#D1FAE5' },
  archived: { label: 'Archived', color: '#475569', bg: '#F1F5F9' },
};

export default function ApprovalWorkflow() {
  const { profile, refresh } = useBrand();
  const [loading, setLoading] = useState<string | null>(null);

  const status = profile?.status || 'published';
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.published;

  const action = useCallback(async (endpoint: string) => {
    setLoading(endpoint);
    try { await api.post(`/api/v1/brand/profile/${endpoint}`); await refresh(); }
    catch {} finally { setLoading(null); }
  }, [refresh]);

  return (
    <Box
      sx={{
        p: 2, borderRadius: '12px',
        border: '1px solid var(--bp-border-default, #E2E8F0)',
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
        <Typography sx={{ fontWeight: 800, fontSize: '0.82rem' }}>
          Approval Status
        </Typography>
        <Chip
          label={cfg.label}
          size="small"
          sx={{ fontWeight: 800, fontSize: '0.65rem', bgcolor: cfg.bg, color: cfg.color }}
        />
      </Stack>

      <Stack direction="row" spacing={1}>
        {status === 'draft' && (
          <Button size="small" variant="contained" startIcon={loading === 'submit' ? <CircularProgress size={14} /> : <IconSend size={14} />}
            onClick={() => action('submit')} disabled={loading !== null}
            sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.7rem', borderRadius: '8px',
              bgcolor: 'var(--bp-color-primary, #16A34A)' }}>
            Submit for Review
          </Button>
        )}
        {status === 'pending_review' && (
          <>
            <Button size="small" variant="contained" startIcon={loading === 'approve' ? <CircularProgress size={14} /> : <IconCheck size={14} />}
              onClick={() => action('approve')} disabled={loading !== null}
              sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.7rem', borderRadius: '8px',
                bgcolor: '#22C55E', '&:hover': { bgcolor: '#16A34A' } }}>
              Approve
            </Button>
            <Button size="small" variant="outlined" startIcon={loading === 'reject' ? <CircularProgress size={14} /> : <IconX size={14} />}
              onClick={() => action('reject')} disabled={loading !== null}
              sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.7rem', borderRadius: '8px', color: '#EF4444', borderColor: '#EF4444' }}>
              Reject
            </Button>
          </>
        )}
        {status === 'published' && (
          <Button size="small" variant="outlined" startIcon={loading === 'archive' ? <CircularProgress size={14} /> : <IconArchive size={14} />}
            onClick={() => action('archive')} disabled={loading !== null}
            sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.7rem', borderRadius: '8px' }}>
            Archive
          </Button>
        )}
      </Stack>
    </Box>
  );
}
