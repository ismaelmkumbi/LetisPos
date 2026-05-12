/**
 * Letis POS registration wizard.
 *
 * Light-themed three-step form with smooth step transitions,
 * mobile-friendly spacing, and refined styling.
 *
 * Step 1 — Choose a plan (fetched from /api/v1/billing/plans).
 * Step 2 — Workspace details.
 * Step 3 — Admin account.
 */
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  keyframes,
} from '@mui/material';
import {
  IconArrowLeft,
  IconArrowRight,
  IconBuilding,
  IconCheck,
  IconEye,
  IconEyeOff,
  IconLock,
  IconMail,
  IconUser,
} from '@tabler/icons-react';
import { Link, useNavigate, useSearchParams } from 'react-router';

import { register } from 'src/api/smartpos/auth';
import { seedDefaultUnits } from 'src/api/smartpos/products';
import { seedDefaultCOA } from 'src/api/smartpos/accounting';
import { listPlans, type PlanDefinition } from 'src/api/smartpos/billing';
import { brand } from 'src/theme/smartpos/brand';

interface Props {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  subtext?: React.ReactNode;
}

/* ─── Step transition animation ─────────────────────────────────────────────── */

const stepIn = keyframes`
  from { opacity: 0; transform: translateX(12px); }
  to   { opacity: 1; transform: translateX(0); }
`;

/* ─── Shared styles ─────────────────────────────────────────────────────────── */

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '10px',
    bgcolor: '#FFFFFF',
    fontSize: '0.875rem',
    height: { xs: 44, sm: 46 },
    '& fieldset': { borderColor: brand.neutral[200] },
    '&:hover fieldset': { borderColor: brand.neutral[300] },
    '&.Mui-focused fieldset': {
      borderColor: brand.primary[500],
      borderWidth: 1.5,
    },
  },
  '& .MuiOutlinedInput-input': { py: 1.2 },
} as const;

const labelSx = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: brand.neutral[800],
  mb: 0.6,
};

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

const CARD_GAP = { xs: 1.5, sm: 2 };

