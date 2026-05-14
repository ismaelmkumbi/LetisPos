import { useState } from 'react';
import { Box, Button, IconButton, LinearProgress, Stack, Typography } from '@mui/material';
import { IconChevronRight, IconX } from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import { useOnboarding } from 'src/context/smartpos/OnboardingContext';
import { useAuth } from 'src/context/smartpos/AuthContext';
import { brand } from 'src/theme/smartpos/brand';
import { authTheme as at } from 'src/theme/smartpos/authTheme';
import SetupWizard from 'src/views/smartpos/onboarding/SetupWizard';

const STEP_INFO: Record<string, { label: string; cta: string; path: string }> = {
  warehouse:  { label: 'Add your first warehouse', cta: 'Add Warehouse',  path: '/smartpos/warehouses' },
  tax:        { label: 'Set up tax rules',        cta: 'Configure Tax',   path: '/smartpos/settings/tax-pricing' },
  products:   { label: 'Import your products',     cta: 'Smart Import',    path: '/smartpos/products' },
  firstSale:  { label: 'Record your first sale',   cta: 'Open POS',        path: '/smartpos/pos' },
};

const SETUP_STEPS = [
  { key: 'warehouse' as const, label: 'Add warehouse' },
  { key: 'tax' as const,       label: 'Configure tax' },
  { key: 'products' as const,  label: 'Add products' },
  { key: 'firstSale' as const, label: 'First sale' },
];

