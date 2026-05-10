import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle,
  InputAdornment, Stack, Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Typography,
} from '@mui/material';
import { IconRotate } from '@tabler/icons-react';
import {
  createPurchaseReturn, getPurchase, type Purchase, type SaleLine,
} from 'src/api/smartpos/sales';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';
import { parseApiError } from 'src/utils/smartpos/apiErrors';

interface Props {
  open: boolean;
  purchase: Purchase | null;
  onClose: () => void;
  onSuccess: (refOfReturn: string) => void;
}

interface LineDraft {
  lineId: string;
  productId: string;
  variantId: string | null;
  productName: string;
  unitPrice: number;
  originalQty: number;
  qty: string;
  selected: boolean;
}

export default function IssuePurchaseReturnDialog({ open, purchase, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<LineDraft[]>([]);
  const [reason, setReason] = useState('');

  // Fetch full purchase (with lines) when the dialog opens — listPurchases returns
  // headers only on some queries, so we always re-fetch to be safe.
  useEffect(() => {
    if (!open || !purchase) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setReason('');
    getPurchase(purchase.id)
      .then((full) => {
        if (cancelled) return;
        setDrafts(full.lines.map((l: SaleLine) => ({
          lineId: l.id,
          productId: l.productId,
          variantId: l.variantId,
          productName: l.productName,
          unitPrice: l.unitPrice,
          originalQty: l.qty,
          qty: String(l.qty),
          selected: false,
        })));
      })
      .catch((e) => { if (!cancelled) setError(parseApiError(e).message || 'Failed to load purchase'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, purchase]);

  const totals = useMemo(() => {
    let total = 0;
    let count = 0;
    drafts.forEach((d) => {
      if (!d.selected) return;
      const q = Number(d.qty) || 0;
      if (q > 0) {
        total += q * d.unitPrice;
        count += 1;
      }
    });
    return { total, count };
  }, [drafts]);

  const updateDraft = (id: string, patch: Partial<LineDraft>) => {
    setDrafts((prev) => prev.map((d) => (d.lineId === id ? { ...d, ...patch } : d)));
  };

  const handleSubmit = async () => {
    if (!purchase) return;
    const payload = drafts
      .filter((d) => d.selected)
      .map((d) => {
        const q = Number(d.qty);
        return {
          productId: d.productId,
          variantId: d.variantId ?? undefined,
          productName: d.productName,
          unitPrice: d.unitPrice,
          qty: q,
        };
      })
      .filter((l) => l.qty > 0);

    if (payload.length === 0) {
      setError('Select at least one line and enter a quantity.');
      return;
    }
    // Validate qty doesn't exceed originally received qty.
    const tooMany = drafts.find(
      (d) => d.selected && Number(d.qty) > d.originalQty,
    );
    if (tooMany) {
      setError(`Cannot return more than ${tooMany.originalQty} of "${tooMany.productName}".`);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = await createPurchaseReturn(purchase.id, {
        reason: reason.trim() || undefined,
        lines: payload,
      });
      onSuccess(result.ref);
      onClose();
    } catch (e) {
      setError(parseApiError(e).message || 'Failed to create return');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconRotate size={20} color={brand.warning.dark} />
        Return to supplier
        {purchase && (
          <Typography component="span" sx={{ ml: 1, color: brand.neutral[500], fontWeight: 500, fontSize: '0.9rem' }}>
            · {purchase.ref}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Typography sx={{ py: 4, textAlign: 'center', color: brand.neutral[500] }}>
            Loading lines…
          </Typography>
        ) : drafts.length === 0 ? (
          <Typography sx={{ py: 4, textAlign: 'center', color: brand.neutral[500] }}>
            This purchase has no lines to return.
          </Typography>
        ) : (
          <>
            <Table size="small" sx={{ mb: 2 }}>
              <TableHead>
                <TableRow>
                  <TableCell width={42} />
                  <TableCell>Product</TableCell>
                  <TableCell align="right" width={110}>Unit cost</TableCell>
                  <TableCell align="right" width={150}>Qty to return</TableCell>
                  <TableCell align="right" width={130}>Line total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {drafts.map((d) => {
                  const q = Number(d.qty) || 0;
                  const lineTotal = d.selected ? q * d.unitPrice : 0;
                  return (
                    <TableRow key={d.lineId}>
                      <TableCell>
                        <Checkbox
                          checked={d.selected}
                          onChange={(e) => updateDraft(d.lineId, { selected: e.target.checked })}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                          {d.productName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
                          Received: {d.originalQty}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatMoney(d.unitPrice)}
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          size="small"
                          type="number"
                          value={d.qty}
                          disabled={!d.selected}
                          onChange={(e) => updateDraft(d.lineId, { qty: e.target.value })}
                          inputProps={{
                            min: 0,
                            max: d.originalQty,
                            step: 'any',
                            style: { textAlign: 'right' },
                          }}
                          sx={{ width: 130 }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                        {formatMoney(lineTotal)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <TextField
              label="Reason (optional)"
              fullWidth
              multiline
              minRows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Damaged on arrival, wrong item, etc."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                    <IconRotate size={16} color={brand.neutral[400]} />
                  </InputAdornment>
                ),
              }}
            />

            <Box
              sx={{
                mt: 2, p: 1.5, borderRadius: '10px',
                bgcolor: brand.warning.light,
                border: `1px solid ${brand.warning.main}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
            >
              <Stack>
                <Typography sx={{ fontWeight: 700, color: brand.warning.dark, fontSize: '0.9rem' }}>
                  {totals.count} line{totals.count === 1 ? '' : 's'} selected
                </Typography>
                <Typography variant="caption" sx={{ color: brand.warning.dark }}>
                  Stock will be removed from the warehouse on confirmation.
                </Typography>
              </Stack>
              <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: brand.warning.dark, fontVariantNumeric: 'tabular-nums' }}>
                {formatMoney(totals.total)}
              </Typography>
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button
          variant="contained"
          color="warning"
          onClick={handleSubmit}
          disabled={submitting || loading || totals.count === 0}
        >
          {submitting ? 'Issuing return…' : 'Issue return'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
