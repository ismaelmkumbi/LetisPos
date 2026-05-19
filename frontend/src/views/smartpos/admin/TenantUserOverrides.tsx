import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { IconPlus, IconX, IconSearch } from '@tabler/icons-react';

import {
  getAllFeatures,
  getAssignments,
  createAssignment,
  deleteAssignment,
  type FeatureDefinition,
  type FeatureAssignment,
} from 'src/api/smartpos/features';

/* ── Theme colours (Catppuccin Mocha) ── */

const COLORS = {
  bg: '#1e1e2e',
  bgAlt: '#313244',
  bgBase: '#11111b',
  text: '#cdd6f4',
  textMuted: '#a6adc8',
  textDim: '#6c7086',
  blue: '#89b4fa',
  green: '#a6e3a1',
  red: '#f38ba8',
  yellow: '#f9e2af',
  purple: '#cba6f7',
};

type Level = 'TENANT' | 'USER';

/* ── Main component ── */

export default function TenantUserOverrides() {
  // Feature catalogue reference
  const [allFeatures, setAllFeatures] = useState<FeatureDefinition[]>([]);

  // Search
  const [level, setLevel] = useState<Level>('TENANT');
  const [targetId, setTargetId] = useState('');
  const [searchValue, setSearchValue] = useState('');

  // Override data
  const [overrides, setOverrides] = useState<FeatureAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  /* ── Load feature catalogue once ── */

  useEffect(() => {
    getAllFeatures()
      .then(setAllFeatures)
      .catch(() => { /* reference is best-effort */ });
  }, []);

  /* ── Fetch overrides for target ── */

  const search = useCallback(async () => {
    const id = searchValue.trim();
    if (!id) {
      setError('Enter a tenant or user ID');
      return;
    }
    setTargetId(id);
    setSearched(true);
    setLoading(true);
    setError(null);
    try {
      const results = await getAssignments({ level, targetId: id });
      setOverrides(results);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load overrides');
      setOverrides([]);
    } finally {
      setLoading(false);
    }
  }, [level, searchValue]);

  /* ── Toggle override ── */

  const handleToggleOverride = useCallback(
    async (featureKey: string, granted: boolean) => {
      if (!targetId) return;
      setError(null);

      // Check if override already exists
      const existing = overrides.find(
        (o) => o.featureKey === featureKey && o.assignmentLevel === level && o.targetId === targetId,
      );

      try {
        if (existing) {
          await deleteAssignment(existing.id);
        } else {
          await createAssignment({
            featureKey,
            assignmentLevel: level,
            targetId,
            granted,
          });
        }
        // Refresh
        const results = await getAssignments({ level, targetId });
        setOverrides(results);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to toggle override');
      }
    },
    [level, targetId, overrides],
  );

  /* ── Derived ── */

  const extraFeatureKeys = new Set(
    overrides.filter((o) => o.granted).map((o) => o.featureKey),
  );
  const deniedFeatureKeys = new Set(
    overrides.filter((o) => !o.granted).map((o) => o.featureKey),
  );

  const extraFeatures = allFeatures.filter((f) => extraFeatureKeys.has(f.key));
  const deniedFeatures = allFeatures.filter((f) => deniedFeatureKeys.has(f.key));

  /* ── Render ── */

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Search section */}
      <Paper
        sx={{
          p: 2,
          mb: 3,
          bgcolor: COLORS.bg,
          borderRadius: '12px',
          border: `1px solid ${COLORS.bgAlt}`,
        }}
      >
        <Typography variant="subtitle2" sx={{ color: COLORS.text, mb: 1.5, fontWeight: 600 }}>
          Search Tenant or User
        </Typography>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Chip
            label="Tenant"
            onClick={() => setLevel('TENANT')}
            sx={{
              fontWeight: 700,
              bgcolor: level === 'TENANT' ? COLORS.blue : COLORS.bgAlt,
              color: level === 'TENANT' ? COLORS.bgBase : COLORS.textMuted,
              '&:hover': { bgcolor: level === 'TENANT' ? COLORS.blue : '#45475a' },
            }}
          />
          <Chip
            label="User"
            onClick={() => setLevel('USER')}
            sx={{
              fontWeight: 700,
              bgcolor: level === 'USER' ? COLORS.blue : COLORS.bgAlt,
              color: level === 'USER' ? COLORS.bgBase : COLORS.textMuted,
              '&:hover': { bgcolor: level === 'USER' ? COLORS.blue : '#45475a' },
            }}
          />
          <TextField
            size="small"
            placeholder={level === 'TENANT' ? 'Tenant ID or slug...' : 'User ID or email...'}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') search(); }}
            sx={{
              minWidth: 260,
              '& .MuiOutlinedInput-root': {
                color: COLORS.text,
                '& fieldset': { borderColor: COLORS.bgAlt },
                '&:hover fieldset': { borderColor: COLORS.textDim },
              },
            }}
          />
          <Button
            variant="contained"
            startIcon={<IconSearch size={16} />}
            onClick={search}
            disabled={loading}
            sx={{
              bgcolor: COLORS.blue,
              color: COLORS.bgBase,
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: '8px',
              '&:hover': { bgcolor: '#7cb0f0' },
            }}
          >
            {loading ? 'Loading...' : 'Search'}
          </Button>
        </Stack>
      </Paper>

      {!searched ? (
        <Typography sx={{ color: COLORS.textDim, textAlign: 'center', py: 4 }}>
          Enter a tenant or user ID above to view and manage their feature overrides.
        </Typography>
      ) : (
        <Stack direction="row" spacing={2}>
          {/* Extra features column (granted) */}
          <Paper
            sx={{
              flex: 1,
              p: 2,
              bgcolor: COLORS.bg,
              borderRadius: '12px',
              border: `1px solid ${COLORS.bgAlt}`,
              minHeight: 240,
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                color: COLORS.green,
                mb: 1.5,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                fontSize: '0.78rem',
              }}
            >
              Extra Features (Granted)
            </Typography>
            {extraFeatures.length === 0 ? (
              <Typography variant="caption" sx={{ color: COLORS.textDim }}>
                No extra features granted. Use the feature list to add overrides.
              </Typography>
            ) : (
              <Stack spacing={0.5}>
                {extraFeatures.map((f) => (
                  <Box
                    key={f.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      px: 1.25,
                      py: 0.75,
                      borderRadius: '6px',
                      bgcolor: COLORS.bgAlt,
                    }}
                  >
                    <Box>
                      <Typography variant="body2" sx={{ color: COLORS.text, fontWeight: 600, fontSize: '0.78rem' }}>
                        {f.label}
                      </Typography>
                      <Typography variant="caption" sx={{ color: COLORS.textDim }}>
                        {f.key} &middot; {f.category}
                      </Typography>
                    </Box>
                    <Tooltip title="Remove override">
                      <IconButton
                        size="small"
                        onClick={() => handleToggleOverride(f.key, true)}
                        sx={{ color: COLORS.red }}
                      >
                        <IconX size={14} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>

          {/* Denied features column (revoked) */}
          <Paper
            sx={{
              flex: 1,
              p: 2,
              bgcolor: COLORS.bg,
              borderRadius: '12px',
              border: `1px solid ${COLORS.bgAlt}`,
              minHeight: 240,
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                color: COLORS.red,
                mb: 1.5,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                fontSize: '0.78rem',
              }}
            >
              Denied Features (Revoked)
            </Typography>
            {deniedFeatures.length === 0 ? (
              <Typography variant="caption" sx={{ color: COLORS.textDim }}>
                No features denied. Use the feature list to add denials.
              </Typography>
            ) : (
              <Stack spacing={0.5}>
                {deniedFeatures.map((f) => (
                  <Box
                    key={f.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      px: 1.25,
                      py: 0.75,
                      borderRadius: '6px',
                      bgcolor: COLORS.bgAlt,
                    }}
                  >
                    <Box>
                      <Typography variant="body2" sx={{ color: COLORS.text, fontWeight: 600, fontSize: '0.78rem' }}>
                        {f.label}
                      </Typography>
                      <Typography variant="caption" sx={{ color: COLORS.textDim }}>
                        {f.key} &middot; {f.category}
                      </Typography>
                    </Box>
                    <Tooltip title="Remove denial">
                      <IconButton
                        size="small"
                        onClick={() => handleToggleOverride(f.key, false)}
                        sx={{ color: COLORS.green }}
                      >
                        <IconX size={14} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>
        </Stack>
      )}

      {/* Quick-add panel — shows after search */}
      {searched && allFeatures.length > 0 && (
        <Paper
          sx={{
            mt: 2,
            p: 2,
            bgcolor: COLORS.bg,
            borderRadius: '12px',
            border: `1px solid ${COLORS.bgAlt}`,
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              color: COLORS.textDim,
              mb: 1.5,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              fontSize: '0.72rem',
            }}
          >
            Add Override
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {allFeatures
              .filter((f) => !extraFeatureKeys.has(f.key) && !deniedFeatureKeys.has(f.key))
              .map((f) => (
                <Box key={f.id} sx={{ display: 'flex', gap: 0.25 }}>
                  <Tooltip title={`Grant "${f.label}"`}>
                    <Chip
                      icon={<IconPlus size={12} />}
                      label={f.label}
                      size="small"
                      onClick={() => handleToggleOverride(f.key, true)}
                      sx={{
                        cursor: 'pointer',
                        bgcolor: COLORS.bgAlt,
                        color: COLORS.green,
                        fontWeight: 600,
                        fontSize: '0.68rem',
                        '&:hover': { bgcolor: '#45475a' },
                        '& .MuiChip-icon': { color: COLORS.green },
                      }}
                    />
                  </Tooltip>
                  <Tooltip title={`Deny "${f.label}"`}>
                    <Chip
                      icon={<IconX size={12} />}
                      label=""
                      size="small"
                      onClick={() => handleToggleOverride(f.key, false)}
                      sx={{
                        cursor: 'pointer',
                        bgcolor: COLORS.bgAlt,
                        color: COLORS.red,
                        minWidth: 28,
                        '&:hover': { bgcolor: '#45475a' },
                        '& .MuiChip-icon': { color: COLORS.red, margin: 0 },
                      }}
                    />
                  </Tooltip>
                </Box>
              ))}
            {allFeatures.filter((f) => !extraFeatureKeys.has(f.key) && !deniedFeatureKeys.has(f.key)).length === 0 && (
              <Typography variant="caption" sx={{ color: COLORS.textDim }}>
                All features already have an override configured.
              </Typography>
            )}
          </Box>
        </Paper>
      )}
    </Box>
  );
}
