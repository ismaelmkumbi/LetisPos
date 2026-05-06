import { useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { IconCircleFilled } from '@tabler/icons-react';
import { useNavigate } from 'react-router';

import { brand } from 'src/theme/smartpos/brand';

const LINKED_TERMINAL_KEY = 'smartpos.linkedTerminalId';

export default function PosTerminalLaunchPage() {
  const navigate = useNavigate();
  const terminalId = (() => {
    try { return localStorage.getItem(LINKED_TERMINAL_KEY)?.slice(0, 8) ?? null; }
    catch { return null; }
  })();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      navigate('/smartpos/pos', { replace: true });
    }, 720);
    return () => window.clearTimeout(timer);
  }, [navigate]);

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        bgcolor: brand.neutral[50],
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        '@keyframes fadeSlideUp': {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        '@keyframes progressPulse': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.45 },
        },
      }}
    >
      {/* Dot-grid pattern — enterprise infrastructure feel */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: 0.28,
          backgroundImage: `radial-gradient(circle, ${brand.neutral[300]} 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Ambient brand glow */}
      <Box
        sx={{
          position: 'absolute',
          bottom: '-12%',
          right: '-8%',
          width: 420,
          height: 420,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${brand.primary[100]}40 0%, transparent 70%)`,
        }}
      />

      {/* ── Header bar ── */}
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          py: 2.25,
          borderBottom: `1px solid ${brand.neutral[200]}`,
        }}
      >
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: '1rem',
            color: brand.neutral[800],
            letterSpacing: '-0.02em',
          }}
        >
          Letis POS
        </Typography>
        {terminalId && (
          <Typography
            sx={{
              fontWeight: 600,
              fontSize: '0.6875rem',
              color: brand.neutral[400],
              fontFamily: "'DM Mono', 'Courier New', monospace",
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Terminal &middot; {terminalId}
          </Typography>
        )}
      </Box>

      {/* ── Center content ── */}
      <Box
        sx={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          px: 3,
          pb: 8,
        }}
      >
        {/* Status indicator row */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            mb: 3,
            animation: 'fadeSlideUp 280ms ease both',
          }}
        >
          <IconCircleFilled
            size={8}
            color={brand.operational.active.dot}
            style={{ animation: 'progressPulse 1.4s ease-in-out infinite' }}
          />
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: '0.625rem',
              color: brand.neutral[500],
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            Initializing
          </Typography>
        </Box>

        {/* Main title */}
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: { xs: '1.5rem', sm: '1.75rem' },
            color: brand.neutral[900],
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
            animation: 'fadeSlideUp 340ms ease both',
            animationDelay: '40ms',
          }}
        >
          POS Terminal
        </Typography>

        {/* Subtitle */}
        <Typography
          sx={{
            mt: 1,
            fontWeight: 500,
            fontSize: '0.875rem',
            color: brand.neutral[400],
            animation: 'fadeSlideUp 340ms ease both',
            animationDelay: '80ms',
          }}
        >
          Loading checkout workspace
        </Typography>

        {/* Thin progress track */}
        <Box
          sx={{
            mt: 5,
            width: 200,
            height: 2,
            borderRadius: 999,
            bgcolor: brand.neutral[200],
            overflow: 'hidden',
            animation: 'fadeSlideUp 360ms ease both',
            animationDelay: '120ms',
          }}
        >
          <Box
            sx={{
              width: '60%',
              height: '100%',
              borderRadius: 999,
              bgcolor: brand.primary[500],
              animation: 'progressPulse 1.2s ease-in-out infinite',
            }}
          />
        </Box>
      </Box>

      {/* ── Footer — operational detail ── */}
      <Box
        sx={{
          position: 'relative',
          px: 3,
          pb: 2.5,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <Typography
          sx={{
            fontWeight: 500,
            fontSize: '0.6875rem',
            color: brand.neutral[400],
            letterSpacing: '0.02em',
            animation: 'fadeSlideUp 400ms ease both',
            animationDelay: '160ms',
          }}
        >
          Retail operations system &copy; {new Date().getFullYear()}
        </Typography>
      </Box>
    </Box>
  );
}
