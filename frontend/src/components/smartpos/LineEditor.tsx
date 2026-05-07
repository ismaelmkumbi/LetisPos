/**
 * Reusable multi-line editor for Sale / Quotation / Purchase documents.
 *
 * Consumers pass in `lines`, `onChange(lines)`, and a product resolver for
 * autocomplete. The component handles add/remove/qty/price/tax edits and
 * computes line totals on the fly. Totals are recomputed in the parent.
 */
import { useState } from 'react';
import {
  Autocomplete, Box, IconButton, InputAdornment, Stack, Table, TableBody,
  TableCell, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { IconTrash, IconPlus } from '@tabler/icons-react';
import { brand } from 'src/theme/smartpos/brand';
import type { Product } from 'src/api/smartpos/types';
import { formatMoney } from 'src/utils/smartpos/currency';

export interface EditableLine {
  productId: string;
  productName: string;
  productCode?: string;
  unitPrice: number;
  qty: number;
  taxRate: number;
  discount?: number;
}

export interface LineEditorProps {
  lines: EditableLine[];
  onChange: (lines: EditableLine[]) => void;
  /** Async product lookup — e.g. `(q) => listProducts({ search: q, size: 20 }).then(p => p.content)` */
  searchProducts: (query: string) => Promise<Product[]>;
  /** Override the label shown on the price header (e.g. "Unit cost" for purchases). */
  priceLabel?: string;
  /** When true, all inputs are disabled (readonly mode). */
  disabled?: boolean;
}

const fmt = formatMoney;

export default function LineEditor({
  lines, onChange, searchProducts, priceLabel = 'Price', disabled = false,
}: LineEditorProps) {
  const [options, setOptions] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');

  const addProduct = (p: Product) => {
    onChange([
      ...lines,
      {
        productId: p.id,
        productName: p.name,
        productCode: p.code,
        unitPrice: p.price,
        qty: 1,
        taxRate: p.taxRate,
      },
    ]);
  };

  const patch = (i: number, partial: Partial<EditableLine>) => {
    const next = lines.slice();
    next[i] = { ...next[i], ...partial };
    onChange(next);
  };

  const remove = (i: number) => onChange(lines.filter((_, idx) => idx !== i));

  const onSearchChange = (q: string) => {
    setQuery(q);
    if (q.length < 2) { setOptions([]); return; }
    setSearching(true);
    searchProducts(q)
      .then(setOptions)
      .catch((err) => {
        console.error('LineEditor: product search failed', err);
        setOptions([]);
      })
      .finally(() => setSearching(false));
  };

  const total = lines.reduce((s, l) => {
    const sub = l.unitPrice * l.qty;
    return s + sub + sub * (l.taxRate / 100);
  }, 0);

  return (
    <Box sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: 2, overflow: 'hidden' }}>
      {/* Add row */}
      <Box sx={{ p: 2, bgcolor: brand.neutral[50], borderBottom: `1px solid ${brand.neutral[200]}` }}>
        <Autocomplete<Product, false, false, false>
          size="small"
          openOnFocus
          loading={searching}
          options={options}
          filterOptions={(x) => x}
          inputValue={query}
          onInputChange={(_, v) => onSearchChange(v)}
          value={null}
          getOptionLabel={(p) => `${p.code} — ${p.name}`}
          noOptionsText={query.length < 2 ? 'Type at least 2 characters to search' : 'No products found'}
          renderOption={(props, p) => (
            <li {...props} key={p.id}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{p.name}</Typography>
                <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
                  {p.code} · {fmt(p.price)}
                </Typography>
              </Box>
            </li>
          )}
          disabled={disabled}
          onChange={(_, v) => { if (v) { addProduct(v); setQuery(''); setOptions([]); } }}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Search a product to add…"
              InputProps={{
                ...params.InputProps,
                startAdornment: (
                  <InputAdornment position="start">
                    <IconPlus size={16} color={brand.primary[500]} />
                  </InputAdornment>
                ),
              }}
            />
          )}
        />
      </Box>

      {/* Lines table */}
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 720 }}>
          <TableHead sx={{ bgcolor: brand.neutral[50] }}>
            <TableRow>
              <TableCell sx={thSx}>Product</TableCell>
              <TableCell sx={thSx} align="right" width={110}>{priceLabel}</TableCell>
              <TableCell sx={thSx} align="right" width={80}>Qty</TableCell>
              <TableCell sx={thSx} align="right" width={80}>Tax %</TableCell>
              <TableCell sx={thSx} align="right" width={120}>Line total</TableCell>
              <TableCell sx={thSx} width={40} />
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: brand.neutral[500] }}>
                  Add a product to begin
                </TableCell>
              </TableRow>
            )}
            {lines.map((l, i) => {
              const sub = l.unitPrice * l.qty;
              const tax = sub * (l.taxRate / 100);
              return (
                <TableRow key={`${l.productId}-${i}`}>
                  <TableCell>
                    <Stack>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{l.productName}</Typography>
                      {l.productCode && (
                        <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
                          {l.productCode}
                        </Typography>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <TextField
                      size="small" type="number" value={l.unitPrice}
                      onChange={(e) => patch(i, { unitPrice: Number(e.target.value) })}
                      disabled={disabled}
                      inputProps={{ style: { textAlign: 'right' } }}
                      sx={{ width: 100 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <TextField
                      size="small" type="number" value={l.qty}
                      onChange={(e) => patch(i, { qty: Math.max(0, Number(e.target.value)) })}
                      disabled={disabled}
                      inputProps={{ style: { textAlign: 'right' } }}
                      sx={{ width: 70 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <TextField
                      size="small" type="number" value={l.taxRate}
                      onChange={(e) => patch(i, { taxRate: Number(e.target.value) })}
                      disabled={disabled}
                      inputProps={{ style: { textAlign: 'right' } }}
                      sx={{ width: 70 }}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: brand.primary[700] }}>
                    {fmt(sub + tax)}
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => remove(i)} disabled={disabled} sx={{ color: disabled ? brand.neutral[300] : brand.error.main }}>
                      <IconTrash size={14} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>

      {/* Footer with running total */}
      <Box sx={{
        px: 2, py: 1.5, bgcolor: brand.neutral[50],
        borderTop: `1px solid ${brand.neutral[200]}`,
        display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2,
      }}>
        <Typography variant="caption" sx={{ color: brand.neutral[500] }}>DOC TOTAL</Typography>
        <Typography variant="h6" sx={{ fontWeight: 800, color: brand.primary[700] }}>
          {fmt(total)}
        </Typography>
      </Box>
    </Box>
  );
}

const thSx = {
  fontWeight: 700,
  color: brand.neutral[600],
  textTransform: 'uppercase',
  fontSize: 11,
  letterSpacing: '0.05em',
};
