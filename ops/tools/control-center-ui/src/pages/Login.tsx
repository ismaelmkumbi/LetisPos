import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, TextField, Typography, Alert } from '@mui/material';
import { login } from '../api/client';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await login(email, password);
      nav('/');
    } catch {
      setError('Invalid credentials');
    } finally { setLoading(false); }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#0b1120', p: 2 }}>
      <Card sx={{ maxWidth: 400, width: '100%', p: 4, borderRadius: 3, bgcolor: '#111827', border: '1px solid #1e293b' }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#e2e8f0', mb: 0.5 }}>Letis Control Center</Typography>
        <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>Sign in to manage your infrastructure</Typography>
        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
        <form onSubmit={handleSubmit}>
          <TextField fullWidth label="Email" value={email} onChange={e => setEmail(e.target.value)} sx={{ mb: 2 }} required />
          <TextField fullWidth label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} sx={{ mb: 3 }} required />
          <Button fullWidth variant="contained" type="submit" disabled={loading} sx={{ py: 1.5, fontWeight: 700, borderRadius: 2, textTransform: 'none', bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' } }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </Card>
    </Box>
  );
}
