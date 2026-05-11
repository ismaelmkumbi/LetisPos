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
import { IconPlus, IconCashBanknote, IconCurrencyDollar, IconCalendar } from '@tabler/icons-react';

import {
  listDeposits,
  recordDeposit,
  listDepositCategories,
  listAccounts,
  type Deposit,
  type Account,
} from 'src/api/smartpos/payments';
import PageHeader from 'src/components/smartpos/PageHeader';
import FilterBar, { type ActiveFilter } from 'src/components/smartpos/FilterBar';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { useAuth } from 'src/context/smartpos/AuthContext';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;

type DepCat = { id: string; name: string; description: string | null };

export default function DepositsListPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Deposit[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  // Lookups
  const [categories, setCategories] = useState<DepCat[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Filters
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    accountId: '',
    categoryId: '' as string | undefined,
    amount: 0,
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const refresh = () => setRefreshToken((n) => n + 1);

  useEffect(() => {
    Promise.all([listDepositCategories(), listAccounts()])
      .then(([cats, accs]) => {
        setCategories(cats);
        setAccounts(accs);
      })
      .catch(() => {});
  }, [user?.tenantId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listDeposits({
      categoryId: categoryId || undefined,
      accountId: accountId || undefined,
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
  }, [categoryId, accountId, dateFrom, dateTo, page, refreshToken, user?.tenantId]);

  // Stats
  const stats = useMemo(() => {
    const total = rows.reduce((s, d) => s + d.amount, 0);
    const count = rows.length;
    const thisMonth = rows
      .filter((d) => {
        const dt = new Date(d.date);
        const now = new Date();
        return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
      })
      .reduce((s, d) => s + d.amount, 0);
    return { total, count, thisMonth };
  }, [rows]);

  const clearAll = () => {
    setCategoryId('');
    setAccountId('');
    setDateFrom('');
    setDateTo('');
    setPage(0);
  };

  const activeFilters: ActiveFilter[] = useMemo(() => {
    const out: ActiveFilter[] = [];
    if (categoryId) {
      const cn = categories.find((c) => c.id === categoryId)?.name ?? categoryId.slice(0, 8);
      out.push({
        key: 'cat',
        label: `Category: ${cn}`,
        clear: () => {
          setCategoryId('');
          setPage(0);
        },
      });
    }
    if (accountId) {
      const an = accounts.find((a) => a.id === accountId)?.name ?? accountId.slice(0, 8);
      out.push({
        key: 'acc',
        label: `Account: ${an}`,
        clear: () => {
          setAccountId('');
          setPage(0);
        },
      });
    }
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
  }, [categoryId, accountId, dateFrom, dateTo, categories, accounts]);

  // Dialog helpers
  const openCreate = () => {
    setForm({
      date: new Date().toISOString().slice(0, 10),
      accountId: accounts[0]?.id ?? '',
      categoryId: undefined,
      amount: 0,
      notes: '',
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.accountId) {
      setFormError('Account is required.');
      return;
    }
    if (!form.amount || form.amount <= 0) {
      setFormError('Amount must be greater than zero.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await recordDeposit({
        date: form.date,
        accountId: form.accountId,
        categoryId: form.categoryId || undefined,
        amount: form.amount,
        notes: form.notes || undefined,
      });
      setDialogOpen(false);
      refresh();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const patchForm = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const catName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? '—';
  const accName = (id: string) => accounts.find((a) => a.id === id)?.name ?? '—';

  const columns: Column<Deposit>[] = [
    {
      key: 'ref',
      label: 'Ref',
      render: (d) => (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              bgcolor: brand.success.light,
              color: brand.success.dark,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconCashBanknote size={16} />
          </Box>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700, color: brand.primary[700] }}>
              {d.ref}
            </Typography>
            <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
              {new Date(d.date).toLocaleDateString()}
            </Typography>
          </Box>
        </Stack>
      ),
    },
    {
      key: 'account',
      label: 'Account',
      render: (d) => <Typography variant="body2">{accName(d.accountId)}</Typography>,
    },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right',
      render: (d) => (
        <Typography variant="body2" sx={{ fontWeight: 700, color: brand.success.dark }}>
          +{fmt(d.amount, d.currency)}
        </Typography>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      render: (d) => (
        <Chip
          label={catName(d.categoryId)}
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
      key: 'notes',
      label: 'Note',
      render: (d) => (
        <Typography variant="body2" sx={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {d.notes || '—'}
        </Typography>
      ),
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
        title="Deposits"
        subtitle="Money received into accounts"
        action={{ label: 'Record deposit', icon: <IconPlus size={18} />, onClick: openCreate }}
      />

      <Stack direction="row" spacing={2} sx={{ mb: 2.5, flexWrap: 'wrap' }}>
        <StatCard
          icon={<IconCurrencyDollar size={18} color={brand.success.main} />}
          label="Page total"
          value={fmt(stats.total)}
          color={brand.success.main}
        />
        <StatCard
          icon={<IconCalendar size={18} color={brand.info.main} />}
          label="This month"
          value={fmt(stats.thisMonth)}
          color={brand.info.main}
        />
        <StatCard
          icon={<IconCashBanknote size={18} color={brand.primary[600]} />}
          label="Entries"
          value={stats.count}
          color={brand.primary[600]}
        />
      </Stack>

      <FilterBar
        searchPlaceholder=""
        searchValue=""
        onSearchChange={() => {}}
        searchAriaLabel=""
        filtersOpen={filtersOpen}
        onFiltersToggle={() => setFiltersOpen(!filtersOpen)}
        activeFilters={activeFilters}
        onClearAll={clearAll}
      >
        <TextField
          select
          size="small"
          value={categoryId}
          label="Category"
          onChange={(e) => {
            setCategoryId(e.target.value);
            setPage(0);
          }}
          sx={{ minWidth: 180, '& .MuiOutlinedInput-root': { borderRadius: '10px', height: 42 } }}
        >
          <MenuItem value="">All categories</MenuItem>
          {categories.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          value={accountId}
          label="Account"
          onChange={(e) => {
            setAccountId(e.target.value);
            setPage(0);
          }}
          sx={{ minWidth: 180, '& .MuiOutlinedInput-root': { borderRadius: '10px', height: 42 } }}
        >
          <MenuItem value="">All accounts</MenuItem>
          {accounts.map((a) => (
            <MenuItem key={a.id} value={a.id}>
              {a.name}
            </MenuItem>
          ))}
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
        emptyText="No deposits recorded yet."
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        getRowKey={(d) => d.id}
        tableKey="deposits"
        enableColumnVisibility
        enableExport
        exportFileName="deposits"
        toolbarTitle="Money received"
      />

      {/* Record Deposit dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Record deposit</DialogTitle>
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
                value={form.date}
                onChange={(e) => patchForm('date', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                size="small"
                type="number"
                label="Amount *"
                fullWidth
                value={form.amount}
                onChange={(e) => patchForm('amount', Number(e.target.value) || 0)}
                error={!form.amount || form.amount <= 0}
              />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                select
                size="small"
                label="Account *"
                fullWidth
                value={form.accountId}
                onChange={(e) => patchForm('accountId', e.target.value)}
                error={!form.accountId}
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
                label="Category"
                fullWidth
                value={form.categoryId ?? ''}
                onChange={(e) => patchForm('categoryId', e.target.value || undefined)}
              >
                <MenuItem value="">— None —</MenuItem>
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <TextField
              label="Note"
              size="small"
              fullWidth
              multiline
              minRows={2}
              value={form.notes}
              onChange={(e) => patchForm('notes', e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
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
