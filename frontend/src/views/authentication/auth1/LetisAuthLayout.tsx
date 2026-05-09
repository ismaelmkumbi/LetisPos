import React from 'react';
import { Box, Stack, Typography, keyframes } from '@mui/material';
import {
  IconBrain,
  IconChartBar,
  IconCloudUpload,
  IconLock,
  IconPackages,
  IconShieldCheck,
  IconSparkles,
} from '@tabler/icons-react';

import PageContainer from 'src/components/container/PageContainer';
import BrandLogo, { LetisMark } from 'src/components/smartpos/BrandLogo';
import { brand } from 'src/theme/smartpos/brand';

type AuthMode = 'login' | 'register' | 'forgot';

type LetisAuthLayoutProps = {
  children: React.ReactNode;
  mode: AuthMode;
  pageTitle: string;
  pageDescription: string;
  headline: string;
  accent: string;
  supportingText: string;
  formTitle: string;
  formDescription: string;
};

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(18px); }
  to { opacity: 1; transform: translateY(0); }
`;

const softFloat = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-7px); }
`;

const anim = (delay = 0) => `${fadeInUp} 0.55s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms both`;

const modeMeta: Record<AuthMode, { label: string; figureTitle: string; figureMetric: string }> = {
  login: {
    label: 'Secure access',
    figureTitle: 'Today sales',
    figureMetric: 'TSh 3.6M',
  },
  register: {
    label: 'Workspace setup',
    figureTitle: 'New tenant',
    figureMetric: '3 steps',
  },
  forgot: {
    label: 'Account recovery',
    figureTitle: 'Reset link',
    figureMetric: 'Ready',
  },
};

const benefits = [
  {
    icon: <IconBrain size={18} stroke={1.8} />,
    title: 'AI insights',
    text: 'Profit, sales, and stock signals in one command center.',
  },
  {
    icon: <IconPackages size={18} stroke={1.8} />,
    title: 'Inventory aware',
    text: 'Every sale updates stock, cost, and warehouse movement.',
  },
  {
    icon: <IconShieldCheck size={18} stroke={1.8} />,
    title: 'Cloud secure',
    text: 'Built for teams, branches, and protected business data.',
  },
];

