import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { IconArrowRight, IconArrowsExchange, IconPlus } from '@tabler/icons-react';

import {
  getAccountTransfers,
  transferBetweenAccounts,
  listAccounts,
  type AccountTransfer,
  type Account,
} from 'src/api/smartpos/payments';
import PageHeader from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { useAuth } from 'src/context/smartpos/AuthContext';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;

export default function TransfersListPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<AccountTransfer[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  // Form
  const [formOpen, setFormOpen] = useState(false);
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const refresh = () => setRefreshToken((n) => n + 1);

  // Load accounts
  useEffect(() => {
    listAccounts()
      .then((accs) => setAccounts(accs.filter((a) => a.active)))
      .catch(() => {});
  }, [user?.tenantId]);

  // Load transfers
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAccountTransfers({ page, size: 20 })
      .then((p) => {
        if (!cancelled) {
          setRows(p.content);
          setTotalPages(p.totalPages || 1);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load transfers');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, refreshToken, user?.tenantId]);

  // Stats
  const stats = useMemo(() => {
    const total = rows.reduce((s, t) => s + t.amount, 0);
    const count = rows.length;
    return { total, count };
  }, [rows]);

  const accName = useMemo(() => {
    const m = new Map<string, string>();
    accounts.forEach((a) => m.set(a.id, a.name));
    return m;
  }, [accounts]);

  const activeAccounts = useMemo(() => accounts.filter((a) => a.active), [accounts]);

  const handleTransfer = async () => {
    if (!fromAccountId) {
      setFormError('From account is required.');
      return;
    }
    if (!toAccountId) {
      setFormError('To account is required.');
      return;
    }
    if (fromAccountId === toAccountId) {
      setFormError('From and To accounts must be different.');
      return;
    }
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setFormError('Amount must be greater than zero.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await transferBetweenAccounts({
        fromAccountId,
        toAccountId,
        amount: amt,
        notes: notes || undefined,
      });
      setFormOpen(false);
      resetForm();
      refresh();
      setPage(0);
      // Refresh account balances by reloading accounts
      listAccounts()
        .then((accs) => setAccounts(accs.filter((a) => a.active)))
        .catch(() => {});
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Transfer failed');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFromAccountId('');
    setToAccountId('');
    setAmount('');
    setNotes('');
    setFormError(null);
  };

  const columns: Column<AccountTransfer>[] = [
    {
      key: 'ref',
      label: 'Reference',
      render: (t) => (
        <Stack>
          <Typography variant="body2" sx={{ fontWeight: 700, color: brand.primary[700] }}>
            {t.ref}
          </Typography>
          <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
            {new Date(t.date).toLocaleDateString()}
          </Typography>
        </Stack>
      ),
    },
    {
      key: 'from',
      label: 'From Account',
      render: (t) => (
        <Chip
          label={accName.get(t.fromAccountId) || t.fromAccountId.slice(0, 8)}
          size="small"
          sx={{
            bgcolor: brand.error.light,
            color: brand.error.dark,
            fontWeight: 600,
            borderRadius: '6px',
          }}
        />
      ),
    },
    {
      key: 'to',
      label: 'To Account',
      render: (t) => (
        <Chip
          label={accName.get(t.toAccountId) || t.toAccountId.slice(0, 8)}
          size="small"
          sx={{
            bgcolor: brand.success.light,
            color: brand.success.dark,
            fontWeight: 600,
            borderRadius: '6px',
          }}
        />
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right',
      render: (t) => (
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {fmt(t.amount)}
        </Typography>
      ),
    },
    {
      key: 'notes',
      label: 'Note',
      render: (t) => (
        <Typography variant="body2" sx={{ color: t.notes ? 'inherit' : brand.neutral[400] }}>
          {t.notes || '—'}
        </Typography>
      ),
    },
  ];

  return (
    <Box sx={{ maxWidth: 1680, mx: 'auto', pb: 3 }}>
      <PageHeader
        title="Transfers"
        subtitle="Move funds between accounts"
        action={{ label: 'New transfer', icon: <IconPlus size={18} />, onClick: () => setFormOpen(true) }}
      />

      {/* New Transfer form */}
      {formOpen && (
        <Card
          elevation={0}
          sx={{
            border: `1px solid ${brand.neutral[200]}`,
            borderRadius: 3,
            p: 2.5,
            mb: 2.5,
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <IconArrowsExchange size={18} color={brand.primary[600]} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              New Transfer
            </Typography>
          </Stack>

          {formError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: '8px' }}>
              {formError}
            </Alert>
          )}

          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select
                size="small"
                label="From Account *"
                fullWidth
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                error={!!formError && !fromAccountId}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', height: 42 } }}
              >
                {activeAccounts.map((a) => (
                  <MenuItem key={a.id} value={a.id}>
                    {a.name} ({a.type})
                  </MenuItem>
                ))}
              </TextField>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', px: 1 }}>
                <IconArrowRight size={20} color={brand.neutral[400]} />
              </Box>
              <TextField
                select
                size="small"
                label="To Account *"
                fullWidth
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                error={!!formError && !toAccountId}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', height: 42 } }}
              >
                {activeAccounts.map((a) => (
                  <MenuItem key={a.id} value={a.id}>
                    {a.name} ({a.type})
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                size="small"
                type="number"
                label="Amount *"
                fullWidth
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                error={!!formError && (!amount || Number(amount) <= 0)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', height: 42 } }}
              />
              <TextField
                size="small"
                label="Note"
                fullWidth
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional description"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', height: 42 } }}
              />
            </Stack>
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button
                onClick={() => {
                  setFormOpen(false);
                  resetForm();
                }}
                sx={{ textTransform: 'none' }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleTransfer}
                disabled={saving}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  bgcolor: brand.primary[600],
                  '&:hover': { bgcolor: brand.primary[700] },
                }}
              >
                {saving ? 'Transferring…' : 'Transfer'}
              </Button>
            </Stack>
          </Stack>
        </Card>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyText="No transfers yet."
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        getRowKey={(t) => t.id}
        tableKey="account-transfers"
        enableColumnVisibility
        enableExport
        exportFileName="account-transfers"
        toolbarTitle="Account-to-account transfers"
      />
    </Box>
  );
}