export default function OnboardingBanner() {
  const { state, dismissBanner, bannerDismissed } = useOnboarding();
  const { user, tenants, isTrialing, getTrialDaysLeft } = useAuth();
  const navigate = useNavigate();
  const [wizardOpen, setWizardOpen] = useState(false);

  if (state.isComplete || bannerDismissed) return null;

  const isFirstLogin = state.percent <= 20;
  const trialDays = getTrialDaysLeft();
  const tenantPlan = tenants[0]?.billingPlan ?? 'STARTER';

  const currentStepIndex = SETUP_STEPS.findIndex((s) => !state[s.key]);
  const nextStep = Object.entries(STEP_INFO).find(([key]) => !state[key as keyof typeof state]);
  if (!nextStep) return null;

  return (
    <>
      <Box
        sx={{
          mb: 3,
          p: { xs: 2.5, md: 3 },
          borderRadius: at.radius.xl,
          border: isFirstLogin ? 'none' : `1px solid ${brand.neutral[200]}`,
          bgcolor: isFirstLogin ? brand.primary[800] : '#FFFFFF',
          color: isFirstLogin ? '#FFFFFF' : brand.neutral[900],
          position: 'relative',
          overflow: 'hidden',
          boxShadow: isFirstLogin ? at.shadow.elevated : at.shadow.sm,
          ...(isFirstLogin && {
            '&::before': {
              content: '""',
              position: 'absolute',
              inset: 0,
              background:
                `radial-gradient(ellipse at 20% 30%, ${brand.primary[400]}30 0%, transparent 50%),
                 radial-gradient(ellipse at 80% 70%, ${brand.primary[600]}20 0%, transparent 50%)`,
              pointerEvents: 'none',
            },
          }),
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'stretch', md: 'center' }}
          justifyContent="space-between"
          gap={2}
          sx={{ position: 'relative', zIndex: 1 }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {isFirstLogin ? (
              <>
                <Typography
                  sx={{
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: brand.primary[300],
                    mb: 0.75,
                  }}
                >
                  Your workspace is ready
                </Typography>
                <Typography
                  sx={{
                    fontFamily: at.fontDisplay,
                    fontSize: { xs: '1.15rem', md: '1.3rem' },
                    fontWeight: 600,
                    letterSpacing: '-0.015em',
                    mb: 0.75,
                    color: '#FFFFFF',
                  }}
                >
                  Welcome{user?.firstName ? `, ${user.firstName}` : ''}
                </Typography>
                <Typography sx={{ fontSize: '0.78rem', lineHeight: 1.5, color: 'rgba(255,255,255,0.7)', mb: 2 }}>
                  Set up your store and make your first sale. Three quick steps.
                </Typography>

                {/* Numbered steps */}
                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                  {SETUP_STEPS.map((step, i) => {
                    const done = state[step.key] === true;
                    const current = i === currentStepIndex;
                    return (
                      <Stack key={step.key} direction="row" alignItems="center" spacing={0.75}>
                        <Box
                          sx={{
                            width: 24, height: 24,
                            borderRadius: '50%',
                            display: 'grid', placeItems: 'center',
                            fontSize: '0.65rem', fontWeight: 700,
                            ...(done
                              ? { bgcolor: brand.primary[500], color: '#FFFFFF' }
                              : current
                                ? { bgcolor: brand.primary[400], color: '#FFFFFF', boxShadow: `0 0 0 3px ${brand.primary[400]}40` }
                                : { bgcolor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }),
                          }}
                        >
                          {done ? '✓' : i + 1}
                        </Box>
                        <Typography
                          sx={{
                            fontSize: '0.72rem',
                            fontWeight: current ? 600 : 400,
                            color: current ? '#FFFFFF' : done ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.35)',
                            display: { xs: 'none', sm: 'inline' },
                          }}
                        >
                          {step.label}
                        </Typography>
                      </Stack>
                    );
                  })}
                </Stack>
              </>
            ) : (
              <>
                <Typography sx={{ fontWeight: 800, fontSize: { xs: 14, md: 15 }, color: brand.neutral[900] }}>
                  🚀 {state.percent}% complete — {nextStep?.[1].label}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={state.percent}
                  sx={{
                    mt: 1, height: 6, borderRadius: '3px',
                    bgcolor: brand.neutral[100],
                    '& .MuiLinearProgress-bar': { bgcolor: brand.primary[600], borderRadius: '3px' },
                  }}
                />
              </>
            )}
          </Box>

          <Stack direction="row" spacing={1.5} alignItems="center">
            {/* Plan + trial stat boxes (first login only) */}
            {isFirstLogin && (
              <Stack direction="row" spacing={1} sx={{ display: { xs: 'none', lg: 'flex' } }}>
                <Box
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: at.radius.md,
                    px: 2, py: 1.5,
                    textAlign: 'center',
                    minWidth: 80,
                  }}
                >
                  <Typography sx={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.55)' }}>
                    Your plan
                  </Typography>
                  <Typography sx={{ fontFamily: at.fontDisplay, fontSize: '1rem', fontWeight: 600, color: '#FFFFFF', lineHeight: 1 }}>
                    {tenantPlan.charAt(0) + tenantPlan.slice(1).toLowerCase()}
                  </Typography>
                </Box>
                {isTrialing() && trialDays !== null && (
                  <Box
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: at.radius.md,
                      px: 2, py: 1.5,
                      textAlign: 'center',
                      minWidth: 80,
                    }}
                  >
                    <Typography sx={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.55)' }}>
                      Trial ends
                    </Typography>
                    <Typography sx={{ fontFamily: at.fontDisplay, fontSize: '1rem', fontWeight: 600, color: '#FFFFFF', lineHeight: 1 }}>
                      {trialDays} days
                    </Typography>
                  </Box>
                )}
              </Stack>
            )}

            <Button
              variant="contained"
              size="small"
              endIcon={<IconChevronRight size={16} />}
              onClick={() => (isFirstLogin ? setWizardOpen(true) : navigate(nextStep![1].path))}
              sx={{
                bgcolor: isFirstLogin ? '#FFFFFF' : brand.primary[600],
                color: isFirstLogin ? brand.neutral[900] : '#FFFFFF',
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: at.radius.md,
                whiteSpace: 'nowrap',
                '&:hover': {
                  bgcolor: isFirstLogin ? brand.neutral[100] : brand.primary[700],
                },
              }}
            >
              {isFirstLogin ? 'Start guided setup' : nextStep![1].cta}
            </Button>

            <IconButton
              size="small"
              onClick={dismissBanner}
              sx={{
                color: isFirstLogin ? 'rgba(255,255,255,0.4)' : brand.neutral[400],
                flexShrink: 0,
                '&:hover': { color: isFirstLogin ? 'rgba(255,255,255,0.7)' : brand.neutral[600] },
              }}
            >
              <IconX size={16} />
            </IconButton>
          </Stack>
        </Stack>
      </Box>

      <SetupWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </>
  );
}
