import { useState, useMemo } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  Typography,
  Chip,
} from '@mui/material';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { brand } from 'src/theme/smartpos/brand';
import type { VariantInput } from 'src/api/smartpos/products';

interface Axis {
  key: string;
  name: string;
  values: string;
}

function parseValues(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function cartesianProduct(axes: { name: string; values: string[] }[]): VariantInput[] {
  if (axes.length === 0 || axes.some((a) => a.values.length === 0)) return [];

  const result: VariantInput[] = [];
  function walk(index: number, parts: string[]) {
    if (index === axes.length) {
      result.push({
        name: parts.join(' / '),
        code: undefined,
        cost: undefined,
        price: undefined,
        wholesalePrice: undefined,
        minPrice: undefined,
        imageUrl: undefined,
      });
      return;
    }
    const axis = axes[index];
    for (const v of axis.values) {
      walk(index + 1, [...parts, `${axis.name}:${v}`]);
    }
  }
  walk(0, []);
  return result;
}

interface VariantGeneratorDialogProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (variants: VariantInput[], merge: boolean) => void;
  existingCount: number;
}

export function VariantGeneratorDialog({
  open,
  onClose,
  onGenerate,
  existingCount,
}: VariantGeneratorDialogProps) {
  const [axes, setAxes] = useState<Axis[]>([{ key: '0', name: '', values: '' }]);
  const [merge, setMerge] = useState(existingCount > 0);

  const combinations = useMemo(() => {
    const parsed = axes
      .filter((a) => a.name.trim() && a.values.trim())
      .map((a) => ({ name: a.name.trim(), values: parseValues(a.values) }));
    return cartesianProduct(parsed);
  }, [axes]);

  const count = combinations.length;
  const canGenerate = count > 0;

  const updateAxis = (key: string, field: 'name' | 'values', value: string) => {
    setAxes((prev) => prev.map((a) => (a.key === key ? { ...a, [field]: value } : a)));
  };

  const addAxis = () => {
    setAxes((prev) => [...prev, { key: String(Date.now()), name: '', values: '' }]);
  };

  const removeAxis = (key: string) => {
    setAxes((prev) => (prev.length > 1 ? prev.filter((a) => a.key !== key) : prev));
  };

  const handleGenerate = () => {
    onGenerate(combinations, merge);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, fontSize: '1.1rem', pb: 1 }}>
        Generate Variants
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        <Typography variant="body2" sx={{ color: brand.neutral[500], mb: 2.5 }}>
          Define attributes and their values. All combinations (Cartesian product) will be
          generated automatically.
        </Typography>

        <Stack spacing={2}>
          {axes.map((axis) => (
            <Stack key={axis.key} direction="row" spacing={1} alignItems="flex-start">
              <TextField
                size="small"
                label="Attribute"
                placeholder="e.g. Size"
                value={axis.name}
                onChange={(e) => updateAxis(axis.key, 'name', e.target.value)}
                sx={{
                  flex: 1,
                  '& .MuiOutlinedInput-root': { borderRadius: '10px' },
                }}
              />
              <TextField
                size="small"
                label="Values"
                placeholder="S, M, L"
                value={axis.values}
                onChange={(e) => updateAxis(axis.key, 'values', e.target.value)}
                sx={{
                  flex: 2,
                  '& .MuiOutlinedInput-root': { borderRadius: '10px' },
                }}
              />
              <IconButton
                size="small"
                onClick={() => removeAxis(axis.key)}
                disabled={axes.length <= 1}
                sx={{
                  mt: 0.5,
                  borderRadius: '8px',
                  color: brand.neutral[400],
                  '&:hover': { color: brand.error.main },
                }}
              >
                <IconTrash size={16} />
              </IconButton>
            </Stack>
          ))}
        </Stack>

        <Button
          size="small"
          startIcon={<IconPlus size={14} />}
          onClick={addAxis}
          sx={{
            mt: 1.5,
            borderRadius: '8px',
            textTransform: 'none',
            fontWeight: 600,
            color: brand.primary[600],
          }}
        >
          Add attribute
        </Button>

        {/* Preview */}
        {count > 0 && (
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{
              mt: 2.5,
              p: 2,
              borderRadius: '12px',
              bgcolor: brand.primary[50],
              border: `1px solid ${brand.primary[200]}`,
            }}
          >
            <Chip
              label={count}
              size="small"
              sx={{
                fontWeight: 800,
                bgcolor: brand.primary[600],
                color: '#fff',
                borderRadius: '8px',
                height: 24,
                minWidth: 32,
              }}
            />
            <Typography variant="body2" sx={{ fontWeight: 600, color: brand.primary[800] }}>
              {count === 1 ? 'variant will be generated' : 'variants will be generated'}
            </Typography>
          </Stack>
        )}

        {existingCount > 0 && (
          <FormControlLabel
            control={
              <Switch
                checked={merge}
                onChange={(e) => setMerge(e.target.checked)}
                size="small"
                sx={{ ml: 0.5 }}
              />
            }
            label={
              <Typography variant="body2" sx={{ fontSize: '0.8rem', color: brand.neutral[600], fontWeight: 500 }}>
                Keep existing {existingCount} variant{existingCount !== 1 ? 's' : ''} (new ones will be added)
              </Typography>
            }
            sx={{ mt: 1.5 }}
          />
        )}
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
          disabled={!canGenerate}
          onClick={handleGenerate}
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
          Generate {count > 0 ? count : ''} Variant{count !== 1 ? 's' : ''}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
