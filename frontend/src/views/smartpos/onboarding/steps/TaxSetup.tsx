import { useState } from 'react';
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import { IconPercentage } from '@tabler/icons-react';
import { brand } from 'src/theme/smartpos/brand';

interface Props {
  onComplete: () => void;
}

export default function TaxSetup({ onComplete }: Props) {
  const [taxRate, setTaxRate] = useState('18');
  const [taxName, setTaxName] = useState('VAT');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const rate = parseFloat(taxRate);
    if (Number.isNaN(rate) || rate < 0 || rate > 100) {
      setError('Please enter a valid tax rate between 0 and 100');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // TODO: wire to tax settings API when available
      // await createTaxRule({ name: taxName.trim(), rate, type: 'VAT' });
      onComplete();
    } catch {
      setError('Could not save tax settings.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <Typography sx={{ fontWeight: 800, fontSize: 18, mb: 0.5 }}>
        Set your default tax rate
      </Typography>
      <Typography sx={{ color: brand.neutral[500], fontSize: 14, mb: 3 }}>
        You can change this later and add multiple tax rules per product.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>
          {error}
        </Alert>
      )}

      <Stack spacing={2.5}>
        <TextField
          label="Tax name"
          placeholder="VAT"
          fullWidth
          value={taxName}
          onChange={(e) => setTaxName(e.target.value)}
          required
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              '& fieldset': { borderColor: brand.neutral[200] },
            },
          }}
        />
        <TextField
          label="Default tax rate (%)"
          placeholder="18"
          type="number"
          fullWidth
          value={taxRate}
          onChange={(e) => setTaxRate(e.target.value)}
          required
          InputProps={{ endAdornment: <IconPercentage size={16} color={brand.neutral[400]} /> }}
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
          disabled={!taxName.trim() || !taxRate.trim() || submitting}
          onClick={handleSubmit}
          sx={{
            py: 1.4,
            fontWeight: 700,
            textTransform: 'none',
            borderRadius: 2,
            bgcolor: brand.primary[600],
          }}
        >
          {submitting ? 'Saving...' : 'Save Tax Settings'}
        </Button>
      </Stack>
    </Box>
  );
}
