/**
 * Sale detail — back-office sale viewer & editor.
 *
 * Designed for supermarket retail operations: instant comprehension,
 * receipt-inspired clarity, and clear action hierarchy.
 */
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  IconArrowLeft,
  IconCheck,
  IconDeviceFloppy,
  IconPrinter,
  IconReceipt,
  IconUser,
  IconBuildingWarehouse,
  IconShoppingCart,
  IconClock,
  IconTruckReturn,
  IconCopy,
  IconUpload,
} from '@tabler/icons-react';
import { Link } from 'react-router';

import {
  createSale,
  commitSale,
  getSale,
  cancelSale,
  type CreateSaleBody,
  type Sale,
} from 'src/api/smartpos/sales';
import { listProducts, getProduct } from 'src/api/smartpos/products';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
import { listCustomers } from 'src/api/smartpos/customers';
import { listWarehouses, type Warehouse } from 'src/api/smartpos/inventory';
import type { Customer } from 'src/api/smartpos/types';

import LineEditor, { type EditableLine } from 'src/components/smartpos/LineEditor';
import StatusIndicator, { type OperationalState } from 'src/components/smartpos/StatusIndicator';
import { printReceipt } from 'src/components/smartpos/Receipt';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';
import { parseApiError } from 'src/utils/smartpos/apiErrors';

const fmt = formatMoney;

const STATUS_STATE: Record<string, OperationalState> = {
  DRAFT: 'idle',
  CONFIRMED: 'active',
  CANCELLED: 'closed',
  RETURNED: 'attention',
};
const PAYMENT_STATE: Record<string, OperationalState> = {
  UNPAID: 'critical',
  PARTIAL: 'attention',
  PAID: 'active',
  REFUNDED: 'closed',
};

