/**
 * AIBrandingAssistant — inline chat panel for AI-powered branding tasks.
 * Suggests colors, fonts, themes; analyzes logos; generates variants.
 * Uses /api/v1/brand/ai/* endpoints.
 */
import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { IconSparkles, IconSend, IconX } from '@tabler/icons-react';
import { brand, brandTokens } from 'src/theme/smartpos/brand';
import {
  aiBrandChat,
  aiGenerateLogoImage,
  aiGeneratePalette,
  aiGenerateTheme,
  aiSuggestFonts,
  uploadBrandAsset,
  type AiBrandResponse,
  type BrandProfile,
} from 'src/api/smartpos/brand';
import {
  generateLogoVariantSvgs,
} from 'src/utils/smartpos/logoGenerator';

interface AIBrandingAssistantProps {
  profile: BrandProfile;
  onProfileChange: (patch: Partial<BrandProfile>) => void;
  onClose: () => void;
}

type QuickActionKind =
  | 'chat'
  | 'logo-generate'
  | 'palette'
  | 'fonts'
  | 'theme'
  | 'logo-analysis'
  | 'consistency'
  | 'thermal';

type ThemeSuggestion = {
  name: string;
  primaryColor: string;
  secondaryColor?: string;
  accentColor: string;
};

type BrandSuggestions = Omit<NonNullable<AiBrandResponse['suggestions']>, 'themes'> & {
  themes?: ThemeSuggestion[];
};

interface ChatEntry {
  id: string;
  role: 'user' | 'assistant' | 'action';
  content: string;
  suggestions?: BrandSuggestions;
  timestamp: number;
}

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

const QUICK_ACTIONS = [
  { label: 'Generate logo now', kind: 'logo-generate' as const, prompt: 'Generate a document-ready tenant logo now using my current brand settings.' },
  { label: 'Analyze my logo', kind: 'logo-analysis' as const, prompt: 'Analyze my current logo and tell me how to improve it for print and digital use.' },
  { label: 'Generate color palette', kind: 'palette' as const, prompt: 'Generate a complementary color palette based on my brand name and industry.' },
  { label: 'Suggest fonts', kind: 'fonts' as const, prompt: 'Suggest font pairings that work well for my brand identity and industry.' },
  { label: 'Create document theme', kind: 'theme' as const, prompt: 'Create a complete document theme (invoice, receipt, quote) using my brand colors.' },
  { label: 'Improve brand consistency', kind: 'consistency' as const, prompt: 'Review my current brand settings and suggest improvements for consistency across all documents.' },
  { label: 'Thermal print optimization', kind: 'thermal' as const, prompt: 'Help me optimize my brand assets for thermal printer compatibility.' },
];

const isLogoGenerationRequest = (message: string) => (
  /\b(generate|create|make|build|new)\b/i.test(message) && /\blogo\b/i.test(message)
);