function formatTzs(amount: number): string {
  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/* ─── Component ─────────────────────────────────────────────────────────────── */

const AuthRegister: React.FC<Props> = ({ title, subtitle, subtext }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planParam = searchParams.get('plan');

  // Plans from API
  const [plans, setPlans] = useState<PlanDefinition[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);

  // Wizard state
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedPlanCode, setSelectedPlanCode] = useState<string>(
    planParam?.toUpperCase() ?? 'STARTER',
  );
  const [tenantName, setTenantName] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch plans on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listPlans();
        if (!cancelled) setPlans(data.filter((p) => p.isPublic));
      } catch {
        // Non-critical — plan param fallback still works
      } finally {
        if (!cancelled) setPlansLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // If the URL param matches a known plan code, pre-select it
  useEffect(() => {
    if (planParam && plans.length > 0) {
      const match = plans.find(
        (p) => p.code.toUpperCase() === planParam.toUpperCase(),
      );
      if (match) setSelectedPlanCode(match.code);
    }
  }, [planParam, plans]);

  const selectedPlan = plans.find((p) => p.code === selectedPlanCode);

  const isPlanReady = !!selectedPlanCode;
  const isWorkspaceReady = tenantName.trim().length > 1 && tenantSlug.trim().length > 1;
  const isAccountReady = email.trim().length > 0 && password.length >= 8;

  const handleTenantNameChange = (val: string) => {
    setTenantName(val);
    if (!tenantSlug || tenantSlug === slugify(tenantName)) {
      setTenantSlug(slugify(val));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register({
        email: email.trim().toLowerCase(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        tenantName: tenantName.trim(),
        tenantSlug: tenantSlug.trim() || undefined,
        billingPlan: selectedPlanCode || 'STARTER',
      });
      navigate('/auth/login', { state: { registered: true } });
      // Pre-seed default data in the background
      seedDefaultUnits().catch(() => {});
      seedDefaultCOA().catch(() => {});
    } catch (err) {
      type AxiosLike = { response?: { status?: number; data?: { detail?: string; title?: string } } };
      const e = err as AxiosLike;
      const status = e?.response?.status;
      const detail = e?.response?.data?.detail ?? e?.response?.data?.title;
      if (status === 409) setError(detail ?? 'An account with this email or workspace already exists');
      else setError(detail ?? 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      {title}
      {subtext}

      {error && (
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: '10px' }}>
          {error}
        </Alert>
      )}

      {/* Step indicators */}
      <Stack direction="row" spacing={1} sx={{ mb: 2.5 }}>
        {[
          { id: 1, label: 'Plan' },
          { id: 2, label: 'Workspace' },
          { id: 3, label: 'Admin' },
        ].map((item) => {
          const active = step >= item.id;
          const current = step === item.id;
          return (
            <Box
              key={item.id}
              sx={{
                flex: 1,
                minWidth: 0,
                px: 1.25,
                py: 0.85,
                borderRadius: '8px',
                bgcolor: active ? brand.primary[50] : brand.neutral[50],
                border: `1px solid ${current ? brand.primary[400] : active ? brand.primary[200] : brand.neutral[200]}`,
                transition: 'all 0.3s ease',
              }}
            >
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Box
                  sx={{
                    width: 22, height: 22,
                    borderRadius: '50%',
                    bgcolor: active ? brand.primary[600] : brand.neutral[200],
                    color: active ? '#FFFFFF' : brand.neutral[500],
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 800, flexShrink: 0,
                    transition: 'all 0.3s ease',
                  }}
                >
                  {active ? <IconCheck size={12} stroke={3} /> : item.id}
                </Box>
                <Typography
                  sx={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    letterSpacing: '0.02em',
                    textTransform: 'uppercase',
                    color: active ? brand.primary[700] : brand.neutral[400],
                    transition: 'color 0.3s ease',
                  }}
                  noWrap
                >
                  {item.label}
                </Typography>
              </Stack>
            </Box>
          );
        })}
      </Stack>

      {/* Step 1: Plan selection */}
      {step === 1 && (
        <Box sx={{ animation: `${stepIn} 0.35s ease both` }}>
          <Stack spacing={{ xs: 1.5, sm: 2 }}>
            <Box>
              <Typography sx={{ fontSize: '0.9rem', fontWeight: 800, color: brand.neutral[900] }}>
                Choose your plan
              </Typography>
              <Typography sx={{ mt: 0.25, fontSize: '0.78rem', color: brand.neutral[500], lineHeight: 1.4 }}>
                Select the plan that fits your business. You can upgrade at any time.
              </Typography>
            </Box>

            {plansLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={28} sx={{ color: brand.primary[500] }} />
              </Box>
            ) : (
              <Stack spacing={CARD_GAP}>
                {plans.map((plan) => {
                  const isSelected = selectedPlanCode === plan.code;
                  const features = plan.features
                    ? plan.features.split(',').map((f) => f.trim()).filter(Boolean)
                    : [];

                  return (
                    <Card
                      key={plan.id}
                      onClick={() => setSelectedPlanCode(plan.code)}
                      sx={{
                        borderRadius: '12px',
                        cursor: 'pointer',
                        border: `2px solid ${isSelected ? brand.primary[500] : brand.neutral[200]}`,
                        bgcolor: isSelected ? brand.primary[50] : '#FFFFFF',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          borderColor: isSelected ? brand.primary[500] : brand.primary[300],
                          boxShadow: `0 4px 16px rgba(15,23,42,0.06)`,
                        },
                      }}
                      elevation={0}
                    >
                      <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
                        <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                              <Typography
                                sx={{
                                  fontSize: '0.95rem',
                                  fontWeight: 800,
                                  color: brand.neutral[900],
                                }}
                              >
                                {plan.label}
                              </Typography>
                              {isSelected && (
                                <Box
                                  sx={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: '50%',
                                    bgcolor: brand.primary[600],
                                    color: '#FFFFFF',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                  }}
                                >
                                  <IconCheck size={12} stroke={3} />
                                </Box>
                              )}
                            </Stack>
                            {plan.description && (
                              <Typography
                                sx={{
                                  fontSize: '0.75rem',
                                  color: brand.neutral[500],
                                  mb: 1,
                                  lineHeight: 1.4,
                                }}
                              >
                                {plan.description}
                              </Typography>
                            )}
                            {features.length > 0 && (
                              <Stack spacing={0.25} sx={{ mb: 1 }}>
                                {features.slice(0, 4).map((f, i) => (
                                  <Stack key={i} direction="row" spacing={0.75} alignItems="center">
                                    <Box
                                      sx={{
                                        width: 4,
                                        height: 4,
                                        borderRadius: '50%',
                                        bgcolor: brand.primary[400],
                                        flexShrink: 0,
                                      }}
                                    />
                                    <Typography sx={{ fontSize: '0.7rem', color: brand.neutral[600] }}>
                                      {f}
                                    </Typography>
                                  </Stack>
                                ))}
                              </Stack>
                            )}
                          </Box>
                          <Box sx={{ textAlign: 'right', flexShrink: 0, ml: 2 }}>
                            <Typography
                              sx={{
                                fontSize: '1.05rem',
                                fontWeight: 800,
                                color: brand.primary[700],
                                lineHeight: 1.2,
                              }}
                            >
                              {plan.monthlyPriceTzs > 0
                                ? formatTzs(plan.monthlyPriceTzs)
                                : 'Free'}
                            </Typography>
                            <Typography sx={{ fontSize: '0.65rem', color: brand.neutral[400] }}>
                              /month
                            </Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
            )}

            <Button
              type="button"
              variant="contained"
              fullWidth
              disabled={!isPlanReady}
              endIcon={<IconArrowRight size={16} stroke={2} />}
              onClick={() => setStep(2)}
              sx={{
                mt: 0.5,
                py: 1.4,
                fontSize: '0.9rem',
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: '10px',
                background: `linear-gradient(135deg, ${brand.primary[500]} 0%, ${brand.primary[700]} 100%)`,
                boxShadow: `0 10px 22px -12px ${brand.primary[600]}`,
                transition: 'all 0.2s ease',
                '&:hover': {
                  background: `linear-gradient(135deg, ${brand.primary[600]} 0%, ${brand.primary[800]} 100%)`,
                  boxShadow: `0 12px 26px -10px ${brand.primary[700]}`,
                },
                '&.Mui-disabled': {
                  background: brand.neutral[200],
                  boxShadow: 'none',
                  color: brand.neutral[400],
                },
              }}
            >
              Continue
            </Button>
          </Stack>
        </Box>
      )}

      {/* Step 2: Workspace details */}
      {step === 2 && (
        <Box sx={{ animation: `${stepIn} 0.35s ease both` }}>
          <Stack spacing={{ xs: 1.5, sm: 2 }}>
            <Box>
              <Typography sx={{ fontSize: '0.9rem', fontWeight: 800, color: brand.neutral[900] }}>
                Workspace details
              </Typography>
              <Typography sx={{ mt: 0.25, fontSize: '0.78rem', color: brand.neutral[500], lineHeight: 1.4 }}>
                This becomes the tenant that keeps your data separated.
              </Typography>
            </Box>

            {/* Show selected plan badge */}
            {selectedPlan && (
              <Box
                sx={{
                  p: 1.25,
                  borderRadius: '10px',
                  bgcolor: brand.primary[50],
                  border: `1px solid ${brand.primary[200]}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Typography
                  sx={{
                    fontSize: '0.8rem',
                    color: brand.primary[700],
                    fontWeight: 600,
                  }}
                >
                  {selectedPlan.label} plan
                  {selectedPlan.monthlyPriceTzs > 0 && (
                    <> -- {formatTzs(selectedPlan.monthlyPriceTzs)}/month</>
                  )}
                </Typography>
              </Box>
            )}

            <Box>
              <Typography component="label" htmlFor="tenantName" sx={labelSx}>
                Business name
              </Typography>
              <TextField
                id="tenantName"
                name="tenantName"
                placeholder="Example Stores Ltd"
                fullWidth required
                value={tenantName}
                autoComplete="organization"
                onChange={(e) => handleTenantNameChange(e.target.value)}
                sx={fieldSx}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start" sx={{ color: brand.neutral[400] }}>
                      <IconBuilding size={17} stroke={1.6} />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <Box>
              <Typography component="label" htmlFor="tenantSlug" sx={labelSx}>
                Workspace slug
              </Typography>
              <TextField
                id="tenantSlug"
                name="tenantSlug"
                placeholder="acme-stores"
                fullWidth
                value={tenantSlug}
                onChange={(e) => setTenantSlug(slugify(e.target.value))}
                sx={fieldSx}
                helperText={`${tenantSlug || 'workspace'}.letispos.app`}
                FormHelperTextProps={{ sx: { fontSize: '0.7rem', color: brand.neutral[400], ml: 0.5 } }}
              />
            </Box>

            <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1.25}>
              <Button
                type="button"
                variant="outlined"
                startIcon={<IconArrowLeft size={16} stroke={2} />}
                onClick={() => setStep(1)}
                sx={{
                  py: 1.4, px: 2,
                  fontSize: '0.85rem', fontWeight: 600,
                  textTransform: 'none', borderRadius: '10px',
                  color: brand.neutral[700], borderColor: brand.neutral[200],
                  transition: 'all 0.2s ease',
                  '&:hover': { borderColor: brand.neutral[300], bgcolor: brand.neutral[50] },
                }}
              >
                Back
              </Button>

              <Button
                type="button"
                variant="contained"
                fullWidth
                disabled={!isWorkspaceReady}
                endIcon={<IconArrowRight size={16} stroke={2} />}
                onClick={() => setStep(3)}
                sx={{
                  py: 1.4,
                  fontSize: '0.9rem', fontWeight: 700,
                  textTransform: 'none', borderRadius: '10px',
                  background: `linear-gradient(135deg, ${brand.primary[500]} 0%, ${brand.primary[700]} 100%)`,
                  boxShadow: `0 10px 22px -12px ${brand.primary[600]}`,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    background: `linear-gradient(135deg, ${brand.primary[600]} 0%, ${brand.primary[800]} 100%)`,
                    boxShadow: `0 12px 26px -10px ${brand.primary[700]}`,
                  },
                  '&.Mui-disabled': {
                    background: brand.neutral[200],
                    boxShadow: 'none',
                    color: brand.neutral[400],
                  },
                }}
              >
                Continue
              </Button>
            </Stack>
          </Stack>
        </Box>
      )}

      {/* Step 3: Admin account */}
      {step === 3 && (
        <Box sx={{ animation: `${stepIn} 0.35s ease both` }}>
          <Stack spacing={{ xs: 1.5, sm: 2 }}>
            <Box>
              <Typography sx={{ fontSize: '0.9rem', fontWeight: 800, color: brand.neutral[900] }}>
                Admin account
              </Typography>
              <Typography sx={{ mt: 0.25, fontSize: '0.78rem', color: brand.neutral[500], lineHeight: 1.4 }}>
                Use the email and password you will sign in with.
              </Typography>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Box flex={1} minWidth={0}>
                <Typography component="label" htmlFor="firstName" sx={labelSx}>
                  First name
                </Typography>
                <TextField
                  id="firstName"
                  name="firstName"
                  placeholder="First name"
                  fullWidth
                  value={firstName}
                  autoComplete="given-name"
                  onChange={(e) => setFirstName(e.target.value)}
                  sx={fieldSx}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start" sx={{ color: brand.neutral[400] }}>
                        <IconUser size={17} stroke={1.6} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
              <Box flex={1} minWidth={0}>
                <Typography component="label" htmlFor="lastName" sx={labelSx}>
                  Last name
                </Typography>
                <TextField
                  id="lastName"
                  name="lastName"
                  placeholder="Last name"
                  fullWidth
                  value={lastName}
                  autoComplete="family-name"
                  onChange={(e) => setLastName(e.target.value)}
                  sx={fieldSx}
                />
              </Box>
            </Stack>

            <Box>
              <Typography component="label" htmlFor="email" sx={labelSx}>
                Email address
              </Typography>
              <TextField
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                fullWidth required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                sx={fieldSx}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start" sx={{ color: brand.neutral[400] }}>
                      <IconMail size={17} stroke={1.6} />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <Box>
              <Typography component="label" htmlFor="password" sx={labelSx}>
                Password
              </Typography>
              <TextField
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                fullWidth required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                sx={fieldSx}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start" sx={{ color: brand.neutral[400] }}>
                      <IconLock size={17} stroke={1.6} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setShowPassword((v) => !v)}
                        edge="end"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        sx={{ color: brand.neutral[400] }}
                      >
                        {showPassword ? <IconEye size={17} /> : <IconEyeOff size={17} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                helperText={password.length > 0 && password.length < 8 ? 'Password must be at least 8 characters' : undefined}
                FormHelperTextProps={{ sx: { fontSize: '0.7rem', color: brand.error.main, ml: 0.5 } }}
              />
            </Box>

            <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1.25}>
              <Button
                type="button"
                variant="outlined"
                startIcon={<IconArrowLeft size={16} stroke={2} />}
                onClick={() => setStep(2)}
                sx={{
                  py: 1.4, px: 2,
                  fontSize: '0.85rem', fontWeight: 600,
                  textTransform: 'none', borderRadius: '10px',
                  color: brand.neutral[700], borderColor: brand.neutral[200],
                  transition: 'all 0.2s ease',
                  '&:hover': { borderColor: brand.neutral[300], bgcolor: brand.neutral[50] },
                }}
              >
                Back
              </Button>

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={submitting || !isAccountReady}
                startIcon={
                  submitting ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <IconLock size={16} stroke={2} />
                  )
                }
                sx={{
                  py: 1.4,
                  fontSize: '0.9rem', fontWeight: 700,
                  textTransform: 'none', borderRadius: '10px',
                  background: `linear-gradient(135deg, ${brand.primary[500]} 0%, ${brand.primary[700]} 100%)`,
                  boxShadow: `0 10px 22px -12px ${brand.primary[600]}`,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    background: `linear-gradient(135deg, ${brand.primary[600]} 0%, ${brand.primary[800]} 100%)`,
                    boxShadow: `0 12px 26px -10px ${brand.primary[700]}`,
                  },
                  '&.Mui-disabled': {
                    background: brand.neutral[200],
                    boxShadow: 'none',
                    color: brand.neutral[400],
                  },
                }}
              >
                {submitting ? 'Creating account…' : 'Create account'}
              </Button>
            </Stack>
          </Stack>
        </Box>
      )}

      <Divider sx={{ my: { xs: 1.75, sm: 2.25 }, '&::before, &::after': { borderColor: brand.neutral[200] } }} />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0.25, sm: 0.5 }} justifyContent="center" alignItems="center">
        <Typography sx={{ fontSize: '0.8rem', color: brand.neutral[500] }}>
          Already have an account?
        </Typography>
        <Typography
          component={Link}
          to="/auth/login"
          sx={{
            fontSize: '0.8rem',
            fontWeight: 700,
            color: brand.primary[600],
            textDecoration: 'none',
            '&:hover': { color: brand.primary[700], textDecoration: 'underline' },
          }}
        >
          Sign in
        </Typography>
      </Stack>

      {subtitle}
    </Box>
  );
};

export default AuthRegister;
