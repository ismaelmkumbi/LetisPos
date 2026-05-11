import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  IconButton,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import {
  IconArrowLeft,
  IconDeviceFloppy,
  IconTrash,
} from '@tabler/icons-react';

import {
  getPriceList,
  updatePriceList,
  type PriceListInput,
  type PriceListLineInput,
} from 'src/api/smartpos/priceLists';
import { listProducts, type Product } from 'src/api/smartpos/products';
import type { UUID } from 'src/api/smartpos/types';
import { brand } from 'src/theme/smartpos/brand';
import { PageHeader } from 'src/components/smartpos/PageHeader';

interface LineRow extends PriceListLineInput {
  productName?: string;
}

export default function PriceListDetailPage() {
  const { id } = useParams<{ id: UUID }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [form, setForm] = useState<PriceListInput>({ name: '' });
  const [rows, setRows] = useState<LineRow[]>([]);
  const [productPicker, setProductPicker] = useState('');
  const [productOptions, setProductOptions] = useState<Product[]>([]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getPriceList(id)
      .then((pl) => {
        if (cancelled) return;
        setForm({
          name: pl.name,
          description: pl.description ?? '',
          customerGroup: pl.customerGroup ?? '',
          currency: pl.currency,
          active: pl.active,
          startDate: pl.startDate ?? '',
          endDate: pl.endDate ?? '',
          lines: pl.lines ?? [],
        });
        setRows(
          (pl.lines ?? []).map((l) => ({
            productId: l.productId,
            variantId: l.variantId ?? undefined,
            price: l.price,
            minQty: l.minQty,
            maxQty: l.maxQty ?? undefined,
          })),
        );
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Load failed'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    const handle = setTimeout(() => {
      listProducts({ search: productPicker, size: 8 })
        .then((p) => setProductOptions(p.content))
        .catch(() => {});
    }, 250);
    return () => clearTimeout(handle);
  }, [productPicker]);

  const setField = <K extends keyof PriceListInput>(key: K, value: PriceListInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addLine = (p: Product) => {
    if (rows.some((r) => r.productId === p.id)) return;
    setRows((prev) => [
      ...prev,
      {
        productId: p.id,
        price: p.price,
        minQty: 1,
        maxQty: undefined,
        productName: p.name,
      },
    ]);
  };

  const updateLine = (idx: number, patch: Partial<LineRow>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const removeLine = (idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!id || !form.name.trim()) return;
    setSaving(true);
    setError(null);
    setInfo(null);
    try {
      const body: PriceListInput = {
        ...form,
        lines: rows.map((r) => ({
          productId: r.productId,
          variantId: r.variantId,
          price: r.price,
          minQty: r.minQty,
          maxQty: r.maxQty,
        })),
      };
      await updatePriceList(id, body);
      setInfo('Saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Typography>Loading…</Typography>;

  return (
    <Box sx={{ pb: 3 }}>
      <Button
        onClick={() => navigate('/smartpos/products/price-lists')}
        variant="text"
        startIcon={<IconArrowLeft size={15} />}
        sx={{
          color: brand.neutral[500],
          fontWeight: 600,
          fontSize: '0.8125rem',
          mb: 1,
          textTransform: 'none',
          borderRadius: '8px',
          '&:hover': { color: brand.primary[600], bgcolor: brand.neutral[50] },
        }}
      >
        Back to Price Lists
      </Button>

      <PageHeader
        title={form.name || 'Price List'}
        subtitle={form.customerGroup ? `Group: ${form.customerGroup}` : 'All customers'}
        actions={[
          {
            label: saving ? 'Saving…' : 'Save',
            icon: <IconDeviceFloppy size={17} />,
            onClick: handleSave,
            variant: 'primary',
          },
        ]}
      />

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
      {info && <Alert severity="success" onClose={() => setInfo(null)} sx={{ mb: 2 }}>{info}</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="General" />
        <Tab label={`Lines (${rows.length})`} />
      </Tabs>

      {tab === 0 && (
        <Card sx={{ borderRadius: '12px', border: `1px solid ${brand.neutral[200]}`, p: 2.5 }}>
          <Stack spacing={2} sx={{ maxWidth: 480 }}>
            <TextField
              label="Name"
              size="small"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              fullWidth
            />
            <TextField
              label="Description"
              size="small"
              value={form.description ?? ''}
              onChange={(e) => setField('description', e.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
            <TextField
              label="Customer Group"
              size="small"
              value={form.customerGroup ?? ''}
              onChange={(e) => setField('customerGroup', e.target.value)}
              helperText="Free-text tag (e.g. VIP, Wholesale, Walk-in)"
              fullWidth
            />
            <TextField
              label="Currency"
              size="small"
              value={form.currency ?? 'TZS'}
              onChange={(e) => setField('currency', e.target.value)}
              fullWidth
            />
            <TextField
              select
              label="Status"
              size="small"
              value={form.active ?? true ? 'active' : 'inactive'}
              onChange={(e) => setField('active', e.target.value === 'active')}
              fullWidth
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </TextField>
          </Stack>
        </Card>
      )}

      {tab === 1 && (
        <Card sx={{ borderRadius: '12px', border: `1px solid ${brand.neutral[200]}`, p: 2.5 }}>
          <Stack spacing={2}>
            <Autocomplete
              options={productOptions}
              value={null}
              inputValue={productPicker}
              onInputChange={(_, v) => setProductPicker(v)}
              onChange={(_, p) => { if (p) { addLine(p); setProductPicker(''); } }}
              getOptionLabel={(p) => `${p.code} — ${p.name}`}
              renderInput={(params) => (
                <TextField {...params} placeholder="Add product to price list…" size="small" />
              )}
            />

            {rows.length === 0 ? (
              <Typography sx={{ color: brand.neutral[500], textAlign: 'center', py: 4 }}>
                No products added yet.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {rows.map((r, idx) => (
                  <Stack
                    key={`${r.productId}-${idx}`}
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{
                      p: 1.5,
                      borderRadius: '10px',
                      border: `1px solid ${brand.neutral[200]}`,
                      flexWrap: 'wrap',
                    }}
                    useFlexGap
                  >
                    <Typography sx={{ fontWeight: 600, fontSize: 13, minWidth: 160, flex: { xs: '1 1 100%', sm: '0 0 auto' } }}>
                      {r.productName ?? r.productId.slice(0, 8)}
                    </Typography>
                    <TextField
                      size="small"
                      label="Price"
                      type="number"
                      value={r.price}
                      onChange={(e) => updateLine(idx, { price: Number(e.target.value) })}
                      sx={{ width: 120 }}
                    />
                    <TextField
                      size="small"
                      label="Min Qty"
                      type="number"
                      value={r.minQty ?? 1}
                      onChange={(e) => updateLine(idx, { minQty: Number(e.target.value) || 1 })}
                      sx={{ width: 100 }}
                    />
                    <TextField
                      size="small"
                      label="Max Qty"
                      type="number"
                      value={r.maxQty ?? ''}
                      onChange={(e) =>
                        updateLine(idx, { maxQty: Number(e.target.value) || undefined })
                      }
                      placeholder="∞"
                      sx={{ width: 100 }}
                    />
                    <IconButton size="small" onClick={() => removeLine(idx)}>
                      <IconTrash size={16} />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
            )}
          </Stack>
        </Card>
      )}
    </Box>
  );
}
