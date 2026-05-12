/**
 * Edit the components of a COMBO product.
 *
 * Mirrors the backend semantics in {@code ProductComboService.replace}:
 * the whole list is replaced in one PUT — so we let the user add/remove
 * rows freely and only persist when they click Save.
 */
import { useEffect, useState } from 'react';
import {
  Alert, Autocomplete, Box, Button, IconButton, Stack, TextField, Typography,
} from '@mui/material';
import { IconPlus, IconTrash, IconDeviceFloppy } from '@tabler/icons-react';

import {
  listComboItems, listProducts, replaceComboItems,
  type ComboItemInput, type Product,
} from 'src/api/smartpos/products';
import type { UUID } from 'src/api/smartpos/types';
import { formatMoney } from 'src/utils/smartpos/currency';
import { brand } from 'src/theme/smartpos/brand';

interface Row extends ComboItemInput {
  // Display-only — populated when we lookup the component by id.
  componentName?: string;
  componentCode?: string;
}

export interface ComboItemsEditorProps {
  productId: UUID;
}

export default function ComboItemsEditor({ productId }: ComboItemsEditorProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [info, setInfo]       = useState<string | null>(null);

  // Component picker (debounced server search).
  const [picker, setPicker] = useState('');
  const [options, setOptions] = useState<Product[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listComboItems(productId)
      .then((items) => {
        if (cancelled) return;
        setRows(items.map((i) => ({
          componentProductId: i.componentProductId,
          qty: i.qty,
          unitCost: i.unitCost ?? undefined,
          unitPrice: i.unitPrice ?? undefined,
          position: i.position,
        })));
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? (e as Error).message : 'Failed to load'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [productId]);

  // Debounced product lookup for the picker.
  useEffect(() => {
    const handle = setTimeout(() => {
      listProducts({ search: picker, size: 8 })
        .then((p) => setOptions(p.content.filter((c) => c.id !== productId)))
        .catch(() => {});
    }, 250);
    return () => clearTimeout(handle);
  }, [picker, productId]);

  const updateRow = (idx: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const removeRow = (idx: number) =>
    setRows((rs) => rs.filter((_, i) => i !== idx).map((r, i) => ({ ...r, position: i })));

  const addRow = (p: Product) => {
    if (rows.some((r) => r.componentProductId === p.id)) return;
    setRows((rs) => [
      ...rs,
      {
        componentProductId: p.id,
        qty: 1,
        unitCost: p.cost,
        unitPrice: p.price,
        position: rs.length,
        componentName: p.name,
        componentCode: p.code,
      },
    ]);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setInfo(null);
    try {
      const body: ComboItemInput[] = rows.map((r, i) => ({
        componentProductId: r.componentProductId,
        qty: r.qty,
        unitCost: r.unitCost,
        unitPrice: r.unitPrice,
        position: i,
      }));
      await replaceComboItems(productId, body);
      setInfo('Combo composition saved.');
    } catch (e: unknown) {
      setError(e instanceof Error ? (e as Error).message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Typography variant="caption">Loading components…</Typography>;

  return (
    <Stack spacing={1.5}>
      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
      {info  && <Alert severity="success" onClose={() => setInfo(null)}>{info}</Alert>}

      {rows.length === 0 && (
        <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
          No components yet — pick products to bundle below.
        </Typography>
      )}

      {rows.map((r, idx) => (
        <Stack key={r.componentProductId + ':' + idx} direction="row" spacing={1} alignItems="center">
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
              {r.componentName ?? r.componentProductId.slice(0, 8) + '…'}
            </Typography>
            {r.componentCode && (
              <Typography variant="caption" sx={{ color: brand.neutral[500] }} noWrap>
                {r.componentCode}
              </Typography>
            )}
          </Box>
          <TextField
            label="Qty" type="number" value={r.qty}
            onChange={(e) => updateRow(idx, { qty: Number(e.target.value) })}
            size="small" sx={{ width: 90 }}
          />
          <IconButton onClick={() => removeRow(idx)} size="small" aria-label="Remove component">
            <IconTrash size={18} />
          </IconButton>
        </Stack>
      ))}

      <Autocomplete
        options={options}
        value={null}
        inputValue={picker}
        onInputChange={(_, v) => setPicker(v)}
        onChange={(_, p) => { if (p) { addRow(p); setPicker(''); } }}
        getOptionLabel={(p) => `${p.code} — ${p.name}`}
        renderInput={(params) => (
          <TextField {...params} placeholder="Add component…" size="small" />
        )}
        size="small"
      />

      <Stack direction="row" justifyContent="flex-end">
        <Button
          variant="contained" size="small"
          startIcon={<IconDeviceFloppy size={16} />}
          onClick={handleSave}
          disabled={saving}
          sx={{ bgcolor: brand.accent[500], '&:hover': { bgcolor: brand.accent[600] } }}
        >
          Save composition
        </Button>
      </Stack>

      {rows.length > 0 && (
        <Box
          sx={{
            mt: 1.5,
            p: 1.5,
            borderRadius: '10px',
            bgcolor: brand.neutral[50],
            border: `1px solid ${brand.neutral[200]}`,
          }}
        >
          <Stack direction="row" justifyContent="space-between" flexWrap="wrap" useFlexGap>
            <Box>
              <Typography sx={{ fontSize: 11, color: brand.neutral[500], fontWeight: 600 }}>
                Total Component Cost
              </Typography>
              <Typography sx={{ fontWeight: 900, fontSize: 20, color: brand.neutral[800] }}>
                {formatMoney(
                  rows.reduce(
                    (sum, r) => sum + (r.unitCost ?? 0) * (r.qty ?? 0),
                    0,
                  ),
                )}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 11, color: brand.neutral[500], fontWeight: 600 }}>
                Components
              </Typography>
              <Typography sx={{ fontWeight: 900, fontSize: 20, color: brand.neutral[800] }}>
                {rows.length}
              </Typography>
            </Box>
          </Stack>
        </Box>
      )}
    </Stack>
  );
}

export { IconPlus };
