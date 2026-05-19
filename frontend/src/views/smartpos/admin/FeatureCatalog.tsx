import { useCallback, useEffect, useState } from 'react';
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
import { IconEdit, IconTrash, IconPlus } from '@tabler/icons-react';
import {
  getAllFeatures,
  createFeature,
  updateFeature,
  deleteFeature,
  type FeatureDefinition,
  type CreateFeatureRequest,
  type UpdateFeatureRequest,
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

const CATEGORY_COLORS: Record<string, string> = {
  pos: COLORS.green,
  inventory: COLORS.blue,
  sales: COLORS.yellow,
  accounting: COLORS.purple,
  hrm: COLORS.red,
  crm: COLORS.blue,
  reports: COLORS.purple,
  marketing: COLORS.yellow,
  integrations: COLORS.blue,
  settings: COLORS.textMuted,
  admin: COLORS.red,
};

/* ── Main component ── */

export default function FeatureCatalog() {
  const [features, setFeatures] = useState<FeatureDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FeatureDefinition | null>(null);
  const [form, setForm] = useState({
    key: '',
    label: '',
    description: '',
    category: '',
    sortOrder: 0,
  });
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      setFeatures(await getAllFeatures());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load features');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  /* ── Dialog handlers ── */

  const openCreate = () => {
    setEditing(null);
    setForm({ key: '', label: '', description: '', category: '', sortOrder: 0 });
    setDialogOpen(true);
  };

  const openEdit = (f: FeatureDefinition) => {
    setEditing(f);
    setForm({
      key: f.key,
      label: f.label,
      description: f.description ?? '',
      category: f.category,
      sortOrder: f.sortOrder,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.key.trim() || !form.label.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        const body: UpdateFeatureRequest = {
          label: form.label,
          description: form.description || undefined,
          category: form.category,
          sortOrder: form.sortOrder,
          active: editing.active,
        };
        await updateFeature(editing.id, body);
      } else {
        const body: CreateFeatureRequest = {
          key: form.key.trim(),
          label: form.label,
          description: form.description || undefined,
          category: form.category,
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
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this feature?')) return;
    try {
      await deleteFeature(id);
      await fetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete feature');
    }
  };

  /* ── Render ── */

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Toolbar */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ color: COLORS.textMuted }}>
          {features.length} feature{features.length !== 1 ? 's' : ''} defined
        </Typography>
        <Button
          variant="contained"
          startIcon={<IconPlus size={16} />}
          onClick={openCreate}
          sx={{
            bgcolor: COLORS.blue,
            color: COLORS.bgBase,
            fontWeight: 700,
            textTransform: 'none',
            borderRadius: '8px',
            '&:hover': { bgcolor: '#7cb0f0' },
          }}
        >
          Add Feature
        </Button>
      </Stack>

      {/* Table */}
      {loading ? (
        <Typography sx={{ color: COLORS.textDim, textAlign: 'center', py: 4 }}>Loading...</Typography>
      ) : features.length === 0 ? (
        <Typography sx={{ color: COLORS.textDim, textAlign: 'center', py: 4 }}>
          No features defined yet.
        </Typography>
      ) : (
        <Box sx={{ overflow: 'auto' }}>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', color: COLORS.text }}>
            <Box component="thead">
              <Box component="tr" sx={{ borderBottom: `1px solid ${COLORS.bgAlt}` }}>
                {['Feature', 'Key', 'Category', 'Sort', 'Status', 'Actions'].map((h) => (
                  <Box
                    key={h}
                    component="th"
                    sx={{
                      px: 2,
                      py: 1.25,
                      textAlign: 'left',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: COLORS.textDim,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {h}
                  </Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {features.map((f) => (
                <Box
                  key={f.id}
                  component="tr"
                  sx={{
                    borderBottom: `1px solid ${COLORS.bgAlt}`,
                    '&:hover': { bgcolor: COLORS.bgAlt },
                  }}
                >
                  <Box component="td" sx={{ px: 2, py: 1.25, fontWeight: 600, fontSize: '0.82rem' }}>
                    {f.label}
                  </Box>
                  <Box component="td" sx={{ px: 2, py: 1.25, fontSize: '0.75rem', fontFamily: 'monospace', color: COLORS.textMuted }}>
                    {f.key}
                  </Box>
                  <Box component="td" sx={{ px: 2, py: 1.25 }}>
                    <Chip
                      label={f.category}
                      size="small"
                      sx={{
                        height: 20,
                        fontWeight: 600,
                        fontSize: '0.65rem',
                        bgcolor: CATEGORY_COLORS[f.category] ?? COLORS.bgAlt,
                        color: COLORS.bgBase,
                        borderRadius: '4px',
                      }}
                    />
                  </Box>
                  <Box component="td" sx={{ px: 2, py: 1.25, fontSize: '0.78rem', color: COLORS.textMuted }}>
                    {f.sortOrder}
                  </Box>
                  <Box component="td" sx={{ px: 2, py: 1.25 }}>
                    <Chip
                      label={f.active ? 'Active' : 'Inactive'}
                      size="small"
                      sx={{
                        height: 20,
                        fontWeight: 600,
                        fontSize: '0.65rem',
                        bgcolor: f.active ? COLORS.green : COLORS.red,
                        color: COLORS.bgBase,
                        borderRadius: '4px',
                      }}
                    />
                  </Box>
                  <Box component="td" sx={{ px: 2, py: 1.25 }}>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => openEdit(f)} sx={{ color: COLORS.blue }}>
                        <IconEdit size={16} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => handleDelete(f.id)} sx={{ color: COLORS.red }}>
                        <IconTrash size={16} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: COLORS.bg,
            color: COLORS.text,
            borderRadius: '16px',
            minWidth: 440,
            border: `1px solid ${COLORS.bgAlt}`,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
          {editing ? 'Edit Feature' : 'Add Feature'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Key"
              value={form.key}
              onChange={(e) => setForm({ ...form, key: e.target.value })}
              disabled={!!editing}
              size="small"
              fullWidth
              helperText={editing ? undefined : 'Unique identifier, e.g. "advanced_reports"'}
              InputLabelProps={{ sx: { color: COLORS.textDim } }}
              InputProps={{
                sx: { color: COLORS.text },
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: COLORS.bgAlt },
                },
                '& .MuiFormHelperText-root': { color: COLORS.textDim },
              }}
            />
            <TextField
              label="Label"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              size="small"
              fullWidth
              InputLabelProps={{ sx: { color: COLORS.textDim } }}
              InputProps={{ sx: { color: COLORS.text } }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: COLORS.bgAlt },
                },
              }}
            />
            <TextField
              label="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              size="small"
              fullWidth
              multiline
              rows={2}
              InputLabelProps={{ sx: { color: COLORS.textDim } }}
              InputProps={{ sx: { color: COLORS.text } }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: COLORS.bgAlt },
                },
              }}
            />
            <TextField
              label="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              size="small"
              fullWidth
              InputLabelProps={{ sx: { color: COLORS.textDim } }}
              InputProps={{ sx: { color: COLORS.text } }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: COLORS.bgAlt },
                },
              }}
            />
            <TextField
              label="Sort Order"
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
              size="small"
              fullWidth
              InputLabelProps={{ sx: { color: COLORS.textDim } }}
              InputProps={{ sx: { color: COLORS.text } }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: COLORS.bgAlt },
                },
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDialogOpen(false)}
            sx={{ color: COLORS.textMuted, textTransform: 'none', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !form.key.trim() || !form.label.trim()}
            sx={{
              bgcolor: COLORS.green,
              color: COLORS.bgBase,
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: '8px',
              '&:hover': { bgcolor: '#90d890' },
              '&.Mui-disabled': { bgcolor: COLORS.bgAlt, color: COLORS.textDim },
            }}
          >
            {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
