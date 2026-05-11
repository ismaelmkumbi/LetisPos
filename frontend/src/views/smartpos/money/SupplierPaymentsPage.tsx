import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import { IconCash, IconCoin, IconCurrencyDollar, IconPlus } from '@tabler/icons-react';
import { useNavigate } from 'react-router';

import {
  listSupplierPayments, createSupplierPayment,
  type CreateSupplierPaymentRequest,
} from 'src/api/smartpos/payments';
import { listSuppliers, getSupplierBalance, type SupplierBalance } from 'src/api/smartpos/suppliers';
import { listAccounts, type Account } from 'src/api/smartpos/payments';
import type { Supplier, SupplierPayment, UUID } from 'src/api/smartpos/types';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;
const PAGE_SIZE = 20;

const METHOD_COLOURS: Record<string, string> = {
  CASH: brand.success.dark,
  BANK_TRANSFER: brand.info.dark,
  TRANSFER: brand.info.dark,
  MOBILE_MONEY: brand.accent[700],
  MPESA: brand.accent[700],
  CHEQUE: brand.warning.dark,
  CARD: brand.warning.dark,
  CHECK: brand.warning.dark,
};

function BalanceCard({
  icon, label, value, color, accentBg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  accentBg: string;
}) {
  return (
    <Box
      sx={{
        flex: 1, minWidth: 155, bgcolor: '#fff', borderRadius: '12px',
        border: `1px solid ${brand.neutral[200]}`, borderTop: `3px solid ${color}`,
        px: 2.5, py: 2, display: 'flex', flexDirection: 'column', gap: 1.25,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        boxShadow: `0 1px 2px ${brand.neutral[900]}06`,
        '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 12px 28px -12px ${brand.neutral[900]}18` },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.68rem' }}>
          {label}
        </Typography>
        <Box sx={{ width: 36, height: 36, borderRadius: '10px', background: accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </Box>
      </Box>
      <Typography variant="h5" sx={{ fontWeight: 900, color: brand.neutral[900], letterSpacing: '-0.3px', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </Typography>
    </Box>
  );
}

export default function SupplierPaymentsPage() {
  const nav = useNavigate();
  const [rows, setRows] = useState<SupplierPayment[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState<string>('');
  const [method, setMethod] = useState<string>('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [refreshToken, setRefreshToken] = useState(0);

  // Balance
  const [balance, setBalance] = useState<SupplierBalance | null>(null);

  // Record Payment dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paySupplierId, setPaySupplierId] = useState<string>('');
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('CASH');
  const [payAccountId, setPayAccountId] = useState('');
  const [payReference, setPayReference] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payNotes, setPayNotes] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { listSuppliers({ size: 200 }).then((p) => setSuppliers(p.content)).catch(() => {}); }, []);
  useEffect(() => { listAccounts().then(setAccounts).catch(() => {}); }, []);

  // Fetch balance when supplier changes
  useEffect(() => {
    if (!supplierId) { setBalance(null); return; }
    getSupplierBalance(supplierId)
      .then(setBalance)
      .catch(() => setBalance(null));
  }, [supplierId, refreshToken]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listSupplierPayments({
      supplierId: supplierId || undefined,
      method: method || undefined,
      page, size: PAGE_SIZE,
    })
      .then((p) => { if (!cancelled) { setRows(p.content); setTotalPages(p.totalPages || 1); } })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [supplierId, method, page, refreshToken]);

  const openCreateDialog = () => {
    setPaySupplierId(supplierId || '');
    setPayAmount('');
    setPayMethod('CASH');
    setPayAccountId(accounts[0]?.id ?? '');
    setPayReference('');
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayNotes('');
    setDialogOpen(true);
  };

  const handleRecordPayment = async () => {
    if (!paySupplierId || !payAmount || !payAccountId) return;
    setSaving(true);
    try {
      const body: CreateSupplierPaymentRequest = {
        supplierId: paySupplierId as UUID,
        amount: parseFloat(payAmount),
        method: payMethod,
        accountId: payAccountId as UUID,
        reference: payReference || undefined,
        date: payDate || undefined,
        notes: payNotes || undefined,
      };
      await createSupplierPayment(body);
      setDialogOpen(false);
      setRefreshToken((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<SupplierPayment>[] = useMemo(() => [
    {
      key: '_num', label: '#', width: 48, align: 'center', enableHiding: false, sortable: false,
      render: (_, i) => (
        <Typography sx={{ fontWeight: 700, fontSize: '0.75rem', color: brand.neutral[400], fontFamily: "'DM Mono', 'Courier New', monospace" }}>
          {page * PAGE_SIZE + i + 1}
        </Typography>
      ),
    },
    {
      key: 'supplierId', label: 'Supplier', width: 160,
      render: (p) => (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {suppliers.find((s) => s.id === p.supplierId)?.name ?? p.supplierName}
        </Typography>
      ),
    },
    {
      key: 'purchaseRef', label: 'Purchase', width: 150,
      render: (p) => (
        <Typography sx={{ fontFamily: "'DM Mono', 'Courier New', monospace", fontSize: '0.8rem', fontWeight: 600, color: brand.neutral[700] }}>
          {p.purchaseRef}
        </Typography>
      ),
    },
    {
      key: 'amount', label: 'Amount', width: 120, align: 'right',
      render: (p) => (
        <Typography sx={{ fontWeight: 700, fontFamily: "'DM Mono', 'Courier New', monospace", fontSize: '0.82rem', color: brand.neutral[800] }}>
          {fmt(p.amount)}
        </Typography>
      ),
    },
    {
      key: 'method', label: 'Method', width: 120, align: 'center',
      render: (p) => (
        <Chip label={p.method} size="small"
          sx={{ height: 22, fontWeight: 700, fontSize: '0.65rem', bgcolor: brand.neutral[100], color: METHOD_COLOURS[p.method] ?? brand.neutral[600], borderRadius: '6px' }}
        />
      ),
    },
    { key: 'accountName', label: 'Account', width: 140, render: (p) => <Typography variant="body2">{p.accountName}</Typography> },
    {
      key: 'date', label: 'Date', width: 110,
      render: (p) => new Date(p.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    },
    {
      key: 'reference', label: 'Reference', width: 150,
      render: (p) => p.reference
        ? <Typography variant="body2" sx={{ fontFamily: "'DM Mono', 'Courier New', monospace", fontSize: '0.75rem' }}>{p.reference}</Typography>
        : <Typography sx={{ color: brand.neutral[400] }}>—</Typography>,
    },
  ], [page, suppliers]);

  return (
    <Box>
      <PageHeader
        title="Supplier Payments"
        subtitle="Track and record payments made to suppliers"
        actions={[{
          label: 'Record Payment',
          icon: <IconPlus size={18} />,
          onClick: openCreateDialog,
        }]}
      />

      {/* Supplier Balance Summary Cards */}
      {balance && (
        <Stack direction="row" spacing={1.5} sx={{ mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
          <BalanceCard
            icon={<IconCurrencyDollar size={18} color={brand.primary[600]} />}
            label="Total Purchases"
            value={fmt(balance.totalPurchases)}
            color={brand.primary[500]}
            accentBg={`linear-gradient(135deg, ${brand.primary[50]}, ${brand.primary[100]})`}
          />
          <BalanceCard
            icon={<IconCash size={18} color={brand.success.dark} />}
            label="Total Paid"
            value={fmt(balance.totalPaid)}
            color={brand.success.main}
            accentBg={`linear-gradient(135deg, ${brand.success.light}, #DCFCE7)`}
          />
          <BalanceCard
            icon={<IconCoin size={18} color={balance.balance > 0 ? brand.error.dark : brand.success.dark} />}
            label="Outstanding Balance"
            value={fmt(balance.balance)}
            color={balance.balance > 0 ? brand.error.main : brand.success.main}
            accentBg={balance.balance > 0
              ? `linear-gradient(135deg, ${brand.error.light}, #FEE2E2)`
              : `linear-gradient(135deg, ${brand.success.light}, #DCFCE7)`}
          />
        </Stack>
      )}

      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
        <TextField select size="small" label="Supplier" value={supplierId}
          onChange={(e) => { setSupplierId(e.target.value); setPage(0); }} sx={{ minWidth: 200 }}>
          <MenuItem value="">All suppliers</MenuItem>
          {suppliers.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Method" value={method}
          onChange={(e) => { setMethod(e.target.value); setPage(0); }} sx={{ minWidth: 160 }}>
          <MenuItem value="">All methods</MenuItem>
          <MenuItem value="CASH">Cash</MenuItem>
          <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
          <MenuItem value="MOBILE_MONEY">Mobile Money</MenuItem>
          <MenuItem value="CHEQUE">Cheque</MenuItem>
        </TextField>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <DataTable
        columns={columns} rows={rows} loading={loading}
        page={page} totalPages={totalPages} onPageChange={setPage}
        getRowKey={(p) => p.paymentId}
        onRowClick={(p) => nav(`/smartpos/purchases/${p.purchaseId}/edit`)}
        emptyText="No supplier payments found"
        enableExport exportFileName="supplier-payments"
        toolbarTitle="Supplier payments"
      />

      {/* Record Payment Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Record Supplier Payment</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField select size="small" label="Supplier" value={paySupplierId}
              onChange={(e) => setPaySupplierId(e.target.value)}>
              {suppliers.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Account" value={payAccountId}
              onChange={(e) => setPayAccountId(e.target.value)}>
              {accounts.filter((a) => a.active).map((a) => (
                <MenuItem key={a.id} value={a.id}>{a.name} ({a.type})</MenuItem>
              ))}
            </TextField>
            <TextField size="small" label="Amount" type="number"
              value={payAmount} onChange={(e) => setPayAmount(e.target.value)}
              inputProps={{ min: 0.01, step: 0.01 }} />
            <TextField select size="small" label="Method" value={payMethod}
              onChange={(e) => setPayMethod(e.target.value)}>
              <MenuItem value="CASH">Cash</MenuItem>
              <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
              <MenuItem value="TRANSFER">Transfer</MenuItem>
              <MenuItem value="MOBILE_MONEY">Mobile Money</MenuItem>
              <MenuItem value="CARD">Card</MenuItem>
              <MenuItem value="CHEQUE">Cheque</MenuItem>
            </TextField>
            <TextField size="small" label="Reference" value={payReference}
              onChange={(e) => setPayReference(e.target.value)}
              placeholder="Cheque number, transaction ID..." />
            <TextField size="small" label="Date" type="date" value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              InputLabelProps={{ shrink: true }} />
            <TextField size="small" label="Notes" multiline rows={2} value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              placeholder="Optional notes..." />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={handleRecordPayment}
            disabled={saving || !paySupplierId || !payAmount || !payAccountId}
            sx={{ fontWeight: 600 }}>
            {saving ? 'Recording…' : 'Record Payment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
