/**
 * Letis POS — Sign-In.
 *
 * Premium two-column sign-in layout.
 *
 */
import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import {
  IconChartBar,
  IconBox,
  IconUsers,
  IconShieldCheck,
} from '@tabler/icons-react';

import PageContainer from 'src/components/container/PageContainer';
import BrandLogo, { LetisMark } from 'src/components/smartpos/BrandLogo';
import { brand } from 'src/theme/smartpos/brand';
import AuthLoginForm from './AuthLoginForm';

/* ──────────────────────────── feature row ──────────────────────────── */

interface FeatureProps {
  Icon: React.ComponentType<{ size?: number; stroke?: number; color?: string }>;
  title: string;
  body: string;
}
const Feature: React.FC<FeatureProps> = ({ Icon, title, body }) => (
  <Stack direction="row" spacing={2} alignItems="flex-start">
    <Box
      sx={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        bgcolor: brand.primary[50],
        color: brand.primary[600],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Icon size={22} stroke={1.8} />
    </Box>
    <Box>
      <Typography
        sx={{
          fontWeight: 700,
          fontSize: 15.5,
          color: brand.neutral[900],
          letterSpacing: '-0.01em',
          lineHeight: 1.25,
        }}
      >
        {title}
      </Typography>
      <Typography
        sx={{
          fontSize: 13.5,
          color: brand.neutral[500],
          mt: 0.25,
          lineHeight: 1.5,
        }}
      >
        {body}
      </Typography>
    </Box>
  </Stack>
);

const HeroIllustration: React.FC = () => {
  return (
    <Box
      component="svg"
      viewBox="0 0 760 520"
      role="img"
      aria-label="Letis POS terminal with sales dashboard, barcode scanner, receipt printer, and cash drawer"
      sx={{
        width: '100%',
        maxWidth: 520,
        mt: 3,
        position: 'relative',
        ml: { md: 'auto' },
        display: 'block',
        overflow: 'visible',
        filter: 'drop-shadow(0 24px 45px rgba(15, 23, 42, 0.14))',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 'auto 4% -10px 8%',
          height: 34,
          background: `radial-gradient(50% 100% at 50% 0%, ${brand.primary[200]}66, transparent)`,
          filter: 'blur(8px)',
          zIndex: 0,
        },
      }}
    >
      <defs>
        <linearGradient id="heroScreen" x1="150" y1="68" x2="566" y2="386" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F8FAFC" />
          <stop offset="1" stopColor="#E6FFF4" />
        </linearGradient>
        <linearGradient id="heroPrimary" x1="186" y1="132" x2="550" y2="360" gradientUnits="userSpaceOnUse">
          <stop stopColor={brand.primary[500]} />
          <stop offset="1" stopColor={brand.primary[700]} />
        </linearGradient>
        <linearGradient id="heroDrawer" x1="186" y1="365" x2="574" y2="474" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F8FAFC" />
          <stop offset="1" stopColor="#DDE8EF" />
        </linearGradient>
        <radialGradient id="heroGlow" cx="0" cy="0" r="1" gradientTransform="matrix(0 190 -256 0 389 250)" gradientUnits="userSpaceOnUse">
          <stop stopColor={brand.primary[100]} />
          <stop offset="1" stopColor={brand.primary[50]} stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="386" cy="462" rx="255" ry="36" fill="#0F172A" opacity="0.08" />
      <circle cx="614" cy="116" r="78" fill="url(#heroGlow)" />
      <circle cx="152" cy="342" r="86" fill="url(#heroGlow)" opacity="0.8" />

      <rect x="154" y="64" width="452" height="324" rx="36" fill="#FFFFFF" />
      <rect x="174" y="84" width="412" height="284" rx="26" fill="url(#heroScreen)" />
      <rect x="174" y="84" width="412" height="52" rx="26" fill="#FFFFFF" opacity="0.95" />
      <circle cx="211" cy="110" r="7" fill="#EF4444" />
      <circle cx="235" cy="110" r="7" fill="#F59E0B" />
      <circle cx="259" cy="110" r="7" fill={brand.primary[500]} />
      <rect x="305" y="103" width="174" height="14" rx="7" fill="#D7F7E8" />

      <rect x="212" y="162" width="146" height="142" rx="24" fill="#FFFFFF" />
      <path d="M237 267L268 232L294 249L329 199" fill="none" stroke="url(#heroPrimary)" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="329" cy="199" r="13" fill={brand.primary[600]} />
      <rect x="237" y="320" width="94" height="13" rx="6.5" fill="#CFECDD" />

      <rect x="392" y="162" width="154" height="58" rx="18" fill="#FFFFFF" />
      <rect x="417" y="183" width="68" height="12" rx="6" fill="#BAEBD2" />
      <rect x="417" y="202" width="104" height="8" rx="4" fill="#E2E8F0" />
      <circle cx="517" cy="191" r="17" fill={brand.primary[100]} />
      <path d="M510 191L516 197L527 184" fill="none" stroke={brand.primary[700]} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />

      <rect x="392" y="244" width="154" height="88" rx="20" fill="#FFFFFF" />
      <rect x="420" y="281" width="18" height="32" rx="5" fill={brand.primary[500]} />
      <rect x="452" y="264" width="18" height="49" rx="5" fill={brand.primary[300]} />
      <rect x="484" y="292" width="18" height="21" rx="5" fill={brand.primary[600]} />
      <rect x="516" y="272" width="18" height="41" rx="5" fill={brand.primary[200]} />

      <path d="M336 386H424L438 429H322L336 386Z" fill="#CBD5E1" />
      <rect x="196" y="426" width="374" height="46" rx="16" fill="url(#heroDrawer)" />
      <rect x="231" y="443" width="178" height="12" rx="6" fill="#94A3B8" opacity="0.65" />
      <rect x="433" y="438" width="91" height="22" rx="11" fill={brand.primary[500]} opacity="0.9" />

      <g transform="translate(578 262) rotate(-12)">
        <rect x="0" y="0" width="118" height="40" rx="20" fill="#FFFFFF" />
        <rect x="22" y="10" width="66" height="8" rx="4" fill="#0F172A" opacity="0.18" />
        <rect x="80" y="14" width="45" height="10" rx="5" fill={brand.primary[500]} />
      </g>

      <g transform="translate(72 312)">
        <rect x="0" y="0" width="112" height="92" rx="22" fill="#FFFFFF" />
        <path d="M29 19H83L74 73H38L29 19Z" fill="#ECFDF5" stroke={brand.primary[600]} strokeWidth="7" strokeLinejoin="round" />
        <path d="M39 31C42 17 70 17 73 31" fill="none" stroke={brand.primary[600]} strokeWidth="7" strokeLinecap="round" />
      </g>
    </Box>
  );
};

