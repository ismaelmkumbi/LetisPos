import { Box, Container, Typography, Button, Stack } from '@mui/material';
import { Link } from 'react-router';
import { IconArrowLeft, IconBuildingStore, IconHome2, IconLifebuoy } from '@tabler/icons-react';

const Error = () => (
  <Box
    sx={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      bgcolor: '#F8FAFC',
      // Subtle noise texture — matches dashboard PageWrapper
      '&::before': {
        content: '""',
        position: 'absolute',
        inset: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E")`,
        opacity: 0.03,
        pointerEvents: 'none',
      },
    }}
  >
    <Container maxWidth="sm" sx={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
      {/* 404 Number — solid, corporate, matches brand */}
      <Typography
        variant="h1"
        sx={{
          fontSize: { xs: '7rem', md: '10rem' },
          fontWeight: 800,
          lineHeight: 1,
          color: '#16A34A',
          letterSpacing: '-0.03em',
          userSelect: 'none',
          mb: 0.5,
        }}
      >
        404
      </Typography>

      {/* Heading */}
      <Typography
        variant="h3"
        fontWeight={700}
        color="#0F172A"
        mb={1.5}
        sx={{ fontSize: { xs: '1.35rem', md: '1.75rem' }, letterSpacing: '-0.02em' }}
      >
        Page not found
      </Typography>

      {/* Subtitle */}
      <Typography
        variant="body1"
        color="#64748B"
        sx={{ maxWidth: 420, mx: 'auto', mb: 4, fontSize: '0.925rem', lineHeight: 1.65 }}
      >
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </Typography>

      {/* Action buttons — dashboard style: solid green gradient primary, outlined secondary */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        justifyContent="center"
        mb={4}
      >
        <Button
          variant="contained"
          component={Link}
          to="/smartpos/dashboard"
          size="large"
          disableElevation
          startIcon={<IconBuildingStore size={18} />}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
            letterSpacing: '0.01em',
            borderRadius: '8px',
            px: 2.5,
            py: 1.25,
            background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #15803D 0%, #166534 100%)',
            },
          }}
        >
          Go to Dashboard
        </Button>
        <Button
          variant="outlined"
          component={Link}
          to="/"
          size="large"
          startIcon={<IconHome2 size={18} />}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
            borderRadius: '8px',
            px: 2.5,
            py: 1.25,
            borderColor: '#E2E8F0',
            color: '#334155',
            '&:hover': { borderColor: '#16A34A', color: '#16A34A', bgcolor: '#ECFDF5' },
          }}
        >
          Back to Home
        </Button>
      </Stack>

      {/* Subtle support link */}
      <Button
        component={Link}
        to=".."
        size="small"
        startIcon={<IconArrowLeft size={14} />}
        sx={{
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.8rem',
          color: '#94A3B8',
          borderRadius: '8px',
          '&:hover': { color: '#64748B', bgcolor: '#F1F5F9' },
        }}
      >
        Go back
      </Button>
    </Container>
  </Box>
);

export default Error;
