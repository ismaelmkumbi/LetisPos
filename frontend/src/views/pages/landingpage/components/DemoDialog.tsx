import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  Dialog, DialogContent, TextField, Typography, Stack, Box, IconButton,
  MenuItem, Chip, keyframes,
} from '@mui/material';
import {
  IconX, IconCheck, IconPhone, IconBrandWhatsapp,
  IconMapPin, IconClock, IconUser, IconBuilding, IconMail,
} from '@tabler/icons-react';
import CtaButton from './CtaButton';
import { createDemoRequest } from 'src/api/smartpos/support';

/* ------------------------------------------------------------------ */
/*  East African colour palette — warm, earthy, vibrant                */
/* ------------------------------------------------------------------ */
const palette = {
  clay:     '#C67B5C',
  clayDeep: '#A45D3E',
  earth:    '#8B5E3C',
  savanna:  '#D4A434',
  green:    '#2D8B4E',
  greenDeep:'#1E5C34',
  sand:     '#F5E6D3',
  sandLight:'#FBF5EE',
  tzBlue:   '#1E5C9E',   // Tanzania flag blue
  tzGold:   '#F4B41A',   // Tanzania flag gold
  tzGreen:  '#1A854A',   // Tanzania flag green
  warmGray: '#6B5E53',
  dark:     '#2C1810',
};

/* ------------------------------------------------------------------ */
/*  Animations                                                         */
/* ------------------------------------------------------------------ */
const fadeSlideUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const successPulse = keyframes`
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.05); }
`;

const stripeSlide = keyframes`
  0%   { background-position: 0 0; }
  100% { background-position: 40px 0; }
`;

/* ------------------------------------------------------------------ */
/*  Decorative Kanga-inspired top border                               */
/* ------------------------------------------------------------------ */
const KangaBorder = () => (
  <Box
    sx={{
      height: 6,
      background: `repeating-linear-gradient(
        90deg,
        ${palette.tzGreen} 0px,
        ${palette.tzGreen} 8px,
        ${palette.tzGold} 8px,
        ${palette.tzGold} 16px,
        ${palette.tzBlue} 16px,
        ${palette.tzBlue} 24px,
        ${palette.savanna} 24px,
        ${palette.savanna} 32px
      )`,
      backgroundSize: '40px 6px',
      animation: `${stripeSlide} 2s linear infinite`,
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
    }}
  />
);

