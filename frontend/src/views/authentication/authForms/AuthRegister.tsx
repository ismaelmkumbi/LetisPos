/**
 * Letis POS registration wizard.
 *
 * Light-themed two-step form with smooth step transitions,
 * mobile-friendly spacing, and refined styling.
 */
import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
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
  IconEye,
  IconEyeOff,
  IconLock,
  IconMail,
  IconUser,
} from '@tabler/icons-react';
import { Link, useNavigate } from 'react-router';

import { register } from 'src/api/smartpos/auth';
import { seedDefaultUnits } from 'src/api/smartpos/products';
import { seedDefaultCOA } from 'src/api/smartpos/accounting';
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

/* ─── Component ─────────────────────────────────────────────────────────────── */

const AuthRegister: React.FC<Props> = ({ title, subtitle, subtext }) => {
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);
  const [tenantName, setTenantName] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          { id: 1, label: 'Workspace' },
          { id: 2, label: 'Admin' },
        ].map((item) => {
          const active = step >= item.id;
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
                border: `1px solid ${active ? brand.primary[200] : brand.neutral[200]}`,
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
                  {item.id}
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

      {/* Step 1: Workspace details */}
      {step === 1 && (
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

            <Button
              type="button"
              variant="contained"
              fullWidth
              disabled={!isWorkspaceReady}
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
                  bgcolor: brand.neutral[200],
                  color: brand.neutral[400],
                },
              }}
            >
              Continue
            </Button>
          </Stack>
        </Box>
      )}

      {/* Step 2: Admin account */}
      {step === 2 && (
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
                    bgcolor: brand.neutral[200],
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
