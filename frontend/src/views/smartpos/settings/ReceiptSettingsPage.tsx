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
  FormControlLabel,
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
  IconReceipt, IconBuildingStore, IconEye, IconNotes, IconCalculator,
  IconAlignBoxBottomLeft, IconPrinter,
} from '@tabler/icons-react';
import PageHeader from 'src/components/smartpos/PageHeader';
import {
  cardSx, SectionTitle, FloatingSaveBar, CardSkeletonGroup,
} from 'src/components/smartpos/SettingsHelpers';
import { brand } from 'src/theme/smartpos/brand';
import type { Theme } from '@mui/material/styles';
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

const fieldSx = (theme: Theme) => {
  const base = premiumFieldSx(theme);
  return { ...base, '& .MuiOutlinedInput-root': { ...base['& .MuiOutlinedInput-root'], borderRadius: '10px' } };
};

const toggleGroupSx = {
  '& .MuiToggleButton-root': {
    textTransform: 'none', fontWeight: 700, fontSize: '0.82rem', py: 0.8, px: 2, borderRadius: '8px',
  },
};

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
    showLogo: ps.showLogo, logoSize: ps.logoSize,
    logoUrl: ps.logoUrl || '',
    logoAlt: ps.storeName ? `${ps.storeName} logo` : 'Store logo',
    brandColor: brand.primary[600],
    showStoreName: ps.showStoreName, showStoreAddress: ps.showStoreAddress,
    showStorePhone: ps.showStorePhone, showStoreEmail: ps.showStoreEmail,
    storeName: ps.storeName, storeAddress: ps.storeAddress,
    storePhone: ps.storePhone, storeEmail: ps.storeEmail, storeTaxId: ps.storeTaxId,
    showRef: ps.showReference, showDate: ps.showDate, showSeller: ps.showSeller,
    showCustomer: ps.showCustomer, showWarehouse: ps.showWarehouse,
    showBarcode: ps.showBarcode, showTax: ps.showTax, showDiscount: ps.showDiscount,
    showShipping: ps.showShipping, showNote: ps.showNote,
    showPaid: ps.showPaid, showDue: ps.showDue, showPayments: ps.showPayments,
    showFooter: ps.showFooter, footerMessage: ps.footerMessage,
  };
}

function configToPosSettingsPatch(config: ReceiptConfig) {
  return {
    receiptLayout: LAYOUT_TO_INT[config.layout] ?? 0,
    receiptPaperSize: PAPER_TO_INT[config.paperSize] ?? 1,
    autoPrint: config.autoPrint,
    showLogo: config.showLogo, logoSize: config.logoSize,
    showStoreName: config.showStoreName, showStoreAddress: config.showStoreAddress,
    showStorePhone: config.showStorePhone, showStoreEmail: config.showStoreEmail,
    storeName: config.storeName, storeAddress: config.storeAddress,
    storePhone: config.storePhone, storeEmail: config.storeEmail, storeTaxId: config.storeTaxId,
    logoUrl: config.logoUrl,
    showReference: config.showRef, showDate: config.showDate, showSeller: config.showSeller,
    showCustomer: config.showCustomer, showWarehouse: config.showWarehouse,
    showBarcode: config.showBarcode, showTax: config.showTax, showDiscount: config.showDiscount,
    showShipping: config.showShipping, showNote: config.showNote,
    showPaid: config.showPaid, showDue: config.showDue, showPayments: config.showPayments,
    showFooter: config.showFooter, footerMessage: config.footerMessage,
  };
}

/* ─── Sub-components ─────────────────────────────────────────────────── */

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

/* ─── Page ──────────────────────────────────────────────────────────── */

