import React, { useState, useEffect } from 'react';
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

const moreLinks = [
  { icon: <IconUsers size={20} strokeWidth={1.8} />, label: 'Customers', path: '/smartpos/customers' },
  { icon: <IconTruck size={20} strokeWidth={1.8} />, label: 'Suppliers', path: '/smartpos/suppliers' },
  { icon: <IconBuildingWarehouse size={20} strokeWidth={1.8} />, label: 'Warehouses', path: '/smartpos/warehouses' },
  { icon: <IconArrowBackUp size={20} strokeWidth={1.8} />, label: 'Returns', path: '/smartpos/returns' },
  { icon: <IconCalculator size={20} strokeWidth={1.8} />, label: 'Accounting', path: '/smartpos/accounting/chart-of-accounts' },
  { icon: <IconChartBar size={20} strokeWidth={1.8} />, label: 'Reports', path: '/smartpos/reports' },
  { icon: <IconSparkles size={20} strokeWidth={1.8} />, label: 'Insights', path: '/smartpos/ai' },
  { icon: <IconUsersGroup size={20} strokeWidth={1.8} />, label: 'HRM', path: '/smartpos/hrm/employees' },
  { icon: <IconBell size={20} strokeWidth={1.8} />, label: 'Notifications', path: '/smartpos/notifications/templates' },
  { icon: <IconPlug size={20} strokeWidth={1.8} />, label: 'Integrations', path: '/smartpos/integrations' },
  { icon: <IconSettings size={20} strokeWidth={1.8} />, label: 'Settings', path: '/smartpos/settings' },
];

const MoreMenuSheet: React.FC = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => setOpen((v) => !v);
    window.addEventListener('toggle-more-menu', handler);
    return () => window.removeEventListener('toggle-more-menu', handler);
  }, []);

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
          {moreLinks.map((link) => (
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
