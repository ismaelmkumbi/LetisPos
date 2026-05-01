import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Alert, Autocomplete, Box, Button, Card, CardContent, CircularProgress,
  Divider, Grid, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import { IconDeviceFloppy, IconCheck } from '@tabler/icons-react';

import { createSale, commitSale, getSale, type CreateSaleBody } from 'src/api/smartpos/sales';
import { listProducts } from 'src/api/smartpos/products';
import { listCustomers } from 'src/api/smartpos/customers';
import { listWarehouses, type Warehouse } from 'src/api/smartpos/inventory';
import type { Customer } from 'src/api/smartpos/types';

import PageHeader from 'src/components/smartpos/PageHeader';
import LineEditor, { type EditableLine } from 'src/components/smartpos/LineEditor';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;

export default function SaleBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();

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
  const [banner, setBanner] = useState<string | null>(null);

  // Bootstrap
  useEffect(() => {
    Promise.all([listWarehouses(), listCustomers({ size: 200 })])
      .then(([w, c]) => {
        setWarehouses(w);
        if (!warehouseId && w[0]) setWarehouseId(w[0].id);
        setCustomers(c.content);
      })
      .catch(() => {/* UI below shows nothing — error will surface on save */});
  }, [warehouseId]);

  // Edit mode — load existing sale
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getSale(id)
      .then((s) => {
        setWarehouseId(s.warehouseId);
        setCustomerId(s.customerId);
        setNotes(s.notes ?? '');
        setDiscount(s.discountTotal);
        setLines(s.lines.map((l) => ({
          productId: l.productId,
          productName: l.productName,
          productCode: l.productCode ?? undefined,
          unitPrice: l.unitPrice,
          qty: l.qty,
          taxRate: l.taxRate,
        })));
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load sale'))
      .finally(() => setLoading(false));
  }, [id]);

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const tax = lines.reduce((s, l) => s + l.unitPrice * l.qty * (l.taxRate / 100), 0);
  const grand = subtotal + tax - discount;

  const searchProducts = async (q: string) => (await listProducts({ search: q, size: 20 })).content;

  const handleSave = async (andCommit = false) => {
    if (lines.length === 0) { setError('Add at least one line.'); return; }
    if (!warehouseId) { setError('Warehouse is required.'); return; }
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
      setError(e instanceof Error ? e.message : 'Save failed');
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
        title={id ? 'Edit sale' : 'New sale'}
        subtitle="Back-office sale document — draft or confirm to commit stock."
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {banner && <Alert severity="success" sx={{ mb: 2 }}>{banner}</Alert>}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: 3, mb: 2 }}>
            <CardContent>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  select size="small" label="Warehouse" value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  sx={{ minWidth: 200 }}
                >
                  {warehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
                </TextField>

                <Autocomplete
                  size="small"
                  options={customers}
                  value={customers.find((c) => c.id === customerId) || null}
                  onChange={(_, v) => setCustomerId(v?.id ?? null)}
                  getOptionLabel={(c) => c.name}
                  renderInput={(params) => <TextField {...params} label="Customer (optional)" />}
                  sx={{ minWidth: 260, flex: 1 }}
                />
              </Stack>
            </CardContent>
          </Card>

          <LineEditor
            lines={lines}
            onChange={setLines}
            searchProducts={searchProducts}
          />

          <TextField
            label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)}
            size="small" fullWidth multiline minRows={2} sx={{ mt: 2 }}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: 3, position: { md: 'sticky' }, top: 16 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Totals</Typography>
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                  <Typography variant="body2">{fmt(subtotal)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Tax</Typography>
                  <Typography variant="body2">{fmt(tax)}</Typography>
                </Stack>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Discount</Typography>
                  <TextField
                    size="small" type="number" value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                    inputProps={{ style: { textAlign: 'right' } }}
                    sx={{ width: 110 }}
                  />
                </Stack>
                <Divider />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>Total</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: brand.primary[700] }}>
                    {fmt(grand)}
                  </Typography>
                </Stack>
              </Stack>

              <Stack spacing={1} sx={{ mt: 3 }}>
                <Button
                  fullWidth variant="outlined"
                  startIcon={<IconDeviceFloppy size={16} />}
                  onClick={() => handleSave(false)}
                  disabled={submitting || lines.length === 0}
                >
                  Save as draft
                </Button>
                <Button
                  fullWidth variant="contained"
                  startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <IconCheck size={16} />}
                  onClick={() => handleSave(true)}
                  disabled={submitting || lines.length === 0}
                  sx={{
                    bgcolor: brand.accent[500],
                    '&:hover': { bgcolor: brand.accent[600] },
                    fontWeight: 700,
                  }}
                >
                  {submitting ? 'Processing…' : 'Confirm sale'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
