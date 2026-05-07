/**
 * Letis POS — Sign-in form.
 *
 * Light-themed, refined. Wires submit to the real backend through AuthContext.
 */
import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  IconEye,
  IconEyeOff,
  IconLock,
  IconMail,
} from '@tabler/icons-react';
import { Link, useLocation, useNavigate } from 'react-router';

import { useAuth } from 'src/context/smartpos/AuthContext';
import { brand } from 'src/theme/smartpos/brand';

interface Props {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  subtext?: React.ReactNode;
}

/** Inline Google "G" */
const GoogleG: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.3 29.2 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.7 2.9l5.7-5.7C33.6 6.3 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12.5 24 12.5c2.9 0 5.6 1.1 7.7 2.9l5.7-5.7C33.6 6.3 29 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 43.5c5 0 9.5-1.7 13-4.7l-6-5.1c-2 1.4-4.5 2.3-7 2.3-5.2 0-9.6-3.2-11.3-7.6l-6.5 5C9.5 39 16.2 43.5 24 43.5z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6 5.1c-.4.4 6.5-4.7 6.5-14.8 0-1.2-.1-2.3-.4-3.5z" />
  </svg>
);

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

const AuthLoginForm: React.FC<Props> = ({ title, subtitle, subtext }) => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/smartpos/dashboard';
  const justRegistered = (location.state as { registered?: boolean } | null)?.registered;

  const [email, setEmail] = useState<string>('admin@smartpos.local');
  const [password, setPassword] = useState<string>('');
  const [remember, setRemember] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim().toLowerCase(), password);
      navigate(from, { replace: true });
    } catch (err) {
      type AxiosLike = { response?: { status?: number; data?: { detail?: string; title?: string } } };
      const e = err as AxiosLike;
      const status = e?.response?.status;
      const detail = e?.response?.data?.detail ?? e?.response?.data?.title;
      if (status === 401)      setError(detail ?? 'Invalid email or password');
      else if (status === 403) setError(detail ?? 'Account is locked or disabled');
      else                     setError(detail ?? 'Unable to sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      {title}
      {subtext}

      {justRegistered && (
        <Alert severity="success" sx={{ mb: 2.5, borderRadius: '10px' }}>
          Workspace created — sign in below.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: '10px' }}>
          {error}
        </Alert>
      )}

      <Stack spacing={{ xs: 1.5, sm: 2 }}>
        <Box>
          <Typography component="label" htmlFor="email" sx={labelSx}>
            Email address
          </Typography>
          <TextField
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="Enter your email"
            fullWidth
            required
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
            autoComplete="current-password"
            placeholder="Enter your password"
            fullWidth
            required
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

        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <FormControlLabel
            control={
              <Checkbox
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                size="small"
                sx={{
                  color: brand.neutral[300],
                  '&.Mui-checked': { color: brand.primary[600] },
                }}
              />
            }
            label={
              <Typography sx={{ fontSize: '0.8rem', color: brand.neutral[700] }}>
                Remember me
              </Typography>
            }
          />
          <Typography
            component={Link}
            to="/auth/forgot-password"
            sx={{
              fontSize: '0.8rem',
              fontWeight: 600,
              color: brand.primary[600],
              textDecoration: 'none',
              '&:hover': { color: brand.primary[700], textDecoration: 'underline' },
            }}
          >
            Forgot password?
          </Typography>
        </Stack>
      </Stack>

      <Button
        type="submit"
        variant="contained"
        fullWidth
        disabled={submitting || !email || !password}
        startIcon={
          submitting ? (
            <CircularProgress size={16} color="inherit" />
          ) : (
            <IconLock size={16} stroke={2} />
          )
        }
        sx={{
          mt: { xs: 2, sm: 2.5 },
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
        {submitting ? 'Signing in…' : 'Sign in'}
      </Button>

      <Divider
        sx={{
          my: { xs: 1.75, sm: 2.25 },
          color: brand.neutral[400],
          fontSize: '0.75rem',
          '&::before, &::after': { borderColor: brand.neutral[200] },
        }}
      >
        or continue with
      </Divider>

      <Button
        variant="outlined"
        fullWidth
        startIcon={<GoogleG size={16} />}
        sx={{
          py: 1.3,
          fontSize: '0.85rem',
          fontWeight: 600,
          textTransform: 'none',
          borderRadius: '10px',
          color: brand.neutral[700],
          borderColor: brand.neutral[200],
          bgcolor: '#FFFFFF',
          '&:hover': {
            borderColor: brand.neutral[300],
            bgcolor: brand.neutral[50],
          },
        }}
      >
        Continue with Google
      </Button>

      <Stack direction="row" spacing={0.5} justifyContent="center" sx={{ mt: { xs: 2, sm: 2.5 } }}>
        <Typography sx={{ fontSize: '0.8rem', color: brand.neutral[500] }}>
          Don&apos;t have an account?
        </Typography>
        <Typography
          component={Link}
          to="/auth/register"
          sx={{
            fontSize: '0.8rem',
            fontWeight: 700,
            color: brand.primary[600],
            textDecoration: 'none',
            '&:hover': { color: brand.primary[700], textDecoration: 'underline' },
          }}
        >
          Create account
        </Typography>
      </Stack>

      {subtitle}
    </Box>
  );
};

export default AuthLoginForm;
