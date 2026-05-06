import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Alert, Avatar, Box, Button, Card, CardContent, Chip, IconButton,
  Skeleton, Stack, Tooltip, Typography,
} from '@mui/material';
import {
  IconAlertTriangle, IconArrowLeft, IconBox, IconBuildingWarehouse,
  IconEdit, IconMail, IconMapPin, IconPhone, IconPower, IconScale, IconStack,
} from '@tabler/icons-react';

import {
  getWarehouse, listStockLevels, toggleWarehouseStatus,
  getStockSummary, type Warehouse, type StockLevel, type WarehouseSummary,
} from 'src/api/smartpos/inventory';
import type { Page } from 'src/api/smartpos/types';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import { brand } from 'src/theme/smartpos/brand';
import WarehouseEditDrawer from './WarehouseEditDrawer';

export default function WarehouseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<WarehouseSummary | null>(null);
  const [stockPage, setStockPage] = useState<Page<StockLevel> | null>(null);
  const [stockPageNum, setStockPageNum] = useState(0);
  const [stockLoading, setStockLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toggling, setToggling] = useState(false);

  const fetchWarehouse = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const w = await getWarehouse(id);
      setWarehouse(w);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load warehouse');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchStock = useCallback(async () => {
    if (!id) return;
    setStockLoading(true);
    try {
      const [s, page] = await Promise.all([
        getStockSummary(id),
        listStockLevels(id, stockPageNum, 20),
      ]);
      setSummary(s);
      setStockPage(page);
    } catch {
      // stock fetch is non-critical
    } finally {
      setStockLoading(false);
    }
  }, [id, stockPageNum]);

  useEffect(() => {
    fetchWarehouse();
    fetchStock();
  }, [fetchWarehouse, fetchStock]);

  const handleToggleStatus = async () => {
    if (!warehouse) return;
    setToggling(true);
    try {
      const updated = await toggleWarehouseStatus(warehouse.id, !warehouse.active);
      setWarehouse(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update status');
    } finally {
      setToggling(false);
    }
  };

  const stockColumns: Column<StockLevel>[] = useMemo(() => [
    {
      key: 'productId', label: 'Product ID', width: 240,
      render: (sl) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
          {sl.productId}
        </Typography>
      ),
    },
    {
      key: 'onHand', label: 'On hand', align: 'right', width: 100, sortable: true,
      render: (sl) => (
        <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          {sl.onHand}
        </Typography>
      ),
    },
    {
      key: 'reserved', label: 'Reserved', align: 'right', width: 100, sortable: true,
      render: (sl) => (
        <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {sl.reserved}
        </Typography>
      ),
    },
    {
      key: 'available', label: 'Available', align: 'right', width: 100, sortable: true,
      render: (sl) => {
        const low = sl.available <= sl.stockAlertThreshold;
        return (
          <Typography variant="body2" sx={{
            fontWeight: 700, fontVariantNumeric: 'tabular-nums',
            color: low ? brand.error.dark : brand.success.dark,
          }}>
            {sl.available}
          </Typography>
        );
      },
    },
    {
      key: 'alert', label: 'Alert at', align: 'right', width: 100,
      render: (sl) => (
        <Typography variant="body2" sx={{ color: brand.neutral[500], fontVariantNumeric: 'tabular-nums' }}>
          {sl.stockAlertThreshold}
        </Typography>
      ),
    },
  ], []);

  if (loading) {
    return (
      <Box>
        <Stack spacing={3}>
          <Skeleton variant="rounded" height={48} width={320} />
          <Skeleton variant="rounded" height={160} />
          <Skeleton variant="rounded" height={300} />
        </Stack>
      </Box>
    );
  }

  if (error || !warehouse) {
    return (
      <Box>
        <Alert severity="error" action={
          <Button size="small" onClick={() => navigate('/smartpos/warehouses')}>
            Back to warehouses
          </Button>
        }>
          {error ?? 'Warehouse not found'}
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title={warehouse.name}
        subtitle={warehouse.code ?? `Warehouse ${warehouse.id.slice(0, 8)}`}
        action={{
          label: 'Edit',
          icon: <IconEdit size={18} />,
          onClick: () => setDrawerOpen(true),
        }}
      />

      <Stack direction="row" spacing={0.75} sx={{ mb: 3 }}>
        <Button
          size="small"
          variant="text"
          onClick={() => navigate('/smartpos/warehouses')}
          sx={{ fontWeight: 600, fontSize: '0.75rem', color: brand.neutral[600], minWidth: 0 }}
        >
          <IconArrowLeft size={14} style={{ marginRight: 4 }} />
          All warehouses
        </Button>
      </Stack>

      {/* Info cards */}
      <Stack spacing={2.5} sx={{ mb: 3 }}>
        {/* Primary info */}
        <Card sx={{
          borderRadius: '14px', border: `1px solid ${brand.neutral[200]}`,
          boxShadow: `0 1px 2px ${brand.neutral[900]}06, 0 4px 12px ${brand.neutral[900]}05`,
        }}>
          <CardContent sx={{ p: 2.5 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="flex-start">
              <Avatar
                variant="rounded"
                sx={{
                  width: 56, height: 56, borderRadius: '14px',
                  bgcolor: warehouse.active ? brand.primary[50] : brand.neutral[100],
                  color: warehouse.active ? brand.primary[700] : brand.neutral[500],
                }}
              >
                <IconBuildingWarehouse size={28} />
              </Avatar>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.5 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {warehouse.name}
                  </Typography>
                  <Chip
                    label={warehouse.active ? 'Active' : 'Inactive'}
                    size="small"
                    sx={{
                      height: 22, fontWeight: 700, fontSize: '0.6875rem',
                      bgcolor: warehouse.active ? brand.success.light : brand.neutral[100],
                      color: warehouse.active ? brand.success.dark : brand.neutral[500],
                    }}
                  />
                </Stack>
                {warehouse.code && (
                  <Typography variant="body2" sx={{ color: brand.neutral[500], fontFamily: 'monospace', mb: 1 }}>
                    {warehouse.code}
                  </Typography>
                )}

                <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
                  {(warehouse.city || warehouse.country) && (
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <IconMapPin size={16} color={brand.neutral[400]} />
                      <Typography variant="body2" sx={{ color: brand.neutral[600] }}>
                        {[warehouse.city, warehouse.country, warehouse.zip].filter(Boolean).join(', ')}
                      </Typography>
                    </Stack>
                  )}
                  {warehouse.email && (
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <IconMail size={16} color={brand.neutral[400]} />
                      <Typography variant="body2" sx={{ color: brand.neutral[600] }}>
                        {warehouse.email}
                      </Typography>
                    </Stack>
                  )}
                  {warehouse.phone && (
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <IconPhone size={16} color={brand.neutral[400]} />
                      <Typography variant="body2" sx={{ color: brand.neutral[600] }}>
                        {warehouse.phone}
                      </Typography>
                    </Stack>
                  )}
                </Stack>
              </Box>

              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexShrink: 0 }}>
                <Tooltip title={warehouse.active ? 'Deactivate' : 'Activate'}>
                  <IconButton
                    disabled={toggling}
                    onClick={handleToggleStatus}
                    sx={{
                      borderRadius: '10px',
                      color: warehouse.active ? brand.warning.dark : brand.success.dark,
                      bgcolor: warehouse.active ? brand.warning.light : brand.success.light,
                      '&:hover': { bgcolor: warehouse.active ? '#FDE68A' : '#BBF7D0' },
                    }}
                  >
                    <IconPower size={18} />
                  </IconButton>
                </Tooltip>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<IconEdit size={14} />}
                  onClick={() => setDrawerOpen(true)}
                  sx={{ fontWeight: 600, borderRadius: '10px' }}
                >
                  Edit
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {/* Stock summary tiles */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <SummaryTile
            icon={<IconStack size={18} />}
            label="Distinct products"
            value={summary ? String(summary.distinctProducts) : '—'}
            accent={{ light: brand.primary[50], dark: brand.primary[700] }}
          />
          <SummaryTile
            icon={<IconBox size={18} />}
            label="Total on hand"
            value={summary ? String(summary.totalOnHand) : '—'}
            accent={{ light: brand.info.light, dark: brand.info.dark }}
          />
          <SummaryTile
            icon={<IconScale size={18} />}
            label="Available"
            value={summary ? String(summary.totalAvailable) : '—'}
            accent={{ light: brand.success.light, dark: brand.success.dark }}
          />
          <SummaryTile
            icon={<IconAlertTriangle size={18} />}
            label="Low stock lines"
            value={summary ? String(summary.lowStockLines) : '—'}
            accent={summary && summary.lowStockLines > 0
              ? { light: brand.error.light, dark: brand.error.dark }
              : { light: brand.neutral[100], dark: brand.neutral[500] }}
          />
        </Stack>
      </Stack>

      {/* Notes */}
      {warehouse.notes && (
        <Box
          sx={{
            p: 2, mb: 3, borderRadius: '12px',
            bgcolor: brand.neutral[50], border: `1px solid ${brand.neutral[200]}`,
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 700, color: brand.neutral[500], textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Notes
          </Typography>
          <Typography variant="body2" sx={{ color: brand.neutral[700], mt: 0.5 }}>
            {warehouse.notes}
          </Typography>
        </Box>
      )}

      {/* Stock levels */}
      <Box sx={{ mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
          Stock levels
        </Typography>
      </Box>
      <DataTable
        tableKey="warehouse-detail-stock"
        columns={stockColumns}
        rows={stockPage?.content ?? []}
        loading={stockLoading}
        page={stockPageNum}
        totalPages={stockPage?.totalPages ?? 1}
        totalElements={stockPage?.totalElements ?? 0}
        pageSize={20}
        onPageChange={setStockPageNum}
        emptyText="No stock records for this warehouse."
        toolbarTitle={stockPage ? `${stockPage.totalElements} stock record${stockPage.totalElements !== 1 ? 's' : ''}` : undefined}
        getRowKey={(sl) => sl.id}
        enableSorting
      />

      <WarehouseEditDrawer
        open={drawerOpen}
        initial={warehouse}
        onClose={() => setDrawerOpen(false)}
        onSaved={(w) => { setWarehouse(w); setDrawerOpen(false); }}
      />
    </Box>
  );
}

function SummaryTile({
  icon, label, value, accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: { light: string; dark: string };
}) {
  return (
    <Card sx={{
      flex: '1 1 0', minWidth: 0, borderRadius: '14px',
      border: `1px solid ${brand.neutral[200]}`,
      boxShadow: `0 1px 2px ${brand.neutral[900]}06`,
    }}>
      <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 } }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{
            width: 36, height: 36, borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: accent.light, color: accent.dark,
          }}>
            {icon}
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {value}
            </Typography>
            <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
              {label}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
