import React, { useState } from 'react';
import { Box, Container, Typography, Grid, Stack, TextField, Button, Alert } from '@mui/material';
import BrandLogo from 'src/components/smartpos/BrandLogo';
import { useLpTheme } from '../LandingpageTheme';
import { createDemoRequest } from 'src/api/smartpos/support';

const footerLinks = {
  Product: ['Point of Sale', 'Inventory', 'Accounting', 'Reports', 'AI Insights', 'Integrations'],
  Company: ['About', 'Careers', 'Blog', 'Press'],
  Legal: ['Terms of Service', 'Privacy Policy', 'Security'],
};

const Footer: React.FC = () => {
  const { theme } = useLpTheme();
  const logoColor = theme === 'refined-enterprise' ? 'onDark' : 'default';
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMsg, setContactMsg] = useState('');
  const [contactSent, setContactSent] = useState(false);
  const [contactSending, setContactSending] = useState(false);

  const handleContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim() || !contactMsg.trim()) return;
    setContactSending(true);
    try {
      await createDemoRequest({
        name: contactName,
        email: contactEmail,
        subject: 'Contact form — landing page',
        message: contactMsg,
      });
      setContactSent(true);
    } catch {
      setContactSent(true); // don't block on failure
    } finally {
      setContactSending(false);
    }
  };

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
            <Box sx={{ mb: 2 }}>
              <BrandLogo variant="inline" size="md" color={logoColor} />
            </Box>
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

          {/* Contact form */}
          <Grid size={{ xs: 12, md: 3 }}>
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
              Contact Us
            </Typography>
            {contactSent ? (
              <Alert severity="success" sx={{ fontFamily: 'var(--lp-font-body)' }}>
                Message sent. We'll get back to you soon.
              </Alert>
            ) : (
              <form onSubmit={handleContact}>
                <Stack spacing={1.5}>
                  <TextField
                    size="small"
                    placeholder="Your name"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    required
                    fullWidth
                    InputProps={{
                      sx: {
                        fontFamily: 'var(--lp-font-body)',
                        fontSize: '0.813rem',
                        bgcolor: 'var(--lp-surface)',
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--lp-border)' },
                      },
                    }}
                  />
                  <TextField
                    size="small"
                    type="email"
                    placeholder="Your email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    required
                    fullWidth
                    InputProps={{
                      sx: {
                        fontFamily: 'var(--lp-font-body)',
                        fontSize: '0.813rem',
                        bgcolor: 'var(--lp-surface)',
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--lp-border)' },
                      },
                    }}
                  />
                  <TextField
                    size="small"
                    placeholder="Message"
                    value={contactMsg}
                    onChange={(e) => setContactMsg(e.target.value)}
                    required
                    multiline
                    minRows={2}
                    fullWidth
                    InputProps={{
                      sx: {
                        fontFamily: 'var(--lp-font-body)',
                        fontSize: '0.813rem',
                        bgcolor: 'var(--lp-surface)',
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--lp-border)' },
                      },
                    }}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={contactSending}
                    size="small"
                    sx={{
                      fontFamily: 'var(--lp-font-body)',
                      fontWeight: 600,
                      textTransform: 'none',
                      bgcolor: 'var(--lp-accent)',
                      '&:hover': { bgcolor: 'var(--lp-accent-hover)' },
                    }}
                  >
                    {contactSending ? 'Sending…' : 'Send message'}
                  </Button>
                </Stack>
              </form>
            )}
          </Grid>
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
