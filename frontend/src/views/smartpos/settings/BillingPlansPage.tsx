import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, Grid, IconButton, MenuItem, Stack, Switch, TextField, Typography,
} from '@mui/material';
import { IconEdit, IconFileInvoice } from '@tabler/icons-react';

import { listAllPlans, updatePlan, type PlanDefinition } from 'src/api/smartpos/billing';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { brand } from 'src/theme/smartpos/brand';

const ALL_FEATURES: Record<string, string> = {
  accounting: 'Accounting Suite',
  purchases: 'Purchases & Suppliers',
  reports: 'Advanced Reports',
  hrm: 'HR & Payroll',
  api: 'API Access',
  multi_currency: 'Multi-Currency',
  multi_company: 'Multi-Company',
  white_label: 'White-Label',
  support: 'Priority Support',
};

const SUPPORT_LEVELS = ['community', 'email', 'priority_email', 'chat_phone', 'dedicated_am'] as const;

function formatTzs(amount: number): string {
  return new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

function parseFeatures(features: string): Record<string, unknown> {
  try { return JSON.parse(features); } catch { return {}; }
}

interface EditForm {
  label: string;
  description: string;
  monthlyPriceTzs: string;
  annualPriceTzs: string;
  maxUsers: string;
  maxStores: string;
  maxProducts: string;
  features: Record<string, boolean>;
  featureValues: Record<string, string>;
}

function toForm(p: PlanDefinition): EditForm {
  const f = parseFeatures(p.features);
  const featureBools: Record<string, boolean> = {};
  const featureValues: Record<string, string> = {};
  for (const [k] of Object.entries(ALL_FEATURES)) {
    const val = f[k];
    featureBools[k] = val === true || val === 'full' || val === 'full_export' || val === 'full_custom' || (typeof val === 'string' && val.length > 0);
    featureValues[k] = typeof val === 'string' ? val : '';
  }
  featureValues['support'] = (typeof f['support'] === 'string' ? f['support'] : 'email') as string;
  return {
    label: p.label,
    description: p.description || '',
    monthlyPriceTzs: String(p.monthlyPriceTzs),
    annualPriceTzs: p.annualPriceTzs ? String(p.annualPriceTzs) : '',
    maxUsers: String(p.maxUsers >= 2147483647 ? '' : p.maxUsers),
    maxStores: String(p.maxStores >= 2147483647 ? '' : p.maxStores),
    maxProducts: String(p.maxProducts >= 2147483647 ? '' : p.maxProducts),
    features: featureBools,
    featureValues,
  };
}

function fromForm(f: EditForm): Partial<PlanDefinition> {
  const features: Record<string, unknown> = {};
  for (const k of Object.keys(ALL_FEATURES)) {
    if (f.features[k]) {
      const val = f.featureValues[k];
      if (k === 'support') {
        features[k] = val || 'email';
      } else if (val === 'full' || val === 'full_export' || val === 'full_custom') {
        features[k] = val;
      } else {
        features[k] = true;
      }
    }
  }
  return {
    label: f.label,
    description: f.description,
    monthlyPriceTzs: Number(f.monthlyPriceTzs) || 0,
    annualPriceTzs: Number(f.annualPriceTzs) || undefined,
    maxUsers: Number(f.maxUsers) || 2147483647,
    maxStores: Number(f.maxStores) || 2147483647,
    maxProducts: Number(f.maxProducts) || 2147483647,
    features: JSON.stringify(features),
  };
}

export default function BillingPlansPage() {
  const [rows, setRows] = useState<PlanDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<PlanDefinition | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetch = useCallback(() => {
    setLoading(true);
    listAllPlans()
      .then((data) => { setRows(data); setError(null); })
      .catch((e) => { setError(e instanceof Error ? e.message : 'Failed to load plans'); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const openEdit = (plan: PlanDefinition) => {
    setEditPlan(plan);
    setEditForm(toForm(plan));
    setSaveError(null);
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editPlan || !editForm) return;
    setSaving(true);
    setSaveError(null);
    try {
      const body = fromForm(editForm);
      await updatePlan(editPlan.code, body);
      setEditOpen(false);
      fetch();
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleFeature = (key: string) => {
    if (!editForm) return;
    setEditForm({
      ...editForm,
      features: { ...editForm.features, [key]: !editForm.features[key] },
    });
  };

  const setFeatureValue = (key: string, value: string) => {
    if (!editForm) return;
    setEditForm({
      ...editForm,
      featureValues: { ...editForm.featureValues, [key]: value },
    });
  };

  const columns: Column<PlanDefinition>[] = useMemo(() => [
    {
      key: 'plan', label: 'Plan', sortable: true,
      render: (p) => (
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.8125rem' }}>{p.label}</Typography>
          {p.code === 'BUSINESS' && <Chip label="Popular" size="small" sx={{ height: 20, fontWeight: 700, fontSize: '0.625rem', borderRadius: '5px', bgcolor: brand.primary[100], color: brand.primary[700] }} />}
        </Stack>
      ),
    },
    {
      key: 'monthlyPriceTzs', label: 'Monthly', align: 'right', width: 100,
      render: (p) => <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>{formatTzs(p.monthlyPriceTzs)}</Typography>,
    },
    {
      key: 'maxUsers', label: 'Users', align: 'center', width: 70,
      render: (p) => <Typography sx={{ fontSize: '0.8125rem' }}>{p.maxUsers >= 2147483647 ? '∞' : p.maxUsers}</Typography>,
    },
    {
      key: 'maxStores', label: 'Stores', align: 'center', width: 70,
      render: (p) => <Typography sx={{ fontSize: '0.8125rem' }}>{p.maxStores >= 2147483647 ? '∞' : p.maxStores}</Typography>,
    },
    {
      key: 'maxProducts', label: 'SKUs', align: 'center', width: 70,
      render: (p) => <Typography sx={{ fontSize: '0.8125rem' }}>{p.maxProducts >= 2147483647 ? '∞' : p.maxProducts.toLocaleString()}</Typography>,
    },
    {
      key: 'features', label: 'Features',
      render: (p) => {
        const f = parseFeatures(p.features);
        return (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {Object.entries(ALL_FEATURES).filter(([k]) => f[k]).map(([k, label]) => (
              <Chip key={k} label={label} size="small" sx={{ height: 20, fontWeight: 600, fontSize: '0.625rem', borderRadius: '5px', bgcolor: brand.neutral[100], color: brand.neutral[700] }} />
            ))}
          </Stack>
        );
      },
    },
    {
      key: 'actions', label: '', width: 60,
      render: (p) => (
        <IconButton size="small" onClick={() => openEdit(p)} sx={{ color: brand.primary[600] }}>
          <IconEdit size={16} />
        </IconButton>
      ),
    },
  ], []);

  return (
    <Box>
      <PageHeader title="Plan Management" subtitle="Edit pricing, limits, and feature gating per plan" />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <DataTable
        columns={columns} rows={rows} loading={loading}
        emptyText="No plans configured yet" emptyIcon={<IconFileInvoice size={32} />}
        getRowKey={(p) => p.id} tableKey="billing-plans"
        toolbarTitle={rows.length > 0 ? `${rows.length} plans` : undefined}
        enableExport exportFileName={`plans-${new Date().toISOString().slice(0, 10)}`}
      />

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Edit Plan — {editPlan?.label}
        </DialogTitle>
        <DialogContent>
          {saveError && <Alert severity="error" sx={{ mb: 2, mt: 1 }}>{saveError}</Alert>}
          {editForm && (
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <Grid container spacing={2}>
                <Grid size={6}>
                  <TextField label="Label" size="small" fullWidth value={editForm.label}
                    onChange={(e) => setEditForm({ ...editForm, label: e.target.value })} />
                </Grid>
                <Grid size={6}>
                  <TextField label="Description" size="small" fullWidth value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                </Grid>
                <Grid size={4}>
                  <TextField label="Monthly Price (TZS)" size="small" fullWidth type="number"
                    value={editForm.monthlyPriceTzs}
                    onChange={(e) => setEditForm({ ...editForm, monthlyPriceTzs: e.target.value })} />
                </Grid>
                <Grid size={4}>
                  <TextField label="Annual Price (TZS)" size="small" fullWidth type="number"
                    value={editForm.annualPriceTzs}
                    onChange={(e) => setEditForm({ ...editForm, annualPriceTzs: e.target.value })} />
                </Grid>
                <Grid size={4} />
                <Grid size={4}>
                  <TextField label="Max Users" size="small" fullWidth type="number"
                    value={editForm.maxUsers} helperText="Empty = unlimited"
                    onChange={(e) => setEditForm({ ...editForm, maxUsers: e.target.value })} />
                </Grid>
                <Grid size={4}>
                  <TextField label="Max Stores" size="small" fullWidth type="number"
                    value={editForm.maxStores} helperText="Empty = unlimited"
                    onChange={(e) => setEditForm({ ...editForm, maxStores: e.target.value })} />
                </Grid>
                <Grid size={4}>
                  <TextField label="Max Products" size="small" fullWidth type="number"
                    value={editForm.maxProducts} helperText="Empty = unlimited"
                    onChange={(e) => setEditForm({ ...editForm, maxProducts: e.target.value })} />
                </Grid>
              </Grid>

              <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', mt: 1 }}>Features</Typography>
              <Stack spacing={1.5}>
                {Object.entries(ALL_FEATURES).map(([key, label]) => (
                  <Box key={key} sx={{ p: 1.5, border: `1px solid ${brand.neutral[200]}`, borderRadius: '10px' }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap spacing={1}>
                      <FormControlLabel
                        control={<Switch checked={editForm.features[key] || false} onChange={() => toggleFeature(key)} size="small" />}
                        label={label}
                        sx={{ '& .MuiTypography-root': { fontWeight: 600, fontSize: '0.8125rem' } }}
                      />
                      {editForm.features[key] && key === 'reports' && (
                        <TextField select size="small" value={editForm.featureValues.reports || 'full'}
                          onChange={(e) => setFeatureValue('reports', e.target.value)}
                          sx={{ width: 160 }}>
                          <MenuItem value="none">None</MenuItem>
                          <MenuItem value="full">Full</MenuItem>
                          <MenuItem value="full_export">Full + Export</MenuItem>
                          <MenuItem value="full_custom">Full + Custom</MenuItem>
                        </TextField>
                      )}
                      {editForm.features[key] && key === 'support' && (
                        <TextField select size="small" value={editForm.featureValues.support || 'email'}
                          onChange={(e) => setFeatureValue('support', e.target.value)}
                          sx={{ width: 160 }}>
                          {SUPPORT_LEVELS.map((l) => (
                            <MenuItem key={l} value={l}>{l.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</MenuItem>
                          ))}
                        </TextField>
                      )}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
