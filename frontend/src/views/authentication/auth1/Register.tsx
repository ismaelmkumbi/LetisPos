import { Box, Typography, keyframes } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import BrandLogo, { LetisMark } from 'src/components/smartpos/BrandLogo';
import { brand } from 'src/theme/smartpos/brand';
import AuthRegister from '../authForms/AuthRegister';

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

/* ─── Abstract illustration: workspace building blocks ─── */

const SetupIllustration = () => (
  <Box
    component="svg"
    viewBox="0 0 400 240"
    role="img"
    aria-label="Letis POS workspace setup illustration"
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
      <linearGradient id="rgGrad1" x1="0" y1="0" x2="1" y2="1">
        <stop stopColor={brand.primary[400]} />
        <stop offset="1" stopColor={brand.primary[600]} />
      </linearGradient>
      <linearGradient id="rgGrad2" x1="0" y1="0" x2="0" y2="1">
        <stop stopColor={brand.primary[50]} />
        <stop offset="1" stopColor={brand.primary[100]} />
      </linearGradient>
      <radialGradient id="rgGlow" cx="0.5" cy="0.5" r="0.5">
        <stop stopColor={brand.primary[100]} stopOpacity="0.5" />
        <stop offset="1" stopColor={brand.primary[50]} stopOpacity="0" />
      </radialGradient>
    </defs>
    <ellipse cx="200" cy="120" rx="170" ry="95" fill="url(#rgGlow)" />
    <rect x="44" y="38" width="180" height="148" rx="18" fill="#FFFFFF" />
    <rect x="44" y="38" width="180" height="40" rx="18" fill={brand.neutral[50]} />
    <circle cx="68" cy="58" r="5" fill={brand.primary[400]} />
    <rect x="82" y="53" width="80" height="8" rx="4" fill={brand.neutral[200]} />
    <rect x="64" y="98" width="140" height="10" rx="5" fill={brand.neutral[100]} />
    <rect x="64" y="118" width="100" height="10" rx="5" fill={brand.neutral[100]} />
    <rect x="64" y="148" width="44" height="24" rx="8" fill={brand.primary[100]} />
    <rect x="120" y="148" width="44" height="24" rx="8" fill={brand.primary[50]} stroke={brand.primary[200]} strokeWidth="1" />
    <rect x="176" y="148" width="28" height="24" rx="8" fill={brand.neutral[50]} stroke={brand.neutral[200]} strokeWidth="1" />
    <rect x="252" y="54" width="100" height="62" rx="16" fill="#FFFFFF" />
    <circle cx="282" cy="80" r="14" fill={brand.primary[50]} stroke={brand.primary[200]} strokeWidth="1.5" />
    <circle cx="306" cy="80" r="14" fill={brand.accent[100]} stroke={brand.accent[300]} strokeWidth="1.5" />
    <circle cx="330" cy="80" r="14" fill={brand.neutral[100]} stroke={brand.neutral[200]} strokeWidth="1.5" />
    <rect x="268" y="104" width="68" height="6" rx="3" fill={brand.neutral[200]} />
    <rect x="252" y="134" width="100" height="52" rx="14" fill="#FFFFFF" />
    <path d="M268 172L284 160L300 166L316 148L332 154" fill="none" stroke="url(#rgGrad1)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="332" cy="154" r="6" fill="#FFFFFF" stroke={brand.primary[600]} strokeWidth="2.5" />
    <rect x="14" y="160" width="32" height="32" rx="10" fill={brand.primary[50]} stroke={brand.primary[100]} strokeWidth="1" opacity="0.7" />
    <path d="M23 176l6 6l12-12" fill="none" stroke={brand.primary[500]} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
  </Box>
);

/* ─── Page ─── */

const Register = () => (
  <PageContainer title="Create Letis POS workspace" description="Create a Letis POS workspace">
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
            Set up your
            <br />
            <Box component="span" sx={{ color: brand.primary[600] }}>
              workspace.
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
            Create your business account, invite your team later, and start fresh with a clean tenant.
          </Typography>

          <Box sx={{ mt: { xs: 2, md: 4 } }}>
            <SetupIllustration />
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
        <Box sx={{ width: '100%', maxWidth: 440 }}>
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
            Create workspace
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
            Business details first, admin account next.
          </Typography>

          <Box sx={{ animation: anim(fadeInUp, 450) }}>
            <AuthRegister />
          </Box>
        </Box>
      </Box>
    </Box>
  </PageContainer>
);

export default Register;
