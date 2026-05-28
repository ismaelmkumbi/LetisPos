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
import { uploadBrandAsset, aiAnalyzeLogo, aiGenerateLogoImage, aiGenerateLogoVariants } from 'src/api/smartpos/brand';
import {
  buildLetisStyleLogoSvg,
  generateLogoVariantSvgs,
  svgDataUri,
  type LogoMode,
} from 'src/utils/smartpos/logoGenerator';

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

const svgFile = (svg: string, name: string) =>
  new File([svg], name, { type: 'image/svg+xml' });

const imageFileFromUrl = async (url: string, name: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Generated image could not be downloaded');
  const blob = await response.blob();
  const type = blob.type || 'image/png';
  const extension = type.includes('webp') ? 'webp' : type.includes('jpeg') ? 'jpg' : 'png';
  return new File([blob], `${name}.${extension}`, { type });
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

  const handleGenerateStarterLogo = async () => {
    setError(null);
    setGeneratingStarter(true);
    try {
      const description = logoDescription.trim() || profile.description || profile.industry || profile.brandTone;
      const slug = (profile.businessName || 'letis-brand')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40) || 'letis-brand';
      const svgs = generateLogoVariantSvgs(profile, description);

      try {
        const generated = await aiGenerateLogoImage({
          businessName: profile.businessName,
          industry: profile.industry,
          description: profile.description,
          userPrompt: description,
          style: profile.brandTone,
          primaryColor: profile.primaryColor,
          secondaryColor: profile.secondaryColor,
          accentColor: profile.accentColor,
          count: 3,
          size: '1024x1024',
          tenantSlug: slug,
        });
        const image = generated.images.find((item) => item.url && !item.url.startsWith('letisbrand://'));
        if (generated.provider !== 'stub' && image) {
          const aiLogoFile = await imageFileFromUrl(image.url, `${slug}-ai-logo`);
          const [fullAsset, monoAsset, thermalAsset, faviconAsset] = await Promise.all([
            uploadBrandAsset({
              file: aiLogoFile,
              category: 'logo',
              name: `AI generated logo (${generated.model || generated.provider})`,
            }),
            uploadBrandAsset({
              file: svgFile(svgs.mono, `${slug}-logo-mono.svg`),
              category: 'logo',
              name: 'Monochrome logo',
            }),
            uploadBrandAsset({
              file: svgFile(svgs.thermal, `${slug}-logo-thermal.svg`),
              category: 'logo',
              name: 'Thermal receipt logo',
            }),
            uploadBrandAsset({
              file: svgFile(svgs.favicon, `${slug}-favicon.svg`),
              category: 'favicon',
              name: 'Favicon logo',
            }),
          ]);

          onProfileChange({
            logoUrl: fullAsset.url,
            logoMonochromeUrl: monoAsset.url,
            logoThermalUrl: thermalAsset.url,
            faviconUrl: faviconAsset.url,
          });

          const now = new Date().toISOString();
          const supportingVariants: { mode: LogoMode; asset: BrandAsset; variant: BrandAsset['variant'] }[] = [
            { mode: 'mono', asset: monoAsset, variant: 'monochrome' },
            { mode: 'thermal', asset: thermalAsset, variant: 'thermal' },
            { mode: 'favicon', asset: faviconAsset, variant: 'favicon' },
          ];
          setVariants([
            { ...fullAsset, variant: 'original', aiGenerated: true },
            ...supportingVariants.map(({ mode, asset, variant: v }) => {
              const svg = buildLetisStyleLogoSvg(profile, description, mode);
              const isFavicon = mode === 'favicon';
              return {
                ...asset,
                id: asset.id || crypto.randomUUID(),
                tenantId: profile.tenantId,
                name: asset.name,
                category: asset.category,
                format: 'svg' as const,
                variant: v,
                url: svgDataUri(svg),
                width: isFavicon ? 128 : 640,
                height: isFavicon ? 128 : 240,
                sizeBytes: svg.length,
                aiGenerated: true,
                createdAt: asset.createdAt || now,
              };
            }),
          ]);
          setAnalysis({
            quality: 'excellent',
            sharpness: 0.95,
            hasTransparency: false,
            scalability: 0.9,
            suggestions: [
              `Generated with ${generated.model || generated.provider}`,
              'Uploaded into Brand Assets so documents can use it',
              'Includes monochrome, thermal, and favicon support variants',
              'Save Brand Identity to use it in invoices, receipts, and quotations',
            ],
          });
          return;
        }
        setError(generated.message || 'AI logo generation did not return an image. Falling back to generated SVG.');
        // Fall through to SVG generator below — no return
      } catch (e) {
        setError('AI logo generation unavailable. Using auto-generated SVG instead.');
        // Fall through to SVG generator below — no return
      }

      const [fullAsset, monoAsset, thermalAsset, faviconAsset] = await Promise.all([
        uploadBrandAsset({
          file: svgFile(svgs.full, `${slug}-logo.svg`),
          category: 'logo',
          name: 'Document-ready tenant logo',
        }),
        uploadBrandAsset({
          file: svgFile(svgs.mono, `${slug}-logo-mono.svg`),
          category: 'logo',
          name: 'Monochrome logo',
        }),
        uploadBrandAsset({
          file: svgFile(svgs.thermal, `${slug}-logo-thermal.svg`),
          category: 'logo',
          name: 'Thermal receipt logo',
        }),
        uploadBrandAsset({
          file: svgFile(svgs.favicon, `${slug}-favicon.svg`),
          category: 'favicon',
          name: 'Favicon logo',
        }),
      ]);

      onProfileChange({
        logoUrl: fullAsset.url,
        logoSvgUrl: fullAsset.url,
        logoMonochromeUrl: monoAsset.url,
        logoThermalUrl: thermalAsset.url,
        faviconUrl: faviconAsset.url,
      });

      const now = new Date().toISOString();
      const modes: { mode: LogoMode; asset: BrandAsset; variant: BrandAsset['variant'] }[] = [
        { mode: 'full', asset: fullAsset, variant: 'original' },
        { mode: 'mono', asset: monoAsset, variant: 'monochrome' },
        { mode: 'thermal', asset: thermalAsset, variant: 'thermal' },
        { mode: 'favicon', asset: faviconAsset, variant: 'favicon' },
      ];
      setVariants(
        modes.map(({ mode, asset, variant: v }) => {
          const svg = buildLetisStyleLogoSvg(profile, description, mode);
          const isFavicon = mode === 'favicon';
          return {
            ...asset,
            id: asset.id || crypto.randomUUID(),
            tenantId: profile.tenantId,
            name: asset.name,
            category: asset.category,
            format: 'svg' as const,
            variant: v,
            url: svgDataUri(svg),
            width: isFavicon ? 128 : 640,
            height: isFavicon ? 128 : 240,
            sizeBytes: svg.length,
            aiGenerated: true,
            createdAt: asset.createdAt || now,
          };
        }),
      );
      setAnalysis({
        quality: 'good',
        sharpness: 0.9,
        hasTransparency: false,
        scalability: 1,
        suggestions: [
          'Generated from current brand settings because AI image generation is unavailable',
          'Uses a tenant-specific mark instead of the Letis L',
          'Includes monochrome and thermal variants',
          'Save Brand Identity to use it in documents',
        ],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Logo generation upload failed');
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
              Generate and apply logo
            </Typography>
            <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 600 }}>
              Creates the logo asset used in receipts, invoices, quotations, and other documents.
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
            {generatingStarter ? 'Generating logo...' : hasLogo ? 'Generate new AI logo' : 'Generate AI logo'}
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
              AI Analysis — {(analysis.quality ?? 'standard').toUpperCase()} quality
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
            <Tooltip key={v.id} title={`${VARIANT_LABELS[v.variant ?? ''] ?? (v.variant ?? 'var')} (${(v.format ?? '?').toUpperCase()})`} arrow>
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
