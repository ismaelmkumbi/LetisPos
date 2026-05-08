import React from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  Box, Paper, Stack, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import {
  IconDashboard, IconReceipt, IconPackage,
  IconCoin, IconDots,
} from '@tabler/icons-react';
import { brand } from 'src/theme/smartpos/brand';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  matchPaths: string[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    icon: <IconDashboard size={22} strokeWidth={1.8} />,
    path: '/smartpos/dashboard',
    matchPaths: ['/smartpos/dashboard', '/smartpos'],
  },
  {
    label: 'Sales',
    icon: <IconReceipt size={22} strokeWidth={1.8} />,
    path: '/smartpos/sales',
    matchPaths: ['/smartpos/sales', '/smartpos/quotations', '/smartpos/returns', '/smartpos/sales/pos'],
  },
  {
    label: 'Inventory',
    icon: <IconPackage size={22} strokeWidth={1.8} />,
    path: '/smartpos/products',
    matchPaths: ['/smartpos/products', '/smartpos/stock', '/smartpos/warehouses', '/smartpos/stock/adjustments', '/smartpos/stock/transfers', '/smartpos/stock/counts'],
  },
  {
    label: 'Money',
    icon: <IconCoin size={22} strokeWidth={1.8} />,
    path: '/smartpos/payments',
    matchPaths: ['/smartpos/payments', '/smartpos/purchases', '/smartpos/expenses', '/smartpos/accounts', '/smartpos/transfers', '/smartpos/accounting'],
  },
  {
    label: 'More',
    icon: <IconDots size={22} strokeWidth={1.8} />,
    path: '',
    matchPaths: [],
  },
];

const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (!isMobile) return null;

  const isActive = (item: NavItem) =>
    item.matchPaths.some((p) => location.pathname.startsWith(p));

  return (
    <Paper
      elevation={0}
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1200,
        bgcolor: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: `1px solid ${brand.neutral[200]}`,
        pb: 'env(safe-area-inset-bottom, 0px)',
        borderRadius: 0,
      }}
    >
      <Stack direction="row" justifyContent="space-around" sx={{ height: 60, px: 0.5 }}>
        {navItems.map((item) => {
          const active = item.label === 'More' ? false : isActive(item);
          const activeColor = active ? brand.primary[600] : brand.neutral[500];

          return (
            <Box
              key={item.label}
              onClick={() => {
                if (item.label === 'More') {
                  // Dispatch event for More bottom sheet
                  window.dispatchEvent(new CustomEvent('toggle-more-menu'));
                } else {
                  navigate(item.path);
                }
              }}
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.3,
                cursor: 'pointer',
                position: 'relative',
                WebkitTapHighlightColor: 'transparent',
                transition: 'color 0.15s ease',
                color: activeColor,
                '&:active': { opacity: 0.7 },
              }}
            >
              {active && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 24,
                    height: 3,
                    borderRadius: '0 0 3px 3px',
                    bgcolor: brand.primary[600],
                  }}
                />
              )}
              {item.icon}
              <Typography
                sx={{
                  fontSize: 10,
                  fontWeight: active ? 700 : 500,
                  lineHeight: 1,
                  letterSpacing: active ? '-0.01em' : 0,
                }}
              >
                {item.label}
              </Typography>
            </Box>
          );
        })}
      </Stack>
    </Paper>
  );
};

export default MobileBottomNav;
