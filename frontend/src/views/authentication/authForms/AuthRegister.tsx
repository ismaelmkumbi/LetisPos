/**
 * Letis POS — Quick signup form.
 *
 * Single-page. Defaults to STARTER trial. Brand-aligned green aesthetic.
 * Horizontal 2-column field grid — compact, premium, no wasted space.
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
  keyframes,
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
import { brand } from 'src/theme/smartpos/brand';

interface Props {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  subtext?: React.ReactNode;
}

/* ── Animations ── */

const pulse = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.5; transform: scale(0.85); }
`;

/* ── Shared styles ── */

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
  fontSize: '0.7rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: brand.neutral[600],
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

/* ── Password strength ── */

function getStrength(pw: string): 0 | 1 | 2 | 3 | 4 {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s as 0 | 1 | 2 | 3 | 4;
}

const STRENGTH_COLORS = [
  brand.neutral[200],
  brand.error.main,
  brand.warning.main,
  brand.primary[400],
  brand.primary[600],
];

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];

/* ═══════════════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════════════ */

const AuthRegister: React.FC<Props> = ({ title, subtitle, subtext }) => {
  const navigate = useNavigate();

  const [tenantName, setTenantName] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTenantNameChange = (val: string) => {
    setTenantName(val);
    if (!tenantSlug || tenantSlug === slugify(tenantName)) {
      setTenantSlug(slugify(val));
    }
  };

  const strength = getStrength(password);
  const isFormReady =
    tenantName.trim().length > 1 &&
    password.length >= 8 &&
    email.trim().length > 0 && email.includes('@');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const resp = await register({
        email: email.trim().toLowerCase(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        tenantName: tenantName.trim(),
        tenantSlug: tenantSlug.trim() || undefined,
        billingPlan: 'STARTER',
        phoneNumber: phoneNumber.trim() || undefined,
      });
      navigate('/auth/verify-sent', {
        state: {
          userId: resp.userId,
          channels: resp.channels,
          contact: resp.contact,
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
          display: 'inline-flex', alignItems: 'center', gap: 0.75,
          bgcolor: brand.primary[50],
          border: `1px solid ${brand.primary[100]}`,
          color: brand.primary[700],
          px: 1.5, py: 0.65,
          borderRadius: '99px',
          fontSize: '0.68rem', fontWeight: 700,
          mb: 3,
        }}
      >
        <Box
          sx={{
            width: 7, height: 7, borderRadius: '50%',
            bgcolor: brand.primary[500],
            animation: `${pulse} 2s ease-in-out infinite`,
          }}
        />
        30-day free trial · No credit card
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: '10px' }}>
          {error}
        </Alert>
      )}

      {/* ── 2-column field grid ── */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 2,
        }}
      >
        {/* Row 1: Business name (full width) */}
        <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
          <Typography component="label" htmlFor="tenantName" sx={labelSx}>
            Business name
          </Typography>
          <TextField
            id="tenantName" name="tenantName"
            placeholder="e.g. Mwanza General Stores"
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

        {/* Row 2: Workspace URL (full width) */}
        <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
          <Typography component="label" htmlFor="tenantSlug" sx={labelSx}>
            Workspace URL
          </Typography>
          <TextField
            id="tenantSlug" name="tenantSlug"
            placeholder="mwanza-stores"
            fullWidth
            value={tenantSlug}
            onChange={(e) => setTenantSlug(slugify(e.target.value))}
            sx={fieldSx}
          />
          <Typography sx={{ fontSize: '0.66rem', color: brand.neutral[400], mt: 0.4 }}>
            {tenantSlug || 'workspace'}.letispos.app
          </Typography>
        </Box>

        {/* Row 3: First name | Last name */}
        <Box>
          <Typography component="label" htmlFor="firstName" sx={labelSx}>
            First name
          </Typography>
          <TextField
            id="firstName" name="firstName"
            placeholder="Juma"
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
        <Box>
          <Typography component="label" htmlFor="lastName" sx={labelSx}>
            Last name
          </Typography>
          <TextField
            id="lastName" name="lastName"
            placeholder="Mwangi"
            fullWidth
            value={lastName}
            autoComplete="family-name"
            onChange={(e) => setLastName(e.target.value)}
            sx={fieldSx}
          />
        </Box>

        {/* Row 4: Email (full width) — verification sent automatically to all channels */}
        <Box>
          <Typography component="label" htmlFor="email" sx={labelSx}>
            Email address
          </Typography>
          <TextField
            id="email" name="email"
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

        {/* Row 4b: Phone (optional) */}
        <Box>
          <Typography component="label" htmlFor="phone" sx={labelSx}>
            Phone number <Box component="span" sx={{ fontWeight: 400, textTransform: 'none' }}>(optional)</Box>
          </Typography>
          <TextField
            id="phone" name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+255 712 345 678"
            fullWidth
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            sx={fieldSx}
          />
        </Box>
        <Box>
          <Typography component="label" htmlFor="password" sx={labelSx}>
            Password
          </Typography>
          <TextField
            id="password" name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Min 8 characters"
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
          />
        </Box>

        {/* Strength bar spans both columns below password */}
        {password.length > 0 && (
          <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
            <Stack direction="row" spacing={0.5}>
              {[1, 2, 3, 4].map((seg) => (
                <Box
                  key={seg}
                  sx={{
                    height: 3, flex: 1, borderRadius: '3px',
                    bgcolor: strength >= seg ? STRENGTH_COLORS[strength] : brand.neutral[200],
                    transition: 'background 0.25s ease',
                  }}
                />
              ))}
            </Stack>
            <Typography
              sx={{
                fontSize: '0.65rem', mt: 0.4,
                color: strength < 2 ? brand.error.main : strength < 3 ? brand.warning.dark : brand.primary[600],
                fontWeight: 500,
              }}
            >
              {STRENGTH_LABELS[strength]}
              {password.length > 0 && password.length < 8 && ' — min 8 characters'}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Submit */}
      <Button
        type="submit"
        variant="contained"
        fullWidth
        disabled={submitting || !isFormReady}
        startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
        sx={{
          mt: 3,
          py: 1.4,
          fontSize: '0.88rem',
          fontWeight: 700,
          textTransform: 'none',
          letterSpacing: '-0.01em',
          borderRadius: '10px',
          background: `linear-gradient(135deg, ${brand.primary[500]} 0%, ${brand.primary[700]} 100%)`,
          boxShadow: `0 10px 22px -12px ${brand.primary[600]}`,
          transition: 'all 0.2s ease',
          '&:hover': {
            background: `linear-gradient(135deg, ${brand.primary[600]} 0%, ${brand.primary[800]} 100%)`,
            boxShadow: `0 12px 26px -10px ${brand.primary[700]}`,
            transform: 'translateY(-1px)',
          },
          '&:active': { transform: 'translateY(0)' },
          '&.Mui-disabled': {
            background: brand.neutral[200],
            boxShadow: 'none',
            color: brand.neutral[400],
          },
        }}
      >
        {submitting ? 'Creating account…' : 'Start free trial →'}
      </Button>

      {/* Footer */}
      <Stack direction="row" spacing={0.5} justifyContent="center" sx={{ mt: 2.5 }}>
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
