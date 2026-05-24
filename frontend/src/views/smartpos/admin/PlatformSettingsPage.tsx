import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  IconBrain,
  IconCheck,
  IconDeviceFloppy,
  IconEye,
  IconEyeOff,
  IconMail,
  IconMessage,
  IconCreditCard,
  IconRefresh,
} from '@tabler/icons-react';

import {
  listPlatformSettings,
  updatePlatformSettings,
  type PlatformSettingDto,
  type UpdateEntry,
} from 'src/api/smartpos/platformSettings';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import { brand } from 'src/theme/smartpos/brand';

const CATEGORY_META: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  ai: { icon: <IconBrain size={20} />, label: 'AI Providers', color: brand.primary[600] },
  email: { icon: <IconMail size={20} />, label: 'Email', color: brand.info.main },
  sms: { icon: <IconMessage size={20} />, label: 'SMS & WhatsApp', color: brand.success.main },
  payment: { icon: <IconCreditCard size={20} />, label: 'Payments', color: brand.warning.dark },
};

export default function PlatformSettingsPage() {
  const [grouped, setGrouped] = useState<Record<string, PlatformSettingDto[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setGrouped(await listPlatformSettings());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setValue = (key: string, current: string | null, value: string) => {
    if (value === (current ?? '')) {
      setEdits((prev) => { const next = { ...prev }; delete next[key]; return next; });
    } else {
      setEdits((prev) => ({ ...prev, [key]: value }));
    }
  };

  const handleSave = async () => {
    const entries: UpdateEntry[] = Object.entries(edits).map(([key, value]) => ({ key, value }));
    if (entries.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await updatePlatformSettings(entries);
      setEdits({});
      setBanner('Settings saved. Services will pick up changes on next restart.');
      setTimeout(() => setBanner(null), 6000);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const dirtyCount = Object.keys(edits).length;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress size={32} sx={{ color: brand.primary[500] }} />
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title="Platform Settings"
        subtitle="Manage API keys, provider configs, and payment gateways"
        actions={[
          {
            label: dirtyCount ? `Save ${dirtyCount} change${dirtyCount > 1 ? 's' : ''}` : 'Saved',
            icon: saving ? <CircularProgress size={16} color="inherit" /> : <IconDeviceFloppy size={17} />,
            onClick: handleSave,
            variant: dirtyCount ? 'primary' : 'ghost',
          },
          {
            label: 'Refresh',
            icon: <IconRefresh size={17} />,
            onClick: load,
            variant: 'ghost',
          },
        ]}
      />

      {banner && <Alert severity="success" sx={{ mb: 2 }}>{banner}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <Stack spacing={2.5}>
        {Object.entries(CATEGORY_META).map(([cat, meta]) => {
          const settings = grouped[cat];
          if (!settings?.length) return null;
          return (
            <Card
              key={cat}
              elevation={0}
              sx={{
                borderRadius: '12px',
                border: `1px solid ${brand.neutral[200]}`,
                bgcolor: '#fff',
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                  <Box sx={{ color: meta.color, display: 'flex' }}>{meta.icon}</Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem', flex: 1 }}>
                    {meta.label}
                  </Typography>
                  <Chip
                    label={`${settings.length} setting${settings.length > 1 ? 's' : ''}`}
                    size="small"
                    sx={{ height: 22, fontWeight: 600, fontSize: '0.6875rem', bgcolor: brand.neutral[100] }}
                  />
                </Stack>
                <Divider sx={{ mb: 2, borderColor: brand.neutral[100] }} />
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: 2,
                  }}
                >
                  {settings.map((s) => {
                    const editedValue = edits[s.key] !== undefined ? edits[s.key] : null;
                    const displayValue = editedValue ?? s.value ?? '';
                    const isRevealed = revealed.has(s.key);
                    const showReveal = s.encrypted && s.value && !editedValue;

                    return (
                      <Box key={s.key}>
                        <Typography
                          variant="caption"
                          sx={{
                            color: brand.neutral[500],
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            display: 'block',
                            mb: 0.5,
                          }}
                        >
                          {s.label}
                        </Typography>
                        <TextField
                          size="small"
                          fullWidth
                          type={s.encrypted && !isRevealed && !editedValue ? 'password' : 'text'}
                          value={editedValue ?? (showReveal ? '****' : displayValue)}
                          placeholder={s.description ?? ''}
                          onChange={(e) => setValue(s.key, s.value, e.target.value)}
                          InputProps={{
                            endAdornment: s.encrypted ? (
                              <InputAdornment position="end">
                                <Tooltip title={isRevealed ? 'Hide' : 'Reveal'}>
                                  <IconButton
                                    size="small"
                                    onClick={() => {
                                      setRevealed((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(s.key)) next.delete(s.key);
                                        else next.add(s.key);
                                        return next;
                                      });
                                    }}
                                  >
                                    {isRevealed ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                                  </IconButton>
                                </Tooltip>
                              </InputAdornment>
                            ) : null,
                            sx: { borderRadius: '10px', fontSize: '0.8125rem' },
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: '10px',
                              bgcolor: editedValue !== null ? brand.primary[50] : '#fff',
                              borderColor: editedValue !== null ? brand.primary[300] : undefined,
                              transition: 'all 0.15s ease',
                            },
                          }}
                        />
                        {editedValue !== null && (
                          <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5, alignItems: 'center' }}>
                            <IconCheck size={12} color={brand.success.main} />
                            <Typography variant="caption" sx={{ color: brand.success.dark, fontWeight: 600 }}>
                              Modified
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Stack>
    </Box>
  );
}
