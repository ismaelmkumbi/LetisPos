/**
 * Drug Catalog — pharmacy-specific product listing with batch/expiry/Rx badges.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import { IconPill } from '@tabler/icons-react';
import {
  listProducts,
  type Product,
} from 'src/api/smartpos/products';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import EmptyStateGuide from 'src/components/smartpos/EmptyStateGuide';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;

type PharmaExt = Record<string, unknown> | undefined;

function ph(p: Product): PharmaExt {
  return p.verticalExtensions?.pharmacy as PharmaExt;
}

function str(v: unknown, fallback = '—'): string {
  return typeof v === 'string' ? v : fallback;
}

function isExpired(dateStr: unknown): boolean {
  if (typeof dateStr !== 'string') return false;
  return new Date(dateStr) < new Date();
}

function isRx(e: PharmaExt): boolean {
  return e?.prescriptionRequired === true || e?.prescriptionRequired === 'true';
}

export default function DrugCatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 25;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listProducts({
        status: true,
        page,
        size: pageSize,
        sort: 'name,asc',
      });
      const pharmacyProducts = (result.content ?? []).filter(
        (p) => p.verticalExtensions?.pharmacy,
      );
      setProducts(pharmacyProducts);
      setTotalElements(pharmacyProducts.length);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const columns: Column<Product>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Drug',
        width: 300,
        sortable: true,
        render: (p) => {
          const e = ph(p);
          return (
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar
                src={p.imageUrl ?? undefined}
                variant="rounded"
                sx={{
                  bgcolor: '#FCE4EC', color: '#E91E63',
                  width: 36, height: 36, fontSize: 14, fontWeight: 700,
                  borderRadius: '8px',
                }}
              >
                <IconPill size={18} />
              </Avatar>
              <Box>
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                    {p.name}
                  </Typography>
                  {isRx(e) && (
                    <Chip label="Rx" size="small" sx={{
                      height: 18, fontSize: '0.625rem', fontWeight: 700,
                      bgcolor: '#FCE4EC', color: '#E91E63',
                    }} />
                  )}
                </Stack>
                <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
                  {p.code}{e?.genericName ? ` · ${str(e?.genericName)}` : ''}
                </Typography>
              </Box>
            </Stack>
          );
        },
      },
      {
        key: 'strength',
        label: 'Strength',
        width: 110,
        render: (p) => (
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {str(ph(p)?.strength)}
          </Typography>
        ),
      },
      {
        key: 'dosage',
        label: 'Form',
        width: 100,
        render: (p) => (
          <Chip
            label={str(ph(p)?.dosageForm)}
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.6875rem' }}
          />
        ),
      },
      {
        key: 'batch',
        label: 'Batch',
        width: 130,
        render: (p) => {
          const e = ph(p);
          return (
            <Stack spacing={0.25}>
              <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                {str(e?.batchNumber)}
              </Typography>
              {e?.expiryDate ? (
                <Typography variant="caption" sx={{
                  fontSize: '0.625rem',
                  color: isExpired(e.expiryDate) ? 'error.main' : brand.neutral[500],
                }}>
                  Exp: {String(e.expiryDate)}
                </Typography>
              ) : null}
            </Stack>
          );
        },
      },
      {
        key: 'storage',
        label: 'Storage',
        width: 120,
        render: (p) => {
          const sc = str(ph(p)?.storageCondition, 'ROOM_TEMP');
          const labels: Record<string, string> = {
            ROOM_TEMP: 'Room Temp',
            REFRIGERATED: '2-8°C',
            FROZEN: 'Frozen',
          };
          return (
            <Chip
              label={labels[sc] ?? sc}
              size="small"
              sx={{
                height: 22, fontSize: '0.6875rem',
                bgcolor: sc === 'FROZEN' ? '#E3F2FD' : sc === 'REFRIGERATED' ? '#E8F5E9' : brand.neutral[100],
                color: sc === 'FROZEN' ? '#1565C0' : sc === 'REFRIGERATED' ? '#2E7D32' : brand.neutral[600],
              }}
            />
          );
        },
      },
      {
        key: 'nda',
        label: 'NDA/TFDA',
        width: 130,
        render: (p) => (
          <Typography variant="body2" sx={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
            {str(ph(p)?.ndaRegistration)}
          </Typography>
        ),
      },
      {
        key: 'price',
        label: 'Price',
        width: 100,
        sortable: true,
        align: 'right',
        render: (p) => (
          <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'right' }}>
            {fmt(p.price)}
          </Typography>
        ),
      },
    ],
    [],
  );

  return (
    <Box>
      <PageHeader
        title="Drug Catalog"
        subtitle="Pharmacy products with batch tracking, expiry monitoring, and NDA compliance."
        breadcrumbs={[
          { label: 'Dashboard', href: '/smartpos' },
          { label: 'Pharmacy' },
          { label: 'Drug Catalog' },
        ]}
      />
      {!loading && products.length === 0 ? (
        <EmptyStateGuide
          icon={<IconPill size={48} />}
          title="No pharmacy products yet"
          subtitle="Add products with pharmacy details (NDA registration, batch number, dosage form) and they'll appear here."
          action={{ label: 'Go to Products', to: '/smartpos/products' }}
        />
      ) : (
        <DataTable
          columns={columns}
          rows={products}
          loading={loading}
          totalElements={totalElements}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          itemLabel="drugs"
        />
      )}
    </Box>
  );
}
