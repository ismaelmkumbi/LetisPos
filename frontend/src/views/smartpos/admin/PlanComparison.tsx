import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
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
import { IconCheck, IconEye, IconEyeOff, IconGripVertical, IconListTree, IconSearch, IconX } from '@tabler/icons-react';
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
  getFullMenu,
  type FeatureDefinition,
  type FeatureAssignment,
  type MenuDefinition,
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

type MenuDefinitionWithDepth = MenuDefinition & { depth: number };

function flattenMenuBranch(items: MenuDefinition[], depth = 0): MenuDefinitionWithDepth[] {
  return items.flatMap((item) => [
    { ...item, depth },
    ...flattenMenuBranch(item.children ?? [], depth + 1),
  ]);
}

function collectMenuFeatureKeys(items: MenuDefinition[]) {
  return [
    ...new Set(
      flattenMenuBranch(items)
        .map((item) => item.requiredFeatureKey)
        .filter((key): key is string => Boolean(key)),
    ),
  ];
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
  const [menu, setMenu] = useState<MenuDefinition[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [featureData, assignmentData, menuData] = await Promise.all([
        getAllFeatures(),
        getAssignments(),
        getFullMenu(),
      ]);
      setFeatures(featureData);
      setAssignments(assignmentData);
      setMenu(menuData);
      setSelectedSectionId((current) => current || menuData[0]?.id || '');
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

  const featureByKey = useMemo(() => {
    const map = new Map<string, FeatureDefinition>();
    features.forEach((feature) => {
      map.set(feature.key, feature);
    });
    return map;
  }, [features]);

  const menuSections = useMemo(
    () => menu.filter((item) => item.sectionHeader || item.children.length > 0),
    [menu],
  );

  const selectedSection = useMemo(
    () => menuSections.find((item) => item.id === selectedSectionId) ?? menuSections[0] ?? null,
    [menuSections, selectedSectionId],
  );

  const selectedSectionItems = useMemo(
    () => (selectedSection ? flattenMenuBranch(selectedSection.children ?? []) : []),
    [selectedSection],
  );

  const selectedSectionFeatureKeys = useMemo(
    () => (selectedSection ? collectMenuFeatureKeys(selectedSection.children ?? []) : []),
    [selectedSection],
  );

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

  const handleTogglePlanFeature = useCallback(
    async (featureKey: string, planCode: string) => {
      try {
        if (planAssignments[planCode]?.has(featureKey)) {
          const assignmentId = assignmentMap.get(`${featureKey}_${planCode}`);
          if (assignmentId) {
            await deleteAssignment(assignmentId);
          }
        } else {
          await createAssignment({
            featureKey,
            assignmentLevel: 'PLAN',
            targetId: planCode,
            granted: true,
          });
        }
        await fetch();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to update menu visibility');
      }
    },
    [assignmentMap, fetch, planAssignments],
  );

  const handleGrantSection = useCallback(
    async (planCode: string) => {
      const missingKeys = selectedSectionFeatureKeys.filter((key) => !planAssignments[planCode]?.has(key));
      if (missingKeys.length === 0) return;
      try {
        await Promise.all(
          missingKeys.map((featureKey) =>
            createAssignment({
              featureKey,
              assignmentLevel: 'PLAN',
              targetId: planCode,
              granted: true,
            }),
          ),
        );
        await fetch();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to grant section');
      }
    },
    [fetch, planAssignments, selectedSectionFeatureKeys],
  );

  const handleRemoveSection = useCallback(
    async (planCode: string) => {
      const assignmentIds = selectedSectionFeatureKeys
        .map((featureKey) => assignmentMap.get(`${featureKey}_${planCode}`))
        .filter((id): id is string => Boolean(id));
      if (assignmentIds.length === 0) return;
      try {
        await Promise.all(assignmentIds.map((id) => deleteAssignment(id)));
        await fetch();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to remove section');
      }
    },
    [assignmentMap, fetch, selectedSectionFeatureKeys],
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

        {selectedSection && (
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              mb: 2.5,
              borderRadius: '10px',
              border: `1px solid ${brand.neutral[200]}`,
              bgcolor: '#FFFFFF',
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: brand.primary[50],
                  color: brand.primary[700],
                }}
              >
                <IconListTree size={18} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ color: brand.neutral[900], fontWeight: 900, fontSize: '0.94rem' }}>
                  Menu section visibility
                </Typography>
                <Typography sx={{ color: brand.neutral[500], fontWeight: 650, fontSize: '0.76rem' }}>
                  Open a legacy-style section, then grant the full section or individual menu items per plan.
                </Typography>
              </Box>
            </Stack>

            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.5}>
              <Stack
                spacing={0.75}
                sx={{
                  width: { xs: '100%', lg: 240 },
                  flexShrink: 0,
                }}
              >
                {menuSections.map((section) => {
                  const keys = collectMenuFeatureKeys(section.children ?? []);
                  const isSelected = selectedSection.id === section.id;
                  return (
                    <Button
                      key={section.id}
                      fullWidth
                      onClick={() => setSelectedSectionId(section.id)}
                      variant={isSelected ? 'contained' : 'outlined'}
                      sx={{
                        justifyContent: 'space-between',
                        minHeight: 38,
                        borderRadius: '8px',
                        textTransform: 'none',
                        fontWeight: 850,
                        boxShadow: 'none',
                        bgcolor: isSelected ? brand.primary[600] : '#FFFFFF',
                        borderColor: isSelected ? brand.primary[600] : brand.neutral[200],
                        color: isSelected ? '#FFFFFF' : brand.neutral[700],
                        '&:hover': {
                          boxShadow: 'none',
                          bgcolor: isSelected ? brand.primary[700] : brand.primary[50],
                          borderColor: brand.primary[300],
                        },
                      }}
                      endIcon={
                        <Chip
                          label={keys.length}
                          size="small"
                          sx={{
                            height: 20,
                            minWidth: 28,
                            borderRadius: '6px',
                            bgcolor: isSelected ? 'rgba(255,255,255,0.16)' : brand.neutral[100],
                            color: isSelected ? '#FFFFFF' : brand.neutral[600],
                            fontWeight: 850,
                          }}
                        />
                      }
                    >
                      <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {section.label}
                      </Box>
                    </Button>
                  );
                })}
              </Stack>

              <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', lg: 'block' } }} />

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ xs: 'stretch', md: 'flex-start' }}
                  spacing={1}
                  sx={{ mb: 1.25 }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ color: brand.neutral[900], fontWeight: 900, fontSize: '0.9rem' }}>
                      {selectedSection.label}
                    </Typography>
                    <Typography sx={{ color: brand.neutral[500], fontWeight: 650, fontSize: '0.74rem' }}>
                      {selectedSectionFeatureKeys.length} permission keys control this section
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                    {PLANS.map((plan) => {
                      const grantedCount = selectedSectionFeatureKeys.filter((key) =>
                        planAssignments[plan]?.has(key),
                      ).length;
                      return (
                        <Stack key={plan} direction="row" spacing={0.5}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<IconCheck size={14} />}
                            onClick={() => handleGrantSection(plan)}
                            disabled={selectedSectionFeatureKeys.length === 0 || grantedCount === selectedSectionFeatureKeys.length}
                            sx={{ borderRadius: '7px', textTransform: 'none', fontWeight: 800 }}
                          >
                            {plan}
                          </Button>
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => handleRemoveSection(plan)}
                            disabled={grantedCount === 0}
                            sx={{ borderRadius: '7px', textTransform: 'none', fontWeight: 800, color: brand.error.main }}
                          >
                            Clear
                          </Button>
                        </Stack>
                      );
                    })}
                  </Stack>
                </Stack>

                <Stack spacing={0.75}>
                  {selectedSectionItems.map((item) => {
                    const feature = item.requiredFeatureKey ? featureByKey.get(item.requiredFeatureKey) : null;
                    return (
                      <Box
                        key={item.id}
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', xl: 'minmax(260px, 1fr) repeat(4, minmax(108px, 128px))' },
                          gap: 0.75,
                          alignItems: 'center',
                          px: 1,
                          py: 0.85,
                          borderRadius: '8px',
                          border: `1px solid ${brand.neutral[200]}`,
                          bgcolor: item.visible ? '#FFFFFF' : brand.neutral[50],
                        }}
                      >
                        <Box sx={{ minWidth: 0, pl: item.depth * 1.25 }}>
                          <Stack direction="row" alignItems="center" spacing={0.75}>
                            <Typography
                              sx={{
                                color: item.visible ? brand.neutral[800] : brand.neutral[500],
                                fontWeight: 850,
                                fontSize: '0.82rem',
                              }}
                              noWrap
                            >
                              {item.label}
                            </Typography>
                            {!item.visible && <Chip label="Hidden globally" size="small" sx={{ height: 20, borderRadius: '6px' }} />}
                          </Stack>
                          <Typography sx={{ color: brand.neutral[500], fontWeight: 650, fontSize: '0.7rem' }} noWrap>
                            {item.route || 'Group'} · {item.requiredFeatureKey || 'No plan permission key'}
                            {feature ? ` · ${feature.label}` : ''}
                          </Typography>
                        </Box>

                        {PLANS.map((plan) => {
                          const enabled = Boolean(item.requiredFeatureKey && planAssignments[plan]?.has(item.requiredFeatureKey));
                          return item.requiredFeatureKey ? (
                            <Button
                              key={plan}
                              size="small"
                              variant={enabled ? 'contained' : 'outlined'}
                              startIcon={enabled ? <IconEye size={14} /> : <IconEyeOff size={14} />}
                              onClick={() => handleTogglePlanFeature(item.requiredFeatureKey as string, plan)}
                              sx={{
                                minHeight: 30,
                                borderRadius: '7px',
                                textTransform: 'none',
                                fontWeight: 850,
                                boxShadow: 'none',
                                bgcolor: enabled ? PLAN_STYLES[plan].color : '#FFFFFF',
                                borderColor: enabled ? PLAN_STYLES[plan].color : brand.neutral[200],
                                color: enabled ? '#FFFFFF' : brand.neutral[600],
                                '&:hover': {
                                  boxShadow: 'none',
                                  bgcolor: enabled ? PLAN_STYLES[plan].color : brand.primary[50],
                                  borderColor: enabled ? PLAN_STYLES[plan].color : brand.primary[300],
                                },
                              }}
                            >
                              {enabled ? 'Visible' : 'Hidden'}
                            </Button>
                          ) : (
                            <Chip
                              key={plan}
                              label="Always visible"
                              size="small"
                              sx={{
                                justifySelf: 'stretch',
                                height: 30,
                                borderRadius: '7px',
                                bgcolor: brand.neutral[100],
                                color: brand.neutral[600],
                                fontWeight: 800,
                              }}
                            />
                          );
                        })}
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            </Stack>
          </Paper>
        )}

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
