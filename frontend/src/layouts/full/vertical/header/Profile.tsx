/**
 * Letis POS — Header profile dropdown.
 *
 * Wired to AuthContext. Shows real user identity, tenant info,
 * quick links, and sign-out. Professional SaaS-grade design.
 */
import React, { useState } from 'react';
import { Link } from 'react-router';
import {
  Avatar, Box, Button, Chip, Divider, IconButton, ListItemIcon,
  Menu, MenuItem, Stack, Typography, keyframes,
} from '@mui/material';
import {
  IconCreditCard, IconLogout, IconSettings, IconUserCircle,
} from '@tabler/icons-react';
import { useAuth } from 'src/context/smartpos/AuthContext';
import { brand } from 'src/theme/smartpos/brand';

const scaleIn = keyframes`
  from { opacity: 0; transform: scale(0.92) translateY(-4px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
`;

const menuItemSx = {
  borderRadius: '10px',
  mx: 0.75,
  mb: 0.25,
  py: 1.1,
  px: 1.25,
  '&:hover': { bgcolor: brand.primary[50] },
};

const Profile = () => {
  const { user, logout, tenants } = useAuth();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const initials = (() => {
    if (!user) return '?';
    const fn = user.firstName;
    const ln = user.lastName;
    if (fn || ln) return `${(fn ?? '')[0] ?? ''}${(ln ?? '')[0] ?? ''}`.toUpperCase() || 'U';
    return user.email.slice(0, 2).toUpperCase();
  })();

  const displayName = (() => {
    if (!user) return 'Guest';
    const full = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    return full || user.email.split('@')[0];
  })();

  const roles = user?.roles ?? [];
  const currentTenant = tenants.find((t) => t.id === user?.tenantId);

  const handleLogout = async () => {
    handleClose();
    try { await logout(); } catch { /* clearing locally */ }
  };

  return (
    <Box>
      <IconButton
        onClick={handleOpen}
        aria-label="User profile"
        aria-controls={open ? 'profile-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open}
        sx={{
          width: 44,
          height: 44,
          borderRadius: '10px',
          border: `1px solid ${open ? brand.primary[300] : brand.neutral[200]}`,
          bgcolor: open ? brand.primary[50] : '#FFFFFF',
          transition: 'all 0.2s ease',
          '&:hover': {
            bgcolor: brand.primary[50],
            borderColor: brand.primary[200],
          },
        }}
      >
        <Avatar
          sx={{
            width: 30,
            height: 30,
            fontSize: '0.75rem',
            fontWeight: 800,
            letterSpacing: '0.02em',
            background: `linear-gradient(135deg, ${brand.primary[500]} 0%, ${brand.primary[700]} 100%)`,
            color: '#FFFFFF',
          }}
        >
          {initials}
        </Avatar>
      </IconButton>

      <Menu
        id="profile-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              width: { xs: 280, sm: 320 },
              maxWidth: 'calc(100vw - 32px)',
              borderRadius: '16px',
              border: `1px solid ${brand.neutral[200]}`,
              boxShadow: '0 20px 50px rgba(15,23,42,0.12)',
              overflow: 'hidden',
              animation: `${scaleIn} 0.2s cubic-bezier(0.16, 1, 0.3, 1) both`,
            },
          },
        }}
      >
        {/* User identity header */}
        <Box sx={{ px: 3, pt: 3, pb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar
              sx={{
                width: 56,
                height: 56,
                fontSize: '1.1rem',
                fontWeight: 800,
                background: `linear-gradient(135deg, ${brand.primary[500]} 0%, ${brand.primary[700]} 100%)`,
                color: '#FFFFFF',
                boxShadow: `0 8px 20px -8px ${brand.primary[600]}`,
              }}
            >
              {initials}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700, color: brand.neutral[900], fontSize: '0.95rem' }} noWrap>
                {displayName}
              </Typography>
              <Typography sx={{ fontSize: '0.78rem', color: brand.neutral[500] }} noWrap>
                {user?.email ?? '—'}
              </Typography>
              {roles.length > 0 && (
                <Stack direction="row" spacing={0.5} sx={{ mt: 0.75 }} flexWrap="wrap" useFlexGap>
                  {roles.map((role) => (
                    <Chip
                      key={role}
                      label={role}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        letterSpacing: '0.03em',
                        borderRadius: '5px',
                        bgcolor: brand.primary[50],
                        color: brand.primary[700],
                      }}
                    />
                  ))}
                </Stack>
              )}
            </Box>
          </Stack>

          {/* Tenant info */}
          {currentTenant && (
            <Box
              sx={{
                mt: 2,
                px: 1.75,
                py: 1.25,
                borderRadius: '10px',
                bgcolor: brand.neutral[50],
                border: `1px solid ${brand.neutral[100]}`,
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar
                  sx={{
                    width: 28,
                    height: 28,
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    borderRadius: '7px',
                    bgcolor: brand.accent[600],
                    color: '#FFFFFF',
                  }}
                >
                  {(currentTenant.name ?? 'T')[0].toUpperCase()}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: brand.neutral[800] }} noWrap>
                    {currentTenant.name ?? 'Current workspace'}
                  </Typography>
                  <Typography sx={{ fontSize: '0.7rem', color: brand.neutral[500] }} noWrap>
                    {currentTenant.slug ?? user?.tenantName ?? ''}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          )}
        </Box>

        <Divider />

        {/* Menu items */}
        <Box sx={{ pt: 1.5, pb: 1 }}>
          <MenuItem
            component={Link}
            to="/smartpos/settings"
            onClick={handleClose}
            sx={menuItemSx}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              <IconSettings size={18} color={brand.neutral[600]} />
            </ListItemIcon>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: brand.neutral[800] }}>
              Settings
            </Typography>
          </MenuItem>

          <MenuItem
            component={Link}
            to="/smartpos/billing"
            onClick={handleClose}
            sx={menuItemSx}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              <IconCreditCard size={18} color={brand.neutral[600]} />
            </ListItemIcon>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: brand.neutral[800] }}>
              Billing
            </Typography>
          </MenuItem>

          <MenuItem
            component={Link}
            to="/smartpos/settings"
            onClick={handleClose}
            sx={menuItemSx}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              <IconUserCircle size={18} color={brand.neutral[600]} />
            </ListItemIcon>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: brand.neutral[800] }}>
              My profile
            </Typography>
          </MenuItem>
        </Box>

        <Divider />

        {/* Logout */}
        <Box sx={{ px: 2, pt: 1.5, pb: 2 }}>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<IconLogout size={16} stroke={2} />}
            onClick={handleLogout}
            sx={{
              py: 1.2,
              borderRadius: '10px',
              fontSize: '0.85rem',
              fontWeight: 600,
              textTransform: 'none',
              color: brand.neutral[700],
              borderColor: brand.neutral[200],
              '&:hover': {
                borderColor: brand.error.main,
                color: brand.error.main,
                bgcolor: brand.error.light,
              },
            }}
          >
            Sign out
          </Button>
        </Box>
      </Menu>
    </Box>
  );
};

export default Profile;
