import { useState } from 'react';
import {
  Box,
  Chip,
  ListItemIcon,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material';
import { IconBuilding } from '@tabler/icons-react';
import { useAuth } from 'src/context/smartpos/AuthContext';
import { brand } from 'src/theme/smartpos/brand';

export default function TenantSwitcher() {
  const { user, tenants, switchTenant } = useAuth();
  const tenantName = user?.tenantName || user?.tenantSlug || 'Default Workspace';
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const hasMultiple = tenants.length > 1;

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    if (!hasMultiple) return;
    setAnchorEl(e.currentTarget);
  };

  const handleSelect = async (tenantId: string) => {
    setAnchorEl(null);
    await switchTenant(tenantId);
  };

  return (
    <>
      <Box
        onClick={handleOpen}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          px: 1.25,
          py: 0.6,
          borderRadius: '8px',
          bgcolor: brand.primary[50],
          border: `1px solid ${brand.primary[200]}`,
          maxWidth: 180,
          cursor: hasMultiple ? 'pointer' : 'default',
          transition: 'background-color 0.15s',
          '&:hover': hasMultiple
            ? { bgcolor: brand.primary[100] }
            : undefined,
        }}
      >
        <IconBuilding size={14} stroke={2} style={{ color: brand.primary[600], flexShrink: 0 }} />
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            color: brand.primary[700],
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {tenantName}
        </Typography>
      </Box>

      {hasMultiple && (
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          slotProps={{ paper: { sx: { mt: 0.5, minWidth: 200 } } }}
        >
          {tenants.map((t) => {
            const active = t.id === user?.tenantId;
            return (
              <MenuItem
                key={t.id}
                selected={active}
                onClick={() => handleSelect(t.id)}
                sx={{ gap: 1.5 }}
              >
                <ListItemIcon sx={{ minWidth: 'auto' }}>
                  <IconBuilding size={16} stroke={1.8} />
                </ListItemIcon>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight={active ? 600 : 400}>
                    {t.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t.billingPlan}
                  </Typography>
                </Box>
                {active && (
                  <Chip label="Active" size="small" color="primary" sx={{ height: 20, fontSize: 10 }} />
                )}
              </MenuItem>
            );
          })}
        </Menu>
      )}
    </>
  );
}
