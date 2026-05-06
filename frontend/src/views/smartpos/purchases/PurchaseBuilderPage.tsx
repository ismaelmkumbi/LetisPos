import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { IconDeviceFloppy, IconTruckDelivery, IconX } from '@tabler/icons-react';

import {
  createPurchase,
  updatePurchase,
  receivePurchase,
  cancelPurchase,
  getPurchase,
  type CreatePurchaseBody,
  type PurchaseStatus,
} from 'src/api/smartpos/sales';
import { listProducts } from 'src/api/smartpos/products';
import { listSuppliers } from 'src/api/smartpos/suppliers';
import { listWarehouses, type Warehouse } from 'src/api/smartpos/inventory';
import type { Supplier } from 'src/api/smartpos/types';

import PageHeader from 'src/components/smartpos/PageHeader';
import LineEditor, { type EditableLine } from 'src/components/smartpos/LineEditor';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;

const STATUS_TONE: Record<PurchaseStatus, { bg: string; fg: string }> = {
  DRAFT: { bg: brand.neutral[100], fg: brand.neutral[700] },
  ORDERED: { bg: brand.info.light, fg: brand.info.dark },
  RECEIVED: { bg: brand.success.light, fg: brand.success.dark },
  CANCELLED: { bg: brand.error.light, fg: brand.error.dark },
};

