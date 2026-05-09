/**
 * Letis POS — Forgot password form.
 *
 * Light-themed, refined. Collects email and shows an animated confirmation state.
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
import { IconArrowLeft, IconMail, IconSend } from '@tabler/icons-react';
import { Link } from 'react-router';

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

const AuthForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = email.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      setError('Please enter a valid email address.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 1200));
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Success state ── */
  if (sent) {
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
          <IconSend size={28} color={brand.success.dark} stroke={1.8} />
        </Box>
        <Typography
          sx={{
            fontSize: '1rem', fontWeight: 700, color: brand.neutral[900],
            animation: `${fadeInUp} 0.4s ease 0.15s both`,
          }}
        >
          Check your inbox
        </Typography>
        <Typography
          sx={{
            mt: 0.5,
            fontSize: '0.85rem', color: brand.neutral[500], lineHeight: 1.5,
            animation: `${fadeInUp} 0.4s ease 0.25s both`,
          }}
        >
          If an account exists for{' '}
          <Box component="span" sx={{ fontWeight: 600, color: brand.neutral[700] }}>
            {email}
          </Box>
          , you&apos;ll receive a reset link shortly.
        </Typography>
        <Button
          component={Link}
          to="/auth/login"
          variant="outlined"
          fullWidth
          startIcon={<IconArrowLeft size={16} stroke={2} />}
          sx={{
            mt: 3, py: 1.3,
            fontSize: '0.85rem', fontWeight: 600,
            textTransform: 'none', borderRadius: '10px',
            color: brand.neutral[700], borderColor: brand.neutral[200],
            animation: `${fadeInUp} 0.4s ease 0.35s both`,
            ...btnHover,
            '&:hover': { borderColor: brand.neutral[300], bgcolor: brand.neutral[50] },
          }}
        >
          Back to sign in
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
          <Typography component="label" htmlFor="reset-email" sx={labelSx}>
            Email address
          </Typography>
          <TextField
            id="reset-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            fullWidth
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
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
      </Stack>

      <Button
        type="submit"
        variant="contained"
        fullWidth
        disabled={submitting || !email}
        startIcon={
          submitting ? (
            <CircularProgress size={16} color="inherit" />
          ) : (
            <IconSend size={16} stroke={2} />
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
        {submitting ? 'Sending link…' : 'Send reset link'}
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

export default AuthForgotPassword;
