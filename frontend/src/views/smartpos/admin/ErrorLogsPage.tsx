import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Drawer,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import {
  IconBug,
  IconX,
} from '@tabler/icons-react';

import {
  listErrorLogs,
  type ErrorLogEntry,
} from 'src/api/smartpos/audit';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { brand } from 'src/theme/smartpos/brand';

const LEVEL_COLORS: Record<string, { bg: string; color: string }> = {
  ERROR: { bg: brand.error.light, color: brand.error.dark },
  WARN: { bg: brand.warning.light, color: brand.warning.dark },
};

function levelChip(level: string) {
  const c = LEVEL_COLORS[level] ?? { bg: brand.neutral[100], color: brand.neutral[600] };
  return (
    <Chip
      label={level}
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

const KNOWN_SERVICES = ['auth-service', 'user-service', 'product-service', 'inventory-service', 'sales-service', 'billing-service', 'gateway'];

export default function ErrorLogsPage() {
  const [rows, setRows] = useState<ErrorLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [serviceFilter, setServiceFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Drawer state for error detail
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<ErrorLogEntry | null>(null);

  // Stats: error count by service (last 24h)
  const [stats, setStats] = useState<{ service: string; count: number }[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listErrorLogs({
      page,
      size: 20,
      ...(serviceFilter ? { service: serviceFilter } : {}),
      ...(levelFilter ? { level: levelFilter } : {}),
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
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load error logs');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, serviceFilter, levelFilter, dateFrom, dateTo]);

  // Load stats for last 24h on mount
  useEffect(() => {
    let cancelled = false;
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    listErrorLogs({ page: 0, size: 1000, dateFrom: dayAgo.toISOString() })
      .then((data) => {
        if (!cancelled) {
          const counts: Record<string, number> = {};
          for (const e of data.content) {
            counts[e.service] = (counts[e.service] || 0) + 1;
          }
          setStats(
            Object.entries(counts)
              .map(([service, count]) => ({ service, count }))
              .sort((a, b) => b.count - a.count),
          );
        }
      })
      .catch(() => { /* stats are best-effort */ });
    return () => {
      cancelled = true;
    };
  }, []);

  const openDetail = useCallback((entry: ErrorLogEntry) => {
    setSelectedEntry(entry);
    setDrawerOpen(true);
  }, []);

  const columns: Column<ErrorLogEntry>[] = useMemo(
    () => [
      {
        key: 'occurredAt',
        label: 'Timestamp',
        sortable: true,
        exportValue: (e) => e.occurredAt,
        render: (e) => (
          <Typography variant="body2" sx={{ color: brand.neutral[600], fontSize: '0.8125rem', fontFamily: 'monospace' }} noWrap>
            {formatTs(e.occurredAt)}
          </Typography>
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
      {
        key: 'level',
        label: 'Level',
        align: 'center',
        width: 90,
        sortable: true,
        exportValue: (e) => e.level,
        render: (e) => levelChip(e.level),
      },
      {
        key: 'message',
        label: 'Message',
        sortable: false,
        exportValue: (e) => e.message,
        render: (e) => (
          <Typography
            variant="body2"
            sx={{ color: brand.neutral[800], fontSize: '0.8125rem' }}
            noWrap
            title={e.message}
          >
            {e.message}
          </Typography>
        ),
      },
    ],
    [],
  );

  const clearFilters = useCallback(() => {
    setServiceFilter('');
    setLevelFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(0);
  }, []);

  const hasFilters = serviceFilter || levelFilter || dateFrom || dateTo;

  return (
    <Box>
      <PageHeader
        title="Error Logs"
        subtitle="Platform errors across all services"
        metrics={
          stats.length > 0
            ? stats.slice(0, 3).map((s) => ({
                label: s.service,
                value: `${s.count} errors`,
              }))
            : undefined
        }
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
        <FormControl size="small" sx={{ minWidth: 110 }}>
          <InputLabel>Level</InputLabel>
          <Select
            value={levelFilter}
            label="Level"
            onChange={(e) => { setLevelFilter(e.target.value); setPage(0); }}
          >
            <MenuItem value="">All levels</MenuItem>
            <MenuItem value="ERROR">ERROR</MenuItem>
            <MenuItem value="WARN">WARN</MenuItem>
          </Select>
        </FormControl>
        <Box component="input" type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
          style={{
            padding: '8px 12px',
            border: `1px solid ${brand.neutral[200]}`,
            borderRadius: '8px',
            fontSize: '0.8125rem',
            fontFamily: 'inherit',
            color: brand.neutral[700],
          }}
        />
        <Box component="input" type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
          style={{
            padding: '8px 12px',
            border: `1px solid ${brand.neutral[200]}`,
            borderRadius: '8px',
            fontSize: '0.8125rem',
            fontFamily: 'inherit',
            color: brand.neutral[700],
          }}
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
        emptyText="No error logs found"
        emptyIcon={<IconBug size={32} />}
        getRowKey={(e) => e.id}
        onRowClick={openDetail}
        tableKey="error-logs"
        toolbarTitle={rows.length > 0 ? `${totalElements.toLocaleString()} error logs` : undefined}
        enableSorting
        enableColumnVisibility
        enableExport
        exportFileName={`error-logs-${new Date().toISOString().slice(0, 10)}`}
        page={page}
        totalPages={totalPages}
        totalElements={totalElements}
        onPageChange={setPage}
      />

      {/* Detail drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 520 },
            p: 3,
            borderTopLeftRadius: '16px',
            borderBottomLeftRadius: '16px',
          },
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: brand.neutral[800] }}>
            Error Detail
          </Typography>
          <IconButton onClick={() => setDrawerOpen(false)} size="small">
            <IconX size={18} />
          </IconButton>
        </Stack>

        {selectedEntry && (
          <Stack spacing={2}>
            <DetailRow label="ID" value={selectedEntry.id} />
            <DetailRow label="Service" value={selectedEntry.service} />
            <DetailRow label="Level" value={selectedEntry.level} />
            <DetailRow label="Occurred At" value={formatTs(selectedEntry.occurredAt)} />
            <DetailRow label="Message" value={selectedEntry.message} />
            {selectedEntry.tenantId && <DetailRow label="Tenant ID" value={selectedEntry.tenantId} />}

            {selectedEntry.stackTrace && (
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: brand.neutral[500], textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Stack Trace
                </Typography>
                <Box
                  component="pre"
                  sx={{
                    mt: 0.5,
                    p: 1.5,
                    borderRadius: '8px',
                    bgcolor: brand.neutral[900],
                    color: brand.error.light,
                    fontSize: '0.6875rem',
                    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                    overflow: 'auto',
                    maxHeight: 400,
                    lineHeight: 1.5,
                  }}
                >
                  {selectedEntry.stackTrace}
                </Box>
              </Box>
            )}

            {selectedEntry.context && Object.keys(selectedEntry.context).length > 0 && (
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: brand.neutral[500], textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Context
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
                  {JSON.stringify(selectedEntry.context, null, 2)}
                </Box>
              </Box>
            )}
          </Stack>
        )}
      </Drawer>
    </Box>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="caption" sx={{ fontWeight: 600, color: brand.neutral[500], textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ color: brand.neutral[800], fontSize: '0.8125rem', wordBreak: 'break-all' }}>
        {value}
      </Typography>
    </Stack>
  );
}
