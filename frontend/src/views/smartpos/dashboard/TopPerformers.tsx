import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActionArea,
  LinearProgress,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router';
import { useContext } from 'react';
import { CustomizerContext } from 'src/context/CustomizerContext';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';
import { cardSx, titleColor, muted } from './utils';
import EmptyPanel from './EmptyPanel';
import {
  getTopProductsV2,
  getTopCustomersV2,
  getTopSuppliersV2,
  type TopPerformer,
  type Period,
} from 'src/api/smartpos/reports';
import type { UUID } from 'src/api/smartpos/types';

type TabKey = 'products' | 'customers' | 'suppliers';

interface TopPerformersProps {
  period: Period;
  warehouseId: UUID | '';
  limit?: number;
}

function PerformerRow({
  rank,
  performer,
  valueLabel,
  onClick,
  isDark,
}: {
  rank: number;
  performer: TopPerformer;
  valueLabel: string;
  onClick: () => void;
  isDark: boolean;
}) {
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: '8px',
        border: 'none',
        bgcolor: 'transparent',
        '&:hover': { bgcolor: isDark ? brand.neutral[800] : brand.neutral[50] },
        transition: 'background-color 0.15s ease',
      }}
    >
      <CardActionArea onClick={onClick} sx={{ borderRadius: '8px' }}>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.5}
          sx={{ px: 1.5, py: 1 }}
        >
          <Typography
            sx={{
              fontWeight: 900,
              fontSize: 14,
              color: rank <= 3 ? brand.primary[600] : brand.neutral[500],
              minWidth: 20,
              textAlign: 'center',
            }}
          >
            {rank}
          </Typography>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: 13,
                color: titleColor,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {performer.name}
            </Typography>
            <Box
              sx={{
                mt: 0.3,
                height: 4,
                borderRadius: '2px',
                bgcolor: isDark ? brand.neutral[700] : brand.neutral[100],
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  height: '100%',
                  width: `${Math.min(performer.percentage, 100)}%`,
                  borderRadius: '2px',
                  bgcolor: brand.primary[600],
                  transition: 'width 0.4s ease',
                }}
              />
            </Box>
          </Box>
          <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 13, color: titleColor }}>
              {valueLabel}
            </Typography>
            <Typography sx={{ fontSize: 11, color: brand.neutral[500] }}>
              {performer.percentage.toFixed(1)}%
            </Typography>
          </Box>
        </Stack>
      </CardActionArea>
    </Card>
  );
}

export default function TopPerformers({
  period,
  warehouseId,
  limit = 5,
}: TopPerformersProps) {
  const { activeMode: _am } = useContext(CustomizerContext);
  const isDark = _am === 'dark';
  const navigate = useNavigate();

  const [tab, setTab] = useState<TabKey>('products');
  const [products, setProducts] = useState<TopPerformer[]>([]);
  const [customers, setCustomers] = useState<TopPerformer[]>([]);
  const [suppliers, setSuppliers] = useState<TopPerformer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const wid = warehouseId || undefined;
      const [p, c, s] = await Promise.all([
        getTopProductsV2({ period, warehouseId: wid, limit }),
        getTopCustomersV2({ period, warehouseId: wid, limit }),
        getTopSuppliersV2({ period, warehouseId: wid, limit }),
      ]);
      setProducts(p);
      setCustomers(c);
      setSuppliers(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [period, warehouseId, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const currentList: TopPerformer[] =
    tab === 'products' ? products : tab === 'customers' ? customers : suppliers;

  const handleRowClick = (performer: TopPerformer) => {
    if (tab === 'products') navigate(`/smartpos/products/${performer.id}`);
    else if (tab === 'customers') navigate(`/smartpos/sales?customerId=${performer.id}`);
    else navigate(`/smartpos/purchases?supplierId=${performer.id}`);
  };

  const formatValue = (v: number) => formatMoney(v);

  return (
    <Card elevation={0} sx={{ ...cardSx(isDark), height: '100%' }}>
      <CardContent sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 800, color: titleColor, fontSize: 18, mb: 1 }}>
          Top Performers
        </Typography>

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v as TabKey)}
          variant="fullWidth"
          sx={{
            mb: 1.5,
            minHeight: 36,
            '& .MuiTab-root': {
              minHeight: 36,
              textTransform: 'none',
              fontWeight: 700,
              fontSize: 12.5,
              py: 0.5,
            },
            '& .MuiTabs-indicator': { height: 2 },
          }}
        >
          <Tab label="Products" value="products" />
          <Tab label="Customers" value="customers" />
          <Tab label="Suppliers" value="suppliers" />
        </Tabs>

        {loading && (
          <LinearProgress sx={{ mb: 1, borderRadius: '4px' }} />
        )}

        {error && (
          <Typography sx={{ color: brand.error.main, fontSize: 12, mb: 1 }}>
            {error}
          </Typography>
        )}

        {!loading && !error && currentList.length === 0 && (
          <EmptyPanel
            title="No data yet"
            subtitle={`No top ${tab} data available for this period.`}
            height={160}
            compact
          />
        )}

        {!loading && currentList.length > 0 && (
          <Stack spacing={0.25}>
            {currentList.map((item, idx) => (
              <PerformerRow
                key={item.id}
                rank={idx + 1}
                performer={item}
                valueLabel={formatValue(item.value)}
                onClick={() => handleRowClick(item)}
                isDark={isDark}
              />
            ))}
          </Stack>
        )}

        {!loading && currentList.length > 0 && (
          <Typography
            sx={{
              color: muted(isDark),
              fontSize: 11,
              mt: 1.5,
              textAlign: 'center',
            }}
          >
            Click a row to view details
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
