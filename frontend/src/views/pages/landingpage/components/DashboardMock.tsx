import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import {
  IconBellRinging,
  IconCashRegister,
  IconChartBar,
  IconCreditCard,
  IconReceipt,
  IconScan,
  IconShoppingCart,
} from '@tabler/icons-react';

interface Metric {
  label: string;
  value: string;
  change: string;
  positive: boolean;
}

const metrics: Metric[] = [
  { label: 'Net sales', value: 'TSh 3.6M', change: '+18.2%', positive: true },
  { label: 'Stock risk', value: '5 items', change: 'restock', positive: false },
  { label: 'Orders', value: '37', change: '+8 today', positive: true },
];

const recentSales = [
  { item: 'Rice 5kg', price: 'TSh 12,500', time: '2m ago' },
  { item: 'Cooking Oil 1L', price: 'TSh 7,200', time: '8m ago' },
  { item: 'Milk 500ml x3', price: 'TSh 5,400', time: '14m ago' },
];

const quickActions = [
  { icon: <IconScan size={18} />, label: 'Scan' },
  { icon: <IconShoppingCart size={18} />, label: 'Cart' },
  { icon: <IconCreditCard size={18} />, label: 'Pay' },
];

const DashboardMock: React.FC = () => {
  return (
    <Box
      sx={{
        bgcolor: 'rgba(17, 24, 39, 0.92)',
        borderRadius: { xs: '18px', md: '22px' },
        border: '1px solid var(--lp-border)',
        overflow: 'hidden',
        p: { xs: 1.5, sm: 2 },
        boxShadow: '0 28px 80px rgba(0,0,0,0.45)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1.5,
          pb: 1.5,
          borderBottom: '1px solid var(--lp-border)',
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: '10px',
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'var(--lp-accent-soft)',
              color: 'var(--lp-accent)',
            }}
          >
            <IconCashRegister size={19} />
          </Box>
          <Box>
            <Typography
              sx={{
                fontFamily: 'var(--lp-font-display)',
                fontSize: '0.95rem',
                fontWeight: 800,
                color: 'var(--lp-text)',
              }}
            >
              Letis Sales Desk
            </Typography>
            <Typography sx={{ fontSize: '0.68rem', color: 'var(--lp-text-muted)' }}>
              Live counter view
            </Typography>
          </Box>
        </Stack>
        <Box sx={{ display: 'flex', gap: 0.75 }}>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'var(--lp-accent)' }} />
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'var(--lp-border)' }} />
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'var(--lp-border)' }} />
        </Box>
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 1.5 }}>
        {metrics.map((metric) => (
          <Box
            key={metric.label}
            sx={{
              flex: 1,
              p: 1.25,
              borderRadius: '14px',
              bgcolor: metric.positive ? 'var(--lp-accent-soft)' : 'rgba(245, 158, 11, 0.1)',
              border: '1px solid var(--lp-border)',
            }}
          >
            <Typography
              sx={{
                fontSize: '0.62rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 0,
                color: 'var(--lp-text-muted)',
                mb: 0.5,
              }}
            >
              {metric.label}
            </Typography>
            <Typography
              sx={{
                fontFamily: 'var(--lp-font-display)',
                fontSize: '1rem',
                fontWeight: 800,
                color: 'var(--lp-text)',
                mb: 0.25,
              }}
            >
              {metric.value}
            </Typography>
            <Typography
              sx={{
                fontSize: '0.62rem',
                fontWeight: 800,
                color: metric.positive ? 'var(--lp-accent)' : '#FBBF24',
              }}
            >
              {metric.change}
            </Typography>
          </Box>
        ))}
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1.05fr 0.95fr' },
          gap: 1.25,
          mb: 1.5,
        }}
      >
        <Box
          sx={{
            p: 1.4,
            borderRadius: '16px',
            border: '1px solid var(--lp-border)',
            bgcolor: 'rgba(255,255,255,0.035)',
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" mb={1.2}>
            <Stack direction="row" spacing={0.8} alignItems="center">
              <IconChartBar size={16} color="var(--lp-accent)" />
              <Typography sx={{ fontSize: '0.74rem', fontWeight: 800 }}>Sales pulse</Typography>
            </Stack>
            <Typography sx={{ fontSize: '0.68rem', color: 'var(--lp-text-muted)' }}>Today</Typography>
          </Stack>
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.55, height: 70 }}>
            {[36, 58, 45, 72, 54, 92, 70, 60, 78, 88, 64, 96].map((height, index) => (
              <Box
                key={index}
                sx={{
                  flex: 1,
                  height: `${height}%`,
                  borderRadius: '5px 5px 2px 2px',
                  bgcolor: index > 8 ? 'var(--lp-accent)' : 'rgba(74, 222, 128, 0.16)',
                }}
              />
            ))}
          </Box>
        </Box>

        <Box
          sx={{
            p: 1.4,
            borderRadius: '16px',
            border: '1px solid rgba(245, 158, 11, 0.28)',
            bgcolor: 'rgba(245, 158, 11, 0.09)',
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center" mb={1.2}>
            <IconBellRinging size={17} color="#FBBF24" />
            <Typography sx={{ fontSize: '0.74rem', fontWeight: 800 }}>Action needed</Typography>
          </Stack>
          <Typography
            sx={{
              fontFamily: 'var(--lp-font-display)',
              fontSize: '1.35rem',
              fontWeight: 800,
              color: 'var(--lp-text)',
              lineHeight: 1.1,
              mb: 0.8,
            }}
          >
            5 low-stock items
          </Typography>
          <Typography sx={{ fontSize: '0.72rem', color: 'var(--lp-text-muted)', lineHeight: 1.45 }}>
            Restock before the weekend rush.
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 88px' },
          gap: 1.25,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: '0.68rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: 0,
              color: 'var(--lp-text-muted)',
              mb: 0.9,
            }}
          >
            Recent sales
          </Typography>
          <Stack spacing={0.65}>
            {recentSales.map((sale) => (
              <Box
                key={sale.item}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: 0.75,
                  px: 1,
                  borderRadius: '10px',
                  bgcolor: 'rgba(255,255,255,0.025)',
                }}
              >
                <Stack direction="row" spacing={0.8} alignItems="center" sx={{ minWidth: 0 }}>
                  <IconReceipt size={15} color="var(--lp-accent)" />
                  <Typography
                    sx={{
                      fontSize: '0.72rem',
                      color: 'var(--lp-text)',
                      fontWeight: 650,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {sale.item}
                  </Typography>
                </Stack>
                <Stack alignItems="flex-end" sx={{ flexShrink: 0, ml: 1 }}>
                  <Typography
                    sx={{
                      fontFamily: 'var(--lp-font-display)',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      color: 'var(--lp-text)',
                    }}
                  >
                    {sale.price}
                  </Typography>
                  <Typography sx={{ fontSize: '0.56rem', color: 'var(--lp-text-muted)' }}>
                    {sale.time}
                  </Typography>
                </Stack>
              </Box>
            ))}
          </Stack>
        </Box>

        <Box sx={{ display: { xs: 'none', sm: 'grid' }, gap: 0.7 }}>
          {quickActions.map((item) => (
            <Box
              key={item.label}
              sx={{
                minHeight: 54,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 0.25,
                borderRadius: '13px',
                bgcolor: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--lp-border)',
                color: 'var(--lp-accent)',
              }}
            >
              {item.icon}
              <Typography sx={{ fontSize: '0.62rem', color: 'var(--lp-text-muted)', fontWeight: 800 }}>
                {item.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default DashboardMock;
