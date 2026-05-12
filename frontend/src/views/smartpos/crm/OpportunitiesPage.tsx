import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  LinearProgress,
  Card,
  CardContent,
} from '@mui/material';
import {
  IconPlus,
  IconUser,
} from '@tabler/icons-react';

import { PageHeader } from 'src/components/smartpos/PageHeader';
import { brand } from 'src/theme/smartpos/brand';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Opportunity {
  id: string;
  title: string;
  customer: string;
  value: number;
  probability: number;
  stage: string;
}

type OppFormData = {
  title: string;
  customer: string;
  value: string;
  probability: string;
  stage: string;
};

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_OPPORTUNITIES: Opportunity[] = [
  { id: '1', title: 'POS System Upgrade', customer: 'Jane Mushi', value: 4500000, probability: 60, stage: 'Negotiation' },
  { id: '2', title: 'Annual Software License', customer: 'David Msangi', value: 2800000, probability: 85, stage: 'Proposal' },
  { id: '3', title: 'Inventory Module', customer: 'Moses Mwakibete', value: 1200000, probability: 40, stage: 'New' },
  { id: '4', title: 'Multi-Branch Rollout', customer: 'Rehema Saleh', value: 8500000, probability: 25, stage: 'New' },
  { id: '5', title: 'Training Package', customer: 'Fatma Omari', value: 950000, probability: 90, stage: 'Proposal' },
  { id: '6', title: 'Hardware Supply', customer: 'Hassan Juma', value: 3200000, probability: 100, stage: 'Won' },
  { id: '7', title: 'Support Contract', customer: 'Jane Mushi', value: 1800000, probability: 0, stage: 'Lost' },
  { id: '8', title: 'Custom Integration', customer: 'David Msangi', value: 5500000, probability: 55, stage: 'Negotiation' },
];

const STAGES = ['New', 'Negotiation', 'Proposal', 'Won', 'Lost'];

const STAGE_COLORS: Record<string, { bg: string; border: string; dot: string }> = {
  New: { bg: brand.neutral[50], border: brand.neutral[300], dot: brand.info.main },
  Negotiation: { bg: brand.warning.light, border: brand.warning.main, dot: brand.warning.dark },
  Proposal: { bg: brand.primary[50], border: brand.primary[300], dot: brand.primary[700] },
  Won: { bg: brand.success.light, border: brand.success.main, dot: brand.success.dark },
  Lost: { bg: brand.neutral[100], border: brand.neutral[400], dot: brand.error.main },
};

const CUSTOMERS = ['Jane Mushi', 'David Msangi', 'Moses Mwakibete', 'Rehema Saleh', 'Fatma Omari', 'Hassan Juma'];

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0 }).format(value);

