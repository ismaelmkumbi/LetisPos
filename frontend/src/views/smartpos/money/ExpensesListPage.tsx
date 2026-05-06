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
import { IconPlus, IconReceipt2, IconCurrencyDollar, IconCalendar } from '@tabler/icons-react';

import {
  listExpenses,
  recordExpense,
  updateExpense,
  deleteExpense,
  listExpenseCategories,
  listAccounts,
  type Expense,
  type ExpenseInput,
  type Account,
} from 'src/api/smartpos/payments';
import PageHeader from 'src/components/smartpos/PageHeader';
import FilterBar, { type ActiveFilter } from 'src/components/smartpos/FilterBar';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { useAuth } from 'src/context/smartpos/AuthContext';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;

type ExpCat = { id: string; name: string; description: string | null };

export default function ExpensesListPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Expense[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  // Lookups
  const [categories, setCategories] = useState<ExpCat[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Filters
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState<ExpenseInput>({ accountId: '', amount: 0 });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const refresh = () => setRefreshToken((n) => n + 1);

  useEffect(() => {
    Promise.all([listExpenseCategories(), listAccounts()])
      .then(([cats, accs]) => {
        setCategories(cats);
        setAccounts(accs);
      })
      .catch(() => {});
  }, [user?.tenantId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listExpenses({
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
    const total = rows.reduce((s, e) => s + e.amount, 0);
    const count = rows.length;
    const thisMonth = rows
      .filter((e) => {
        const d = new Date(e.date);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, e) => s + e.amount, 0);
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
    setEditing(null);
    setForm({
      date: new Date().toISOString().slice(0, 10),
      accountId: accounts[0]?.id ?? '',
      categoryId: undefined,
      amount: 0,
      description: '',
      notes: '',
    });
    setFormError(null);
    setDialogOpen(true);
  };
  const openEdit = (exp: Expense) => {
    setEditing(exp);
    setForm({
      date: exp.date?.slice(0, 10),
      accountId: exp.accountId,
      categoryId: exp.categoryId ?? undefined,
      amount: exp.amount,
      description: exp.description ?? '',
      notes: exp.notes ?? '',
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
      if (editing) {
        await updateExpense(editing.id, form);
      } else {
        await recordExpense(form);
      }
      setDialogOpen(false);
      refresh();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (exp: Expense) => {
    if (!window.confirm(`Delete expense ${exp.ref}?`)) return;
    try {
      await deleteExpense(exp.id);
      refresh();
    } catch {
      /* swallow */
    }
  };

  const patchForm = <K extends keyof ExpenseInput>(k: K, v: ExpenseInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const catName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? '—';
  const accName = (id: string) => accounts.find((a) => a.id === id)?.name ?? '—';

  const columns: Column<Expense>[] = [
    {
      key: 'ref',
      label: 'Ref',
      render: (e) => (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              bgcolor: brand.error.light,
              color: brand.error.dark,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconReceipt2 size={16} />
          </Box>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700, color: brand.primary[700] }}>
              {e.ref}
            </Typography>
            <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
              {new Date(e.date).toLocaleDateString()}
            </Typography>
          </Box>
        </Stack>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      render: (e) => (
        <Box>
          <Typography variant="body2">{e.description || '—'}</Typography>
          {e.notes && (
            <Typography variant="caption" sx={{ color: brand.neutral[400] }}>
              {e.notes}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      render: (e) => (
        <Chip
          label={catName(e.categoryId)}
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
      key: 'account',
      label: 'Account',
      render: (e) => <Typography variant="body2">{accName(e.accountId)}</Typography>,
    },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right',
      render: (e) => (
        <Typography variant="body2" sx={{ fontWeight: 700, color: brand.error.dark }}>
          -{fmt(e.amount, e.currency)}
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
        title="Expenses"
        subtitle="Operational spend recorded against accounts"
        action={{ label: 'Record expense', icon: <IconPlus size={18} />, onClick: openCreate }}
      />

      <Stack direction="row" spacing={2} sx={{ mb: 2.5, flexWrap: 'wrap' }}>
        <StatCard
          icon={<IconCurrencyDollar size={18} color={brand.error.main} />}
          label="Page total"
          value={fmt(stats.total)}
          color={brand.error.main}
        />
        <StatCard
          icon={<IconCalendar size={18} color={brand.warning.main} />}
          label="This month"
          value={fmt(stats.thisMonth)}
          color={brand.warning.main}
        />
        <StatCard
          icon={<IconReceipt2 size={18} color={brand.primary[600]} />}
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
        emptyText="No expenses recorded yet."
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        getRowKey={(e) => e.id}
        onRowClick={openEdit}
        tableKey="expenses"
        enableColumnVisibility
        enableExport
        exportFileName="expenses"
        toolbarTitle="Operational spend"
      />

      {/* Create / Edit dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editing ? `Edit expense ${editing.ref}` : 'Record expense'}
        </DialogTitle>
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
                value={form.date ?? new Date().toISOString().slice(0, 10)}
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
              label="Description"
              size="small"
              fullWidth
              value={form.description ?? ''}
              onChange={(e) => patchForm('description', e.target.value)}
            />
            <TextField
              label="Notes"
              size="small"
              fullWidth
              multiline
              minRows={2}
              value={form.notes ?? ''}
              onChange={(e) => patchForm('notes', e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions
          sx={{ px: 3, pb: 2, justifyContent: editing ? 'space-between' : 'flex-end' }}
        >
          {editing && (
            <Button
              color="error"
              onClick={() => {
                setDialogOpen(false);
                handleDelete(editing);
              }}
              sx={{ textTransform: 'none' }}
            >
              Delete
            </Button>
          )}
          <Stack direction="row" spacing={1}>
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
              {saving ? 'Saving…' : editing ? 'Update' : 'Record'}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
