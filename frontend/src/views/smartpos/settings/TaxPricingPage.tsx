/**
 * Tax & Pricing Settings — default tax rate/method, max discount,
 * PIN-required-for-discount, and manager approval threshold.
 */
import { useEffect, useState, useCallback } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  FormControlLabel,
  InputAdornment,
  Slider,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Zoom,
} from '@mui/material';
import {
  IconPercentage, IconDiscount, IconCash,
} from '@tabler/icons-react';
import PageHeader from 'src/components/smartpos/PageHeader';
import {
  cardSx, SectionTitle, Hint, FloatingSaveBar, CardSkeletonGroup,
} from 'src/components/smartpos/SettingsHelpers';
import { brand } from 'src/theme/smartpos/brand';
import { premiumFieldSx } from 'src/components/smartpos/PosLayouts/shared';
import {
  getPosSettings, updatePosSettings, resetPosSettings, type PosSettings,
} from 'src/api/smartpos/posSettings';
import { listWarehouses, type Warehouse } from 'src/api/smartpos/inventory';
import { useAuth } from 'src/context/smartpos/AuthContext';
import type { UUID } from 'src/api/smartpos/types';

const fieldSx = { ...premiumFieldSx, '& .MuiOutlinedInput-root': { ...premiumFieldSx['& .MuiOutlinedInput-root'], borderRadius: '10px' } };

const toggleGroupSx = {
  '& .MuiToggleButton-root': {
    textTransform: 'none', fontWeight: 700, fontSize: '0.82rem', py: 0.8, px: 2, borderRadius: '8px',
  },
};

const CURRENCY_CODES = [
  'TZS', 'KES', 'UGX', 'RWF', 'BIF', 'USD', 'EUR', 'GBP', 'ZAR', 'NGN', 'GHS', 'AED',
];

