import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  IconMail,
  IconPhone,
  IconBrandWhatsapp,
  IconClock,
  IconSend,
} from '@tabler/icons-react';

import { PageHeader } from 'src/components/smartpos/PageHeader';
import { brand } from 'src/theme/smartpos/brand';
import { createTicket } from 'src/api/smartpos/support';

const SUBJECTS = [
  'Technical Issue',
  'Billing Question',
  'Feature Request',
  'Account Help',
  'Integration Support',
  'General Inquiry',
];

const PRIORITIES = [
  { value: 'low', label: 'Low — General question' },
  { value: 'medium', label: 'Medium — Need help soon' },
  { value: 'high', label: 'High — Business impacted' },
  { value: 'urgent', label: 'Urgent — System down' },
];

const CONTACT_CARDS = [
  {
    icon: <IconMail size={20} />,
    title: 'Email',
    value: 'support@letispos.com',
    sub: 'We reply within 24 hours',
    color: brand.primary[600],
    bgColor: brand.primary[50],
  },
  {
    icon: <IconPhone size={20} />,
    title: 'Phone',
    value: '+255 7XX XXX XXX',
    sub: 'Mon–Fri, 8am–6pm EAT',
    color: brand.info.main,
    bgColor: brand.info.light,
  },
  {
    icon: <IconBrandWhatsapp size={20} />,
    title: 'WhatsApp',
    value: '+255 7XX XXX XXX',
    sub: 'Quick chat support',
    color: brand.success.main,
    bgColor: brand.success.light,
  },
  {
    icon: <IconClock size={20} />,
    title: 'Response Time',
    value: 'Within 24 hours',
    sub: 'Priority tickets under 4 hours',
    color: brand.purple.main,
    bgColor: brand.purple.light,
  },
];

interface FormState {
  name: string;
  email: string;
  subject: string;
  message: string;
  priority: string;
}

const emptyForm = (): FormState => ({
  name: '',
  email: '',
  subject: '',
  message: '',
  priority: 'medium',
});

export default function ContactSupportPage() {
  const [form, setForm] = useState<FormState>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const patch = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.subject || !form.message.trim()) {
      setToast({ open: true, message: 'Please fill in all required fields.', severity: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      await createTicket({
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject,
        message: form.message.trim(),
        priority: form.priority,
      });
      setForm(emptyForm());
      setToast({
        open: true,
        message: "Ticket submitted. We'll respond within 24 hours.",
        severity: 'success',
      });
    } catch {
      setToast({
        open: true,
        message: 'Failed to submit ticket. Please try again.',
        severity: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title="Contact Support"
        subtitle="Get help from the Letis POS team"
      />

      <Grid container spacing={3}>
        {/* Contact Form */}
        <Grid size={{ xs: 12, lg: 7 }}>
          <Card
            elevation={0}
            sx={{
              border: `1px solid ${brand.neutral[200]}`,
              borderRadius: '12px',
              boxShadow: `0 1px 2px ${brand.neutral[900]}06`,
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, color: brand.neutral[800], mb: 2.5, fontSize: '1rem' }}
              >
                Submit a Ticket
              </Typography>

              <Stack spacing={2.5}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5}>
                  <TextField
                    label="Name"
                    required
                    fullWidth
                    size="small"
                    value={form.name}
                    onChange={(e) => patch('name', e.target.value)}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '8px',
                        '& fieldset': { borderColor: brand.neutral[200] },
                      },
                    }}
                  />
                  <TextField
                    label="Email"
                    required
                    fullWidth
                    size="small"
                    type="email"
                    value={form.email}
                    onChange={(e) => patch('email', e.target.value)}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '8px',
                        '& fieldset': { borderColor: brand.neutral[200] },
                      },
                    }}
                  />
                </Stack>

                <FormControl fullWidth size="small" required>
                  <InputLabel>Subject</InputLabel>
                  <Select
                    value={form.subject}
                    label="Subject"
                    onChange={(e) => patch('subject', e.target.value)}
                    sx={{
                      borderRadius: '8px',
                      '& fieldset': { borderColor: brand.neutral[200] },
                    }}
                  >
                    {SUBJECTS.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label="Message"
                  required
                  fullWidth
                  multiline
                  minRows={4}
                  maxRows={8}
                  size="small"
                  value={form.message}
                  onChange={(e) => patch('message', e.target.value)}
                  placeholder="Describe your issue in detail..."
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      '& fieldset': { borderColor: brand.neutral[200] },
                    },
                  }}
                />

                <FormControl fullWidth size="small">
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={form.priority}
                    label="Priority"
                    onChange={(e) => patch('priority', e.target.value)}
                    sx={{
                      borderRadius: '8px',
                      '& fieldset': { borderColor: brand.neutral[200] },
                    }}
                  >
                    {PRIORITIES.map((p) => (
                      <MenuItem key={p.value} value={p.value}>
                        {p.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={submitting}
                  startIcon={<IconSend size={18} />}
                  sx={{
                    minHeight: 46,
                    fontWeight: 800,
                    borderRadius: '10px',
                    textTransform: 'none',
                    background: `linear-gradient(135deg, ${brand.primary[500]} 0%, ${brand.primary[700]} 100%)`,
                    '&:hover': {
                      background: `linear-gradient(135deg, ${brand.primary[600]} 0%, ${brand.primary[800]} 100%)`,
                    },
                  }}
                >
                  {submitting ? 'Submitting…' : 'Submit Ticket'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Contact Info Cards */}
        <Grid size={{ xs: 12, lg: 5 }}>
          <Stack spacing={2}>
            {CONTACT_CARDS.map((card) => (
              <Card
                key={card.title}
                elevation={0}
                sx={{
                  border: `1px solid ${brand.neutral[200]}`,
                  borderRadius: '12px',
                  boxShadow: `0 1px 2px ${brand.neutral[900]}06`,
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    borderColor: brand.primary[300],
                    boxShadow: `0 4px 12px ${brand.neutral[900]}08`,
                  },
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '10px',
                        bgcolor: card.bgColor,
                        color: card.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {card.icon}
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: brand.neutral[400], fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {card.title}
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 700, color: brand.neutral[800], fontSize: '0.9375rem' }}>
                        {card.value}
                      </Typography>
                      <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 500 }}>
                        {card.sub}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Grid>
      </Grid>

      {/* Success / Error Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={5000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={toast.severity}
          onClose={() => setToast((t) => ({ ...t, open: false }))}
          sx={{ borderRadius: '10px', fontWeight: 600 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
