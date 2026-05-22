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
  type AiBrandResponse,
  type BrandProfile,
} from 'src/api/smartpos/brand';

interface AIBrandingAssistantProps {
  profile: BrandProfile;
  onProfileChange: (patch: Partial<BrandProfile>) => void;
  onClose: () => void;
}

interface ChatEntry {
  id: string;
  role: 'user' | 'assistant' | 'action';
  content: string;
  suggestions?: AiBrandResponse['suggestions'];
  timestamp: number;
}

const QUICK_ACTIONS = [
  { label: 'Analyze my logo', prompt: 'Analyze my current logo and tell me how to improve it for print and digital use.' },
  { label: 'Generate color palette', prompt: 'Generate a complementary color palette based on my brand name and industry.' },
  { label: 'Suggest fonts', prompt: 'Suggest font pairings that work well for my brand identity and industry.' },
  { label: 'Create document theme', prompt: 'Create a complete document theme (invoice, receipt, quote) using my brand colors.' },
  { label: 'Improve brand consistency', prompt: 'Review my current brand settings and suggest improvements for consistency across all documents.' },
  { label: 'Thermal print optimization', prompt: 'Help me optimize my brand assets for thermal printer compatibility.' },
];

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

  const handleQuickAction = (prompt: string) => handleSend(prompt);

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
                          onClick={() => onProfileChange({ fontFamily: f.family })}
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
                            onProfileChange({ primaryColor: t.primaryColor, accentColor: t.accentColor });
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
              onClick={() => handleQuickAction(qa.prompt)}
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
