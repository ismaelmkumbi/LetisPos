import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Grid,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import {
  IconBox,
  IconPackage,
  IconPlus,
  IconTrendingUp,
} from '@tabler/icons-react';

import { listProducts, type Product } from 'src/api/smartpos/products';
import { formatMoney } from 'src/utils/smartpos/currency';
import { brand } from 'src/theme/smartpos/brand';
import { PageHeader } from 'src/components/smartpos/PageHeader';

const cardSx = {
  borderRadius: '12px',
  border: `1px solid ${brand.neutral[200]}`,
  bgcolor: '#fff',
  boxShadow: `
    0 1px 2px ${brand.neutral[900]}06,
    0 4px 12px ${brand.neutral[900]}05
  `,
  transition: 'box-shadow 0.2s ease, border-color 0.2s ease, transform 0.2s ease',
  height: '100%',
  '&:hover': {
    boxShadow: `
      0 4px 16px ${brand.neutral[900]}0D,
      0 8px 28px ${brand.neutral[900]}10
    `,
    borderColor: brand.primary[300],
    transform: 'translateY(-2px)',
  },
};

function totalCost(product: Product): number {
  return (product.comboItems ?? []).reduce(
    (sum, item) => sum + (item.unitCost ?? 0) * (item.qty ?? 1),
    0,
  );
}

function componentCount(product: Product): number {
  return (product.comboItems ?? []).length;
}

function margin(product: Product): number {
  const cost = totalCost(product);
  if (!cost || !product.price) return 0;
  return ((product.price - cost) / product.price) * 100;
}

export default function BundlesListPage() {
  const navigate = useNavigate();
  const [bundles, setBundles] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listProducts({ size: 200 })
      .then((page) => {
        if (cancelled) return;
        setBundles(page.content.filter((p) => p.type === 'COMBO'));
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load bundles');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <Box sx={{ pb: 3 }}>
        <PageHeader title="Bundles / Kits" subtitle="Combo products and kits" />
        <Grid container spacing={2}>
          {[1, 2, 3].map((n) => (
            <Grid key={n} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Skeleton variant="rounded" height={220} sx={{ borderRadius: '12px' }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 3 }}>
      <PageHeader
        title="Bundles / Kits"
        subtitle={`${bundles.length} combo product${bundles.length !== 1 ? 's' : ''}`}
        actions={[
          {
            label: 'Create Bundle',
            icon: <IconPlus size={17} />,
            onClick: () => navigate('/smartpos/products/new?type=COMBO'),
            variant: 'primary',
          },
        ]}
      />

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {bundles.length === 0 ? (
        <Card
          sx={{
            borderRadius: '16px',
            border: `2px dashed ${brand.neutral[200]}`,
            bgcolor: brand.neutral[50],
            p: 6,
            textAlign: 'center',
          }}
        >
          <Stack alignItems="center" spacing={2}>
            <IconPackage size={48} color={brand.neutral[400]} />
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: 18, color: brand.neutral[700] }}>
                No bundles yet
              </Typography>
              <Typography sx={{ color: brand.neutral[500], mt: 0.5 }}>
                Create your first combo product to bundle items together.
              </Typography>
            </Box>
            <Button
              variant="contained"
              component={RouterLink}
              to="/smartpos/products/new?type=COMBO"
              startIcon={<IconPlus size={16} />}
              sx={{
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 700,
              }}
            >
              Create Bundle
            </Button>
          </Stack>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {bundles.map((bundle) => (
            <Grid key={bundle.id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Card sx={cardSx}>
                <CardActionArea
                  component={RouterLink}
                  to={`/smartpos/products/${bundle.id}`}
                  sx={{ height: '100%' }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack spacing={1.5}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box
                          sx={{
                            width: 44,
                            height: 44,
                            borderRadius: '12px',
                            bgcolor: brand.primary[50],
                            color: brand.primary[600],
                            display: 'grid',
                            placeItems: 'center',
                          }}
                        >
                          <IconPackage size={22} />
                        </Box>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography
                            noWrap
                            sx={{ fontWeight: 800, fontSize: 16, color: brand.neutral[900] }}
                          >
                            {bundle.name}
                          </Typography>
                          <Typography
                            noWrap
                            variant="caption"
                            sx={{ color: brand.neutral[500] }}
                          >
                            {bundle.code}
                          </Typography>
                        </Box>
                      </Stack>

                      <Stack direction="row" spacing={1}>
                        <Chip
                          icon={<IconBox size={14} />}
                          label={`${componentCount(bundle)} components`}
                          size="small"
                          sx={{
                            fontWeight: 600,
                            fontSize: 11,
                            bgcolor: brand.neutral[100],
                            borderRadius: '8px',
                          }}
                        />
                        <Chip
                          icon={<IconTrendingUp size={14} />}
                          label={`${margin(bundle).toFixed(0)}% margin`}
                          size="small"
                          sx={{
                            fontWeight: 600,
                            fontSize: 11,
                            bgcolor:
                              margin(bundle) > 0 ? brand.success.light : brand.error.light,
                            color:
                              margin(bundle) > 0 ? brand.success.dark : brand.error.dark,
                            borderRadius: '8px',
                          }}
                        />
                      </Stack>

                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: 1,
                          p: 1.5,
                          borderRadius: '10px',
                          bgcolor: brand.neutral[50],
                        }}
                      >
                        <Box>
                          <Typography sx={{ fontSize: 10, color: brand.neutral[500], fontWeight: 600 }}>
                            Component Cost
                          </Typography>
                          <Typography sx={{ fontWeight: 800, color: brand.neutral[800] }}>
                            {formatMoney(totalCost(bundle))}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography sx={{ fontSize: 10, color: brand.neutral[500], fontWeight: 600 }}>
                            Sell Price
                          </Typography>
                          <Typography
                            sx={{ fontWeight: 800, color: brand.primary[600] }}
                          >
                            {formatMoney(bundle.price)}
                          </Typography>
                        </Box>
                      </Box>
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
