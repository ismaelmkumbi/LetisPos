import { Avatar, Box, IconButton, Tooltip, Typography, useMediaQuery } from '@mui/material';
import { IconPower, IconSettings } from '@tabler/icons-react';
import { useNavigate, useLocation } from 'react-router';
import { useContext } from 'react';
import { useTranslation } from 'react-i18next';

import { CustomizerContext } from 'src/context/CustomizerContext';
import { useAuth } from 'src/context/smartpos/AuthContext';
import LanguageSwitcher from 'src/components/smartpos/LanguageSwitcher';
import { brand } from 'src/theme/smartpos/brand';

export const Profile = () => {
  const { t } = useTranslation('smartpos');
  const { isSidebarHover, isCollapse, activeMode } = useContext(CustomizerContext);
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const isDark = activeMode === 'dark';

  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
  const hideMenu = lgUp ? isCollapse === 'mini-sidebar' && !isSidebarHover : '';
  const onSmartPos = pathname.startsWith('/smartpos');

  const handleLogout = async () => {
    try { await logout(); } catch { /* clearing locally */ }
    nav('/auth/login', { replace: true });
  };

  const initials = (() => {
    if (!user) return 'SP';
    const fn = (user as any).firstName as string | undefined;
    const ln = (user as any).lastName as string | undefined;
    if (fn || ln) return `${(fn ?? '')[0] ?? ''}${(ln ?? '')[0] ?? ''}`.toUpperCase() || 'U';
    return user.email.slice(0, 2).toUpperCase();
  })();

  const displayName = (() => {
    if (!user) return 'Guest';
    const fn = (user as any).firstName as string | undefined;
    const ln = (user as any).lastName as string | undefined;
    const full = `${fn ?? ''} ${ln ?? ''}`.trim();
    return full || user.email.split('@')[0];
  })();

  const subtitle = (() => {
    if (!user) return '';
    const roles = (user as any).roles as string[] | undefined;
    if (roles && roles.length > 0) {
      return roles[0].replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return user.email;
  })();

  const avatarBg = `linear-gradient(135deg, ${brand.primary[500]} 0%, ${brand.primary[700]} 100%)`;

  if (hideMenu) {
    return (
      <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
        <Tooltip title={displayName} placement="right" arrow>
          <Avatar
            sx={{
              width: 36, height: 36,
              background: avatarBg,
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            {initials}
          </Avatar>
        </Tooltip>
      </Box>
    );
  }

  if (!onSmartPos || !user) {
    return (
      <Box
        sx={{
          m: 1.5,
          p: 1.5,
          borderRadius: '12px',
          bgcolor: isDark ? brand.neutral[800] : brand.neutral[50],
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Avatar sx={{ background: avatarBg, color: '#fff', width: 34, height: 34, fontWeight: 700 }}>
          D
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>Demo User</Typography>
          <Typography variant="caption" sx={{ color: brand.neutral[500] }} noWrap>Modernize</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        m: 1.5,
        p: 1.25,
        borderRadius: '12px',
        bgcolor: isDark ? brand.neutral[800] : brand.neutral[50],
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        transition: 'background 0.2s ease',
      }}
    >
      <Avatar
        sx={{
          width: 34, height: 34,
          background: avatarBg,
          color: '#fff',
          fontWeight: 700,
          fontSize: '0.875rem',
          flexShrink: 0,
        }}
      >
        {initials}
      </Avatar>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }} noWrap title={displayName}>
          {displayName}
        </Typography>
        <Typography
          variant="caption"
          sx={{ color: brand.neutral[500], display: 'block', lineHeight: 1.3 }}
          noWrap
          title={subtitle}
        >
          {subtitle}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
        <LanguageSwitcher />
        <Tooltip title="Preferences" placement="top">
          <IconButton
            size="small"
            onClick={() => nav('/smartpos/settings')}
            sx={{
              width: 28, height: 28,
              color: brand.neutral[500],
              borderRadius: '8px',
              '&:hover': { color: brand.primary[600], bgcolor: brand.primary[50] },
            }}
          >
            <IconSettings size={15} />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('auth.sign_out', { defaultValue: 'Sign out' })} placement="top">
          <IconButton
            size="small"
            onClick={handleLogout}
            sx={{
              width: 28, height: 28,
              color: brand.neutral[500],
              borderRadius: '8px',
              '&:hover': { color: brand.error.main, bgcolor: brand.error.light },
            }}
          >
            <IconPower size={15} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};
