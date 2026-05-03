/**
 * Receipt Settings Page — configure receipt layout, paper size, and all
 * display toggles. Persists to the server-side pos_settings table via the
 * POS Settings API, and syncs to localStorage for the POS terminal's
 * offline-first receipt renderer.
 */
import { useEffect, useState, useCallback } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControlLabel,
  Slider,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { IconCheck } from '@tabler/icons-react';
import PageHeader from 'src/components/smartpos/PageHeader';
import { brand } from 'src/theme/smartpos/brand';
import { premiumFieldSx } from 'src/components/smartpos/PosLayouts/shared';
import {
  getReceiptConfig,
  saveReceiptConfig,
  type ReceiptConfig,
  type ReceiptLayout,
  type ReceiptPaper,
} from 'src/components/smartpos/Receipt';
import { getPosSettings, updatePosSettings, type PosSettings } from 'src/api/smartpos/posSettings';
import { listWarehouses, type Warehouse } from 'src/api/smartpos/inventory';
import { useAuth } from 'src/context/smartpos/AuthContext';
import type { UUID } from 'src/api/smartpos/types';

/* ─── Layout / Paper ↔ int conversion ─────────────────────────────── */

const LAYOUT_TO_INT: Record<ReceiptLayout, number> = { standard: 0, compact: 1, detailed: 2 };
const INT_TO_LAYOUT: Record<number, ReceiptLayout> = { 0: 'standard', 1: 'compact', 2: 'detailed' };

const PAPER_TO_INT: Record<ReceiptPaper, number> = { '58mm': 0, '80mm': 1, '88mm': 2, a4: 3 };
const INT_TO_PAPER: Record<number, ReceiptPaper> = { 0: '58mm', 1: '80mm', 2: '88mm', 3: 'a4' };

function posSettingsToConfig(ps: PosSettings): ReceiptConfig {
  return {
    layout: INT_TO_LAYOUT[ps.receiptLayout] ?? 'standard',
    paperSize: INT_TO_PAPER[ps.receiptPaperSize] ?? '80mm',
    autoPrint: ps.autoPrint,
    showLogo: ps.showLogo,
    logoSize: ps.logoSize,
    showStoreName: ps.showStoreName,
    showStoreAddress: ps.showStoreAddress,
    showStorePhone: ps.showStorePhone,
    showStoreEmail: ps.showStoreEmail,
    storeName: ps.storeName,
    storeAddress: ps.storeAddress,
    storePhone: ps.storePhone,
    storeEmail: ps.storeEmail,
    storeTaxId: ps.storeTaxId,
    showRef: ps.showReference,
    showDate: ps.showDate,
    showSeller: ps.showSeller,
    showCustomer: ps.showCustomer,
    showWarehouse: ps.showWarehouse,
    showBarcode: ps.showBarcode,
    showTax: ps.showTax,
    showDiscount: ps.showDiscount,
    showShipping: ps.showShipping,
    showNote: ps.showNote,
    showPaid: ps.showPaid,
    showDue: ps.showDue,
    showPayments: ps.showPayments,
    showFooter: ps.showFooter,
    footerMessage: ps.footerMessage,
  };
}

function configToPosSettingsPatch(config: ReceiptConfig) {
  return {
    receiptLayout: LAYOUT_TO_INT[config.layout] ?? 0,
    receiptPaperSize: PAPER_TO_INT[config.paperSize] ?? 1,
    autoPrint: config.autoPrint,
    showLogo: config.showLogo,
    logoSize: config.logoSize,
    showStoreName: config.showStoreName,
    showStoreAddress: config.showStoreAddress,
    showStorePhone: config.showStorePhone,
    showStoreEmail: config.showStoreEmail,
    storeName: config.storeName,
    storeAddress: config.storeAddress,
    storePhone: config.storePhone,
    storeEmail: config.storeEmail,
    storeTaxId: config.storeTaxId,
    showReference: config.showRef,
    showDate: config.showDate,
    showSeller: config.showSeller,
    showCustomer: config.showCustomer,
    showWarehouse: config.showWarehouse,
    showBarcode: config.showBarcode,
    showTax: config.showTax,
    showDiscount: config.showDiscount,
    showShipping: config.showShipping,
    showNote: config.showNote,
    showPaid: config.showPaid,
    showDue: config.showDue,
    showPayments: config.showPayments,
    showFooter: config.showFooter,
    footerMessage: config.footerMessage,
  };
}

