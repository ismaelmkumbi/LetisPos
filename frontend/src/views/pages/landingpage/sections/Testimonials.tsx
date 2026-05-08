import React from 'react';
import { Box, Container, Typography, Grid } from '@mui/material';
import { IconQuote } from '@tabler/icons-react';
import SectionWrapper from '../components/SectionWrapper';

const testimonials = [
  {
    quote: 'Letis replaced three separate systems. Our inventory accuracy went from "best guess" to 99%. The time savings alone paid for the switch in the first month.',
    name: 'Sarah Mensah',
    role: 'Owner, QuickMart — 3 locations',
  },
  {
    quote: 'The accounting integration is what sold us. Sales flow directly into our ledger. Month-end close used to take 3 days — now it takes an afternoon.',
    name: 'David Ochieng',
    role: 'Finance Manager, RetailPlus Ltd',
  },
  {
    quote: 'We run 12 stores across two cities. Letis gives me a single dashboard for everything — stock levels, daily sales, staff attendance. I check it every morning.',
    name: 'Amina Diallo',
    role: 'Operations Director, CityGoods Group',
  },
];

const Testimonials: React.FC = () => {
  return (
    <SectionWrapper>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography
            sx={{
              fontFamily: 'var(--lp-font-display)',
              fontSize: { xs: '2rem', md: '2.75rem' },
              fontWeight: 700,
              letterSpacing: '-0.02em',
              mb: 2,
            }}
          >
            Trusted by businesses like yours
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {testimonials.map((t) => (
            <Grid key={t.name} size={{ xs: 12, md: 4 }}>
              <Box
                sx={{
                  p: 4,
                  height: '100%',
                  borderRadius: 2,
                  bgcolor: 'var(--lp-surface)',
                  border: '1px solid var(--lp-border)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Box sx={{ color: 'var(--lp-accent)', mb: 2 }}>
                  <IconQuote size={32} strokeWidth={1.5} />
                </Box>
                <Typography
                  sx={{
                    fontFamily: 'var(--lp-font-body)',
                    fontSize: '0.938rem',
                    color: 'var(--lp-text)',
                    lineHeight: 1.7,
                    mb: 3,
                    flex: 1,
                  }}
                >
                  "{t.quote}"
                </Typography>
                <Box>
                  <Typography
                    sx={{
                      fontFamily: 'var(--lp-font-display)',
                      fontSize: '0.938rem',
                      fontWeight: 600,
                    }}
                  >
                    {t.name}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: 'var(--lp-font-body)',
                      fontSize: '0.813rem',
                      color: 'var(--lp-text-muted)',
                    }}
                  >
                    {t.role}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </SectionWrapper>
  );
};

export default Testimonials;
