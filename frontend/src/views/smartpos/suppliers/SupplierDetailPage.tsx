/**
 * Supplier detail page — purchase history, balance, and summary stats.
 */
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Avatar, Box, Button, Card, CardContent, Chip, CircularProgress,
  Grid, Stack, Typography, keyframes,
} from '@mui/material';
import {
  IconBuildingWarehouse, IconCalendar, IconCurrencyDollar,
  IconMail, IconPhone, IconPlus, IconReceipt2, IconUser,
} from '@tabler/icons-react';
import { getSupplier, getSupplierSummary, type SupplierSummary } from 'src/api/smartpos/suppliers';
import { listPurchases } from 'src/api/smartpos/sales';
import type { Purchase } from 'src/api/smartpos/sales';
import type { Supplier } from 'src/api/smartpos/types';
import PageHeader from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
`;

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [summary, setSummary] = useState<SupplierSummary | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasesPage, setPurchasesPage] = useState(0);
  const [purchasesTotal, setPurchasesTotal] = useState(0);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      getSupplier(id),
      getSupplierSummary(id).catch(() => null),
      listPurchases({ supplierId: id, page: 0, size: 10, sort: 'date,desc' }),
    ])
      .then(([s, sm, pp]) => {
        setSupplier(s);
        setSummary(sm);
        setPurchases(pp.content);
        setPurchasesTotal(pp.totalElements ?? 0);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const loadPurchases = (page: number) => {
    if (!id) return;
    listPurchases({ supplierId: id, page, size: 10, sort: 'date,desc' })
      .then((pp) => {
        setPurchases(pp.content);
        setPurchasesPage(page);
      });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress sx={{ color: brand.primary[500] }} />
      </Box>
    );
  }

  if (!supplier) {
    return (
      <Box sx={{ textAlign: 'center', py: 10 }}>
        <Typography sx={{ color: brand.neutral[500] }}>Supplier not found.</Typography>
        <Button onClick={() => nav('/smartpos/suppliers')} sx={{ mt: 2 }}>Back to suppliers</Button>
      </Box>
    );
  }

  const purchaseColumns: Column<Purchase>[] = [
    {
      key: 'ref', label: 'Ref',
      render: (p) => (
        <Stack>
          <Typography variant="body2" sx={{ fontWeight: 700, color: brand.primary[700] }}>{p.ref}</Typography>
          <Typography variant="caption" sx={{ color: brand.neutral[500] }}>{new Date(p.date).toLocaleDateString()}</Typography>
        </Stack>
      ),
    },
    {
      key: 'status', label: 'Status', align: 'center',
      render: (p) => (
        <Chip label={p.status} size="small"
          sx={{ fontWeight: 600, borderRadius: '6px', fontSize: '0.7rem' }} />
      ),
    },
    {
      key: 'paymentStatus', label: 'Payment', align: 'center',
      render: (p) => (
        <Chip label={p.paymentStatus} size="small"
          sx={{ fontWeight: 600, borderRadius: '6px', fontSize: '0.7rem' }} />
      ),
    },
    {
      key: 'grandTotal', label: 'Total', align: 'right',
      render: (p) => (
        <Typography variant="body2" sx={{ fontWeight: 700 }}>{fmt(p.grandTotal)}</Typography>
      ),
    },
    {
      key: 'dueTotal', label: 'Due', align: 'right',
      render: (p) => (
        <Typography variant="body2" sx={{ fontWeight: 600, color: p.dueTotal > 0 ? brand.error.dark : brand.success.dark }}>
          {fmt(p.dueTotal)}
        </Typography>
      ),
    },
  ];

  return (
    <Box sx={{ maxWidth: 1680, mx: 'auto', pb: 3 }}>
      <PageHeader
        title={supplier.name}
        subtitle={supplier.code ? `Code: ${supplier.code}` : 'Supplier details'}
        breadcrumbs={[
          { label: 'People', href: '/smartpos/suppliers' },
          { label: 'Suppliers', href: '/smartpos/suppliers' },
          { label: supplier.name },
        ]}
        actions={[{
          label: 'New purchase',
          icon: <IconPlus size={18} />,
          onClick: () => nav(`/smartpos/purchases/new?supplier=${supplier.id}`),
        }]}
      />

      <Grid container spacing={2.5}>
        {/* Supplier info card */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: 3, animation: `${fadeInUp} 0.4s ease both` }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2.5 }}>
                <Avatar sx={{ width: 56, height: 56, bgcolor: brand.primary[600], color: '#fff', fontWeight: 800, fontSize: '1.2rem' }}>
                  {supplier.name.charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: brand.neutral[900] }}>{supplier.name}</Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip label={supplier.active ? 'Active' : 'Inactive'} size="small"
                      sx={{ bgcolor: supplier.active ? brand.success.light : brand.neutral[100], color: supplier.active ? brand.success.dark : brand.neutral[600], fontWeight: 600, borderRadius: '6px', height: 22, fontSize: '0.68rem' }} />
                    {supplier.paymentTermDays && (
                      <Typography variant="caption" sx={{ color: brand.neutral[500] }}>Net {supplier.paymentTermDays}d</Typography>
                    )}
                  </Stack>
                </Box>
              </Stack>

              <Stack spacing={1.25}>
                {supplier.contactPerson && (
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <IconUser size={16} color={brand.neutral[400]} />
                    <Typography variant="body2">{supplier.contactPerson}</Typography>
                  </Stack>
                )}
                {supplier.email && (
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <IconMail size={16} color={brand.neutral[400]} />
                    <Typography variant="body2">{supplier.email}</Typography>
                  </Stack>
                )}
                {supplier.phone && (
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <IconPhone size={16} color={brand.neutral[400]} />
                    <Typography variant="body2">{supplier.phone}</Typography>
                  </Stack>
                )}
                {(supplier.address || supplier.city) && (
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <IconBuildingWarehouse size={16} color={brand.neutral[400]} />
                    <Typography variant="body2">{[supplier.address, supplier.city, supplier.country].filter(Boolean).join(', ')}</Typography>
                  </Stack>
                )}
                {supplier.taxNumber && (
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <IconReceipt2 size={16} color={brand.neutral[400]} />
                    <Typography variant="body2">Tax: {supplier.taxNumber}</Typography>
                  </Stack>
                )}
              </Stack>

              {supplier.notes && (
                <Box sx={{ mt: 2, p: 1.5, borderRadius: '8px', bgcolor: brand.neutral[50] }}>
                  <Typography variant="caption" sx={{ color: brand.neutral[500] }}>{supplier.notes}</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Summary stats */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', gap: 1.5, mb: 2.5 }}>
            {[
              { label: 'Total purchases', value: fmt(summary?.totalPurchases ?? 0), color: brand.primary[600], bg: brand.primary[50], icon: <IconCurrencyDollar size={20} color={brand.primary[600]} /> },
              { label: 'Total paid', value: fmt(summary?.totalPaid ?? 0), color: brand.success.dark, bg: brand.success.light, icon: <IconCurrencyDollar size={20} color={brand.success.dark} /> },
              { label: 'Outstanding', value: fmt(summary?.totalDue ?? 0), color: brand.error.dark, bg: brand.error.light, icon: <IconCurrencyDollar size={20} color={brand.error.dark} /> },
              { label: 'Orders', value: summary?.purchaseCount ?? 0, color: brand.accent[500], bg: brand.accent[50], icon: <IconReceipt2 size={20} color={brand.accent[500]} /> },
              { label: 'Last order', value: summary?.lastPurchaseDate ? new Date(summary.lastPurchaseDate).toLocaleDateString() : '—', color: brand.neutral[700], bg: brand.neutral[100], icon: <IconCalendar size={20} color={brand.neutral[500]} /> },
            ].map((stat, i) => (
              <Card key={stat.label} elevation={0}
                sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: 3, px: 2.5, py: 1.75, flex: 1, minWidth: 140, animation: `${fadeInUp} 0.4s ease ${i * 80}ms both` }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box sx={{ width: 38, height: 38, borderRadius: '10px', bgcolor: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {stat.icon}
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: stat.color, lineHeight: 1.2 }}>{stat.value}</Typography>
                    <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 600, fontSize: '0.68rem' }}>{stat.label}</Typography>
                  </Box>
                </Stack>
              </Card>
            ))}
          </Stack>

          {/* Purchase history */}
          <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: 3, animation: `${fadeInUp} 0.4s ease 0.2s both` }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>Purchase history</Typography>
              <DataTable
                columns={purchaseColumns}
                rows={purchases}
                loading={false}
                emptyText="No purchases from this supplier yet."
                page={purchasesPage}
                totalPages={Math.ceil(purchasesTotal / 10)}
                totalElements={purchasesTotal}
                pageSize={10}
                onPageChange={loadPurchases}
                getRowKey={(p) => p.id}
                onRowClick={(p) => nav(`/smartpos/purchases/${p.id}/edit`)}
                tableKey={`supplier-${id}-purchases`}
                dense
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
