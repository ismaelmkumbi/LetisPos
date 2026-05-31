/**
 * Brand Identity Page — tenant-level brand profile, logo, colors, typography,
 * social links, and live preview. Global settings that flow into all document
 * templates (invoices, receipts, quotations, etc.).
 */
import { useEffect, useState, useCallback } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Zoom,
} from '@mui/material';
import {
  IconPalette,
  IconTypography,
  IconWorld,
  IconPhoto,
  IconBuildingStore,
} from '@tabler/icons-react';
import PageHeader from 'src/components/smartpos/PageHeader';
import {
  cardSx,
  SectionTitle,
  Hint,
  FloatingSaveBar,
  CardSkeletonGroup,
} from 'src/components/smartpos/SettingsHelpers';
import { brand } from 'src/theme/smartpos/brand';
import type { Theme } from '@mui/material/styles';
import { premiumFieldSx } from 'src/components/smartpos/PosLayouts/shared';
import {
  getBrandProfile,
  saveBrandProfile,
  resetBrandProfile,
  type BrandProfile,
} from 'src/api/smartpos/brand';
import { tokenStore } from 'src/api/smartpos/client';
import BrandColorPicker from 'src/components/smartpos/brand/BrandColorPicker';
import BrandLogoUploader from 'src/components/smartpos/brand/BrandLogoUploader';
import AIBrandingAssistant from 'src/components/smartpos/assistant/AIBrandingAssistant';
import BrandPreviewPanel from 'src/branding/components/BrandPreviewPanel';
import PresetMarketplace from 'src/branding/components/PresetMarketplace';
import ApprovalWorkflow from 'src/branding/components/ApprovalWorkflow';
import BrandHealthCard from 'src/branding/components/BrandHealthCard';
import OnboardingWizard from 'src/branding/components/OnboardingWizard';
import CustomDomainSettings from 'src/branding/components/CustomDomainSettings';
import CampaignManager from 'src/branding/components/CampaignManager';
import BrandTimeline from 'src/branding/components/BrandTimeline';

// ── Helpers ────────────────────────────────────────────────────────────────

const fieldSx = (theme: Theme) => {
  const base = premiumFieldSx(theme);
  return { ...base, '& .MuiOutlinedInput-root': { ...base['& .MuiOutlinedInput-root'], borderRadius: '10px' } };
};

const toggleGroupSx = {
  '& .MuiToggleButton-root': {
    textTransform: 'none', fontWeight: 700, fontSize: '0.82rem', py: 0.8, px: 2, borderRadius: '8px',
  },
};

const FONT_FAMILIES = [
  'Inter, system-ui, sans-serif',
  'Geist, system-ui, sans-serif',
  'DM Sans, system-ui, sans-serif',
  'Plus Jakarta Sans, system-ui, sans-serif',
  'IBM Plex Sans, system-ui, sans-serif',
  'Source Serif 4, Georgia, serif',
  'JetBrains Mono, monospace',
];

const INDUSTRIES = [
  'Retail', 'Restaurant & Food', 'Wholesale', 'Pharmacy', 'Electronics',
  'Fashion & Apparel', 'Supermarket', 'Hardware', 'Beauty & Cosmetics',
  'Automotive', 'Healthcare', 'Education', 'Professional Services', 'Other',
];

const TONE_OPTIONS = [
  'Professional', 'Friendly', 'Luxury', 'Minimal', 'Bold',
  'Playful', 'Technical', 'Warm', 'Corporate',
];

// ── Page ───────────────────────────────────────────────────────────────────

