import { useState } from 'react';
import { Box, Button, IconButton, LinearProgress, Stack, Typography } from '@mui/material';
import { IconChevronRight, IconX } from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import { useOnboarding } from 'src/context/smartpos/OnboardingContext';
import { brand } from 'src/theme/smartpos/brand';
import SetupWizard from 'src/views/smartpos/onboarding/SetupWizard';

const STEP_INFO: Record<string, { label: string; cta: string; path: string }> = {
  warehouse: {
    label: 'Add your first warehouse',
    cta: 'Add Warehouse',
    path: '/smartpos/warehouses',
  },
  tax: {
    label: 'Set up tax rules',
    cta: 'Configure Tax',
    path: '/smartpos/settings/tax',
  },
  products: {
    label: 'Import your products',
    cta: 'Smart Import',
    path: '/smartpos/products',
  },
  staff: {
    label: 'Invite a team member',
    cta: 'Invite Staff',
    path: '/smartpos/settings/users',
  },
  firstSale: {
    label: 'Record your first sale',
    cta: 'Open POS',
    path: '/smartpos/pos',
  },
};

export default function OnboardingBanner() {
  const { state, dismissBanner, bannerDismissed } = useOnboarding();
  const navigate = useNavigate();
  const [wizardOpen, setWizardOpen] = useState(false);

  if (state.isComplete || bannerDismissed) return null;

  const nextStep = Object.entries(STEP_INFO).find(([key]) => !state[key as keyof typeof state]);
  if (!nextStep) return null;

  const [, { label, cta, path }] = nextStep;

  return (
    <>
      <Box
        sx={{
          mb: 3,
          p: { xs: 2, md: 2.5 },
          borderRadius: '14px',
          border: `1px solid ${brand.primary[200]}`,
          bgcolor: brand.primary[50],
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: 2,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{ fontWeight: 800, fontSize: { xs: 14, md: 15 }, color: brand.neutral[900] }}
          >
            🚀 {state.percent}% complete — {label}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={state.percent}
            sx={{
              mt: 1,
              height: 6,
              borderRadius: '3px',
              bgcolor: brand.primary[100],
              '& .MuiLinearProgress-bar': { bgcolor: brand.primary[600], borderRadius: '3px' },
            }}
          />
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            variant="contained"
            size="small"
            endIcon={<IconChevronRight size={16} />}
            onClick={() => (state.percent <= 16 ? setWizardOpen(true) : navigate(path))}
            sx={{
              bgcolor: brand.primary[600],
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: '8px',
              whiteSpace: 'nowrap',
            }}
          >
            {state.percent <= 16 ? 'Start Setup' : cta}
          </Button>
          <IconButton
            size="small"
            onClick={dismissBanner}
            sx={{ color: brand.neutral[400], flexShrink: 0 }}
          >
            <IconX size={16} />
          </IconButton>
        </Stack>
      </Box>

      <SetupWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </>
  );
}
