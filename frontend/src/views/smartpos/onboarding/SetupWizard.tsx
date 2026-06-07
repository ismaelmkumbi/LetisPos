import { useState, useMemo } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  Step,
  StepLabel,
  Stepper,
  Typography,
} from '@mui/material';
import { brand } from 'src/theme/smartpos/brand';
import { useOnboarding } from 'src/context/smartpos/OnboardingContext';
import ShopTypeSetup from './steps/ShopTypeSetup';
import BrandSetup from './steps/BrandSetup';
import WarehouseSetup from './steps/WarehouseSetup';
import TaxSetup from './steps/TaxSetup';
import ProductImportSetup from './steps/ProductImportSetup';
import DocumentThemeSetup from './steps/DocumentThemeSetup';
import FirstSaleGuide from './steps/FirstSaleGuide';

const STEPS = ['Shop Type', 'Brand', 'Warehouse', 'Tax Rules', 'Products', 'Invoice Look', 'First Sale'];

const STEP_KEYS = ['shop_type', 'brand', 'warehouse', 'tax', 'products', 'document_theme', 'first_sale'] as const;

// Map API step keys to OnboardingState property names (shop_type is tracked in verticals, not onboarding)
const STATE_KEY: Record<string, keyof import('src/api/smartpos/onboarding').OnboardingState | null> = {
  shop_type: null,  // tracked via tenant_verticals API, not onboarding state
  brand: 'brand',
  warehouse: 'warehouse',
  tax: 'tax',
  products: 'products',
  document_theme: 'documentTheme',
  first_sale: 'firstSale',
};

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SetupWizard({ open, onClose }: Props) {
  const { completeStep, state } = useOnboarding();

  // Find which steps are already completed, skipping shop_type (not in onboarding state)
  const stepState = useMemo(() => {
    const done: boolean[] = STEP_KEYS.map((k) => {
      const stateKey = STATE_KEY[k];
      if (stateKey === null) return false; // shop_type — always shown
      return !!state[stateKey];
    });
    const firstIncomplete = done.indexOf(false);
    return { done, startAt: firstIncomplete >= 0 ? firstIncomplete : 0 };
  }, [state]);

  const [activeStep, setActiveStep] = useState(stepState.startAt);

  const advanceToNextIncomplete = () => {
    for (let i = activeStep + 1; i < STEPS.length; i++) {
      if (!stepState.done[i]) { setActiveStep(i); return; }
    }
    onClose();
  };

  const handleComplete = () => {
    const stepKey = STEP_KEYS[activeStep];
    const stateKey = STATE_KEY[stepKey];
    if (stateKey !== null) {
      completeStep(stepKey as any); // shop_type has null stateKey, not passed
    }
    advanceToNextIncomplete();
  };

  const handleBack = () => {
    for (let i = activeStep - 1; i >= 0; i--) {
      if (!stepState.done[i]) { setActiveStep(i); return; }
    }
  };

  const handleSkip = () => advanceToNextIncomplete();

  const isLast = activeStep === STEPS.length - 1;

  return (
    <Dialog
      open={open}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: '16px', minHeight: '55vh' } }}
    >
      <Box sx={{ p: 3, pb: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
          Let us set up Letis POS
        </Typography>
        <Typography sx={{ color: brand.neutral[500], fontSize: 14 }}>
          This takes about 5 minutes. You can skip any step and come back later.
        </Typography>
      </Box>

      <Stepper
        activeStep={activeStep}
        sx={{
          px: 3,
          py: 2,
          '& .MuiStepIcon-root.Mui-active': { color: brand.primary[600] },
          '& .MuiStepIcon-root.Mui-completed': { color: brand.success.main },
        }}
      >
        {STEPS.map((label, i) => (
          <Step key={label} completed={stepState.done[i] || i < activeStep}>
            <StepLabel sx={{ '& .MuiStepLabel-label': { fontSize: 12, fontWeight: 600 } }}>
              {label}
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      <DialogContent sx={{ px: 3, py: 1 }}>
        {activeStep === 0 && <ShopTypeSetup />}
        {activeStep === 1 && <BrandSetup onComplete={handleComplete} />}
        {activeStep === 2 && <WarehouseSetup onComplete={handleComplete} />}
        {activeStep === 3 && <TaxSetup onComplete={handleComplete} />}
        {activeStep === 4 && <ProductImportSetup onComplete={handleComplete} />}
        {activeStep === 5 && <DocumentThemeSetup onComplete={handleComplete} />}
        {activeStep === 6 && <FirstSaleGuide onComplete={handleComplete} />}
      </DialogContent>

      <Box
        sx={{
          p: 3,
          pt: 1,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Button
          onClick={handleBack}
          disabled={activeStep === 0}
          sx={{ textTransform: 'none', fontWeight: 700, color: brand.neutral[600] }}
        >
          Back
        </Button>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {!isLast && (
            <Button
              onClick={handleSkip}
              sx={{ textTransform: 'none', fontWeight: 700, color: brand.neutral[500] }}
            >
              Skip for now
            </Button>
          )}
          <Button
            variant="contained"
            onClick={isLast ? onClose : handleSkip}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: 2,
              bgcolor: brand.primary[600],
              px: 3,
            }}
          >
            {isLast ? 'Finish' : 'Continue'}
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
}
