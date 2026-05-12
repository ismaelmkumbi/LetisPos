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
import {
  IconCash,
  IconBuildingBank,
  IconDeviceMobile,
  IconCreditCard,
  IconPlus,
  IconCurrencyDollar,
} from '@tabler/icons-react';

import {
  listAccounts,
  createAccount,
  updateAccount,
  toggleAccountActive,
  type Account,
  type AccountInput,
  type AccountType,
} from 'src/api/smartpos/payments';
import PageHeader from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { useAuth } from 'src/context/smartpos/AuthContext';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;

function AccountIcon({ type }: { type: Account['type'] }) {
  const color = brand.primary[700];
  if (type === 'CASH') return <IconCash size={18} color={color} />;
  if (type === 'BANK') return <IconBuildingBank size={18} color={color} />;
  if (type === 'CARD') return <IconCreditCard size={18} color={color} />;
  return <IconDeviceMobile size={18} color={color} />;
}

const emptyForm: AccountInput = {
  name: '',
  number: '',
  type: 'CASH',
  currency: 'TZS',
  initialBalance: 0,
  notes: '',
};

export default function AccountsListPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState<AccountInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const refresh = () => setRefreshToken((n) => n + 1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listAccounts()
      .then((a) => {
        if (!cancelled) setRows(a);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? (e as Error).message : 'Failed to load');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.tenantId, refreshToken]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setDialogOpen(true);
  };
  const openEdit = (a: Account) => {
    setEditing(a);
    setForm({
      name: a.name,
      number: a.number ?? '',
      type: a.type,
      currency: a.currency,
      initialBalance: a.initialBalance,
      notes: a.notes ?? '',
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError('Account name is required.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await updateAccount(editing.id, form);
      } else {
        await createAccount(form);
      }
      setDialogOpen(false);
      refresh();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? (e as Error).message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (a: Account) => {
    try {
      await toggleAccountActive(a.id);
      refresh();
    } catch {
      /* swallow */
    }
  };

  // Stats
  const stats = useMemo(() => {
    const totalBalance = rows.reduce((s, a) => s + a.balance, 0);
    const cashBalance = rows.filter((a) => a.type === 'CASH').reduce((s, a) => s + a.balance, 0);
    const bankBalance = rows
      .filter((a) => a.type === 'BANK' || a.type === 'CARD')
      .reduce((s, a) => s + a.balance, 0);
    const mobileBalance = rows
      .filter((a) => a.type === 'MOBILE_MONEY')
      .reduce((s, a) => s + a.balance, 0);
    return { totalBalance, cashBalance, bankBalance, mobileBalance, count: rows.length };
  }, [rows]);

  const columns: Column<Account>[] = [
    {
      key: 'name',
      label: 'Account',
      render: (a) => (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '8px',
              bgcolor: brand.primary[50],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AccountIcon type={a.type} />
          </Box>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {a.name}
            </Typography>
            {a.number && (
              <Typography
                variant="caption"
                sx={{ color: brand.neutral[500], fontFamily: 'monospace' }}
              >
                {a.number}
              </Typography>
            )}
          </Box>
        </Stack>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      align: 'center',
      render: (a) => (
        <Chip
          label={a.type.replace(/_/g, ' ')}
          size="small"
          sx={{
            bgcolor: brand.primary[50],
            color: brand.primary[700],
            fontWeight: 600,
            borderRadius: '6px',
          }}
        />
      ),
    },
    { key: 'currency', label: 'Currency', align: 'center' },
    {
      key: 'initialBalance',
      label: 'Opening',
      align: 'right',
      render: (a) => (
        <Typography variant="body2" sx={{ color: brand.neutral[500] }}>
          {fmt(a.initialBalance, a.currency)}
        </Typography>
      ),
    },
    {
      key: 'balance',
      label: 'Balance',
      align: 'right',
      render: (a) => (
        <Typography
          variant="body2"
          sx={{ fontWeight: 700, color: a.balance < 0 ? brand.error.dark : brand.primary[700] }}
        >
          {fmt(a.balance, a.currency)}
        </Typography>
      ),
    },
    {
      key: 'active',
      label: 'Status',
      align: 'center',
      render: (a) => (
        <Chip
          label={a.active ? 'Active' : 'Inactive'}
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            handleToggle(a);
          }}
          sx={{
            bgcolor: a.active ? brand.success.light : brand.neutral[100],
            color: a.active ? brand.success.dark : brand.neutral[600],
            fontWeight: 600,
            cursor: 'pointer',
            borderRadius: '6px',
          }}
        />
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
    value: string;
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

  const patchForm = <K extends keyof AccountInput>(k: K, v: AccountInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <Box sx={{ maxWidth: 1680, mx: 'auto', pb: 3 }}>
      <PageHeader
        title="Accounts"
        subtitle="Cash, bank, card and mobile-money accounts"
        action={{ label: 'New account', icon: <IconPlus size={18} />, onClick: openCreate }}
      />

      <Stack direction="row" spacing={2} sx={{ mb: 2.5, flexWrap: 'wrap' }}>
        <StatCard
          icon={<IconCurrencyDollar size={18} color={brand.primary[600]} />}
          label="Total balance"
          value={fmt(stats.totalBalance)}
          color={brand.primary[600]}
        />
        <StatCard
          icon={<IconCash size={18} color={brand.success.main} />}
          label="Cash"
          value={fmt(stats.cashBalance)}
          color={brand.success.main}
        />
        <StatCard
          icon={<IconBuildingBank size={18} color={brand.info.main} />}
          label="Bank & card"
          value={fmt(stats.bankBalance)}
          color={brand.info.main}
        />
        <StatCard
          icon={<IconDeviceMobile size={18} color={brand.accent[500]} />}
          label="Mobile money"
          value={fmt(stats.mobileBalance)}
          color={brand.accent[500]}
        />
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyText="No accounts yet. Create one to start tracking money."
        getRowKey={(a) => a.id}
        onRowClick={openEdit}
        tableKey="accounts"
        enableColumnVisibility
        enableExport
        exportFileName="accounts"
        toolbarTitle="Payment accounts"
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
          {editing ? 'Edit account' : 'New account'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {formError && (
              <Alert severity="error" sx={{ borderRadius: '8px' }}>
                {formError}
              </Alert>
            )}
            <TextField
              label="Name *"
              size="small"
              fullWidth
              value={form.name}
              onChange={(e) => patchForm('name', e.target.value)}
              error={!form.name.trim()}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Account number"
                size="small"
                fullWidth
                value={form.number ?? ''}
                onChange={(e) => patchForm('number', e.target.value)}
              />
              <TextField
                select
                label="Type"
                size="small"
                fullWidth
                value={form.type ?? 'CASH'}
                onChange={(e) => patchForm('type', e.target.value as AccountType)}
              >
                <MenuItem value="CASH">Cash</MenuItem>
                <MenuItem value="BANK">Bank</MenuItem>
                <MenuItem value="CARD">Card</MenuItem>
                <MenuItem value="MOBILE_MONEY">Mobile money</MenuItem>
              </TextField>
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Currency"
                size="small"
                value={form.currency ?? 'TZS'}
                onChange={(e) => patchForm('currency', e.target.value)}
                sx={{ width: 120 }}
              />
              <TextField
                label="Initial balance"
                size="small"
                type="number"
                fullWidth
                value={form.initialBalance ?? 0}
                onChange={(e) => patchForm('initialBalance', Number(e.target.value) || 0)}
              />
            </Stack>
            <TextField
              label="Notes"
              size="small"
              multiline
              minRows={2}
              fullWidth
              value={form.notes ?? ''}
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
            {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
