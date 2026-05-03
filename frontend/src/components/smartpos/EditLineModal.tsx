/**
 * EditLineModal — rich cart item editor for POS terminal.
 *
 * Supports: unit price, quantity, tax rate, discount (fixed/percent),
 * price tier (retail/wholesale/member), and IMEI/serial for tracked products.
 * Shows a live line-total preview as the user edits.
 *
 * Shared across all POS layouts (Modern, Classic, Compact, Sidebar, Modal).
 */
import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { IconCheck } from '@tabler/icons-react';
import type { Product } from 'src/api/smartpos/products';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';
import { premiumFieldSx } from './PosLayouts/shared';
import type { Line } from './PosLayouts/types';

const fmt = formatMoney;

export interface EditLineModalProps {
  open: boolean;
  onClose: () => void;
  line: Line;
  lineIndex: number;
  product?: Product;
  stockAvailable?: number;
  onSave: (index: number, patch: Partial<Line>) => void;
}

export default function EditLineModal({
  open, onClose, line, lineIndex, product, stockAvailable, onSave,
}: EditLineModalProps) {
  const [unitPrice, setUnitPrice] = useState(String(line.unitPrice));
  const [qty, setQty] = useState(String(line.qty));
  const [taxRate, setTaxRate] = useState(String(line.taxRate));
  const [discount, setDiscount] = useState(String(line.discount ?? ''));
  const [discountType, setDiscountType] = useState<'FIXED' | 'PERCENT'>(
    line.discountType ?? 'FIXED',
  );
  const [priceTier, setPriceTier] = useState<NonNullable<Line['priceTier']>>(
    line.priceTier ?? 'retail',
  );
  const [imei, setImei] = useState(line.imei ?? '');

  // Reset form when modal opens with a different line
  useEffect(() => {
    setUnitPrice(String(line.unitPrice));
    setQty(String(line.qty));
    setTaxRate(String(line.taxRate));
    setDiscount(String(line.discount ?? ''));
    setDiscountType(line.discountType ?? 'FIXED');
    setPriceTier(line.priceTier ?? 'retail');
    setImei(line.imei ?? '');
  }, [line, open]);

  const qtyNum = Number(qty) || 0;
  const priceNum = Number(unitPrice) || 0;
  const taxNum = Number(taxRate) || 0;
  const discNum = Number(discount) || 0;

  const lineSubtotal = priceNum * qtyNum;
  const lineTax = lineSubtotal * (taxNum / 100);
  const lineDiscount = discountType === 'PERCENT'
    ? lineSubtotal * (discNum / 100)
    : discNum;
  const lineTotal = Math.max(0, lineSubtotal + lineTax - lineDiscount);

  const stockExceeded = stockAvailable != null && qtyNum > stockAvailable;
  const belowMinPrice = product?.minPrice != null && priceNum < product.minPrice;

  const handleSave = () => {
    onSave(lineIndex, {
      unitPrice: Math.round(priceNum * 100) / 100,
      qty: Math.max(0.001, qtyNum),
      taxRate: Math.round(taxNum * 100) / 100,
      discount: discNum > 0 ? Math.round(discNum * 100) / 100 : undefined,
      discountType: discNum > 0 ? discountType : undefined,
      priceTier,
      imei: imei || undefined,
    });
    onClose();
  };

  const handleReset = () => {
    setUnitPrice(String(line.unitPrice));
    setQty(String(line.qty));
    setTaxRate(String(line.taxRate));
    setDiscount(String(line.discount ?? ''));
    setDiscountType(line.discountType ?? 'FIXED');
    setPriceTier(line.priceTier ?? 'retail');
    setImei(line.imei ?? '');
  };

  const showImei = product?.trackImei || product?.trackSerial;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      TransitionProps={{ timeout: 200 }}
      PaperProps={{
        sx: {
          borderRadius: '18px',
          overflow: 'hidden',
          bgcolor: '#fff',
        },
      }}
    >
      <DialogTitle sx={{
        fontWeight: 800,
        fontSize: '1.1rem',
        pb: 0.5,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
      }}>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1rem' }} noWrap>
            {line.productName}
          </Typography>
          {line.productCode && (
            <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 600 }}>
              SKU: {line.productCode}
            </Typography>
          )}
        </Box>
        <Chip
          label="Editing"
          size="small"
          sx={{
            fontWeight: 700,
            bgcolor: brand.primary[50],
            color: brand.primary[700],
            borderRadius: '8px',
          }}
        />
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={2.5}>
          {/* Price tier selector */}
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: brand.neutral[500], mb: 0.5, display: 'block' }}>
              Price Tier
            </Typography>
            <ToggleButtonGroup
              value={priceTier}
              exclusive
              size="small"
              fullWidth
              onChange={(_, v) => {
                if (!v) return;
                setPriceTier(v);
                const base = line.basePrice ?? line.unitPrice;
                if (v === 'retail') setUnitPrice(String(Math.round(base * 100) / 100));
                else if (v === 'wholesale') {
                  const c = line.unitCost;
                  const val = c != null && c > 0 ? c : base * 0.92;
                  setUnitPrice(String(Math.round(val * 100) / 100));
                } else {
                  setUnitPrice(String(Math.round(base * 0.97 * 100) / 100));
                }
              }}
              sx={{
                '& .MuiToggleButton-root': {
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  py: 0.8,
                },
              }}
            >
              <ToggleButton value="retail">Retail</ToggleButton>
              <ToggleButton value="wholesale">Wholesale</ToggleButton>
              <ToggleButton value="member">Member</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Unit Price + Qty row */}
          <Stack direction="row" spacing={2}>
            <TextField
              label="Unit Price"
              type="number"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              fullWidth
              size="small"
              error={belowMinPrice}
              helperText={belowMinPrice ? `Min: ${fmt(product?.minPrice ?? 0)}` : undefined}
              sx={premiumFieldSx}
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start">TSh</InputAdornment>,
                },
                htmlInput: { min: 0, step: 100 },
              }}
            />
            <TextField
              label="Quantity"
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              fullWidth
              size="small"
              error={stockExceeded}
              helperText={stockExceeded ? `Max available: ${stockAvailable}` : stockAvailable != null ? `${stockAvailable} available` : undefined}
              sx={premiumFieldSx}
              slotProps={{
                htmlInput: { min: 0.001, step: 1 },
              }}
            />
          </Stack>

          {/* Tax rate + Discount row */}
          <Stack direction="row" spacing={2}>
            <TextField
              label="Tax Rate (%)"
              type="number"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              fullWidth
              size="small"
              sx={premiumFieldSx}
              slotProps={{ htmlInput: { min: 0, max: 100, step: 0.01 } }}
            />
            <TextField
              label={discountType === 'FIXED' ? 'Discount (TZS)' : 'Discount (%)'}
              type="number"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              fullWidth
              size="small"
              sx={premiumFieldSx}
              slotProps={{ htmlInput: { min: 0, step: discountType === 'PERCENT' ? 1 : 100 } }}
              InputProps={{
                endAdornment: (
                  <ToggleButtonGroup
                    value={discountType}
                    exclusive
                    size="small"
                    onChange={(_, v) => v && setDiscountType(v)}
                    sx={{
                      '& .MuiToggleButton-root': {
                        textTransform: 'none',
                        fontWeight: 700,
                        fontSize: '0.68rem',
                        py: 0.2,
                        px: 1,
                        border: 'none',
                      },
                    }}
                  >
                    <ToggleButton value="FIXED">TZS</ToggleButton>
                    <ToggleButton value="PERCENT">%</ToggleButton>
                  </ToggleButtonGroup>
                ),
              }}
            />
          </Stack>

          {/* IMEI / Serial for tracked products */}
          {showImei && (
            <TextField
              label={product?.trackImei ? 'IMEI Number' : 'Serial Number'}
              value={imei}
              onChange={(e) => setImei(e.target.value)}
              fullWidth
              size="small"
              sx={premiumFieldSx}
            />
          )}

          {/* Live preview */}
          <Box sx={{
            p: 2,
            borderRadius: '12px',
            bgcolor: brand.primary[50],
            border: `1px solid ${brand.primary[100]}`,
          }}>
            <Typography sx={{ fontWeight: 800, fontSize: '0.72rem', color: brand.primary[600], textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1 }}>
              Line Total Preview
            </Typography>
            <Stack spacing={0.4}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" sx={{ color: brand.neutral[600], fontWeight: 600 }}>
                  {qtyNum} × {fmt(priceNum)}
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, color: brand.neutral[800] }}>
                  {fmt(lineSubtotal)}
                </Typography>
              </Stack>
              {taxNum > 0 && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" sx={{ color: brand.neutral[600], fontWeight: 600 }}>
                    Tax ({taxNum}%)
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: brand.neutral[800] }}>
                    {fmt(lineTax)}
                  </Typography>
                </Stack>
              )}
              {discNum > 0 && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" sx={{ color: brand.success.dark, fontWeight: 600 }}>
                    Discount {discountType === 'PERCENT' ? `(${discNum}%)` : `(TZS ${fmt(discNum)})`}
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: brand.success.dark }}>
                    -{fmt(lineDiscount)}
                  </Typography>
                </Stack>
              )}
              <Box sx={{ mt: 0.6, pt: 0.6, borderTop: `1px solid ${brand.primary[200]}` }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', color: brand.primary[700] }}>
                    Line Total
                  </Typography>
                  <Typography sx={{ fontWeight: 900, fontSize: '1.05rem', color: brand.primary[700] }}>
                    {fmt(lineTotal)}
                  </Typography>
                </Stack>
              </Box>
            </Stack>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1 }}>
        <Button onClick={handleReset} sx={{ textTransform: 'none', fontWeight: 700, color: brand.neutral[600] }}>
          Reset
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose} sx={{ textTransform: 'none', fontWeight: 700, color: brand.neutral[600] }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          startIcon={<IconCheck size={18} />}
          disabled={stockExceeded}
          sx={{
            textTransform: 'none',
            fontWeight: 800,
            borderRadius: '10px',
            px: 3,
          }}
        >
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
}
