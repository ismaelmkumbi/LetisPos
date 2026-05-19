import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { IconX } from '@tabler/icons-react';
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

const PLAN_COLORS: Record<string, string> = {
  STARTER: COLORS.yellow,
  BUSINESS: COLORS.blue,
  PROFESSIONAL: COLORS.purple,
  ENTERPRISE: COLORS.red,
};

const PLANS = ['STARTER', 'BUSINESS', 'PROFESSIONAL', 'ENTERPRISE'] as const;

/* ── Draggable feature chip ── */

function DraggableChip({ feature }: { feature: FeatureDefinition }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `feature-${feature.id}`,
    data: { featureKey: feature.key, type: 'feature' },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.5 : 1 }
    : undefined;

  return (
    <Chip
      ref={setNodeRef}
      label={feature.label}
      size="small"
      {...listeners}
      {...attributes}
      sx={{
        cursor: 'grab',
        m: 0.25,
        style,
        bgcolor: COLORS.bgAlt,
        color: COLORS.text,
        fontWeight: 600,
        fontSize: '0.72rem',
        '&:hover': { bgcolor: '#45475a' },
      }}
    />
  );
}

/* ── Droppable plan column ── */

function DroppableColumn({
  planCode,
  features,
  assignedKeys,
  onRemove,
}: {
  planCode: string;
  features: FeatureDefinition[];
  assignedKeys: Set<string>;
  onRemove: (assignmentId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `plan-${planCode}`,
    data: { planCode, type: 'plan' },
  });

  const planColor = PLAN_COLORS[planCode] ?? COLORS.text;

  const assigned = features.filter((f) => assignedKeys.has(f.key));

  return (
    <Paper
      ref={setNodeRef}
      sx={{
        flex: 1,
        minWidth: 220,
        minHeight: 320,
        p: 1.5,
        bgcolor: isOver ? '#45475a' : COLORS.bg,
        borderRadius: '12px',
        border: `2px solid ${isOver ? planColor : COLORS.bgAlt}`,
        transition: 'border-color 0.2s, background-color 0.2s',
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{
          fontWeight: 800,
          color: planColor,
          mb: 1,
          textAlign: 'center',
          letterSpacing: '0.04em',
        }}
      >
        {planCode}
      </Typography>
      <Typography
        variant="caption"
        sx={{ display: 'block', textAlign: 'center', color: COLORS.textDim, mb: 1.5 }}
      >
        {assigned.length} feature{assigned.length !== 1 ? 's' : ''}
      </Typography>
      <Stack spacing={0.5}>
        {assigned.map((f) => (
          <Box
            key={f.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 1,
              py: 0.5,
              borderRadius: '6px',
              bgcolor: COLORS.bgAlt,
            }}
          >
            <Typography variant="caption" sx={{ color: COLORS.text, fontWeight: 500, fontSize: '0.72rem' }}>
              {f.label}
            </Typography>
            <Tooltip title="Remove from plan">
              <IconButton
                size="small"
                onClick={() => {
                  // Find the assignment to delete
                  const match = assigned.find((a) => a.key === f.key);
                  if (match) onRemove(f.key);
                }}
                sx={{ color: COLORS.red, p: 0.25 }}
              >
                <IconX size={12} />
              </IconButton>
            </Tooltip>
          </Box>
        ))}
        {assigned.length === 0 && (
          <Typography variant="caption" sx={{ color: COLORS.textDim, textAlign: 'center', mt: 2 }}>
            Drop features here
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}

/* ── Main component ── */

export default function PlanComparison() {
  const [features, setFeatures] = useState<FeatureDefinition[]>([]);
  const [assignments, setAssignments] = useState<FeatureAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [feats, assigns] = await Promise.all([
        getAllFeatures(),
        getAssignments(),
      ]);
      setFeatures(feats);
      setAssignments(assigns);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  /* ── Derived data ── */

  const categories = useMemo(
    () => [...new Set(features.map((f) => f.category))].sort(),
    [features],
  );

  const planAssignments = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    PLANS.forEach((p) => (map[p] = new Set<string>()));
    for (const a of assignments) {
      if (a.assignmentLevel === 'PLAN' && PLANS.includes(a.targetId as typeof PLANS[number]) && a.granted) {
        map[a.targetId].add(a.featureKey);
      }
    }
    return map;
  }, [assignments]);

  const assignmentMap = useMemo(() => {
    const map = new Map<string, string>(); // featureKey_planCode -> assignmentId
    for (const a of assignments) {
      if (a.assignmentLevel === 'PLAN' && PLANS.includes(a.targetId as typeof PLANS[number])) {
        map.set(`${a.featureKey}_${a.targetId}`, a.id);
      }
    }
    return map;
  }, [assignments]);

  const assignedKeys = useMemo(() => {
    const s = new Set<string>();
    Object.values(planAssignments).forEach((ks) => ks.forEach((k) => s.add(k)));
    return s;
  }, [planAssignments]);

  const filteredFeatures = useMemo(() => {
    return features
      .filter((f) => (category ? f.category === category : true))
      .filter((f) => (search ? f.label.toLowerCase().includes(search.toLowerCase()) || f.key.toLowerCase().includes(search.toLowerCase()) : true))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [features, category, search]);

  /* ── DnD handler ── */

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;

      const featureKey = active.data.current?.featureKey as string | undefined;
      const targetPlan = over.data.current?.planCode as string | undefined;

      if (!featureKey || !targetPlan) return;

      // If already assigned to this plan, do nothing
      if (planAssignments[targetPlan]?.has(featureKey)) return;

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

  /* ── Remove from plan ── */

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

  /* ── Render ── */

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', color: COLORS.textDim }}>
        Loading...
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}
      >
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel sx={{ color: COLORS.textDim }}>Category</InputLabel>
          <Select
            value={category}
            label="Category"
            onChange={(e) => setCategory(e.target.value)}
            sx={{
              color: COLORS.text,
              '& .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.bgAlt },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.textDim },
              '& .MuiSvgIcon-root': { color: COLORS.textDim },
            }}
          >
            <MenuItem value="">All categories</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c} value={c}>{c}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          size="small"
          placeholder="Search features..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{
            minWidth: 240,
            '& .MuiOutlinedInput-root': {
              color: COLORS.text,
              '& fieldset': { borderColor: COLORS.bgAlt },
              '&:hover fieldset': { borderColor: COLORS.textDim },
            },
          }}
        />
      </Stack>

      {/* Plan columns */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          {PLANS.map((plan) => (
            <DroppableColumn
              key={plan}
              planCode={plan}
              features={features}
              assignedKeys={planAssignments[plan]}
              onRemove={(featureKey) => handleRemove(featureKey, plan)}
            />
          ))}
        </Stack>

        {/* Feature bank */}
        <Paper
          sx={{
            p: 2,
            bgcolor: COLORS.bgBase,
            borderRadius: '12px',
            border: `1px solid ${COLORS.bgAlt}`,
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{ color: COLORS.textDim, mb: 1, fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}
          >
            Feature Bank (drag into plan columns above)
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25 }}>
            {filteredFeatures
              .filter((f) => !assignedKeys.has(f.key))
              .map((f) => (
                <DraggableChip key={f.id} feature={f} />
              ))}
            {filteredFeatures.filter((f) => !assignedKeys.has(f.key)).length === 0 && (
              <Typography variant="caption" sx={{ color: COLORS.textDim }}>
                All features are assigned to plans.
              </Typography>
            )}
          </Box>
        </Paper>
      </DndContext>
    </Box>
  );
}
