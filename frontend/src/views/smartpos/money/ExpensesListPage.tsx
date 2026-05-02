import { useEffect, useState } from 'react';
import { Alert, Box, Stack, Typography } from '@mui/material';
import { IconReceipt2 } from '@tabler/icons-react';

import { listExpenses, type Expense } from 'src/api/smartpos/payments';
import PageHeader from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;

export default function ExpensesListPage() {
  const [rows, setRows] = useState<Expense[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listExpenses({ page, size: 20 })
      .then((p) => { if (!cancelled) { setRows(p.content); setTotalPages(p.totalPages || 1); } })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page]);

  const columns: Column<Expense>[] = [
    {
      key: 'ref', label: 'Ref',
      render: (e) => (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{
            width: 32, height: 32, borderRadius: 1.5,
            bgcolor: brand.error.light, color: brand.error.dark,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IconReceipt2 size={16} />
          </Box>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700, color: brand.primary[700] }}>{e.ref}</Typography>
            <Typography variant="caption" sx={{ color: brand.neutral[500] }}>{new Date(e.date).toLocaleDateString()}</Typography>
          </Box>
        </Stack>
      ),
    },
    {
      key: 'description', label: 'Description',
      render: (e) => <Typography variant="body2">{e.description || '—'}</Typography>,
    },
    {
      key: 'amount', label: 'Amount', align: 'right',
      render: (e) => <span style={{ fontWeight: 700, color: brand.error.dark }}>-{fmt(e.amount, e.currency)}</span>,
    },
  ];

  return (
    <Box>
      <PageHeader title="Expenses" subtitle="Operational spend recorded against accounts" />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <DataTable
        columns={columns} rows={rows} loading={loading}
        emptyText="No expenses recorded yet."
        page={page} totalPages={totalPages} onPageChange={setPage}
        getRowKey={(e) => e.id}
      />
    </Box>
  );
}
