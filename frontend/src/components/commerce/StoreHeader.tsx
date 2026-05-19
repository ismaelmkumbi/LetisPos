import React, { useState } from 'react';
import {
  AppBar, Toolbar, Typography, IconButton, Badge, Box,
  Drawer, List, ListItemButton, ListItemText, useMediaQuery, useTheme,
  InputBase, Divider, Button, Container,
} from '@mui/material';
import {
  Search as SearchIcon,
  ShoppingCart as CartIcon,
  Person as PersonIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  LocalShipping,
  HeadsetMic,
  CreditCard,
} from '@mui/icons-material';
import { useNavigate } from 'react-router';
import { useStorefront } from '../../context/CommerceContext';

const StoreHeader: React.FC = () => {
  const { slug, cartItemCount, isLoggedIn, theme, customer } = useStorefront();
  const navigate = useNavigate();
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const primary = theme?.settings?.colors?.primary || '#1a1a2e';
  const accent = theme?.settings?.colors?.accent || '#ff6b35';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (trimmed) {
      navigate(`/store/${slug}/search?q=${encodeURIComponent(trimmed)}`);
      setSearchQuery('');
    }
  };

  const categories = [
    { label: 'All', href: `/store/${slug}/categories/all` },
    { label: 'New Arrivals', href: `/store/${slug}/search?q=&sort=newest` },
    { label: 'Best Sellers', href: `/store/${slug}/search?q=&sort=newest` },
    { label: 'Deals', href: `/store/${slug}/search?q=&sort=discount` },
  ];

  return (
    <>
      {/* Trust strip */}
      <Box sx={{ bgcolor: '#f5f5f5', borderBottom: '1px solid #e0e0e0', display: { xs: 'none', md: 'block' } }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75 }}>
            {[
              { icon: <LocalShipping sx={{ fontSize: 16, mr: 0.5 }} />, text: 'Free shipping on orders over $50' },
              { icon: <HeadsetMic sx={{ fontSize: 16, mr: 0.5 }} />, text: '24/7 customer support' },
              { icon: <CreditCard sx={{ fontSize: 16, mr: 0.5 }} />, text: 'Secure payment' },
            ].map((item) => (
              <Box key={item.text} sx={{ display: 'flex', alignItems: 'center', color: '#555', fontSize: '0.75rem' }}>
                {item.icon}
                {item.text}
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      <AppBar
        position="sticky"
        elevation={1}
        sx={{ bgcolor: primary, color: '#fff' }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ gap: { xs: 1, md: 2 }, minHeight: { xs: 56, md: 64 } }}>
            {isMobile && (
              <IconButton aria-label="Open menu" color="inherit" edge="start" onClick={() => setMobileMenuOpen(true)} size="small">
                <MenuIcon />
              </IconButton>
            )}

            {/* Logo */}
            <Typography
              variant="h5"
              component="div"
              onClick={() => navigate(`/store/${slug}`)}
              sx={{
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: { xs: '1.2rem', md: '1.5rem' },
                letterSpacing: '-0.02em',
                whiteSpace: 'nowrap',
                mr: { md: 2 },
                fontFamily: 'var(--commerce-font-heading, Outfit, sans-serif)',
              }}
            >
              {theme?.name || 'Store'}
            </Typography>

            {/* Search bar */}
            {!isMobile && (
              <Box
                component="form"
                onSubmit={handleSearch}
                sx={{
                  flex: 1,
                  maxWidth: 560,
                  mx: 'auto',
                  display: 'flex',
                  bgcolor: 'rgba(255,255,255,0.15)',
                  borderRadius: '999px',
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.12)',
                  '&:focus-within': { bgcolor: '#fff', borderColor: accent },
                }}
              >
                <InputBase
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  sx={{
                    flex: 1,
                    px: 2.5,
                    py: 1,
                    color: '#fff',
                    fontSize: '0.9rem',
                    '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,0.7)', opacity: 1 },
                    '&:focus-within': { color: '#333' },
                  }}
                />
                <IconButton type="submit" sx={{ color: '#fff', px: 2, borderRadius: 0 }}>
                  <SearchIcon />
                </IconButton>
              </Box>
            )}

            {/* Right icons */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, md: 1 }, ml: 'auto' }}>
              {isMobile && (
                <IconButton aria-label="Search" color="inherit" onClick={() => navigate(`/store/${slug}/search`)} size="small">
                  <SearchIcon fontSize="small" />
                </IconButton>
              )}
              <IconButton aria-label={`Cart with ${cartItemCount} items`} color="inherit" onClick={() => navigate(`/store/${slug}/cart`)} size="small">
                <Badge badgeContent={cartItemCount} color="error" sx={{ '& .MuiBadge-badge': { fontWeight: 700 } }}>
                  <CartIcon />
                </Badge>
              </IconButton>
              <IconButton
                aria-label={isLoggedIn ? 'My account' : 'Login or register'}
                color="inherit"
                onClick={() => navigate(isLoggedIn ? `/store/${slug}/account` : `/store/${slug}/login`)}
                size="small"
                sx={{ display: { xs: 'none', sm: 'flex' } }}
              >
                <PersonIcon />
              </IconButton>
              {isLoggedIn && customer && (
                <Typography sx={{ display: { xs: 'none', md: 'block' }, fontSize: '0.8rem', fontWeight: 600 }}>
                  Hi, {customer.firstName}
                </Typography>
              )}
            </Box>
          </Toolbar>

          {/* Category nav bar (desktop) */}
          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 0, borderTop: '1px solid rgba(255,255,255,0.1)', py: 0.5 }}>
              {categories.map((cat) => (
                <Button
                  key={cat.label}
                  onClick={() => navigate(cat.href)}
                  sx={{
                    color: 'rgba(255,255,255,0.85)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    px: 2,
                    py: 0.75,
                    borderRadius: 1,
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', color: '#fff' },
                  }}
                >
                  {cat.label}
                </Button>
              ))}
            </Box>
          )}
        </Container>
      </AppBar>

      {/* Mobile search drawer */}
      {isMobile && (
        <Box sx={{ bgcolor: primary, px: 2, pb: 1.5 }}>
          <Box
            component="form"
            onSubmit={handleSearch}
            sx={{
              display: 'flex',
              bgcolor: 'rgba(255,255,255,0.15)',
              borderRadius: '999px',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <InputBase
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{
                flex: 1,
                px: 2,
                py: 1,
                color: '#fff',
                fontSize: '0.85rem',
                '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,0.7)', opacity: 1 },
              }}
            />
            <IconButton type="submit" sx={{ color: '#fff', px: 1.5 }}>
              <SearchIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      )}

      {/* Mobile menu drawer */}
      <Drawer anchor="left" open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)}>
        <Box sx={{ width: 300, pt: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, pb: 1 }}>
            <Typography variant="h6" fontWeight={700}>{theme?.name || 'Menu'}</Typography>
            <IconButton onClick={() => setMobileMenuOpen(false)}><CloseIcon /></IconButton>
          </Box>
          <Divider />
          <List>
            {isLoggedIn && (
              <ListItemButton onClick={() => { navigate(`/store/${slug}/account`); setMobileMenuOpen(false); }}>
                <ListItemText primary="My Account" secondary={customer?.email} />
              </ListItemButton>
            )}
            <ListItemButton onClick={() => { navigate(`/store/${slug}`); setMobileMenuOpen(false); }}>
              <ListItemText primary="Home" />
            </ListItemButton>
            {categories.map((cat) => (
              <ListItemButton key={cat.label} onClick={() => { navigate(cat.href); setMobileMenuOpen(false); }}>
                <ListItemText primary={cat.label} />
              </ListItemButton>
            ))}
            <Divider />
            <ListItemButton onClick={() => { navigate(`/store/${slug}/cart`); setMobileMenuOpen(false); }}>
              <ListItemText primary={`Cart (${cartItemCount} items)`} />
            </ListItemButton>
            <ListItemButton onClick={() => {
              navigate(isLoggedIn ? `/store/${slug}/account` : `/store/${slug}/login`);
              setMobileMenuOpen(false);
            }}>
              <ListItemText primary={isLoggedIn ? 'Account' : 'Login / Register'} />
            </ListItemButton>
          </List>
        </Box>
      </Drawer>
    </>
  );
};

export default StoreHeader;
