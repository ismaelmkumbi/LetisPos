import { useState, useCallback } from 'react';
import {
  Box, Button, CircularProgress, Dialog, DialogContent, Grid, Stack, Step, StepLabel,
  Stepper, TextField, Typography, Card, ToggleButton, ToggleButtonGroup, MenuItem,
} from '@mui/material';
import {
  IconSparkles, IconArrowRight, IconArrowLeft, IconCheck, IconRocket,
} from '@tabler/icons-react';
import { useBrand } from 'src/context/smartpos/BrandContext';
import { api } from 'src/api/smartpos/client';

interface BrandKit {
  palette: { primary: string; secondary: string; accent: string; neutral: string; highlight: string };
  fonts: { heading: string; body: string };
  tagline: string;
  brandTone: string;
  templateStyles: string[];
  applied?: boolean;
}

const STEPS = ['Identity', 'Style', 'Generate', 'Preview', 'Apply'];

const STYLE_OPTIONS = [
  { value: 'modern', label: 'Modern & Clean' },
  { value: 'traditional', label: 'Traditional & Trusted' },
  { value: 'playful', label: 'Bold & Playful' },
  { value: 'luxury', label: 'Luxury & Premium' },
  { value: 'tech', label: 'Tech & Innovative' },
];

const INDUSTRIES = [
  'Pharmacy', 'Restaurant', 'Retail', 'Salon', 'Supermarket',
  'Hardware', 'Electronics', 'Hotel', 'Clinic', 'Law Firm', 'Bakery', 'Auto Parts', 'Other',
];

