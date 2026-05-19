import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  IconButton,
} from '@mui/material';
import { IconGripVertical, IconSearch, IconX } from '@tabler/icons-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';

import {
  getAllFeatures,
  getAssignments,
  createAssignment,
  deleteAssignment,
  type FeatureDefinition,
  type FeatureAssignment,
} from 'src/api/smartpos/features';
import { brand } from 'src/theme/smartpos/brand';

const PLANS = ['STARTER', 'BUSINESS', 'PROFESSIONAL', 'ENTERPRISE'] as const;

const PLAN_STYLES: Record<string, { color: string; bg: string }> = {
  STARTER: { color: brand.neutral[700], bg: brand.neutral[100] },
  BUSINESS: { color: brand.info.dark, bg: brand.info.light },
  PROFESSIONAL: { color: brand.purple.dark, bg: brand.purple.light },
  ENTERPRISE: { color: brand.warning.dark, bg: brand.warning.light },
};

function featureMatches(feature: FeatureDefinition, search: string) {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return (
    feature.label.toLowerCase().includes(q) ||
    feature.key.toLowerCase().includes(q) ||
    feature.category.toLowerCase().includes(q)
  );
}

function DraggableFeature({ feature }: { feature: FeatureDefinition }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `feature-${feature.id}`,
    data: { featureKey: feature.key, type: 'feature' },
  });

  return (
    <Chip
      ref={setNodeRef}
      icon={<IconGripVertical size={13} />}
      label={feature.label}
      size="small"
      {...listeners}
      {...attributes}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        opacity: isDragging ? 0.55 : 1,
      }}
      sx={{
        cursor: 'grab',
        height: 30,
        borderRadius: '7px',
        bgcolor: '#FFFFFF',
        border: `1px solid ${brand.neutral[200]}`,
        color: brand.neutral[700],
        fontWeight: 750,
        fontSize: '0.75rem',
        '&:hover': { borderColor: brand.primary[300], bgcolor: brand.primary[50] },
        '& .MuiChip-icon': { color: brand.neutral[400] },
      }}
    />
  );
}

function DroppablePlan({
  planCode,
  features,
  assignedKeys,
  onRemove,
}: {
  planCode: string;
  features: FeatureDefinition[];
  assignedKeys: Set<string>;
  onRemove: (featureKey: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `plan-${planCode}`,
    data: { planCode, type: 'plan' },
  });
  const style = PLAN_STYLES[planCode] ?? PLAN_STYLES.STARTER;
  const assigned = features
    .filter((f) => assignedKeys.has(f.key))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));

  return (
    <Paper
      ref={setNodeRef}
      elevation={0}
      sx={{
        minWidth: { xs: 260, lg: 0 },
        flex: '1 1 0',
        minHeight: 340,
        p: 1.5,
        borderRadius: '10px',
        border: `1px solid ${isOver ? style.color : brand.neutral[200]}`,
        bgcolor: isOver ? style.bg : '#FFFFFF',
        transition: 'border-color 180ms ease-out, background-color 180ms ease-out',
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.25 }}>
        <Chip
          label={planCode}
          size="small"
          sx={{
            height: 24,
            borderRadius: '6px',
            bgcolor: style.bg,
            color: style.color,
            fontWeight: 850,
            letterSpacing: '0.02em',
          }}
        />
        <Typography sx={{ color: brand.neutral[500], fontWeight: 750, fontSize: '0.76rem' }}>
          {assigned.length} features
        </Typography>
      </Stack>

      <Stack spacing={0.75}>
        {assigned.map((feature) => (
          <Box
            key={feature.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              px: 1,
              py: 0.75,
              borderRadius: '8px',
              bgcolor: brand.neutral[50],
              border: `1px solid ${brand.neutral[200]}`,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 800, color: brand.neutral[800], fontSize: '0.8rem' }} noWrap>
                {feature.label}
              </Typography>
              <Typography sx={{ color: brand.neutral[500], fontWeight: 600, fontSize: '0.68rem' }} noWrap>
                {feature.key}
              </Typography>
            </Box>
            <Tooltip title="Remove from plan">
              <IconButton
                size="small"
                aria-label={`Remove ${feature.label} from ${planCode}`}
                onClick={() => onRemove(feature.key)}
                sx={{ color: brand.error.main, flexShrink: 0 }}
              >
                <IconX size={15} />
              </IconButton>
            </Tooltip>
          </Box>
        ))}
        {assigned.length === 0 && (
          <Box
            sx={{
              border: `1px dashed ${brand.neutral[300]}`,
              borderRadius: '10px',
              px: 1.5,
              py: 4,
              textAlign: 'center',
              color: brand.neutral[500],
              fontWeight: 700,
              fontSize: '0.82rem',
            }}
          >
            Drop features here
          </Box>
        )}
      </Stack>
    </Paper>
  );
}