/* ──────────────────────────── page ──────────────────────────── */

const LoginPage: React.FC = () => {
  const accentGreen = brand.primary[600];

  return (
    <PageContainer title="Letis POS — Sign in" description="Sign in to your Letis POS workspace">
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          minHeight: '100vh',
          bgcolor: '#FFFFFF',
        }}
      >
        {/* ───────────── Marketing panel (left) ───────────── */}
        <Box
          sx={{
            flex: 1,
            position: 'relative',
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            px: { xs: 4, sm: 6, md: 8, lg: 10 },
            py: { xs: 6, md: 7 },
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 46%, #ECFDF5 100%)',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: -120,
              right: -80,
              width: 360,
              height: 360,
              borderRadius: '50%',
              background: `radial-gradient(closest-side, ${brand.primary[50]} 0%, transparent 70%)`,
              zIndex: 0,
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: -180,
              left: -120,
              width: 480,
              height: 480,
              borderRadius: '50%',
              background: `radial-gradient(closest-side, ${brand.primary[100]}88, transparent 72%)`,
              zIndex: 0,
            },
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
                letterSpacing: '-0.035em',
                lineHeight: 1.04,
                fontSize: { xs: '2.25rem', md: '2.85rem', lg: '3.25rem' },
                color: brand.neutral[900],
              }}
            >
              Run your business
              <br />
              <Box component="span" sx={{ color: accentGreen }}>
                in one place.
              </Box>
            </Typography>

            <Typography
              sx={{
                mt: 2.5,
                fontSize: 16,
                lineHeight: 1.6,
                color: brand.neutral[600],
                maxWidth: 460,
              }}
            >
              Sales, stock, customers, and reports for every workspace.
            </Typography>

            <Stack spacing={2.25} sx={{ mt: 4, maxWidth: 440 }}>
              <Feature
                Icon={IconChartBar}
                title="Live sales reports"
                body="Track performance fast."
              />
              <Feature
                Icon={IconBox}
                title="Inventory control"
                body="Know stock by store."
              />
              <Feature
                Icon={IconUsers}
                title="Customer records"
                body="Keep every visit useful."
              />
              <Feature
                Icon={IconShieldCheck}
                title="Secure access"
                body="Tenant-scoped accounts."
              />
            </Stack>

            <Box
              sx={{
                display: { xs: 'none', md: 'flex' },
                justifyContent: 'center',
              }}
            >
              <HeroIllustration />
            </Box>
          </Box>

          {/* footer left */}
          <Box
            sx={{
              position: 'relative',
              zIndex: 1,
              mt: 'auto',
              pt: 4,
              fontSize: 12.5,
              color: brand.neutral[400],
            }}
          >
            © {new Date().getFullYear()} Letis POS. All rights reserved.
          </Box>
        </Box>

        {/* ───────────── Sign-in card (right) ───────────── */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: { xs: '100dvh', md: 'auto' },
            px: { xs: 1.75, sm: 6 },
            py: { xs: 2, sm: 6, md: 8 },
            position: 'relative',
            bgcolor: '#FFFFFF',
          }}
        >
          {/* system status — top right */}
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{
              display: { xs: 'none', sm: 'flex' },
              position: 'absolute',
              top: 24,
              right: 28,
              color: brand.neutral[500],
              fontSize: 13,
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: brand.success.main,
                boxShadow: `0 0 0 3px ${brand.success.light}`,
              }}
            />
            <Box component="span">
              System status:{' '}
              <Box component="span" sx={{ color: brand.success.dark, fontWeight: 600 }}>
                Online
              </Box>
            </Box>
          </Stack>

          <Box
            sx={{
              width: '100%',
              maxWidth: 440,
              p: { xs: 2, sm: 5, md: 6 },
              borderRadius: { xs: 0, sm: '16px' },
              bgcolor: '#FFFFFF',
              border: { xs: 'none', sm: `1px solid ${brand.neutral[200]}` },
              boxShadow: { xs: 'none', sm: '0 24px 70px rgba(15,23,42,0.10)' },
            }}
          >
            {/* logo medallion */}
            <Box
              sx={{
                width: 76,
                height: 76,
                borderRadius: '50%',
                bgcolor: brand.primary[50],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: { xs: 1.75, sm: 2.5 },
              }}
            >
              <LetisMark size={42} />
            </Box>

            <Typography
              component="h2"
              sx={{
                textAlign: 'center',
                fontSize: { xs: '1.55rem', sm: '1.85rem' },
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: brand.neutral[900],
              }}
            >
              Welcome back
            </Typography>
            <Typography
              sx={{
                textAlign: 'center',
                fontSize: 14.5,
                color: brand.neutral[500],
                mt: 0.5,
                mb: { xs: 3, sm: 4 },
              }}
            >
              Sign in to your Letis POS account
            </Typography>

            <AuthLoginForm />
          </Box>
        </Box>
      </Box>
    </PageContainer>
  );
};

export default LoginPage;
