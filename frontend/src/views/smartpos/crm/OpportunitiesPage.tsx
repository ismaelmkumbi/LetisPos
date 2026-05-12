import { useCallback, useEffect, useState } from 'react';
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
import {
  listOpportunities,
  createOpportunity,
  updateOpportunityStage,
  type Opportunity,
} from 'src/api/smartpos/crm';
import { tokenStore } from 'src/api/smartpos/client';

// ─── Types ────────────────────────────────────────────────────────────────────

type OppFormData = {
  title: string;
  customerName: string;
  value: string;
  probability: string;
  stage: string;
};

const STAGES = ['new', 'negotiation', 'proposal', 'won', 'lost'];

const STAGE_LABELS: Record<string, string> = {
  new: 'New',
  negotiation: 'Negotiation',
  proposal: 'Proposal',
  won: 'Won',
  lost: 'Lost',
};

const STAGE_COLORS: Record<string, { bg: string; border: string; dot: string }> = {
  new: { bg: brand.neutral[50], border: brand.neutral[300], dot: brand.info.main },
  negotiation: { bg: brand.warning.light, border: brand.warning.main, dot: brand.warning.dark },
  proposal: { bg: brand.primary[50], border: brand.primary[300], dot: brand.primary[700] },
  won: { bg: brand.success.light, border: brand.success.main, dot: brand.success.dark },
  lost: { bg: brand.neutral[100], border: brand.neutral[400], dot: brand.error.main },
};

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0 }).format(value);

const emptyForm = (): OppFormData => ({
  title: '',
  customerName: '',
  value: '',
  probability: '50',
  stage: 'new',
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function OpportunitiesPage() {
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [form, setForm] = useState<OppFormData>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const tenantId = tokenStore.getTenantId();

  const fetchOpps = useCallback(async () => {
    if (!tenantId) return;
    try {
      setLoading(true);
      setError(null);
      const page = await listOpportunities({ page: 0, size: 200 });
      setOpps(page.content);
    } catch (e: any) {
      setError(e?.message || 'Failed to load opportunities');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchOpps();
  }, [fetchOpps]);

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
    try {
      const newOpp = await createOpportunity({
        title: form.title.trim(),
        customerName: form.customerName.trim() || undefined,
        valueTzs: Number(form.value),
        probability: Number(form.probability),
        stage: form.stage,
      });
      setOpps((prev) => [newOpp, ...prev]);
      setFormDialogOpen(false);
    } catch (e: any) {
      setFormError(e?.response?.data?.message || e?.message || 'Failed to create opportunity');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStageChange = async (oppId: string, newStage: string) => {
    try {
      const updated = await updateOpportunityStage(oppId, newStage);
      setOpps((prev) => prev.map((o) => (o.id === oppId ? updated : o)));
    } catch {
      // silently ignore
    }
  };

  // Total pipeline value
  const totalPipeline = opps.filter((o) => o.stage !== 'lost').reduce((sum, o) => sum + o.valueTzs, 0);
  const wonValue = opps.filter((o) => o.stage === 'won').reduce((sum, o) => sum + o.valueTzs, 0);

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

      {loading ? (
        <Typography variant="body2" sx={{ color: brand.neutral[500], py: 4, textAlign: 'center' }}>
          Loading opportunities...
        </Typography>
      ) : (
        <>
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
                        {STAGE_LABELS[stage]}
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
                            {opp.customerName || '—'}
                          </Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Typography component="span" sx={{ fontWeight: 800, fontSize: '0.65rem', color: brand.success.dark }}>TZS</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: brand.success.dark, fontSize: '0.78rem' }}>
                              {formatCurrency(opp.valueTzs)}
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
                        {/* Stage changer */}
                        <Box sx={{ mt: 1 }}>
                          <FormControl fullWidth size="small">
                            <Select
                              value={opp.stage}
                              onChange={(e) => handleStageChange(opp.id, e.target.value)}
                              sx={{
                                height: 24,
                                fontSize: '0.65rem',
                                fontWeight: 600,
                                borderRadius: '5px',
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: brand.neutral[200] },
                                bgcolor: '#fff',
                              }}
                              MenuProps={{ PaperProps: { sx: { '& .MuiMenuItem-root': { fontSize: '0.7rem' } } } }}
                            >
                              {STAGES.map((s) => (
                                <MenuItem key={s} value={s} sx={{ fontSize: '0.7rem', fontWeight: 600 }}>
                                  {STAGE_LABELS[s]}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Box>
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
        </>
      )}

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
            <TextField
              label="Customer Name"
              fullWidth
              size="small"
              value={form.customerName}
              onChange={(e) => patch('customerName', e.target.value)}
            />
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
                  <MenuItem key={s} value={s}>{STAGE_LABELS[s]}</MenuItem>
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
