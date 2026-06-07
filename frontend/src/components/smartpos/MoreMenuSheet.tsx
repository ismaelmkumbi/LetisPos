import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Box, Drawer, Typography, Stack, IconButton, Divider,
} from '@mui/material';
import {
  IconUsers, IconTruck, IconChartBar, IconSparkles,
  IconSettings, IconUsersGroup, IconBell, IconPlug,
  IconX, IconCalculator, IconBuildingWarehouse, IconArrowBackUp,
} from '@tabler/icons-react';
import { brand } from 'src/theme/smartpos/brand';
import { useFeatures } from 'src/hooks/useFeatures';

interface MoreLink {
  icon: React.ReactNode;
  label: string;
  path: string;
  /** The user must have this feature key to see this link. */
  requireFeature?: string;
}

const moreLinks: MoreLink[] = [
  { icon: <IconUsers size={20} strokeWidth={1.8} />, label: 'Customers', path: '/smartpos/customers', requireFeature: 'customer.view' },
  { icon: <IconTruck size={20} strokeWidth={1.8} />, label: 'Suppliers', path: '/smartpos/suppliers', requireFeature: 'purchase.view' },
  { icon: <IconBuildingWarehouse size={20} strokeWidth={1.8} />, label: 'Warehouses', path: '/smartpos/warehouses', requireFeature: 'product.view' },
  { icon: <IconArrowBackUp size={20} strokeWidth={1.8} />, label: 'Returns', path: '/smartpos/returns', requireFeature: 'sale.view' },
  { icon: <IconCalculator size={20} strokeWidth={1.8} />, label: 'Accounting', path: '/smartpos/accounting/chart-of-accounts', requireFeature: 'accounting.module' },
  { icon: <IconChartBar size={20} strokeWidth={1.8} />, label: 'Reports', path: '/smartpos/reports', requireFeature: 'report.hub' },
  { icon: <IconSparkles size={20} strokeWidth={1.8} />, label: 'Insights', path: '/smartpos/ai', requireFeature: 'ai.module' },
  { icon: <IconUsersGroup size={20} strokeWidth={1.8} />, label: 'HRM', path: '/smartpos/hrm/employees', requireFeature: 'hrm.module' },
  { icon: <IconBell size={20} strokeWidth={1.8} />, label: 'Notifications', path: '/smartpos/notifications/templates', requireFeature: 'notification.view' },
  { icon: <IconPlug size={20} strokeWidth={1.8} />, label: 'Integrations', path: '/smartpos/integrations', requireFeature: 'integration.module' },
  { icon: <IconSettings size={20} strokeWidth={1.8} />, label: 'Settings', path: '/smartpos/settings', requireFeature: 'setting.manage' },
];

const MoreMenuSheet: React.FC = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { hasFeature } = useFeatures();

  useEffect(() => {
    const handler = () => setOpen((v) => !v);
    window.addEventListener('toggle-more-menu', handler);
    return () => window.removeEventListener('toggle-more-menu', handler);
  }, []);

  // Only show links the user has the required feature for (or links with no requirement).
  const visibleLinks = useMemo(
    () => moreLinks.filter((link) => !link.requireFeature || hasFeature(link.requireFeature)),
    [hasFeature],
  );

  const handleNav = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={() => setOpen(false)}
      PaperProps={{
        sx: {
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          maxHeight: '70vh',
          bgcolor: '#FFFFFF',
          pb: 'env(safe-area-inset-bottom, 16px)',
          pt: 1,
        },
      }}
    >
      {/* Handle */}
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1, pb: 1.5 }}>
        <Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: brand.neutral[200] }} />
      </Box>

      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2.5, pb: 1.5 }}>
        <Typography sx={{ fontWeight: 800, fontSize: 18, color: brand.neutral[900] }}>
          More
        </Typography>
        <IconButton size="small" onClick={() => setOpen(false)}>
          <IconX size={18} />
        </IconButton>
      </Stack>

      <Divider />

      {/* Grid of links */}
      <Box sx={{ px: 2, pt: 2, pb: 2 }}>
        <Stack direction="row" flexWrap="wrap" useFlexGap sx={{ gap: 0.75 }}>
          {visibleLinks.map((link) => (
            <Box
              key={link.label}
              onClick={() => handleNav(link.path)}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.75,
                p: 1.25,
                width: 'calc(25% - 3px)',
                minWidth: 72,
                borderRadius: '12px',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
                transition: 'background 0.15s ease',
                '&:active': { bgcolor: brand.neutral[100] },
              }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  bgcolor: brand.neutral[50],
                  border: `1px solid ${brand.neutral[200]}`,
                  display: 'grid',
                  placeItems: 'center',
                  color: brand.neutral[600],
                }}
              >
                {link.icon}
              </Box>
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: brand.neutral[700], textAlign: 'center' }}>
                {link.label}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Box>
    </Drawer>
  );
};

export default MoreMenuSheet;
