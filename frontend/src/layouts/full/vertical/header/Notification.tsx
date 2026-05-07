/**
 * Letis POS — Notification bell.
 *
 * Polished dropdown with badge count and refined styling.
 * Uses static demo data — connect to API notifications when ready.
 */
import React, { useState } from 'react';
import {
  Avatar, Badge, Box, Button, Chip,
  IconButton, Menu, MenuItem, Stack, Typography, keyframes,
} from '@mui/material';
import { IconBellRinging } from '@tabler/icons-react';
import { Link } from 'react-router';
import * as dropdownData from './data';
import Scrollbar from 'src/components/custom-scroll/Scrollbar';
import { brand } from 'src/theme/smartpos/brand';

const scaleIn = keyframes`
  from { opacity: 0; transform: scale(0.92) translateY(-4px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.12); }
`;

const Notifications = () => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const newCount = 5;

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  return (
    <Box>
      <IconButton
        onClick={handleOpen}
        aria-label={`Notifications — ${newCount} new`}
        aria-controls={open ? 'notifications-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open}
        sx={{
          width: 44,
          height: 44,
          borderRadius: '10px',
          border: `1px solid ${open ? brand.primary[300] : brand.neutral[200]}`,
          bgcolor: open ? brand.primary[50] : '#FFFFFF',
          color: open ? brand.primary[600] : brand.neutral[600],
          transition: 'all 0.2s ease',
          '&:hover': {
            bgcolor: brand.primary[50],
            borderColor: brand.primary[200],
            color: brand.primary[600],
          },
        }}
      >
        <Badge
          variant="dot"
          color="error"
          overlap="circular"
          sx={{
            '& .MuiBadge-dot': {
              width: 9,
              height: 9,
              borderRadius: '50%',
              border: '2px solid #FFFFFF',
              animation: `${pulse} 2s ease-in-out infinite`,
            },
          }}
        >
          <IconBellRinging size={18} stroke={1.6} />
        </Badge>
      </IconButton>

      <Menu
        id="notifications-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              width: 380,
              borderRadius: '16px',
              border: `1px solid ${brand.neutral[200]}`,
              boxShadow: '0 20px 50px rgba(15,23,42,0.12)',
              overflow: 'hidden',
              animation: `${scaleIn} 0.2s cubic-bezier(0.16, 1, 0.3, 1) both`,
            },
          },
        }}
      >
        {/* Header */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ px: 3, pt: 2.5, pb: 1.5 }}
        >
          <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, color: brand.neutral[900] }}>
            Notifications
          </Typography>
          <Chip
            label={`${newCount} new`}
            size="small"
            sx={{
              height: 24,
              fontWeight: 700,
              fontSize: '0.68rem',
              borderRadius: '6px',
              bgcolor: brand.primary[50],
              color: brand.primary[700],
            }}
          />
        </Stack>

        {/* Items */}
        <Scrollbar sx={{ height: 320 }}>
          {dropdownData.notifications.map((item, i) => (
            <MenuItem
              key={i}
              onClick={handleClose}
              sx={{
                py: 1.5,
                px: 3,
                mx: 1,
                mb: 0.25,
                borderRadius: '10px',
                '&:hover': { bgcolor: brand.neutral[50] },
              }}
            >
              <Stack direction="row" spacing={1.75} alignItems="flex-start" sx={{ width: '100%' }}>
                <Avatar
                  src={item.avatar}
                  sx={{ width: 42, height: 42, flexShrink: 0 }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: brand.neutral[800],
                      lineHeight: 1.35,
                    }}
                  >
                    {item.title}
                  </Typography>
                  <Typography
                    sx={{
                      mt: 0.3,
                      fontSize: '0.75rem',
                      color: brand.neutral[500],
                      lineHeight: 1.35,
                    }}
                  >
                    {item.subtitle}
                  </Typography>
                </Box>
              </Stack>
            </MenuItem>
          ))}
        </Scrollbar>

        {/* Footer */}
        <Box sx={{ px: 2, pt: 1.5, pb: 2, borderTop: `1px solid ${brand.neutral[100]}` }}>
          <Button
            component={Link}
            to="/smartpos/notifications"
            variant="outlined"
            fullWidth
            onClick={handleClose}
            sx={{
              py: 1.1,
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: 600,
              textTransform: 'none',
              color: brand.neutral[700],
              borderColor: brand.neutral[200],
              '&:hover': {
                borderColor: brand.primary[300],
                color: brand.primary[600],
                bgcolor: brand.primary[50],
              },
            }}
          >
            View all notifications
          </Button>
        </Box>
      </Menu>
    </Box>
  );
};

export default Notifications;
