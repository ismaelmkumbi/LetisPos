import { useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { IconPalette, IconSparkles } from '@tabler/icons-react';
import { brand } from 'src/theme/smartpos/brand';
import {
  getBrandProfile,
  saveBrandProfile,
  aiGeneratePalette,
  type BrandProfile,
} from 'src/api/smartpos/brand';

interface Props {
  onComplete: () => void;
}

/**
 * Brand identity onboarding step. Collects business name + tagline,
 * suggests a palette via the AI endpoint, and saves the result. Logo
 * upload is intentionally deferred to a later step / the assistant —
 * we keep this screen short so tenants don't bounce.
 */
export default function BrandSetup({ onComplete }: Props) {
  const [, setProfile] = useState<BrandProfile | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [tagline, setTagline] = useState('');
  const [industry, setIndustry] = useState('Retail');
  const [palette, setPalette] = useState<string[]>([]);
  const [primary, setPrimary] = useState('#16A34A');
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getBrandProfile()
      .then((p) => {
        setProfile(p);
        setBusinessName(p.businessName || '');
        setTagline(p.tagline || '');
        setIndustry(p.industry || 'Retail');
        setPrimary(p.primaryColor || '#16A34A');
      })
      .catch(() => setError('Could not load your brand profile. Continuing with defaults.'));
  }, []);

  const handleGeneratePalette = async () => {
    if (!businessName.trim()) {
      setError('Set a business name first so the AI knows what to suggest.');
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      // Save current draft so the AI sees fresh context, then generate.
      await saveBrandProfile({ businessName: businessName.trim(), industry });
      const colors = await aiGeneratePalette();
      setPalette(colors || []);
      if (colors?.length) setPrimary(colors[0]);
    } catch (err) {
      setError('Palette generation failed. You can still pick a primary colour manually.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!businessName.trim()) {
      setError('Business name is required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await saveBrandProfile({
        businessName: businessName.trim(),
        tagline: tagline.trim(),
        industry,
        primaryColor: primary,
      });
      onComplete();
    } catch {
      setError('Could not save brand. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.5 }}>
        <Avatar sx={{ bgcolor: brand.primary[50], color: brand.primary[600], width: 32, height: 32 }}>
          <IconPalette size={18} />
        </Avatar>
        <Typography sx={{ fontWeight: 800, fontSize: 18 }}>Tell us about your brand</Typography>
      </Stack>
      <Typography sx={{ color: brand.neutral[500], fontSize: 14, mb: 2.5 }}>
        Your business name and colour appear on every invoice, receipt, and quotation.
        You can change everything later.
      </Typography>

      {error && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: '10px' }}>
          {error}
        </Alert>
      )}

      <Stack spacing={2.5}>
        <TextField
          label="Business name"
          placeholder="Letis Pharmacy"
          fullWidth
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
        />
        <TextField
          label="Tagline (optional)"
          placeholder="Quality you can trust"
          fullWidth
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
        />
        <TextField
          label="Industry"
          placeholder="Retail, Pharmacy, Restaurant…"
          fullWidth
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
        />

        <Box>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: brand.neutral[700] }}>
              Primary colour
            </Typography>
            <Button
              size="small"
              variant="text"
              onClick={handleGeneratePalette}
              disabled={generating}
              startIcon={<IconSparkles size={14} />}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              {generating ? 'Generating…' : 'Suggest a palette'}
            </Button>
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {(palette.length ? palette : [primary]).map((c) => (
              <Chip
                key={c}
                onClick={() => setPrimary(c)}
                label={c}
                sx={{
                  bgcolor: c,
                  color: '#fff',
                  fontWeight: 700,
                  border: c === primary ? `2px solid ${brand.neutral[900]}` : '2px solid transparent',
                  '&:hover': { bgcolor: c, opacity: 0.9 },
                }}
              />
            ))}
          </Stack>
        </Box>
      </Stack>

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={submitting || !businessName.trim()}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            bgcolor: brand.primary[600],
            '&:hover': { bgcolor: brand.primary[700] },
            borderRadius: '10px',
            px: 3,
          }}
        >
          {submitting ? 'Saving…' : 'Save & continue'}
        </Button>
      </Box>
    </Box>
  );
}
