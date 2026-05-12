import { useEffect, useState } from 'react';
import { useBlocker, useNavigate, useParams } from 'react-router';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { IconDeviceFloppy, IconTruckDelivery, IconUpload, IconX } from '@tabler/icons-react';

import {
  createPurchase,
  updatePurchase,
  receivePurchase,
  cancelPurchase,
  getPurchase,
  type CreatePurchaseBody,
  type PurchaseStatus,
} from 'src/api/smartpos/sales';
import { listProducts, getProduct, uploadProductImage } from 'src/api/smartpos/products';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
import { listSuppliers } from 'src/api/smartpos/suppliers';
import { listWarehouses, type Warehouse } from 'src/api/smartpos/inventory';
import {
  listAccounts,
  listPayments,
  recordPayment,
  type Payment,
  type PaymentMethod,
} from 'src/api/smartpos/payments';
import type { Supplier } from 'src/api/smartpos/types';

import PageHeader from 'src/components/smartpos/PageHeader';
import LineEditor, { type EditableLine } from 'src/components/smartpos/LineEditor';
import DocumentActionsBar from 'src/components/smartpos/documents/DocumentActionsBar';
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
  const [payments, setPayments] = useState<Payment[]>([]);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState('CASH');
  const [payAccountId, setPayAccountId] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [paying, setPaying] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [formDirty, setFormDirty] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const paidTotal = payments.reduce((s, p) => s + p.amount, 0);

  const isEditable = !existingStatus || existingStatus === 'DRAFT' || existingStatus === 'ORDERED';

  // Unsaved-changes guard
  const blocker = useBlocker(formDirty);
  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (!window.confirm('You have unsaved changes. Leave?')) {
        blocker.reset();
      }
    }
  }, [blocker]);

  useEffect(() => {
    listWarehouses()
      .then((w) => {
        setWarehouses(w);
        if (!warehouseId && w[0]) setWarehouseId(w[0].id);
      })
      .catch((err) => {
        console.error('Failed to load warehouses', err);
        setError('Failed to load warehouses. Check your connection and try again.');
      });
    listSuppliers({ size: 500 })
      .then((s) => setSuppliers(s.content))
      .catch((err) => {
        console.error('Failed to load suppliers', err);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      getPurchase(id),
      listPayments({ referenceType: 'PURCHASE', referenceId: id })
        .then((p) => p.content)
        .catch(() => [] as Payment[]),
    ])
      .then(([p, pmts]) => {
        setWarehouseId(p.warehouseId);
        setSupplierId(p.supplierId);
        setNotes(p.notes ?? '');
        setDiscount(p.discountTotal);
        setShipping(p.shipping);
        setPurchaseDate(p.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
        setDueDate(p.dueDate?.slice(0, 10) ?? '');
        setExistingStatus(p.status);
        setExistingRef(p.ref);
        setPayments(pmts);
        const mapped = p.lines.map((l) => ({
          productId: l.productId,
          productName: l.productName,
          productCode: l.productCode ?? undefined,
          unitPrice: l.unitPrice,
          qty: l.qty,
          taxRate: l.taxRate,
        }));
        setLines(mapped);
        // Legacy records stored productId as the name snapshot. Resolve real names.
        const toResolve = Array.from(
          new Set(mapped.filter((l) => UUID_RE.test(l.productName)).map((l) => l.productId)),
        );
        if (toResolve.length > 0) {
          Promise.all(
            toResolve.map((pid) =>
              getProduct(pid)
                .then((prod) => ({ id: pid, name: prod.name, code: prod.code }))
                .catch(() => null),
            ),
          ).then((results) => {
            const byId = new Map<string, { id: string; name: string; code?: string }>();
            for (const r of results) {
              if (r) byId.set(r.id, r);
            }
            if (byId.size === 0) return;
            setLines((prev) =>
              prev.map((l) => {
                const hit = byId.get(l.productId);
                if (!hit) return l;
                return { ...l, productName: hit.name, productCode: l.productCode ?? hit.code };
              }),
            );
          });
        }
      })
      .catch((e) => setError(e instanceof Error ? (e as Error).message : 'Failed to load purchase'))
      .finally(() => {
        setLoading(false);
        setFormDirty(false);
      });
    listAccounts()
      .then((a) => setAccounts(a.map((x) => ({ id: x.id, name: x.name }))))
      .catch(() => {});
  }, [id]);

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const tax = lines.reduce((s, l) => s + l.unitPrice * l.qty * (l.taxRate / 100), 0);
  const grand = subtotal + tax - discount + shipping;
  const balanceDue = grand - paidTotal;

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
      productName: l.productName,
      productCode: l.productCode,
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
      setFormDirty(false);
      setTimeout(() => nav('/smartpos/purchases'), 900);
    } catch (e: unknown) {
      setError(e instanceof Error ? (e as Error).message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!id || payAmount <= 0 || !payAccountId) return;
    setPaying(true);
    try {
      const pmt = await recordPayment({
        referenceType: 'PURCHASE',
        referenceId: id,
        accountId: payAccountId,
        amount: payAmount,
        method: payMethod as PaymentMethod,
        notes: payNotes || undefined,
      });
      setPayments((prev) => [...prev, pmt]);
      setBanner(`Payment of ${fmt(payAmount)} recorded successfully`);
      setPayAmount(0);
      setPayNotes('');
    } catch (e: unknown) {
      setError(e instanceof Error ? (e as Error).message : 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  const handleCancel = () => {
    if (!id) return;
    setCancelReason('');
    setCancelOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!id) return;
    setCancelOpen(false);
    setSubmitting(true);
    try {
      await cancelPurchase(id, cancelReason || undefined);
      setBanner('Purchase cancelled.');
      setTimeout(() => nav('/smartpos/purchases'), 900);
    } catch (e: unknown) {
      setError(e instanceof Error ? (e as Error).message : 'Cancel failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadProductImage(file);
      setAttachments((prev) => [...prev, url]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      // Reset so the same file can be re-selected
      e.target.value = '';
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
                    onChange={(e) => { setWarehouseId(e.target.value); setFormDirty(true); }}
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
                    openOnFocus
                    options={suppliers}
                    value={suppliers.find((s) => s.id === supplierId) || null}
                    onChange={(_, v) => { setSupplierId(v?.id ?? null); setFormDirty(true); }}
                    getOptionLabel={(s) => s.name}
                    disabled={!isEditable}
                    noOptionsText="No suppliers found — add one in Suppliers or skip"
                    renderInput={(params) => <TextField {...params} label="Supplier (optional)" />}
                    sx={{ minWidth: 260, flex: 1 }}
                  />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    size="small"
                    type="date"
                    label="Purchase date"
                    value={purchaseDate}
                    onChange={(e) => { setPurchaseDate(e.target.value); setFormDirty(true); }}
                    InputLabelProps={{ shrink: true }}
                    disabled={!isEditable}
                    sx={{ minWidth: 170 }}
                  />
                  <TextField
                    size="small"
                    type="date"
                    label="Due date"
                    value={dueDate}
                    onChange={(e) => { setDueDate(e.target.value); setFormDirty(true); }}
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
            onChange={(l) => { setLines(l); setFormDirty(true); }}
            searchProducts={searchProducts}
            priceLabel="Unit cost"
          />

          <TextField
            label="Notes"
            value={notes}
            onChange={(e) => { setNotes(e.target.value); setFormDirty(true); }}
            size="small"
            fullWidth
            multiline
            minRows={2}
            sx={{ mt: 2 }}
            disabled={!isEditable}
          />

          {/* Attachments */}
          <Card
            elevation={0}
            sx={{
              mt: 2,
              border: `1px solid ${brand.neutral[200]}`,
              borderRadius: 3,
            }}
          >
            <CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Attachments
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  variant="outlined"
                  component="label"
                  size="small"
                  startIcon={uploading ? <CircularProgress size={14} /> : <IconUpload size={14} />}
                  disabled={uploading}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
                >
                  {uploading ? 'Uploading…' : 'Upload'}
                  <input
                    type="file"
                    hidden
                    accept="image/*,.pdf"
                    onChange={handleUploadAttachment}
                  />
                </Button>
              </Stack>
              {attachments.length > 0 && (
                <Stack spacing={0.5} sx={{ mt: 1 }}>
                  {attachments.map((url, i) => (
                    <Chip
                      key={i}
                      label={url.split('/').pop() || url}
                      size="small"
                      onDelete={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                      sx={{ maxWidth: '100%', '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }}
                    />
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
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
                    onChange={(e) => { setShipping(Number(e.target.value) || 0); setFormDirty(true); }}
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
                    onChange={(e) => { setDiscount(Number(e.target.value) || 0); setFormDirty(true); }}
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
                {id && (
                  <>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Paid
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 700, color: brand.success.dark }}
                      >
                        {fmt(paidTotal)}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Balance due
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 700,
                          color: balanceDue > 0 ? brand.error.dark : brand.success.dark,
                        }}
                      >
                        {fmt(Math.max(0, balanceDue))}
                      </Typography>
                    </Stack>
                    {payments.map((p) => (
                      <Stack key={p.id} direction="row" justifyContent="space-between">
                        <Typography variant="caption" color="text.secondary">
                          {new Date(p.date).toLocaleDateString()} · {p.method}
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {fmt(p.amount)}
                        </Typography>
                      </Stack>
                    ))}
                  </>
                )}
              </Stack>

              {/* Record payment (edit mode only) */}
              {id && (
                <Box
                  sx={{
                    mt: 2,
                    p: 1.5,
                    borderRadius: '10px',
                    bgcolor: brand.neutral[50],
                    border: `1px solid ${brand.neutral[200]}`,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      color: brand.neutral[600],
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Record payment
                  </Typography>
                  <Stack spacing={1} sx={{ mt: 1 }}>
                    <TextField
                      size="small"
                      type="number"
                      label="Amount"
                      value={payAmount || ''}
                      onChange={(e) => setPayAmount(Number(e.target.value) || 0)}
                    />
                    <TextField
                      select
                      size="small"
                      label="Method"
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value)}
                    >
                      {['CASH', 'CARD', 'TRANSFER', 'MPESA', 'CHECK'].map((m) => (
                        <MenuItem key={m} value={m}>
                          {m}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      select
                      size="small"
                      label="Account"
                      value={payAccountId}
                      onChange={(e) => setPayAccountId(e.target.value)}
                    >
                      {accounts.map((a) => (
                        <MenuItem key={a.id} value={a.id}>
                          {a.name}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      size="small"
                      label="Notes"
                      value={payNotes}
                      onChange={(e) => setPayNotes(e.target.value)}
                    />
                    <Button
                      fullWidth
                      variant="contained"
                      size="small"
                      onClick={handleRecordPayment}
                      disabled={paying || payAmount <= 0 || !payAccountId}
                      startIcon={
                        paying ? <CircularProgress size={14} color="inherit" /> : undefined
                      }
                      sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px' }}
                    >
                      {paying ? 'Recording…' : 'Add payment'}
                    </Button>
                  </Stack>
                </Box>
              )}

              {isEditable && (
                <Stack spacing={1} sx={{ mt: 2 }}>
                  {id && (
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                      <DocumentActionsBar documentType="purchase-order" referenceType="purchase" referenceId={id} />
                    </Box>
                  )}
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
                  {id && (
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

      {/* Cancel Purchase Dialog */}
      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Cancel Purchase</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Reason (optional)"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            size="small"
            sx={{ mt: 1 }}
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setCancelOpen(false)}
            variant="outlined"
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Keep Editing
          </Button>
          <Button
            onClick={handleConfirmCancel}
            variant="contained"
            color="error"
            disabled={submitting}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Cancel Purchase
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
