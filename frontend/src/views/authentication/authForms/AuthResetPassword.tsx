/**
 * Letis POS — Reset password form.
 *
 * Reads token from URL query param, collects new password, calls the reset API.
 */
import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  keyframes,
} from '@mui/material';
import { IconArrowLeft, IconCheck, IconLock } from '@tabler/icons-react';
import { Link, useSearchParams } from 'react-router';

import { resetPassword } from 'src/api/smartpos/auth';
import { brand } from 'src/theme/smartpos/brand';

/* ─── Animations ────────────────────────────────────────────────────────────── */

const scaleIn = keyframes`
  from { opacity: 0; transform: scale(0.9); }
  to   { opacity: 1; transform: scale(1); }
`;

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const btnHover = {
  transition: 'all 0.2s ease',
};

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

/* ─── Component ─────────────────────────────────────────────────────────────── */

const AuthResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = password.length >= 8 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Missing reset token. Please use the link from your email.');
      return;
    }
    if (!isValid) {
      if (password.length < 8) {
        setError('Password must be at least 8 characters.');
      } else {
        setError('Passwords do not match.');
      }
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await resetPassword(token, password);
      setSuccess(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Something went wrong. Please request a new reset link.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Missing token ── */
  if (!token && !success) {
    return (
      <Box sx={{ textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: '10px' }}>
          Missing reset token. Please use the link from your password reset email.
        </Alert>
        <Button
          component={Link}
          to="/auth/forgot-password"
          variant="outlined"
          fullWidth
          startIcon={<IconArrowLeft size={16} stroke={2} />}
          sx={{
            py: 1.3,
            fontSize: '0.85rem', fontWeight: 600,
            textTransform: 'none', borderRadius: '10px',
            color: brand.neutral[700], borderColor: brand.neutral[200],
            ...btnHover,
            '&:hover': { borderColor: brand.neutral[300], bgcolor: brand.neutral[50] },
          }}
        >
          Request a new reset link
        </Button>
      </Box>
    );
  }

  /* ── Success state ── */
  if (success) {
    return (
      <Box sx={{ textAlign: 'center' }}>
        <Box
          sx={{
            width: 64, height: 64,
            borderRadius: '50%',
            bgcolor: brand.success.light,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            mx: 'auto', mb: 2.5,
            animation: `${scaleIn} 0.45s cubic-bezier(0.16, 1, 0.3, 1) both`,
          }}
        >
          <IconCheck size={28} color={brand.success.dark} stroke={2.5} />
        </Box>
        <Typography
          sx={{
            fontSize: '1rem', fontWeight: 700, color: brand.neutral[900],
            animation: `${fadeInUp} 0.4s ease 0.15s both`,
          }}
        >
          Password reset successfully
        </Typography>
        <Typography
          sx={{
            mt: 0.5,
            fontSize: '0.85rem', color: brand.neutral[500], lineHeight: 1.5,
            animation: `${fadeInUp} 0.4s ease 0.25s both`,
          }}
        >
          You can now log in with your new password.
        </Typography>
        <Button
          component={Link}
          to="/auth/login"
          variant="contained"
          fullWidth
          sx={{
            mt: 3, py: 1.4,
            fontSize: '0.9rem', fontWeight: 700,
            textTransform: 'none', borderRadius: '10px',
            background: `linear-gradient(135deg, ${brand.primary[500]} 0%, ${brand.primary[700]} 100%)`,
            boxShadow: `0 10px 22px -12px ${brand.primary[600]}`,
            animation: `${fadeInUp} 0.4s ease 0.35s both`,
            ...btnHover,
            '&:hover': {
              background: `linear-gradient(135deg, ${brand.primary[600]} 0%, ${brand.primary[800]} 100%)`,
              boxShadow: `0 12px 26px -10px ${brand.primary[700]}`,
            },
          }}
        >
          Go to sign in
        </Button>
      </Box>
    );
  }

  /* ── Form ── */
  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      {error && (
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: '10px' }}>
          {error}
        </Alert>
      )}

      <Stack spacing={{ xs: 1.5, sm: 2 }}>
        <Box>
          <Typography component="label" htmlFor="new-password" sx={labelSx}>
            New password
          </Typography>
          <TextField
            id="new-password"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Min. 8 characters"
            fullWidth
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(null);
            }}
            sx={fieldSx}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start" sx={{ color: brand.neutral[400] }}>
                  <IconLock size={17} stroke={1.6} />
                </InputAdornment>
              ),
            }}
          />
        </Box>
        <Box>
          <Typography component="label" htmlFor="confirm-password" sx={labelSx}>
            Confirm password
          </Typography>
          <TextField
            id="confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat your password"
            fullWidth
            required
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (error) setError(null);
            }}
            sx={fieldSx}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start" sx={{ color: brand.neutral[400] }}>
                  <IconLock size={17} stroke={1.6} />
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </Stack>

      <Button
        type="submit"
        variant="contained"
        fullWidth
        disabled={submitting || !password || !confirmPassword}
        startIcon={
          submitting ? (
            <CircularProgress size={16} color="inherit" />
          ) : (
            <IconCheck size={16} stroke={2} />
          )
        }
        sx={{
          mt: { xs: 2, sm: 2.5 },
          py: 1.4,
          fontSize: '0.9rem', fontWeight: 700,
          textTransform: 'none', borderRadius: '10px',
          background: `linear-gradient(135deg, ${brand.primary[500]} 0%, ${brand.primary[700]} 100%)`,
          boxShadow: `0 10px 22px -12px ${brand.primary[600]}`,
          ...btnHover,
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
        {submitting ? 'Resetting…' : 'Reset password'}
      </Button>

      <Button
        component={Link}
        to="/auth/login"
        variant="outlined"
        fullWidth
        startIcon={<IconArrowLeft size={16} stroke={2} />}
        sx={{
          mt: 1.5,
          py: 1.3,
          fontSize: '0.85rem', fontWeight: 600,
          textTransform: 'none', borderRadius: '10px',
          color: brand.neutral[700], borderColor: brand.neutral[200],
          ...btnHover,
          '&:hover': { borderColor: brand.neutral[300], bgcolor: brand.neutral[50] },
        }}
      >
        Back to sign in
      </Button>
    </Box>
  );
};

export default AuthResetPassword;