export default function ReceiptSettingsPage() {
  const { user } = useAuth();

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState<UUID | null>(null);
  const [config, setConfig] = useState<ReceiptConfig>(() => getReceiptConfig());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    listWarehouses()
      .then((w) => setWarehouses(w.filter((x) => x.active)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (warehouseId || warehouses.length === 0) return;
    const first = user?.warehouseIds?.[0] ?? warehouses[0]?.id;
    if (first) setWarehouseId(first);
  }, [warehouses, warehouseId, user]);

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
          saveReceiptConfig(c);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load from server; using local config.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [warehouseId]);

  const update = useCallback((patch: Partial<ReceiptConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const toggle = useCallback((field: keyof ReceiptConfig) => () => {
    update({ [field]: !(config[field] as boolean) } as Partial<ReceiptConfig>);
  }, [config, update]);

  const handleSave = async () => {
    saveReceiptConfig(config);

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

  return (
    <Box>
      <PageHeader
        title="Receipt Settings"
        subtitle="Thermal or A4 layout, store info & visible fields"
        badge={{ label: 'Enterprise', tone: 'primary' }}
      />

      {error && <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {info && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setInfo(null)}>{info}</Alert>}

      {/* Warehouse selector */}
      <Box sx={{ ...cardSx, p: 2.5, mb: 2.5 }}>
        <SectionTitle icon={<IconReceipt size={20} />} title="Configuration scope" />
        <Stack direction="row" spacing={2} alignItems="center">
          <Autocomplete
            value={selWarehouse ?? null}
            options={warehouses}
            getOptionLabel={(w) => `${w.name}${w.city ? ` — ${w.city}` : ''}`}
            onChange={(_, v) => v && setWarehouseId(v.id)}
            size="small"
            renderInput={(p) => <TextField {...p} size="small" sx={(theme) => ({ ...fieldSx(theme), minWidth: 320 })} />}
          />
          {!warehouseId && (
            <Typography variant="caption" sx={{ color: brand.neutral[400], alignSelf: 'flex-end', pb: 0.5 }}>
              Using local config — select a warehouse for server persistence
            </Typography>
          )}
        </Stack>
      </Box>

      {loading && warehouseId && <CardSkeletonGroup heights={[120, 220, 160, 200, 200, 140, 80]} count={7} />}

      {!loading && (
        <Stack spacing={2.5} sx={{ maxWidth: 1680, mx: 'auto' }}>
          {/* Row: Layout & Paper */}
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5}>
            <Box sx={{ ...cardSx, p: 2.5, flex: 1 }}>
              <SectionTitle icon={<IconReceipt size={20} />} title="Layout" />
              <ToggleButtonGroup
                value={config.layout}
                exclusive size="small" fullWidth
                onChange={(_, v: ReceiptLayout) => v && update({ layout: v })}
                sx={toggleGroupSx}
              >
                <ToggleButton value="standard">Legacy Thermal</ToggleButton>
                <ToggleButton value="compact">Compact</ToggleButton>
                <ToggleButton value="detailed">Detailed / A4</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <Box sx={{ ...cardSx, p: 2.5, flex: 1 }}>
              <SectionTitle icon={<IconPrinter size={20} />} title="Paper Size" />
              <ToggleButtonGroup
                value={config.paperSize}
                exclusive size="small" fullWidth
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

          {/* Store Info */}
          <Box sx={{ ...cardSx, p: 2.5 }}>
            <SectionTitle icon={<IconBuildingStore size={20} />} title="Store Information" />
            <Stack spacing={1.5}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField label="Store Name" value={config.storeName}
                  onChange={(e) => update({ storeName: e.target.value })}
                  size="small" fullWidth sx={(theme) => fieldSx(theme)} />
                <TextField label="Tax ID (TIN)" value={config.storeTaxId}
                  onChange={(e) => update({ storeTaxId: e.target.value })}
                  size="small" fullWidth sx={(theme) => fieldSx(theme)} />
              </Stack>
              <TextField label="Store Address" value={config.storeAddress}
                onChange={(e) => update({ storeAddress: e.target.value })}
                size="small" fullWidth sx={(theme) => fieldSx(theme)} />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField label="Store Phone" value={config.storePhone}
                  onChange={(e) => update({ storePhone: e.target.value })}
                  size="small" fullWidth sx={(theme) => fieldSx(theme)} />
                <TextField label="Store Email" value={config.storeEmail}
                  onChange={(e) => update({ storeEmail: e.target.value })}
                  size="small" fullWidth sx={(theme) => fieldSx(theme)} />
              </Stack>
            </Stack>
          </Box>

          {/* Header Display Toggles */}
          <Box sx={{ ...cardSx, p: 2.5 }}>
            <SectionTitle icon={<IconEye size={20} />} title="Header Display" />
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
                <Slider value={config.logoSize} onChange={(_, v) => update({ logoSize: v as number })}
                  min={30} max={80} step={5} size="small"
                  sx={{ mt: 0.5, color: brand.primary[600] }} />
              </Box>
            )}
          </Box>

          {/* Meta Fields + Items & Totals row */}
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5}>
            <Box sx={{ ...cardSx, p: 2.5, flex: 1 }}>
              <SectionTitle icon={<IconNotes size={20} />} title="Meta Fields" />
              <ToggleGrid>
                <ToggleRow label="Reference"     checked={config.showRef}       onChange={toggle('showRef')} />
                <ToggleRow label="Date"          checked={config.showDate}      onChange={toggle('showDate')} />
                <ToggleRow label="Customer"      checked={config.showCustomer}  onChange={toggle('showCustomer')} />
                <ToggleRow label="Cashier"       checked={config.showSeller}    onChange={toggle('showSeller')} />
                <ToggleRow label="Warehouse"     checked={config.showWarehouse} onChange={toggle('showWarehouse')} />
              </ToggleGrid>
            </Box>

            <Box sx={{ ...cardSx, p: 2.5, flex: 1 }}>
              <SectionTitle icon={<IconCalculator size={20} />} title="Items & Totals" />
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
            </Box>
          </Stack>

          {/* Footer + Auto-print row */}
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5}>
            <Box sx={{ ...cardSx, p: 2.5, flex: 1 }}>
              <SectionTitle icon={<IconAlignBoxBottomLeft size={20} />} title="Footer" />
              <Stack spacing={1.5}>
                <FormControlLabel
                  control={<Switch checked={config.showFooter} onChange={(_, v) => update({ showFooter: v })} />}
                  label={<Typography sx={{ fontWeight: 700, fontSize: '0.82rem' }}>Show footer on receipt</Typography>}
                  sx={{ m: 0 }}
                />
                <TextField label="Footer Message" value={config.footerMessage}
                  onChange={(e) => update({ footerMessage: e.target.value })}
                  size="small" fullWidth sx={(theme) => fieldSx(theme)} />
              </Stack>
            </Box>

            <Box sx={{ ...cardSx, p: 2.5, flex: 1 }}>
              <SectionTitle icon={<IconPrinter size={20} />} title="Auto-print" />
              <FormControlLabel
                control={<Switch checked={config.autoPrint} onChange={(_, v) => update({ autoPrint: v })} />}
                label={<Typography sx={{ fontWeight: 700, fontSize: '0.84rem' }}>Auto-print receipt after sale</Typography>}
                sx={{ m: 0 }}
              />
            </Box>
          </Stack>

          {/* Floating save bar */}
          <Zoom in>
            <FloatingSaveBar
              saving={saving}
              onSave={handleSave}
              saveLabel="Save Preferences"
            />
          </Zoom>
        </Stack>
      )}
    </Box>
  );
}
