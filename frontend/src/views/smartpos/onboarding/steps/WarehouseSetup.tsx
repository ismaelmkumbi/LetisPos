import { useState, useEffect } from 'react';
import { Alert, Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import { IconBuildingWarehouse } from '@tabler/icons-react';
import { createWarehouse } from 'src/api/smartpos/inventory';
import { api } from 'src/api/smartpos/client';
import { brand } from 'src/theme/smartpos/brand';

interface Props {
  onComplete: () => void;
}

export default function WarehouseSetup({ onComplete }: Props) {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api.get('/api/v1/warehouses?size=1').then(({ data }) => {
      const list: unknown[] = data?.content ?? (Array.isArray(data) ? data : []);
      if (list.length > 0) {
        onComplete(); // Already has warehouse — skip
      }
    }).catch(() => {}).finally(() => setChecking(false));
  }, [onComplete]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await createWarehouse({ name: name.trim(), city: city.trim() || undefined });
      onComplete();
    } catch (err) {
      setError('Could not create warehouse. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress size={32} /></Box>;
  }

  return (
    <Box>
      <Typography sx={{ fontWeight: 800, fontSize: 18, mb: 0.5 }}>
        Where do you keep your stock?
      </Typography>
      <Typography sx={{ color: brand.neutral[500], fontSize: 14, mb: 3 }}>
        A warehouse can be a store, depot, or stockroom. You can add more later.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>
          {error}
        </Alert>
      )}

      <Stack spacing={2.5}>
        <TextField
          label="Warehouse name"
          placeholder="Main Store"
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              '& fieldset': { borderColor: brand.neutral[200] },
            },
          }}
        />
        <TextField
          label="City (optional)"
          placeholder="Dar es Salaam"
          fullWidth
          value={city}
          onChange={(e) => setCity(e.target.value)}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              '& fieldset': { borderColor: brand.neutral[200] },
            },
          }}
        />

        <Button
          variant="contained"
          fullWidth
          disabled={!name.trim() || submitting}
          onClick={handleSubmit}
          startIcon={<IconBuildingWarehouse size={18} />}
          sx={{
            py: 1.4,
            fontWeight: 700,
            textTransform: 'none',
            borderRadius: 2,
            bgcolor: brand.primary[600],
          }}
        >
          {submitting ? 'Creating...' : 'Create Warehouse'}
        </Button>
      </Stack>
    </Box>
  );
}
