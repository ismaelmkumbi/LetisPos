import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Typography, Stack, Box, IconButton, MenuItem, Chip,
} from '@mui/material';
import {
  IconX, IconCheck, IconBrandWhatsapp, IconPhone, IconMail,
} from '@tabler/icons-react';
import CtaButton from './CtaButton';
import { createDemoRequest } from 'src/api/smartpos/support';

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */
interface DemoDialogContextValue {
  openDemo: () => void;
}

const DemoDialogContext = createContext<DemoDialogContextValue | null>(null);

export function useDemoDialog(): DemoDialogContextValue {
  const ctx = useContext(DemoDialogContext);
  if (!ctx) throw new Error('useDemoDialog must be used within DemoDialogProvider');
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Provider + Dialog                                                  */
/* ------------------------------------------------------------------ */
export function DemoDialogProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [preferredContact, setPreferredContact] = useState<'whatsapp' | 'call' | 'email'>('whatsapp');

  const openDemo = useCallback(() => {
    setOpen(true);
    setSubmitted(false);
    setName('');
    setEmail('');
    setPhone('');
    setCompany('');
    setBusinessType('');
    setPreferredContact('whatsapp');
  }, []);

  const handleClose = () => setOpen(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setSending(true);
    try {
      await createDemoRequest({
        name,
        email,
        subject: `Demo: ${businessType || 'General'} — ${company || name}`,
        message: [
          `Name: ${name}`,
          `Email: ${email}`,
          `Phone: ${phone || 'Not provided'}`,
          `Company: ${company || 'N/A'}`,
          `Business type: ${businessType || 'Not specified'}`,
          `Preferred contact: ${preferredContact}`,
          '',
          'Requested a product demo from the landing page.',
        ].join('\n'),
      });
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setSending(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Success state                                                    */
  /* ---------------------------------------------------------------- */
  if (submitted && open) {
    return (
      <DemoDialogContext.Provider value={{ openDemo }}>
        {children}
        <Dialog
          open={open}
          onClose={handleClose}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              bgcolor: 'var(--lp-surface)',
              color: 'var(--lp-text)',
              border: '1px solid var(--lp-border)',
              borderRadius: 3,
            },
          }}
        >
          <DialogContent sx={{ textAlign: 'center', py: 6, px: 4 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                bgcolor: 'var(--lp-accent-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
              }}
            >
              <IconCheck size={28} color="var(--lp-accent)" strokeWidth={2} />
            </Box>

            <Typography
              sx={{
                fontFamily: 'var(--lp-font-display)',
                fontSize: '1.5rem',
                fontWeight: 700,
                mb: 1,
              }}
            >
              Request sent{name ? `, ${name.split(' ')[0]}` : ''}
            </Typography>

            <Typography
              sx={{
                fontFamily: 'var(--lp-font-body)',
                fontSize: '0.938rem',
                color: 'var(--lp-text-muted)',
                lineHeight: 1.6,
                mb: 1,
              }}
            >
              Our team in Dar es Salaam will reach out{' '}
              <Box component="span" sx={{ fontWeight: 600, color: 'var(--lp-text)' }}>
                within 24 hours
              </Box>{' '}
              via{' '}
              {preferredContact === 'whatsapp'
                ? 'WhatsApp'
                : preferredContact === 'call'
                ? 'phone'
                : 'email'}{' '}
              to schedule your personalized walkthrough.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
            <CtaButton variant="secondary" onClick={handleClose}>
              Close
            </CtaButton>
          </DialogActions>
        </Dialog>
      </DemoDialogContext.Provider>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Form state                                                       */
  /* ---------------------------------------------------------------- */
  return (
    <DemoDialogContext.Provider value={{ openDemo }}>
      {children}
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'var(--lp-surface)',
            color: 'var(--lp-text)',
            border: '1px solid var(--lp-border)',
            borderRadius: 3,
          },
        }}
      >
        {/* Header */}
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', pt: 3, pb: 0 }}>
          <Box>
            <Typography
              sx={{
                fontFamily: 'var(--lp-font-display)',
                fontSize: '1.25rem',
                fontWeight: 700,
              }}
            >
              Book a demo
            </Typography>
            <Typography
              sx={{
                fontFamily: 'var(--lp-font-body)',
                fontSize: '0.875rem',
                color: 'var(--lp-text-muted)',
                mt: 0.5,
              }}
            >
              See Letis in action with a walkthrough tailored to your business.
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small" sx={{ color: 'var(--lp-text-muted)', mt: -0.5 }}>
            <IconX size={18} />
          </IconButton>
        </DialogTitle>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <DialogContent sx={{ pt: 2, pb: 1 }}>
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Full name *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  fullWidth
                  InputLabelProps={{ sx: { fontFamily: 'var(--lp-font-body)' } }}
                  InputProps={{ sx: textFieldSx }}
                />
                <TextField
                  label="Email address *"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  fullWidth
                  InputLabelProps={{ sx: { fontFamily: 'var(--lp-font-body)' } }}
                  InputProps={{ sx: textFieldSx }}
                />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  fullWidth
                  placeholder="+255 7XX XXX XXX"
                  InputLabelProps={{ sx: { fontFamily: 'var(--lp-font-body)' } }}
                  InputProps={{ sx: textFieldSx }}
                />
                <TextField
                  label="Business / Company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  fullWidth
                  InputLabelProps={{ sx: { fontFamily: 'var(--lp-font-body)' } }}
                  InputProps={{ sx: textFieldSx }}
                />
              </Stack>

              <TextField
                select
                label="Business type"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                fullWidth
                InputLabelProps={{ sx: { fontFamily: 'var(--lp-font-body)' } }}
                InputProps={{ sx: textFieldSx }}
              >
                {[
                  'Retail shop',
                  'Supermarket',
                  'Pharmacy',
                  'Restaurant / Bar',
                  'Electronics',
                  'Wholesale',
                  'Boutique / Fashion',
                  'Hardware',
                  'Other',
                ].map((opt) => (
                  <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                ))}
              </TextField>

              {/* Preferred contact */}
              <Box>
                <Typography
                  sx={{
                    fontFamily: 'var(--lp-font-body)',
                    fontSize: '0.813rem',
                    fontWeight: 600,
                    color: 'var(--lp-text)',
                    mb: 1,
                  }}
                >
                  Preferred contact method
                </Typography>
                <Stack direction="row" spacing={1}>
                  {([
                    { key: 'whatsapp', label: 'WhatsApp', icon: IconBrandWhatsapp },
                    { key: 'call', label: 'Phone', icon: IconPhone },
                    { key: 'email', label: 'Email', icon: IconMail },
                  ] as const).map(({ key, label, icon: Icon }) => (
                    <Chip
                      key={key}
                      icon={<Icon size={14} />}
                      label={label}
                      clickable
                      onClick={() => setPreferredContact(key)}
                      variant={preferredContact === key ? 'filled' : 'outlined'}
                      sx={{
                        fontFamily: 'var(--lp-font-body)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        borderRadius: '8px',
                        bgcolor: preferredContact === key ? 'var(--lp-accent-soft)' : 'transparent',
                        color: preferredContact === key ? 'var(--lp-accent)' : 'var(--lp-text-muted)',
                        borderColor: preferredContact === key ? 'var(--lp-accent)' : 'var(--lp-border)',
                        '&:hover': {
                          bgcolor: 'var(--lp-accent-soft)',
                        },
                      }}
                    />
                  ))}
                </Stack>
              </Box>
            </Stack>

            {/* Local presence note */}
            <Typography
              sx={{
                fontFamily: 'var(--lp-font-body)',
                fontSize: '0.75rem',
                color: 'var(--lp-text-muted)',
                mt: 2.5,
                textAlign: 'center',
              }}
            >
              Based in Dar es Salaam &bull; Local support in Swahili & English &bull; WhatsApp +255 7XX XXX XXX
            </Typography>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 3 }}>
            <CtaButton variant="secondary" onClick={handleClose} fullWidth>
              Cancel
            </CtaButton>
            <CtaButton variant="primary" type="submit" disabled={sending} fullWidth>
              {sending ? 'Sending…' : 'Request free demo'}
            </CtaButton>
          </DialogActions>
        </form>
      </Dialog>
    </DemoDialogContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Text-field styling — matches existing landing page design          */
/* ------------------------------------------------------------------ */
const textFieldSx = {
  fontFamily: 'var(--lp-font-body)',
  color: 'var(--lp-text)',
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--lp-border)' },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--lp-accent)' },
};
