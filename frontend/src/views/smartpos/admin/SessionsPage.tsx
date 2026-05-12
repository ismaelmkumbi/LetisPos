import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  IconDeviceMobile,
  IconTrash,
  IconRefresh,
} from '@tabler/icons-react';

import {
  listSessions,
  revokeSession,
  type SessionData,
} from 'src/api/smartpos/audit';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { brand } from 'src/theme/smartpos/brand';

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  ACTIVE: { bg: brand.success.light, color: brand.success.dark },
  EXPIRED: { bg: brand.warning.light, color: brand.warning.dark },
  REVOKED: { bg: brand.error.light, color: brand.error.dark },
};

function statusChip(status: string) {
  const c = STATUS_COLORS[status] ?? { bg: brand.neutral[100], color: brand.neutral[600] };
  return (
    <Chip
      label={status}
      size="small"
      sx={{
        height: 20,
        fontWeight: 700,
        fontSize: '0.625rem',
        letterSpacing: '0.04em',
        borderRadius: '5px',
        bgcolor: c.bg,
        color: c.color,
        '& .MuiChip-label': { px: 0.875 },
      }}
    />
  );
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function parseDevice(userAgent: string): string {
  if (!userAgent) return 'Unknown';
  if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  return userAgent.slice(0, 30);
}

export default function SessionsPage() {
  const [rows, setRows] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [refreshToken, setRefreshToken] = useState(0);

  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Revoke confirmation
  const [revokeTarget, setRevokeTarget] = useState<SessionData | null>(null);
  const [revoking, setRevoking] = useState(false);

  // Stats
  const [activeCount, setActiveCount] = useState(0);
  const [uniqueUsers, setUniqueUsers] = useState(0);

  const fetchSessions = useCallback(() => {
    listSessions({ page, size: 20 })
      .then((data) => {
        setRows(data.content);
        setTotalPages(data.totalPages);
        setTotalElements(data.totalElements);
        setError(null);

        // Compute stats
        const active = data.content.filter((s) => s.status === 'ACTIVE');
        setActiveCount(active.length);
        setUniqueUsers(new Set(active.map((s) => s.userId)).size);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load sessions');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [page]);

  useEffect(() => {
    setLoading(true);
    fetchSessions();
  }, [fetchSessions, refreshToken]);

  // Auto-refresh toggle
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        setRefreshToken((n) => n + 1);
      }, 30_000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefresh]);

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      await revokeSession(revokeTarget.tokenId);
      setRefreshToken((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Revoke failed');
    } finally {
      setRevoking(false);
      setRevokeTarget(null);
    }
  };

  const columns: Column<SessionData>[] = useMemo(
    () => [
      {
        key: 'user',
        label: 'User',
        sortable: true,
        exportValue: (s) => s.userName || s.userEmail || s.userId,
        render: (s) => (
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
            <Box
              sx={{
                width: 30,
                height: 30,
                borderRadius: '8px',
                bgcolor: s.status === 'ACTIVE' ? brand.success.light : brand.neutral[100],
                color: s.status === 'ACTIVE' ? brand.success.dark : brand.neutral[500],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 12,
                border: `1px solid ${brand.neutral[200]}`,
                flexShrink: 0,
              }}
            >
              {s.userName?.charAt(0)?.toUpperCase() || 'U'}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: brand.neutral[800], fontSize: '0.8125rem' }} noWrap>
                {s.userName || s.userEmail || 'Unknown'}
              </Typography>
              {s.userEmail && (
                <Typography variant="caption" sx={{ color: brand.neutral[400], fontSize: '0.6875rem' }} noWrap>
                  {s.userEmail}
                </Typography>
              )}
            </Box>
          </Stack>
        ),
      },
      {
        key: 'device',
        label: 'Device / OS',
        sortable: false,
        exportValue: (s) => s.deviceInfo,
        render: (s) => (
          <Typography variant="body2" sx={{ color: brand.neutral[600], fontSize: '0.75rem' }} noWrap>
            {parseDevice(s.deviceInfo)}
          </Typography>
        ),
      },
      {
        key: 'ipAddress',
        label: 'IP',
        width: 130,
        sortable: false,
        exportValue: (s) => s.ipAddress,
        render: (s) => (
          <Typography variant="body2" sx={{ color: brand.neutral[500], fontSize: '0.75rem', fontFamily: 'monospace' }} noWrap>
            {s.ipAddress || '—'}
          </Typography>
        ),
      },
      {
        key: 'location',
        label: 'Location',
        width: 120,
        sortable: false,
        exportValue: () => '',
        render: () => (
          <Typography variant="body2" sx={{ color: brand.neutral[400], fontSize: '0.75rem' }} noWrap>
            —
          </Typography>
        ),
      },
      {
        key: 'lastActivityAt',
        label: 'Last Active',
        sortable: true,
        exportValue: (s) => s.lastActivityAt,
        render: (s) => (
          <Typography variant="body2" sx={{ color: brand.neutral[600], fontSize: '0.8125rem' }} noWrap>
            {timeAgo(s.lastActivityAt)}
          </Typography>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        align: 'center',
        width: 100,
        sortable: true,
        exportValue: (s) => s.status,
        render: (s) => statusChip(s.status),
      },
      {
        key: 'actions',
        label: '',
        align: 'right',
        width: 60,
        enableHiding: false,
        exportValue: () => '',
        render: (s) =>
          s.status === 'ACTIVE' ? (
            <Tooltip title="Revoke session">
              <IconButton
                size="small"
                onClick={(e) => { e.stopPropagation(); setRevokeTarget(s); }}
                sx={{ color: brand.error.main }}
              >
                <IconTrash size={14} />
              </IconButton>
            </Tooltip>
          ) : null,
      },
    ],
    [],
  );

  return (
    <Box>
      <PageHeader
        title="Active Sessions"
        subtitle="Monitor and manage user sessions"
        metrics={[
          { label: 'Active', value: activeCount.toLocaleString() },
          { label: 'Unique Users', value: uniqueUsers.toLocaleString() },
        ]}
        liveIndicator={autoRefresh ? { text: 'Auto-refreshing every 30s' } : { text: 'Click refresh to update' }}
        actions={[
          {
            label: 'Refresh',
            icon: <IconRefresh size={18} />,
            onClick: () => setRefreshToken((n) => n + 1),
            variant: 'ghost',
          },
        ]}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Auto-refresh toggle */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
          }
          label={
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8125rem', color: brand.neutral[600] }}>
              Auto-refresh (30s)
            </Typography>
          }
        />
      </Stack>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyText="No active sessions found"
        emptyIcon={<IconDeviceMobile size={32} />}
        getRowKey={(s) => s.tokenId}
        tableKey="sessions"
        toolbarTitle={rows.length > 0 ? `${totalElements.toLocaleString()} sessions` : undefined}
        enableSorting
        enableColumnVisibility
        enableExport
        exportFileName={`sessions-${new Date().toISOString().slice(0, 10)}`}
        page={page}
        totalPages={totalPages}
        totalElements={totalElements}
        onPageChange={setPage}
      />

      {/* Revoke confirmation */}
      <Dialog
        open={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Revoke session?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            The session for <strong>{revokeTarget?.userName || revokeTarget?.userEmail || 'this user'}</strong> from{' '}
            <strong>{revokeTarget?.ipAddress || 'unknown IP'}</strong> will be terminated. The user will need to log in again.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRevokeTarget(null)} disabled={revoking}>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={handleRevoke} disabled={revoking}>
            {revoking ? 'Revoking...' : 'Revoke'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
