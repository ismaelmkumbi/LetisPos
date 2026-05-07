import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { IconPlus, IconCurrencyDollar, IconCheck, IconClock } from '@tabler/icons-react';

import {
  listPayments,
  recordPayment,
  listAccounts,
  type Payment,
  type PaymentStatus,
  type PaymentMethod,
  type ReferenceType,
  type RecordPaymentBody,
  type Account,
} from 'src/api/smartpos/payments';
import PageHeader from 'src/components/smartpos/PageHeader';
import FilterBar, { type ActiveFilter } from 'src/components/smartpos/FilterBar';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { useAuth } from 'src/context/smartpos/AuthContext';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;

const STATUS_TONE: Record<PaymentStatus, { bg: string; fg: string }> = {
  PENDING: { bg: brand.warning.light, fg: brand.warning.dark },
  COMPLETED: { bg: brand.success.light, fg: brand.success.dark },
  FAILED: { bg: brand.error.light, fg: brand.error.dark },
  REFUNDED: { bg: brand.neutral[100], fg: brand.neutral[700] },
};

const METHOD_TONE: Record<PaymentMethod, string> = {
  CASH: brand.success.main,
  CARD: brand.primary[500],
  CHECK: brand.info.main,
  TRANSFER: brand.accent[500],
  MPESA: brand.success.dark,
  STRIPE: brand.primary[700],
};

