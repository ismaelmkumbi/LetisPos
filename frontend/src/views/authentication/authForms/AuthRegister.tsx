/**
 * Letis POS — Quick signup form.
 *
 * Single-page signup. Defaults to STARTER trial.
 * Warm Brutalism aesthetic. ~30 second completion.
 */
import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
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
import { wb } from 'src/theme/smartpos/warmBrutalism';

interface Props {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  subtext?: React.ReactNode;
}

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: wb.radius.md,
    bgcolor: wb.paper,
    fontSize: '0.875rem',
    height: { xs: 44, sm: 46 },
    '& fieldset': { borderColor: wb.border },
    '&:hover fieldset': { borderColor: wb.borderStrong },
    '&.Mui-focused fieldset': {
      borderColor: wb.greenMid,
      borderWidth: 1.5,
    },
  },
  '& .MuiOutlinedInput-input': { py: 1.2 },
} as const;

const labelSx = {
  display: 'block',
  fontSize: '0.72rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: wb.inkLight,
  mb: 0.75,
  opacity: 0.7,
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

const AuthRegister: React.FC<Props> = ({ title, subtitle, subtext }) => {
  const navigate = useNavigate();

  const [tenantName, setTenantName] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTenantNameChange = (val: string) => {
    setTenantName(val);
    if (!tenantSlug || tenantSlug === slugify(tenantName)) {
      setTenantSlug(slugify(val));
    }
  };

  const passwordStrength = ((): 0 | 1 | 2 | 3 | 4 => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score as 0 | 1 | 2 | 3 | 4;
  })();

  const strengthColors = [wb.border, wb.clay, wb.clay, wb.gold, wb.greenMid];

  const isFormReady =
    tenantName.trim().length > 1 &&
    email.trim().length > 0 &&
    password.length >= 8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { userId } = await register({
        email: email.trim().toLowerCase(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        tenantName: tenantName.trim(),
        tenantSlug: tenantSlug.trim() || undefined,
        billingPlan: 'STARTER',
        channel: 'EMAIL',
      });
      navigate('/auth/verify-sent', {
        state: {
          userId,
          channel: 'EMAIL' as const,
          contact: email.trim().toLowerCase(),
        },
      });
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

      {/* Trial badge */}
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.75,
          bgcolor: wb.greenLight,
          border: `1px solid rgba(46,125,58,0.15)`,
          color: wb.green,
          px: 1.5,
          py: 0.75,
          borderRadius: '99px',
          fontSize: '0.7rem',
          fontWeight: 600,
          mb: 3,
        }}
      >
        <Box
          sx={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            bgcolor: wb.greenMid,
            animation: 'pulse 2s ease-in-out infinite',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 1, transform: 'scale(1)' },
              '50%': { opacity: 0.5, transform: 'scale(0.85)' },
            },
          }}
        />
        30-day free trial · No credit card
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: wb.radius.md }}>
          {error}
        </Alert>
      )}

      <Stack spacing={2.5}>
        {/* Business name */}
        <Box>
          <Typography component="label" htmlFor="tenantName" sx={labelSx}>
            Business name
          </Typography>
          <TextField
            id="tenantName"
            name="tenantName"
            placeholder="e.g. Mwanza General Stores"
            fullWidth
            required
            value={tenantName}
            autoComplete="organization"
            onChange={(e) => handleTenantNameChange(e.target.value)}
            sx={fieldSx}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start" sx={{ color: wb.borderStrong }}>
                  <IconBuilding size={17} stroke={1.6} />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {/* Workspace slug */}
        <Box>
          <Typography component="label" htmlFor="tenantSlug" sx={labelSx}>
            Workspace URL
          </Typography>
          <TextField
            id="tenantSlug"
            name="tenantSlug"
            placeholder="mwanza-stores"
            fullWidth
            value={tenantSlug}
            onChange={(e) => setTenantSlug(slugify(e.target.value))}
            sx={fieldSx}
          />
          <Typography sx={{ fontSize: '0.7rem', color: wb.borderStrong, mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            Your workspace:{' '}
            <Box component="span" sx={{ fontWeight: 600, color: wb.inkLight, opacity: 0.5 }}>
              {tenantSlug || 'workspace'}.letispos.app
            </Box>
          </Typography>
        </Box>

        {/* First / Last name */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.75}>
          <Box flex={1} minWidth={0}>
            <Typography component="label" htmlFor="firstName" sx={labelSx}>
              First name
            </Typography>
            <TextField
              id="firstName"
              name="firstName"
              placeholder="Juma"
              fullWidth
              value={firstName}
              autoComplete="given-name"
              onChange={(e) => setFirstName(e.target.value)}
              sx={fieldSx}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start" sx={{ color: wb.borderStrong }}>
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
              placeholder="Mwangi"
              fullWidth
              value={lastName}
              autoComplete="family-name"
              onChange={(e) => setLastName(e.target.value)}
              sx={fieldSx}
            />
          </Box>
        </Stack>

        {/* Email */}
        <Box>
          <Typography component="label" htmlFor="email" sx={labelSx}>
            Email address
          </Typography>
          <TextField
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="jumam@example.com"
            fullWidth
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={fieldSx}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start" sx={{ color: wb.borderStrong }}>
                  <IconMail size={17} stroke={1.6} />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {/* Password + strength bar */}
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
                <InputAdornment position="start" sx={{ color: wb.borderStrong }}>
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
                    sx={{ color: wb.borderStrong }}
                  >
                    {showPassword ? <IconEye size={17} /> : <IconEyeOff size={17} />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          {password.length > 0 && (
            <Stack direction="row" spacing={0.5} sx={{ mt: 0.75 }}>
              {[1, 2, 3, 4].map((seg) => (
                <Box
                  key={seg}
                  sx={{
                    height: 3,
                    flex: 1,
                    borderRadius: '3px',
                    bgcolor: passwordStrength >= seg ? strengthColors[passwordStrength] : wb.border,
                    transition: 'background 0.2s ease',
                  }}
                />
              ))}
            </Stack>
          )}
          {password.length > 0 && password.length < 8 && (
            <Typography sx={{ fontSize: '0.7rem', color: wb.clay, mt: 0.5 }}>
              Password must be at least 8 characters
            </Typography>
          )}
        </Box>
      </Stack>

      {/* Submit */}
      <Button
        type="submit"
        variant="contained"
        fullWidth
        disabled={submitting || !isFormReady}
        startIcon={
          submitting ? (
            <CircularProgress size={16} color="inherit" />
          ) : undefined
        }
        sx={{
          mt: 3.5,
          py: 1.5,
          fontSize: '0.9rem',
          fontWeight: 600,
          textTransform: 'none',
          letterSpacing: '-0.01em',
          borderRadius: wb.radius.md,
          bgcolor: wb.ink,
          position: 'relative',
          overflow: 'hidden',
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
          },
          '&:hover': {
            bgcolor: '#2a2a24',
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 20px rgba(26,26,22,0.15)',
          },
          '&.Mui-disabled': {
            bgcolor: wb.border,
            color: wb.borderStrong,
          },
        }}
      >
        {submitting ? 'Creating account…' : 'Start free trial →'}
      </Button>

      {/* Footer */}
      <Stack
        direction="row"
        spacing={0.5}
        justifyContent="center"
        sx={{ mt: 2.5 }}
      >
        <Typography sx={{ fontSize: '0.8rem', color: wb.inkLight, opacity: 0.6 }}>
          Already have an account?
        </Typography>
        <Typography
          component={Link}
          to="/auth/login"
          sx={{
            fontSize: '0.8rem',
            fontWeight: 600,
            color: wb.greenMid,
            textDecoration: 'none',
            '&:hover': { color: wb.green },
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
