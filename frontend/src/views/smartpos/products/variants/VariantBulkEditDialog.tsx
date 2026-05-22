import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { brand } from 'src/theme/smartpos/brand';

export type BulkField = 'price' | 'cost' | 'wholesalePrice' | 'minPrice';

const FIELD_LABELS: Record<BulkField, string> = {
  price: 'Price',
  cost: 'Cost',
  wholesalePrice: 'Wholesale Price',
  minPrice: 'Minimum Price',
};

interface VariantBulkEditDialogProps {
  open: boolean;
  onClose: () => void;
  onApply: (field: BulkField, value: number) => void;
  selectedCount: number;
}

export function VariantBulkEditDialog({
  open,
  onClose,
  onApply,
  selectedCount,
}: VariantBulkEditDialogProps) {
  const [field, setField] = useState<BulkField>('price');
  const [value, setValue] = useState('');

  const handleApply = () => {
    const num = Number(value);
    if (value === '' || Number.isNaN(num)) return;
    onApply(field, num);
    setValue('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, fontSize: '1.05rem', pb: 1 }}>
        Bulk Set Values
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        <Typography variant="body2" sx={{ color: brand.neutral[500], mb: 2.5 }}>
          Apply a value to{' '}
          <strong style={{ color: brand.neutral[800] }}>{selectedCount}</strong>{' '}
          selected variant{selectedCount !== 1 ? 's' : ''}.
        </Typography>

        <Stack spacing={2.5}>
          <FormControl size="small" fullWidth>
            <InputLabel>Field</InputLabel>
            <Select
              value={field}
              label="Field"
              onChange={(e) => setField(e.target.value as BulkField)}
              sx={{ borderRadius: '10px' }}
            >
              {Object.entries(FIELD_LABELS).map(([k, label]) => (
                <MenuItem key={k} value={k}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            size="small"
            label="Value"
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0"
            fullWidth
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleApply();
            }}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button
          onClick={onClose}
          sx={{
            borderRadius: '10px',
            textTransform: 'none',
            fontWeight: 600,
            color: brand.neutral[600],
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={value === '' || Number.isNaN(Number(value))}
          onClick={handleApply}
          sx={{
            borderRadius: '10px',
            textTransform: 'none',
            fontWeight: 800,
            background: `linear-gradient(135deg, ${brand.primary[500]} 0%, ${brand.primary[700]} 100%)`,
            '&:hover': {
              background: `linear-gradient(135deg, ${brand.primary[600]} 0%, ${brand.primary[800]} 100%)`,
            },
          }}
        >
          Apply to {selectedCount}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
