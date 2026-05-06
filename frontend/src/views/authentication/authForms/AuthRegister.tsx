/**
 * Letis POS registration wizard.
 * Creates a workspace tenant and the first admin account.
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
import { brand } from 'src/theme/smartpos/brand';

interface Props {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  subtext?: React.ReactNode;
}

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    bgcolor: '#FFFFFF',
    fontSize: 14.5,
    '& fieldset': { borderColor: brand.neutral[200] },
    '&:hover fieldset': { borderColor: brand.neutral[300] },
    '&.Mui-focused fieldset': { borderColor: brand.primary[600], borderWidth: 1.5 },
  },
  '& .MuiOutlinedInput-input': { py: 1.4 },
} as const;

const labelSx = {
  display: 'block',
  fontSize: 13.5,
  fontWeight: 600,
  color: brand.neutral[800],
  mb: 0.75,
};

const stepLabelSx = {
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: '0.02em',
  textTransform: 'uppercase',
} as const;

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

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
    // Auto-generate slug only if the user hasn't edited it manually
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
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Stack direction="row" spacing={1.25} sx={{ mb: 3 }}>
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
                py: 0.95,
                borderRadius: 2,
                bgcolor: active ? brand.primary[50] : brand.neutral[50],
                border: `1px solid ${active ? brand.primary[200] : brand.neutral[200]}`,
                color: active ? brand.primary[700] : brand.neutral[400],
              }}
            >
              <Stack direction="row" spacing={0.8} alignItems="center">
                <Box
                  sx={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    bgcolor: active ? brand.primary[600] : brand.neutral[200],
                    color: active ? '#FFFFFF' : brand.neutral[500],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {item.id}
                </Box>
                <Typography sx={stepLabelSx} noWrap>
                  {item.label}
                </Typography>
              </Stack>
            </Box>
          );
        })}
      </Stack>

      {step === 1 && (
        <Stack spacing={2.25}>
          <Box>
            <Typography sx={{ fontSize: 15, fontWeight: 800, color: brand.neutral[900] }}>
              Workspace details
            </Typography>
            <Typography sx={{ mt: 0.35, fontSize: 13.25, color: brand.neutral[500], lineHeight: 1.45 }}>
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
              fullWidth
              required
              value={tenantName}
              autoComplete="organization"
              onChange={(e) => handleTenantNameChange(e.target.value)}
              sx={fieldSx}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start" sx={{ color: brand.neutral[400] }}>
                    <IconBuilding size={18} stroke={1.8} />
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
              FormHelperTextProps={{ sx: { fontSize: 12, color: brand.neutral[400], ml: 0.5 } }}
            />
          </Box>

          <Button
            type="button"
            variant="contained"
            fullWidth
            disabled={!isWorkspaceReady}
            endIcon={<IconArrowRight size={18} stroke={2} />}
            onClick={() => setStep(2)}
            sx={{
              mt: 1,
              py: 1.55,
              fontSize: 15,
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 2,
              bgcolor: brand.primary[600],
              boxShadow: `0 6px 20px -8px ${brand.primary[600]}99`,
              '&:hover': {
                bgcolor: brand.primary[700],
                boxShadow: `0 8px 24px -8px ${brand.primary[700]}AA`,
              },
              '&.Mui-disabled': {
                bgcolor: brand.primary[200],
                color: '#FFFFFF',
              },
            }}
          >
            Continue
          </Button>
        </Stack>
      )}

      {step === 2 && (
        <Stack spacing={2.25}>
          <Box>
            <Typography sx={{ fontSize: 15, fontWeight: 800, color: brand.neutral[900] }}>
              Admin account
            </Typography>
            <Typography sx={{ mt: 0.35, fontSize: 13.25, color: brand.neutral[500], lineHeight: 1.45 }}>
              Use the email and password you will sign in with.
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
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
                      <IconUser size={18} stroke={1.8} />
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
              fullWidth
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={fieldSx}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start" sx={{ color: brand.neutral[400] }}>
                    <IconMail size={18} stroke={1.8} />
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
              fullWidth
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={fieldSx}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start" sx={{ color: brand.neutral[400] }}>
                    <IconLock size={18} stroke={1.8} />
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
                      {showPassword ? <IconEye size={18} /> : <IconEyeOff size={18} />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              helperText={password.length > 0 && password.length < 8 ? 'Password must be at least 8 characters' : undefined}
              FormHelperTextProps={{ sx: { fontSize: 12, color: brand.error, ml: 0.5 } }}
            />
          </Box>

          <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1.5}>
            <Button
              type="button"
              variant="outlined"
              startIcon={<IconArrowLeft size={18} stroke={2} />}
              onClick={() => setStep(1)}
              sx={{
                py: 1.55,
                px: { xs: 2, sm: 2.5 },
                fontSize: 14.5,
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: 2,
                color: brand.neutral[700],
                borderColor: brand.neutral[200],
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
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <IconLock size={18} stroke={2} />
                )
              }
              sx={{
                py: 1.55,
                fontSize: 15,
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: 2,
                bgcolor: brand.primary[600],
                boxShadow: `0 6px 20px -8px ${brand.primary[600]}99`,
                '&:hover': {
                  bgcolor: brand.primary[700],
                  boxShadow: `0 8px 24px -8px ${brand.primary[700]}AA`,
                },
                '&.Mui-disabled': {
                  bgcolor: brand.primary[200],
                  color: '#FFFFFF',
                },
              }}
            >
              {submitting ? 'Creating account…' : 'Create account'}
            </Button>
          </Stack>
        </Stack>
      )}

      <Divider sx={{ my: 2.75, '&::before, &::after': { borderColor: brand.neutral[200] } }} />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0.5, sm: 0.75 }} justifyContent="center" alignItems="center">
        <Typography sx={{ fontSize: 13.5, color: brand.neutral[500] }}>
          Already have an account?
        </Typography>
        <Typography
          component={Link}
          to="/auth/login"
          sx={{
            fontSize: 13.5,
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
