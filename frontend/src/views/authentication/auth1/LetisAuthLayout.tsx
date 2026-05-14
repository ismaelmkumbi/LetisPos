import React from 'react';
import { Box, Stack, Typography, keyframes } from '@mui/material';
import {
  IconBrain,
  IconChartBar,
  IconLock,
  IconPackages,
  IconShieldCheck,
  IconSparkles,
} from '@tabler/icons-react';

import PageContainer from 'src/components/container/PageContainer';
import BrandLogo, { LetisMark } from 'src/components/smartpos/BrandLogo';
import { brand } from 'src/theme/smartpos/brand';
import { wb } from 'src/theme/smartpos/warmBrutalism';

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
        mt: { xs: 2.5, md: 2.6, xl: 3 },
        height: { xs: 260, sm: 330, lg: 280, xl: 320 },
        maxWidth: 520,
        animation: `${anim(260)}, ${softFloat} 6s ease-in-out 1s infinite`,
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: { xs: '16px 10px 36px 22px', sm: '10px 20px 48px 36px' },
          borderRadius: { xs: '28px', sm: '34px' },
          background: 'linear-gradient(145deg, #111827 0%, #1F2937 100%)',
          boxShadow: '0 42px 86px rgba(15,23,42,0.25), 0 18px 34px rgba(15,23,42,0.14)',
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
          left: { xs: 18, sm: 26 },
          bottom: { xs: -28, sm: -42, lg: -54, xl: -42 },
          width: { xs: 190, sm: 224, lg: 218, xl: 250 },
          height: { xs: 146, sm: 178, lg: 168, xl: 198 },
          zIndex: 5,
          pointerEvents: 'none',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            bottom: { xs: 36, sm: 48, lg: 50, xl: 54 },
            width: { xs: 108, sm: 132, lg: 126, xl: 148 },
            height: { xs: 74, sm: 90, lg: 86, xl: 100 },
            borderRadius: '18px 18px 14px 14px',
            background: 'linear-gradient(135deg, #111827 0%, #28313C 56%, #05070A 100%)',
            boxShadow: '0 26px 44px rgba(15,23,42,0.28), inset 12px 0 18px rgba(255,255,255,0.04)',
            zIndex: 2,
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              left: '14%',
              right: '14%',
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
            boxShadow: '0 26px 48px rgba(15,23,42,0.20), inset 6px 0 10px rgba(15,23,42,0.04)',
            transform: 'rotate(7deg)',
            transformOrigin: 'center top',
            zIndex: 3,
            overflow: 'hidden',
            p: { xs: 0.75, sm: 0.9, xl: 1.05 },
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
      </Box>

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
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
          bgcolor: '#FFFFFF',
        }}
      >
        <Box
          sx={{
            position: 'relative',
            overflow: 'hidden',
            px: { xs: 2.4, sm: 5, md: 7, lg: 6, xl: 9 },
            py: { xs: 2.5, sm: 4, lg: 3.5, xl: 4.5 },
            minHeight: { xs: 'auto', lg: '100dvh' },
            display: { xs: 'none', lg: 'flex' },
            alignItems: 'center',
            background: wb.darkBg,
            '&::after': {
              content: '""',
              position: 'absolute',
              inset: 0,
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise' x='0' y='0'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
              opacity: 0.4,
              pointerEvents: 'none',
            },
          }}
        >
          {/* Gold vertical accent line */}
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              top: '12%',
              bottom: '12%',
              width: 3,
              background: `linear-gradient(180deg, transparent 0%, ${wb.gold} 20%, ${wb.gold} 80%, transparent 100%)`,
              borderRadius: '0 2px 2px 0',
            }}
          />
          <Box sx={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 610 }}>
            {/* Brand mark — gold/clay gradient square */}
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: wb.radius.md,
                background: `linear-gradient(135deg, ${wb.gold} 0%, ${wb.clay} 100%)`,
                display: 'grid',
                placeItems: 'center',
                mb: 6,
                boxShadow: `0 0 0 8px rgba(194,132,58,0.12)`,
                position: 'relative',
                animation: anim(0),
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  inset: -2,
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.15)',
                },
              }}
            >
              <BrandLogo size="sm" color="onDark" />
            </Box>

            {/* Headline */}
            <Typography
              component="h1"
              sx={{
                fontFamily: wb.font.display,
                fontSize: { xs: '2.1rem', sm: '3rem', lg: '3rem', xl: '3.2rem' },
                fontWeight: 500,
                lineHeight: 1.08,
                letterSpacing: '-0.02em',
                color: mode === 'register' ? wb.paper : brand.neutral[900],
                mb: 2,
                animation: anim(130),
              }}
            >
              {mode === 'register' ? (
                <>
                  Run your store{' '}
                  <Box component="em" sx={{ fontStyle: 'italic', color: wb.gold }}>
                    with confidence.
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
                mb: 6,
                maxWidth: 380,
                fontSize: { xs: '0.95rem', sm: '1.04rem', lg: '0.94rem', xl: '0.95rem' },
                lineHeight: 1.6,
                color: mode === 'register' ? 'rgba(250,250,247,0.65)' : brand.neutral[600],
                animation: anim(190),
              }}
            >
              {mode === 'register'
                ? 'Full-featured POS, inventory, and analytics. Built for Tanzanian businesses ready to grow.'
                : supportingText}
            </Typography>

            {/* Trust rows (register mode) or benefits + ProductShowcase (login mode) */}
            {mode === 'register' ? (
              <Stack spacing={2} sx={{ animation: anim(250) }}>
                {[
                  { icon: '30', title: '30-day full access trial', desc: 'Every feature unlocked. No credit card. No commitment.' },
                  { icon: '✦', title: 'Free local onboarding', desc: 'Our Dar es Salaam team helps you get set up in hours, not weeks.' },
                  { icon: 'M', title: 'Pay with M-Pesa', desc: 'Monthly or annual billing in Tanzanian shillings via mobile money.' },
                ].map((row, i) => (
                  <Stack key={row.title} direction="row" spacing={1.75} sx={{ animation: anim(250 + i * 70) }}>
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: wb.radius.sm,
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                        color: wb.gold,
                        fontSize: '0.85rem',
                        fontWeight: 700,
                      }}
                    >
                      {row.icon}
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: 'rgba(250,250,247,0.9)' }}>
                        {row.title}
                      </Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: 'rgba(250,250,247,0.5)', lineHeight: 1.4 }}>
                        {row.desc}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
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

            {/* Plan chip (register mode only) */}
            {mode === 'register' && (
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1,
                  mt: 5,
                  px: 2,
                  py: 1.25,
                  borderRadius: '99px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  fontSize: '0.75rem',
                  color: 'rgba(250,250,247,0.6)',
                  animation: anim(500),
                }}
              >
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: wb.gold }} />
                You&apos;ll start on <Box component="strong" sx={{ color: wb.gold, fontWeight: 600, mx: 0.5 }}>Starter</Box> — upgrade anytime
              </Box>
            )}
          </Box>
        </Box>

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
            background:
              'radial-gradient(circle at 78% 18%, rgba(22,163,74,0.12), transparent 32%), radial-gradient(circle at 15% 82%, rgba(59,130,246,0.07), transparent 28%), #FFFFFF',
            '&:before': {
              content: '""',
              position: 'absolute',
              width: { sm: 460, xl: 560 },
              height: { sm: 460, xl: 560 },
              borderRadius: '50%',
              right: { sm: -260, xl: -300 },
              bottom: { sm: -280, xl: -340 },
              bgcolor: 'rgba(22,163,74,0.045)',
              pointerEvents: 'none',
            },
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
              px: 1.2,
              py: 0.65,
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

          <Box
            sx={{
              width: '100%',
              maxWidth: { xs: 440, lg: 470, xl: 500 },
              borderRadius: { xs: 0, sm: '32px' },
              p: { xs: 0.75, sm: 4.2 },
              bgcolor: { xs: 'transparent', sm: 'rgba(255,255,255,0.92)' },
              border: { xs: 'none', sm: '1px solid rgba(226,232,240,0.92)' },
              boxShadow: {
                xs: 'none',
                sm: '0 44px 110px rgba(15,23,42,0.13), 0 18px 44px rgba(15,23,42,0.08)',
              },
              backdropFilter: { xs: 'none', sm: 'blur(16px)' },
              animation: anim(170),
              position: 'relative',
              zIndex: 1,
            }}
          >
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
              <LetisMark size={mode === 'register' ? 30 : 42} />
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
