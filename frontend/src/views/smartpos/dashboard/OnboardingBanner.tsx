import { useContext, useState } from 'react';
import { Box, Button, IconButton, LinearProgress, Stack, Typography } from '@mui/material';
import { IconChevronRight, IconX } from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import { useOnboarding } from 'src/context/smartpos/OnboardingContext';
import { useAuth } from 'src/context/smartpos/AuthContext';
import { CustomizerContext } from 'src/context/CustomizerContext';
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
  const { activeMode } = useContext(CustomizerContext);
  const isDark = activeMode === 'dark';
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
          mb: 1.5,
          p: { xs: 1.25, sm: 1.5, md: 1.75 },
          borderRadius: '12px',
          border: `1px solid ${isDark ? brand.neutral[700] : isFirstLogin ? brand.primary[200] : brand.neutral[200]}`,
          borderLeft: `4px solid ${brand.primary[600]}`,
          bgcolor: isDark ? brand.neutral[800] : isFirstLogin ? brand.primary[50] : '#FFFFFF',
          color: isDark ? brand.neutral[100] : brand.neutral[900],
          position: 'relative',
          overflow: 'hidden',
          boxShadow: at.shadow.sm,
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'stretch', md: 'center' }}
          justifyContent="space-between"
          gap={{ xs: 1.5, md: 2 }}
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
                    letterSpacing: '0.06em',
                    color: isDark ? brand.primary[300] : brand.primary[700],
                    mb: 0.35,
                  }}
                >
                  Setup checklist
                </Typography>
                <Typography
                  sx={{
                    fontFamily: at.fontDisplay,
                    fontSize: { xs: '0.95rem', sm: '1rem', md: '1.08rem' },
                    fontWeight: 700,
                    mb: 0.35,
                    color: isDark ? brand.neutral[100] : brand.neutral[900],
                  }}
                >
                  Finish your store setup{user?.firstName ? `, ${user.firstName}` : ''}
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', lineHeight: 1.45, color: isDark ? brand.neutral[400] : brand.neutral[500], mb: 1 }}>
                  Complete the essentials so your dashboard data stays accurate.
                </Typography>

                {/* Numbered steps */}
                <Stack direction="row" spacing={{ xs: 1, sm: 1.5 }} sx={{ flexWrap: 'wrap' }}>
                  {SETUP_STEPS.map((step, i) => {
                    const done = state[step.key] === true;
                    const current = i === currentStepIndex;
                    return (
                      <Stack key={step.key} direction="row" alignItems="center" spacing={0.75}>
                        <Box
                          sx={{
                            width: { xs: 22, sm: 24 },
                            height: { xs: 22, sm: 24 },
                            borderRadius: '50%',
                            display: 'grid', placeItems: 'center',
                            fontSize: '0.65rem', fontWeight: 700,
                            ...(done
                              ? { bgcolor: brand.primary[600], color: '#FFFFFF' }
                              : current
                                ? {
                                    bgcolor: isDark ? brand.neutral[900] : '#FFFFFF',
                                    color: isDark ? brand.primary[300] : brand.primary[700],
                                    border: `1px solid ${isDark ? brand.primary[700] : brand.primary[300]}`,
                                    boxShadow: `0 0 0 3px ${isDark ? 'rgba(34,197,94,0.16)' : brand.primary[100]}`,
                                  }
                                : {
                                    bgcolor: isDark ? brand.neutral[900] : '#FFFFFF',
                                    color: isDark ? brand.neutral[500] : brand.neutral[400],
                                    border: `1px solid ${isDark ? brand.neutral[700] : brand.neutral[200]}`,
                                  }),
                          }}
                        >
                          {done ? '✓' : i + 1}
                        </Box>
                        <Typography
                          sx={{
                            fontSize: '0.72rem',
                            fontWeight: current ? 700 : 500,
                            color: current ? (isDark ? brand.neutral[100] : brand.neutral[900]) : done ? brand.primary[isDark ? 300 : 700] : brand.neutral[400],
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
                  <Typography sx={{ fontWeight: 800, fontSize: { xs: 14, md: 15 }, color: isDark ? brand.neutral[100] : brand.neutral[900] }}>
                  🚀 {state.percent}% complete — {nextStep?.[1].label}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={state.percent}
                  sx={{
                    mt: 1, height: 6, borderRadius: '3px',
                    bgcolor: isDark ? brand.neutral[700] : brand.neutral[100],
                    '& .MuiLinearProgress-bar': { bgcolor: brand.primary[600], borderRadius: '3px' },
                  }}
                />
              </>
            )}
          </Box>

          <Stack direction="row" spacing={{ xs: 1, sm: 1.5 }} alignItems="center">
            {/* Plan + trial stat boxes (first login only) */}
            {isFirstLogin && (
              <Stack direction="row" spacing={1} sx={{ display: { xs: 'none', lg: 'flex' } }}>
                <Box
                  sx={{
                    bgcolor: isDark ? brand.neutral[900] : '#FFFFFF',
                    border: `1px solid ${isDark ? brand.neutral[700] : brand.primary[200]}`,
                    borderRadius: at.radius.md,
                    px: 2, py: 1.5,
                    textAlign: 'center',
                    minWidth: 80,
                  }}
                >
                  <Typography sx={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: isDark ? brand.primary[300] : brand.primary[700] }}>
                    Your plan
                  </Typography>
                  <Typography sx={{ fontFamily: at.fontDisplay, fontSize: '1rem', fontWeight: 700, color: isDark ? brand.neutral[100] : brand.neutral[900], lineHeight: 1 }}>
                    {tenantPlan.charAt(0) + tenantPlan.slice(1).toLowerCase()}
                  </Typography>
                </Box>
                {isTrialing() && trialDays !== null && (
                  <Box
                    sx={{
                      bgcolor: isDark ? brand.neutral[900] : '#FFFFFF',
                      border: `1px solid ${isDark ? brand.neutral[700] : brand.primary[200]}`,
                      borderRadius: at.radius.md,
                      px: 2, py: 1.5,
                      textAlign: 'center',
                      minWidth: 80,
                    }}
                  >
                    <Typography sx={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: isDark ? brand.primary[300] : brand.primary[700] }}>
                      Trial ends
                    </Typography>
                    <Typography sx={{ fontFamily: at.fontDisplay, fontSize: '1rem', fontWeight: 700, color: isDark ? brand.neutral[100] : brand.neutral[900], lineHeight: 1 }}>
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
                bgcolor: brand.primary[600],
                color: '#FFFFFF',
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: at.radius.md,
                minHeight: 40,
                px: { xs: 1.5, sm: 2 },
                whiteSpace: 'nowrap',
                '&:hover': {
                  bgcolor: brand.primary[700],
                },
              }}
            >
              {isFirstLogin ? 'Start guided setup' : nextStep![1].cta}
            </Button>

            <IconButton
              size="small"
              onClick={dismissBanner}
              sx={{
                color: brand.neutral[400],
                flexShrink: 0,
                '&:hover': { color: brand.neutral[600] },
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
