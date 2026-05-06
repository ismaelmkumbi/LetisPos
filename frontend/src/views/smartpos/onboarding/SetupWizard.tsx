import { useState } from 'react';
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
import WarehouseSetup from './steps/WarehouseSetup';
import TaxSetup from './steps/TaxSetup';
import ProductImportSetup from './steps/ProductImportSetup';
import StaffInviteSetup from './steps/StaffInviteSetup';
import FirstSaleGuide from './steps/FirstSaleGuide';

const STEPS = ['Warehouse', 'Tax Rules', 'Products', 'Team', 'First Sale'];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SetupWizard({ open, onClose }: Props) {
  const [activeStep, setActiveStep] = useState(0);

  const handleNext = () => {
    if (activeStep < STEPS.length - 1) {
      setActiveStep((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handleBack = () => setActiveStep((prev) => Math.max(0, prev - 1));
  const handleSkip = () => {
    if (activeStep < STEPS.length - 1) {
      setActiveStep((prev) => prev + 1);
    } else {
      onClose();
    }
  };

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
          '& .MuiStepIcon-root.Mui-completed': { color: brand.primary[600] },
        }}
      >
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel sx={{ '& .MuiStepLabel-label': { fontSize: 12, fontWeight: 600 } }}>
              {label}
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      <DialogContent sx={{ px: 3, py: 1 }}>
        {activeStep === 0 && <WarehouseSetup onComplete={handleNext} />}
        {activeStep === 1 && <TaxSetup onComplete={handleNext} />}
        {activeStep === 2 && <ProductImportSetup onComplete={handleNext} />}
        {activeStep === 3 && <StaffInviteSetup onComplete={handleNext} />}
        {activeStep === 4 && <FirstSaleGuide onComplete={handleNext} />}
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
            onClick={isLast ? handleNext : handleSkip}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: 2,
              bgcolor: brand.primary[600],
              px: 3,
            }}
          >
            {isLast ? 'Finish' : 'Skip'}
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
}