export default function SaleBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [sale, setSale] = useState<Sale | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [lines, setLines] = useState<EditableLine[]>([]);
  const [notes, setNotes] = useState('');
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(!!id);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStockError, setIsStockError] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const isReadonly = sale?.status === 'CANCELLED' || sale?.status === 'RETURNED';

  // Bootstrap
  useEffect(() => {
    Promise.all([listWarehouses(), listCustomers({ size: 200 })])
      .then(([w, c]) => {
        setWarehouses(w);
        setCustomers(c.content);
      })
      .catch(() => {});
  }, []);

  // Load sale in edit mode
  useEffect(() => {
    if (!id) {
      // New sale: set first warehouse as default
      if (!warehouseId && warehouses.length > 0) setWarehouseId(warehouses[0].id);
      return;
    }
    setLoading(true);
    getSale(id)
      .then((s) => {
        setSale(s);
        setWarehouseId(s.warehouseId);
        setCustomerId(s.customerId);
        setNotes(s.notes ?? '');
        setDiscount(s.discountTotal);
        const mapped = s.lines.map((l) => ({
          productId: l.productId,
          productName: l.productName,
          productCode: l.productCode ?? undefined,
          unitPrice: l.unitPrice,
          qty: l.qty,
          taxRate: l.taxRate,
        }));
        setLines(mapped);
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
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load sale'))
      .finally(() => setLoading(false));
  }, [id, warehouseId, warehouses]);

  // Auto-set warehouse for new sales
  useEffect(() => {
    if (!id && !warehouseId && warehouses.length > 0) {
      setWarehouseId(warehouses[0].id);
    }
  }, [id, warehouseId, warehouses]);

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const tax = lines.reduce((s, l) => s + l.unitPrice * l.qty * (l.taxRate / 100), 0);
  const grand = subtotal + tax - discount;

  const searchProducts = async (q: string) => (await listProducts({ search: q, size: 20 })).content;

  const handleSave = async (andCommit = false) => {
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
      const body: CreateSaleBody = {
        warehouseId,
        customerId: customerId || undefined,
        notes: notes || undefined,
        discount,
        lines: lines.map((l) => ({
          productId: l.productId,
          productName: l.productName,
          productCode: l.productCode,
          unitPrice: l.unitPrice,
          qty: l.qty,
          taxRate: l.taxRate,
        })),
      };
      const saved = await createSale(body);
      if (andCommit) {
        await commitSale(saved.id);
        setBanner(`Sale ${saved.ref} confirmed`);
      } else {
        setBanner(`Draft ${saved.ref} saved`);
      }
      setTimeout(() => nav(`/smartpos/sales`), 900);
    } catch (e: unknown) {
      const { message, isStockIssue } = parseApiError(e);
      setError(message);
      setIsStockError(isStockIssue);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!sale || !window.confirm(`Cancel sale ${sale.ref}?`)) return;
    try {
      await cancelSale(sale.id);
      setBanner(`Sale ${sale.ref} cancelled`);
      setTimeout(() => nav(`/smartpos/sales`), 900);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Cancel failed');
    }
  };

  const handlePrint = () => {
    if (sale) printReceipt(sale);
  };

  const customer = customers.find((c) => c.id === customerId) ?? null;
  const warehouse = warehouses.find((w) => w.id === warehouseId) ?? null;
  const lineCount = lines.length;
  const itemCount = lines.reduce((s, l) => s + l.qty, 0);

  // ── Loading ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 12 }}>
        <CircularProgress size={32} sx={{ color: brand.primary[500] }} />
      </Box>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto' }}>
      {/* ═══ Banner ═══ */}
      {error && (
        <Alert
          severity={isStockError ? 'warning' : 'error'}
          sx={{ mb: 2, '& .MuiAlert-message': { flex: 1 } }}
          onClose={() => {
            setError(null);
            setIsStockError(false);
          }}
          action={
            isStockError ? (
              <Button
                component={Link}
                to="/smartpos/purchases/new"
                size="small"
                color="inherit"
                startIcon={<IconUpload size={14} />}
                sx={{ fontWeight: 700, textTransform: 'none' }}
              >
                Add Stock
              </Button>
            ) : undefined
          }
        >
          {error}
        </Alert>
      )}
      {banner && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {banner}
        </Alert>
      )}

      {/* ═══ Top bar — back + title + status ═══ */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2.5 }}>
        <IconButton
          onClick={() => nav('/smartpos/sales')}
          sx={{
            border: `1px solid ${brand.neutral[200]}`,
            borderRadius: '10px',
            color: brand.neutral[500],
            '&:hover': { bgcolor: brand.neutral[50], color: brand.neutral[700] },
          }}
        >
          <IconArrowLeft size={20} />
        </IconButton>

        <Box sx={{ flex: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 900,
                  fontSize: { xs: '1.2rem', sm: '1.6rem' },
                  letterSpacing: '-0.03em',
                  color: brand.neutral[900],
                  fontFamily: "'DM Mono', 'Courier New', monospace",
                }}
              >
                {sale?.ref ?? 'New sale'}
              </Typography>
              {sale && (
                <Chip
                  label={sale.pos ? 'POS' : 'Back-office'}
                  size="small"
                  icon={sale.pos ? <IconShoppingCart size={14} /> : <IconReceipt size={14} />}
                  sx={{
                    height: 26,
                    fontWeight: 700,
                    fontSize: '0.7rem',
                    bgcolor: sale.pos ? brand.accent[50] : brand.primary[50],
                    color: sale.pos ? brand.accent[700] : brand.primary[700],
                    borderRadius: '8px',
                    '.MuiChip-icon': { ml: 0.75, mr: -0.25 },
                  }}
                />
              )}
            </Stack>

            {sale && (
              <Stack direction="row" spacing={1} alignItems="center">
                <StatusIndicator
                  state={STATUS_STATE[sale.status] ?? 'idle'}
                  label={sale.status}
                  size="sm"
                  pulse={sale.status === 'CONFIRMED'}
                />
                <Box
                  sx={{
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    bgcolor: brand.neutral[300],
                    flexShrink: 0,
                  }}
                />
                <StatusIndicator
                  state={PAYMENT_STATE[sale.paymentStatus] ?? 'idle'}
                  label={sale.paymentStatus}
                  size="sm"
                />
              </Stack>
            )}
          </Stack>

          {sale && (
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 0.5 }}>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <IconClock size={14} color={brand.neutral[400]} stroke={1.5} />
                <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 500 }}>
                  {new Date(sale.date).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Typography>
              </Stack>
              {sale.confirmedAt && (
                <>
                  <Box
                    sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: brand.neutral[300] }}
                  />
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <IconCheck size={14} color={brand.success.main} stroke={2} />
                    <Typography
                      variant="caption"
                      sx={{ color: brand.success.dark, fontWeight: 600 }}
                    >
                      Confirmed{' '}
                      {new Date(sale.confirmedAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Typography>
                  </Stack>
                </>
              )}
            </Stack>
          )}
        </Box>

        {/* Top-right actions */}
        {sale && (
          <Stack direction="row" spacing={1}>
            {sale.status === 'CONFIRMED' && (
              <>
                <Tooltip title="Print receipt" arrow>
                  <IconButton
                    onClick={handlePrint}
                    sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: '10px' }}
                  >
                    <IconPrinter size={18} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Copy ref" arrow>
                  <IconButton
                    onClick={() => {
                      navigator.clipboard.writeText(sale.ref);
                    }}
                    sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: '10px' }}
                  >
                    <IconCopy size={18} />
                  </IconButton>
                </Tooltip>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={handleCancel}
                  sx={{ fontWeight: 600, borderRadius: '8px', textTransform: 'none' }}
                >
                  Cancel sale
                </Button>
              </>
            )}
            {sale.status === 'CONFIRMED' && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<IconTruckReturn size={16} />}
                onClick={() => nav(`/smartpos/returns`)}
                sx={{
                  fontWeight: 600,
                  borderRadius: '8px',
                  textTransform: 'none',
                  borderColor: brand.warning.main,
                  color: brand.warning.dark,
                  '&:hover': { borderColor: brand.warning.dark, bgcolor: brand.warning.light },
                }}
              >
                Issue return
              </Button>
            )}
          </Stack>
        )}
      </Stack>

      {/* ═══ Body — two columns ═══ */}
      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5}>
        {/* ── Left column ── */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Customer + Warehouse cards */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
            {/* Customer */}
            <Card
              elevation={0}
              sx={{
                flex: 1,
                border: `1px solid ${brand.neutral[200]}`,
                borderRadius: '12px',
                bgcolor: customer ? brand.primary[50] : '#fff',
                transition: 'border-color 0.15s ease',
                '&:hover': { borderColor: customer ? brand.primary[200] : brand.neutral[300] },
              }}
            >
              <CardContent sx={{ p: 2, pb: '16px !important' }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: brand.neutral[500],
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    display: 'block',
                    mb: 1,
                  }}
                >
                  Customer
                </Typography>
                {customer ? (
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar
                      sx={{
                        width: 40,
                        height: 40,
                        bgcolor: brand.primary[600],
                        fontWeight: 700,
                        fontSize: '0.9rem',
                      }}
                    >
                      {customer.name.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 700, color: brand.neutral[900] }}
                        noWrap
                      >
                        {customer.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
                        {customer.email || customer.phone || 'No contact info'}
                      </Typography>
                    </Box>
                  </Stack>
                ) : (
                  <Stack
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                    sx={{ color: brand.neutral[400] }}
                  >
                    <Avatar
                      sx={{
                        width: 40,
                        height: 40,
                        bgcolor: brand.neutral[200],
                        color: brand.neutral[400],
                      }}
                    >
                      <IconUser size={20} />
                    </Avatar>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 500, color: brand.neutral[500], fontStyle: 'italic' }}
                    >
                      Walk-in customer
                    </Typography>
                  </Stack>
                )}
              </CardContent>
            </Card>

            {/* Warehouse */}
            <Card
              elevation={0}
              sx={{
                flex: 1,
                border: `1px solid ${brand.neutral[200]}`,
                borderRadius: '12px',
              }}
            >
              <CardContent sx={{ p: 2, pb: '16px !important' }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: brand.neutral[500],
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    display: 'block',
                    mb: 1,
                  }}
                >
                  Warehouse
                </Typography>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar
                    sx={{
                      width: 40,
                      height: 40,
                      bgcolor: brand.info.light,
                      color: brand.info.dark,
                    }}
                  >
                    <IconBuildingWarehouse size={20} />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: brand.neutral[900] }}>
                      {warehouse?.name ?? '—'}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card
              elevation={0}
              sx={{
                flex: 1,
                border: `1px solid ${brand.neutral[200]}`,
                borderRadius: '12px',
              }}
            >
              <CardContent sx={{ p: 2, pb: '16px !important' }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: brand.neutral[500],
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    display: 'block',
                    mb: 1,
                  }}
                >
                  Summary
                </Typography>
                <Stack direction="row" spacing={3}>
                  <Box>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 800, color: brand.neutral[900], lineHeight: 1.2 }}
                    >
                      {lineCount}
                    </Typography>
                    <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
                      Lines
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 800, color: brand.neutral[900], lineHeight: 1.2 }}
                    >
                      {itemCount}
                    </Typography>
                    <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
                      Items
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Stack>

          {/* Line items */}
          <Box sx={{ mb: 2 }}>
            <Typography
              variant="caption"
              sx={{
                color: brand.neutral[500],
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                display: 'block',
                mb: 1.25,
              }}
            >
              Line items
            </Typography>
            <LineEditor
              lines={lines}
              onChange={setLines}
              searchProducts={searchProducts}
              disabled={isReadonly}
            />
          </Box>

          {/* Notes */}
          <TextField
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            size="small"
            fullWidth
            multiline
            minRows={2}
            disabled={isReadonly}
            InputProps={{
              startAdornment: notes ? undefined : (
                <Box
                  component="span"
                  sx={{ color: brand.neutral[400], fontSize: '0.8125rem', fontStyle: 'italic' }}
                >
                  Add a note for this sale…
                </Box>
              ),
            }}
          />
        </Box>

        {/* ── Right column — totals + actions ── */}
        <Box sx={{ width: { xs: '100%', lg: 340 }, flexShrink: 0 }}>
          <Card
            elevation={0}
            sx={{
              border: `1px solid ${brand.neutral[200]}`,
              borderRadius: '12px',
              position: { lg: 'sticky' },
              top: 20,
              overflow: 'hidden',
            }}
          >
            {/* Totals header */}
            <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5 }}>
              <Typography
                variant="overline"
                sx={{ color: brand.neutral[500], fontWeight: 600, letterSpacing: '0.06em' }}
              >
                Totals
              </Typography>
            </Box>

            <CardContent sx={{ p: 0, pb: '0 !important' }}>
              <Stack spacing={0} divider={<Divider sx={{ mx: 2.5 }} />}>
                {/* Subtotal */}
                <Stack direction="row" justifyContent="space-between" sx={{ px: 2.5, py: 1.5 }}>
                  <Typography variant="body2" sx={{ color: brand.neutral[600] }}>
                    Subtotal
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: brand.neutral[800] }}>
                    {fmt(subtotal)}
                  </Typography>
                </Stack>

                {/* Tax */}
                <Stack direction="row" justifyContent="space-between" sx={{ px: 2.5, py: 1.5 }}>
                  <Typography variant="body2" sx={{ color: brand.neutral[600] }}>
                    Tax
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: brand.neutral[800] }}>
                    {fmt(tax)}
                  </Typography>
                </Stack>

                {/* Discount */}
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ px: 2.5, py: 1.5 }}
                >
                  <Typography variant="body2" sx={{ color: brand.neutral[600] }}>
                    Discount
                  </Typography>
                  {isReadonly ? (
                    <Typography variant="body2" sx={{ fontWeight: 600, color: brand.neutral[800] }}>
                      {fmt(discount)}
                    </Typography>
                  ) : (
                    <TextField
                      size="small"
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                      inputProps={{ style: { textAlign: 'right', fontWeight: 600 } }}
                      sx={{ width: 110 }}
                    />
                  )}
                </Stack>

                {/* Grand total */}
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ px: 2.5, py: 2 }}
                >
                  <Typography variant="body1" sx={{ fontWeight: 700, color: brand.neutral[900] }}>
                    Total
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 900, color: brand.primary[700], letterSpacing: '-0.02em' }}
                  >
                    {fmt(grand)}
                  </Typography>
                </Stack>
              </Stack>

              {/* Payment info (view mode) */}
              {sale && sale.paymentStatus !== 'UNPAID' && (
                <Box sx={{ mx: 2.5, mt: 1, mb: 2 }}>
                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
                        {sale.paymentStatus === 'PAID'
                          ? 'Fully paid'
                          : sale.paymentStatus === 'PARTIAL'
                            ? 'Partially paid'
                            : 'Refunded'}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ fontWeight: 700, color: brand.neutral[700] }}
                      >
                        {fmt(sale.paidTotal)}
                      </Typography>
                    </Stack>
                    {sale.paymentStatus === 'PARTIAL' && (
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption" sx={{ color: brand.error.dark }}>
                          Due
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ fontWeight: 700, color: brand.error.dark }}
                        >
                          {fmt(sale.dueTotal)}
                        </Typography>
                      </Stack>
                    )}
                  </Stack>
                </Box>
              )}
            </CardContent>

            {/* Actions */}
            <Box sx={{ px: 2.5, pt: 1.5, pb: 2.5 }}>
              <Stack spacing={1}>
                {/* Primary: Save as draft (new) or Confirm (existing draft) */}
                {!isReadonly && (
                  <>
                    {!sale || sale.status === 'DRAFT' ? (
                      <>
                        <Button
                          fullWidth
                          variant="outlined"
                          startIcon={
                            submitting ? (
                              <CircularProgress size={16} />
                            ) : (
                              <IconDeviceFloppy size={16} />
                            )
                          }
                          onClick={() => handleSave(false)}
                          disabled={submitting || lines.length === 0}
                          sx={{
                            fontWeight: 700,
                            borderRadius: '10px',
                            textTransform: 'none',
                            py: 1.25,
                            borderColor: brand.neutral[300],
                            color: brand.neutral[700],
                            '&:hover': {
                              borderColor: brand.primary[400],
                              bgcolor: brand.primary[50],
                              color: brand.primary[700],
                            },
                          }}
                        >
                          Save as draft
                        </Button>
                        <Button
                          fullWidth
                          variant="contained"
                          startIcon={
                            submitting ? (
                              <CircularProgress size={16} color="inherit" />
                            ) : (
                              <IconCheck size={18} />
                            )
                          }
                          onClick={() => handleSave(true)}
                          disabled={submitting || lines.length === 0}
                          sx={{
                            fontWeight: 800,
                            borderRadius: '10px',
                            textTransform: 'none',
                            py: 1.35,
                            background: `linear-gradient(135deg, ${brand.primary[500]} 0%, ${brand.primary[700]} 100%)`,
                            boxShadow: `0 12px 24px -14px ${brand.primary[700]}`,
                            '&:hover': {
                              background: `linear-gradient(135deg, ${brand.primary[600]} 0%, ${brand.primary[800]} 100%)`,
                              boxShadow: `0 16px 32px -16px ${brand.primary[800]}`,
                            },
                          }}
                        >
                          {submitting ? 'Processing…' : 'Confirm sale'}
                        </Button>
                      </>
                    ) : null}
                  </>
                )}

                {/* Readonly actions */}
                {isReadonly && (
                  <Alert severity="info" sx={{ borderRadius: '10px', fontSize: '0.8125rem' }}>
                    This sale is {sale?.status?.toLowerCase()}. No further edits can be made.
                  </Alert>
                )}
              </Stack>
            </Box>
          </Card>
        </Box>
      </Stack>
    </Box>
  );
}
