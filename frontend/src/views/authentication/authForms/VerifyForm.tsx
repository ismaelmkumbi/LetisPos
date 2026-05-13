import React, { useEffect, useState } from 'react';
import { Box, CircularProgress, Typography, Button } from '@mui/material';
import { IconCheck, IconX } from '@tabler/icons-react';
import { useSearchParams, useNavigate, Link } from 'react-router';
import { verifyAccount } from 'src/api/smartpos/auth';
import { brand } from 'src/theme/smartpos/brand';

const VerifyForm: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing verification token. Please check your email link and try again.');
      return;
    }

    (async () => {
      try {
        await verifyAccount(token);
        setStatus('success');
        setMessage('Account verified! Redirecting to login...');
        setTimeout(() => navigate('/auth/login', { state: { registered: true } }), 2000);
      } catch (err: any) {
        setStatus('error');
        setMessage(err?.response?.data?.detail ?? 'Verification failed. The link may be invalid or expired.');
      }
    })();
  }, [token, navigate]);

  return (
    <Box sx={{ textAlign: 'center', py: 2 }}>
      {status === 'loading' && (
        <>
          <CircularProgress size={40} sx={{ color: brand.primary[500], mb: 2 }} />
          <Typography sx={{ fontSize: '0.9rem', color: brand.neutral[600] }}>
            Verifying your account...
          </Typography>
        </>
      )}

      {status === 'success' && (
        <>
          <Box sx={{
            width: 56, height: 56, borderRadius: '50%',
            bgcolor: '#E8F5E9', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            mx: 'auto', mb: 2,
          }}>
            <IconCheck size={28} color="#2E7D32" />
          </Box>
          <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: brand.neutral[900], mb: 1 }}>
            {message}
          </Typography>
        </>
      )}

      {status === 'error' && (
        <>
          <Box sx={{
            width: 56, height: 56, borderRadius: '50%',
            bgcolor: '#FFEBEE', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            mx: 'auto', mb: 2,
          }}>
            <IconX size={28} color="#C62828" />
          </Box>
          <Typography sx={{ fontSize: '0.9rem', color: brand.neutral[700], mb: 2 }}>
            {message}
          </Typography>
          <Button
            component={Link}
            to="/auth/login"
            variant="outlined"
            sx={{
              py: 1.2, px: 3, fontSize: '0.85rem', fontWeight: 600,
              textTransform: 'none', borderRadius: '10px',
            }}
          >
            Go to login
          </Button>
        </>
      )}
    </Box>
  );
};

export default VerifyForm;
