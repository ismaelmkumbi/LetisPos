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
  FormControlLabel,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { IconEye, IconEyeOff, IconLock, IconMail } from '@tabler/icons-react';
import { Link, useLocation, useNavigate } from 'react-router';

import { useAuth } from 'src/context/smartpos/AuthContext';
import { brand } from 'src/theme/smartpos/brand';

interface Props {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  subtext?: React.ReactNode;
}

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
  const from =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname ??
    '/smartpos/dashboard';
  const justRegistered = (location.state as { registered?: boolean } | null)?.registered;

  const [email, setEmail] = useState<string>('');
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
      type AxiosLike = {
        response?: { status?: number; data?: { detail?: string; title?: string } };
      };
      const e = err as AxiosLike;
      const status = e?.response?.status;
      const detail = e?.response?.data?.detail ?? e?.response?.data?.title;
      if (status === 401) setError(detail ?? 'Invalid email or password');
      else if (status === 403) setError(detail ?? 'Account is locked or disabled');
      else setError(detail ?? 'Unable to sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      {title}
      {subtext}

      {justRegistered && (
        <Alert severity="success" sx={{ mb: { xs: 1.5, sm: 2.5 }, borderRadius: '10px' }}>
          Workspace created — sign in below.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: { xs: 1.5, sm: 2.5 }, borderRadius: '10px' }}>
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
          mt: { xs: 1.5, sm: 2.5 },
          py: { xs: 1.25, sm: 1.4 },
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
        {submitting ? 'Signing in…' : 'Sign in'}
      </Button>

      <Stack
        direction="row"
        spacing={0.5}
        justifyContent="center"
        sx={{ mt: { xs: 1.4, sm: 2.5 } }}
      >
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
