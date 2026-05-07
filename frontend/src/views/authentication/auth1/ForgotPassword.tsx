import { Box, Typography, keyframes } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import BrandLogo, { LetisMark } from 'src/components/smartpos/BrandLogo';
import { brand } from 'src/theme/smartpos/brand';
import AuthForgotPassword from '../authForms/AuthForgotPassword';

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

/* ─── Abstract illustration: recovery ─── */

const RecoveryIllustration = () => (
  <Box
    component="svg"
    viewBox="0 0 400 240"
    role="img"
    aria-label="Password recovery illustration"
    sx={{
      width: '100%',
      maxWidth: { xs: 240, sm: 300, md: 340 },
      display: { xs: 'none', xxs: 'block' },
      mx: { xs: 'auto', md: 0 },
      filter: 'drop-shadow(0 16px 32px rgba(15,23,42,0.08))',
      animation: `${anim(fadeInUp, 280)}, ${float} 6s ease-in-out 1s infinite`,
    }}
  >
    <defs>
      <linearGradient id="fpGrad1" x1="0" y1="0" x2="1" y2="1">
        <stop stopColor={brand.primary[400]} />
        <stop offset="1" stopColor={brand.primary[600]} />
      </linearGradient>
      <radialGradient id="fpGlow" cx="0.5" cy="0.5" r="0.5">
        <stop stopColor={brand.primary[100]} stopOpacity="0.5" />
        <stop offset="1" stopColor={brand.primary[50]} stopOpacity="0" />
      </radialGradient>
    </defs>
    <ellipse cx="200" cy="120" rx="170" ry="95" fill="url(#fpGlow)" />
    <rect x="60" y="42" width="180" height="120" rx="18" fill="#FFFFFF" />
    <path d="M60 72L150 126L240 72" fill={brand.primary[50]} stroke={brand.neutral[200]} strokeWidth="1" />
    <rect x="110" y="92" width="80" height="48" rx="10" fill={brand.neutral[50]} stroke={brand.neutral[200]} strokeWidth="1" />
    <rect x="122" y="104" width="56" height="8" rx="4" fill={brand.neutral[200]} />
    <rect x="122" y="120" width="40" height="8" rx="4" fill={brand.neutral[200]} />
    <g transform="translate(266, 50)">
      <rect x="0" y="14" width="56" height="40" rx="10" fill={brand.primary[50]} stroke={brand.primary[200]} strokeWidth="1.5" />
      <path d="M13 14V6C13 1 19 -2 24 2L28 6" fill="none" stroke={brand.primary[500]} strokeWidth="3" strokeLinecap="round" />
      <circle cx="28" cy="34" r="5" fill={brand.primary[600]} />
    </g>
    <g transform="translate(266, 142)">
      <circle cx="28" cy="28" r="28" fill={brand.primary[50]} stroke={brand.primary[200]} strokeWidth="1.5" />
      <path d="M16 28l8 8l16-16" fill="none" stroke={brand.primary[600]} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </g>
    <circle cx="48" cy="186" r="4" fill={brand.primary[200]} opacity="0.5" />
    <circle cx="74" cy="196" r="3" fill={brand.primary[300]} opacity="0.4" />
    <circle cx="98" cy="184" r="5" fill={brand.primary[100]} opacity="0.6" />
  </Box>
);

/* ─── Page ─── */

const ForgotPassword = () => (
  <PageContainer title="Forgot Password — Letis POS" description="Reset your Letis POS password">
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        minHeight: '100dvh',
        bgcolor: '#FBFCFD',
      }}
    >
      {/* ── Left panel ── */}
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
            top: -80, left: -40, width: 280, height: 280,
            borderRadius: '50%',
            background: `radial-gradient(closest-side, ${brand.primary[50]}, transparent)`,
            pointerEvents: 'none',
          },
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 480 }}>
          <Box sx={{ mb: { xs: 2.5, md: 5 }, animation: anim(fadeInUp, 0) }}>
            <BrandLogo size="md" />
          </Box>

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
            Reset your
            <br />
            <Box component="span" sx={{ color: brand.primary[600] }}>
              password.
            </Box>
          </Typography>

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
            Enter your email and we&apos;ll send you a link to get back into your account.
          </Typography>

          <Box sx={{ mt: { xs: 2, md: 4 } }}>
            <RecoveryIllustration />
          </Box>
        </Box>
      </Box>

      {/* ── Right panel ── */}
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
        <Box sx={{ width: '100%', maxWidth: 420 }}>
          <Box
            sx={{
              width: { xs: 52, sm: 64 }, height: { xs: 52, sm: 64 },
              borderRadius: '50%',
              bgcolor: brand.primary[50],
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              mx: 'auto', mb: { xs: 1.5, sm: 2 },
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
            Forgot your password?
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
            We&apos;ll email you a reset link.
          </Typography>

          <Box sx={{ animation: anim(fadeInUp, 450) }}>
            <AuthForgotPassword />
          </Box>
        </Box>
      </Box>
    </Box>
  </PageContainer>
);

export default ForgotPassword;
