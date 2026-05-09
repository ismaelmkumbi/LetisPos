'use client';
import { FC, useContext, useState, useEffect } from 'react';
import { styled, Container, Box, useTheme } from '@mui/material';
import { Outlet, useLocation } from 'react-router';
import Header from './vertical/header/Header';
import Sidebar from './vertical/sidebar/Sidebar';
import Navigation from '../full/horizontal/navbar/Navigation';
import HorizontalHeader from '../full/horizontal/header/Header';
import ScrollToTop from '../../components/shared/ScrollToTop';
import LoadingBar from '../../LoadingBar';
import { CustomizerContext } from 'src/context/CustomizerContext';
import config from 'src/context/config';
import { CommandPalette } from 'src/components/smartpos/CommandPalette';
import { KeyboardShortcutsHelp } from 'src/components/smartpos/KeyboardShortcuts';
import { FloatingActions } from 'src/components/smartpos/FloatingActions';
import { BreadcrumbNav } from 'src/components/smartpos/BreadcrumbNav';
import MobileBottomNav from 'src/components/smartpos/MobileBottomNav';
import MoreMenuSheet from 'src/components/smartpos/MoreMenuSheet';

const MainWrapper = styled('div')(() => ({
  display: 'flex',
  minHeight: '100vh',
  width: '100%',
}));

const PageWrapper = styled('div')(({ theme }) => ({
  display: 'flex',
  flexGrow: 1,
  flexBasis: 0,
  minWidth: 0,
  paddingBottom: '72px',
  flexDirection: 'column',
  zIndex: 1,
  width: 'auto',
  maxWidth: '100%',
  overflowX: 'clip',
  backgroundColor: theme.palette.background.default,
  backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.03\'/%3E%3C/svg%3E")',
  transition: 'margin-left 0.25s ease',
  [theme.breakpoints.down('md')]: {
    paddingBottom: '76px',
  },
}));

const FullLayout: FC = () => {
  const { activeLayout, isLayout, activeMode, isCollapse, setIsCollapse } = useContext(CustomizerContext);
  const theme = useTheme();
  const location = useLocation();
  const MiniSidebarWidth = config.miniSidebarWidth;

  // Enterprise UI state
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [keyboardHelpOpen, setKeyboardHelpOpen] = useState(false);

  // Check if on SmartPOS route
  const isSmartPos = location.pathname.startsWith('/smartpos');
  const isSmartPosDashboard = location.pathname === '/smartpos' || location.pathname === '/smartpos/dashboard';

  useEffect(() => {
    if (!isSmartPos) return;
    setIsCollapse(isSmartPosDashboard ? 'mini-sidebar' : 'full-sidebar');
  }, [isSmartPos, isSmartPosDashboard, setIsCollapse]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleOpenPalette = () => setCommandPaletteOpen(true);
    const handleToggleHelp = () => setKeyboardHelpOpen(v => !v);

    window.addEventListener('open-command-palette', handleOpenPalette);
    window.addEventListener('toggle-keyboard-help', handleToggleHelp);

    return () => {
      window.removeEventListener('open-command-palette', handleOpenPalette);
      window.removeEventListener('toggle-keyboard-help', handleToggleHelp);
    };
  }, []);

  // Close command palette on route change
  useEffect(() => {
    setCommandPaletteOpen(false);
  }, [location.pathname]);

  return (
    <>
      <LoadingBar />
      <MainWrapper className={activeMode === 'dark' ? 'darkbg mainwrapper' : 'mainwrapper'}>
        {activeLayout === 'horizontal' ? '' : <Sidebar />}
        <PageWrapper
          className="page-wrapper"
          sx={{
            ...(isCollapse === 'mini-sidebar' && {
              [theme.breakpoints.up('lg')]: { ml: `${MiniSidebarWidth}px` },
            }),
          }}
        >
          {activeLayout === 'horizontal' ? <HorizontalHeader /> : <Header />}
          {activeLayout === 'horizontal' ? <Navigation /> : ''}
          <Container
            sx={{
              width: '100%',
              pt: isSmartPosDashboard ? '10px' : isSmartPos ? '20px' : '28px',
              pb: isSmartPosDashboard ? '18px' : '28px',
              maxWidth: isSmartPos
                ? '100% !important'
                : isLayout === 'boxed'
                ? 'lg'
                : '100%!important',
              px: isSmartPos
                ? { xs: 1.5, sm: 2, lg: isSmartPosDashboard ? '16px !important' : '12px !important' }
                : { xs: 2, sm: 3, lg: '24px !important' },
            }}
          >
            {/* Breadcrumb navigation for SmartPOS routes */}
            {isSmartPos && !isSmartPosDashboard && <BreadcrumbNav />}

            <Box sx={{ minHeight: 'calc(100vh - 160px)', animation: 'fadeInUp 0.3s ease' }}>
              <ScrollToTop>
                <Outlet />
              </ScrollToTop>
            </Box>
          </Container>
          {/* Customizer removed — Letis POS has a fixed brand identity */}
        </PageWrapper>
      </MainWrapper>

      {/* Enterprise UI Components - only on SmartPOS routes */}
      {isSmartPos && (
        <>
          {/* Global Command Palette (Cmd+K) */}
          <CommandPalette
            open={commandPaletteOpen}
            onClose={() => setCommandPaletteOpen(false)}
          />

          {/* Keyboard Shortcuts Help */}
          <KeyboardShortcutsHelp
            open={keyboardHelpOpen}
            onClose={() => setKeyboardHelpOpen(false)}
          />

          {/* Floating Action Button for quick actions */}
          <FloatingActions />

          {/* Mobile bottom nav + more menu sheet */}
          <MobileBottomNav />
          <MoreMenuSheet />
        </>
      )}
    </>
  );
};

export default FullLayout;