/* ------------------------------------------------------------------ */
/*  Trust signals — local presence                                     */
/* ------------------------------------------------------------------ */
const trustItems = [
  { icon: IconMapPin,     text: 'Based in Dar es Salaam, TZ' },
  { icon: IconPhone,      text: '+255 7XX XXX XXX' },
  { icon: IconBrandWhatsapp, text: 'WhatsApp support in Swahili & English' },
  { icon: IconClock,      text: 'Mon–Fri 8am–6pm EAT • Sat 9am–2pm' },
];

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
              bgcolor: palette.sandLight,
              border: `1px solid ${palette.sand}`,
              borderRadius: '16px',
              overflow: 'hidden',
            },
          }}
        >
          <KangaBorder />
          <DialogContent sx={{ textAlign: 'center', py: 6, px: 4 }}>
            {/* Success icon — circular green with check */}
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: palette.green,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
                animation: `${successPulse} 2s ease-in-out infinite`,
                boxShadow: `0 8px 32px rgba(45,139,78,0.25)`,
              }}
            >
              <IconCheck size={36} color="#FFFFFF" strokeWidth={2.5} />
            </Box>

            <Typography
              sx={{
                fontFamily: 'var(--lp-font-display)',
                fontSize: '1.75rem',
                fontWeight: 800,
                color: palette.dark,
                mb: 0.5,
              }}
            >
              Asante sana{name ? `, ${name.split(' ')[0]}` : ''}!
            </Typography>

            <Typography
              sx={{
                fontFamily: 'var(--lp-font-body)',
                fontSize: '1rem',
                color: palette.warmGray,
                lineHeight: 1.7,
                mb: 2,
              }}
            >
              Your demo request has been received. One of our local team members
              in Dar es Salaam will reach out{' '}
              <Box component="span" sx={{ fontWeight: 700, color: palette.clayDeep }}>
                within 24 hours
              </Box>{' '}
              via {preferredContact === 'whatsapp' ? 'WhatsApp' : preferredContact === 'call' ? 'phone' : 'email'}{' '}
              to schedule your personalized walkthrough.
            </Typography>

            {/* Contact chips */}
            <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
              {trustItems.slice(0, 2).map((item) => (
                <Chip
                  key={item.text}
                  icon={<item.icon size={14} />}
                  label={item.text}
                  size="small"
                  sx={{
                    fontFamily: 'var(--lp-font-body)',
                    fontSize: '0.7rem',
                    bgcolor: palette.sand,
                    color: palette.earth,
                    fontWeight: 500,
                    borderRadius: '20px',
                    border: `1px solid ${palette.savanna}40`,
                  }}
                />
              ))}
            </Stack>

            <CtaButton variant="primary" onClick={handleClose} sx={{ mt: 2 }}>
              Close
            </CtaButton>
          </DialogContent>
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
            bgcolor: palette.sandLight,
            border: `1px solid ${palette.sand}`,
            borderRadius: '16px',
            overflow: 'hidden',
          },
        }}
      >
        <KangaBorder />

        {/* ── Header ────────────────────────────────────────────── */}
        <Box sx={{ px: 3, pt: 3, pb: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography
                sx={{
                  fontFamily: 'var(--lp-font-display)',
                  fontSize: '0.813rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  color: palette.green,
                  mb: 0.25,
                }}
              >
                Karibu &bull; Welcome
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'var(--lp-font-display)',
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: palette.dark,
                  lineHeight: 1.2,
                }}
              >
                Book your free demo
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'var(--lp-font-body)',
                  fontSize: '0.875rem',
                  color: palette.warmGray,
                  mt: 0.5,
                }}
              >
                See how Letis POS can transform your business — tailored to Tanzanian retail.
              </Typography>
            </Box>
            <IconButton
              onClick={handleClose}
              size="small"
              sx={{
                color: palette.warmGray,
                mt: -0.5,
                mr: -0.5,
                '&:hover': { color: palette.dark, bgcolor: palette.sand },
              }}
            >
              <IconX size={18} />
            </IconButton>
          </Stack>
        </Box>

        {/* ── Form ──────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit}>
          <DialogContent sx={{ px: 3, pb: 2 }}>
            <Stack spacing={2}>
              {/* Row 1: Name + Email */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Full name *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <Box sx={{ mr: 1, color: palette.warmGray, display: 'flex' }}>
                        <IconUser size={16} />
                      </Box>
                    ),
                  }}
                  sx={textFieldSx}
                />
                <TextField
                  label="Email address *"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <Box sx={{ mr: 1, color: palette.warmGray, display: 'flex' }}>
                        <IconMail size={16} />
                      </Box>
                    ),
                  }}
                  sx={textFieldSx}
                />
              </Stack>

              {/* Row 2: Phone + Company */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  fullWidth
                  placeholder="+255 7XX XXX XXX"
                  InputProps={{
                    startAdornment: (
                      <Box sx={{ mr: 1, color: palette.warmGray, display: 'flex' }}>
                        <IconPhone size={16} />
                      </Box>
                    ),
                  }}
                  sx={textFieldSx}
                />
                <TextField
                  label="Business / Company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <Box sx={{ mr: 1, color: palette.warmGray, display: 'flex' }}>
                        <IconBuilding size={16} />
                      </Box>
                    ),
                  }}
                  sx={textFieldSx}
                />
              </Stack>

              {/* Row 3: Business type */}
              <TextField
                select
                label="Business type"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                fullWidth
                sx={textFieldSx}
              >
                {[
                  'Retail shop / Duka',
                  'Supermarket',
                  'Pharmacy',
                  'Restaurant / Bar',
                  'Electronics store',
                  'Wholesale distributor',
                  'Boutique / Fashion',
                  'Hardware store',
                  'Other',
                ].map((opt) => (
                  <MenuItem key={opt} value={opt} sx={{ fontFamily: 'var(--lp-font-body)' }}>
                    {opt}
                  </MenuItem>
                ))}
              </TextField>

              {/* Row 4: Preferred contact method */}
              <Box>
                <Typography
                  sx={{
                    fontFamily: 'var(--lp-font-body)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: palette.warmGray,
                    mb: 1,
                  }}
                >
                  Preferred contact method
                </Typography>
                <Stack direction="row" spacing={1}>
                  {([
                    { key: 'whatsapp', label: 'WhatsApp', icon: IconBrandWhatsapp },
                    { key: 'call',     label: 'Phone Call', icon: IconPhone },
                    { key: 'email',    label: 'Email', icon: IconMail },
                  ] as const).map(({ key, label, icon: Icon }) => (
                    <Chip
                      key={key}
                      icon={<Icon size={14} />}
                      label={label}
                      clickable
                      onClick={() => setPreferredContact(key)}
                      sx={{
                        fontFamily: 'var(--lp-font-body)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        px: 0.5,
                        bgcolor: preferredContact === key ? palette.clay : palette.sand,
                        color: preferredContact === key ? '#FFFFFF' : palette.earth,
                        border: preferredContact === key
                          ? `1.5px solid ${palette.clayDeep}`
                          : `1px solid ${palette.savanna}40`,
                        borderRadius: '20px',
                        '&:hover': {
                          bgcolor: preferredContact === key ? palette.clayDeep : palette.sand,
                        },
                        '& .MuiChip-icon': {
                          color: preferredContact === key ? '#FFFFFF' : palette.warmGray,
                        },
                      }}
                    />
                  ))}
                </Stack>
              </Box>
            </Stack>
          </DialogContent>

          {/* ── Trust strip ─────────────────────────────────────── */}
          <Box
            sx={{
              mx: 3,
              mb: 2,
              p: 2,
              borderRadius: '10px',
              bgcolor: palette.sand,
              border: `1px solid ${palette.savanna}30`,
            }}
          >
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
              {trustItems.map((item) => (
                <Stack key={item.text} direction="row" spacing={0.75} alignItems="center">
                  <item.icon size={14} color={palette.green} strokeWidth={2} />
                  <Typography
                    sx={{
                      fontFamily: 'var(--lp-font-body)',
                      fontSize: '0.688rem',
                      color: palette.earth,
                      fontWeight: 500,
                    }}
                  >
                    {item.text}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Box>

          {/* ── Actions ─────────────────────────────────────────── */}
          <Box sx={{ px: 3, pb: 3 }}>
            <Stack direction="row" spacing={2}>
              <CtaButton variant="secondary" onClick={handleClose} fullWidth>
                Cancel
              </CtaButton>
              <CtaButton
                variant="primary"
                type="submit"
                disabled={sending}
                fullWidth
                sx={{
                  bgcolor: `${palette.green} !important`,
                  color: '#FFFFFF !important',
                  '&:hover': { bgcolor: `${palette.greenDeep} !important` },
                }}
              >
                {sending ? 'Sending…' : 'Request free demo'}
              </CtaButton>
            </Stack>
          </Box>
        </form>
      </Dialog>
    </DemoDialogContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared text-field styling                                          */
/* ------------------------------------------------------------------ */
const textFieldSx = {
  '& .MuiInputLabel-root': {
    fontFamily: 'var(--lp-font-body)',
    fontSize: '0.813rem',
    color: palette.warmGray,
  },
  '& .MuiOutlinedInput-root': {
    fontFamily: 'var(--lp-font-body)',
    fontSize: '0.875rem',
    color: palette.dark,
    bgcolor: '#FFFFFF',
    borderRadius: '10px',
    '& fieldset': { borderColor: `${palette.savanna}40`, transition: 'border-color 0.2s' },
    '&:hover fieldset': { borderColor: palette.clay },
    '&.Mui-focused fieldset': { borderColor: palette.clay, borderWidth: '1.5px' },
  },
  '& .MuiInputBase-input::placeholder': {
    color: palette.warmGray,
    opacity: 0.6,
  },
};
