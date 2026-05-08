import React from 'react';
import { Box, Container, Typography, Grid, Stack } from '@mui/material';

const footerLinks = {
  Product: ['Point of Sale', 'Inventory', 'Accounting', 'Reports', 'AI Insights', 'Integrations'],
  Company: ['About', 'Careers', 'Blog', 'Press'],
  Legal: ['Terms of Service', 'Privacy Policy', 'Security'],
};

const Footer: React.FC = () => {
  return (
    <Box
      component="footer"
      sx={{
        borderTop: '1px solid var(--lp-border)',
        py: { xs: 8, md: 10 },
        bgcolor: 'var(--lp-surface)',
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={6}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Typography
              sx={{
                fontFamily: 'var(--lp-font-display)',
                fontSize: '1.5rem',
                fontWeight: 700,
                mb: 2,
                letterSpacing: '-0.02em',
              }}
            >
              Letis
            </Typography>
            <Typography
              sx={{
                fontFamily: 'var(--lp-font-body)',
                fontSize: '0.875rem',
                color: 'var(--lp-text-muted)',
                lineHeight: 1.6,
                maxWidth: 280,
              }}
            >
              The all-in-one POS platform for modern retail. Run your entire business from one place.
            </Typography>
          </Grid>

          {Object.entries(footerLinks).map(([category, links]) => (
            <Grid key={category} size={{ xs: 6, md: 2.6 }}>
              <Typography
                sx={{
                  fontFamily: 'var(--lp-font-body)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--lp-text-muted)',
                  mb: 2,
                }}
              >
                {category}
              </Typography>
              <Stack spacing={1.5}>
                {links.map((link) => (
                  <Typography
                    key={link}
                    component="a"
                    href="#"
                    sx={{
                      fontFamily: 'var(--lp-font-body)',
                      fontSize: '0.875rem',
                      color: 'var(--lp-text)',
                      textDecoration: 'none',
                      '&:hover': { color: 'var(--lp-accent)' },
                      transition: 'color 0.2s ease',
                    }}
                  >
                    {link}
                  </Typography>
                ))}
              </Stack>
            </Grid>
          ))}
        </Grid>

        <Box
          sx={{
            mt: 8,
            pt: 4,
            borderTop: '1px solid var(--lp-border)',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2,
          }}
        >
          <Typography
            sx={{
              fontFamily: 'var(--lp-font-body)',
              fontSize: '0.813rem',
              color: 'var(--lp-text-muted)',
            }}
          >
            &copy; {new Date().getFullYear()} Letis. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
