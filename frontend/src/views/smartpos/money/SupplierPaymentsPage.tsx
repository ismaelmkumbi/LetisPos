import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useNavigate } from 'react-router';

import { listSupplierPayments, type SupplierPayment } from 'src/api/smartpos/payments';
import { listSuppliers } from 'src/api/smartpos/suppliers';
import type { Supplier } from 'src/api/smartpos/types';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;
const PAGE_SIZE = 20;

const METHOD_COLOURS: Record<string, string> = {
  CASH: brand.success.dark,
  BANK_TRANSFER: brand.info.dark,
  MOBILE_MONEY: brand.accent[700],
  CHEQUE: brand.warning.dark,
};

export default function SupplierPaymentsPage() {
  const nav = useNavigate();
  const [rows, setRows] = useState<SupplierPayment[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [supplierId, setSupplierId] = useState<string>('');
  const [method, setMethod] = useState<string>('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  useEffect(() => { listSuppliers({ size: 200 }).then((p) => setSuppliers(p.content)).catch(() => {}); }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listSupplierPayments({
      supplierId: supplierId || undefined,
      method: method || undefined,
      search: search || undefined,
      page, size: PAGE_SIZE,
    })
      .then((p) => { if (!cancelled) { setRows(p.content); setTotalPages(p.totalPages || 1); } })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [supplierId, method, search, page]);

  const columns: Column<SupplierPayment>[] = useMemo(() => [
    {
      key: '_num', label: '#', width: 48, align: 'center', enableHiding: false, sortable: false,
      render: (_, i) => (
        <Typography sx={{ fontWeight: 700, fontSize: '0.75rem', color: brand.neutral[400], fontFamily: "'DM Mono', 'Courier New', monospace" }}>
          {page * PAGE_SIZE + i + 1}
        </Typography>
      ),
    },
    { key: 'supplierId', label: 'Supplier', width: 160, render: (p) => <Typography variant="body2" sx={{ fontWeight: 600 }}>{suppliers.find((s) => s.id === p.supplierId)?.name ?? p.supplierName}</Typography> },
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
      render: (p) => p.reference ? <Typography variant="body2" sx={{ fontFamily: "'DM Mono', 'Courier New', monospace", fontSize: '0.75rem' }}>{p.reference}</Typography> : <Typography sx={{ color: brand.neutral[400] }}>—</Typography>,
    },
  ], [page, suppliers]);

  return (
    <Box>
      <PageHeader title="Supplier Payments" subtitle="Track all payments made to suppliers" />
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
    </Box>
  );
}