export default function TaxPricingPage() {
  const { user } = useAuth();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState<UUID | null>(null);
  const [settings, setSettings] = useState<PosSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    listWarehouses()
      .then((w) => setWarehouses(w.filter((x) => x.active)))
      .catch(() => setError('Failed to load warehouses'));
  }, []);

  useEffect(() => {
    if (!warehouseId) { setSettings(null); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getPosSettings(warehouseId)
      .then((s) => { if (!cancelled) setSettings(s); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [warehouseId]);

  useEffect(() => {
    if (warehouseId || warehouses.length === 0) return;
    const first = user?.warehouseIds?.[0] ?? warehouses[0]?.id;
    if (first) setWarehouseId(first);
  }, [warehouses, warehouseId, user]);

  const update = useCallback((patch: Partial<PosSettings>) => {
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const showInfo = (msg: string) => { setInfo(msg); setTimeout(() => setInfo(null), 3500); };

  const handleSave = async () => {
    if (!warehouseId || !settings) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updatePosSettings(warehouseId, {
        defaultTaxRate: settings.defaultTaxRate,
        defaultTaxMethod: settings.defaultTaxMethod,
        maxDiscountPercent: settings.maxDiscountPercent,
        requirePinForDiscount: settings.requirePinForDiscount,
        managerApprovalAbove: settings.managerApprovalAbove,
        currencyCode: settings.currencyCode,
        currencySymbol: settings.currencySymbol,
      });
      setSettings(updated);
      showInfo('Tax & pricing settings saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!warehouseId) return;
    setResetting(true);
    try {
      const defaults = await resetPosSettings(warehouseId);
      setSettings(defaults);
      showInfo('Settings reset to factory defaults.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reset failed');
    } finally {
      setResetting(false);
    }
  };

  const selWarehouse = warehouses.find((w) => w.id === warehouseId);

  return (
    <Box>
      <PageHeader
        title="Tax & Pricing"
        subtitle="Default tax, discount caps, manager approval thresholds, currency"
        badge={{ label: 'Enterprise', tone: 'primary' }}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {info && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setInfo(null)}>{info}</Alert>}

      {/* Warehouse selector */}
      <Box sx={{ ...cardSx, p: 2.5, mb: 2.5 }}>
        <SectionTitle icon={<IconPercentage size={20} />} title="Configuration scope" />
        <Typography variant="body2" sx={{ color: brand.neutral[500], mb: 1.5 }}>
          These settings apply to the selected warehouse. Each warehouse can have its own tax & pricing rules.
        </Typography>
        <Autocomplete
          value={selWarehouse ?? null}
          options={warehouses}
          getOptionLabel={(w) => `${w.name}${w.city ? ` — ${w.city}` : ''}`}
          onChange={(_, v) => v && setWarehouseId(v.id)}
          renderInput={(p) => <TextField {...p} size="small" sx={{ ...fieldSx, minWidth: 360 }} />}
          sx={{ maxWidth: 480 }}
        />
      </Box>

      {!warehouseId && !loading && (
        <Alert severity="info">Select a warehouse to configure tax & pricing.</Alert>
      )}

      {loading && warehouseId && <CardSkeletonGroup heights={[180, 280, 160]} />}

      {!loading && settings && warehouseId && (
        <Stack spacing={2.5} sx={{ maxWidth: 1680, mx: 'auto' }}>
          {/* Row: Tax defaults + Currency */}
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5}>
            {/* Tax defaults */}
            <Box sx={{ ...cardSx, p: 2.5, flex: 1 }}>
              <SectionTitle icon={<IconPercentage size={20} />} title="Tax defaults" />
              <Typography variant="body2" sx={{ color: brand.neutral[500], mb: 2 }}>
                Applied automatically to new sales unless overridden per product.
              </Typography>
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
                  <TextField
                    label="Default tax rate"
                    value={settings.defaultTaxRate}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v) && v >= 0 && v <= 100) update({ defaultTaxRate: v });
                    }}
                    type="number"
                    size="small"
                    sx={{ maxWidth: 180, ...fieldSx }}
                    InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                    helperText="0–100 %"
                  />
                  <Box>
                    <Typography variant="caption" sx={{ color: brand.neutral[500], mb: 0.5, display: 'block' }}>
                      Tax method
                      <Hint text="Exclusive: tax is added on top of price. Inclusive: tax is already included in price." />
                    </Typography>
                    <ToggleButtonGroup
                      value={settings.defaultTaxMethod}
                      exclusive size="small"
                      onChange={(_, v) => v && update({ defaultTaxMethod: v })}
                      sx={toggleGroupSx}
                    >
                      <ToggleButton value="EXCLUSIVE">Exclusive (+ tax)</ToggleButton>
                      <ToggleButton value="INCLUSIVE">Inclusive (incl. tax)</ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                </Stack>
              </Stack>
            </Box>

            {/* Currency */}
            <Box sx={{ ...cardSx, p: 2.5, flex: 1 }}>
              <SectionTitle icon={<IconCash size={20} />} title="Currency" />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  select
                  label="Currency code"
                  value={settings.currencyCode}
                  onChange={(e) => update({ currencyCode: e.target.value })}
                  size="small"
                  sx={{ minWidth: 140, ...fieldSx }}
                  helperText="ISO 4217 code"
                  SelectProps={{ native: false }}
                >
                  {CURRENCY_CODES.map((c) => (
                    <Box key={c} component="option" value={c}
                      sx={{ py: 0.5, px: 1.5, fontSize: '0.85rem', cursor: 'pointer' }}>
                      {c}
                    </Box>
                  ))}
                </TextField>
                <TextField
                  label="Currency symbol"
                  value={settings.currencySymbol}
                  onChange={(e) => update({ currencySymbol: e.target.value.slice(0, 8) })}
                  size="small"
                  sx={{ maxWidth: 160, ...fieldSx }}
                  helperText="Shown on receipts (e.g. $, €, TSh)"
                />
              </Stack>
            </Box>
          </Stack>

          {/* Discount rules — full width */}
          <Box sx={{
            ...cardSx, p: 2.5,
            borderColor: settings.requirePinForDiscount ? brand.warning.main + '40' : brand.neutral[200],
            bgcolor: settings.requirePinForDiscount ? brand.warning.main + '08' : '#fff',
            transition: 'all 0.2s',
          }}>
            <SectionTitle icon={<IconDiscount size={20} />} title="Discount rules" />
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Maximum discount per sale
                  <Hint text="Cashiers cannot apply a discount greater than this percentage." />
                </Typography>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ maxWidth: 480 }}>
                  <Slider
                    value={settings.maxDiscountPercent}
                    min={0} max={100} step={1}
                    onChange={(_, v) => update({ maxDiscountPercent: v as number })}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    value={settings.maxDiscountPercent}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v) && v >= 0 && v <= 100) update({ maxDiscountPercent: v });
                    }}
                    size="small" type="number"
                    sx={{ width: 100, ...fieldSx }}
                    InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                  />
                </Stack>
              </Box>

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.requirePinForDiscount}
                    onChange={(_, v) => update({ requirePinForDiscount: v })}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    Require PIN to apply any discount
                    <Hint text="Any discount (even 1%) requires a manager PIN before it can be applied." />
                  </Box>
                }
              />

              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Manager approval above
                  <Hint text="Require manager PIN when discount exceeds this amount. Leave blank to disable." />
                </Typography>
                <TextField
                  label="Amount threshold"
                  value={settings.managerApprovalAbove ?? ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      update({ managerApprovalAbove: null });
                    } else {
                      const v = parseFloat(raw);
                      if (!isNaN(v) && v >= 0) update({ managerApprovalAbove: v });
                    }
                  }}
                  size="small" type="number"
                  sx={{ maxWidth: 240, ...fieldSx }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        {settings.currencySymbol || settings.currencyCode}
                      </InputAdornment>
                    ),
                  }}
                  helperText="Clear to disable threshold"
                />
              </Box>
            </Stack>
          </Box>

          {/* Floating save bar */}
          <Zoom in>
            <FloatingSaveBar
              saving={saving}
              onSave={handleSave}
              onReset={handleReset}
              resetting={resetting}
              lastSavedAt={settings.updatedAt ? new Date(settings.updatedAt).toLocaleString() : undefined}
            />
          </Zoom>
        </Stack>
      )}
    </Box>
  );
}
