import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  IconButton,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { IconX, IconReceipt, IconCheck, IconCash, IconCoin } from '@tabler/icons-react';
import { getSaleStats, type SaleStats } from 'src/api/smartpos/sales';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;

interface Props {
  open: boolean;
  onClose: () => void;
  warehouseId: string;
}

export default function TodaySalesModal({ open, onClose, warehouseId }: Props) {
  const [stats, setStats] = useState<SaleStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !warehouseId) return;
    setLoading(true);
    setError(null);
    const today = new Date().toISOString().slice(0, 10);
    getSaleStats({ dateFrom: today, dateTo: today, warehouseId })
      .then(setStats)
      .catch(() => setError('Failed to load today\'s sales'))
      .finally(() => setLoading(false));
  }, [open, warehouseId]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <IconReceipt size={22} color={brand.primary[600]} />
        Today's Sales
        <Box sx={{ flex: 1 }} />
        <IconButton onClick={onClose} size="small"><IconX size={18} /></IconButton>
      </DialogTitle>

      <Box sx={{ px: 3, pb: 3 }}>
        {loading ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: '12px' }}>
                <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                  <Skeleton variant="text" width={80} height={14} />
                  <Skeleton variant="text" width={120} height={28} sx={{ mt: 0.5 }} />
                </CardContent>
              </Card>
            ))}
          </Box>
        ) : error ? (
          <Typography sx={{ textAlign: 'center', py: 4, color: brand.error.main, fontWeight: 600 }}>{error}</Typography>
        ) : stats ? (
          <Stack spacing={2}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <StatCard
                icon={<IconReceipt size={20} />}
                label="Total Sales"
                value={fmt(stats.gross)}
                iconBg={brand.primary[50]}
                iconColor={brand.primary[600]}
              />
              <StatCard
                icon={<IconCheck size={20} />}
                label="Amount Paid"
                value={fmt(stats.paid)}
                iconBg={brand.success.light}
                iconColor={brand.success.dark}
              />
              <StatCard
                icon={<IconCash size={20} />}
                label="Net Revenue"
                value={fmt(stats.net)}
                iconBg={brand.warning.light}
                iconColor={brand.warning.dark}
              />
              <StatCard
                icon={<IconCoin size={20} />}
                label="Amount Due"
                value={fmt(stats.due)}
                iconBg={brand.error.light}
                iconColor={brand.error.dark}
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.5 }}>
              <MiniStat label="Orders" value={String(stats.count)} />
              <MiniStat label="Tax" value={fmt(stats.tax)} />
              <MiniStat label="Discount" value={fmt(stats.discount)} />
            </Box>
          </Stack>
        ) : null}
      </Box>
    </Dialog>
  );
}

function StatCard({ icon, label, value, iconBg, iconColor }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: '12px' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, '&:last-child': { pb: 2 } }}>
        <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 600, display: 'block' }}>{label}</Typography>
          <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', color: brand.neutral[900] }} noWrap>{value}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ textAlign: 'center', p: 1, bgcolor: brand.neutral[50], borderRadius: '10px' }}>
      <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 600 }}>{label}</Typography>
      <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', color: brand.neutral[800] }}>{value}</Typography>
    </Box>
  );
}