function ProductShowcase({ mode }: { mode: AuthMode }) {
  const meta = modeMeta[mode];

  return (
    <Box
      sx={{
        position: 'relative',
        mt: { xs: 2.5, md: 4 },
        height: { xs: 260, sm: 330, lg: 390 },
        maxWidth: 560,
        animation: `${anim(260)}, ${softFloat} 6s ease-in-out 1s infinite`,
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: { xs: '16px 10px 36px 22px', sm: '10px 20px 48px 36px' },
          borderRadius: { xs: '28px', sm: '34px' },
          background: 'linear-gradient(145deg, #111827 0%, #1F2937 100%)',
          boxShadow: '0 34px 70px rgba(15,23,42,0.24), 0 14px 30px rgba(15,23,42,0.12)',
        }}
      />

      <Box
        sx={{
          position: 'absolute',
          inset: { xs: '28px 24px 58px 36px', sm: '24px 38px 72px 54px' },
          borderRadius: { xs: '20px', sm: '24px' },
          bgcolor: '#FFFFFF',
          overflow: 'hidden',
          border: `1px solid ${brand.neutral[100]}`,
          boxShadow: 'inset 0 0 0 1px rgba(15,23,42,0.03)',
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            px: { xs: 1.6, sm: 2 },
            py: 1.25,
            borderBottom: `1px solid ${brand.neutral[100]}`,
            bgcolor: '#FBFCFD',
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <LetisMark size={22} />
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 900, color: brand.neutral[900] }}>
              Letis POS
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.5}>
            {[brand.primary[500], brand.neutral[200], brand.neutral[200]].map((color, index) => (
              <Box key={index} sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: color }} />
            ))}
          </Stack>
        </Stack>

        <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Stack direction="row" spacing={1.2}>
            <Box
              sx={{
                width: '44%',
                minHeight: { xs: 86, sm: 116 },
                borderRadius: '16px',
                p: 1.4,
                background:
                  'linear-gradient(145deg, rgba(22,163,74,0.12) 0%, rgba(255,255,255,0.96) 72%)',
                border: `1px solid ${brand.primary[100]}`,
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography
                  sx={{ fontSize: '0.58rem', fontWeight: 900, color: brand.neutral[500] }}
                >
                  {meta.figureTitle}
                </Typography>
                <IconChartBar size={15} color={brand.primary[600]} />
              </Stack>
              <Typography
                sx={{
                  mt: 1.1,
                  fontSize: { xs: '1.05rem', sm: '1.35rem' },
                  fontWeight: 950,
                  color: brand.primary[600],
                  letterSpacing: 0,
                }}
              >
                {meta.figureMetric}
              </Typography>
              <Box
                sx={{
                  mt: 1.2,
                  height: 22,
                  borderRadius: '999px',
                  background:
                    'linear-gradient(90deg, transparent 0%, rgba(22,163,74,0.2) 12%, rgba(22,163,74,0.65) 52%, rgba(22,163,74,0.12) 100%)',
                }}
              />
            </Box>

            <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
              {['Cash in hand', 'Orders', 'Low stock'].map((label, index) => (
                <Stack
                  key={label}
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{
                    px: 1.1,
                    py: 0.85,
                    borderRadius: '12px',
                    bgcolor: index === 1 ? brand.primary[50] : brand.neutral[50],
                    border: `1px solid ${index === 1 ? brand.primary[100] : brand.neutral[100]}`,
                  }}
                >
                  <Typography
                    sx={{ fontSize: '0.62rem', fontWeight: 800, color: brand.neutral[600] }}
                  >
                    {label}
                  </Typography>
                  <Typography
                    sx={{ fontSize: '0.62rem', fontWeight: 950, color: brand.neutral[900] }}
                  >
                    {index === 0 ? 'TSh 0' : index === 1 ? '37' : '5'}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Stack>
        </Box>
      </Box>

      <Box
        sx={{
          position: 'absolute',
          left: { xs: 20, sm: 32 },
          bottom: { xs: 16, sm: 26 },
          width: { xs: 120, sm: 154 },
          height: { xs: 82, sm: 104 },
          borderRadius: '18px 18px 14px 14px',
          background: 'linear-gradient(135deg, #111827 0%, #28313C 56%, #05070A 100%)',
          boxShadow: '0 26px 44px rgba(15,23,42,0.28), inset 12px 0 18px rgba(255,255,255,0.04)',
          zIndex: 4,
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            left: '14%',
            right: '14%',
            top: { xs: 26, sm: 32 },
            height: 9,
            borderRadius: '999px',
            bgcolor: '#05070A',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            left: 16,
            bottom: 14,
            transform: { xs: 'scale(0.48)', sm: 'scale(0.56)' },
            transformOrigin: 'left center',
          }}
        >
          <BrandLogo size="sm" color="onDark" />
        </Box>
      </Box>

      <Box
        sx={{
          position: 'absolute',
          left: { xs: 82, sm: 116 },
          bottom: { xs: -4, sm: 0 },
          width: { xs: 112, sm: 142 },
          minHeight: { xs: 164, sm: 214 },
          borderRadius: '10px 10px 18px 18px',
          bgcolor: '#FFFFFF',
          color: brand.neutral[900],
          border: `1px solid ${brand.neutral[100]}`,
          boxShadow: '0 24px 42px rgba(15,23,42,0.18), inset 6px 0 10px rgba(15,23,42,0.04)',
          transform: 'rotate(-10deg)',
          transformOrigin: '20% 0',
          zIndex: 5,
          overflow: 'hidden',
          p: { xs: 0.9, sm: 1.15 },
          '&:before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background:
              'repeating-linear-gradient(0deg, transparent 0, transparent 11px, rgba(15,23,42,0.055) 12px)',
            pointerEvents: 'none',
          },
        }}
      >
        <Stack alignItems="center" spacing={0.45} sx={{ position: 'relative' }}>
          <LetisMark size={24} />
          <Typography sx={{ fontSize: { xs: '0.42rem', sm: '0.5rem' }, fontWeight: 950 }}>
            Letis POS
          </Typography>
          <Typography
            sx={{
              fontSize: { xs: '0.3rem', sm: '0.36rem' },
              fontWeight: 800,
              color: brand.neutral[500],
            }}
          >
            INV-2026-000433
          </Typography>
        </Stack>

        <Stack spacing={0.5} sx={{ position: 'relative', mt: 1 }}>
          {['Sukari Kilo', 'Mchele Mbeya', 'Unga Ngano', 'Mafuta 1L'].map((name, index) => (
            <Stack
              key={name}
              direction="row"
              justifyContent="space-between"
              sx={{
                pb: 0.35,
                borderBottom: '1px dotted rgba(15,23,42,0.55)',
                fontSize: { xs: '0.34rem', sm: '0.4rem' },
                fontWeight: 850,
                lineHeight: 1,
              }}
            >
              <Box component="span">{name}</Box>
              <Box component="span">{['22.4K', '68.4K', '25K', '18.6K'][index]}</Box>
            </Stack>
          ))}
        </Stack>

        <Stack
          direction="row"
          justifyContent="space-between"
          sx={{
            position: 'relative',
            mt: 1,
            pt: 0.6,
            borderTop: '1px dotted rgba(15,23,42,0.8)',
            fontSize: { xs: '0.42rem', sm: '0.48rem' },
            fontWeight: 950,
          }}
        >
          <Box component="span">TOTAL</Box>
          <Box component="span">293.8K</Box>
        </Stack>
      </Box>

      <Box
        sx={{
          position: 'absolute',
          right: { xs: 20, sm: 36 },
          bottom: { xs: 30, sm: 50 },
          px: { xs: 1.1, sm: 1.4 },
          py: { xs: 0.9, sm: 1.1 },
          borderRadius: '16px',
          bgcolor: 'rgba(255,255,255,0.88)',
          border: `1px solid ${brand.primary[100]}`,
          boxShadow: '0 18px 34px rgba(15,23,42,0.12)',
          backdropFilter: 'blur(12px)',
          zIndex: 6,
        }}
      >
        <Stack direction="row" spacing={0.8} alignItems="center">
          <Box
            sx={{
              width: 30,
              height: 30,
              borderRadius: '10px',
              bgcolor: brand.primary[50],
              color: brand.primary[600],
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <IconSparkles size={17} stroke={1.8} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: '0.58rem', fontWeight: 900, color: brand.neutral[500] }}>
              {meta.label}
            </Typography>
            <Typography sx={{ fontSize: '0.76rem', fontWeight: 950, color: brand.neutral[900] }}>
              Online
            </Typography>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}

function BenefitRow({
  icon,
  title,
  text,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  delay: number;
}) {
  return (
    <Stack
      direction="row"
      spacing={1.25}
      sx={{
        animation: anim(delay),
      }}
    >
      <Box
        sx={{
          width: 38,
          height: 38,
          borderRadius: '14px',
          bgcolor: 'rgba(22,163,74,0.1)',
          color: brand.primary[600],
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography sx={{ fontSize: '0.82rem', fontWeight: 900, color: brand.neutral[900] }}>
          {title}
        </Typography>
        <Typography
          sx={{ mt: 0.2, fontSize: '0.76rem', lineHeight: 1.45, color: brand.neutral[500] }}
        >
          {text}
        </Typography>
      </Box>
    </Stack>
  );
}

export default function LetisAuthLayout({
  children,
  mode,
  pageTitle,
  pageDescription,
  headline,
  accent,
  supportingText,
  formTitle,
  formDescription,
}: LetisAuthLayoutProps) {
  return (
    <PageContainer title={pageTitle} description={pageDescription}>
      <Box
        sx={{
          minHeight: '100dvh',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1.05fr 0.95fr' },
          bgcolor: '#FFFFFF',
        }}
      >
        <Box
          sx={{
            position: 'relative',
            overflow: 'hidden',
            px: { xs: 2.4, sm: 5, md: 7, xl: 9 },
            py: { xs: 2.5, sm: 4, lg: 5.5 },
            minHeight: { xs: 'auto', lg: '100dvh' },
            display: { xs: 'none', lg: 'flex' },
            alignItems: 'center',
            background:
              'radial-gradient(circle at 0% 0%, rgba(22,163,74,0.14), transparent 32%), linear-gradient(150deg, #FFFFFF 0%, #F8FAFC 44%, #EAF8F0 100%)',
            '&:before': {
              content: '""',
              position: 'absolute',
              width: { xs: 260, sm: 420 },
              height: { xs: 260, sm: 420 },
              borderRadius: '50%',
              right: { xs: -150, sm: -190 },
              top: { xs: 70, sm: -60 },
              bgcolor: 'rgba(22,163,74,0.08)',
            },
            '&:after': {
              content: '""',
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(90deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 62%)',
              pointerEvents: 'none',
            },
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 640 }}>
            <Box sx={{ animation: anim(0) }}>
              <BrandLogo size="lg" />
            </Box>

            <Stack
              direction="row"
              spacing={0.75}
              alignItems="center"
              sx={{
                mt: { xs: 3, sm: 4.5 },
                width: 'fit-content',
                px: 1.1,
                py: 0.55,
                borderRadius: '999px',
                bgcolor: 'rgba(22,163,74,0.1)',
                color: brand.primary[700],
                animation: anim(70),
              }}
            >
              <IconCloudUpload size={15} stroke={1.9} />
              <Typography
                sx={{
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                System status: Online
              </Typography>
            </Stack>

            <Typography
              component="h1"
              sx={{
                mt: 2.2,
                fontWeight: 950,
                letterSpacing: 0,
                lineHeight: 1.05,
                fontSize: { xs: '2.1rem', sm: '3rem', lg: '3.65rem' },
                color: brand.neutral[900],
                animation: anim(130),
              }}
            >
              {headline}
              <Box component="span" sx={{ display: 'block', color: brand.primary[600] }}>
                {accent}
              </Box>
            </Typography>

            <Typography
              sx={{
                mt: 1.5,
                maxWidth: 470,
                fontSize: { xs: '0.95rem', sm: '1.04rem' },
                lineHeight: 1.65,
                color: brand.neutral[600],
                animation: anim(190),
              }}
            >
              {supportingText}
            </Typography>

            <Stack spacing={1.7} sx={{ mt: { xs: 2.5, sm: 3.5 }, maxWidth: 450 }}>
              {benefits.map((item, index) => (
                <BenefitRow key={item.title} {...item} delay={250 + index * 70} />
              ))}
            </Stack>

            <ProductShowcase mode={mode} />
          </Box>
        </Box>

        <Box
          sx={{
            position: 'relative',
            px: { xs: 1.5, sm: 4, md: 7, xl: 9 },
            py: { xs: 1.5, sm: 5 },
            minHeight: '100dvh',
            display: 'flex',
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'center',
            background:
              'radial-gradient(circle at 80% 10%, rgba(22,163,74,0.08), transparent 34%), #FFFFFF',
          }}
        >
          <Stack
            direction="row"
            spacing={0.8}
            alignItems="center"
            sx={{
              display: { xs: 'none', sm: 'flex' },
              position: 'absolute',
              top: 24,
              right: { sm: 28, xl: 44 },
              color: brand.primary[600],
            }}
          >
            <IconLock size={18} stroke={1.9} />
            <Typography sx={{ fontSize: '0.86rem', fontWeight: 800, color: brand.neutral[600] }}>
              Encrypted workspace access
            </Typography>
          </Stack>

          <Box
            sx={{
              width: '100%',
              maxWidth: { xs: 440, lg: 500 },
              borderRadius: { xs: '18px', sm: '32px' },
              p: { xs: 1.6, sm: 4.2 },
              bgcolor: 'rgba(255,255,255,0.92)',
              border: `1px solid ${brand.neutral[100]}`,
              boxShadow: '0 34px 90px rgba(15,23,42,0.10), 0 14px 36px rgba(15,23,42,0.06)',
              backdropFilter: 'blur(16px)',
              animation: anim(170),
            }}
          >
            <Box
              sx={{
                width: { xs: 42, sm: 70 },
                height: { xs: 42, sm: 70 },
                borderRadius: { xs: '14px', sm: '22px' },
                bgcolor: brand.primary[50],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: { xs: 1, sm: 2.1 },
                boxShadow: `inset 0 0 0 1px ${brand.primary[100]}`,
              }}
            >
              <LetisMark size={mode === 'register' ? 30 : 42} />
            </Box>

            <Typography
              component="h2"
              sx={{
                textAlign: 'center',
                fontSize: { xs: '1.25rem', sm: '1.85rem' },
                fontWeight: 950,
                letterSpacing: 0,
                color: brand.neutral[900],
              }}
            >
              {formTitle}
            </Typography>
            <Typography
              sx={{
                textAlign: 'center',
                fontSize: { xs: '0.82rem', sm: '0.94rem' },
                lineHeight: { xs: 1.35, sm: 1.5 },
                color: brand.neutral[500],
                mt: { xs: 0.3, sm: 0.6 },
                mb: { xs: 1.3, sm: 3.2 },
              }}
            >
              {formDescription}
            </Typography>

            {children}
          </Box>
        </Box>
      </Box>
    </PageContainer>
  );
}
