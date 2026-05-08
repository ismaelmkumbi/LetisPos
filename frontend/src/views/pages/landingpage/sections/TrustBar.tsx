import React from 'react';
import { Box, Container, Typography, Stack } from '@mui/material';
import SectionWrapper from '../components/SectionWrapper';

const capabilities = [
  { label: 'POS Terminal', value: 'In-store & online' },
  { label: 'Inventory', value: 'Multi-warehouse' },
  { label: 'Accounting', value: 'Double-entry' },
  { label: 'AI Reports', value: 'Predictive insights' },
  { label: 'HRM', value: 'Staff & payroll' },
  { label: 'Multi-store', value: 'Unlimited locations' },
];

const TrustBar: React.FC = () => {
  return (
    <SectionWrapper sx={{ py: 5, borderBottom: '1px solid var(--lp-border)' }}>
      <Container maxWidth="lg">
        <Typography
          sx={{
            fontFamily: 'var(--lp-font-body)',
            fontSize: '0.813rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--lp-text-muted)',
            mb: 3,
          }}
        >
          Everything you need to run a modern retail business
        </Typography>
        <Stack
          direction="row"
          spacing={0}
          flexWrap="wrap"
          useFlexGap
          sx={{ gap: 1.5 }}
        >
          {capabilities.map((cap) => (
            <Box
              key={cap.label}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 2,
                py: 1,
                borderRadius: '8px',
                bgcolor: 'var(--lp-surface)',
                border: '1px solid var(--lp-border)',
              }}
            >
              <Typography
                sx={{
                  fontFamily: 'var(--lp-font-display)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--lp-text)',
                }}
              >
                {cap.label}
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'var(--lp-font-body)',
                  fontSize: '0.75rem',
                  color: 'var(--lp-text-muted)',
                }}
              >
                {cap.value}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Container>
    </SectionWrapper>
  );
};

export default TrustBar;
