/**
 * Letis POS — Sign-In.
 *
 * Refined two-column layout with staggered entrance animations
 * and mobile-friendly responsive design.
 */
import React from 'react';
import { Box, Typography, keyframes } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import BrandLogo, { LetisMark } from 'src/components/smartpos/BrandLogo';
import { brand } from 'src/theme/smartpos/brand';
import AuthLoginForm from './AuthLoginForm';

/* ─── Keyframes ─────────────────────────────────────────────────────────────── */

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-8px); }
`;

const anim = (name: string, delay = 0) =>
  `${name} 0.55s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms both`;

/* ─── Abstract illustration: secure dashboard ─── */

const HeroIllustration: React.FC = () => (
  <Box
    component="svg"
    viewBox="0 0 400 240"
    role="img"
    aria-label="Letis POS dashboard and secure access illustration"
    sx={{
      width: '100%',
      maxWidth: { xs: 260, sm: 320, md: 380 },
      display: { xs: 'none', xxs: 'block' },
      mx: { xs: 'auto', md: 0 },
      filter: 'drop-shadow(0 16px 32px rgba(15,23,42,0.08))',
      animation: `${anim(fadeInUp, 280)}, ${float} 6s ease-in-out 1s infinite`,
    }}
  >
    <defs>
      <linearGradient id="hlGrad1" x1="0" y1="0" x2="1" y2="1">
        <stop stopColor={brand.primary[400]} />
        <stop offset="1" stopColor={brand.primary[600]} />
      </linearGradient>
      <linearGradient id="hlGrad2" x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#FFFFFF" />
        <stop offset="1" stopColor="#F1F5F9" />
      </linearGradient>
      <linearGradient id="hlGrad3" x1="0" y1="0" x2="1" y2="0">
        <stop stopColor={brand.primary[50]} />
        <stop offset="1" stopColor={brand.primary[100]} />
      </linearGradient>
      <radialGradient id="hlGlow" cx="0.5" cy="0.5" r="0.5">
        <stop stopColor={brand.primary[100]} stopOpacity="0.6" />
        <stop offset="1" stopColor={brand.primary[50]} stopOpacity="0" />
      </radialGradient>
    </defs>
    <ellipse cx="200" cy="120" rx="180" ry="100" fill="url(#hlGlow)" />
    <rect x="40" y="28" width="240" height="170" rx="20" fill="#FFFFFF" />
    <rect x="40" y="28" width="240" height="42" rx="20" fill={brand.neutral[50]} />
    <circle cx="64" cy="49" r="5" fill="#EF4444" opacity="0.7" />
    <circle cx="82" cy="49" r="5" fill="#F59E0B" opacity="0.7" />
    <circle cx="100" cy="49" r="5" fill={brand.primary[500]} opacity="0.8" />
    <rect x="64" y="92" width="18" height="60" rx="6" fill={brand.primary[100]} />
    <rect x="90" y="110" width="18" height="42" rx="6" fill={brand.primary[100]} />
    <rect x="116" y="74" width="18" height="78" rx="6" fill="url(#hlGrad1)" />
    <rect x="142" y="98" width="18" height="54" rx="6" fill={brand.primary[100]} />
    <rect x="168" y="120" width="18" height="32" rx="6" fill={brand.primary[100]} />
    <path d="M194 132L210 118L226 125L242 100L258 108" fill="none" stroke={brand.primary[500]} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="258" cy="108" r="7" fill="#FFFFFF" stroke={brand.primary[600]} strokeWidth="3" />
    <rect x="296" y="84" width="80" height="52" rx="14" fill="#FFFFFF" />
    <rect x="310" y="98" width="52" height="8" rx="4" fill={brand.neutral[200]} />
    <rect x="310" y="114" width="36" height="12" rx="4" fill={brand.primary[400]} />
    <rect x="68" y="172" width="88" height="10" rx="5" fill={brand.neutral[100]} />
    <g transform="translate(320, 14)">
      <path d="M16 2L2 8v10c0 8 6 14 14 18c8-4 14-10 14-18V8L16 2z" fill="#FFFFFF" stroke={brand.primary[300]} strokeWidth="1.5" />
      <path d="M10 16l4 4l8-8" fill="none" stroke={brand.primary[600]} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </g>
    <g transform="translate(310, 168)">
      <rect x="0" y="0" width="60" height="36" rx="10" fill={brand.primary[50]} stroke={brand.primary[200]} strokeWidth="1" />
      <rect x="10" y="8" width="40" height="14" rx="4" fill={brand.primary[100]} />
      <rect x="18" y="26" width="24" height="4" rx="2" fill={brand.primary[200]} />
    </g>
  </Box>
);

/* ─── Page ─── */

const LoginPage: React.FC = () => (
  <PageContainer title="Letis POS — Sign in" description="Sign in to your Letis POS workspace">
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        minHeight: '100dvh',
        bgcolor: '#FBFCFD',
      }}
    >
      {/* ── Left panel: brand + illustration ── */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: { xs: 'center', md: 'flex-start' },
          px: { xs: 2.5, sm: 5, md: 8, lg: 10 },
          py: { xs: 2.5, sm: 3, md: 6 },
          position: 'relative',
          overflow: 'hidden',
          background: `linear-gradient(160deg, #FFFFFF 0%, #F8FAFC 40%, ${brand.primary[50]} 100%)`,
          '&::before': {
            content: '""',
            position: 'absolute',
            top: -80,
            left: -40,
            width: 280,
            height: 280,
            borderRadius: '50%',
            background: `radial-gradient(closest-side, ${brand.primary[50]}, transparent)`,
            pointerEvents: 'none',
          },
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 480 }}>
          {/* Logo — anim 0 */}
          <Box sx={{ mb: { xs: 2.5, md: 5 }, animation: anim(fadeInUp, 0) }}>
            <BrandLogo size="md" />
          </Box>

          {/* Headline — anim 1 */}
          <Typography
            component="h1"
            sx={{
              fontWeight: 900,
              letterSpacing: '-0.04em',
              lineHeight: 1.06,
              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem', lg: '2.8rem' },
              color: brand.neutral[900],
              maxWidth: 420,
              animation: anim(fadeInUp, 80),
            }}
          >
            Run your business
            <br />
            <Box component="span" sx={{ color: brand.primary[600] }}>
              in one place.
            </Box>
          </Typography>

          {/* Subtitle — anim 2 */}
          <Typography
            sx={{
              mt: 1.25,
              fontSize: { xs: '0.82rem', sm: '0.9rem', md: '0.95rem' },
              lineHeight: 1.55,
              color: brand.neutral[500],
              maxWidth: 380,
              animation: anim(fadeInUp, 160),
            }}
          >
            Sales, stock, customers, and reports — every workspace, one dashboard.
          </Typography>

          {/* Illustration — anim 3 + float */}
          <Box sx={{ mt: { xs: 2, md: 4 } }}>
            <HeroIllustration />
          </Box>
        </Box>
      </Box>

      {/* ── Right panel: sign-in card ── */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'center',
          px: { xs: 2, sm: 6 },
          py: { xs: 1.5, sm: 5, md: 6 },
          bgcolor: '#FFFFFF',
          animation: anim(fadeInUp, 150),
        }}
      >
        {/* System status pill */}
        <Box
          sx={{
            display: { xs: 'none', sm: 'flex' },
            position: 'absolute',
            top: 20,
            right: 24,
            alignItems: 'center',
            gap: 0.75,
            px: 1.5,
            py: 0.6,
            borderRadius: '20px',
            bgcolor: brand.neutral[50],
            border: `1px solid ${brand.neutral[200]}`,
          }}
        >
          <Box
            sx={{
              width: 7, height: 7, borderRadius: '50%',
              bgcolor: brand.success.main,
              boxShadow: `0 0 0 2.5px ${brand.success.light}`,
            }}
          />
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: brand.neutral[600] }}>
            System online
          </Typography>
        </Box>

        <Box sx={{ width: '100%', maxWidth: 420 }}>
          {/* LetisMark medallion */}
          <Box
            sx={{
              width: { xs: 52, sm: 64 }, height: { xs: 52, sm: 64 },
              borderRadius: '50%',
              bgcolor: brand.primary[50],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: { xs: 1.5, sm: 2 },
              animation: anim(fadeIn, 300),
            }}
          >
            <LetisMark size={36} />
          </Box>

          <Typography
            component="h2"
            sx={{
              textAlign: 'center',
              fontSize: { xs: '1.25rem', sm: '1.5rem' },
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: brand.neutral[900],
              animation: anim(fadeInUp, 350),
            }}
          >
            Welcome back
          </Typography>
          <Typography
            sx={{
              textAlign: 'center',
              fontSize: '0.85rem',
              color: brand.neutral[500],
              mt: 0.4,
              mb: { xs: 2, sm: 3 },
              animation: anim(fadeInUp, 400),
            }}
          >
            Sign in to your Letis POS account
          </Typography>

          <Box sx={{ animation: anim(fadeInUp, 450) }}>
            <AuthLoginForm />
          </Box>
        </Box>
      </Box>
    </Box>
  </PageContainer>
);

export default LoginPage;
