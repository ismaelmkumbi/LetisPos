/**
 * Receipt Settings Page — configure receipt layout, paper size, and all
 * display toggles matching the server-side pos_settings table.
 *
 * Moved from the POS terminal footer modal to its own settings page
 * at /smartpos/settings/receipt.
 */
import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
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

export default function ReceiptSettingsPage() {
  const [config, setConfig] = useState<ReceiptConfig>(() => getReceiptConfig());

  useEffect(() => {
    setConfig(getReceiptConfig());
  }, []);

  const update = (patch: Partial<ReceiptConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  };

  const handleSave = () => {
    saveReceiptConfig(config);
  };

  const toggle = (field: keyof ReceiptConfig) => () => {
    update({ [field]: !(config[field] as any) as any });
  };

  return (
    <Box>
      <PageHeader
        title="Receipt Settings"
        subtitle="Thermal or A4 layout, store info & visible fields"
      />

      <Stack spacing={2.5} sx={{ maxWidth: 720 }}>
        {/* ── Layout & Paper ── */}
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

        {/* ── Store Info ── */}
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

        {/* ── Header Display Toggles ── */}
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

        {/* ── Meta Field Toggles ── */}
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

        {/* ── Item & Totals Toggles ── */}
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

        {/* ── Footer ── */}
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

        {/* ── Auto-print ── */}
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

        {/* ── Save ── */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', pb: 4 }}>
          <Button
            variant="contained"
            onClick={handleSave}
            startIcon={<IconCheck size={18} />}
            sx={{
              textTransform: 'none',
              fontWeight: 800,
              borderRadius: '10px',
              px: 3,
            }}
          >
            Save Preferences
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="caption" sx={{ fontWeight: 700, color: brand.neutral[500], mb: 0.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
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

const toggleGroupSx = {
  '& .MuiToggleButton-root': {
    textTransform: 'none',
    fontWeight: 700,
    fontSize: '0.78rem',
    py: 0.8,
  },
};
