import React, { useState } from 'react';
import { Container, Typography, TextField, Button, Box, Link, CircularProgress } from '@mui/material';
import { useParams, useNavigate } from 'react-router';
import { useStorefront } from '../../../context/CommerceContext';

const CustomerLoginPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { login } = useStorefront();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate(`/store/${slug}/account`);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs" sx={{ py: 8 }}>
      <Typography variant="h4" component="h1" textAlign="center" gutterBottom
        sx={{ fontFamily: 'var(--commerce-font-heading, inherit)' }}>
        Login
      </Typography>
      {error && <Typography color="error" sx={{ mb: 2, textAlign: 'center' }}>{error}</Typography>}
      <Box component="form" onSubmit={handleSubmit}>
        <TextField fullWidth label="Email" type="email" value={email}
          onChange={e => setEmail(e.target.value)} required sx={{ mb: 2 }} />
        <TextField fullWidth label="Password" type="password" value={password}
          onChange={e => setPassword(e.target.value)} required sx={{ mb: 3 }} />
        <Button type="submit" variant="contained" fullWidth size="large" disabled={loading}
          sx={{ bgcolor: 'var(--commerce-primary, #1976d2)', mb: 2 }}>
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Login'}
        </Button>
      </Box>
      <Typography textAlign="center">
        Don&apos;t have an account?{' '}
        <Link onClick={() => navigate(`/store/${slug}/register`)} sx={{ cursor: 'pointer' }}>
          Register
        </Link>
      </Typography>
    </Container>
  );
};

export default CustomerLoginPage;
