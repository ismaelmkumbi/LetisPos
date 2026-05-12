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
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  IconClipboardCheck,
  IconPlus,
  IconPhone,
  IconMail,
  IconNote,
  IconChecklist,
} from '@tabler/icons-react';

import { PageHeader } from 'src/components/smartpos/PageHeader';
import { brand } from 'src/theme/smartpos/brand';
import {
  listActivities,
  createActivity,
  type Activity,
} from 'src/api/smartpos/crm';
import { tokenStore } from 'src/api/smartpos/client';

// ─── Types ────────────────────────────────────────────────────────────────────

type ActivityType = 'All' | 'call' | 'email' | 'note' | 'task';

type ActivityFormData = {
  type: string;
  customerName: string;
  description: string;
};

const TYPE_OPTIONS = ['call', 'email', 'note', 'task'];
const TYPE_LABELS: Record<string, string> = { call: 'Call', email: 'Email', note: 'Note', task: 'Task' };

const typeIcon = (type: string) => {
  switch (type) {
    case 'call': return <IconPhone size={16} />;
    case 'email': return <IconMail size={16} />;
    case 'note': return <IconNote size={16} />;
    case 'task': return <IconChecklist size={16} />;
    default: return <IconNote size={16} />;
  }
};

const typeColor = (type: string) => {
  switch (type) {
    case 'call': return { bg: brand.info.light, color: brand.info.dark };
    case 'email': return { bg: brand.primary[50], color: brand.primary[700] };
    case 'note': return { bg: brand.warning.light, color: brand.warning.dark };
    case 'task': return { bg: brand.success.light, color: brand.success.dark };
    default: return { bg: brand.neutral[100], color: brand.neutral[600] };
  }
};

