import { useMediaQuery, Box, Drawer, SwipeableDrawer, useTheme } from '@mui/material';
import SidebarItems from './SidebarItems';
import Logo from '../../shared/logo/Logo';
import Scrollbar from 'src/components/custom-scroll/Scrollbar';
import { Profile } from './SidebarProfile/Profile';
import config from 'src/context/config';
import { CustomizerContext } from 'src/context/CustomizerContext';
import { useContext } from 'react';
import { brand } from 'src/theme/smartpos/brand';

const Sidebar = () => {
  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
  const {
    isCollapse,
    isMobileSidebar,
    setIsMobileSidebar,
    activeMode,
  } = useContext(CustomizerContext);
  const MiniSidebarWidth = config.miniSidebarWidth;
  const SidebarWidth = config.sidebarWidth;
  const theme = useTheme();
  const isDark = activeMode === 'dark';

  const toggleWidth =
    isCollapse === 'mini-sidebar' ? MiniSidebarWidth : SidebarWidth;

  const sidebarBg = isDark ? brand.neutral[900] : '#ffffff';
  const borderColor = isDark ? brand.neutral[700] : brand.neutral[200];

  const paperSx = {
    width: toggleWidth,
    boxSizing: 'border-box',
    background: sidebarBg,
    borderRight: `1px solid ${borderColor}`,
    boxShadow: 'none',
    transition: theme.transitions.create('width', {
      duration: theme.transitions.duration.shortest,
    }),
    overflow: 'hidden',
  };

  if (lgUp) {
    return (
      <Box
        sx={{
          width: toggleWidth,
          flexShrink: 0,
          ...(isCollapse === 'mini-sidebar' && { position: 'absolute' }),
          transition: theme.transitions.create('width', {
            duration: theme.transitions.duration.shortest,
          }),
        }}
      >
        <Drawer
          anchor="left"
          open
          variant="permanent"
          slotProps={{ paper: { sx: paperSx } }}
        >
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Logo area */}
            <Box
              sx={{
                px: isCollapse === 'mini-sidebar' ? 1 : 2.5,
                py: 0,
                height: config.topbarHeight,
                display: 'flex',
                alignItems: 'center',
                borderBottom: `1px solid ${borderColor}`,
                flexShrink: 0,
              }}
            >
              <Logo />
            </Box>

            {/* Nav items */}
            <Scrollbar
              sx={{
                flex: 1,
                minHeight: 0,
                '& .simplebar-content': { minHeight: '100%', display: 'flex', flexDirection: 'column' },
              }}
            >
              <SidebarItems />
            </Scrollbar>

            {/* User profile */}
            <Box sx={{ borderTop: `1px solid ${borderColor}`, flexShrink: 0 }}>
              <Profile />
            </Box>
          </Box>
        </Drawer>
      </Box>
    );
  }

  return (
    <SwipeableDrawer
      anchor="left"
      open={isMobileSidebar}
      onClose={() => setIsMobileSidebar(false)}
      onOpen={() => setIsMobileSidebar(true)}
      disableSwipeToOpen={false}
      swipeAreaWidth={28}
      hysteresis={0.3}
      transitionDuration={300}
      slotProps={{
        paper: {
          sx: {
            ...paperSx,
            width: SidebarWidth,
            boxShadow: theme.shadows[16],
            pb: 'env(safe-area-inset-bottom, 0px)',
          },
        },
        backdrop: {
          sx: {
            backgroundColor: 'rgba(0,0,0,0.4)',
            transition: 'opacity 300ms ease !important',
          },
        },
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box
          sx={{
            px: 2.5,
            height: config.topbarHeight,
            display: 'flex',
            alignItems: 'center',
            borderBottom: `1px solid ${borderColor}`,
            flexShrink: 0,
          }}
        >
          <Logo />
        </Box>
        <Scrollbar
          sx={{
            flex: 1,
            minHeight: 0,
            '& .simplebar-content': { minHeight: '100%', display: 'flex', flexDirection: 'column' },
          }}
        >
          <SidebarItems />
        </Scrollbar>
        <Box sx={{ borderTop: `1px solid ${borderColor}`, flexShrink: 0 }}>
          <Profile />
        </Box>
      </Box>
    </SwipeableDrawer>
  );
};

export default Sidebar;
