import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, TextField, Typography, Alert } from '@mui/material';
import { Storage } from '@mui/icons-material';
import { login } from '../api/client';
import { brand, darkBrand as b } from '../theme';

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
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: b.background, p: 2 }}>
      <Card sx={{ maxWidth: 420, width: '100%', p: 4, borderRadius: 3, bgcolor: b.surface }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box sx={{ width: 48, height: 48, borderRadius: 3, bgcolor: brand.primary[900], display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
            <Storage sx={{ color: brand.primary[400], fontSize: 24 }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: b.text, letterSpacing: '-0.02em' }}>Letis Control Center</Typography>
          <Typography variant="body2" sx={{ color: b.textMuted, mt: 0.5 }}>Sign in to manage your infrastructure</Typography>
        </Box>
        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2, bgcolor: brand.error.light, color: brand.error.dark }}>{error}</Alert>}
        <form onSubmit={handleSubmit}>
          <TextField fullWidth label="Email" value={email} onChange={e => setEmail(e.target.value)} sx={{ mb: 2 }} required />
          <TextField fullWidth label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} sx={{ mb: 3 }} required />
          <Button fullWidth variant="contained" type="submit" disabled={loading}
            sx={{ py: 1.5, fontWeight: 700, borderRadius: '10px', textTransform: 'none', bgcolor: brand.primary[600], '&:hover': { bgcolor: brand.primary[700] } }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </Card>
    </Box>
  );
}
