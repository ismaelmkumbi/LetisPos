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

// ─── Types ────────────────────────────────────────────────────────────────────

interface Activity {
  id: string;
  type: 'Call' | 'Email' | 'Note' | 'Task';
  description: string;
  customer: string;
  timestamp: string;
  user: string;
}

type ActivityType = 'All' | 'Call' | 'Email' | 'Note' | 'Task';

type ActivityFormData = {
  type: string;
  customer: string;
  description: string;
};

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_ACTIVITIES: Activity[] = [
  { id: '1', type: 'Call', description: 'Discussed POS upgrade pricing and requirements. Customer is interested in the multi-branch option.', customer: 'Jane Mushi', timestamp: '2026-05-12 14:30', user: 'Anna Kimaro' },
  { id: '2', type: 'Email', description: 'Sent proposal document with software license terms and annual pricing breakdown.', customer: 'David Msangi', timestamp: '2026-05-12 10:15', user: 'John Banda' },
  { id: '3', type: 'Note', description: 'Customer prefers on-premise deployment over cloud. Added to system requirements.', customer: 'Moses Mwakibete', timestamp: '2026-05-11 16:45', user: 'Anna Kimaro' },
  { id: '4', type: 'Task', description: 'Prepare demo environment for Zanzibar Distributors visit next week.', customer: 'Rehema Saleh', timestamp: '2026-05-11 09:00', user: 'John Banda' },
  { id: '5', type: 'Call', description: 'Follow-up call regarding training package. Customer confirmed dates for next month.', customer: 'Fatma Omari', timestamp: '2026-05-10 11:30', user: 'Anna Kimaro' },
  { id: '6', type: 'Email', description: 'Sent documentation and integration specs as requested by the technical team.', customer: 'Hassan Juma', timestamp: '2026-05-10 08:45', user: 'John Banda' },
  { id: '7', type: 'Note', description: 'Internal discussion: may need to extend support hours for Dar Express account.', customer: 'Jane Mushi', timestamp: '2026-05-09 15:00', user: 'Anna Kimaro' },
  { id: '8', type: 'Task', description: 'Update proposal template with new pricing for 2026.', customer: '—', timestamp: '2026-05-09 10:00', user: 'John Banda' },
];

const TYPE_OPTIONS = ['Call', 'Email', 'Note', 'Task'];
const CUSTOMERS = ['Jane Mushi', 'David Msangi', 'Moses Mwakibete', 'Rehema Saleh', 'Fatma Omari', 'Hassan Juma'];

const typeIcon = (type: string) => {
  switch (type) {
    case 'Call': return <IconPhone size={16} />;
    case 'Email': return <IconMail size={16} />;
    case 'Note': return <IconNote size={16} />;
    case 'Task': return <IconChecklist size={16} />;
    default: return <IconNote size={16} />;
  }
};

const typeColor = (type: string) => {
  switch (type) {
    case 'Call': return { bg: brand.info.light, color: brand.info.dark };
    case 'Email': return { bg: brand.primary[50], color: brand.primary[700] };
    case 'Note': return { bg: brand.warning.light, color: brand.warning.dark };
    case 'Task': return { bg: brand.success.light, color: brand.success.dark };
    default: return { bg: brand.neutral[100], color: brand.neutral[600] };
  }
};

const emptyForm = (): ActivityFormData => ({
  type: 'Note',
  customer: CUSTOMERS[0],
  description: '',
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>(MOCK_ACTIVITIES);
  const [filter, setFilter] = useState<ActivityType>('All');
  const error: string | null = null;

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [form, setForm] = useState<ActivityFormData>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
    await new Promise((r) => setTimeout(r, 400));
    const newActivity: Activity = {
      id: String(Date.now()),
      type: form.type as Activity['type'],
      customer: form.customer,
      description: form.description,
      timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
      user: 'Anna Kimaro',
    };
    setActivities((prev) => [newActivity, ...prev]);
    setSubmitting(false);
    setFormDialogOpen(false);
  };

  const handleFilter = (_: React.MouseEvent<HTMLElement>, newFilter: ActivityType | null) => {
    if (newFilter !== null) setFilter(newFilter);
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
          <ToggleButton value="Call">Calls</ToggleButton>
          <ToggleButton value="Email">Emails</ToggleButton>
          <ToggleButton value="Note">Notes</ToggleButton>
          <ToggleButton value="Task">Tasks</ToggleButton>
        </ToggleButtonGroup>
      </Box>

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
                          {activity.type}
                        </Typography>
                      </Stack>
                      <Typography variant="caption" sx={{ color: brand.neutral[400], fontWeight: 500, whiteSpace: 'nowrap' }}>
                        {activity.timestamp}
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
                        {activity.customer}
                      </Typography>
                      <Typography variant="caption" sx={{ color: brand.neutral[400], fontWeight: 500 }}>
                        {activity.user}
                      </Typography>
                    </Stack>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </Box>
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
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))}
              </Select>
            </FormControl>
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
