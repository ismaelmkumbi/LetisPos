import React from 'react';
import { AppBar, Toolbar, Container, Box, Stack, useMediaQuery, IconButton, Theme } from '@mui/material';
import { IconMenu2 } from '@tabler/icons-react';
import CtaButton from '../components/CtaButton';

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
];

const Header: React.FC = () => {
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
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
          {/* Logo */}
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

          {/* Desktop nav */}
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

          {/* Mobile menu button */}
          {isMobile && (
            <IconButton sx={{ color: 'var(--lp-text)' }}>
              <IconMenu2 size={22} />
            </IconButton>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Header;