const emptyForm = (): OppFormData => ({
  title: '',
  customer: CUSTOMERS[0],
  value: '',
  probability: '50',
  stage: 'New',
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function OpportunitiesPage() {
  const [opps, setOpps] = useState<Opportunity[]>(MOCK_OPPORTUNITIES);
  const error: string | null = null;

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [form, setForm] = useState<OppFormData>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const openCreate = () => {
    setForm(emptyForm());
    setFormError(null);
    setFormDialogOpen(true);
  };

  const patch = <K extends keyof OppFormData>(k: K, v: OppFormData[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      setFormError('Title is required.');
      return;
    }
    if (!form.value || isNaN(Number(form.value))) {
      setFormError('A valid value is required.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    await new Promise((r) => setTimeout(r, 400));
    const newOpp: Opportunity = {
      id: String(Date.now()),
      title: form.title,
      customer: form.customer,
      value: Number(form.value),
      probability: Number(form.probability),
      stage: form.stage,
    };
    setOpps((prev) => [newOpp, ...prev]);
    setSubmitting(false);
    setFormDialogOpen(false);
  };

  // Total pipeline value
  const totalPipeline = opps.filter((o) => o.stage !== 'Lost').reduce((sum, o) => sum + o.value, 0);
  const wonValue = opps.filter((o) => o.stage === 'Won').reduce((sum, o) => sum + o.value, 0);

  return (
    <Box>
      <PageHeader
        title="Opportunities"
        subtitle="Track sales opportunities and deal pipeline"
        metrics={[
          { label: 'Pipeline', value: formatCurrency(totalPipeline) },
          { label: 'Won', value: formatCurrency(wonValue) },
          { label: 'Deals', value: opps.length },
        ]}
        actions={[
          {
            label: 'New Opportunity',
            icon: <IconPlus size={18} />,
            onClick: openCreate,
          },
        ]}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Kanban board */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          overflowX: 'auto',
          pb: 2,
          minHeight: 400,
        }}
      >
        {STAGES.map((stage) => {
          const stageOpps = opps.filter((o) => o.stage === stage);
          const colors = STAGE_COLORS[stage];
          return (
            <Box
              key={stage}
              sx={{
                flex: '1 1 0',
                minWidth: 240,
                bgcolor: colors.bg,
                borderRadius: '12px',
                border: `1px solid ${colors.border}`,
                p: 1.5,
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 0.5 }}>
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: colors.dot,
                    }}
                  />
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 800, fontSize: '0.8rem', color: brand.neutral[800] }}
                  >
                    {stage}
                  </Typography>
                </Stack>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    color: brand.neutral[500],
                    bgcolor: '#fff',
                    px: 1,
                    py: 0.25,
                    borderRadius: '6px',
                    fontSize: '0.7rem',
                  }}
                >
                  {stageOpps.length}
                </Typography>
              </Stack>

              {stageOpps.length === 0 && (
                <Box
                  sx={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `2px dashed ${brand.neutral[200]}`,
                    borderRadius: '8px',
                    minHeight: 80,
                  }}
                >
                  <Typography variant="caption" sx={{ color: brand.neutral[400], fontWeight: 500 }}>
                    No deals
                  </Typography>
                </Box>
              )}

              {stageOpps.map((opp) => (
                <Card
                  key={opp.id}
                  elevation={0}
                  sx={{
                    borderRadius: '10px',
                    border: `1px solid ${brand.neutral[200]}`,
                    bgcolor: '#fff',
                    cursor: 'default',
                    transition: 'box-shadow 0.15s ease',
                    '&:hover': {
                      boxShadow: `0 4px 12px rgba(15,23,42,0.08)`,
                    },
                  }}
                >
                  <CardContent sx={{ p: 1.5, pb: '12px !important' }}>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 700, color: brand.neutral[800], fontSize: '0.8rem', mb: 0.5 }}
                      noWrap
                    >
                      {opp.title}
                    </Typography>
                    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.75 }}>
                      <IconUser size={12} color={brand.neutral[400]} />
                      <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 500 }}>
                        {opp.customer}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Typography component="span" sx={{ fontWeight: 800, fontSize: '0.65rem', color: brand.success.dark }}>TZS</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: brand.success.dark, fontSize: '0.78rem' }}>
                          {formatCurrency(opp.value)}
                        </Typography>
                      </Stack>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: brand.neutral[500], fontSize: '0.7rem' }}>
                        {opp.probability}%
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={opp.probability}
                      sx={{
                        height: 4,
                        borderRadius: 2,
                        bgcolor: brand.neutral[100],
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 2,
                          bgcolor: opp.probability >= 80 ? brand.success.main : opp.probability >= 50 ? brand.warning.main : brand.info.main,
                        },
                      }}
                    />
                  </CardContent>
                </Card>
              ))}
            </Box>
          );
        })}
      </Box>

      {/* Drag-and-drop placeholder note */}
      <Box
        sx={{
          textAlign: 'center',
          py: 1,
          borderTop: `1px dashed ${brand.neutral[200]}`,
          mt: 1,
        }}
      >
        <Typography variant="caption" sx={{ color: brand.neutral[400], fontWeight: 500 }}>
          Drag-and-drop coming soon
        </Typography>
      </Box>

      {/* Create Opportunity Dialog */}
      <Dialog
        open={formDialogOpen}
        onClose={() => setFormDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px' } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.1rem', pb: 0.5 }}>
          New Opportunity
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Stack spacing={2}>
            <TextField
              label="Title"
              required
              fullWidth
              size="small"
              value={form.title}
              onChange={(e) => patch('title', e.target.value)}
            />
            <FormControl fullWidth size="small">
              <InputLabel>Customer</InputLabel>
              <Select
                value={form.customer}
                label="Customer"
                onChange={(e) => patch('customer', e.target.value)}
              >
                {CUSTOMERS.map((c) => (
                  <MenuItem key={c} value={c}>{c}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Value (TZS)"
              required
              fullWidth
              size="small"
              type="number"
              value={form.value}
              onChange={(e) => patch('value', e.target.value)}
            />
            <TextField
              label="Probability (%)"
              fullWidth
              size="small"
              type="number"
              inputProps={{ min: 0, max: 100 }}
              value={form.probability}
              onChange={(e) => patch('probability', e.target.value)}
            />
            <FormControl fullWidth size="small">
              <InputLabel>Stage</InputLabel>
              <Select
                value={form.stage}
                label="Stage"
                onChange={(e) => patch('stage', e.target.value)}
              >
                {STAGES.map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setFormDialogOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving...' : 'Create Opportunity'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
