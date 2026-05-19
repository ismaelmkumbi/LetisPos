import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import { IconCircleCheck, IconCircleX, IconSearch, IconX } from '@tabler/icons-react';

import {
  getAllFeatures,
  getAssignments,
  createAssignment,
  deleteAssignment,
  type FeatureDefinition,
  type FeatureAssignment,
} from 'src/api/smartpos/features';
import { brand } from 'src/theme/smartpos/brand';

type Level = 'TENANT' | 'USER';

function OverrideList({
  title,
  tone,
  features,
  emptyText,
  onRemove,
}: {
  title: string;
  tone: 'success' | 'error';
  features: FeatureDefinition[];
  emptyText: string;
  onRemove: (featureKey: string) => void;
}) {
  const color = tone === 'success' ? brand.success.dark : brand.error.dark;
  const bg = tone === 'success' ? brand.success.light : brand.error.light;

  return (
    <Card
      elevation={0}
      sx={{
        flex: 1,
        p: 1.5,
        borderRadius: '10px',
        border: `1px solid ${brand.neutral[200]}`,
        minHeight: 260,
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.25 }}>
        <Typography sx={{ color, fontWeight: 850, fontSize: '0.82rem' }}>{title}</Typography>
        <Chip
          label={features.length}
          size="small"
          sx={{ height: 22, borderRadius: '6px', bgcolor: bg, color, fontWeight: 850 }}
        />
      </Stack>

      <Stack spacing={0.75}>
        {features.map((feature) => (
          <Box
            key={feature.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              px: 1,
              py: 0.85,
              borderRadius: '8px',
              bgcolor: brand.neutral[50],
              border: `1px solid ${brand.neutral[200]}`,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ color: brand.neutral[800], fontWeight: 800, fontSize: '0.82rem' }} noWrap>
                {feature.label}
              </Typography>
              <Typography sx={{ color: brand.neutral[500], fontWeight: 600, fontSize: '0.7rem' }} noWrap>
                {feature.key} · {feature.category}
              </Typography>
            </Box>
            <Tooltip title="Remove override">
              <IconButton
                size="small"
                aria-label={`Remove ${feature.label} override`}
                onClick={() => onRemove(feature.key)}
                sx={{ color: brand.error.main, flexShrink: 0 }}
              >
                <IconX size={15} />
              </IconButton>
            </Tooltip>
          </Box>
        ))}
        {features.length === 0 && (
          <Box
            sx={{
              border: `1px dashed ${brand.neutral[300]}`,
              borderRadius: '10px',
              px: 1.5,
              py: 4,
              textAlign: 'center',
            }}
          >
            <Typography sx={{ color: brand.neutral[500], fontWeight: 650, fontSize: '0.82rem' }}>
              {emptyText}
            </Typography>
          </Box>
        )}
      </Stack>
    </Card>
  );
}

