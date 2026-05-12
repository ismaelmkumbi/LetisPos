import React, { useState } from 'react';
import {
  AppBar, Toolbar, Typography, IconButton, Badge, Box,
  Drawer, List, ListItem, ListItemText, useMediaQuery, useTheme,
} from '@mui/material';
import {
  Search as SearchIcon,
  ShoppingCart as CartIcon,
  Person as PersonIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router';
import { useStorefront } from '../../context/CommerceContext';
import SearchBar from './SearchBar';

const StoreHeader: React.FC = () => {
  const { slug, cartItemCount, isLoggedIn, theme } = useStorefront();
  const navigate = useNavigate();
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const primaryColor = theme?.settings?.colors?.primary || muiTheme.palette.primary.main;

  return (
    <>
      <AppBar
        position="sticky"
        sx={{
          backgroundColor: primaryColor,
          color: '#fff',
        }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton color="inherit" edge="start" onClick={() => setMobileMenuOpen(true)}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography
            variant="h6"
            component="div"
            sx={{ cursor: 'pointer', flexGrow: isMobile ? 1 : 0, mr: 4 }}
            onClick={() => navigate(`/store/${slug}`)}
          >
            {theme?.name || 'Store'}
          </Typography>

          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 2, flexGrow: 1 }}>
              {/* Navigation items will be rendered from API in a later task */}
            </Box>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
            <IconButton color="inherit" onClick={() => setSearchOpen(!searchOpen)}>
              <SearchIcon />
            </IconButton>
            <IconButton color="inherit" onClick={() => navigate(`/store/${slug}/cart`)}>
              <Badge badgeContent={cartItemCount} color="secondary">
                <CartIcon />
              </Badge>
            </IconButton>
            <IconButton
              color="inherit"
              onClick={() => navigate(isLoggedIn ? `/store/${slug}/account` : `/store/${slug}/login`)}
            >
              <PersonIcon />
            </IconButton>
          </Box>
        </Toolbar>
        {searchOpen && (
          <Box sx={{ px: 2, pb: 2 }}>
            <SearchBar />
          </Box>
        )}
      </AppBar>

      <Drawer anchor="left" open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)}>
        <Box sx={{ width: 280, pt: 2 }}>
          <List>
            <ListItem
              component="button"
              onClick={() => { navigate(`/store/${slug}`); setMobileMenuOpen(false); }}
            >
              <ListItemText primary="Home" />
            </ListItem>
            <ListItem
              component="button"
              onClick={() => { navigate(`/store/${slug}/cart`); setMobileMenuOpen(false); }}
            >
              <ListItemText primary={`Cart (${cartItemCount})`} />
            </ListItem>
            <ListItem
              component="button"
              onClick={() => {
                navigate(isLoggedIn ? `/store/${slug}/account` : `/store/${slug}/login`);
                setMobileMenuOpen(false);
              }}
            >
              <ListItemText primary={isLoggedIn ? 'My Account' : 'Login'} />
            </ListItem>
          </List>
        </Box>
      </Drawer>
    </>
  );
};

export default StoreHeader;
