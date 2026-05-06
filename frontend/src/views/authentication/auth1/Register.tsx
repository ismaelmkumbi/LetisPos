import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import {
  IconBox,
  IconBuilding,
  IconChartBar,
  IconShieldCheck,
} from '@tabler/icons-react';

import PageContainer from 'src/components/container/PageContainer';
import BrandLogo, { LetisMark } from 'src/components/smartpos/BrandLogo';
import { brand } from 'src/theme/smartpos/brand';

import AuthRegister from '../authForms/AuthRegister';

interface PointProps {
  icon: React.ReactNode;
  title: string;
  body: string;
}

const Point = ({ icon, title, body }: PointProps) => (
  <Stack direction="row" spacing={1.5} alignItems="flex-start">
    <Box
      sx={{
        width: 38,
        height: 38,
        borderRadius: '50%',
        bgcolor: '#FFFFFF',
        color: brand.primary[600],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 10px 28px rgba(15,23,42,0.08)',
      }}
    >
      {icon}
    </Box>
    <Box>
      <Typography sx={{ fontSize: 14.5, fontWeight: 800, color: brand.neutral[900], lineHeight: 1.25 }}>
        {title}
      </Typography>
      <Typography sx={{ mt: 0.2, fontSize: 13, color: brand.neutral[500], lineHeight: 1.45 }}>
        {body}
      </Typography>
    </Box>
  </Stack>
);

const SetupIllustration = () => (
  <Box
    sx={{
      display: { xs: 'none', md: 'block' },
      mt: 4,
      p: 2,
      borderRadius: 4,
      bgcolor: 'rgba(255,255,255,0.68)',
      border: `1px solid ${brand.neutral[200]}`,
      boxShadow: '0 24px 70px rgba(15,23,42,0.10)',
      backdropFilter: 'blur(10px)',
    }}
  >
    <Box
      component="svg"
      viewBox="0 0 560 320"
      role="img"
      aria-label="Letis POS workspace setup preview"
      sx={{ display: 'block', width: '100%', maxWidth: 460, mx: 'auto' }}
    >
      <defs>
        <linearGradient id="registerPanel" x1="82" y1="34" x2="478" y2="286" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#ECFDF5" />
        </linearGradient>
        <linearGradient id="registerGreen" x1="142" y1="96" x2="386" y2="232" gradientUnits="userSpaceOnUse">
          <stop stopColor={brand.primary[500]} />
          <stop offset="1" stopColor={brand.primary[700]} />
        </linearGradient>
      </defs>
      <ellipse cx="280" cy="286" rx="190" ry="22" fill="#0F172A" opacity="0.08" />
      <rect x="74" y="34" width="412" height="238" rx="32" fill="url(#registerPanel)" />
      <rect x="100" y="62" width="360" height="52" rx="18" fill="#FFFFFF" />
      <circle cx="130" cy="88" r="11" fill={brand.primary[500]} />
      <rect x="154" y="80" width="116" height="12" rx="6" fill="#CBD5E1" />
      <rect x="340" y="75" width="84" height="26" rx="13" fill={brand.primary[100]} />
      <rect x="110" y="138" width="142" height="96" rx="22" fill="#FFFFFF" />
      <path d="M142 205L166 178L188 194L220 158" fill="none" stroke="url(#registerGreen)" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="278" y="138" width="172" height="42" rx="18" fill="#FFFFFF" />
      <rect x="304" y="154" width="86" height="10" rx="5" fill="#BAEBD2" />
      <circle cx="418" cy="159" r="11" fill={brand.primary[100]} />
      <path d="M413 159L417 164L425 154" fill="none" stroke={brand.primary[700]} strokeWidth="4" strokeLinecap="round" />
      <rect x="278" y="196" width="172" height="38" rx="17" fill="#FFFFFF" />
      <rect x="304" y="210" width="118" height="9" rx="4.5" fill="#D9E6DE" />
    </Box>
  </Box>
);

const Register = () => (
  <PageContainer title="Create Letis POS workspace" description="Create a Letis POS workspace">
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        bgcolor: '#FFFFFF',
      }}
    >
      <Box
        sx={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          px: { xs: 3, sm: 5, md: 8, lg: 10 },
          py: { xs: 4, md: 7 },
          background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 48%, #ECFDF5 100%)',
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <BrandLogo size="lg" />
        </Box>

        <Box sx={{ position: 'relative', zIndex: 1, mt: { xs: 5, md: 7 }, maxWidth: 520 }}>
          <Typography
            component="h1"
            sx={{
              fontWeight: 800,
              lineHeight: 1.04,
              letterSpacing: '-0.035em',
              fontSize: { xs: '2.1rem', sm: '2.55rem', lg: '3.15rem' },
              color: brand.neutral[900],
            }}
          >
            Set up your
            <br />
            <Box component="span" sx={{ color: brand.primary[600] }}>
              workspace.
            </Box>
          </Typography>

          <Typography sx={{ mt: 2.25, maxWidth: 440, fontSize: 15.5, lineHeight: 1.55, color: brand.neutral[600] }}>
            Create the business account, invite your team later, and start with a clean tenant setup.
          </Typography>

          <Stack spacing={2.25} sx={{ mt: 4, maxWidth: 430 }}>
            <Point icon={<IconBuilding size={20} stroke={1.8} />} title="Business workspace" body="A separate tenant for your stores and users." />
            <Point icon={<IconBox size={20} stroke={1.8} />} title="Inventory ready" body="Products, stock, and warehouses stay scoped." />
            <Point icon={<IconChartBar size={20} stroke={1.8} />} title="Reports from day one" body="Sales and performance follow the workspace." />
            <Point icon={<IconShieldCheck size={20} stroke={1.8} />} title="Secure access" body="Your first account becomes the workspace admin." />
          </Stack>

          <SetupIllustration />
        </Box>
      </Box>

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: { xs: '100dvh', md: 'auto' },
          px: { xs: 1.75, sm: 5, md: 6 },
          py: { xs: 2, sm: 4, md: 8 },
          bgcolor: '#FFFFFF',
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 480,
            p: { xs: 2, sm: 4.5, md: 5 },
            borderRadius: { xs: 0, sm: '16px' },
            bgcolor: '#FFFFFF',
            border: { xs: 'none', sm: `1px solid ${brand.neutral[200]}` },
            boxShadow: { xs: 'none', sm: '0 24px 70px rgba(15,23,42,0.10)' },
          }}
        >
          <Box
            sx={{
              width: 70,
              height: 70,
              borderRadius: '50%',
              bgcolor: brand.primary[50],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: { xs: 1.75, sm: 2.25 },
            }}
          >
            <LetisMark size={38} />
          </Box>

          <Typography
            component="h2"
            sx={{
              textAlign: 'center',
              fontSize: { xs: '1.45rem', sm: '1.8rem' },
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: brand.neutral[900],
            }}
          >
            Create workspace
          </Typography>
          <Typography
            sx={{
              textAlign: 'center',
              fontSize: 14.5,
              color: brand.neutral[500],
              mt: 0.5,
              mb: { xs: 2.5, sm: 3.25 },
            }}
          >
            Business details first, admin account next.
          </Typography>

          <AuthRegister />
        </Box>
      </Box>
    </Box>
  </PageContainer>
);

export default Register;