export default function PlanComparison() {
  const [features, setFeatures] = useState<FeatureDefinition[]>([]);
  const [assignments, setAssignments] = useState<FeatureAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [featureData, assignmentData] = await Promise.all([getAllFeatures(), getAssignments()]);
      setFeatures(featureData);
      setAssignments(assignmentData);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load feature assignments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const categories = useMemo(
    () => [...new Set(features.map((f) => f.category).filter(Boolean))].sort(),
    [features],
  );

  const planAssignments = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    PLANS.forEach((plan) => {
      map[plan] = new Set<string>();
    });
    assignments.forEach((assignment) => {
      if (
        assignment.assignmentLevel === 'PLAN' &&
        PLANS.includes(assignment.targetId as (typeof PLANS)[number]) &&
        assignment.granted
      ) {
        map[assignment.targetId].add(assignment.featureKey);
      }
    });
    return map;
  }, [assignments]);

  const assignmentMap = useMemo(() => {
    const map = new Map<string, string>();
    assignments.forEach((assignment) => {
      if (assignment.assignmentLevel === 'PLAN') {
        map.set(`${assignment.featureKey}_${assignment.targetId}`, assignment.id);
      }
    });
    return map;
  }, [assignments]);

  const assignedKeys = useMemo(() => {
    const keys = new Set<string>();
    Object.values(planAssignments).forEach((set) => set.forEach((key) => keys.add(key)));
    return keys;
  }, [planAssignments]);

  const filteredFeatures = useMemo(
    () =>
      features
        .filter((feature) => (category ? feature.category === category : true))
        .filter((feature) => featureMatches(feature, search))
        .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label)),
    [features, category, search],
  );

  const unassignedFeatures = filteredFeatures.filter((feature) => !assignedKeys.has(feature.key));

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const featureKey = event.active.data.current?.featureKey as string | undefined;
      const targetPlan = event.over?.data.current?.planCode as string | undefined;
      if (!featureKey || !targetPlan || planAssignments[targetPlan]?.has(featureKey)) return;

      try {
        await createAssignment({
          featureKey,
          assignmentLevel: 'PLAN',
          targetId: targetPlan,
          granted: true,
        });
        await fetch();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to assign feature');
      }
    },
    [fetch, planAssignments],
  );

  const handleRemove = useCallback(
    async (featureKey: string, planCode: string) => {
      const assignmentId = assignmentMap.get(`${featureKey}_${planCode}`);
      if (!assignmentId) return;
      try {
        await deleteAssignment(assignmentId);
        await fetch();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to remove feature');
      }
    },
    [assignmentMap, fetch],
  );

  if (loading) {
    return (
      <Stack spacing={2}>
        <Skeleton variant="rounded" height={44} />
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.5}>
          {PLANS.map((plan) => (
            <Skeleton key={plan} variant="rounded" height={340} sx={{ flex: 1 }} />
          ))}
        </Stack>
      </Stack>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.25}
        alignItems={{ xs: 'stretch', md: 'center' }}
        sx={{ mb: 2 }}
      >
        <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 180 } }}>
          <InputLabel>Category</InputLabel>
          <Select value={category} label="Category" onChange={(e) => setCategory(e.target.value)}>
            <MenuItem value="">All categories</MenuItem>
            {categories.map((item) => (
              <MenuItem key={item} value={item}>
                {item}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          size="small"
          placeholder="Search feature name, key, or category"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: <IconSearch size={16} color={brand.neutral[400]} /> }}
          sx={{ flex: 1, minWidth: { xs: '100%', md: 260 } }}
        />
      </Stack>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          spacing={1.5}
          sx={{ mb: 2.5, overflowX: { xs: 'visible', lg: 'auto' } }}
        >
          {PLANS.map((plan) => (
            <DroppablePlan
              key={plan}
              planCode={plan}
              features={features}
              assignedKeys={planAssignments[plan]}
              onRemove={(featureKey) => handleRemove(featureKey, plan)}
            />
          ))}
        </Stack>

        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            borderRadius: '10px',
            border: `1px solid ${brand.neutral[200]}`,
            bgcolor: brand.neutral[50],
          }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1} sx={{ mb: 1.25 }}>
            <Typography sx={{ color: brand.neutral[800], fontWeight: 850, fontSize: '0.88rem' }}>
              Feature bank
            </Typography>
            <Typography sx={{ color: brand.neutral[500], fontWeight: 700, fontSize: '0.76rem' }}>
              {unassignedFeatures.length} available after filters
            </Typography>
          </Stack>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {unassignedFeatures.map((feature) => (
              <DraggableFeature key={feature.id} feature={feature} />
            ))}
            {unassignedFeatures.length === 0 && (
              <Typography sx={{ color: brand.neutral[500], fontWeight: 650, fontSize: '0.82rem', py: 1 }}>
                No available features match the current filters.
              </Typography>
            )}
          </Box>
        </Paper>
      </DndContext>
    </Box>
  );
}
