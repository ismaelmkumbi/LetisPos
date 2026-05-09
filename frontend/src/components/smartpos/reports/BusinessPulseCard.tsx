import { useState, useEffect } from 'react';
import { Card, CardContent, Skeleton, Stack, Typography, Chip } from '@mui/material';
import { IconSparkles, IconArrowRight } from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import { aiNarrate } from 'src/api/smartpos/ai';
import { getDashboard } from 'src/api/smartpos/reports';
import { brand } from 'src/theme/smartpos/brand';

interface PulseLink {
  label: string;
  to: string;
}

export default function BusinessPulseCard() {
  const [loading, setLoading] = useState(true);
  const [narrative, setNarrative] = useState<string | null>(null);
  const [links, setLinks] = useState<PulseLink[]>([]);
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const dash = await getDashboard({ period: 'MONTH' });
        if (cancelled) return;
        const facts = {
          grossSales: dash.sales.gross,
          netSales: dash.sales.net,
          orderCount: dash.sales.count,
          lowStock: dash.inventory.lowStockLines,
          netProfit: dash.netProfit,
          expenses: dash.expenses.total,
          period: 'this month',
        };
        const result = await aiNarrate({
          reportKind: 'BUSINESS_PULSE',
          factsJson: JSON.stringify(facts),
        });
        if (cancelled) return;
        setNarrative(result.narrative);
        setLinks([
          { label: 'View Sales Report', to: '/smartpos/reports/sales' },
          { label: 'View Profit & Loss', to: '/smartpos/reports/profit-loss' },
        ]);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  if (error) return null;

  return (
    <Card elevation={0} sx={{ borderRadius: '16px', background: 'linear-gradient(135deg, #0F172A 0%, #14532D 100%)', color: '#fff', mb: 2, overflow: 'hidden' }}>
      <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <Chip label="LIVE" size="small" icon={<IconSparkles size={12} />}
            sx={{ bgcolor: brand.primary[500], color: '#fff', fontWeight: 800, fontSize: '0.65rem', height: 22, borderRadius: '6px', '& .MuiChip-icon': { color: '#fff', ml: 0.5 } }} />
          <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', opacity: 0.8 }}>Business Pulse · This Month</Typography>
        </Stack>
        {loading ? (
          <Stack spacing={1}>
            <Skeleton variant="text" sx={{ bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '4px' }} />
            <Skeleton variant="text" width="80%" sx={{ bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '4px' }} />
            <Skeleton variant="text" width="60%" sx={{ bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '4px' }} />
          </Stack>
        ) : (
          <>
            <Typography sx={{ fontSize: '0.875rem', lineHeight: 1.7, opacity: 0.92, mb: 2 }}>
              {narrative}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ gap: 0.75 }}>
              {links.map((link) => (
                <Chip key={link.to} label={link.label} onClick={() => navigate(link.to)}
                  onDelete={() => navigate(link.to)} deleteIcon={<IconArrowRight size={14} />}
                  sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: '#fff', fontWeight: 600, fontSize: '0.7rem', borderRadius: '6px', cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }, '& .MuiChip-deleteIcon': { color: brand.primary[300] } }} />
              ))}
            </Stack>
          </>
        )}
      </CardContent>
    </Card>
  );
}
