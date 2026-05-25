/**
 * BrandLogoUploader — drag-and-drop logo upload with preview, analysis trigger,
 * and variant display (monochrome, thermal, favicon thumbnails).
 */
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Button, Chip, CircularProgress, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { IconSparkles, IconPhoto } from '@tabler/icons-react';
import { brand, brandTokens } from 'src/theme/smartpos/brand';
import type { BrandProfile, BrandAsset } from 'src/api/smartpos/brand';
import { uploadBrandAsset, aiAnalyzeLogo, aiGenerateLogoVariants } from 'src/api/smartpos/brand';

interface BrandLogoUploaderProps {
  profile: BrandProfile;
  onProfileChange: (patch: Partial<BrandProfile>) => void;
}

const VARIANT_LABELS: Record<string, string> = {
  original: 'Original',
  monochrome: 'Mono',
  thermal: 'Thermal',
  favicon: 'Favicon',
  thumbnail: 'Thumb',
};

const escapeXml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const svgDataUri = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const initialsFor = (name: string) => {
  const clean = name.trim();
  if (!clean) return 'LP';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const industrySymbol = (industry: string, description: string, color: string) => {
  const context = `${industry} ${description}`.toLowerCase();
  if (context.includes('pharmacy') || context.includes('health')) {
    return `<path d="M388 150h36v40h40v36h-40v40h-36v-40h-40v-36h40z" fill="${color}" opacity=".96"/>`;
  }
  if (context.includes('restaurant') || context.includes('food')) {
    return `<path d="M374 154h12v100h-12zm28 0h12v100h-12zm28 0h12v100h-12zm-56 48h68v18h-68z" fill="${color}" opacity=".96"/>`;
  }
  if (context.includes('fashion') || context.includes('apparel')) {
    return `<path d="M352 186l36-30h40l36 30-22 26-16-13v58h-68v-58l-16 13z" fill="${color}" opacity=".96"/>`;
  }
  if (context.includes('hardware') || context.includes('automotive')) {
    return `<path d="M364 246l74-74 22 22-74 74zm3-79l18-18 25 25-18 18z" fill="${color}" opacity=".96"/>`;
  }
  if (context.includes('education')) {
    return `<path d="M346 190l58-28 58 28-58 28zm24 24l34 16 34-16v36l-34 16-34-16z" fill="${color}" opacity=".96"/>`;
  }
  return `<rect x="352" y="162" width="92" height="92" rx="18" fill="${color}" opacity=".96"/><path d="M372 204h52M372 226h36" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity=".85"/>`;
};

const buildLetisStyleLogoSvg = (
  profile: BrandProfile,
  description: string,
  mode: 'full' | 'mono' | 'thermal' | 'favicon',
) => {
  const primary = mode === 'thermal' || mode === 'mono' ? '#111827' : profile.primaryColor || brand.primary[600];
  const secondary = mode === 'thermal' || mode === 'mono' ? '#111827' : profile.secondaryColor || brand.neutral[700];
  const accent = mode === 'thermal' || mode === 'mono' ? '#111827' : profile.accentColor || brand.primary[300];
  const surface = mode === 'thermal' ? '#FFFFFF' : '#F8FAFC';
  const businessName = escapeXml(profile.businessName || 'My Business');
  const tagline = escapeXml(profile.tagline || profile.industry || 'Powered by Letis POS');
  const initials = escapeXml(initialsFor(profile.businessName));
  const symbol = industrySymbol(profile.industry, description, mode === 'thermal' ? '#111827' : accent);
  const showText = mode === 'full';
  const showGradient = mode === 'full' || mode === 'favicon';

  return `
<svg width="640" height="240" viewBox="0 0 640 240" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="tenantLogoGradient" x1="32" y1="28" x2="200" y2="204" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${showGradient ? primary : secondary}"/>
      <stop offset="1" stop-color="${showGradient ? brand.primary[600] : secondary}"/>
    </linearGradient>
  </defs>
  <rect width="640" height="240" rx="34" fill="${mode === 'thermal' ? '#FFFFFF' : surface}"/>
  <rect x="32" y="28" width="184" height="184" rx="44" fill="${showGradient ? 'url(#tenantLogoGradient)' : primary}"/>
  <path d="M88 70v92h72l22-22-22-8h-34V70z" fill="#fff" opacity=".97"/>
  <path d="M160 162l44-44-20-20v42h-24z" fill="#fff" opacity=".58"/>
  <rect x="158" y="54" width="40" height="30" rx="9" fill="${mode === 'thermal' ? '#111827' : accent}" opacity=".95"/>
  <text x="124" y="146" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="900" fill="${mode === 'thermal' ? '#111827' : primary}" opacity=".95">${initials}</text>
  ${showText ? `
  <text x="252" y="106" font-family="Inter, Arial, sans-serif" font-size="42" font-weight="850" fill="${secondary}">${businessName}</text>
  <text x="254" y="146" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="650" fill="${brand.neutral[500]}">${tagline}</text>
  <path d="M254 172h172" stroke="${primary}" stroke-width="8" stroke-linecap="round"/>
  ${symbol}
  ` : ''}
</svg>`.trim();
};

export default function BrandLogoUploader({ profile, onProfileChange }: BrandLogoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingStarter, setGeneratingStarter] = useState(false);
  const [logoDescription, setLogoDescription] = useState('');
  const [analysis, setAnalysis] = useState<{
    quality: string;
    sharpness: number;
    hasTransparency: boolean;
    scalability: number;
    suggestions: string[];
  } | null>(null);
  const [variants, setVariants] = useState<BrandAsset[]>([]);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (accepted: File[]) => {
      const file = accepted[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file (PNG, SVG, JPG, WebP).');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('File must be under 10 MB.');
        return;
      }
      setError(null);
      setUploading(true);
      try {
        const asset = await uploadBrandAsset({ file, category: 'logo' });
        onProfileChange({ logoUrl: asset.url });

        // Auto-analyze after upload
        try {
          const a = await aiAnalyzeLogo(file);
          setAnalysis({
            quality: a.quality,
            sharpness: a.sharpness,
            hasTransparency: a.hasTransparency,
            scalability: a.scalability,
            suggestions: a.suggestions,
          });
        } catch {
          // analysis is optional
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload failed');
      } finally {
        setUploading(false);
      }
    },
    [onProfileChange],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.svg', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
    multiple: false,
  });

  const handleGenerateVariants = async () => {
    setGenerating(true);
    try {
      const v = await aiGenerateLogoVariants();
      setVariants(v);
      const svg = v.find((x) => x.format === 'svg');
      const mono = v.find((x) => x.variant === 'monochrome');
      const thermal = v.find((x) => x.variant === 'thermal');
      const fav = v.find((x) => x.variant === 'favicon');
      if (svg) onProfileChange({ logoSvgUrl: svg.url });
      if (mono) onProfileChange({ logoMonochromeUrl: mono.url });
      if (thermal) onProfileChange({ logoThermalUrl: thermal.url });
      if (fav) onProfileChange({ faviconUrl: fav.url });
    } catch {
      setError('Variant generation failed. Try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateStarterLogo = () => {
    setError(null);
    setGeneratingStarter(true);
    try {
      const description = logoDescription.trim() || profile.description || profile.industry || profile.brandTone;
      const fullSvg = buildLetisStyleLogoSvg(profile, description, 'full');
      const monoSvg = buildLetisStyleLogoSvg(profile, description, 'mono');
      const thermalSvg = buildLetisStyleLogoSvg(profile, description, 'thermal');
      const faviconSvg = buildLetisStyleLogoSvg(profile, description, 'favicon');
      const logoUrl = svgDataUri(fullSvg);
      const logoSvgUrl = logoUrl;
      const logoMonochromeUrl = svgDataUri(monoSvg);
      const logoThermalUrl = svgDataUri(thermalSvg);
      const faviconUrl = svgDataUri(faviconSvg);

      onProfileChange({
        logoUrl,
        logoSvgUrl,
        logoMonochromeUrl,
        logoThermalUrl,
        faviconUrl,
      });

      const now = new Date().toISOString();
      setVariants([
        {
          id: crypto.randomUUID(),
          tenantId: profile.tenantId,
          name: 'Letis-style tenant logo',
          category: 'logo',
          format: 'svg',
          variant: 'original',
          url: logoUrl,
          width: 640,
          height: 240,
          sizeBytes: fullSvg.length,
          aiGenerated: true,
          createdAt: now,
        },
        {
          id: crypto.randomUUID(),
          tenantId: profile.tenantId,
          name: 'Monochrome logo',
          category: 'logo',
          format: 'svg',
          variant: 'monochrome',
          url: logoMonochromeUrl,
          width: 640,
          height: 240,
          sizeBytes: monoSvg.length,
          aiGenerated: true,
          createdAt: now,
        },
        {
          id: crypto.randomUUID(),
          tenantId: profile.tenantId,
          name: 'Thermal receipt logo',
          category: 'logo',
          format: 'svg',
          variant: 'thermal',
          url: logoThermalUrl,
          width: 640,
          height: 240,
          sizeBytes: thermalSvg.length,
          aiGenerated: true,
          createdAt: now,
        },
        {
          id: crypto.randomUUID(),
          tenantId: profile.tenantId,
          name: 'Favicon logo',
          category: 'logo',
          format: 'svg',
          variant: 'favicon',
          url: faviconUrl,
          width: 640,
          height: 240,
          sizeBytes: faviconSvg.length,
          aiGenerated: true,
          createdAt: now,
        },
      ]);
      setAnalysis({
        quality: 'good',
        sharpness: 0.9,
        hasTransparency: false,
        scalability: 1,
        suggestions: [
          'Generated from current brand settings',
          'Includes monochrome and thermal variants',
          'Save Brand Identity to use it in documents',
        ],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Logo generation failed');
    } finally {
      setGeneratingStarter(false);
    }
  };

  const hasLogo = !!profile.logoUrl;

  return (
    <Box>
      {/* Drop zone */}
      <Box
        {...getRootProps()}
        sx={{
          border: `2px dashed ${isDragActive ? brand.primary[400] : brand.neutral[200]}`,
          borderRadius: '14px',
          bgcolor: isDragActive ? brand.primary[50] : brand.neutral[50],
          p: 4,
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: brand.primary[400],
            bgcolor: brand.primary[50] + '80',
          },
        }}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <Stack spacing={1.5} alignItems="center">
            <CircularProgress size={32} sx={{ color: brandTokens.primary }} />
            <Typography sx={{ fontWeight: 600, color: brand.neutral[600] }}>
              Uploading logo...
            </Typography>
          </Stack>
        ) : hasLogo ? (
          <Stack spacing={1.5} alignItems="center">
            <Box
              component="img"
              src={profile.logoUrl}
              alt="Logo"
              sx={{
                maxHeight: 80,
                maxWidth: 240,
                objectFit: 'contain',
                borderRadius: '8px',
              }}
            />
            <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 600 }}>
              Drop a new logo or click to replace
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '14px',
                bgcolor: brand.primary[100],
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <IconPhoto size={28} color={brandTokens.primary} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, color: brand.neutral[700] }}>
                Drop your logo here
              </Typography>
              <Typography variant="caption" sx={{ color: brand.neutral[400] }}>
                PNG, SVG, JPG or WebP — max 10 MB
              </Typography>
            </Box>
          </Stack>
        )}
      </Box>

      <Box
        sx={{
          mt: 1.5,
          p: 2,
          borderRadius: '12px',
          border: `1px solid ${brand.primary[100]}`,
          bgcolor: brand.primary[50],
        }}
      >
        <Stack spacing={1.25}>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: '0.82rem', color: brand.neutral[800] }}>
              Generate a Letis-style logo
            </Typography>
            <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 600 }}>
              Uses business name, industry, colors, and document-friendly Letis logo structure.
            </Typography>
          </Box>
          <TextField
            size="small"
            fullWidth
            value={logoDescription}
            onChange={(e) => setLogoDescription(e.target.value)}
            placeholder="Example: clean pharmacy logo with cross symbol and calm green colors"
            disabled={generatingStarter}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
                bgcolor: '#FFFFFF',
                fontSize: '0.8rem',
                fontWeight: 600,
                '& fieldset': { borderColor: brand.primary[100] },
                '&:hover fieldset': { borderColor: brand.primary[300] },
                '&.Mui-focused fieldset': { borderColor: brand.primary[500], borderWidth: '2px' },
              },
            }}
          />
          <Button
            variant="contained"
            startIcon={generatingStarter ? <CircularProgress size={14} /> : <IconSparkles size={14} />}
            onClick={handleGenerateStarterLogo}
            disabled={generatingStarter}
            sx={{
              alignSelf: 'flex-start',
              textTransform: 'none',
              fontWeight: 800,
              borderRadius: '10px',
              bgcolor: brandTokens.primary,
              '&:hover': { bgcolor: brand.primary[700] },
            }}
          >
            {generatingStarter ? 'Generating logo...' : hasLogo ? 'Generate new logo' : 'Generate logo now'}
          </Button>
        </Stack>
      </Box>

      {error && (
        <Typography variant="caption" sx={{ color: brand.error.main, mt: 1, display: 'block' }}>
          {error}
        </Typography>
      )}

      {/* Analysis result */}
      {analysis && (
        <Box
          sx={{
            mt: 1.5,
            p: 2,
            borderRadius: '10px',
            border: `1px solid ${brand.info.light}`,
            bgcolor: brand.info.light + '80',
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <IconSparkles size={16} color={brand.info.main} />
            <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', color: brand.info.dark }}>
              AI Analysis — {analysis.quality.toUpperCase()} quality
            </Typography>
          </Stack>
          <Stack spacing={0.5}>
            {[
              { label: 'Sharpness', val: analysis.sharpness },
              { label: 'Scalability', val: analysis.scalability },
            ].map((m) => (
              <Stack key={m.label} direction="row" spacing={1} alignItems="center">
                <Typography variant="caption" sx={{ color: brand.neutral[600], width: 80 }}>
                  {m.label}
                </Typography>
                <Box
                  sx={{
                    flex: 1,
                    height: 4,
                    borderRadius: 2,
                    bgcolor: brand.neutral[200],
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      height: '100%',
                      width: `${m.val * 100}%`,
                      bgcolor: m.val > 0.7 ? brand.success.main : m.val > 0.4 ? brand.warning.main : brand.error.main,
                      borderRadius: 2,
                    }}
                  />
                </Box>
                <Typography variant="caption" sx={{ fontWeight: 700, width: 36, textAlign: 'right' }}>
                  {Math.round(m.val * 100)}%
                </Typography>
              </Stack>
            ))}
          </Stack>
          {analysis.suggestions.length > 0 && (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 1 }}>
              {analysis.suggestions.map((s, i) => (
                <Chip
                  key={i}
                  label={s}
                  size="small"
                  sx={{
                    fontSize: '0.68rem',
                    bgcolor: brand.info.light,
                    color: brand.info.dark,
                    fontWeight: 600,
                  }}
                />
              ))}
            </Stack>
          )}
          {/* Generate variants */}
          <Button
            size="small"
            variant="outlined"
            startIcon={generating ? <CircularProgress size={14} /> : <IconSparkles size={14} />}
            onClick={handleGenerateVariants}
            disabled={generating}
            sx={{
              mt: 1.5,
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: '8px',
              borderColor: brand.primary[300],
              color: brand.primary[700],
              '&:hover': { borderColor: brand.primary[500], bgcolor: brand.primary[50] },
            }}
          >
            {generating ? 'Generating...' : 'Generate Variants (SVG, Mono, Thermal, Favicon)'}
          </Button>
        </Box>
      )}

      {/* Variant thumbnails */}
      {variants.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
          {variants.map((v) => (
            <Tooltip key={v.id} title={`${VARIANT_LABELS[v.variant] ?? v.variant} (${v.format.toUpperCase()})`} arrow>
              <Box
                component="img"
                src={v.url}
                sx={{
                  width: 48,
                  height: 48,
                  objectFit: 'contain',
                  borderRadius: '8px',
                  border: `1px solid ${brand.neutral[200]}`,
                  bgcolor: v.variant === 'thermal' ? '#000' : '#fff',
                  p: 0.5,
                }}
              />
            </Tooltip>
          ))}
        </Stack>
      )}
    </Box>
  );
}
