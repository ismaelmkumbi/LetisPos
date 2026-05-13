import {
  AppBar, Box, Button, Divider, IconButton, Stack, Toolbar,
  Tooltip, useMediaQuery, useTheme,
} from '@mui/material';
import config from 'src/context/config';
import { useContext, useEffect } from 'react';
import {
  IconMenu2,
  IconMoon,
  IconPlus,
  IconSun,
} from '@tabler/icons-react';
import Notifications from './Notification';
import Profile from './Profile';
import Search from './Search';
import Language from './Language';
import Navigation from './Navigation';
import { CustomizerContext } from 'src/context/CustomizerContext';
import { brand } from 'src/theme/smartpos/brand';
import { Link as RouterLink, useLocation } from 'react-router';

const Header = () => {
  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
  const mdDown = useMediaQuery((theme: any) => theme.breakpoints.down('md'));
  const smUp = useMediaQuery((theme: any) => theme.breakpoints.up('sm'));
  const { pathname } = useLocation();
  const onSmartPos = pathname.startsWith('/smartpos');
  const isDashboard = pathname === '/smartpos' || pathname === '/smartpos/dashboard';

  const TopbarHeight = config.topbarHeight;
  const { activeMode, setActiveMode, setIsCollapse, isCollapse, isMobileSidebar, setIsMobileSidebar } =
    useContext(CustomizerContext);
  const isDark = activeMode === 'dark';
  const theme = useTheme();

  // Reset to full sidebar on fresh login
  useEffect(() => {
    const handler = () => setIsCollapse('full-sidebar');
    window.addEventListener('smartpos:auth:login', handler);
    return () => window.removeEventListener('smartpos:auth:login', handler);
  }, [setIsCollapse]);

  const iconBtnSx = {
    width: 40,
    height: 40,
    borderRadius: '10px',
    border: `1px solid ${isDark ? brand.neutral[700] : brand.neutral[200]}`,
    bgcolor: isDark ? brand.neutral[800] : '#FFFFFF',
    color: isDark ? brand.neutral[300] : brand.neutral[600],
    transition: 'all 0.2s ease',
    '&:hover': {
      bgcolor: isDark ? brand.neutral[700] : brand.primary[50],
      borderColor: isDark ? brand.neutral[600] : brand.primary[200],
      color: brand.primary[600],
    },
  };

  const sidebarToggle = (
    <Tooltip title={lgUp ? (isCollapse === 'full-sidebar' ? 'Collapse' : 'Expand') : 'Menu'}>
      <IconButton
        size="small"
        onClick={() => {
          if (lgUp) {
            setIsCollapse(isCollapse === 'full-sidebar' ? 'mini-sidebar' : 'full-sidebar');
          } else {
            setIsMobileSidebar(!isMobileSidebar);
          }
        }}
        sx={iconBtnSx}
      >
        <IconMenu2 size={18} />
      </IconButton>
    </Tooltip>
  );

  const newSaleButton = (
    <Button
      component={RouterLink as any}
      to="/smartpos/sales/new"
      variant="contained"
      size="small"
      startIcon={smUp ? <IconPlus size={15} /> : undefined}
      sx={{
        height: 38,
        minWidth: mdDown ? 38 : 'auto',
        background: `linear-gradient(135deg, ${brand.primary[500]} 0%, ${brand.primary[700]} 100%)`,
        color: '#fff',
        fontWeight: 700,
        fontSize: '0.813rem',
        px: mdDown ? 0 : 2.2,
        borderRadius: '10px',
        whiteSpace: 'nowrap',
        boxShadow: `0 6px 16px -8px ${brand.primary[600]}`,
        transition: 'all 0.2s ease',
        '&:hover': {
          background: `linear-gradient(135deg, ${brand.primary[600]} 0%, ${brand.primary[800]} 100%)`,
          transform: 'translateY(-1px)',
          boxShadow: `0 8px 22px -8px ${brand.primary[700]}`,
        },
      }}
    >
      {mdDown ? <IconPlus size={18} /> : 'New Sale'}
    </Button>
  );

  const modeToggle = (
    <Tooltip title={activeMode === 'light' ? 'Dark mode' : 'Light mode'}>
      <IconButton
        size="small"
        onClick={() => setActiveMode(activeMode === 'light' ? 'dark' : 'light')}
        sx={iconBtnSx}
      >
        {activeMode === 'light'
          ? <IconMoon size={16} stroke={1.5} />
          : <IconSun size={16} stroke={1.5} />}
      </IconButton>
    </Tooltip>
  );

  // SmartPOS header — cleaner, fewer elements on mobile
  if (onSmartPos) {
    return (
      <AppBar
        position="sticky"
        color="default"
        elevation={0}
        sx={{
          height: TopbarHeight,
          minHeight: TopbarHeight,
          background: isDark
            ? `rgba(15, 23, 42, 0.82)`
            : `rgba(255, 255, 255, 0.78)`,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: `1px solid ${isDark ? brand.neutral[700] : brand.neutral[200]}`,
          boxShadow: 'none',
          zIndex: theme.zIndex.drawer - 1,
        }}
      >
        <Toolbar
          sx={{
            minHeight: `${TopbarHeight}px !important`,
            px: { xs: 1.5, sm: 2, lg: 2.75 },
            gap: 1,
          }}
        >
          {sidebarToggle}

          <Box flexGrow={1} />

          {isDashboard && newSaleButton}

          {isDashboard && !mdDown && (
            <Divider
              orientation="vertical"
              flexItem
              sx={{ mx: 0.25, my: 1.7, borderColor: isDark ? brand.neutral[600] : brand.neutral[200] }}
            />
          )}

          <Stack direction="row" spacing={0.6} alignItems="center">
            {!mdDown && <Search />}
            {lgUp && <Language />}
            {modeToggle}
            <Notifications />
            <Profile />
          </Stack>
        </Toolbar>
      </AppBar>
    );
  }

  // Non-SmartPOS header
  return (
    <AppBar
      position="sticky"
      color="default"
      elevation={0}
      sx={{
        height: TopbarHeight,
        minHeight: TopbarHeight,
        background: isDark
          ? `rgba(15, 23, 42, 0.82)`
          : `rgba(255, 255, 255, 0.78)`,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${isDark ? brand.neutral[700] : brand.neutral[200]}`,
        boxShadow: 'none',
        zIndex: theme.zIndex.drawer - 1,
      }}
    >
      <Toolbar
        sx={{
          height: TopbarHeight,
          minHeight: `${TopbarHeight}px !important`,
          px: { xs: 1.5, sm: 2, lg: 3 },
          gap: 1,
          flexWrap: 'nowrap',
          py: 0,
        }}
      >
        {sidebarToggle}

        <Box sx={{ flex: lgUp ? '0 1 320px' : 1 }}>
          <Search />
        </Box>

        {lgUp && <Navigation />}

        <Box flexGrow={1} sx={{ display: { xs: 'none', xl: 'block' } }} />

        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ ml: 0, minWidth: 0 }}>
          {lgUp && <Language />}
          {modeToggle}
          <Notifications />
          <Profile />
        </Stack>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