const emptyForm = (): ActivityFormData => ({
  type: 'note',
  customerName: '',
  description: '',
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ActivityType>('All');
  const [error, setError] = useState<string | null>(null);

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [form, setForm] = useState<ActivityFormData>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const tenantId = tokenStore.getTenantId();

  const fetchActivities = useCallback(async () => {
    if (!tenantId) return;
    try {
      setLoading(true);
      setError(null);
      const params: { page?: number; size?: number; type?: string } = { page: 0, size: 200 };
      if (filter !== 'All') params.type = filter;
      const page = await listActivities(params);
      setActivities(page.content);
    } catch (e: unknown) {
      setError(e?.message || 'Failed to load activities');
    } finally {
      setLoading(false);
    }
  }, [tenantId, filter]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const filtered = filter === 'All' ? activities : activities.filter((a) => a.type === filter);

  const openCreate = () => {
    setForm(emptyForm());
    setFormError(null);
    setFormDialogOpen(true);
  };

  const patch = <K extends keyof ActivityFormData>(k: K, v: ActivityFormData[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.description.trim()) {
      setFormError('Description is required.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const newActivity = await createActivity({
        type: form.type,
        customerName: form.customerName.trim() || undefined,
        description: form.description.trim(),
      });
      setActivities((prev) => [newActivity, ...prev]);
      setFormDialogOpen(false);
    } catch (e: unknown) {
      setFormError(e?.response?.data?.message || e?.message || 'Failed to log activity');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFilter = (_: React.MouseEvent<HTMLElement>, newFilter: ActivityType | null) => {
    if (newFilter !== null) setFilter(newFilter);
  };

  const formatTimestamp = (ts: string): string => {
    try {
      return new Date(ts).toISOString().slice(0, 16).replace('T', ' ');
    } catch {
      return ts;
    }
  };

  return (
    <Box>
      <PageHeader
        title="Activities"
        subtitle="Recent CRM activity timeline"
        actions={[
          {
            label: 'Log Activity',
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

      {/* Filter toggles */}
      <Box sx={{ mb: 2.5 }}>
        <ToggleButtonGroup
          value={filter}
          exclusive
          onChange={handleFilter}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              px: 1.5,
              py: 0.5,
              fontWeight: 700,
              fontSize: '0.75rem',
              textTransform: 'none',
              borderRadius: '8px !important',
              border: `1px solid ${brand.neutral[200]} !important`,
              color: brand.neutral[600],
              '&.Mui-selected': {
                bgcolor: brand.primary[50],
                color: brand.primary[700],
                borderColor: `${brand.primary[300]} !important`,
              },
            },
          }}
        >
          <ToggleButton value="All">All</ToggleButton>
          <ToggleButton value="call">Calls</ToggleButton>
          <ToggleButton value="email">Emails</ToggleButton>
          <ToggleButton value="note">Notes</ToggleButton>
          <ToggleButton value="task">Tasks</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {loading ? (
        <Typography variant="body2" sx={{ color: brand.neutral[500], py: 4, textAlign: 'center' }}>
          Loading activities...
        </Typography>
      ) : (
        <>
          {/* Timeline */}
          {filtered.length === 0 ? (
            <Box
              sx={{
                textAlign: 'center',
                py: 8,
                border: `1px solid ${brand.neutral[200]}`,
                borderRadius: '12px',
                bgcolor: brand.neutral[50],
              }}
            >
              <Box sx={{ color: brand.neutral[300], mb: 1 }}>
                <IconClipboardCheck size={32} />
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 600, color: brand.neutral[700] }}>
                No activities found
              </Typography>
              <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
                Try changing the filter or log a new activity
              </Typography>
            </Box>
          ) : (
            <Box sx={{ position: 'relative', pl: 4 }}>
              {/* Vertical line */}
              <Box
                sx={{
                  position: 'absolute',
                  left: 15,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  bgcolor: brand.neutral[200],
                  borderRadius: 1,
                }}
              />

              <Stack spacing={3}>
                {filtered.map((activity) => {
                  const tc = typeColor(activity.type);
                  return (
                    <Box key={activity.id} sx={{ position: 'relative' }}>
                      {/* Timeline dot */}
                      <Box
                        sx={{
                          position: 'absolute',
                          left: -22,
                          top: 4,
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          bgcolor: tc.bg,
                          border: `2px solid ${tc.color}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 1,
                        }}
                      />

                      {/* Activity card */}
                      <Box
                        sx={{
                          border: `1px solid ${brand.neutral[200]}`,
                          borderRadius: '10px',
                          p: 2,
                          bgcolor: '#fff',
                          transition: 'box-shadow 0.15s ease',
                          '&:hover': {
                            boxShadow: `0 2px 8px rgba(15,23,42,0.06)`,
                          },
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                            <Box
                              sx={{
                                width: 28,
                                height: 28,
                                borderRadius: '8px',
                                bgcolor: tc.bg,
                                color: tc.color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {typeIcon(activity.type)}
                            </Box>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: brand.neutral[800], fontSize: '0.8rem' }}>
                              {TYPE_LABELS[activity.type] || activity.type}
                            </Typography>
                          </Stack>
                          <Typography variant="caption" sx={{ color: brand.neutral[400], fontWeight: 500, whiteSpace: 'nowrap' }}>
                            {formatTimestamp(activity.createdAt)}
                          </Typography>
                        </Stack>

                        <Typography
                          variant="body2"
                          sx={{ color: brand.neutral[600], fontSize: '0.8125rem', lineHeight: 1.5, mb: 1 }}
                        >
                          {activity.description}
                        </Typography>

                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 600 }}>
                            {activity.customerName || '—'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: brand.neutral[400], fontWeight: 500 }}>
                            {activity.performedByName || '—'}
                          </Typography>
                        </Stack>
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            </Box>
          )}
        </>
      )}

      {/* Log Activity Dialog */}
      <Dialog
        open={formDialogOpen}
        onClose={() => setFormDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px' } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.1rem', pb: 0.5 }}>
          Log Activity
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Stack spacing={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select
                value={form.type}
                label="Type"
                onChange={(e) => patch('type', e.target.value)}
              >
                {TYPE_OPTIONS.map((t) => (
                  <MenuItem key={t} value={t}>{TYPE_LABELS[t]}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Customer Name"
              fullWidth
              size="small"
              value={form.customerName}
              onChange={(e) => patch('customerName', e.target.value)}
            />
            <TextField
              label="Description"
              required
              fullWidth
              size="small"
              multiline
              minRows={3}
              value={form.description}
              onChange={(e) => patch('description', e.target.value)}
              placeholder="Describe the activity..."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setFormDialogOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving...' : 'Log Activity'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