export default function BrandIdentityPage() {
  const [profile, setProfile] = useState<BrandProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [lastSavedProfile, setLastSavedProfile] = useState<BrandProfile | null>(null);

  const tenantId = tokenStore.getTenantId();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getBrandProfile()
      .then((p) => {
        if (!cancelled) {
          setProfile(p);
          setLastSavedProfile(p);
        }
      })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load brand profile'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tenantId]); // Re-fetch when tenant changes

  const update = useCallback((patch: Partial<BrandProfile>) => {
    setProfile((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const showInfo = (msg: string) => { setInfo(msg); setTimeout(() => setInfo(null), 3500); };

  const profileSignature = (p: BrandProfile | null) => {
    if (!p) return '';
    return JSON.stringify({
      id: p.id,
      tenantId: p.tenantId,
      businessName: p.businessName,
      tagline: p.tagline,
      description: p.description,
      industry: p.industry,
      brandTone: p.brandTone,
      primaryColor: p.primaryColor,
      secondaryColor: p.secondaryColor,
      accentColor: p.accentColor,
      fontFamily: p.fontFamily,
      typographyScale: p.typographyScale,
      logoUrl: p.logoUrl,
      logoSvgUrl: p.logoSvgUrl,
      logoMonochromeUrl: p.logoMonochromeUrl,
      logoThermalUrl: p.logoThermalUrl,
      faviconUrl: p.faviconUrl,
      watermarkUrl: p.watermarkUrl,
      stampUrl: p.stampUrl,
      signatureUrl: p.signatureUrl,
      qrCodeUrl: p.qrCodeUrl,
      website: p.website,
      facebook: p.facebook,
      instagram: p.instagram,
      twitter: p.twitter,
      linkedin: p.linkedin,
    });
  };

  const isDirty = profileSignature(profile) !== profileSignature(lastSavedProfile);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const [resetOpen, setResetOpen] = useState(false);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await saveBrandProfile({
        businessName: profile.businessName,
        tagline: profile.tagline,
        description: profile.description,
        industry: profile.industry,
        brandTone: profile.brandTone,
        primaryColor: profile.primaryColor,
        secondaryColor: profile.secondaryColor,
        accentColor: profile.accentColor,
        fontFamily: profile.fontFamily,
        typographyScale: profile.typographyScale,
        logoUrl: profile.logoUrl,
        logoSvgUrl: profile.logoSvgUrl,
        logoMonochromeUrl: profile.logoMonochromeUrl,
        logoThermalUrl: profile.logoThermalUrl,
        faviconUrl: profile.faviconUrl,
        watermarkUrl: profile.watermarkUrl,
        stampUrl: profile.stampUrl,
        signatureUrl: profile.signatureUrl,
        qrCodeUrl: profile.qrCodeUrl,
        website: profile.website,
        facebook: profile.facebook,
        instagram: profile.instagram,
        twitter: profile.twitter,
        linkedin: profile.linkedin,
      });
      setProfile(updated);
      setLastSavedProfile(updated);
      showInfo('Brand identity saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setResetOpen(false);
    setResetting(true);
    try {
      const defaults = await resetBrandProfile();
      setProfile(defaults);
      setLastSavedProfile(defaults);
      showInfo('Brand reset to defaults.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reset failed');
    } finally {
      setResetting(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Box>
        <PageHeader
          title="Brand Identity"
          subtitle="Your business identity flows into every receipt, invoice, and customer document"
          badge={{ label: 'Global', tone: 'primary' }}
        />
        <CardSkeletonGroup heights={[220, 180, 160, 200, 140]} count={5} />
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box>
        <PageHeader title="Brand Identity" subtitle="Business profile & visual identity" />
        <Alert severity="warning">Failed to load brand profile. Check your connection.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title="Brand Identity"
        subtitle="Your business identity flows into every receipt, invoice, and customer document"
        badge={{ label: 'Global', tone: 'primary' }}
        actions={[
          {
            label: assistantOpen ? 'Close Advisor' : 'Brand Advisor',
            icon: <IconPalette size={18} />,
            onClick: () => setAssistantOpen((v) => !v),
            variant: 'accent',
          },
        ]}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {info && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setInfo(null)}>{info}</Alert>}

      {/* AI Assistant panel (conditionally rendered) */}
      {assistantOpen && (
        <Box sx={{ mb: 2.5 }}>
          <AIBrandingAssistant
            profile={profile}
            onProfileChange={update}
            onClose={() => setAssistantOpen(false)}
          />
        </Box>
      )}

      <Stack spacing={2.5} sx={{ maxWidth: 1680, mx: 'auto' }}>
        {/* Row: Business Profile + Live Preview */}
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5}>
          {/* Business Profile */}
          <Box sx={{ ...cardSx, p: 2.5, flex: 1 }}>
            <SectionTitle icon={<IconBuildingStore size={20} />} title="Business Profile" />
            <Stack spacing={1.5}>
              <TextField
                label="Business Name"
                value={profile.businessName}
                onChange={(e) => update({ businessName: e.target.value })}
                size="small"
                fullWidth
                sx={(theme) => fieldSx(theme)}
                placeholder="e.g. Letis Electronics"
              />
              <TextField
                label="Tagline"
                value={profile.tagline}
                onChange={(e) => update({ tagline: e.target.value })}
                size="small"
                fullWidth
                sx={(theme) => fieldSx(theme)}
                placeholder="e.g. Quality you can trust"
              />
              <TextField
                label="Brand Description"
                value={profile.description}
                onChange={(e) => update({ description: e.target.value })}
                size="small"
                fullWidth
                multiline
                minRows={2}
                sx={(theme) => fieldSx(theme)}
                placeholder="Brief description of your business for AI context..."
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  select
                  label="Industry"
                  value={profile.industry}
                  onChange={(e) => update({ industry: e.target.value })}
                  size="small"
                  sx={(theme) => ({ flex: 1, ...fieldSx(theme) })}
                >
                  {INDUSTRIES.map((ind) => (
                    <MenuItem key={ind} value={ind}>{ind}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Brand Tone"
                  value={profile.brandTone}
                  onChange={(e) => update({ brandTone: e.target.value })}
                  size="small"
                  sx={(theme) => ({ flex: 1, ...fieldSx(theme) })}
                >
                  {TONE_OPTIONS.map((t) => (
                    <MenuItem key={t} value={t}>{t}</MenuItem>
                  ))}
                </TextField>
              </Stack>
            </Stack>
          </Box>

          {/* Live Preview — multi-surface */}
          <Box sx={{ flex: 1 }}>
            <BrandPreviewPanel />
          </Box>
        </Stack>

        {/* Row: Logo Upload + Colors */}
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5}>
          {/* Logo Upload */}
          <Box sx={{ ...cardSx, p: 2.5, flex: 1 }}>
            <SectionTitle icon={<IconPhoto size={20} />} title="Logo & Brand Assets" />
            <BrandLogoUploader profile={profile} onProfileChange={update} />

            {/* Additional asset URLs */}
            <Stack spacing={1.5} sx={{ mt: 2 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: brand.neutral[500], textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Additional Assets
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  label="Watermark URL"
                  value={profile.watermarkUrl}
                  onChange={(e) => update({ watermarkUrl: e.target.value })}
                  size="small"
                  fullWidth
                  sx={(theme) => fieldSx(theme)}
                  placeholder="https://..."
                />
                <TextField
                  label="Stamp / Seal URL"
                  value={profile.stampUrl}
                  onChange={(e) => update({ stampUrl: e.target.value })}
                  size="small"
                  fullWidth
                  sx={(theme) => fieldSx(theme)}
                  placeholder="https://..."
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  label="Signature URL"
                  value={profile.signatureUrl}
                  onChange={(e) => update({ signatureUrl: e.target.value })}
                  size="small"
                  fullWidth
                  sx={(theme) => fieldSx(theme)}
                  placeholder="https://..."
                />
                <TextField
                  label="QR Code URL"
                  value={profile.qrCodeUrl}
                  onChange={(e) => update({ qrCodeUrl: e.target.value })}
                  size="small"
                  fullWidth
                  sx={(theme) => fieldSx(theme)}
                  placeholder="https://..."
                />
              </Stack>
            </Stack>
          </Box>

          {/* Colors */}
          <Box sx={{ ...cardSx, p: 2.5, flex: 1 }}>
            <SectionTitle icon={<IconPalette size={20} />} title="Brand Colors" />
            <Stack spacing={2}>
              <BrandColorPicker
                label="Primary Color"
                value={profile.primaryColor}
                onChange={(c) => update({ primaryColor: c })}
                hint="Main brand color — header bars, primary buttons, emphasis"
              />
              <BrandColorPicker
                label="Secondary Color"
                value={profile.secondaryColor}
                onChange={(c) => update({ secondaryColor: c })}
                hint="Text, icons, secondary elements"
              />
              <BrandColorPicker
                label="Accent Color"
                value={profile.accentColor}
                onChange={(c) => update({ accentColor: c })}
                hint="Highlights, badges, call-to-action accents"
              />
            </Stack>

            {/* Color preview bar */}
            <Box sx={{ mt: 2.5, display: 'flex', gap: 1, borderRadius: '10px', overflow: 'hidden', height: 8 }}>
              <Box sx={{ flex: 2, bgcolor: profile.primaryColor, transition: 'background 0.3s' }} />
              <Box sx={{ flex: 1, bgcolor: profile.secondaryColor, transition: 'background 0.3s' }} />
              <Box sx={{ flex: 1, bgcolor: profile.accentColor, transition: 'background 0.3s' }} />
            </Box>
          </Box>
        </Stack>

        {/* Row: Typography + Social Links */}
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5}>
          {/* Typography */}
          <Box sx={{ ...cardSx, p: 2.5, flex: 1 }}>
            <SectionTitle icon={<IconTypography size={20} />} title="Typography" />
            <Stack spacing={1.5}>
              <TextField
                select
                label="Font Family"
                value={profile.fontFamily}
                onChange={(e) => update({ fontFamily: e.target.value })}
                size="small"
                fullWidth
                sx={(theme) => ({ maxWidth: 400, ...fieldSx(theme) })}
              >
                {FONT_FAMILIES.map((f) => (
                  <MenuItem key={f} value={f} sx={{ fontFamily: f }}>
                    {f}
                  </MenuItem>
                ))}
              </TextField>

              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Typography Scale
                  <Hint text="Controls text density across all generated documents." />
                </Typography>
                <ToggleButtonGroup
                  value={profile.typographyScale}
                  exclusive
                  size="small"
                  onChange={(_, v) => v && update({ typographyScale: v })}
                  sx={toggleGroupSx}
                >
                  <ToggleButton value="compact">Compact</ToggleButton>
                  <ToggleButton value="default">Default</ToggleButton>
                  <ToggleButton value="spacious">Spacious</ToggleButton>
                </ToggleButtonGroup>
              </Box>

              {/* Font preview */}
              <Box
                sx={{
                  mt: 1,
                  p: 2,
                  borderRadius: '10px',
                  bgcolor: brand.neutral[50],
                  border: `1px solid ${brand.neutral[100]}`,
                  fontFamily: profile.fontFamily,
                }}
              >
                <Typography sx={{ fontSize: '1.1rem', fontWeight: 800, color: profile.primaryColor }}>
                  {profile.businessName || 'Business Name'}
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: brand.neutral[500], mt: 0.25 }}>
                  ABCDEFGHIJKLMNOPQRSTUVWXYZ · 0123456789
                </Typography>
              </Box>
            </Stack>
          </Box>

          {/* Social Links + Website */}
          <Box sx={{ ...cardSx, p: 2.5, flex: 1 }}>
            <SectionTitle icon={<IconWorld size={20} />} title="Web & Social Links" />
            <Stack spacing={1.5}>
              <TextField
                label="Website"
                value={profile.website}
                onChange={(e) => update({ website: e.target.value })}
                size="small"
                fullWidth
                sx={(theme) => fieldSx(theme)}
                placeholder="https://yourbusiness.com"
                InputProps={{
                  startAdornment: <InputAdornment position="start">🌐</InputAdornment>,
                }}
              />
              <TextField
                label="Facebook"
                value={profile.facebook}
                onChange={(e) => update({ facebook: e.target.value })}
                size="small"
                fullWidth
                sx={(theme) => fieldSx(theme)}
                placeholder="https://facebook.com/..."
              />
              <TextField
                label="Instagram"
                value={profile.instagram}
                onChange={(e) => update({ instagram: e.target.value })}
                size="small"
                fullWidth
                sx={(theme) => fieldSx(theme)}
                placeholder="https://instagram.com/..."
              />
              <TextField
                label="Twitter / X"
                value={profile.twitter}
                onChange={(e) => update({ twitter: e.target.value })}
                size="small"
                fullWidth
                sx={(theme) => fieldSx(theme)}
                placeholder="https://x.com/..."
              />
              <TextField
                label="LinkedIn"
                value={profile.linkedin}
                onChange={(e) => update({ linkedin: e.target.value })}
                size="small"
                fullWidth
                sx={(theme) => fieldSx(theme)}
                placeholder="https://linkedin.com/company/..."
              />
            </Stack>
          </Box>
        </Stack>

        {/* AI Onboarding + Health */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5}>
          <Box sx={{ ...cardSx, p: 2.5, flex: 1 }}>
            <OnboardingWizard />
          </Box>
          <Box sx={{ flex: 1 }}>
            <BrandHealthCard />
          </Box>
        </Stack>

        {/* Approval + Timeline */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5}>
          <Box sx={{ flex: 1 }}>
            <ApprovalWorkflow />
          </Box>
          <Box sx={{ ...cardSx, p: 2.5, flex: 1 }}>
            <BrandTimeline />
          </Box>
        </Stack>

        {/* Preset Marketplace */}
        <Box sx={{ ...cardSx, p: 2.5 }}>
          <PresetMarketplace />
        </Box>

        {/* Custom Domain + Campaigns */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5}>
          <Box sx={{ ...cardSx, p: 2.5, flex: 1 }}>
            <CustomDomainSettings />
          </Box>
          <Box sx={{ flex: 1 }}>
            <CampaignManager />
          </Box>
        </Stack>

        {/* Floating save bar */}
        <Zoom in>
          <FloatingSaveBar
            saving={saving}
            onSave={handleSave}
            onReset={() => setResetOpen(true)}
            resetting={resetting}
            dirty={isDirty}
            saveLabel="Save Brand Identity"
            lastSavedAt={profile.updatedAt ? new Date(profile.updatedAt).toLocaleString() : undefined}
          />
        </Zoom>

        {/* Reset confirmation dialog */}
        <Dialog open={resetOpen} onClose={() => setResetOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>Reset brand identity?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              This will reset all brand settings — logo, colors, fonts, business name — to their defaults. This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setResetOpen(false)} sx={{ textTransform: 'none', fontWeight: 600 }}>
              Cancel
            </Button>
            <Button onClick={handleReset} color="error" variant="contained" sx={{ textTransform: 'none', fontWeight: 700 }}>
              Reset All
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </Box>
  );
}
