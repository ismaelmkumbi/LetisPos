/**
 * Letis POS -- Payment History Page.
 *
 * Shows all invoices/payments for the current tenant with status filters,
 * summary cards, and expandable invoice details.
 */
import { useEffect, useState, useMemo } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  Grid,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  IconChevronDown,
  IconChevronUp,
  IconDownload,
  IconFileInvoice,
  IconReceipt2,
  IconClock,
  IconCheck,
} from '@tabler/icons-react';

import { listInvoices, type Invoice } from 'src/api/smartpos/billing';
import { fetchTenants } from 'src/api/smartpos/auth';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import { brand } from 'src/theme/smartpos/brand';

type StatusFilter = 'ALL' | 'PAID' | 'PENDING' | 'FAILED';

const INVOICE_STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  PAID: { bg: brand.success.light, color: brand.success.dark },
  PENDING: { bg: brand.warning.light, color: brand.warning.dark },
  OVERDUE: { bg: brand.error.light, color: brand.error.dark },
  CANCELLED: { bg: brand.neutral[100], color: brand.neutral[700] },
  FAILED: { bg: brand.error.light, color: brand.error.dark },
};

function formatTzs(amount: number): string {
  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-TZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-TZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PaymentHistoryPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const tenants = await fetchTenants();
        if (cancelled) return;
        const t = tenants[0] ?? null;

        if (t) {
          const invs = await listInvoices(t.id);
          if (!cancelled) setInvoices(invs);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load payment history');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const filteredInvoices = useMemo(() => {
    if (statusFilter === 'ALL') return invoices;
    return invoices.filter((inv) => inv.status === statusFilter);
  }, [invoices, statusFilter]);

  const summary = useMemo(() => {
    const paid = invoices
      .filter((inv) => inv.status === 'PAID')
      .reduce((sum, inv) => sum + inv.amountTzs, 0);
    const pending = invoices
      .filter((inv) => inv.status === 'PENDING' || inv.status === 'OVERDUE')
      .reduce((sum, inv) => sum + inv.amountTzs, 0);
    const lastPaid = invoices
      .filter((inv) => inv.status === 'PAID' && inv.paidAt)
      .sort((a, b) => new Date(b.paidAt!).getTime() - new Date(a.paidAt!).getTime())[0];

    return { totalPaid: paid, pendingAmount: pending, lastPaymentDate: lastPaid?.paidAt ?? null };
  }, [invoices]);

  const handleToggleExpand = (id: string) => {
    setExpandedRow((prev) => (prev === id ? null : id));
  };

  const counts = useMemo(() => {
    const all = invoices.length;
    const paid = invoices.filter((inv) => inv.status === 'PAID').length;
    const pending = invoices.filter((inv) => inv.status === 'PENDING' || inv.status === 'OVERDUE').length;
    const failed = invoices.filter((inv) => inv.status === 'FAILED').length;
    return { all, paid, pending, failed };
  }, [invoices]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={36} sx={{ color: brand.primary[600] }} />
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title="Payment History"
        subtitle="View all your invoices and payment records"
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card
            sx={{
              borderRadius: '12px',
              border: `1px solid ${brand.neutral[200]}`,
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: brand.success.light,
                    color: brand.success.dark,
                  }}
                >
                  <IconCheck size={20} />
                </Box>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 600, color: brand.neutral[500], fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                  Total Paid
                </Typography>
              </Stack>
              <Typography variant="h5" sx={{ fontWeight: 800, color: brand.success.dark }}>
                {formatTzs(summary.totalPaid)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Card
            sx={{
              borderRadius: '12px',
              border: `1px solid ${brand.neutral[200]}`,
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: brand.warning.light,
                    color: brand.warning.dark,
                  }}
                >
                  <IconClock size={20} />
                </Box>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 600, color: brand.neutral[500], fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                  Pending Amount
                </Typography>
              </Stack>
              <Typography variant="h5" sx={{ fontWeight: 800, color: brand.warning.dark }}>
                {formatTzs(summary.pendingAmount)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Card
            sx={{
              borderRadius: '12px',
              border: `1px solid ${brand.neutral[200]}`,
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: brand.primary[50],
                    color: brand.primary[600],
                  }}
                >
                  <IconReceipt2 size={20} />
                </Box>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 600, color: brand.neutral[500], fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                  Last Payment
                </Typography>
              </Stack>
              <Typography variant="h5" sx={{ fontWeight: 800, color: brand.neutral[800] }}>
                {summary.lastPaymentDate ? formatDate(summary.lastPaymentDate) : '--'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Status Filter & Table */}
      <Card
        sx={{
          borderRadius: '12px',
          border: `1px solid ${brand.neutral[200]}`,
        }}
      >
        <CardContent sx={{ p: 2.5 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 2.5 }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <IconFileInvoice size={18} color={brand.neutral[600]} />
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, color: brand.neutral[500], fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                Invoices
              </Typography>
            </Stack>

            <ToggleButtonGroup
              value={statusFilter}
              exclusive
              onChange={(_e, val) => { if (val) setStatusFilter(val); }}
              size="small"
              sx={{
                '& .MuiToggleButton-root': {
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.72rem',
                  textTransform: 'none',
                  px: 1.5,
                  py: 0.5,
                  border: `1px solid ${brand.neutral[200]}`,
                  color: brand.neutral[600],
                  '&.Mui-selected': {
                    bgcolor: brand.primary[50],
                    color: brand.primary[700],
                    borderColor: brand.primary[300],
                  },
                },
              }}
            >
              <ToggleButton value="ALL">
                All ({counts.all})
              </ToggleButton>
              <ToggleButton value="PAID">
                Paid ({counts.paid})
              </ToggleButton>
              <ToggleButton value="PENDING">
                Pending ({counts.pending})
              </ToggleButton>
              <ToggleButton value="FAILED">
                Failed ({counts.failed})
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          {filteredInvoices.length === 0 ? (
            <Typography variant="body2" sx={{ color: brand.neutral[500], py: 2 }}>
              No invoices found.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, color: brand.neutral[500], fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', width: 40 }} />
                    <TableCell sx={{ fontWeight: 600, color: brand.neutral[500], fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Date
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: brand.neutral[500], fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Invoice #
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: brand.neutral[500], fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Amount
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: brand.neutral[500], fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Status
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: brand.neutral[500], fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Payment Method
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: brand.neutral[500], fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      PDF
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredInvoices.map((inv) => {
                    const statusStyle = INVOICE_STATUS_COLORS[inv.status] ?? INVOICE_STATUS_COLORS.PENDING;
                    const isExpanded = expandedRow === inv.id;

                    return (
                      <TableRow
                        key={inv.id}
                        hover
                        sx={{
                          cursor: 'pointer',
                          '&:last-child td': { borderBottom: 0 },
                          bgcolor: isExpanded ? brand.neutral[50] : 'transparent',
                        }}
                      >
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handleToggleExpand(inv.id)}
                            sx={{ color: brand.neutral[400] }}
                          >
                            {isExpanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                          </IconButton>
                        </TableCell>
                        <TableCell
                          onClick={() => handleToggleExpand(inv.id)}
                          sx={{ color: brand.neutral[600], fontSize: '0.8125rem' }}
                        >
                          {formatDate(inv.createdAt)}
                        </TableCell>
                        <TableCell
                          onClick={() => handleToggleExpand(inv.id)}
                          sx={{ fontWeight: 600, color: brand.neutral[800], fontSize: '0.8125rem' }}
                        >
                          {inv.invoiceNumber}
                        </TableCell>
                        <TableCell
                          onClick={() => handleToggleExpand(inv.id)}
                          sx={{ fontWeight: 600, color: brand.neutral[800], fontSize: '0.8125rem' }}
                        >
                          {formatTzs(inv.amountTzs)}
                        </TableCell>
                        <TableCell onClick={() => handleToggleExpand(inv.id)}>
                          <Chip
                            label={inv.status}
                            size="small"
                            sx={{
                              fontWeight: 600,
                              fontSize: '0.65rem',
                              borderRadius: '5px',
                              bgcolor: statusStyle.bg,
                              color: statusStyle.color,
                            }}
                          />
                        </TableCell>
                        <TableCell
                          onClick={() => handleToggleExpand(inv.id)}
                          sx={{ color: brand.neutral[600], fontSize: '0.8125rem' }}
                        >
                          {inv.paymentMethod ?? '--'}
                        </TableCell>
                        <TableCell>
                          {inv.documentId ? (
                            <IconButton
                              size="small"
                              href={`/api/v1/documents/${inv.documentId}/download`}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{
                                color: brand.primary[600],
                                '&:hover': { bgcolor: brand.primary[50] },
                              }}
                            >
                              <IconDownload size={16} />
                            </IconButton>
                          ) : (
                            <Typography variant="caption" sx={{ color: brand.neutral[400] }}>
                              --
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Expanded row details */}
          {filteredInvoices.map((inv) => {
            const isExpanded = expandedRow === inv.id;
            return (
              <Collapse key={`detail-${inv.id}`} in={isExpanded} unmountOnExit>
                <Box
                  sx={{
                    mx: 2,
                    mb: 2,
                    p: 2.5,
                    borderRadius: '10px',
                    border: `1px solid ${brand.neutral[100]}`,
                    bgcolor: brand.neutral[50],
                  }}
                >
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 600,
                          color: brand.neutral[500],
                          fontSize: '0.65rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          display: 'block',
                          mb: 1,
                        }}
                      >
                        Invoice Details
                      </Typography>
                      <Stack spacing={0.75}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
                            Invoice Number
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: brand.neutral[800] }}>
                            {inv.invoiceNumber}
                          </Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
                            Created
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: brand.neutral[800] }}>
                            {formatDateTime(inv.createdAt)}
                          </Typography>
                        </Stack>
                        <Divider sx={{ my: 0.5 }} />
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
                            Due Date
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: brand.neutral[800] }}>
                            {formatDate(inv.dueDate)}
                          </Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
                            Amount
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: brand.neutral[900] }}>
                            {formatTzs(inv.amountTzs)}
                          </Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
                            Status
                          </Typography>
                          <Chip
                            label={inv.status}
                            size="small"
                            sx={{
                              fontWeight: 600,
                              fontSize: '0.6rem',
                              borderRadius: '4px',
                              height: 20,
                              bgcolor: (INVOICE_STATUS_COLORS[inv.status] ?? INVOICE_STATUS_COLORS.PENDING).bg,
                              color: (INVOICE_STATUS_COLORS[inv.status] ?? INVOICE_STATUS_COLORS.PENDING).color,
                            }}
                          />
                        </Stack>
                      </Stack>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 600,
                          color: brand.neutral[500],
                          fontSize: '0.65rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          display: 'block',
                          mb: 1,
                        }}
                      >
                        Payment Info
                      </Typography>
                      <Stack spacing={0.75}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
                            Payment Method
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: brand.neutral[800] }}>
                            {inv.paymentMethod ?? 'N/A'}
                          </Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
                            Paid At
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: brand.neutral[800] }}>
                            {inv.paidAt ? formatDateTime(inv.paidAt) : '--'}
                          </Typography>
                        </Stack>
                        <Divider sx={{ my: 0.5 }} />
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
                            Tenant ID
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: brand.neutral[800], fontFamily: 'monospace', fontSize: '0.7rem' }}>
                            {inv.tenantId}
                          </Typography>
                        </Stack>
                        {inv.subscriptionId && (
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
                              Subscription ID
                            </Typography>
                            <Typography variant="caption" sx={{ fontWeight: 600, color: brand.neutral[800], fontFamily: 'monospace', fontSize: '0.7rem' }}>
                              {inv.subscriptionId}
                            </Typography>
                          </Stack>
                        )}
                      </Stack>
                    </Grid>
                  </Grid>
                </Box>
              </Collapse>
            );
          })}
        </CardContent>
      </Card>
    </Box>
  );
}
