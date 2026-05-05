/**
 * POS Behaviour Settings — negative stock, customer/note requirements,
 * low-stock threshold, kiosk timeout, sounds, sale reference numbering,
 * and products-per-page.
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
  IconLayoutGrid, IconPackage, IconDeviceDesktop, IconFileInvoice,
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

const PRODUCTS_PER_PAGE_OPTS = [10, 20, 24, 30, 50, 100];

export default function PosSettingsPage() {
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
        productsPerPage: settings.productsPerPage,
        allowNegativeStock: settings.allowNegativeStock,
        requireCustomerOnSale: settings.requireCustomerOnSale,
        requireNoteOnSale: settings.requireNoteOnSale,
        lowStockThreshold: settings.lowStockThreshold,
        enableSound: settings.enableSound,
        kioskIdleTimeoutSec: settings.kioskIdleTimeoutSec,
        saleRefPrefix: settings.saleRefPrefix,
        saleRefPadding: settings.saleRefPadding,
      });
      setSettings(updated);
      showInfo('POS behaviour settings saved.');
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
        title="POS Behaviour"
        subtitle="Stock rules, UI preferences, sale reference numbering"
        badge={{ label: 'Enterprise', tone: 'primary' }}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {info && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setInfo(null)}>{info}</Alert>}

      {/* Warehouse selector */}
      <Box sx={{ ...cardSx, p: 2.5, mb: 2.5 }}>
        <SectionTitle icon={<IconLayoutGrid size={20} />} title="Configuration scope" />
        <Typography variant="body2" sx={{ color: brand.neutral[500], mb: 1.5 }}>
          These settings apply to the selected warehouse.
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
        <Alert severity="info">Select a warehouse to configure its POS behaviour.</Alert>
      )}

      {loading && warehouseId && <CardSkeletonGroup heights={[140, 280, 200, 160]} />}

      {!loading && settings && warehouseId && (
        <Stack spacing={2.5} sx={{ maxWidth: 1680, mx: 'auto' }}>
          {/* Row: Product grid + UI & sound */}
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5}>
            <Box sx={{ ...cardSx, p: 2.5, flex: 1 }}>
              <SectionTitle icon={<IconLayoutGrid size={20} />} title="Product grid" />
              <Typography variant="body2" sx={{ color: brand.neutral[500], mb: 1.5 }}>
                Number of products shown per page in the POS terminal grid.
              </Typography>
              <ToggleButtonGroup
                value={settings.productsPerPage}
                exclusive size="small"
                onChange={(_, v) => v && update({ productsPerPage: v })}
                sx={toggleGroupSx}
              >
                {PRODUCTS_PER_PAGE_OPTS.map((n) => (
                  <ToggleButton key={n} value={n}>{n}</ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>

            <Box sx={{ ...cardSx, p: 2.5, flex: 1 }}>
              <SectionTitle icon={<IconDeviceDesktop size={20} />} title="UI & sound" />
              <Stack spacing={1.5}>
                <FormControlLabel
                  control={<Switch checked={settings.enableSound} onChange={(_, v) => update({ enableSound: v })} />}
                  label="Enable sound effects (scan beep, sale complete)"
                />
                <Box sx={{ maxWidth: 400 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Kiosk idle timeout
                    <Hint text="Seconds of inactivity before the kiosk auto-resets to the start screen." />
                  </Typography>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Slider
                      value={settings.kioskIdleTimeoutSec}
                      min={30} max={600} step={15}
                      onChange={(_, v) => update({ kioskIdleTimeoutSec: v as number })}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      value={settings.kioskIdleTimeoutSec}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        if (!isNaN(v) && v >= 30 && v <= 3600) update({ kioskIdleTimeoutSec: v });
                      }}
                      size="small" type="number"
                      sx={{ width: 100, ...fieldSx }}
                      InputProps={{ endAdornment: <InputAdornment position="end">sec</InputAdornment> }}
                    />
                  </Stack>
                </Box>
              </Stack>
            </Box>
          </Stack>

          {/* Stock & sale rules — full width */}
          <Box sx={{
            ...cardSx, p: 2.5,
            borderColor: (settings.allowNegativeStock || settings.requireCustomerOnSale || settings.requireNoteOnSale)
              ? brand.primary[300] : brand.neutral[200],
            bgcolor: (settings.allowNegativeStock || settings.requireCustomerOnSale || settings.requireNoteOnSale)
              ? brand.primary[50] + 'CC' : '#fff',
            transition: 'all 0.2s',
          }}>
            <SectionTitle icon={<IconPackage size={20} />} title="Stock & sale rules" />
            <Stack spacing={0.5}>
              <FormControlLabel
                control={<Switch checked={settings.allowNegativeStock} onChange={(_, v) => update({ allowNegativeStock: v })} />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    Allow negative stock
                    <Hint text="Permit sales even when stock reaches zero. Useful for pre-orders or consignment." />
                  </Box>
                }
              />
              <FormControlLabel
                control={<Switch checked={settings.requireCustomerOnSale} onChange={(_, v) => update({ requireCustomerOnSale: v })} />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    Require customer on sale
                    <Hint text="Cashier must select a customer before completing a sale." />
                  </Box>
                }
              />
              <FormControlLabel
                control={<Switch checked={settings.requireNoteOnSale} onChange={(_, v) => update({ requireNoteOnSale: v })} />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    Require note on sale
                    <Hint text="Cashier must add a note/comment before completing a sale." />
                  </Box>
                }
              />
            </Stack>

            <Box sx={{ mt: 2.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                Low stock threshold
                <Hint text="Products at or below this quantity are flagged as low-stock." />
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ maxWidth: 440 }}>
                <Slider
                  value={settings.lowStockThreshold}
                  min={0} max={100} step={1}
                  onChange={(_, v) => update({ lowStockThreshold: v as number })}
                  sx={{ flex: 1 }}
                />
                <TextField
                  value={settings.lowStockThreshold}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v) && v >= 0 && v <= 10000) update({ lowStockThreshold: v });
                  }}
                  size="small" type="number"
                  sx={{ width: 90, ...fieldSx }}
                  InputProps={{ endAdornment: <InputAdornment position="end">units</InputAdornment> }}
                />
              </Stack>
            </Box>
          </Box>

          {/* Sale reference numbering — full width */}
          <Box sx={{ ...cardSx, p: 2.5 }}>
            <SectionTitle icon={<IconFileInvoice size={20} />} title="Sale reference numbering" />
            <Typography variant="body2" sx={{ color: brand.neutral[500], mb: 1.5 }}>
              Format: <strong>{settings.saleRefPrefix}{String(1).padStart(settings.saleRefPadding, '0')}</strong>
              {' '}→ <strong>{settings.saleRefPrefix}{String(42).padStart(settings.saleRefPadding, '0')}</strong>
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                label="Prefix"
                value={settings.saleRefPrefix}
                onChange={(e) => update({ saleRefPrefix: e.target.value.slice(0, 16) })}
                size="small"
                sx={{ maxWidth: 180, ...fieldSx }}
                helperText="e.g. INV-, SALE-, #"
              />
              <TextField
                label="Zero-pad width"
                value={settings.saleRefPadding}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v) && v >= 1 && v <= 8) update({ saleRefPadding: v });
                }}
                size="small" type="number"
                sx={{ maxWidth: 160, ...fieldSx }}
                helperText="1–8 digits (e.g. 4 → 0001)"
              />
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
