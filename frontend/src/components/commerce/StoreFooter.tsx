import React from 'react';
import { Box, Container, Typography, TextField, Button, Stack, Link, Grid } from '@mui/material';
import { useStorefront } from '../../context/CommerceContext';

const footerSections = {
  Shop: [
    { label: 'All Products', href: 'categories/all' },
    { label: 'New Arrivals', href: 'search?q=&sort=newest' },
    { label: 'Best Sellers', href: 'search?q=&sort=newest' },
    { label: 'On Sale', href: 'search?q=&sort=discount' },
  ],
  Help: [
    { label: 'Contact Us', href: 'page/contact' },
    { label: 'Shipping Info', href: 'page/shipping' },
    { label: 'Returns & Refunds', href: 'page/returns' },
    { label: 'FAQ', href: 'page/faq' },
  ],
  Company: [
    { label: 'About Us', href: 'page/about' },
    { label: 'Privacy Policy', href: 'page/privacy' },
    { label: 'Terms of Service', href: 'page/terms' },
    { label: 'Careers', href: 'page/careers' },
  ],
};

const StoreFooter: React.FC = () => {
  const { slug, theme } = useStorefront();
  const primary = theme?.settings?.colors?.primary || '#1a1a2e';
  const currentYear = new Date().getFullYear();

  return (
    <Box component="footer" sx={{ bgcolor: '#111827', color: '#9CA3AF', mt: 'auto' }}>

      {/* Main footer */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Grid container spacing={5}>
          {/* Brand column */}
          <Grid size={{ xs: 12, md: 3 }}>
            <Typography variant="h6" fontWeight={800} color="#fff" gutterBottom
              sx={{ fontFamily: 'var(--commerce-font-heading, Outfit, sans-serif)' }}>
              {theme?.name || 'Our Store'}
            </Typography>
            <Typography variant="body2" sx={{ color: '#9CA3AF', mb: 2, lineHeight: 1.7 }}>
              Your destination for quality products at great prices. Fast shipping, easy returns, and exceptional customer service.
            </Typography>
          </Grid>

          {/* Link columns */}
          {Object.entries(footerSections).map(([title, links]) => (
            <Grid size={{ xs: 6, md: 2 }} key={title}>
              <Typography variant="subtitle2" fontWeight={700} color="#fff" gutterBottom sx={{ mb: 2 }}>
                {title}
              </Typography>
              <Stack spacing={1.5}>
                {links.map((link) => (
                  <Link
                    key={link.label}
                    href={`/store/${slug}/${link.href}`}
                    underline="hover"
                    sx={{ color: '#9CA3AF', fontSize: '0.875rem', '&:hover': { color: '#fff' } }}
                  >
                    {link.label}
                  </Link>
                ))}
              </Stack>
            </Grid>
          ))}

          {/* Newsletter */}
          <Grid size={{ xs: 12, md: 3 }}>
            <Typography variant="subtitle2" fontWeight={700} color="#fff" gutterBottom sx={{ mb: 2 }}>
              Stay Connected
            </Typography>
            <Typography variant="body2" sx={{ color: '#9CA3AF', mb: 2 }}>
              Subscribe for exclusive deals, new arrivals, and insider tips.
            </Typography>
            <Box
              component="form"
              onSubmit={(e) => {
                e.preventDefault();
                const input = (e.currentTarget.elements.namedItem('email') as HTMLInputElement);
                if (input?.value) {
                  // TODO: wire to newsletter API
                  input.value = '';
                }
              }}
              sx={{ display: 'flex', gap: 1 }}
            >
              <TextField
                name="email"
                type="email"
                size="small"
                placeholder="Your email"
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'rgba(255,255,255,0.06)',
                    color: '#fff',
                    borderRadius: '8px',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                  },
                  '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,0.4)' },
                }}
              />
              <Button
                type="submit"
                variant="contained"
                sx={{ bgcolor: primary, '&:hover': { bgcolor: primary, filter: 'brightness(1.1)' }, whiteSpace: 'nowrap', px: 3 }}
              >
                Subscribe
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Container>

      {/* Bottom bar */}
      <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.06)', py: 3 }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" sx={{ color: '#6B7280' }}>
              &copy; {currentYear} {theme?.name || 'Our Store'}. Powered by Letis Commerce. All rights reserved.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              {['Visa', 'Mastercard', 'Amex', 'PayPal'].map((method) => (
                <Box
                  key={method}
                  sx={{
                    px: 1.5, py: 0.5, borderRadius: 1,
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#6B7280', fontSize: '0.75rem', fontWeight: 600,
                  }}
                >
                  {method}
                </Box>
              ))}
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default StoreFooter;
