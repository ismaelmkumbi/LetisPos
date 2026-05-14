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
import { authTheme as at } from 'src/theme/smartpos/authTheme';

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

/* ── Animations ── */

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const softFloat = keyframes`
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-7px); }
`;

const anim = (delay = 0) =>
  `${fadeInUp} 0.55s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms both`;

/* ── Mode metadata (login / forgot) ── */

const modeMeta: Record<AuthMode, { label: string; figureTitle: string; figureMetric: string }> = {
  login:    { label: 'Secure access', figureTitle: 'Today sales', figureMetric: 'TSh 3.6M' },
  register: { label: 'Workspace setup', figureTitle: 'New tenant', figureMetric: '3 steps' },
  forgot:   { label: 'Account recovery', figureTitle: 'Reset link', figureMetric: 'Ready' },
};

const benefits = [
  { icon: <IconBrain size={18} stroke={1.8} />,       title: 'AI insights',   text: 'Profit, sales, and stock signals in one command center.' },
  { icon: <IconPackages size={18} stroke={1.8} />,     title: 'Inventory aware', text: 'Every sale updates stock, cost, and warehouse movement.' },
  { icon: <IconShieldCheck size={18} stroke={1.8} />,  title: 'Cloud secure',  text: 'Built for teams, branches, and protected business data.' },
];

/* ── Trust rows (register mode) ── */

const TRUST_ROWS = [
  {
    icon: <IconCloudUpload size={18} stroke={1.7} />,
    title: '30-day full access trial',
    desc: 'Every feature unlocked. No credit card. No commitment.',
  },
  {
    icon: <IconShieldCheck size={18} stroke={1.7} />,
    title: 'Free local onboarding',
    desc: 'Our Dar es Salaam team helps you get set up in hours.',
  },
  {
    icon: <IconBrain size={18} stroke={1.7} />,
    title: 'Pay with M-Pesa',
    desc: 'Monthly or annual billing in Tanzanian shillings.',
  },
];

/* ── Sub-components ── */

