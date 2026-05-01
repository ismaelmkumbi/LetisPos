import { useEffect, useState } from 'react';
import { Alert, Box, Chip, Stack, Typography } from '@mui/material';
import { IconCash, IconBuildingBank, IconDeviceMobile, IconCreditCard } from '@tabler/icons-react';

import { listAccounts, type Account } from 'src/api/smartpos/payments';
import PageHeader from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
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

export default function AccountsListPage() {
  const [rows, setRows] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listAccounts()
      .then((a) => { if (!cancelled) setRows(a); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const columns: Column<Account>[] = [
    {
      key: 'name', label: 'Account',
      render: (a) => (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{
            width: 36, height: 36, borderRadius: 1.5,
            bgcolor: brand.primary[50],
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AccountIcon type={a.type} />
          </Box>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{a.name}</Typography>
            {a.number && <Typography variant="caption" sx={{ color: brand.neutral[500], fontFamily: 'monospace' }}>{a.number}</Typography>}
          </Box>
        </Stack>
      ),
    },
    {
      key: 'type', label: 'Type', align: 'center',
      render: (a) => (
        <Chip label={a.type} size="small" sx={{
          bgcolor: brand.primary[50], color: brand.primary[700], fontWeight: 600,
        }} />
      ),
    },
    { key: 'currency', label: 'Currency', align: 'center' },
    {
      key: 'balance', label: 'Balance', align: 'right',
      render: (a) => (
        <span style={{
          fontWeight: 700,
          color: a.balance < 0 ? brand.error.dark : brand.primary[700],
        }}>
          {fmt(a.balance, a.currency)}
        </span>
      ),
    },
    {
      key: 'active', label: 'Status', align: 'center',
      render: (a) => (
        <Chip label={a.active ? 'Active' : 'Inactive'} size="small" sx={{
          bgcolor: a.active ? brand.success.light : brand.neutral[100],
          color:   a.active ? brand.success.dark  : brand.neutral[600], fontWeight: 600,
        }} />
      ),
    },
  ];

  return (
    <Box>
      <PageHeader title="Accounts" subtitle="Cash, bank, card and mobile-money accounts" />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <DataTable
        columns={columns} rows={rows} loading={loading}
        emptyText="No accounts yet."
        getRowKey={(a) => a.id}
      />
    </Box>
  );
}
