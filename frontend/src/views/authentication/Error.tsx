import { Box, Container, Typography, Button, Stack, Chip } from '@mui/material';
import { Link } from 'react-router';
import { IconArrowLeft, IconDashboard, IconHome, IconHeadset } from '@tabler/icons-react';
import Logo from 'src/layouts/full/shared/logo/Logo';

const Error = () => (
  <Box
    sx={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      bgcolor: '#fafbfc',
      '&::before': {
        content: '""',
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(circle at 20% 80%, #d2f1df 0%, transparent 50%), radial-gradient(circle at 80% 20%, #d3d7fa 0%, transparent 50%), radial-gradient(circle at 50% 50%, #bad8f4 0%, transparent 60%)',
        backgroundSize: '200% 200%',
        animation: 'gradient 15s ease infinite',
        opacity: 0.4,
      },
      '@keyframes gradient': {
        '0%': { backgroundPosition: '0% 0%' },
        '50%': { backgroundPosition: '100% 100%' },
        '100%': { backgroundPosition: '0% 0%' },
      },
      '@keyframes float': {
        '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
        '25%': { transform: 'translateY(-10px) rotate(1deg)' },
        '75%': { transform: 'translateY(10px) rotate(-1deg)' },
      },
      '@keyframes pulse': {
        '0%, 100%': { opacity: 0.15 },
        '50%': { opacity: 0.3 },
      },
    }}
  >
    {/* Logo */}
    <Box sx={{ position: 'absolute', top: 32, left: 40 }}>
      <Logo />
    </Box>

    <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
      {/* Animated 404 number */}
      <Box sx={{ position: 'relative', mb: 2 }}>
        {/* Shadow/blur behind the number */}
        <Typography
          variant="h1"
          sx={{
            fontSize: { xs: '8rem', md: '12rem' },
            fontWeight: 900,
            lineHeight: 1,
            position: 'absolute',
            inset: 0,
            color: 'primary.main',
            filter: 'blur(40px)',
            opacity: 0.2,
            animation: 'pulse 3s ease-in-out infinite',
            userSelect: 'none',
          }}
        >
          404
        </Typography>
        {/* Main number with gradient text */}
        <Typography
          variant="h1"
          sx={{
            fontSize: { xs: '8rem', md: '12rem' },
            fontWeight: 900,
            lineHeight: 1,
            position: 'relative',
            background: 'linear-gradient(135deg, #6366f1 0%, #0ea5e9 40%, #10b981 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: 'float 6s ease-in-out infinite',
            userSelect: 'none',
            mb: 1,
          }}
        >
          404
        </Typography>
      </Box>

      {/* Status chip */}
      <Chip
        label="Page not found"
        size="small"
        sx={{
          mb: 2,
          fontWeight: 700,
          fontSize: '0.7rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          bgcolor: 'error.light',
          color: 'error.dark',
          borderRadius: '20px',
          px: 1,
        }}
      />

      {/* Heading */}
      <Typography
        variant="h3"
        fontWeight={800}
        mb={1.5}
        sx={{ fontSize: { xs: '1.5rem', md: '2rem' } }}
      >
        Oops, this page doesn&apos;t exist
      </Typography>

      {/* Subtitle */}
      <Typography
        variant="body1"
        color="text.secondary"
        sx={{ maxWidth: 480, mx: 'auto', mb: 5, fontSize: '0.95rem', lineHeight: 1.7 }}
      >
        The page you&apos;re looking for may have been moved, renamed, or is temporarily unavailable.
        Let&apos;s get you back on track.
      </Typography>

      {/* Action buttons */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        justifyContent="center"
        mb={5}
      >
        <Button
          variant="contained"
          component={Link}
          to="/smartpos/dashboard"
          size="large"
          startIcon={<IconDashboard size={18} />}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            fontSize: '0.875rem',
            borderRadius: '10px',
            px: 3,
            py: 1.25,
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
            '&:hover': {
              boxShadow: '0 6px 20px rgba(99, 102, 241, 0.5)',
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
          startIcon={<IconHome size={18} />}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
            borderRadius: '10px',
            px: 3,
            py: 1.25,
            borderColor: 'divider',
            color: 'text.secondary',
            '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
          }}
        >
          Back to Home
        </Button>
        <Button
          variant="text"
          component={Link}
          to="/smartpos/support"
          size="large"
          startIcon={<IconHeadset size={18} />}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
            borderRadius: '10px',
            px: 3,
            py: 1.25,
            color: 'text.secondary',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          Contact Support
        </Button>
      </Stack>

      {/* Back arrow */}
      <Button
        component={Link}
        to=".."
        size="small"
        startIcon={<IconArrowLeft size={16} />}
        sx={{
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.8rem',
          color: 'text.disabled',
          '&:hover': { color: 'text.secondary' },
        }}
      >
        Go back
      </Button>
    </Container>
  </Box>
);

export default Error;