/* ─── Component ─────────────────────────────────────────────────────── */

export default function ReceiptSettingsPage() {
  const { user } = useAuth();

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState<UUID | null>(null);
  const [config, setConfig] = useState<ReceiptConfig>(() => getReceiptConfig());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Load warehouses
  useEffect(() => {
    listWarehouses()
      .then((w) => setWarehouses(w.filter((x) => x.active)))
      .catch(() => {});
  }, []);

  // Default to user's first warehouse
  useEffect(() => {
    if (warehouseId || warehouses.length === 0) return;
    const first = user?.warehouseIds?.[0] ?? warehouses[0]?.id;
    if (first) setWarehouseId(first);
  }, [warehouses, warehouseId, user]);

  // Load server settings when warehouse changes
  useEffect(() => {
    if (!warehouseId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getPosSettings(warehouseId)
      .then((ps) => {
        if (!cancelled) {
          const c = posSettingsToConfig(ps);
          setConfig(c);
          saveReceiptConfig(c); // keep localStorage in sync
        }
      })
      .catch((e) => {
        if (!cancelled) {
          // Fall back to localStorage on error
          setError(e instanceof Error ? e.message : 'Failed to load from server; using local config.');
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
  }, [warehouseId]);

  const update = useCallback((patch: Partial<ReceiptConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const toggle = useCallback((field: keyof ReceiptConfig) => () => {
    update({ [field]: !(config[field] as boolean) } as Partial<ReceiptConfig>);
  }, [config, update]);

  const handleSave = async () => {
    // Always save to localStorage for the POS terminal
    saveReceiptConfig(config);

    // Save to server if warehouse selected
    if (!warehouseId) {
      setInfo('Saved to local storage. Select a warehouse to persist server-side.');
      setTimeout(() => setInfo(null), 3000);
      return;
    }

    setSaving(true);
    setError(null);
    setInfo(null);
    try {
      await updatePosSettings(warehouseId, configToPosSettingsPatch(config));
      setInfo('Receipt preferences saved.');
      setTimeout(() => setInfo(null), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save to server failed; saved to local storage instead.');
    } finally {
      setSaving(false);
    }
  };

  const selWarehouse = warehouses.find((w) => w.id === warehouseId);

  if (loading && warehouseId) {
    return (
      <Box>
        <PageHeader title="Receipt Settings" subtitle="Thermal or A4 layout, store info & visible fields" />
        <Stack spacing={2.5} sx={{ maxWidth: 720 }}>
          <SkeletonV />
          <SkeletonV />
          <SkeletonV />
          <SkeletonV />
          <SkeletonV />
        </Stack>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title="Receipt Settings"
        subtitle="Thermal or A4 layout, store info & visible fields"
      />

      {error && <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {info && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setInfo(null)}>{info}</Alert>}

      {/* Warehouse selector */}
      <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: 3, mb: 2.5 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <Box sx={{ minWidth: 280 }}>
              <SectionLabel>Warehouse</SectionLabel>
              <Autocomplete
                value={selWarehouse ?? null}
                options={warehouses}
                getOptionLabel={(w) => `${w.name}${w.city ? ` — ${w.city}` : ''}`}
                onChange={(_, v) => v && setWarehouseId(v.id)}
                size="small"
                renderInput={(p) => <TextField {...p} size="small" sx={premiumFieldSx} />}
              />
            </Box>
            {!warehouseId && (
              <Typography variant="caption" sx={{ color: brand.neutral[400], alignSelf: 'flex-end', pb: 0.5 }}>
                Using local config — select a warehouse for server persistence
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Stack spacing={2.5} sx={{ maxWidth: 720 }}>
        {/* Layout & Paper */}
        <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: 3 }}>
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Box sx={{ flex: 1 }}>
                <SectionLabel>Layout</SectionLabel>
                <ToggleButtonGroup
                  value={config.layout}
                  exclusive
                  size="small"
                  fullWidth
                  onChange={(_, v: ReceiptLayout) => v && update({ layout: v })}
                  sx={toggleGroupSx}
                >
                  <ToggleButton value="standard">Legacy Thermal</ToggleButton>
                  <ToggleButton value="compact">Compact</ToggleButton>
                  <ToggleButton value="detailed">Detailed / A4</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <Box sx={{ flex: 1 }}>
                <SectionLabel>Paper Size</SectionLabel>
                <ToggleButtonGroup
                  value={config.paperSize}
                  exclusive
                  size="small"
                  fullWidth
                  onChange={(_, v: ReceiptPaper) => v && update({ paperSize: v })}
                  sx={toggleGroupSx}
                >
                  <ToggleButton value="58mm">58mm</ToggleButton>
                  <ToggleButton value="80mm">80mm</ToggleButton>
                  <ToggleButton value="88mm">88mm</ToggleButton>
                  <ToggleButton value="a4">A4</ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Store Info */}
        <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: 3 }}>
          <CardContent>
            <SectionLabel>Store Information</SectionLabel>
            <Stack spacing={1.5}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  label="Store Name"
                  value={config.storeName}
                  onChange={(e) => update({ storeName: e.target.value })}
                  size="small"
                  fullWidth
                  sx={premiumFieldSx}
                />
                <TextField
                  label="Tax ID (TIN)"
                  value={config.storeTaxId}
                  onChange={(e) => update({ storeTaxId: e.target.value })}
                  size="small"
                  fullWidth
                  sx={premiumFieldSx}
                />
              </Stack>
              <TextField
                label="Store Address"
                value={config.storeAddress}
                onChange={(e) => update({ storeAddress: e.target.value })}
                size="small"
                fullWidth
                sx={premiumFieldSx}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  label="Store Phone"
                  value={config.storePhone}
                  onChange={(e) => update({ storePhone: e.target.value })}
                  size="small"
                  fullWidth
                  sx={premiumFieldSx}
                />
                <TextField
                  label="Store Email"
                  value={config.storeEmail}
                  onChange={(e) => update({ storeEmail: e.target.value })}
                  size="small"
                  fullWidth
                  sx={premiumFieldSx}
                />
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {/* Header Display Toggles */}
        <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: 3 }}>
          <CardContent>
            <SectionLabel>Header Display</SectionLabel>
            <ToggleGrid>
              <ToggleRow label="Store Logo"     checked={config.showLogo}        onChange={toggle('showLogo')} />
              <ToggleRow label="Store Name"     checked={config.showStoreName}   onChange={toggle('showStoreName')} />
              <ToggleRow label="Store Address"  checked={config.showStoreAddress} onChange={toggle('showStoreAddress')} />
              <ToggleRow label="Store Phone"    checked={config.showStorePhone}  onChange={toggle('showStorePhone')} />
              <ToggleRow label="Store Email"    checked={config.showStoreEmail}  onChange={toggle('showStoreEmail')} />
            </ToggleGrid>

            {config.showLogo && (
              <Box sx={{ mt: 1.5, px: 0.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: brand.neutral[500] }}>
                  Logo Size: {config.logoSize}px
                </Typography>
                <Slider
                  value={config.logoSize}
                  onChange={(_, v) => update({ logoSize: v as number })}
                  min={30} max={80} step={5}
                  size="small"
                  sx={{ mt: 0.5, color: brand.primary[600] }}
                />
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Meta Field Toggles */}
        <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: 3 }}>
          <CardContent>
            <SectionLabel>Meta Fields</SectionLabel>
            <ToggleGrid>
              <ToggleRow label="Reference"     checked={config.showRef}       onChange={toggle('showRef')} />
              <ToggleRow label="Date"          checked={config.showDate}      onChange={toggle('showDate')} />
              <ToggleRow label="Customer"      checked={config.showCustomer}  onChange={toggle('showCustomer')} />
              <ToggleRow label="Cashier"       checked={config.showSeller}    onChange={toggle('showSeller')} />
              <ToggleRow label="Warehouse"     checked={config.showWarehouse} onChange={toggle('showWarehouse')} />
            </ToggleGrid>
          </CardContent>
        </Card>

        {/* Items & Totals Toggles */}
        <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: 3 }}>
          <CardContent>
            <SectionLabel>Items & Totals</SectionLabel>
            <ToggleGrid>
              <ToggleRow label="Barcode / SKU" checked={config.showBarcode}  onChange={toggle('showBarcode')} />
              <ToggleRow label="Tax Rate"      checked={config.showTax}      onChange={toggle('showTax')} />
              <ToggleRow label="Discount"      checked={config.showDiscount} onChange={toggle('showDiscount')} />
              <ToggleRow label="Shipping"      checked={config.showShipping} onChange={toggle('showShipping')} />
              <ToggleRow label="Sale Notes"    checked={config.showNote}     onChange={toggle('showNote')} />
              <ToggleRow label="Payments"      checked={config.showPayments} onChange={toggle('showPayments')} />
              <ToggleRow label="Paid Amount"   checked={config.showPaid}     onChange={toggle('showPaid')} />
              <ToggleRow label="Due Amount"    checked={config.showDue}      onChange={toggle('showDue')} />
            </ToggleGrid>
          </CardContent>
        </Card>

        {/* Footer */}
        <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: 3 }}>
          <CardContent>
            <SectionLabel>Footer</SectionLabel>
            <Stack spacing={1.5}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.showFooter}
                    onChange={(_, v) => update({ showFooter: v })}
                  />
                }
                label={
                  <Typography sx={{ fontWeight: 700, fontSize: '0.82rem' }}>
                    Show footer on receipt
                  </Typography>
                }
                sx={{ m: 0 }}
              />
              <TextField
                label="Footer Message"
                value={config.footerMessage}
                onChange={(e) => update({ footerMessage: e.target.value })}
                size="small"
                fullWidth
                sx={premiumFieldSx}
              />
            </Stack>
          </CardContent>
        </Card>

        {/* Auto-print */}
        <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: 3 }}>
          <CardContent>
            <FormControlLabel
              control={
                <Switch
                  checked={config.autoPrint}
                  onChange={(_, v) => update({ autoPrint: v })}
                />
              }
              label={
                <Typography sx={{ fontWeight: 700, fontSize: '0.84rem' }}>
                  Auto-print receipt after sale
                </Typography>
              }
              sx={{ m: 0 }}
            />
          </CardContent>
        </Card>

        {/* Save */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', pb: 4 }}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <IconCheck size={18} />}
            sx={{
              textTransform: 'none',
              fontWeight: 800,
              borderRadius: '10px',
              px: 3,
            }}
          >
            {saving ? 'Saving…' : 'Save Preferences'}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}

/* ─── Shared helpers ────────────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="caption"
      sx={{
        fontWeight: 700, color: brand.neutral[500], mb: 0.5,
        display: 'block', textTransform: 'uppercase', letterSpacing: '0.03em',
      }}
    >
      {children}
    </Typography>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <FormControlLabel
      control={<Switch size="small" checked={checked} onChange={onChange} />}
      label={<Typography sx={{ fontSize: '0.78rem', fontWeight: 600 }}>{label}</Typography>}
      sx={{ m: 0 }}
    />
  );
}

function ToggleGrid({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.25 }}>
      {children}
    </Box>
  );
}

function SkeletonV() {
  return (
    <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: 3 }}>
      <CardContent>
        <Box sx={{ height: 120 }} />
      </CardContent>
    </Card>
  );
}

const toggleGroupSx = {
  '& .MuiToggleButton-root': {
    textTransform: 'none',
    fontWeight: 700,
    fontSize: '0.78rem',
    py: 0.8,
  },
};