export default function PaymentsListPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Payment[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [search, setSearch] = useState('');
  const [referenceType, setReferenceType] = useState<ReferenceType | ''>('');
  const [method, setMethod] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Lookups
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Record payment dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [payForm, setPayForm] = useState<Partial<RecordPaymentBody>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const refresh = () => setRefreshToken((n) => n + 1);

  useEffect(() => {
    listAccounts()
      .then(setAccounts)
      .catch(() => {});
  }, [user?.tenantId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listPayments({
      search: search || undefined,
      referenceType: (referenceType || undefined) as ReferenceType | undefined,
      method: method || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      size: 20,
    })
      .then((p) => {
        if (!cancelled) {
          setRows(p.content);
          setTotalPages(p.totalPages || 1);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [search, referenceType, method, dateFrom, dateTo, page, refreshToken, user?.tenantId]);

  // Stats
  const stats = useMemo(() => {
    const total = rows.reduce((s, p) => s + p.amount, 0);
    const completed = rows
      .filter((p) => p.status === 'COMPLETED')
      .reduce((s, p) => s + p.amount, 0);
    const pending = rows.filter((p) => p.status === 'PENDING').reduce((s, p) => s + p.amount, 0);
    return { total, completed, pending, count: rows.length };
  }, [rows]);

  const clearAll = () => {
    setSearch('');
    setReferenceType('');
    setMethod('');
    setDateFrom('');
    setDateTo('');
    setPage(0);
  };

  const activeFilters: ActiveFilter[] = useMemo(() => {
    const out: ActiveFilter[] = [];
    if (search.trim())
      out.push({ key: 'search', label: `Search: ${search.trim()}`, clear: () => { setSearch(''); setPage(0); } });
    if (referenceType)
      out.push({ key: 'type', label: `Type: ${referenceType.replace(/_/g, ' ')}`, clear: () => { setReferenceType(''); setPage(0); } });
    if (method)
      out.push({ key: 'method', label: `Method: ${method}`, clear: () => { setMethod(''); setPage(0); } });
    if (dateFrom)
      out.push({
        key: 'from',
        label: `From: ${dateFrom}`,
        clear: () => {
          setDateFrom('');
          setPage(0);
        },
      });
    if (dateTo)
      out.push({
        key: 'to',
        label: `To: ${dateTo}`,
        clear: () => {
          setDateTo('');
          setPage(0);
        },
      });
    return out;
  }, [search, referenceType, method, dateFrom, dateTo]);

  // Dialog
  const openRecord = () => {
    setPayForm({
      date: new Date().toISOString().slice(0, 10),
      accountId: accounts[0]?.id ?? '',
      referenceType: 'PURCHASE',
      method: 'CASH',
      amount: 0,
      notes: '',
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const handleRecord = async () => {
    if (!payForm.accountId) {
      setFormError('Account is required.');
      return;
    }
    if (!payForm.amount || payForm.amount <= 0) {
      setFormError('Amount must be > 0.');
      return;
    }
    if (!payForm.referenceType) {
      setFormError('Type is required.');
      return;
    }
    if (!payForm.method) {
      setFormError('Method is required.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await recordPayment(payForm as RecordPaymentBody);
      setDialogOpen(false);
      refresh();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const pf = <K extends keyof RecordPaymentBody>(k: K, v: RecordPaymentBody[K]) =>
    setPayForm((f) => ({ ...f, [k]: v }));

  const columns: Column<Payment>[] = [
    {
      key: 'ref',
      label: 'Ref',
      render: (p) => (
        <Stack>
          <Typography variant="body2" sx={{ fontWeight: 700, color: brand.primary[700] }}>
            {p.ref}
          </Typography>
          <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
            {new Date(p.date).toLocaleDateString()}
          </Typography>
        </Stack>
      ),
    },
    {
      key: 'referenceType',
      label: 'For',
      align: 'center',
      render: (p) => (
        <Chip
          label={p.referenceType.replace(/_/g, ' ')}
          size="small"
          sx={{
            bgcolor: brand.neutral[100],
            color: brand.neutral[700],
            fontWeight: 600,
            borderRadius: '6px',
          }}
        />
      ),
    },
    {
      key: 'method',
      label: 'Method',
      align: 'center',
      render: (p) => (
        <Chip
          label={p.method}
          size="small"
          sx={{
            bgcolor: `${METHOD_TONE[p.method]}15`,
            color: METHOD_TONE[p.method],
            fontWeight: 700,
            borderRadius: '6px',
          }}
        />
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right',
      render: (p) => (
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {fmt(p.amount, p.currency)}
        </Typography>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      align: 'center',
      render: (p) => {
        const t = STATUS_TONE[p.status];
        return (
          <Chip
            label={p.status}
            size="small"
            sx={{ bgcolor: t.bg, color: t.fg, fontWeight: 600, borderRadius: '6px' }}
          />
        );
      },
    },
  ];

  const StatCard = ({
    icon,
    label,
    value,
    color,
  }: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    color: string;
  }) => (
    <Card
      elevation={0}
      sx={{
        border: `1px solid ${brand.neutral[200]}`,
        borderRadius: 3,
        px: 2.5,
        py: 1.5,
        flex: 1,
        minWidth: 150,
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            bgcolor: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, color, lineHeight: 1.2 }}>
            {value}
          </Typography>
          <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 600 }}>
            {label}
          </Typography>
        </Box>
      </Stack>
    </Card>
  );

  return (
    <Box sx={{ maxWidth: 1680, mx: 'auto', pb: 3 }}>
      <PageHeader
        title="Payments"
        subtitle="All payment transactions across accounts"
        action={{ label: 'Record payment', icon: <IconPlus size={18} />, onClick: openRecord }}
      />

      <Stack direction="row" spacing={2} sx={{ mb: 2.5, flexWrap: 'wrap' }}>
        <StatCard
          icon={<IconCurrencyDollar size={18} color={brand.primary[600]} />}
          label="Total"
          value={fmt(stats.total)}
          color={brand.primary[600]}
        />
        <StatCard
          icon={<IconCheck size={18} color={brand.success.main} />}
          label="Completed"
          value={fmt(stats.completed)}
          color={brand.success.main}
        />
        <StatCard
          icon={<IconClock size={18} color={brand.warning.main} />}
          label="Pending"
          value={fmt(stats.pending)}
          color={brand.warning.main}
        />
      </Stack>

      <FilterBar
        searchPlaceholder="Search by reference…"
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(0); }}
        searchAriaLabel="Search payments by reference"
        filtersOpen={filtersOpen}
        onFiltersToggle={() => setFiltersOpen(!filtersOpen)}
        activeFilters={activeFilters}
        onClearAll={clearAll}
      >
        <TextField
          select
          size="small"
          value={referenceType}
          label="Type"
          onChange={(e) => {
            setReferenceType(e.target.value as ReferenceType | '');
            setPage(0);
          }}
          sx={{ minWidth: 180, '& .MuiOutlinedInput-root': { borderRadius: '10px', height: 42 } }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="SALE">Sale</MenuItem>
          <MenuItem value="PURCHASE">Purchase</MenuItem>
          <MenuItem value="SALE_RETURN">Sale return</MenuItem>
          <MenuItem value="PURCHASE_RETURN">Purchase return</MenuItem>
          <MenuItem value="EXPENSE">Expense</MenuItem>
          <MenuItem value="DEPOSIT">Deposit</MenuItem>
          <MenuItem value="TRANSFER">Transfer</MenuItem>
        </TextField>
        <TextField
          select
          size="small"
          value={method}
          label="Method"
          onChange={(e) => { setMethod(e.target.value); setPage(0); }}
          sx={{ minWidth: 150, '& .MuiOutlinedInput-root': { borderRadius: '10px', height: 42 } }}
        >
          <MenuItem value="">All methods</MenuItem>
          <MenuItem value="CASH">Cash</MenuItem>
          <MenuItem value="CARD">Card</MenuItem>
          <MenuItem value="TRANSFER">Transfer</MenuItem>
          <MenuItem value="MPESA">M-Pesa</MenuItem>
          <MenuItem value="CHECK">Check</MenuItem>
        </TextField>
        <TextField
          size="small"
          type="date"
          label="From"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(0);
          }}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 150, '& .MuiOutlinedInput-root': { borderRadius: '10px', height: 42 } }}
        />
        <TextField
          size="small"
          type="date"
          label="To"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(0);
          }}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 150, '& .MuiOutlinedInput-root': { borderRadius: '10px', height: 42 } }}
        />
      </FilterBar>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyText="No payments recorded yet."
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        getRowKey={(p) => p.id}
        tableKey="payments"
        enableColumnVisibility
        enableExport
        exportFileName="payments"
        toolbarTitle="Transactions"
      />

      {/* Record payment dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Record payment</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {formError && (
              <Alert severity="error" sx={{ borderRadius: '8px' }}>
                {formError}
              </Alert>
            )}
            <Stack direction="row" spacing={2}>
              <TextField
                size="small"
                type="date"
                label="Date"
                fullWidth
                value={payForm.date ?? ''}
                onChange={(e) => pf('date', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                size="small"
                type="number"
                label="Amount *"
                fullWidth
                value={payForm.amount ?? 0}
                onChange={(e) => pf('amount', Number(e.target.value) || 0)}
              />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                select
                size="small"
                label="Account *"
                fullWidth
                value={payForm.accountId ?? ''}
                onChange={(e) => pf('accountId', e.target.value)}
              >
                {accounts.map((a) => (
                  <MenuItem key={a.id} value={a.id}>
                    {a.name} ({a.type})
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="Method *"
                fullWidth
                value={payForm.method ?? 'CASH'}
                onChange={(e) => pf('method', e.target.value as PaymentMethod)}
              >
                <MenuItem value="CASH">Cash</MenuItem>
                <MenuItem value="CARD">Card</MenuItem>
                <MenuItem value="CHECK">Check</MenuItem>
                <MenuItem value="TRANSFER">Transfer</MenuItem>
                <MenuItem value="MPESA">M-Pesa</MenuItem>
              </TextField>
            </Stack>
            <TextField
              select
              size="small"
              label="Type *"
              fullWidth
              value={payForm.referenceType ?? 'PURCHASE'}
              onChange={(e) => pf('referenceType', e.target.value as ReferenceType)}
            >
              <MenuItem value="SALE">Sale</MenuItem>
              <MenuItem value="PURCHASE">Purchase</MenuItem>
              <MenuItem value="EXPENSE">Expense</MenuItem>
              <MenuItem value="DEPOSIT">Deposit</MenuItem>
              <MenuItem value="TRANSFER">Transfer</MenuItem>
            </TextField>
            <TextField
              label="Notes"
              size="small"
              fullWidth
              multiline
              minRows={2}
              value={payForm.notes ?? ''}
              onChange={(e) => pf('notes', e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleRecord}
            disabled={saving}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              bgcolor: brand.primary[600],
              '&:hover': { bgcolor: brand.primary[700] },
            }}
          >
            {saving ? 'Saving…' : 'Record'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
