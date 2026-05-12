import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  IconHistory,
  IconDownload,
} from '@tabler/icons-react';

import {
  listAuditEvents,
  type AuditEvent,
} from 'src/api/smartpos/audit';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { brand } from 'src/theme/smartpos/brand';

const ACTION_COLORS: Record<string, { bg: string; color: string }> = {
  CREATE: { bg: brand.success.light, color: brand.success.dark },
  UPDATE: { bg: brand.info.light, color: brand.info.dark },
  DELETE: { bg: brand.error.light, color: brand.error.dark },
  LOGIN: { bg: brand.primary[50], color: brand.primary[700] },
  LOGOUT: { bg: brand.neutral[100], color: brand.neutral[600] },
  SUSPEND: { bg: brand.warning.light, color: brand.warning.dark },
  REACTIVATE: { bg: brand.success.light, color: brand.success.dark },
  CLOSE: { bg: brand.error.light, color: brand.error.dark },
};

function actionChip(action: string) {
  const c = ACTION_COLORS[action] ?? { bg: brand.neutral[100], color: brand.neutral[600] };
  return (
    <Chip
      label={action}
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

function formatTs(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const KNOWN_SERVICES = ['auth-service', 'user-service', 'product-service', 'inventory-service', 'sales-service', 'billing-service'];
const KNOWN_ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'SUSPEND', 'REACTIVATE', 'CLOSE'];

export default function AuditLogsPage() {
  const [rows, setRows] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [serviceFilter, setServiceFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listAuditEvents({
      page,
      size: 20,
      ...(serviceFilter ? { service: serviceFilter } : {}),
      ...(actionFilter ? { action: actionFilter } : {}),
      ...(dateFrom ? { dateFrom: `${dateFrom}T00:00:00` } : {}),
      ...(dateTo ? { dateTo: `${dateTo}T23:59:59` } : {}),
    })
      .then((data) => {
        if (!cancelled) {
          setRows(data.content);
          setTotalPages(data.totalPages);
          setTotalElements(data.totalElements);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load audit logs');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, serviceFilter, actionFilter, dateFrom, dateTo]);

  const columns: Column<AuditEvent>[] = useMemo(
    () => [
      {
        key: 'timestamp',
        label: 'Timestamp',
        sortable: true,
        exportValue: (e) => e.timestamp,
        render: (e) => (
          <Typography variant="body2" sx={{ color: brand.neutral[600], fontSize: '0.8125rem', fontFamily: 'monospace' }} noWrap>
            {formatTs(e.timestamp)}
          </Typography>
        ),
      },
      {
        key: 'actor',
        label: 'Actor',
        sortable: true,
        exportValue: (e) => e.actorName ?? e.actorId ?? '',
        render: (e) => (
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: brand.neutral[800], fontSize: '0.8125rem' }} noWrap>
              {e.actorName || e.actorId || '—'}
            </Typography>
            {e.actorRole && (
              <Chip
                label={e.actorRole}
                size="small"
                sx={{
                  height: 18,
                  fontWeight: 600,
                  fontSize: '0.6rem',
                  borderRadius: '4px',
                  bgcolor: brand.neutral[100],
                  color: brand.neutral[600],
                }}
              />
            )}
          </Stack>
        ),
      },
      {
        key: 'action',
        label: 'Action',
        align: 'center',
        width: 110,
        sortable: true,
        exportValue: (e) => e.action,
        render: (e) => actionChip(e.action),
      },
      {
        key: 'target',
        label: 'Target',
        sortable: true,
        exportValue: (e) => `${e.targetType}: ${e.targetLabel ?? e.targetId}`,
        render: (e) => (
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: brand.neutral[700], fontSize: '0.8125rem' }} noWrap>
              {e.targetLabel || e.targetId}
            </Typography>
            <Typography variant="caption" sx={{ color: brand.neutral[400], fontSize: '0.6875rem', flexShrink: 0 }}>
              {e.targetType}
            </Typography>
          </Stack>
        ),
      },
      {
        key: 'service',
        label: 'Service',
        width: 160,
        sortable: true,
        exportValue: (e) => e.service,
        render: (e) => (
          <Typography variant="body2" sx={{ color: brand.neutral[500], fontSize: '0.75rem', fontFamily: 'monospace' }} noWrap>
            {e.service}
          </Typography>
        ),
      },
    ],
    [],
  );

  const clearFilters = useCallback(() => {
    setServiceFilter('');
    setActionFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(0);
  }, []);

  const hasFilters = serviceFilter || actionFilter || dateFrom || dateTo;

  return (
    <Box>
      <PageHeader
        title="Audit Logs"
        subtitle="Track every action across the platform"
        actions={[
          {
            label: 'Export',
            icon: <IconDownload size={18} />,
            onClick: () => { /* placeholder */ },
          },
        ]}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}
      >
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Service</InputLabel>
          <Select
            value={serviceFilter}
            label="Service"
            onChange={(e) => { setServiceFilter(e.target.value); setPage(0); }}
          >
            <MenuItem value="">All services</MenuItem>
            {KNOWN_SERVICES.map((s) => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Action</InputLabel>
          <Select
            value={actionFilter}
            label="Action"
            onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
          >
            <MenuItem value="">All actions</MenuItem>
            {KNOWN_ACTIONS.map((a) => (
              <MenuItem key={a} value={a}>{a}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          size="small"
          type="date"
          label="From"
          InputLabelProps={{ shrink: true }}
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
          sx={{ minWidth: 150 }}
        />
        <TextField
          size="small"
          type="date"
          label="To"
          InputLabelProps={{ shrink: true }}
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
          sx={{ minWidth: 150 }}
        />
        {hasFilters && (
          <Button size="small" onClick={clearFilters} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Clear filters
          </Button>
        )}
      </Stack>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyText="No audit events found"
        emptyIcon={<IconHistory size={32} />}
        getRowKey={(e) => e.id}
        tableKey="audit-logs"
        toolbarTitle={rows.length > 0 ? `${totalElements.toLocaleString()} audit events` : undefined}
        enableSorting
        enableColumnVisibility
        enableExport
        exportFileName={`audit-logs-${new Date().toISOString().slice(0, 10)}`}
        page={page}
        totalPages={totalPages}
        totalElements={totalElements}
        onPageChange={setPage}
        expandable
        renderExpanded={(e) => (
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: brand.neutral[700] }}>
              Event Details
            </Typography>
            <Stack spacing={1}>
              <DetailRow label="ID" value={e.id} />
              <DetailRow label="IP Address" value={e.ipAddress || '—'} />
              <DetailRow label="User Agent" value={e.userAgent || '—'} />
              <DetailRow label="Tenant ID" value={e.tenantId} />
              {e.diff && Object.keys(e.diff).length > 0 && (
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: brand.neutral[500], textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Changes
                  </Typography>
                  <Box
                    component="pre"
                    sx={{
                      mt: 0.5,
                      p: 1.5,
                      borderRadius: '8px',
                      bgcolor: brand.neutral[100],
                      fontSize: '0.75rem',
                      fontFamily: 'monospace',
                      overflow: 'auto',
                      maxHeight: 300,
                    }}
                  >
                    {JSON.stringify(e.diff, null, 2)}
                  </Box>
                </Box>
              )}
            </Stack>
          </Box>
        )}
      />
    </Box>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" spacing={1}>
      <Typography variant="caption" sx={{ fontWeight: 600, color: brand.neutral[500], minWidth: 90, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ color: brand.neutral[800], fontSize: '0.8125rem', fontFamily: 'monospace', wordBreak: 'break-all' }}>
        {value}
      </Typography>
    </Stack>
  );
}
