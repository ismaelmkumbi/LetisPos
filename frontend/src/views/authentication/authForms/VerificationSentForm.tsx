import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
  keyframes,
} from '@mui/material';
import { IconMail, IconCheck, IconRefresh } from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router';
import { resendVerification, verifyAccount } from 'src/api/smartpos/auth';
import { brand } from 'src/theme/smartpos/brand';

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '10px',
    bgcolor: '#FFFFFF',
    fontSize: '1.2rem',
    height: 56,
    '& fieldset': { borderColor: brand.neutral[200] },
    '&:hover fieldset': { borderColor: brand.neutral[300] },
    '&.Mui-focused fieldset': {
      borderColor: brand.primary[500],
      borderWidth: 1.5,
    },
  },
  '& .MuiOutlinedInput-input': { py: 1.2, textAlign: 'center', letterSpacing: '0.5em' },
};

const VerificationSentForm: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { userId?: string; channel?: 'EMAIL' | 'PHONE' | 'WHATSAPP'; contact?: string } | null;

  const userId = state?.userId;
  const channel = state?.channel ?? 'EMAIL';
  const contact = state?.contact ?? '';

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [verified, setVerified] = useState(false);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleResend = useCallback(async () => {
    if (!userId || cooldown > 0) return;
    setResending(true);
    setError(null);
    try {
      await resendVerification(userId);
      setCooldown(60);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to resend. Please try again.');
    } finally {
      setResending(false);
    }
  }, [userId, cooldown]);

  const handleVerify = useCallback(async (otp: string) => {
    if (!userId || otp.length !== 6) return;
    setVerifying(true);
    setError(null);
    try {
      await verifyAccount(otp);
      setVerified(true);
      setTimeout(() => navigate('/auth/login', { state: { registered: true } }), 1500);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Invalid code. Please try again.');
      setCode('');
    } finally {
      setVerifying(false);
    }
  }, [userId, navigate]);

  const isOtpChannel = channel === 'PHONE' || channel === 'WHATSAPP';

  // Auto-submit when 6 digits entered (phone / WhatsApp)
  useEffect(() => {
    if (isOtpChannel && code.length === 6 && !verifying && !verified) {
      handleVerify(code);
    }
  }, [code, isOtpChannel, verifying, verified, handleVerify]);

  if (!userId) {
    return (
      <Alert severity="error" sx={{ borderRadius: '10px' }}>
        Missing registration information. Please try registering again.
      </Alert>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: '10px' }}>{error}</Alert>
      )}

      {verified && (
        <Alert severity="success" icon={<IconCheck size={18} />} sx={{ mb: 2.5, borderRadius: '10px' }}>
          Account verified! Redirecting to login...
        </Alert>
      )}

      {!isOtpChannel ? (
        <Stack spacing={3} alignItems="center" textAlign="center">
          <Box
            sx={{
              width: 72, height: 72, borderRadius: '50%',
              bgcolor: brand.primary[50], display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              animation: `${pulse} 2s ease-in-out infinite`,
            }}
          >
            <IconMail size={32} color={brand.primary[500]} stroke={1.5} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: brand.neutral[900] }}>
              Check your email
            </Typography>
            <Typography sx={{ mt: 0.5, fontSize: '0.82rem', color: brand.neutral[500], lineHeight: 1.5 }}>
              We sent a verification link to <strong>{contact}</strong>.
              Click the link in the email to activate your account.
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={resending ? <CircularProgress size={16} /> : <IconRefresh size={16} />}
            disabled={resending || cooldown > 0}
            onClick={handleResend}
            sx={{
              py: 1.2, px: 3, fontSize: '0.85rem', fontWeight: 600,
              textTransform: 'none', borderRadius: '10px',
              color: brand.primary[600], borderColor: brand.primary[200],
              '&:hover': { borderColor: brand.primary[400], bgcolor: brand.primary[50] },
            }}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend email'}
          </Button>
        </Stack>
      ) : (
        <Stack spacing={3} alignItems="center">
          <Box>
            <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: brand.neutral[900], textAlign: 'center' }}>
              Enter verification code
            </Typography>
            <Typography sx={{ mt: 0.5, fontSize: '0.82rem', color: brand.neutral[500], textAlign: 'center', lineHeight: 1.5 }}>
              We sent a 6-digit code to <strong>{contact}</strong>
            </Typography>
          </Box>

          <TextField
            id="otp"
            name="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            fullWidth
            value={code}
            disabled={verifying || verified}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 6);
              setCode(val);
            }}
            sx={fieldSx}
          />

          <Button
            variant="outlined"
            startIcon={resending ? <CircularProgress size={16} /> : <IconRefresh size={16} />}
            disabled={resending || cooldown > 0}
            onClick={handleResend}
            sx={{
              py: 1.2, px: 3, fontSize: '0.85rem', fontWeight: 600,
              textTransform: 'none', borderRadius: '10px',
              color: brand.primary[600], borderColor: brand.primary[200],
              '&:hover': { borderColor: brand.primary[400], bgcolor: brand.primary[50] },
            }}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
          </Button>
        </Stack>
      )}
    </Box>
  );
};

export default VerificationSentForm;
