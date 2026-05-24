/**
 * Document Theme Page — per-document-type brand overrides persisted to server.
 * Inherits from Brand Profile; overridden fields are stored per doc type.
 */
import { useEffect, useState, useCallback } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent,
  DialogContentText, DialogTitle,
  Stack, Tab, Tabs, ToggleButton, ToggleButtonGroup, Typography, Zoom,
} from '@mui/material';
import {
  IconFileInvoice, IconReceipt, IconQuotes, IconTruckDelivery,
  IconReport, IconEye,
} from '@tabler/icons-react';
import PageHeader from 'src/components/smartpos/PageHeader';
import {
  cardSx, SectionTitle, FloatingSaveBar, CardSkeletonGroup,
} from 'src/components/smartpos/SettingsHelpers';
import { brand } from 'src/theme/smartpos/brand';
import { getBrandProfile, type BrandProfile } from 'src/api/smartpos/brand';
import { api } from 'src/api/smartpos/client';
import BrandColorPicker from 'src/components/smartpos/brand/BrandColorPicker';
import BrandLivePreview from 'src/components/smartpos/brand/BrandLivePreview';

// ── Types ──────────────────────────────────────────────────────────────────

interface DocThemeOverride {
  docType: string;
  primaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  headerStyle?: string;
  showWatermark?: boolean;
  showQrCode?: boolean;
}

const DOC_TYPES = [
  { key: 'invoice', label: 'Invoice', icon: <IconFileInvoice size={18} /> },
  { key: 'receipt', label: 'Receipt', icon: <IconReceipt size={18} /> },
  { key: 'quotation', label: 'Quotation', icon: <IconQuotes size={18} /> },
  { key: 'delivery_note', label: 'Delivery Note', icon: <IconTruckDelivery size={18} /> },
  { key: 'statement', label: 'Statement', icon: <IconReport size={18} /> },
] as const;

const DEFAULT_OVERRIDE: DocThemeOverride = {
  docType: '',
  headerStyle: 'solid',
  showWatermark: false,
  showQrCode: false,
};

const toggleGroupSx = {
  '& .MuiToggleButton-root': {
    textTransform: 'none', fontWeight: 700, fontSize: '0.82rem', py: 0.8, px: 2, borderRadius: '8px',
  },
};

