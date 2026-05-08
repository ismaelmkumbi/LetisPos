import React from 'react';
import {
  AppBar, Toolbar, Container, Box, Stack, useMediaQuery,
  IconButton, Drawer, Typography, Theme,
} from '@mui/material';
import { IconMenu2, IconX } from '@tabler/icons-react';
import CtaButton from '../components/CtaButton';

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
];

const Header: React.FC = () => {
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));
  const [scrolled, setScrolled] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const closeDrawer = () => setDrawerOpen(false);

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: scrolled ? 'var(--lp-surface)' : 'var(--lp-bg)',
          borderBottom: scrolled ? '1px solid var(--lp-border)' : '1px solid transparent',
          transition: 'background-color 0.3s ease, border-color 0.3s ease',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
        }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ minHeight: { xs: 64, md: 80 }, justifyContent: 'space-between' }}>
            <Box
              component="a"
              href="/"
              sx={{
                fontFamily: 'var(--lp-font-display)',
                fontSize: '1.5rem',
                fontWeight: 700,
                color: 'var(--lp-text)',
                textDecoration: 'none',
                letterSpacing: '-0.02em',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              Letis
            </Box>

            {!isMobile && (
              <Stack direction="row" spacing={4} alignItems="center">
                {navLinks.map((link) => (
                  <Box
                    key={link.href}
                    component="a"
                    href={link.href}
                    sx={{
                      fontFamily: 'var(--lp-font-body)',
                      fontSize: '0.938rem',
                      color: 'var(--lp-text-muted)',
                      textDecoration: 'none',
                      transition: 'color 0.2s ease',
                      '&:hover': { color: 'var(--lp-text)' },
                    }}
                  >
                    {link.label}
                  </Box>
                ))}
                <Stack direction="row" spacing={1.5}>
                  <CtaButton variant="secondary" href="/auth/login">
                    Sign in
                  </CtaButton>
                  <CtaButton variant="primary" href="/auth/register">
                    Start free trial
                  </CtaButton>
                </Stack>
              </Stack>
            )}

            {isMobile && (
              <IconButton
                onClick={() => setDrawerOpen(true)}
                sx={{ color: 'var(--lp-text)' }}
                aria-label="Open menu"
              >
                <IconMenu2 size={22} />
              </IconButton>
            )}
          </Toolbar>
        </Container>
      </AppBar>

      {/* Mobile drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={closeDrawer}
        PaperProps={{
          sx: {
            width: 280,
            bgcolor: 'var(--lp-surface)',
            color: 'var(--lp-text)',
            borderLeft: '1px solid var(--lp-border)',
            p: 3,
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
          <IconButton onClick={closeDrawer} sx={{ color: 'var(--lp-text)' }}>
            <IconX size={20} />
          </IconButton>
        </Box>

        <Stack spacing={3}>
          {navLinks.map((link) => (
            <Typography
              key={link.href}
              component="a"
              href={link.href}
              onClick={closeDrawer}
              sx={{
                fontFamily: 'var(--lp-font-display)',
                fontSize: '1.25rem',
                fontWeight: 600,
                color: 'var(--lp-text)',
                textDecoration: 'none',
              }}
            >
              {link.label}
            </Typography>
          ))}

          <Box sx={{ pt: 2, borderTop: '1px solid var(--lp-border)' }}>
            <Stack spacing={2}>
              <CtaButton variant="secondary" href="/auth/login" fullWidth>
                Sign in
              </CtaButton>
              <CtaButton variant="primary" href="/auth/register" fullWidth>
                Start free trial
              </CtaButton>
            </Stack>
          </Box>
        </Stack>
      </Drawer>
    </>
  );
};

export default Header;