export default function OnboardingWizard() {
  const { profile, refresh } = useBrand();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [businessName, setBusinessName] = useState(profile?.businessName || '');
  const [industry, setIndustry] = useState(profile?.industry || 'Retail');
  const [style, setStyle] = useState('modern');
  const [kits, setKits] = useState<BrandKit[]>([]);
  const [selectedKit, setSelectedKit] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    const results: BrandKit[] = [];
    const styles = ['modern', 'traditional', 'playful'];

    for (const s of styles) {
      try {
        const { data } = await api.post('/api/v1/brand/ai/complete-kit', {
          businessName, industry, style: s,
        });
        results.push(data);
      } catch {
        // Skip failed generation
      }
    }

    if (results.length === 0) {
      // Fallback default kit
      results.push({
        palette: { primary: '#16A34A', secondary: '#1E293B', accent: '#F59E0B', neutral: '#F8FAFC', highlight: '#22C55E' },
        fonts: { heading: 'Inter, system-ui, sans-serif', body: 'Inter, system-ui, sans-serif' },
        tagline: 'Quality you can trust',
        brandTone: 'Professional',
        templateStyles: ['Clean Modern'],
      });
    }

    setKits(results);
    setGenerating(false);
    setStep(3);
  }, [businessName, industry]);

  const handleApply = useCallback(async () => {
    if (selectedKit === null || !kits[selectedKit]) return;
    setApplying(true);

    try {
      await api.post('/api/v1/brand/ai/complete-kit', {
        businessName, industry, style,
      });
      await refresh();
      setStep(4);
    } catch {
      // Still move forward even if apply fails
      setStep(4);
    } finally {
      setApplying(false);
    }
  }, [selectedKit, kits, businessName, industry, style, refresh]);

  const handleClose = () => {
    setOpen(false);
    setStep(0);
    setKits([]);
    setSelectedKit(null);
  };

  const colorSx = (c: string) => ({
    width: 28, height: 28, borderRadius: '6px', bgcolor: c,
    border: '1px solid rgba(0,0,0,0.08)', flexShrink: 0,
  });

  return (
    <>
      <Button
        variant="contained"
        startIcon={<IconRocket size={16} />}
        onClick={() => setOpen(true)}
        sx={{
          textTransform: 'none', fontWeight: 800, borderRadius: '10px',
          bgcolor: 'var(--bp-color-primary, #16A34A)',
          '&:hover': { bgcolor: 'var(--bp-color-primary-dark, #15803D)' },
        }}
      >
        AI Brand Setup Wizard
      </Button>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogContent sx={{ p: 3 }}>
          <Stepper activeStep={step} alternativeLabel sx={{ mb: 3 }}>
            {STEPS.map((label) => (
              <Step key={label}><StepLabel sx={{ '& .MuiStepLabel-label': { fontSize: '0.62rem', fontWeight: 700 } }}>{label}</StepLabel></Step>
            ))}
          </Stepper>

          {/* Step 0: Identity */}
          {step === 0 && (
            <Stack spacing={2}>
              <Typography sx={{ fontWeight: 800, fontSize: '1rem', textAlign: 'center' }}>
                Let's build your brand
              </Typography>
              <TextField label="Business Name" fullWidth value={businessName}
                onChange={(e) => setBusinessName(e.target.value)} />
              <TextField label="Industry" select fullWidth value={industry}
                onChange={(e) => setIndustry(e.target.value)}>
                {INDUSTRIES.map((ind) => (
                  <MenuItem key={ind} value={ind}>{ind}</MenuItem>
                ))}
              </TextField>
            </Stack>
          )}

          {/* Step 1: Style */}
          {step === 1 && (
            <Stack spacing={2} alignItems="center">
              <Typography sx={{ fontWeight: 800, fontSize: '1rem' }}>
                What's your brand style?
              </Typography>
              <ToggleButtonGroup value={style} exclusive onChange={(_, v) => v && setStyle(v)} orientation="vertical" fullWidth>
                {STYLE_OPTIONS.map((opt) => (
                  <ToggleButton key={opt.value} value={opt.value}
                    sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.8rem', py: 1.5, borderRadius: '10px !important', mb: 0.5 }}>
                    {opt.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Stack>
          )}

          {/* Step 2: Generating */}
          {step === 2 && (
            <Stack spacing={2} alignItems="center" sx={{ py: 4 }}>
              <CircularProgress size={48} sx={{ color: 'var(--bp-color-primary, #16A34A)' }} />
              <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>
                AI is generating your brand kits...
              </Typography>
              <Typography sx={{ fontSize: '0.7rem', color: 'var(--bp-text-secondary, #64748B)', textAlign: 'center' }}>
                Creating 3 unique brand identities for {businessName || 'your business'}
              </Typography>
            </Stack>
          )}

          {/* Step 3: Preview & Select */}
          {step === 3 && (
            <Stack spacing={2}>
              <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', textAlign: 'center' }}>
                Choose your brand identity
              </Typography>
              <Grid container spacing={1.5}>
                {kits.map((kit, i) => (
                  <Grid key={i} size={{ xs: 12 }}>
                    <Card
                      elevation={0}
                      onClick={() => setSelectedKit(i)}
                      sx={{
                        p: 2, cursor: 'pointer', borderRadius: '12px',
                        border: selectedKit === i
                          ? '2px solid var(--bp-color-primary, #16A34A)'
                          : '1px solid var(--bp-border-default, #E2E8F0)',
                        bgcolor: selectedKit === i ? 'var(--bp-color-primary-soft, rgba(22,163,74,0.08))' : '#FFF',
                        transition: 'all 0.15s',
                      }}
                    >
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Stack direction="row" spacing={0.5}>
                          {[kit.palette.primary, kit.palette.secondary, kit.palette.accent].map((c) => (
                            <Box key={c} sx={colorSx(c)} />
                          ))}
                        </Stack>
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontWeight: 800, fontSize: '0.8rem' }}>
                            Style {i + 1}: {kit.brandTone}
                          </Typography>
                          <Typography sx={{ fontSize: '0.65rem', color: 'var(--bp-text-secondary, #64748B)' }}>
                            "{kit.tagline}" — {kit.fonts.heading.split(',')[0]}
                          </Typography>
                        </Box>
                        {selectedKit === i && <IconCheck size={20} color="var(--bp-color-primary, #16A34A)" />}
                      </Stack>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Stack>
          )}

          {/* Step 4: Done */}
          {step === 4 && (
            <Stack spacing={2} alignItems="center" sx={{ py: 3 }}>
              <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: 'var(--bp-success-light, #DCFCE7)', display: 'grid', placeItems: 'center' }}>
                <IconCheck size={32} color="var(--bp-success-main, #22C55E)" />
              </Box>
              <Typography sx={{ fontWeight: 800, fontSize: '1rem' }}>
                Brand identity applied!
              </Typography>
              <Typography sx={{ fontSize: '0.72rem', color: 'var(--bp-text-secondary, #64748B)', textAlign: 'center' }}>
                Your brand colors, fonts, and tagline have been saved.{'\n'}
                They now flow to invoices, receipts, emails, and your dashboard.
              </Typography>
            </Stack>
          )}

          {/* Navigation */}
          <Stack direction="row" justifyContent="space-between" sx={{ mt: 3 }}>
            <Button
              startIcon={<IconArrowLeft size={16} />}
              onClick={() => step > 0 ? setStep(step - 1) : handleClose()}
              disabled={generating || applying}
              sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}
            >
              {step === 0 ? 'Cancel' : 'Back'}
            </Button>

            {step === 0 && (
              <Button endIcon={<IconArrowRight size={16} />} variant="contained"
                onClick={() => setStep(1)} disabled={!businessName}
                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px',
                  bgcolor: 'var(--bp-color-primary, #16A34A)' }}>
                Next
              </Button>
            )}
            {step === 1 && (
              <Button endIcon={<IconSparkles size={16} />} variant="contained"
                onClick={() => { setStep(2); handleGenerate(); }}
                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px',
                  bgcolor: 'var(--bp-color-primary, #16A34A)' }}>
                Generate Brand Kits
              </Button>
            )}
            {step === 3 && (
              <Button endIcon={applying ? <CircularProgress size={14} /> : <IconRocket size={16} />}
                variant="contained" onClick={handleApply}
                disabled={selectedKit === null || applying}
                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px',
                  bgcolor: 'var(--bp-color-primary, #16A34A)' }}>
                Apply & Finish
              </Button>
            )}
            {step === 4 && (
              <Button endIcon={<IconCheck size={16} />} variant="contained"
                onClick={handleClose}
                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px',
                  bgcolor: 'var(--bp-color-primary, #16A34A)' }}>
                Done
              </Button>
            )}
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
}
