import React from 'react';
import { Box, Container, Typography, Stack, Grid } from '@mui/material';
import {
  IconArrowRight,
  IconBrain,
  IconCashRegister,
  IconCloudUpload,
  IconShieldCheck,
} from '@tabler/icons-react';
import CtaButton from '../components/CtaButton';
import { useDemoDialog } from '../components/DemoDialog';
import { useLpTheme } from '../LandingpageTheme';
import BenefitList, { BenefitTone } from '../components/BenefitList';
import ReceiptPreview from '../components/ReceiptPreview';
import { darkHeroStyles, lightHeroStyles } from './heroStyles';
import dashboardBrightCapture from 'src/assets/images/landingpage/letis-dashboard-real.png';
import dashboardDarkCapture from 'src/assets/images/landingpage/letis-dashboard-real-dark.png';
import BrandLogo from 'src/components/smartpos/BrandLogo';

const trustCards = [
  {
    icon: <IconShieldCheck size={28} />,
    title: 'Secure & Reliable',
    text: 'Tenant-safe data and protected business records.',
  },
  {
    icon: <IconCloudUpload size={28} />,
    title: 'Cloud Access',
    text: 'Run the business from any branch or device.',
  },
  {
    icon: <IconBrain size={28} />,
    title: 'AI Powered',
    text: 'Insights and automation for faster decisions.',
  },
  {
    icon: <IconCashRegister size={28} />,
    title: 'POS Ready',
    text: 'Works for counters, receipts, and daily sales.',
  },
];

