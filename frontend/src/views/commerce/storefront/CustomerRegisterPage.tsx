import React, { useState } from 'react';
import { Container, Typography, TextField, Button, Box, Link, CircularProgress } from '@mui/material';
import { useParams, useNavigate } from 'react-router';
import { useStorefront } from '../../../context/CommerceContext';

const CustomerRegisterPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { register } = useStorefront();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register({ firstName, lastName, email, password });
      navigate(`/store/${slug}/account`);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs" sx={{ py: 8 }}>
      <Typography variant="h4" component="h1" textAlign="center" gutterBottom
        sx={{ fontFamily: 'var(--commerce-font-heading, inherit)' }}>
        Create Account
      </Typography>
      {error && <Typography color="error" sx={{ mb: 2, textAlign: 'center' }}>{error}</Typography>}
      <Box component="form" onSubmit={handleSubmit}>
        <TextField fullWidth label="First Name" value={firstName}
          onChange={e => setFirstName(e.target.value)} required sx={{ mb: 2 }} />
        <TextField fullWidth label="Last Name" value={lastName}
          onChange={e => setLastName(e.target.value)} required sx={{ mb: 2 }} />
        <TextField fullWidth label="Email" type="email" value={email}
          onChange={e => setEmail(e.target.value)} required sx={{ mb: 2 }} />
        <TextField fullWidth label="Password" type="password" value={password}
          onChange={e => setPassword(e.target.value)} required sx={{ mb: 3 }}
          helperText="Minimum 8 characters" />
        <Button type="submit" variant="contained" fullWidth size="large" disabled={loading}
          sx={{ bgcolor: 'var(--commerce-primary, #1976d2)', mb: 2 }}>
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Register'}
        </Button>
      </Box>
      <Typography textAlign="center">
        Already have an account?{' '}
        <Link onClick={() => navigate(`/store/${slug}/login`)} sx={{ cursor: 'pointer' }}>
          Login
        </Link>
      </Typography>
    </Container>
  );
};

export default CustomerRegisterPage;
