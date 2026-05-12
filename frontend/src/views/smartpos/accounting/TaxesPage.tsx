import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { IconPlus, IconPercentage, IconCalendarMonth, IconCalendarStats, IconReceipt2 } from '@tabler/icons-react';

import {
  listTaxRates,
  createTaxRate,
  updateTaxRate,
  toggleTaxRateActive,
  getTaxSummary,
  type TaxRate,
  type TaxRateInput,
  type TaxSummary,
  type TaxType,
} from 'src/api/smartpos/taxes';
import PageHeader from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { useAuth } from 'src/context/smartpos/AuthContext';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;

const TAX_TYPES: TaxType[] = ['VAT', 'GST', 'SERVICE', 'SALES', 'EXCISE', 'CUSTOM'];

const TAX_TYPE_LABELS: Record<TaxType, string> = {
  VAT: 'VAT',
  GST: 'GST',
  SERVICE: 'Service',
  SALES: 'Sales Tax',
  EXCISE: 'Excise',
  CUSTOM: 'Custom',
};

export default function TaxesPage() {
  const { user } = useAuth();

  const [rows, setRows] = useState<TaxRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  // Summary
  const [summary, setSummary] = useState<TaxSummary | null>(null);

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TaxRate | null>(null);
  const [form, setForm] = useState<TaxRateInput>({ name: '', rate: 18, type: 'VAT', active: true });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const refresh = () => setRefreshToken((n) => n + 1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      listTaxRates().catch(() => [] as TaxRate[]),
      getTaxSummary().catch(() => null),
    ])
      .then(([rates, summ]) => {
        if (!cancelled) {
          setRows(rates);
          setSummary(summ);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? (e as Error).message : 'Failed to load tax data');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshToken, user?.tenantId]);

  // Stats from the summary
  const stats = useMemo(() => {
    if (!summary) {
      const totalActive = rows.filter((r) => r.active).length;
      return { activeRates: totalActive, thisMonth: 0, thisQuarter: 0, thisYear: 0 };
    }
    return {
      activeRates: rows.filter((r) => r.active).length,
      thisMonth: summary.thisMonth,
      thisQuarter: summary.thisQuarter,
      thisYear: summary.thisYear,
    };
  }, [rows, summary]);

  // Dialog helpers
  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', rate: 18, type: 'VAT', active: true, description: '' });
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (tax: TaxRate) => {
    setEditing(tax);
    setForm({
      name: tax.name,
      rate: tax.rate,
      type: tax.type,
      active: tax.active,
      description: tax.description ?? '',
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError('Name is required.');
      return;
    }
    if (form.rate < 0 || form.rate > 100) {
      setFormError('Rate must be between 0 and 100%.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await updateTaxRate(editing.id, form);
      } else {
        await createTaxRate(form);
      }
      setDialogOpen(false);
      refresh();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? (e as Error).message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (tax: TaxRate) => {
    try {
      await toggleTaxRateActive(tax.id);
      refresh();
    } catch {
      /* swallow */
    }
  };

  const patchForm = <K extends keyof TaxRateInput>(k: K, v: TaxRateInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const columns: Column<TaxRate>[] = [
    {
      key: 'name',
      label: 'Name',
      render: (t) => (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              bgcolor: t.active ? brand.info.light : brand.neutral[200],
              color: t.active ? brand.info.dark : brand.neutral[500],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconPercentage size={16} />
          </Box>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700, color: brand.primary[700] }}>
              {t.name}
            </Typography>
            {t.description && (
              <Typography variant="caption" sx={{ color: brand.neutral[400] }}>
                {t.description}
              </Typography>
            )}
          </Box>
        </Stack>
      ),
    },
    {
      key: 'rate',
      label: 'Rate',
      align: 'right',
      render: (t) => (
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {t.rate}%
        </Typography>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (t) => (
        <Chip
          label={TAX_TYPE_LABELS[t.type] ?? t.type}
          size="small"
          sx={{
            bgcolor: brand.neutral[100],
            color: brand.neutral[700],
            fontWeight: 600,
            borderRadius: '6px',
          }}
        />
      ),
    },
    {
      key: 'active',
      label: 'Active',
      align: 'center',
      render: (t) => (
        <FormControlLabel
          control={
            <Switch
              checked={t.active}
              onChange={() => handleToggle(t)}
              size="small"
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: brand.success.main,
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  bgcolor: brand.success.light,
                },
              }}
            />
          }
          label=""
        />
      ),
    },
  ];

  const StatCard = ({
    icon,
    label,
    value,
    color,
  }: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    color: string;
  }) => (
    <Card
      elevation={0}
      sx={{
        border: `1px solid ${brand.neutral[200]}`,
        borderRadius: 3,
        px: 2.5,
        py: 1.5,
        flex: 1,
        minWidth: 150,
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            bgcolor: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, color, lineHeight: 1.2 }}>
            {value}
          </Typography>
          <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 600 }}>
            {label}
          </Typography>
        </Box>
      </Stack>
    </Card>
  );

  return (
    <Box sx={{ maxWidth: 1680, mx: 'auto', pb: 3 }}>
      <PageHeader
        title="Taxes"
        subtitle="Manage tax rates and view collection summaries"
        action={{ label: 'Add Tax Rate', icon: <IconPlus size={18} />, onClick: openCreate }}
      />

      {/* Tax collection summary */}
      <Stack direction="row" spacing={2} sx={{ mb: 2.5, flexWrap: 'wrap' }}>
        <StatCard
          icon={<IconCalendarMonth size={18} color={brand.primary[600]} />}
          label="This Month"
          value={fmt(stats.thisMonth)}
          color={brand.primary[600]}
        />
        <StatCard
          icon={<IconCalendarStats size={18} color={brand.warning.main} />}
          label="This Quarter"
          value={fmt(stats.thisQuarter)}
          color={brand.warning.main}
        />
        <StatCard
          icon={<IconReceipt2 size={18} color={brand.info.main} />}
          label="This Year"
          value={fmt(stats.thisYear)}
          color={brand.info.main}
        />
        <StatCard
          icon={<IconPercentage size={18} color={brand.success.main} />}
          label="Active Rates"
          value={stats.activeRates}
          color={brand.success.main}
        />
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '8px' }}>
          {error}
        </Alert>
      )}

      {/* Tax rates table */}
      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyText="No tax rates configured yet. Add one to get started."
        getRowKey={(r) => r.id}
        onRowClick={openEdit}
        tableKey="taxes"
        enableColumnVisibility
        enableExport
        exportFileName="tax-rates"
        toolbarTitle="Tax Rates"
      />

      {/* Create / Edit dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editing ? `Edit ${editing.name}` : 'Add Tax Rate'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {formError && (
              <Alert severity="error" sx={{ borderRadius: '8px' }}>
                {formError}
              </Alert>
            )}
            <TextField
              size="small"
              label="Name *"
              fullWidth
              value={form.name}
              onChange={(e) => patchForm('name', e.target.value)}
              error={!form.name.trim()}
              placeholder="e.g. VAT Standard"
            />
            <Stack direction="row" spacing={2}>
              <TextField
                size="small"
                type="number"
                label="Rate (%) *"
                fullWidth
                value={form.rate}
                onChange={(e) => patchForm('rate', Number(e.target.value) || 0)}
                InputProps={{ inputProps: { min: 0, max: 100, step: 0.5 } }}
                error={form.rate < 0 || form.rate > 100}
                helperText="Percentage, e.g. 18 for 18%"
              />
              <TextField
                select
                size="small"
                label="Type"
                fullWidth
                value={form.type}
                onChange={(e) => patchForm('type', e.target.value as TaxType)}
              >
                {TAX_TYPES.map((tt) => (
                  <MenuItem key={tt} value={tt}>
                    {TAX_TYPE_LABELS[tt]}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <TextField
              label="Description"
              size="small"
              fullWidth
              multiline
              minRows={2}
              value={form.description ?? ''}
              onChange={(e) => patchForm('description', e.target.value)}
              placeholder="Optional notes about this tax rate..."
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.active}
                  onChange={(e) => patchForm('active', e.target.checked)}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: brand.success.main,
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      bgcolor: brand.success.light,
                    },
                  }}
                />
              }
              label="Active"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              bgcolor: brand.primary[600],
              '&:hover': { bgcolor: brand.primary[700] },
            }}
          >
            {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