export default function PurchaseBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [lines, setLines] = useState<EditableLine[]>([]);
  const [notes, setNotes] = useState('');
  const [discount, setDiscount] = useState(0);
  const [shipping, setShipping] = useState(0);
  const [dueDate, setDueDate] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [existingStatus, setExistingStatus] = useState<PurchaseStatus | null>(null);
  const [existingRef, setExistingRef] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!id);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const isEditable = !existingStatus || existingStatus === 'DRAFT' || existingStatus === 'ORDERED';

  useEffect(() => {
    Promise.all([listWarehouses(), listSuppliers({ size: 500 })])
      .then(([w, s]) => {
        setWarehouses(w);
        if (!warehouseId && w[0]) setWarehouseId(w[0].id);
        setSuppliers(s.content);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getPurchase(id)
      .then((p) => {
        setWarehouseId(p.warehouseId);
        setSupplierId(p.supplierId);
        setNotes(p.notes ?? '');
        setDiscount(p.discountTotal);
        setShipping(p.shipping);
        setPurchaseDate(p.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
        setDueDate(p.dueDate?.slice(0, 10) ?? '');
        setExistingStatus(p.status);
        setExistingRef(p.ref);
        setLines(
          p.lines.map((l) => ({
            productId: l.productId,
            productName: l.productName,
            productCode: l.productCode ?? undefined,
            unitPrice: l.unitPrice,
            qty: l.qty,
            taxRate: l.taxRate,
          })),
        );
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load purchase'))
      .finally(() => setLoading(false));
  }, [id]);

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const tax = lines.reduce((s, l) => s + l.unitPrice * l.qty * (l.taxRate / 100), 0);
  const grand = subtotal + tax - discount + shipping;

  const searchProducts = async (q: string) => (await listProducts({ search: q, size: 20 })).content;

  const buildBody = (): CreatePurchaseBody => ({
    date: purchaseDate || undefined,
    dueDate: dueDate || undefined,
    warehouseId,
    supplierId: supplierId ?? undefined,
    notes: notes || undefined,
    discount,
    shipping,
    lines: lines.map((l) => ({
      productId: l.productId,
      unitPrice: l.unitPrice,
      qty: l.qty,
      taxRate: l.taxRate,
    })),
  });

  const handleSave = async (andReceive = false) => {
    if (lines.length === 0) {
      setError('Add at least one line.');
      return;
    }
    if (!warehouseId) {
      setError('Warehouse is required.');
      return;
    }
    if (!supplierId) {
      setError('Supplier is required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body = buildBody();
      const saved = id ? await updatePurchase(id, body) : await createPurchase(body);
      if (andReceive) {
        await receivePurchase(saved.id);
        setBanner(`Purchase ${saved.ref} received — stock updated`);
      } else {
        setBanner(`Purchase ${saved.ref} ${id ? 'updated' : 'created'}`);
      }
      setTimeout(() => nav('/smartpos/purchases'), 900);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    const reason = window.prompt('Reason for cancellation (optional):');
    if (reason === null) return; // user clicked Cancel on prompt
    setSubmitting(true);
    try {
      await cancelPurchase(id, reason || undefined);
      setBanner('Purchase cancelled.');
      setTimeout(() => nav('/smartpos/purchases'), 900);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Cancel failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: brand.primary[500] }} />
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title={id ? `Purchase ${existingRef ?? ''}` : 'New purchase'}
        subtitle={
          id
            ? 'Edit order details or receive stock.'
            : 'Order from a supplier — receive to push into stock.'
        }
      />

      {existingStatus && (
        <Chip
          label={existingStatus}
          size="small"
          sx={{
            mb: 2,
            bgcolor: STATUS_TONE[existingStatus].bg,
            color: STATUS_TONE[existingStatus].fg,
            fontWeight: 700,
            borderRadius: '6px',
          }}
        />
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {banner && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {banner}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card
            elevation={0}
            sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: 3, mb: 2 }}
          >
            <CardContent>
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    select
                    size="small"
                    label="Warehouse"
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value)}
                    disabled={!isEditable}
                    sx={{ minWidth: 200 }}
                  >
                    {warehouses.map((w) => (
                      <MenuItem key={w.id} value={w.id}>
                        {w.name}
                      </MenuItem>
                    ))}
                  </TextField>

                  <Autocomplete
                    size="small"
                    options={suppliers}
                    value={suppliers.find((s) => s.id === supplierId) || null}
                    onChange={(_, v) => setSupplierId(v?.id ?? null)}
                    getOptionLabel={(s) => s.name}
                    disabled={!isEditable}
                    renderInput={(params) => <TextField {...params} label="Supplier" required />}
                    sx={{ minWidth: 260, flex: 1 }}
                  />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    size="small"
                    type="date"
                    label="Purchase date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    disabled={!isEditable}
                    sx={{ minWidth: 170 }}
                  />
                  <TextField
                    size="small"
                    type="date"
                    label="Due date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    disabled={!isEditable}
                    sx={{ minWidth: 170 }}
                    helperText={
                      supplierId && suppliers.find((s) => s.id === supplierId)?.paymentTermDays
                        ? `Terms: Net ${suppliers.find((s) => s.id === supplierId)!.paymentTermDays}d`
                        : undefined
                    }
                  />
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <LineEditor
            lines={lines}
            onChange={setLines}
            searchProducts={searchProducts}
            priceLabel="Unit cost"
          />

          <TextField
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            size="small"
            fullWidth
            multiline
            minRows={2}
            sx={{ mt: 2 }}
            disabled={!isEditable}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card
            elevation={0}
            sx={{
              border: `1px solid ${brand.neutral[200]}`,
              borderRadius: 3,
              position: { md: 'sticky' },
              top: 16,
            }}
          >
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Totals
              </Typography>
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Subtotal
                  </Typography>
                  <Typography variant="body2">{fmt(subtotal)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Tax
                  </Typography>
                  <Typography variant="body2">{fmt(tax)}</Typography>
                </Stack>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Shipping
                  </Typography>
                  <TextField
                    size="small"
                    type="number"
                    value={shipping}
                    onChange={(e) => setShipping(Number(e.target.value) || 0)}
                    disabled={!isEditable}
                    inputProps={{ style: { textAlign: 'right' } }}
                    sx={{ width: 110 }}
                  />
                </Stack>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Discount
                  </Typography>
                  <TextField
                    size="small"
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                    disabled={!isEditable}
                    inputProps={{ style: { textAlign: 'right' } }}
                    sx={{ width: 110 }}
                  />
                </Stack>
                <Divider />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>
                    Total
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: brand.primary[700] }}>
                    {fmt(grand)}
                  </Typography>
                </Stack>
              </Stack>

              {isEditable && (
                <Stack spacing={1} sx={{ mt: 3 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<IconDeviceFloppy size={16} />}
                    onClick={() => handleSave(false)}
                    disabled={submitting || lines.length === 0}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    {id ? 'Update order' : 'Save as order'}
                  </Button>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={
                      submitting ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <IconTruckDelivery size={16} />
                      )
                    }
                    onClick={() => handleSave(true)}
                    disabled={submitting || lines.length === 0}
                    sx={{
                      bgcolor: brand.accent[500],
                      '&:hover': { bgcolor: brand.accent[600] },
                      fontWeight: 700,
                      textTransform: 'none',
                    }}
                  >
                    {submitting ? 'Processing…' : 'Save & receive'}
                  </Button>
                  {id && existingStatus !== 'RECEIVED' && (
                    <Button
                      fullWidth
                      variant="text"
                      color="error"
                      startIcon={<IconX size={16} />}
                      onClick={handleCancel}
                      disabled={submitting}
                      sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                      Cancel purchase
                    </Button>
                  )}
                </Stack>
              )}

              {existingStatus === 'RECEIVED' && (
                <Alert severity="success" sx={{ mt: 2, borderRadius: '8px' }}>
                  This purchase has been received and stock was updated.
                </Alert>
              )}
              {existingStatus === 'CANCELLED' && (
                <Alert severity="error" sx={{ mt: 2, borderRadius: '8px' }}>
                  This purchase was cancelled.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
