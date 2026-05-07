import { useCallback, useEffect, useState } from 'react';
import {
  Box, Button, CircularProgress, LinearProgress, Stack, Typography, keyframes,
} from '@mui/material';
import {
  IconCheck, IconCircle, IconPackage, IconPercentage, IconRulerMeasure,
} from '@tabler/icons-react';
import { Link, useNavigate } from 'react-router';
import { useSetupGate } from 'src/routes/smartpos/useSetupGate';
import { listUnits } from 'src/api/smartpos/products';
import type { Unit } from 'src/api/smartpos/types';
import { brand } from 'src/theme/smartpos/brand';

/* ─── Animations ────────────────────────────────────────────────── */

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
`;

/* ─── Step config ───────────────────────────────────────────────── */

type StepKey = 'units' | 'products' | 'tax';

const STEPS: { key: StepKey; label: string; icon: React.ReactNode; description: string }[] = [
  { key: 'units', label: 'Units of measure', icon: <IconRulerMeasure size={20} />, description: 'Review default units' },
  { key: 'products', label: 'First product', icon: <IconPackage size={20} />, description: 'Add at least one product to unlock the shop' },
  { key: 'tax', label: 'Tax rate', icon: <IconPercentage size={20} />, description: 'Set your default tax rate for sales' },
];

/* ─── Step content components ───────────────────────────────────── */

interface StepProps { onAdvance: () => void; }

/* ── Units step ── */

function UnitsStep({ onAdvance }: StepProps) {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listUnits()
      .then((u) => setUnits(u))
      .catch((err) => {
        console.error('SetupPage: failed to load units', err);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: brand.neutral[900] }}>
          Default units are ready
        </Typography>
        <Typography sx={{ mt: 0.5, fontSize: '0.85rem', color: brand.neutral[500] }}>
          These common units are pre-loaded. You can add more from Settings anytime.
        </Typography>
      </Box>

      {loading ? (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={18} sx={{ color: brand.neutral[400] }} />
          <Typography sx={{ color: brand.neutral[400], fontSize: '0.85rem' }}>Loading units…</Typography>
        </Stack>
      ) : units.length === 0 ? (
        <Typography sx={{ color: brand.neutral[500], fontSize: '0.85rem' }}>
          No units found. They'll be seeded when you register. Skip for now and add them from Settings.
        </Typography>
      ) : (
        <Stack direction="row" flexWrap="wrap" gap={0.75} useFlexGap>
          {units.map((u) => (
            <Box
              key={u.id}
              sx={{
                px: 1.5, py: 0.75,
                borderRadius: '8px',
                bgcolor: brand.primary[50],
                border: `1px solid ${brand.primary[100]}`,
                fontSize: '0.82rem', fontWeight: 600, color: brand.primary[700],
              }}
            >
              {u.name} {u.shortName ? `(${u.shortName})` : ''}
            </Box>
          ))}
        </Stack>
      )}

      <Stack direction="row" spacing={1.5}>
        <Button
          variant="outlined"
          onClick={onAdvance}
          sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}
        >
          Skip for now
        </Button>
        <Button
          variant="contained"
          onClick={onAdvance}
          sx={{
            borderRadius: '10px', textTransform: 'none', fontWeight: 700,
            background: `linear-gradient(135deg, ${brand.primary[500]} 0%, ${brand.primary[700]} 100%)`,
            '&:hover': { background: `linear-gradient(135deg, ${brand.primary[600]} 0%, ${brand.primary[800]} 100%)` },
          }}
        >
          Looks good, continue
        </Button>
      </Stack>
    </Stack>
  );
}

/* ── Products step ── */

function ProductsStep({ needsSetup, loading, onAdvance }: StepProps & { needsSetup: boolean; loading: boolean }) {
  useEffect(() => {
    if (!loading && !needsSetup) onAdvance();
  }, [loading, needsSetup, onAdvance]);

  if (loading) {
    return (
      <Stack spacing={3} alignItems="center" sx={{ py: 4 }}>
        <CircularProgress size={32} sx={{ color: brand.primary[400] }} />
        <Typography sx={{ color: brand.neutral[500], fontSize: '0.85rem' }}>
          Checking product catalog…
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: brand.neutral[900] }}>
          Add your first product
        </Typography>
        <Typography sx={{ mt: 0.5, fontSize: '0.85rem', color: brand.neutral[500] }}>
          At least one product is required before you can make sales.
        </Typography>
      </Box>

      <Button
        component={Link}
        to="/smartpos/products"
        variant="contained"
        size="large"
        sx={{
          alignSelf: 'flex-start',
          px: 3, py: 1.5,
          borderRadius: '10px',
          textTransform: 'none', fontWeight: 700,
          background: `linear-gradient(135deg, ${brand.primary[500]} 0%, ${brand.primary[700]} 100%)`,
          boxShadow: `0 8px 20px -8px ${brand.primary[600]}`,
          '&:hover': { background: `linear-gradient(135deg, ${brand.primary[600]} 0%, ${brand.primary[800]} 100%)` },
        }}
      >
        Go to product catalog
      </Button>

      <Stack direction="row" spacing={1.5} alignItems="center">
        <Typography sx={{ fontSize: '0.8rem', color: brand.neutral[400] }}>
          After adding your first product, return here and the wizard will continue automatically.
        </Typography>
        <Button
          variant="text"
          onClick={onAdvance}
          sx={{ textTransform: 'none', color: brand.neutral[500], flexShrink: 0 }}
        >
          Skip for now
        </Button>
      </Stack>
    </Stack>
  );
}

/* ── Tax step ── */

function TaxStep({ onAdvance }: StepProps) {
  return (
    <Stack spacing={3}>
      <Box>
        <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: brand.neutral[900] }}>
          Tax configuration
        </Typography>
        <Typography sx={{ mt: 0.5, fontSize: '0.85rem', color: brand.neutral[500] }}>
          A default tax rate is applied to all sales. You can change this anytime in Settings → Tax & Pricing.
        </Typography>
      </Box>

      <Box
        sx={{
          p: 2.5, borderRadius: '12px',
          bgcolor: brand.neutral[50],
          border: `1px solid ${brand.neutral[200]}`,
        }}
      >
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: brand.neutral[500], textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1 }}>
          Default rate
        </Typography>
        <Typography sx={{ fontSize: '1.5rem', fontWeight: 900, color: brand.neutral[900] }}>
          18% VAT
        </Typography>
        <Typography sx={{ fontSize: '0.8rem', color: brand.neutral[500], mt: 0.5 }}>
          Standard rate for Tanzania. Adjust in Settings → Tax & Pricing.
        </Typography>
      </Box>

      <Stack direction="row" spacing={1.5}>
        <Button
          variant="outlined"
          onClick={onAdvance}
          sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}
        >
          I'll set this later
        </Button>
        <Button
          variant="contained"
          onClick={onAdvance}
          sx={{
            borderRadius: '10px', textTransform: 'none', fontWeight: 700,
            background: `linear-gradient(135deg, ${brand.primary[500]} 0%, ${brand.primary[700]} 100%)`,
            '&:hover': { background: `linear-gradient(135deg, ${brand.primary[600]} 0%, ${brand.primary[800]} 100%)` },
          }}
        >
          Continue
        </Button>
      </Stack>
    </Stack>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */

export default function SetupPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [completed, setCompleted] = useState<Set<StepKey>>(new Set());
  const { needsSetup, loading: gateLoading } = useSetupGate();
  const nav = useNavigate();

  const allDone = !gateLoading && !needsSetup;

  const advanceStep = useCallback(() => {
    const key = STEPS[activeStep].key;
    setCompleted((prev) => new Set([...prev, key]));
    if (activeStep < STEPS.length - 1) {
      setActiveStep((s) => s + 1);
    }
  }, [activeStep]);

  const progress = (completed.size / STEPS.length) * 100;

  /* ── Already set up ── */
  if (allDone) {
    return (
      <Box sx={{ maxWidth: 560, mx: 'auto', px: 3, py: { xs: 6, sm: 10 }, textAlign: 'center' }}>
        <Box
          sx={{
            width: 80, height: 80, borderRadius: '50%',
            bgcolor: brand.success.light,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            mx: 'auto', mb: 3,
            animation: `${fadeInUp} 0.5s ease both`,
          }}
        >
          <IconCheck size={40} color={brand.success.dark} stroke={2.5} />
        </Box>
        <Typography sx={{ fontSize: '1.4rem', fontWeight: 900, color: brand.neutral[900], animation: `${fadeInUp} 0.5s ease 0.1s both` }}>
          You're all set!
        </Typography>
        <Typography sx={{ mt: 1, fontSize: '0.9rem', color: brand.neutral[500], animation: `${fadeInUp} 0.5s ease 0.2s both` }}>
          Your workspace is ready to make sales.
        </Typography>
        <Button
          variant="contained"
          size="large"
          onClick={() => nav('/smartpos/dashboard')}
          sx={{
            mt: 3, px: 4, py: 1.5,
            borderRadius: '10px', textTransform: 'none', fontWeight: 700,
            background: `linear-gradient(135deg, ${brand.primary[500]} 0%, ${brand.primary[700]} 100%)`,
            boxShadow: `0 8px 20px -8px ${brand.primary[600]}`,
            animation: `${fadeInUp} 0.5s ease 0.3s both`,
            '&:hover': { background: `linear-gradient(135deg, ${brand.primary[600]} 0%, ${brand.primary[800]} 100%)` },
          }}
        >
          Go to Dashboard
        </Button>
      </Box>
    );
  }

  /* ── Wizard ── */
  const stepProps: StepProps = { onAdvance: advanceStep };

  const renderStep = () => {
    const key = STEPS[activeStep].key;
    switch (key) {
      case 'units':
        return <UnitsStep {...stepProps} />;
      case 'products':
        return <ProductsStep {...stepProps} needsSetup={needsSetup} loading={gateLoading} />;
      case 'tax':
        return <TaxStep {...stepProps} />;
    }
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', px: { xs: 2, sm: 4 }, py: { xs: 3, sm: 5 } }}>
      {/* Progress bar */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: brand.neutral[600] }}>
            Setting up Letis POS
          </Typography>
          <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: brand.primary[600] }}>
            {Math.round(progress)}%
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 6, borderRadius: 3,
            bgcolor: brand.neutral[100],
            '& .MuiLinearProgress-bar': {
              borderRadius: 3,
              background: `linear-gradient(90deg, ${brand.primary[500]}, ${brand.primary[700]})`,
            },
          }}
        />
      </Box>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={4}>
        {/* Left: step list */}
        <Box sx={{ width: { xs: '100%', md: 230 }, flexShrink: 0 }}>
          <Stack spacing={0.5}>
            {STEPS.map((step, i) => {
              const isCurrent = i === activeStep;
              const isDone = completed.has(step.key);
              return (
                <Box
                  key={step.key}
                  onClick={() => { if (isDone) setActiveStep(i); }}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1.25,
                    px: 1.25, py: 1,
                    borderRadius: '10px',
                    cursor: isDone ? 'pointer' : 'default',
                    bgcolor: isCurrent ? brand.primary[50] : 'transparent',
                    border: isCurrent ? `1px solid ${brand.primary[100]}` : '1px solid transparent',
                    transition: 'all 0.2s ease',
                    animation: `${fadeInUp} 0.4s ease ${i * 100}ms both`,
                  }}
                >
                  <Box sx={{ mt: 0.25, color: isDone ? brand.primary[600] : isCurrent ? brand.primary[400] : brand.neutral[300] }}>
                    {isDone ? <IconCheck size={18} stroke={2.5} /> : <IconCircle size={18} />}
                  </Box>
                  <Box>
                    <Typography sx={{
                      fontSize: '0.85rem',
                      fontWeight: isCurrent ? 700 : 600,
                      color: isCurrent ? brand.primary[700] : brand.neutral[600],
                    }}>
                      {step.label}
                    </Typography>
                    <Typography sx={{ fontSize: '0.72rem', color: brand.neutral[400], mt: 0.15 }}>
                      {step.description}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </Box>

        {/* Right: step content */}
        <Box sx={{ flex: 1, minWidth: 0 }} key={activeStep}>
          <Box sx={{ animation: `${fadeInUp} 0.35s ease both` }}>
            {renderStep()}
          </Box>
        </Box>
      </Stack>
    </Box>
  );
}
