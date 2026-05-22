/**
 * Document Theme Page — applies brand identity colors, typography, and logo
 * across all document templates. Provides per-document-type overrides.
 */
import { useEffect, useState, useCallback } from 'react';
import {
  Alert,
  Box,
  Stack,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Zoom,
} from '@mui/material';
import {
  IconFileInvoice,
  IconReceipt,
  IconQuotes,
  IconTruckDelivery,
  IconReport,
  IconEye,
} from '@tabler/icons-react';
import PageHeader from 'src/components/smartpos/PageHeader';
import {
  cardSx,
  SectionTitle,
  FloatingSaveBar,
  CardSkeletonGroup,
} from 'src/components/smartpos/SettingsHelpers';
import { brand } from 'src/theme/smartpos/brand';
import { getBrandProfile, type BrandProfile } from 'src/api/smartpos/brand';
import BrandColorPicker from 'src/components/smartpos/brand/BrandColorPicker';
import BrandLivePreview from 'src/components/smartpos/brand/BrandLivePreview';

// ── Document types ──────────────────────────────────────────────────────────

const DOC_TYPES = [
  { key: 'invoice', label: 'Invoice', icon: <IconFileInvoice size={18} /> },
  { key: 'receipt', label: 'Receipt', icon: <IconReceipt size={18} /> },
  { key: 'quotation', label: 'Quotation', icon: <IconQuotes size={18} /> },
  { key: 'delivery_note', label: 'Delivery Note', icon: <IconTruckDelivery size={18} /> },
  { key: 'statement', label: 'Statement', icon: <IconReport size={18} /> },
] as const;

const toggleGroupSx = {
  '& .MuiToggleButton-root': {
    textTransform: 'none', fontWeight: 700, fontSize: '0.82rem', py: 0.8, px: 2, borderRadius: '8px',
  },
};

// ── Theme overrides (per doc type) ─────────────────────────────────────────

interface DocThemeOverride {
  primaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  headerStyle?: 'solid' | 'minimal' | 'detailed';
  showWatermark?: boolean;
  showQrCode?: boolean;
}

const DEFAULT_OVERRIDE: DocThemeOverride = {
  headerStyle: 'solid',
  showWatermark: false,
  showQrCode: false,
};

// ── Page ───────────────────────────────────────────────────────────────────

export default function DocumentThemePage() {
  const [profile, setProfile] = useState<BrandProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDoc, setActiveDoc] = useState<string>('invoice');
  const [overrides, setOverrides] = useState<Record<string, DocThemeOverride>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getBrandProfile()
      .then((p) => {
        if (!cancelled) {
          setProfile(p);
          // Load overrides from localStorage for now (will migrate to API)
          try {
            const saved = localStorage.getItem('brand:doc-theme-overrides');
            if (saved) setOverrides(JSON.parse(saved));
          } catch { /* ignore */ }
        }
      })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const currentOverride = overrides[activeDoc] || DEFAULT_OVERRIDE;

  const updateOverride = useCallback(
    (patch: Partial<DocThemeOverride>) => {
      setOverrides((prev) => ({
        ...prev,
        [activeDoc]: { ...(prev[activeDoc] || DEFAULT_OVERRIDE), ...patch },
      }));
    },
    [activeDoc],
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      localStorage.setItem('brand:doc-theme-overrides', JSON.stringify(overrides));
      setInfo('Document themes saved.');
      setTimeout(() => setInfo(null), 3000);
    } catch {
      setError('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setOverrides({});
    localStorage.removeItem('brand:doc-theme-overrides');
    setInfo('Themes reset to brand defaults.');
    setTimeout(() => setInfo(null), 3000);
  };

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Box>
        <PageHeader title="Document Themes" subtitle="Brand colors, typography & layout per document type" />
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
        subtitle="Brand colors, typography, and layout overrides per document type"
        badge={{ label: 'Beta', tone: 'primary' }}
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
              <Tab
                key={doc.key}
                value={doc.key}
                label={doc.label}
                icon={doc.icon}
                iconPosition="start"
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  minHeight: 44,
                }}
              />
            ))}
          </Tabs>
        </Box>

        {/* Per-document overrides + preview */}
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5}>
          {/* Overrides */}
          <Box sx={{ ...cardSx, p: 2.5, flex: 1 }}>
            <SectionTitle icon={<IconEye size={20} />} title={`${DOC_TYPES.find((d) => d.key === activeDoc)?.label} Theme`} />
            <Stack spacing={2}>
              <BrandColorPicker
                label="Primary Color Override"
                value={currentOverride.primaryColor || profile.primaryColor}
                onChange={(c) => updateOverride({ primaryColor: c })}
                hint="Leave as brand default to inherit from Brand Identity."
              />
              <BrandColorPicker
                label="Accent Color Override"
                value={currentOverride.accentColor || profile.accentColor}
                onChange={(c) => updateOverride({ accentColor: c })}
              />

              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Header Style
                </Typography>
                <ToggleButtonGroup
                  value={currentOverride.headerStyle || 'solid'}
                  exclusive
                  size="small"
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
                  { key: 'showWatermark', label: 'Show watermark on this document' },
                  { key: 'showQrCode', label: 'Show QR code' },
                ].map((tog) => (
                  <Box
                    key={tog.key}
                    onClick={() =>
                      updateOverride({
                        [tog.key]: !(currentOverride[tog.key as keyof DocThemeOverride] as boolean),
                      })
                    }
                    sx={{
                      p: 1.5,
                      borderRadius: '10px',
                      border: `1px solid ${(currentOverride[tog.key as keyof DocThemeOverride] as boolean) ? brand.primary[300] : brand.neutral[200]}`,
                      bgcolor: (currentOverride[tog.key as keyof DocThemeOverride] as boolean) ? brand.primary[50] + 'CC' : '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s',
                      '&:hover': { borderColor: brand.primary[400] },
                    }}
                  >
                    <Typography sx={{ fontWeight: 600, fontSize: '0.82rem' }}>
                      {tog.label}
                    </Typography>
                    <Box
                      sx={{
                        width: 44,
                        height: 24,
                        borderRadius: '12px',
                        bgcolor: (currentOverride[tog.key as keyof DocThemeOverride] as boolean)
                          ? brand.primary[600] : brand.neutral[300],
                        position: 'relative',
                        transition: 'background 0.2s',
                        '&::after': {
                          content: '""',
                          position: 'absolute',
                          top: 2,
                          left: (currentOverride[tog.key as keyof DocThemeOverride] as boolean) ? 22 : 2,
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          bgcolor: '#fff',
                          transition: 'left 0.2s ease',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        },
                      }}
                    />
                  </Box>
                ))}
              </Stack>
            </Stack>
          </Box>

          {/* Preview */}
          <Box sx={{ flex: 1 }}>
            <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconEye size={18} color={brand.neutral[500]} />
              <Typography sx={{ fontWeight: 700, fontSize: '0.78rem', color: brand.neutral[500], textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Live Preview
              </Typography>
            </Box>
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

        {/* Floating save bar */}
        <Zoom in>
          <FloatingSaveBar
            saving={saving}
            onSave={handleSave}
            onReset={handleReset}
            saveLabel="Save Document Themes"
          />
        </Zoom>
      </Stack>
    </Box>
  );
}