function ProductShowcase({ mode }: { mode: AuthMode }) {
  const meta = modeMeta[mode];

  return (
    <Box
      sx={{
        position: 'relative',
        mt: { xs: 2.5, md: 2.6, xl: 3 },
        height: { xs: 260, sm: 330, lg: 280, xl: 320 },
        maxWidth: 520,
        animation: `${anim(260)}, ${softFloat} 6s ease-in-out 1s infinite`,
      }}
    >
      {/* Device frame */}
      <Box
        sx={{
          position: 'absolute',
          inset: { xs: '16px 10px 36px 22px', sm: '10px 20px 48px 36px' },
          borderRadius: { xs: '28px', sm: '34px' },
          background: 'linear-gradient(145deg, #111827 0%, #1F2937 100%)',
          boxShadow:
            '0 42px 86px rgba(15,23,42,0.25), 0 18px 34px rgba(15,23,42,0.14)',
        }}
      />
      {/* Screen */}
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
        {/* Title bar */}
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
            {[brand.primary[500], brand.neutral[200], brand.neutral[200]].map((c, i) => (
              <Box key={i} sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: c }} />
            ))}
          </Stack>
        </Stack>

        <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Stack direction="row" spacing={1.2}>
            {/* Metric card */}
            <Box
              sx={{
                width: '44%',
                minHeight: { xs: 86, sm: 116 },
                borderRadius: '16px',
                p: 1.4,
                background: `linear-gradient(145deg, ${brand.primary[50]} 0%, rgba(255,255,255,0.96) 72%)`,
                border: `1px solid ${brand.primary[100]}`,
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography sx={{ fontSize: '0.58rem', fontWeight: 900, color: brand.neutral[500] }}>
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
                  background: `linear-gradient(90deg, transparent 0%, ${brand.primary[200]} 12%, ${brand.primary[400]} 52%, ${brand.primary[100]} 100%)`,
                }}
              />
            </Box>

            {/* Side stats */}
            <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
              {['Cash in hand', 'Orders', 'Low stock'].map((label, index) => (
                <Stack
                  key={label}
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{
                    px: 1.1, py: 0.85,
                    borderRadius: '12px',
                    bgcolor: index === 1 ? brand.primary[50] : brand.neutral[50],
                    border: `1px solid ${index === 1 ? brand.primary[100] : brand.neutral[100]}`,
                  }}
                >
                  <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, color: brand.neutral[600] }}>
                    {label}
                  </Typography>
                  <Typography sx={{ fontSize: '0.62rem', fontWeight: 950, color: brand.neutral[900] }}>
                    {index === 0 ? 'TSh 0' : index === 1 ? '37' : '5'}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Stack>
        </Box>
      </Box>

      {/* Receipt / invoice card */}
      <Box
        sx={{
          position: 'absolute',
          left: { xs: 18, sm: 26 },
          bottom: { xs: -28, sm: -42, lg: -54, xl: -42 },
          width: { xs: 190, sm: 224, lg: 218, xl: 250 },
          height: { xs: 146, sm: 178, lg: 168, xl: 198 },
          zIndex: 5,
          pointerEvents: 'none',
        }}
      >
        {/* Terminal device */}
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            bottom: { xs: 36, sm: 48, lg: 50, xl: 54 },
            width: { xs: 108, sm: 132, lg: 126, xl: 148 },
            height: { xs: 74, sm: 90, lg: 86, xl: 100 },
            borderRadius: '18px 18px 14px 14px',
            background: 'linear-gradient(135deg, #111827 0%, #28313C 56%, #05070A 100%)',
            boxShadow:
              '0 26px 44px rgba(15,23,42,0.28), inset 12px 0 18px rgba(255,255,255,0.04)',
            zIndex: 2,
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              left: '14%', right: '14%',
              top: { xs: 24, sm: 28, lg: 27, xl: 31 },
              height: { xs: 8, sm: 9 },
              borderRadius: '999px',
              bgcolor: '#05070A',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              left: { xs: 14, sm: 16 },
              bottom: { xs: 12, sm: 14 },
              transform: { xs: 'scale(0.44)', sm: 'scale(0.5)', xl: 'scale(0.56)' },
              transformOrigin: 'left center',
            }}
          >
            <BrandLogo size="sm" color="onDark" />
          </Box>
        </Box>

        {/* Receipt */}
        <Box
          sx={{
            position: 'absolute',
            left: { xs: 70, sm: 82, lg: 78, xl: 94 },
            bottom: { xs: -12, sm: -16, lg: -20, xl: -18 },
            width: { xs: 84, sm: 100, lg: 96, xl: 112 },
            minHeight: { xs: 124, sm: 148, lg: 142, xl: 166 },
            borderRadius: '10px 10px 18px 18px',
            bgcolor: '#FFFFFF',
            color: brand.neutral[900],
            border: `1px solid ${brand.neutral[100]}`,
            boxShadow:
              '0 26px 48px rgba(15,23,42,0.20), inset 6px 0 10px rgba(15,23,42,0.04)',
            transform: 'rotate(7deg)',
            transformOrigin: 'center top',
            zIndex: 3,
            overflow: 'hidden',
            p: { xs: 0.75, sm: 0.9, xl: 1.05 },
            '&::before': {
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
            <Typography sx={{ fontSize: { xs: '0.3rem', sm: '0.36rem' }, fontWeight: 800, color: brand.neutral[500] }}>
              INV-2026-000433
            </Typography>
          </Stack>

          <Stack spacing={0.5} sx={{ position: 'relative', mt: 1 }}>
            {['Sukari Kilo', 'Mchele Mbeya', 'Unga Ngano', 'Mafuta 1L'].map((name, i) => (
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
                <Box component="span">{['22.4K', '68.4K', '25K', '18.6K'][i]}</Box>
              </Stack>
            ))}
          </Stack>

          <Stack
            direction="row"
            justifyContent="space-between"
            sx={{
              position: 'relative', mt: 1, pt: 0.6,
              borderTop: '1px dotted rgba(15,23,42,0.8)',
              fontSize: { xs: '0.42rem', sm: '0.48rem' },
              fontWeight: 950,
            }}
          >
            <Box component="span">TOTAL</Box>
            <Box component="span">293.8K</Box>
          </Stack>
        </Box>
      </Box>

      {/* Status badge */}
      <Box
        sx={{
          position: 'absolute',
          right: { xs: 16, sm: 28 },
          bottom: { xs: 34, sm: 54 },
          px: { xs: 1.1, sm: 1.4 },
          py: { xs: 0.9, sm: 1.1 },
          borderRadius: '16px',
          bgcolor: 'rgba(255,255,255,0.88)',
          border: `1px solid ${brand.primary[100]}`,
          boxShadow: '0 24px 44px rgba(15,23,42,0.16)',
          backdropFilter: 'blur(12px)',
          zIndex: 6,
        }}
      >
        <Stack direction="row" spacing={0.8} alignItems="center">
          <Box
            sx={{
              width: 30, height: 30,
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
  icon, title, text, delay,
}: { icon: React.ReactNode; title: string; text: string; delay: number }) {
  return (
    <Stack direction="row" spacing={1.25} sx={{ animation: anim(delay) }}>
      <Box
        sx={{
          width: 38, height: 38,
          borderRadius: '14px',
          bgcolor: brand.primary[50],
          color: brand.primary[600],
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography sx={{ fontSize: '0.82rem', fontWeight: 800, color: brand.neutral[900] }}>
          {title}
        </Typography>
        <Typography sx={{ mt: 0.2, fontSize: '0.76rem', lineHeight: 1.45, color: brand.neutral[500] }}>
          {text}
        </Typography>
      </Box>
    </Stack>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main layout
   ═══════════════════════════════════════════════════════════════════════════ */

export default function LetisAuthLayout({
  children, mode, pageTitle, pageDescription,
  headline, accent, supportingText, formTitle, formDescription,
}: LetisAuthLayoutProps) {
  const isRegister = mode === 'register';

  return (
    <PageContainer title={pageTitle} description={pageDescription}>
      <Box
        sx={{
          minHeight: '100dvh',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
          bgcolor: '#FFFFFF',
        }}
      >
        {/* ═══ LEFT: Brand column ═══ */}
        <Box
          sx={{
            position: 'relative',
            overflow: 'hidden',
            px: { xs: 2.4, sm: 5, md: 7, lg: 6, xl: 9 },
            py: { xs: 2.5, sm: 4, lg: 3.5, xl: 4.5 },
            minHeight: { xs: 'auto', lg: '100dvh' },
            display: { xs: 'none', lg: 'flex' },
            alignItems: 'center',
            /* ── Green brand background for register, light green for login ── */
            background: isRegister
              ? at.surfaces.brandColumn
              : `radial-gradient(circle at 6% 8%, ${brand.primary[100]}, transparent 30%),
                 linear-gradient(150deg, #FFFFFF 0%, #F8FAFC 42%, ${brand.primary[50]} 100%)`,
            /* ── Decorative circle (login only) ── */
            '&::before': !isRegister
              ? {
                  content: '""',
                  position: 'absolute',
                  width: { xs: 260, sm: 360, xl: 430 },
                  height: { xs: 260, sm: 360, xl: 430 },
                  borderRadius: '50%',
                  right: { xs: -150, sm: -170, xl: -210 },
                  top: { xs: 70, sm: -140, xl: -170 },
                  bgcolor: brand.primary[100],
                  opacity: 0.5,
                }
              : undefined,
            /* ── Gradient overlay (login) / subtle grain (register) ── */
            '&::after': !isRegister
              ? {
                  content: '""',
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(90deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 62%)',
                  pointerEvents: 'none',
                }
              : {
                  content: '""',
                  position: 'absolute',
                  inset: 0,
                  background: `radial-gradient(ellipse at 50% 0%, ${brand.primary[400]}20 0%, transparent 40%)`,
                  pointerEvents: 'none',
                },
          }}
        >
          {/* Green vertical accent line — register only */}
          {isRegister && (
            <Box
              sx={{
                position: 'absolute',
                left: 0, top: '10%', bottom: '10%',
                width: 3,
                background: `linear-gradient(180deg, transparent 0%, ${brand.primary[400]} 20%, ${brand.primary[400]}80 80%, transparent 100%)`,
                borderRadius: '0 2px 2px 0',
              }}
            />
          )}

          <Box sx={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 610 }}>
            {/* Brand logo */}
            <Box sx={{ animation: anim(0), mb: isRegister ? 5 : 0 }}>
              <BrandLogo size={isRegister ? 'sm' : 'lg'} color={isRegister ? 'onDark' : undefined} />
            </Box>

            {/* Status chip (login only) */}
            {!isRegister && (
              <Stack
                direction="row" spacing={0.75} alignItems="center"
                sx={{
                  mt: { xs: 3, sm: 4.5, lg: 2.5, xl: 3.5 },
                  width: 'fit-content',
                  px: 1.1, py: 0.55,
                  borderRadius: '999px',
                  bgcolor: brand.primary[50],
                  color: brand.primary[700],
                  animation: anim(70),
                }}
              >
                <IconCloudUpload size={15} stroke={1.9} />
                <Typography sx={{ fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  System status: Online
                </Typography>
              </Stack>
            )}

            {/* Headline */}
            <Typography
              component="h1"
              sx={{
                mt: isRegister ? 0 : 2.2,
                fontFamily: isRegister ? at.fontDisplay : undefined,
                fontWeight: isRegister ? 600 : 950,
                letterSpacing: isRegister ? '-0.015em' : 0,
                lineHeight: 1.08,
                fontSize: { xs: '2.1rem', sm: '3rem', lg: '3rem', xl: '3.45rem' },
                color: isRegister ? '#FFFFFF' : brand.neutral[900],
                animation: anim(130),
              }}
            >
              {isRegister ? (
                <>
                  Launch your POS.
                  <Box component="span" sx={{ display: 'block', color: brand.primary[300] }}>
                    Grow your business.
                  </Box>
                </>
              ) : (
                <>
                  {headline}
                  <Box component="span" sx={{ display: 'block', color: brand.primary[600] }}>
                    {accent}
                  </Box>
                </>
              )}
            </Typography>

            {/* Supporting text */}
            <Typography
              sx={{
                mt: { xs: 1.5, lg: 1.1, xl: 1.35 },
                mb: isRegister ? 5 : 0,
                maxWidth: 470,
                fontSize: { xs: '0.95rem', sm: '1.04rem', lg: '0.94rem', xl: '1rem' },
                lineHeight: 1.6,
                color: isRegister ? 'rgba(255,255,255,0.72)' : brand.neutral[600],
                animation: anim(190),
              }}
            >
              {isRegister
                ? 'Full-featured POS for Tanzanian businesses. Inventory, sales, customers, and analytics — all in one place.'
                : supportingText}
            </Typography>

            {/* Content area: trust rows (register) or benefits+showcase (login) */}
            {isRegister ? (
              <>
                {/* Trust rows */}
                <Stack spacing={2} sx={{ animation: anim(250), maxWidth: 420 }}>
                  {TRUST_ROWS.map((row, i) => (
                    <Stack key={row.title} direction="row" spacing={1.75} sx={{ animation: anim(250 + i * 70) }}>
                      <Box
                        sx={{
                          width: 38, height: 38,
                          borderRadius: '12px',
                          bgcolor: 'rgba(255,255,255,0.1)',
                          backdropFilter: 'blur(4px)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          color: brand.primary[300],
                          display: 'grid', placeItems: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {row.icon}
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: '0.84rem', fontWeight: 700, color: '#FFFFFF' }}>
                          {row.title}
                        </Typography>
                        <Typography sx={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.45 }}>
                          {row.desc}
                        </Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>

                {/* Plan chip */}
                <Box
                  sx={{
                    display: 'inline-flex', alignItems: 'center', gap: 1,
                    mt: 5, px: 2, py: 1.25,
                    borderRadius: '99px',
                    bgcolor: 'rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    fontSize: '0.76rem',
                    color: 'rgba(255,255,255,0.7)',
                    animation: anim(500),
                  }}
                >
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: brand.primary[400] }} />
                  Starts with{' '}
                  <Box component="strong" sx={{ color: '#FFFFFF', fontWeight: 700, mx: 0.5 }}>
                    Starter
                  </Box>{' '}
                  — upgrade anytime
                </Box>
              </>
            ) : (
              <>
                <Stack spacing={{ xs: 1.7, lg: 1.2, xl: 1.5 }} sx={{ mt: { xs: 2.5, sm: 3.5, lg: 2, xl: 2.6 }, maxWidth: 450 }}>
                  {benefits.map((item, index) => (
                    <BenefitRow key={item.title} {...item} delay={250 + index * 70} />
                  ))}
                </Stack>
                <ProductShowcase mode={mode} />
              </>
            )}
          </Box>
        </Box>

        {/* ═══ RIGHT: Form column ═══ */}
        <Box
          sx={{
            position: 'relative',
            px: { xs: 1.25, sm: 4, md: 7, xl: 9 },
            py: { xs: 1, sm: 5 },
            minHeight: '100dvh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            background: at.surfaces.page,
            '&::before': {
              content: '""',
              position: 'absolute',
              width: { sm: 460, xl: 560 },
              height: { sm: 460, xl: 560 },
              borderRadius: '50%',
              right: { sm: -260, xl: -300 },
              bottom: { sm: -280, xl: -340 },
              bgcolor: brand.primary[50],
              opacity: 0.6,
              pointerEvents: 'none',
            },
          }}
        >
          {/* Security badge */}
          <Stack
            direction="row" spacing={0.8} alignItems="center"
            sx={{
              display: { xs: 'none', sm: 'flex' },
              position: 'absolute',
              top: 24,
              right: { sm: 28, xl: 44 },
              px: 1.2, py: 0.65,
              borderRadius: '999px',
              bgcolor: 'rgba(255,255,255,0.78)',
              border: `1px solid ${brand.neutral[100]}`,
              boxShadow: '0 12px 28px rgba(15,23,42,0.05)',
              color: brand.primary[600],
            }}
          >
            <IconLock size={18} stroke={1.9} />
            <Typography sx={{ fontSize: '0.86rem', fontWeight: 800, color: brand.neutral[600] }}>
              Encrypted workspace access
            </Typography>
          </Stack>

          {/* Form card */}
          <Box
            sx={{
              width: '100%',
              maxWidth: { xs: 440, lg: 470, xl: 500 },
              borderRadius: { xs: 0, sm: '32px' },
              p: { xs: 0.75, sm: 4.2 },
              bgcolor: { xs: 'transparent', sm: at.surfaces.formCard },
              border: { xs: 'none', sm: `1px solid ${brand.neutral[100]}` },
              boxShadow: { xs: 'none', sm: at.shadow.form },
              backdropFilter: { xs: 'none', sm: 'blur(16px)' },
              animation: anim(170),
              position: 'relative',
              zIndex: 1,
            }}
          >
            {/* LetisMark in green circle */}
            <Box
              sx={{
                width: { xs: 38, sm: 70 },
                height: { xs: 38, sm: 70 },
                borderRadius: { xs: '14px', sm: '22px' },
                bgcolor: brand.primary[50],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: { xs: 0.8, sm: 2.1 },
                boxShadow: `inset 0 0 0 1px ${brand.primary[100]}`,
              }}
            >
              <LetisMark size={isRegister ? 30 : 42} />
            </Box>

            <Typography
              component="h2"
              sx={{
                textAlign: 'center',
                fontSize: { xs: '1.18rem', sm: '1.85rem' },
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
                mb: { xs: 1, sm: 3.2 },
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
