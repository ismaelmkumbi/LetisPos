import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { IconEdit, IconPlus, IconTrash } from '@tabler/icons-react';
import DataTable, { type Column, StatusBadge } from 'src/components/smartpos/DataTable';
import { brand } from 'src/theme/smartpos/brand';
import {
  getAllFeatures,
  createFeature,
  updateFeature,
  deleteFeature,
  type FeatureDefinition,
  type CreateFeatureRequest,
  type UpdateFeatureRequest,
} from 'src/api/smartpos/features';

const initialForm = {
  key: '',
  label: '',
  description: '',
  category: '',
  sortOrder: 0,
};

const categoryTone = (category: string) => {
  if (['admin', 'security'].includes(category)) return 'error';
  if (['reports', 'accounting'].includes(category)) return 'primary';
  if (['inventory', 'pos', 'sales'].includes(category)) return 'success';
  if (['integrations', 'settings'].includes(category)) return 'info';
  return 'neutral';
};

export default function FeatureCatalog() {
  const [features, setFeatures] = useState<FeatureDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FeatureDefinition | null>(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllFeatures();
      setFeatures(data.sort((a, b) => a.category.localeCompare(b.category) || a.sortOrder - b.sortOrder));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load features');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const openCreate = useCallback(() => {
    setEditing(null);
    setForm(initialForm);
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((feature: FeatureDefinition) => {
    setEditing(feature);
    setForm({
      key: feature.key,
      label: feature.label,
      description: feature.description ?? '',
      category: feature.category,
      sortOrder: feature.sortOrder,
    });
    setDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    if (!saving) setDialogOpen(false);
  }, [saving]);

  const handleSave = useCallback(async () => {
    if (!form.key.trim() || !form.label.trim() || !form.category.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        const body: UpdateFeatureRequest = {
          label: form.label.trim(),
          description: form.description.trim() || undefined,
          category: form.category.trim(),
          sortOrder: form.sortOrder,
          active: editing.active,
        };
        await updateFeature(editing.id, body);
      } else {
        const body: CreateFeatureRequest = {
          key: form.key.trim(),
          label: form.label.trim(),
          description: form.description.trim() || undefined,
          category: form.category.trim(),
          sortOrder: form.sortOrder,
        };
        await createFeature(body);
      }
      setDialogOpen(false);
      await fetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save feature');
    } finally {
      setSaving(false);
    }
  }, [editing, fetch, form]);

  const handleDelete = useCallback(async (feature: FeatureDefinition) => {
    if (!window.confirm(`Delete "${feature.label}"? Assigned plans and overrides may lose access.`)) return;
    try {
      await deleteFeature(feature.id);
      await fetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete feature');
    }
  }, [fetch]);

  const columns: Column<FeatureDefinition>[] = useMemo(
    () => [
      {
        key: 'feature',
        label: 'Feature',
        sortable: true,
        render: (feature) => (
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ color: brand.neutral[900], fontWeight: 850, fontSize: '0.86rem' }}>
              {feature.label}
            </Typography>
            <Typography sx={{ color: brand.neutral[500], fontWeight: 600, fontSize: '0.73rem' }}>
              {feature.description || 'No description'}
            </Typography>
          </Box>
        ),
        exportValue: (feature) => feature.label,
      },
      {
        key: 'key',
        label: 'Key',
        sortable: true,
        render: (feature) => (
          <Typography
            component="code"
            sx={{
              color: brand.neutral[700],
              bgcolor: brand.neutral[100],
              px: 0.75,
              py: 0.35,
              borderRadius: '5px',
              fontSize: '0.74rem',
              fontWeight: 700,
            }}
          >
            {feature.key}
          </Typography>
        ),
        exportValue: (feature) => feature.key,
      },
      {
        key: 'category',
        label: 'Category',
        width: 140,
        sortable: true,
        render: (feature) => <StatusBadge label={feature.category} tone={categoryTone(feature.category)} />,
        exportValue: (feature) => feature.category,
      },
      {
        key: 'sortOrder',
        label: 'Sort',
        width: 90,
        align: 'right',
        sortable: true,
        render: (feature) => (
          <Typography sx={{ color: brand.neutral[600], fontWeight: 800, fontSize: '0.8rem' }}>
            {feature.sortOrder}
          </Typography>
        ),
      },
      {
        key: 'active',
        label: 'Status',
        width: 110,
        render: (feature) => (
          <Chip
            label={feature.active ? 'Active' : 'Inactive'}
            size="small"
            sx={{
              height: 22,
              borderRadius: '6px',
              fontWeight: 800,
              bgcolor: feature.active ? brand.success.light : brand.neutral[100],
              color: feature.active ? brand.success.dark : brand.neutral[600],
            }}
          />
        ),
        exportValue: (feature) => (feature.active ? 'Active' : 'Inactive'),
      },
      {
        key: 'actions',
        label: '',
        width: 104,
        align: 'right',
        enableHiding: false,
        render: (feature) => (
          <Stack direction="row" spacing={0.25} justifyContent="flex-end">
            <Tooltip title="Edit feature">
              <IconButton size="small" aria-label={`Edit ${feature.label}`} onClick={() => openEdit(feature)}>
                <IconEdit size={16} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete feature">
              <IconButton
                size="small"
                aria-label={`Delete ${feature.label}`}
                onClick={() => handleDelete(feature)}
                sx={{ color: brand.error.main }}
              >
                <IconTrash size={16} />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },
    ],
    [handleDelete, openEdit],
  );

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <DataTable
        columns={columns}
        rows={features}
        loading={loading}
        getRowKey={(feature) => feature.id}
        tableKey="admin-feature-catalog"
        toolbarTitle={`${features.length} feature${features.length === 1 ? '' : 's'} defined`}
        emptyText="No feature flags have been created yet"
        itemLabel="features"
        enableSorting
        enableColumnVisibility
        enableExport
        enableExcelExport
        exportFileName="feature-catalog"
        emptyAction={{ label: 'Add feature', onClick: openCreate }}
        toolbar={
          <Button
            variant="contained"
            startIcon={<IconPlus size={16} />}
            onClick={openCreate}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 800,
              bgcolor: brand.primary[600],
              '&:hover': { bgcolor: brand.primary[700] },
            }}
          >
            Add Feature
          </Button>
        }
      />

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 850 }}>{editing ? 'Edit feature' : 'Add feature'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Feature key"
              value={form.key}
              onChange={(e) => setForm({ ...form, key: e.target.value })}
              disabled={!!editing}
              size="small"
              fullWidth
              required
              helperText={editing ? 'Keys cannot be changed after creation.' : 'Example: advanced_reports'}
            />
            <TextField
              label="Label"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              size="small"
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              size="small"
              fullWidth
              multiline
              rows={3}
            />
            <TextField
              label="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              size="small"
              fullWidth
              required
            />
            <TextField
              label="Sort order"
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
              size="small"
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeDialog} disabled={saving} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !form.key.trim() || !form.label.trim() || !form.category.trim()}
            sx={{ textTransform: 'none', fontWeight: 800, borderRadius: '8px' }}
          >
            {saving ? 'Saving...' : editing ? 'Save changes' : 'Create feature'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