export default function AIBrandingAssistant({
  profile,
  onProfileChange,
  onClose,
}: AIBrandingAssistantProps) {
  const [entries, setEntries] = useState<ChatEntry[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hi! I'm your AI Branding Assistant. I can help you create a professional brand identity for ${profile.businessName || 'your business'}. What would you like to work on?`,
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  const addEntry = (entry: Omit<ChatEntry, 'id' | 'timestamp'>) => {
    setEntries((prev) => [
      ...prev,
      { ...entry, id: crypto.randomUUID(), timestamp: Date.now() },
    ]);
  };

  const handleSend = async (message: string) => {
    if (!message.trim() || loading) return;
    if (isLogoGenerationRequest(message)) {
      await handleQuickAction('logo-generate', message);
      setInput('');
      return;
    }
    addEntry({ role: 'user', content: message });
    setInput('');
    setLoading(true);

    try {
      const response = await aiBrandChat({
        prompt: message,
        context: {
          businessName: profile.businessName,
          industry: profile.industry,
          description: profile.description,
          style: profile.brandTone,
          currentColors: [profile.primaryColor, profile.secondaryColor, profile.accentColor],
        },
      });

      addEntry({
        role: 'assistant',
        content: response.message,
        suggestions: response.suggestions,
      });
    } catch {
      addEntry({
        role: 'assistant',
        content: 'Sorry, I had trouble processing that. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApplyColors = (colors: string[]) => {
    if (colors.length >= 1) onProfileChange({ primaryColor: colors[0] });
    if (colors.length >= 2) onProfileChange({ secondaryColor: colors[1] });
    if (colors.length >= 3) onProfileChange({ accentColor: colors[2] });
    addEntry({
      role: 'action',
      content: `Applied palette: ${colors.join(', ')}`,
    });
  };

  const handleApplyTheme = (theme: { primaryColor: string; secondaryColor?: string; accentColor: string }) => {
    onProfileChange({
      primaryColor: theme.primaryColor,
      secondaryColor: theme.secondaryColor ?? profile.secondaryColor,
      accentColor: theme.accentColor,
    });
    addEntry({
      role: 'action',
      content: `Applied document theme: primary ${theme.primaryColor}, accent ${theme.accentColor}`,
    });
  };

  const handleApplyFont = (family: string) => {
    onProfileChange({ fontFamily: family });
    addEntry({
      role: 'action',
      content: `Applied font: ${family}`,
    });
  };

  const handleGenerateLogo = async (description: string) => {
    const source = description.trim() || profile.description || profile.industry || profile.brandTone;
    const svgs = generateLogoVariantSvgs(profile, source);
    const slug = (profile.businessName || 'letis-brand')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'letis-brand';
    try {
      const generated = await aiGenerateLogoImage({
        businessName: profile.businessName,
        industry: profile.industry,
        description: profile.description,
        userPrompt: source,
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

        addEntry({
          role: 'assistant',
          content: [
            'Generated and applied an AI logo image.',
            '',
            `Model/provider: ${generated.model || generated.provider}`,
            `Business: ${profile.businessName || 'My Business'}`,
            `Industry: ${profile.industry || 'General retail'}`,
            '',
            'I also generated monochrome, thermal, and favicon support assets for documents and receipts.',
            'Save Brand Identity to use it in invoices, receipts, quotations, and other documents.',
          ].join('\n'),
        });
        addEntry({
          role: 'action',
          content: 'AI logo generated and applied to Brand Identity.',
        });
        return;
      }
    } catch {
      // Fall back to deterministic SVG generation when the AI image provider is unavailable.
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

    addEntry({
      role: 'assistant',
      content: [
        'Generated and applied a document-ready tenant logo.',
        '',
        'AI image generation is not configured yet, so I used the document-safe SVG generator.',
        '',
        `Business: ${profile.businessName || 'My Business'}`,
        `Industry: ${profile.industry || 'General retail'}`,
        `Colors: ${[profile.primaryColor, profile.secondaryColor, profile.accentColor].filter(Boolean).join(', ')}`,
        '',
        'The mark uses tenant initials and an industry symbol instead of the Letis L.',
        'Applied to logoUrl, logoSvgUrl, logoMonochromeUrl, logoThermalUrl, and faviconUrl.',
        'Save Brand Identity to use it in invoices, receipts, quotations, and other documents.',
      ].join('\n'),
    });
    addEntry({
      role: 'action',
      content: 'Logo generated and applied to Brand Identity.',
    });
  };

  const localBrandReview = (kind: QuickActionKind) => {
    if (kind === 'logo-analysis') {
      if (!profile.logoUrl) {
        return 'No logo is uploaded yet.\n\nRecommended next step: upload a clear PNG or SVG logo first. After upload, use logo variants for monochrome, favicon, and thermal receipt versions.';
      }
      return [
        'Logo review:',
        `- Current logo: ${profile.logoUrl}`,
        '- Use a transparent PNG/SVG for invoices and website surfaces.',
        '- Keep a single-color version for receipts and stamps.',
        '- Check that the logo remains readable at 32px favicon size and on 58mm thermal receipts.',
      ].join('\n');
    }
    if (kind === 'thermal') {
      return [
        'Thermal print optimization:',
        '- Use a monochrome logo with strong contrast.',
        '- Avoid gradients, tiny text, shadows, and thin lines.',
        '- Keep receipt logo width under 180px equivalent.',
        '- Prefer business name text if the logo loses detail in black and white.',
      ].join('\n');
    }
    return [
      'Brand consistency review:',
      `- Business name: ${profile.businessName || 'not set'}`,
      `- Industry: ${profile.industry || 'not set'}`,
      `- Tone: ${profile.brandTone || 'not set'}`,
      `- Colors: ${[profile.primaryColor, profile.secondaryColor, profile.accentColor].filter(Boolean).join(', ')}`,
      `- Font: ${profile.fontFamily || 'not set'}`,
      '',
      'Recommended next step: apply one palette, one font family, and one document theme, then save the brand identity.',
    ].join('\n');
  };

  const handleQuickAction = async (kind: QuickActionKind, prompt: string) => {
    if (loading) return;
    addEntry({ role: 'user', content: prompt });
    setLoading(true);
    try {
      if (kind === 'logo-generate') {
        await handleGenerateLogo(prompt);
        return;
      }

      if (kind === 'palette') {
        const colors = await aiGeneratePalette();
        addEntry({
          role: 'assistant',
          content: [
            'Generated palette:',
            ...colors.map((color, index) => `- Color ${index + 1}: ${color}`),
            '',
            'Select Apply to use these colors in Brand Identity.',
          ].join('\n'),
          suggestions: { colors },
        });
        return;
      }

      if (kind === 'fonts') {
        const fonts = await aiSuggestFonts();
        addEntry({
          role: 'assistant',
          content: [
            'Generated font pairings:',
            ...fonts.map((font) => `- ${font.family} (${font.category})`),
            '',
            'Select one font chip to apply it.',
          ].join('\n'),
          suggestions: {
            fonts: fonts.map((f) => ({ family: f.family, category: f.category })),
          },
        });
        return;
      }

      if (kind === 'theme') {
        const theme = await aiGenerateTheme();
        addEntry({
          role: 'assistant',
          content: [
            'Generated document theme:',
            `- Primary: ${theme.primaryColor}`,
            `- Secondary: ${theme.secondaryColor}`,
            `- Accent: ${theme.accentColor}`,
            `- Surface: ${theme.surfaceColor}`,
            `- Text: ${theme.textColor}`,
            '',
            'Select the theme row to apply it.',
          ].join('\n'),
          suggestions: {
            themes: [{
              name: 'AI Document Theme',
              primaryColor: theme.primaryColor,
              secondaryColor: theme.secondaryColor,
              accentColor: theme.accentColor,
            }],
          },
        });
        return;
      }

      if (kind === 'logo-analysis' || kind === 'consistency' || kind === 'thermal') {
        addEntry({ role: 'assistant', content: localBrandReview(kind) });
        return;
      }

      await handleSend(prompt);
    } catch (e) {
      addEntry({
        role: 'assistant',
        content: e instanceof Error
          ? `I could not complete that action: ${e.message}`
          : 'I could not complete that action. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      sx={{
        borderRadius: '14px',
        border: `1px solid ${brand.primary[200]}`,
        bgcolor: '#fff',
        boxShadow: `
          0 4px 16px ${brand.primary[500]}10,
          0 12px 40px -16px ${brand.primary[500]}14
        `,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        sx={{
          px: 2.5,
          py: 1.5,
          background: `linear-gradient(135deg, ${brand.primary[600]} 0%, ${brand.primary[700]} 100%)`,
          color: '#fff',
        }}
      >
        <IconSparkles size={20} />
        <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', flex: 1 }}>
          AI Branding Assistant
        </Typography>
        <IconButton onClick={onClose} size="small" sx={{ color: 'rgba(255,255,255,0.8)' }}>
          <IconX size={16} />
        </IconButton>
      </Stack>

      {/* Messages area */}
      <Box sx={{ px: 2.5, py: 2, maxHeight: 320, overflow: 'auto' }}>
        {entries.map((entry) => (
          <Box
            key={entry.id}
            sx={{
              mb: 1.5,
              display: 'flex',
              flexDirection: 'column',
              alignItems: entry.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <Box
              sx={{
                maxWidth: '88%',
                px: 1.5,
                py: 1,
                borderRadius: entry.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                bgcolor: entry.role === 'user'
                  ? brand.primary[600]
                  : entry.role === 'action'
                    ? brand.info.light
                    : brand.neutral[50],
                color: entry.role === 'user'
                  ? '#fff'
                  : entry.role === 'action'
                    ? brand.info.dark
                    : brand.neutral[800],
                border: entry.role === 'assistant' ? `1px solid ${brand.neutral[100]}` : 'none',
              }}
            >
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {entry.content}
              </Typography>
            </Box>

            {/* Suggestion chips */}
            {entry.suggestions && (
              <Box sx={{ mt: 1, ml: 0 }}>
                {entry.suggestions.colors && entry.suggestions.colors.length > 0 && (
                  <Stack spacing={0.75}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: brand.neutral[500] }}>
                      Suggested palette:
                    </Typography>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      {entry.suggestions.colors.map((c, i) => (
                        <Box
                          key={i}
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '8px',
                            bgcolor: c,
                            border: `2px solid ${brand.neutral[200]}`,
                            cursor: 'pointer',
                            transition: 'transform 0.15s',
                            '&:hover': { transform: 'scale(1.15)' },
                          }}
                          title={c}
                        />
                      ))}
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleApplyColors(entry.suggestions!.colors!)}
                        sx={{
                          ml: 1,
                          textTransform: 'none',
                          fontWeight: 700,
                          fontSize: '0.7rem',
                          borderRadius: '8px',
                          borderColor: brand.primary[300],
                          color: brand.primary[700],
                        }}
                      >
                        Apply
                      </Button>
                    </Stack>
                  </Stack>
                )}

                {entry.suggestions.fonts && entry.suggestions.fonts.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: brand.neutral[500], display: 'block', mb: 0.5 }}>
                      Suggested fonts:
                    </Typography>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {entry.suggestions.fonts.map((f, i) => (
                        <Chip
                          key={i}
                          label={`${f.family} (${f.category})`}
                          size="small"
                          onClick={() => handleApplyFont(f.family)}
                          sx={{
                            fontWeight: 600,
                            fontSize: '0.7rem',
                            cursor: 'pointer',
                            bgcolor: brand.neutral[100],
                            '&:hover': { bgcolor: brand.primary[100], color: brand.primary[700] },
                          }}
                        />
                      ))}
                    </Stack>
                  </Box>
                )}

                {entry.suggestions.themes && entry.suggestions.themes.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: brand.neutral[500], display: 'block', mb: 0.5 }}>
                      Document themes:
                    </Typography>
                    <Stack spacing={0.5}>
                      {entry.suggestions.themes.map((t, i) => (
                        <Stack
                          key={i}
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          sx={{
                            p: 1,
                            borderRadius: '8px',
                            border: `1px solid ${brand.neutral[100]}`,
                            cursor: 'pointer',
                            '&:hover': { borderColor: brand.primary[300], bgcolor: brand.primary[50] },
                          }}
                          onClick={() => {
                            handleApplyTheme(t);
                          }}
                        >
                          <Box
                            sx={{
                              width: 24,
                              height: 24,
                              borderRadius: '6px',
                              bgcolor: t.primaryColor,
                              border: `1px solid ${brand.neutral[200]}`,
                            }}
                          />
                          <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, flex: 1 }}>
                            {t.name}
                          </Typography>
                          {t.secondaryColor && (
                            <Box
                              sx={{
                                width: 24,
                                height: 24,
                                borderRadius: '6px',
                                bgcolor: t.secondaryColor,
                                border: `1px solid ${brand.neutral[200]}`,
                              }}
                            />
                          )}
                          <Box
                            sx={{
                              width: 24,
                              height: 24,
                              borderRadius: '6px',
                              bgcolor: t.accentColor,
                              border: `1px solid ${brand.neutral[200]}`,
                            }}
                          />
                        </Stack>
                      ))}
                    </Stack>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        ))}

        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <CircularProgress size={16} sx={{ color: brandTokens.primary }} />
            <Typography variant="caption" sx={{ color: brand.neutral[400], fontWeight: 600 }}>
              Thinking...
            </Typography>
          </Box>
        )}

        <div ref={messagesEndRef} />
      </Box>

      {/* Quick actions */}
      <Box sx={{ px: 2.5, pb: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: brand.neutral[400], display: 'block', mb: 0.75 }}>
          Quick actions
        </Typography>
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ rowGap: 0.75 }}>
          {QUICK_ACTIONS.map((qa) => (
            <Chip
              key={qa.label}
              label={qa.label}
              size="small"
              onClick={() => handleQuickAction(qa.kind, qa.prompt)}
              disabled={loading}
              icon={<IconSparkles size={12} />}
              sx={{
                fontWeight: 600,
                fontSize: '0.68rem',
                bgcolor: brand.primary[50],
                color: brand.primary[700],
                border: `1px solid ${brand.primary[200]}`,
                '&:hover': { bgcolor: brand.primary[100], borderColor: brand.primary[400] },
                cursor: 'pointer',
              }}
            />
          ))}
        </Stack>
      </Box>

      {/* Input */}
      <Box sx={{ px: 2.5, pb: 2, pt: 1 }}>
        <Stack direction="row" spacing={1}>
          <TextField
            fullWidth
            size="small"
            placeholder="Ask me anything about your brand..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(input); } }}
            disabled={loading}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
                bgcolor: brand.neutral[50],
                fontSize: '0.82rem',
                fontWeight: 600,
                '& fieldset': { borderColor: brand.neutral[200] },
                '&:hover fieldset': { borderColor: brand.primary[300] },
                '&.Mui-focused fieldset': { borderColor: brand.primary[500], borderWidth: '2px' },
              },
            }}
          />
          <IconButton
            onClick={() => handleSend(input)}
            disabled={!input.trim() || loading}
            sx={{
              bgcolor: brandTokens.primary,
              color: '#fff',
              borderRadius: '10px',
              '&:hover': { bgcolor: brand.primary[700] },
              '&.Mui-disabled': { bgcolor: brand.neutral[200], color: brand.neutral[400] },
            }}
          >
            <IconSend size={16} />
          </IconButton>
        </Stack>
      </Box>
    </Card>
  );
}
