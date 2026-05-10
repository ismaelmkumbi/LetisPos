import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, TextField, Typography, Alert, Stack } from '@mui/material';
import { Storage } from '@mui/icons-material';
import { login } from '../api/client';
import { brand } from '../theme';

const cardSx = {
  border: `1px solid ${brand.neutral[700]}`,
  borderRadius: '12px',
  bgcolor: brand.neutral[800],
  boxShadow: '0 18px 40px rgba(15,23,42,0.045)',
} as const;

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try { await login(email, password); nav('/'); } catch { setError('Invalid credentials'); } finally { setLoading(false); }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: brand.neutral[900], p: 2 }}>
      <Card elevation={0} sx={{ ...cardSx, maxWidth: 420, width: '100%', p: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{ width: 56, height: 56, borderRadius: '12px', bgcolor: `${brand.primary[600]}15`, display: 'grid', placeItems: 'center', mx: 'auto', mb: 2.5 }}>
            <Storage sx={{ color: brand.primary[600], fontSize: 26 }} />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: '-0.5px', color: brand.neutral[50], mb: 0.5 }}>
            Letis Control Center
          </Typography>
          <Typography variant="body2" sx={{ color: brand.neutral[500], fontWeight: 500, fontSize: '0.85rem' }}>
            Sign in to manage your infrastructure
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '10px', bgcolor: brand.error.light, color: brand.error.dark, fontWeight: 600, fontSize: '0.8rem' }}>{error}</Alert>}

        <form onSubmit={handleSubmit}>
          <Stack spacing={2.5}>
            <TextField
              fullWidth label="Email" value={email} onChange={e => setEmail(e.target.value)}
              required
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', '& fieldset': { borderColor: brand.neutral[700] }, '&:hover fieldset': { borderColor: brand.neutral[500] }, '&.Mui-focused fieldset': { borderColor: brand.primary[500] } }, '& .MuiInputLabel-root': { color: brand.neutral[400] }, '& .MuiInputBase-input': { color: brand.neutral[50], fontWeight: 500 } }}
            />
            <TextField
              fullWidth label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)}
              required
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', '& fieldset': { borderColor: brand.neutral[700] }, '&:hover fieldset': { borderColor: brand.neutral[500] }, '&.Mui-focused fieldset': { borderColor: brand.primary[500] } }, '& .MuiInputLabel-root': { color: brand.neutral[400] }, '& .MuiInputBase-input': { color: brand.neutral[50], fontWeight: 500 } }}
            />
            <Button
              fullWidth variant="contained" type="submit" disabled={loading}
              sx={{
                minHeight: 46, fontWeight: 800, borderRadius: '10px', textTransform: 'none',
                background: `linear-gradient(135deg, ${brand.primary[600]} 0%, ${brand.primary[700]} 100%)`,
                boxShadow: `0 12px 24px -16px ${brand.primary[800]}`,
                '&:hover': { background: `linear-gradient(135deg, ${brand.primary[700]} 0%, ${brand.primary[800]} 100%)` },
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </Stack>
        </form>
      </Card>
    </Box>
  );
}