const Hero: React.FC = () => {
  const { openDemo } = useDemoDialog();
  const { theme } = useLpTheme();
  const isBrightTheme = theme === 'bold-energetic';
  const heroTone: BenefitTone = isBrightTheme ? 'light' : 'dark';
  const heroStyles = isBrightTheme ? lightHeroStyles() : darkHeroStyles();
  const dashboardCapture = isBrightTheme ? dashboardBrightCapture : dashboardDarkCapture;

  return (
    <Box
      sx={{
        color: 'var(--lp-hero-text)',
        minHeight: { xs: 'auto', md: 'calc(100vh - 80px)' },
        display: 'flex',
        alignItems: 'center',
        pt: { xs: 4, md: 5 },
        pb: { xs: 5, md: 6 },
        position: 'relative',
        overflow: 'hidden',
        background: heroStyles.background,
        '&:before': {
          content: '""',
          position: 'absolute',
          width: { xs: 300, md: 560 },
          height: { xs: 300, md: 560 },
          right: { xs: -180, md: '42%' },
          top: { xs: 140, md: -110 },
          borderRadius: '50%',
          bgcolor: heroStyles.beforeBg,
          pointerEvents: 'none',
        },
      }}
    >
      <Container maxWidth="xl" sx={{ position: 'relative' }}>
        <Grid container spacing={{ xs: 4, md: 7 }} alignItems="center">
          <Grid size={{ xs: 12, md: 5 }} sx={{ order: { xs: 1, md: 0 } }}>
            <Stack
              direction="row"
              spacing={0.8}
              alignItems="center"
              sx={{
                width: 'fit-content',
                px: 1.35,
                py: 0.65,
                mb: { xs: 2.2, md: 2.8 },
                borderRadius: '999px',
                bgcolor: heroStyles.badgeBg,
                color: heroStyles.badgeColor,
                border: `1px solid ${heroStyles.badgeBorder}`,
                fontWeight: 900,
                fontSize: '0.76rem',
                textTransform: 'uppercase',
              }}
            >
              <IconBrain size={15} />
              AI Powered
            </Stack>

            <Typography
              variant="h1"
              sx={{
                fontFamily: 'var(--lp-font-body)',
                fontSize: { xs: '2.55rem', sm: '3.4rem', md: '4.15rem' },
                fontWeight: 900,
                lineHeight: 1.04,
                letterSpacing: 0,
                maxWidth: 660,
                mb: 2.4,
              }}
            >
              Smarter POS.
              <Box component="span" sx={{ display: 'block', color: heroStyles.accent }}>
                Stronger Business.
              </Box>
            </Typography>

            <Typography
              sx={{
                fontSize: { xs: '1rem', md: '1.12rem' },
                color: heroStyles.bodyText,
                lineHeight: 1.7,
                maxWidth: 560,
                mb: 3,
              }}
            >
              Letis POS helps you manage sales, inventory, customers, and finances with AI insights
              and a real-time dashboard.
            </Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.4} sx={{ mb: 3.4 }}>
              <CtaButton
                variant="primary"
                href="/auth/register?plan=starter"
                size="large"
                endIcon={<IconArrowRight size={18} />}
                sx={{ minHeight: 52, boxShadow: '0 18px 42px rgba(22, 163, 74, 0.26)' }}
              >
                Start free trial
              </CtaButton>
              <CtaButton
                variant="secondary"
                size="large"
                onClick={openDemo}
                sx={{
                  minHeight: 52,
                  bgcolor: '#FFFFFF',
                  color: '#0F172A',
                  borderColor: '#D8E2ED',
                  '&:hover': { bgcolor: '#F8FAFC' },
                }}
              >
                Book a demo
              </CtaButton>
            </Stack>

            <BenefitList tone={heroTone} sx={{ display: { xs: 'none', md: 'flex' } }} />
          </Grid>

          <Grid size={{ xs: 12, md: 7 }} sx={{ order: { xs: 2, md: 0 } }}>
            <Box
              id="product"
              sx={{ position: 'relative', minHeight: { xs: 500, sm: 560, md: 650 } }}
            >
              <Stack
                direction="row"
                spacing={0.85}
                alignItems="center"
                sx={{
                  justifyContent: { xs: 'flex-start', md: 'flex-end' },
                  mb: { xs: 2, md: 3 },
                  pr: { md: 5 },
                  color: heroStyles.statusText,
                  fontSize: '0.9rem',
                  fontWeight: 750,
                }}
              >
                <IconCloudUpload size={20} color="#16A34A" />
                System status:
                <Box component="span" sx={{ color: '#16A34A', fontWeight: 950 }}>
                  Online
                </Box>
              </Stack>

              <Box
                sx={{
                  position: 'relative',
                  minHeight: { xs: 470, sm: 540, md: 620 },
                  borderRadius: { xs: '28px', md: '34px' },
                  background: heroStyles.productStageBg,
                  border: `1px solid ${heroStyles.productStageBorder}`,
                  boxShadow: heroStyles.productStageShadow,
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    left: { xs: '7%', sm: '9%', md: '11%' },
                    bottom: { xs: 22, sm: 30, md: -16 },
                    width: { xs: 136, sm: 164, md: 196 },
                    height: { xs: 104, sm: 124, md: 146 },
                    borderRadius: '18px 18px 14px 14px',
                    background:
                      'linear-gradient(110deg, #111827 0%, #2B313A 42%, #171D25 68%, #05070A 100%)',
                    boxShadow:
                      '0 36px 70px rgba(15, 23, 42, 0.36), 0 10px 22px rgba(15, 23, 42, 0.26), inset -14px 0 28px rgba(0,0,0,0.42), inset 16px 0 22px rgba(255,255,255,0.05)',
                    zIndex: 5,
                    transform: {
                      xs: 'perspective(1100px) rotateY(-6deg) rotateX(3deg) scale(0.92)',
                      sm: 'perspective(1200px) rotateY(-7deg) rotateX(3deg) scale(0.9)',
                      md: 'perspective(1300px) rotateY(-8deg) rotateX(3deg) scale(0.82)',
                    },
                    transformStyle: 'preserve-3d',
                    transformOrigin: '50% 82%',
                    '&:before': {
                      content: '""',
                      position: 'absolute',
                      left: '16%',
                      right: '16%',
                      top: -24,
                      height: { xs: 50, md: 60 },
                      borderRadius: '14px 14px 5px 5px',
                      background:
                        'radial-gradient(ellipse at 50% 22%, rgba(203,213,225,0.95) 0 18%, transparent 19%), linear-gradient(180deg, #FFFFFF 0%, #E6F3EA 100%)',
                      boxShadow: '0 10px 22px rgba(15,23,42,0.14)',
                    },
                    '&:after': {
                      content: '""',
                      position: 'absolute',
                      left: '14%',
                      right: '14%',
                      top: { xs: 34, md: 42 },
                      height: { xs: 10, md: 12 },
                      borderRadius: '999px',
                      bgcolor: '#05070A',
                      zIndex: 4,
                    },
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      left: { xs: 20, md: 26 },
                      bottom: { xs: 14, md: 18 },
                      transform: { xs: 'scale(0.58)', sm: 'scale(0.66)', md: 'scale(0.74)' },
                      transformOrigin: 'left center',
                      filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.55))',
                      pointerEvents: 'none',
                      zIndex: 6,
                    }}
                  >
                    <BrandLogo size="sm" color="onDark" />
                  </Box>
                  <Box
                    sx={{
                      position: 'absolute',
                      left: { xs: '-16%', sm: '-20%', md: '-24%' },
                      bottom: { xs: -24, md: -34 },
                      width: { xs: '154%', sm: '168%', md: '180%' },
                      height: { xs: 28, md: 38 },
                      borderRadius: '50%',
                      background:
                        'radial-gradient(ellipse at 50% 50%, rgba(15, 23, 42, 0.45) 0%, rgba(15, 23, 42, 0.22) 45%, rgba(15, 23, 42, 0) 75%)',
                      filter: 'blur(8px)',
                      zIndex: 0,
                      transform: 'translateZ(-1px)',
                      pointerEvents: 'none',
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      left: '25%',
                      right: '25%',
                      top: -14,
                      height: { xs: 14, md: 16 },
                      borderRadius: '999px',
                      background: 'linear-gradient(180deg, #F8FAFC 0%, #DCEBE4 100%)',
                      boxShadow: 'inset 0 -4px 8px rgba(15,23,42,0.08)',
                      zIndex: 1,
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      left: { xs: '28%', md: '30%' },
                      top: { xs: -42, sm: -48, md: -54 },
                      width: { xs: '44%', sm: '46%', md: '48%' },
                      height: { xs: 56, sm: 64, md: 74 },
                      bgcolor: '#FFFFFF',
                      borderRadius: '10px 10px 6px 6px',
                      boxShadow: '0 10px 20px rgba(15, 23, 42, 0.12)',
                      transform: 'translateZ(2px)',
                      zIndex: 2,
                      overflow: 'hidden',
                      '&:before': {
                        content: '""',
                        position: 'absolute',
                        inset: 0,
                        background:
                          'linear-gradient(90deg, rgba(15,23,42,0.08), transparent 14%, transparent 86%, rgba(15,23,42,0.08)), repeating-linear-gradient(0deg, transparent 0, transparent 9px, rgba(15,23,42,0.08) 10px)',
                      },
                    }}
                  >
                    <Box sx={{ px: 0.7, pt: 0.7 }}>
                      <ReceiptPreview compact rows={3} />
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      position: 'absolute',
                      left: { xs: '13%', md: '14%' },
                      right: { xs: '13%', md: '14%' },
                      bottom: { xs: 18, md: 24 },
                      height: { xs: 18, md: 22 },
                      borderRadius: '7px',
                      bgcolor: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      boxShadow: 'inset 0 3px 10px rgba(0,0,0,0.18)',
                      zIndex: 4,
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      right: { xs: 10, md: 14 },
                      bottom: { xs: 28, md: 34 },
                      width: { xs: 14, md: 18 },
                      height: { xs: 44, md: 56 },
                      borderRadius: '7px',
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(0,0,0,0.18))',
                      border: '1px solid rgba(255,255,255,0.08)',
                      zIndex: 5,
                    }}
                  />
                </Box>

                <Box
                  sx={{
                    position: 'absolute',
                    right: { xs: '4%', md: '3%' },
                    top: { xs: 28, md: 32 },
                    width: { xs: '88%', sm: '76%', md: '78%' },
                    zIndex: 2,
                  }}
                >
                  <Box
                    sx={{
                      p: { xs: 1.3, md: 1.6 },
                      borderRadius: { xs: '22px', md: '28px' },
                      background: heroStyles.monitorFrame,
                      border: `1px solid ${heroStyles.monitorBorder}`,
                      boxShadow: heroStyles.monitorShadow,
                    }}
                  >
                    <Box
                      sx={{
                        overflow: 'hidden',
                        borderRadius: { xs: '14px', md: '18px' },
                        border: `1px solid ${heroStyles.screenBorder}`,
                        bgcolor: isBrightTheme ? '#F8FAFC' : '#101827',
                        aspectRatio: '16 / 10',
                      }}
                    >
                      <Box
                        component="img"
                        src={dashboardCapture}
                        alt={`Letis POS ${isBrightTheme ? 'bright' : 'dark'} dashboard preview for the selected month`}
                        loading="lazy"
                        sx={{
                          width: '100%',
                          height: '100%',
                          display: 'block',
                          objectFit: 'cover',
                          objectPosition: 'left top',
                          transition: 'opacity 0.18s ease-out',
                        }}
                      />
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      mx: 'auto',
                      width: { xs: '34%', md: '30%' },
                      height: { xs: 46, md: 60 },
                      background: heroStyles.monitorStand,
                      clipPath: 'polygon(20% 0, 80% 0, 100% 100%, 0 100%)',
                    }}
                  />
                  <Box
                    sx={{
                      mx: 'auto',
                      width: { xs: '58%', md: '50%' },
                      height: { xs: 18, md: 24 },
                      borderRadius: '999px',
                      background: heroStyles.monitorBase,
                      boxShadow: '0 18px 34px rgba(15, 23, 42, 0.22)',
                    }}
                  />
                </Box>

                <Box
                  sx={{
                    position: 'absolute',
                    right: { xs: 14, sm: 34, md: 18 },
                    bottom: { xs: 18, md: 28 },
                    width: { xs: 76, md: 92 },
                    height: { xs: 92, md: 112 },
                    borderRadius: '50% 50% 12px 12px',
                    background: 'linear-gradient(180deg, #DFF3E7 0%, #8BC8A0 100%)',
                    boxShadow: '0 18px 38px rgba(22, 163, 74, 0.16)',
                    '&:before': {
                      content: '""',
                      position: 'absolute',
                      inset: '24% 18% auto',
                      height: '44%',
                      borderRadius: '50%',
                      bgcolor: '#16A34A',
                      opacity: 0.55,
                    },
                    '&:after': {
                      content: '""',
                      position: 'absolute',
                      left: '18%',
                      right: '18%',
                      bottom: -10,
                      height: 22,
                      borderRadius: '0 0 18px 18px',
                      bgcolor: '#F8FAFC',
                      border: '1px solid #DDE7E3',
                    },
                  }}
                />
              </Box>
            </Box>
          </Grid>
        </Grid>

        <BenefitList dense tone={heroTone} sx={{ display: { xs: 'flex', md: 'none' }, mt: 3 }} />

        <Box
          sx={{
            mt: { xs: 4, md: 5 },
            pt: { xs: 3, md: 4 },
            borderTop: `1px solid ${heroStyles.divider}`,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: { xs: 2, md: 0 },
          }}
        >
          {trustCards.map((card, index) => (
            <Stack
              key={card.title}
              direction="row"
              spacing={1.6}
              alignItems="center"
              sx={{
                px: { md: 3 },
                borderLeft: { md: index === 0 ? '0' : `1px solid ${heroStyles.trustDivider}` },
              }}
            >
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#16A34A',
                  bgcolor: '#E7F8EE',
                  flexShrink: 0,
                }}
              >
                {card.icon}
              </Box>
              <Box>
                <Typography sx={{ fontSize: '1rem', fontWeight: 900, color: heroStyles.trustTitle, mb: 0.35 }}>
                  {card.title}
                </Typography>
                <Typography sx={{ fontSize: '0.88rem', color: heroStyles.trustText, lineHeight: 1.5 }}>
                  {card.text}
                </Typography>
              </Box>
            </Stack>
          ))}
        </Box>
      </Container>
    </Box>
  );
};

export default Hero;