// ── API helpers ────────────────────────────────────────────────────────────
async function fetchThemes(): Promise<DocThemeOverride[]> {
  const { data } = await api.get<DocThemeOverride[]>('/api/v1/brand/document-themes');
  return data;
}
async function saveThemes(themes: DocThemeOverride[]): Promise<DocThemeOverride[]> {
  const { data } = await api.put<DocThemeOverride[]>('/api/v1/brand/document-themes', themes);
  return data;
}
async function resetThemes(): Promise<void> {
  await api.post('/api/v1/brand/document-themes/reset');
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function DocumentThemePage() {
  const [profile, setProfile] = useState<BrandProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDoc, setActiveDoc] = useState<string>('invoice');
  const [overrides, setOverrides] = useState<Record<string, DocThemeOverride>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [p, themes] = await Promise.all([getBrandProfile(), fetchThemes()]);
        if (cancelled) return;
        setProfile(p);
        const map: Record<string, DocThemeOverride> = {};
        for (const t of themes) map[t.docType] = t;
        setOverrides(map);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const currentOverride: DocThemeOverride = overrides[activeDoc] || { ...DEFAULT_OVERRIDE, docType: activeDoc };

  const updateOverride = useCallback(
    (patch: Partial<DocThemeOverride>) => {
      setOverrides((prev) => ({
        ...prev,
        [activeDoc]: { ...(prev[activeDoc] || DEFAULT_OVERRIDE), docType: activeDoc, ...patch },
      }));
    },
    [activeDoc],
  );

  const showInfo = (msg: string) => { setInfo(msg); setTimeout(() => setInfo(null), 3500); };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const themes = Object.values(overrides).filter((t) => t.docType);
      await saveThemes(themes);
      showInfo('Document themes saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setResetOpen(false);
    setSaving(true);
    try {
      await resetThemes();
      setOverrides({});
      showInfo('Themes reset to brand defaults.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reset failed');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Box>
        <PageHeader title="Document Themes" subtitle="Per-document brand overrides" />
        <CardSkeletonGroup heights={[120, 200, 160]} count={3} />
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box>
        <PageHeader title="Document Themes" />
        <Alert severity="warning">Set up your Brand Identity first before customizing document themes.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title="Document Themes"
        subtitle="Per-document brand overrides — colors, layout, and display options for each document type"
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {info && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setInfo(null)}>{info}</Alert>}

      <Stack spacing={2.5} sx={{ maxWidth: 1680, mx: 'auto' }}>
        {/* Document type tabs */}
        <Box sx={{ ...cardSx, p: 2.5 }}>
          <SectionTitle icon={<IconFileInvoice size={20} />} title="Document Type" />
          <Tabs
            value={activeDoc}
            onChange={(_, v) => setActiveDoc(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ mt: 1 }}
          >
            {DOC_TYPES.map((doc) => (
              <Tab key={doc.key} value={doc.key} label={doc.label}
                icon={doc.icon} iconPosition="start"
                sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.82rem', minHeight: 44 }}
              />
            ))}
          </Tabs>
        </Box>

        {/* Overrides + preview */}
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5}>
          <Box sx={{ ...cardSx, p: 2.5, flex: 1 }}>
            <SectionTitle
              icon={<IconEye size={20} />}
              title={`${DOC_TYPES.find((d) => d.key === activeDoc)?.label} Theme`}
            />
            <Stack spacing={2}>
              <BrandColorPicker
                label="Primary Color Override"
                value={currentOverride.primaryColor || profile.primaryColor}
                onChange={(c) => updateOverride({ primaryColor: c })}
                hint="Inherits from Brand Identity if not set."
              />
              <BrandColorPicker
                label="Accent Color Override"
                value={currentOverride.accentColor || profile.accentColor}
                onChange={(c) => updateOverride({ accentColor: c })}
              />

              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Header Style</Typography>
                <ToggleButtonGroup
                  value={currentOverride.headerStyle || 'solid'}
                  exclusive size="small"
                  onChange={(_, v) => v && updateOverride({ headerStyle: v })}
                  sx={toggleGroupSx}
                >
                  <ToggleButton value="solid">Solid Bar</ToggleButton>
                  <ToggleButton value="minimal">Minimal</ToggleButton>
                  <ToggleButton value="detailed">Detailed</ToggleButton>
                </ToggleButtonGroup>
              </Box>

              <Stack spacing={1}>
                {[
                  { key: 'showWatermark' as const, label: 'Show watermark' },
                  { key: 'showQrCode' as const, label: 'Show QR code' },
                ].map((tog) => (
                  <Box
                    key={tog.key}
                    onClick={() => updateOverride({ [tog.key]: !currentOverride[tog.key] })}
                    sx={{
                      p: 1.5, borderRadius: '10px',
                      border: `1px solid ${currentOverride[tog.key] ? brand.primary[300] : brand.neutral[200]}`,
                      bgcolor: currentOverride[tog.key] ? brand.primary[50] + 'CC' : '#fff',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      transition: 'all 0.2s',
                      '&:hover': { borderColor: brand.primary[400] },
                    }}
                  >
                    <Typography sx={{ fontWeight: 600, fontSize: '0.82rem' }}>{tog.label}</Typography>
                    <Box sx={{
                      width: 44, height: 24, borderRadius: '12px',
                      bgcolor: currentOverride[tog.key] ? brand.primary[600] : brand.neutral[300],
                      position: 'relative', transition: 'background 0.2s',
                      '&::after': {
                        content: '""', position: 'absolute', top: 2, width: 20, height: 20,
                        borderRadius: '50%', bgcolor: '#fff', transition: 'left 0.2s ease',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        left: currentOverride[tog.key] ? 22 : 2,
                      },
                    }} />
                  </Box>
                ))}
              </Stack>
            </Stack>
          </Box>

          <Box sx={{ flex: 1 }}>
            <Typography sx={{ mb: 1, fontWeight: 700, fontSize: '0.78rem', color: brand.neutral[500], textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Live Preview
            </Typography>
            <Box sx={{ maxWidth: 360, mx: 'auto' }}>
              <BrandLivePreview
                profile={{
                  ...profile,
                  primaryColor: currentOverride.primaryColor || profile.primaryColor,
                  accentColor: currentOverride.accentColor || profile.accentColor,
                  fontFamily: currentOverride.fontFamily || profile.fontFamily,
                }}
              />
            </Box>
          </Box>
        </Stack>

        <Zoom in>
          <FloatingSaveBar
            saving={saving}
            onSave={handleSave}
            onReset={() => setResetOpen(true)}
            saveLabel="Save Document Themes"
          />
        </Zoom>
      </Stack>

      {/* Reset confirmation */}
      <Dialog open={resetOpen} onClose={() => setResetOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Reset all themes?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will remove all per-document overrides and revert to brand defaults for every document type.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setResetOpen(false)} sx={{ textTransform: 'none', fontWeight: 600 }}>Cancel</Button>
          <Button onClick={handleReset} color="error" variant="contained" sx={{ textTransform: 'none', fontWeight: 700 }}>Reset All</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