export default function TenantUserOverrides() {
  const [allFeatures, setAllFeatures] = useState<FeatureDefinition[]>([]);
  const [level, setLevel] = useState<Level>('TENANT');
  const [targetId, setTargetId] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [filter, setFilter] = useState('');
  const [overrides, setOverrides] = useState<FeatureAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    getAllFeatures()
      .then((features) => setAllFeatures(features.sort((a, b) => a.label.localeCompare(b.label))))
      .catch(() => {
        setAllFeatures([]);
      });
  }, []);

  const refreshOverrides = useCallback(
    async (target = targetId) => {
      if (!target) return;
      const results = await getAssignments({ level, targetId: target });
      setOverrides(results);
    },
    [level, targetId],
  );

  const search = useCallback(async () => {
    const id = searchValue.trim();
    if (!id) {
      setError('Enter a tenant ID, user ID, slug, or email before searching.');
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

  const handleToggleOverride = useCallback(
    async (featureKey: string, granted: boolean) => {
      if (!targetId) return;
      setError(null);

      const existing = overrides.find(
        (override) =>
          override.featureKey === featureKey &&
          override.assignmentLevel === level &&
          override.targetId === targetId,
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
        await refreshOverrides();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to update override');
      }
    },
    [level, targetId, overrides, refreshOverrides],
  );

  const extraFeatureKeys = useMemo(
    () => new Set(overrides.filter((override) => override.granted).map((override) => override.featureKey)),
    [overrides],
  );
  const deniedFeatureKeys = useMemo(
    () => new Set(overrides.filter((override) => !override.granted).map((override) => override.featureKey)),
    [overrides],
  );

  const extraFeatures = allFeatures.filter((feature) => extraFeatureKeys.has(feature.key));
  const deniedFeatures = allFeatures.filter((feature) => deniedFeatureKeys.has(feature.key));
  const availableFeatures = allFeatures
    .filter((feature) => !extraFeatureKeys.has(feature.key) && !deniedFeatureKeys.has(feature.key))
    .filter((feature) => {
      const q = filter.trim().toLowerCase();
      if (!q) return true;
      return (
        feature.label.toLowerCase().includes(q) ||
        feature.key.toLowerCase().includes(q) ||
        feature.category.toLowerCase().includes(q)
      );
    });

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card
        elevation={0}
        sx={{
          p: 1.5,
          mb: 2,
          borderRadius: '10px',
          border: `1px solid ${brand.neutral[200]}`,
          bgcolor: brand.neutral[50],
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} alignItems={{ xs: 'stretch', md: 'center' }}>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={level}
            onChange={(_, value) => value && setLevel(value)}
            aria-label="Override target type"
            sx={{
              '& .MuiToggleButton-root': {
                textTransform: 'none',
                fontWeight: 800,
                px: 1.75,
              },
            }}
          >
            <ToggleButton value="TENANT">Tenant</ToggleButton>
            <ToggleButton value="USER">User</ToggleButton>
          </ToggleButtonGroup>

          <TextField
            size="small"
            placeholder={level === 'TENANT' ? 'Tenant ID or slug' : 'User ID or email'}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') search();
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <IconSearch size={16} />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1, minWidth: { xs: '100%', md: 280 }, bgcolor: '#FFFFFF' }}
          />

          <Button
            variant="contained"
            startIcon={<IconSearch size={16} />}
            onClick={search}
            disabled={loading}
            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 850, minHeight: 40 }}
          >
            {loading ? 'Loading...' : 'Load Overrides'}
          </Button>
        </Stack>
      </Card>

      {!searched ? (
        <Box
          sx={{
            border: `1px dashed ${brand.neutral[300]}`,
            borderRadius: '12px',
            px: 2,
            py: 6,
            textAlign: 'center',
            bgcolor: '#FFFFFF',
          }}
        >
          <Typography sx={{ color: brand.neutral[800], fontWeight: 850 }}>
            Search a target to manage exceptions.
          </Typography>
          <Typography sx={{ color: brand.neutral[500], fontWeight: 600, fontSize: '0.86rem', mt: 0.5 }}>
            Overrides should be rare, visible, and easy to remove.
          </Typography>
        </Box>
      ) : (
        <>
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.5}>
            <OverrideList
              title="Granted Features"
              tone="success"
              features={extraFeatures}
              emptyText="No extra features are granted."
              onRemove={(featureKey) => handleToggleOverride(featureKey, true)}
            />
            <OverrideList
              title="Denied Features"
              tone="error"
              features={deniedFeatures}
              emptyText="No features are denied."
              onRemove={(featureKey) => handleToggleOverride(featureKey, false)}
            />
          </Stack>

          <Card
            elevation={0}
            sx={{
              mt: 1.5,
              p: 1.5,
              borderRadius: '10px',
              border: `1px solid ${brand.neutral[200]}`,
              bgcolor: '#FFFFFF',
            }}
          >
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} justifyContent="space-between" sx={{ mb: 1.25 }}>
              <Box>
                <Typography sx={{ color: brand.neutral[900], fontWeight: 850, fontSize: '0.9rem' }}>
                  Add override
                </Typography>
                <Typography sx={{ color: brand.neutral[500], fontWeight: 650, fontSize: '0.76rem' }}>
                  Target: {targetId}
                </Typography>
              </Box>
              <TextField
                size="small"
                placeholder="Filter available features"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                sx={{ minWidth: { xs: '100%', md: 260 } }}
              />
            </Stack>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {availableFeatures.map((feature) => (
                <Stack
                  key={feature.id}
                  direction="row"
                  sx={{
                    border: `1px solid ${brand.neutral[200]}`,
                    borderRadius: '8px',
                    overflow: 'hidden',
                    bgcolor: brand.neutral[50],
                  }}
                >
                  <Tooltip title={`Grant ${feature.label}`}>
                    <Button
                      size="small"
                      startIcon={<IconCircleCheck size={14} />}
                      onClick={() => handleToggleOverride(feature.key, true)}
                      sx={{
                        minHeight: 32,
                        borderRadius: 0,
                        color: brand.success.dark,
                        textTransform: 'none',
                        fontWeight: 800,
                      }}
                    >
                      {feature.label}
                    </Button>
                  </Tooltip>
                  <Tooltip title={`Deny ${feature.label}`}>
                    <IconButton
                      size="small"
                      aria-label={`Deny ${feature.label}`}
                      onClick={() => handleToggleOverride(feature.key, false)}
                      sx={{
                        width: 34,
                        borderRadius: 0,
                        borderLeft: `1px solid ${brand.neutral[200]}`,
                        color: brand.error.main,
                      }}
                    >
                      <IconCircleX size={15} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              ))}
              {availableFeatures.length === 0 && (
                <Typography sx={{ color: brand.neutral[500], fontWeight: 650, py: 1, fontSize: '0.82rem' }}>
                  No available features match the current filter.
                </Typography>
              )}
            </Box>
          </Card>
        </>
      )}
    </Box>
  );
}
