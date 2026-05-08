import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Typography, Stack, Box, IconButton,
} from '@mui/material';
import { IconX, IconCheck } from '@tabler/icons-react';
import CtaButton from './CtaButton';

interface DemoDialogContextValue {
  openDemo: () => void;
}

const DemoDialogContext = createContext<DemoDialogContextValue | null>(null);

export function useDemoDialog(): DemoDialogContextValue {
  const ctx = useContext(DemoDialogContext);
  if (!ctx) throw new Error('useDemoDialog must be used within DemoDialogProvider');
  return ctx;
}

export function DemoDialogProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');

  const openDemo = useCallback(() => {
    setOpen(true);
    setSubmitted(false);
  }, []);

  const handleClose = () => {
    setOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

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
            p: 2,
          },
        }}
      >
        {submitted ? (
          <>
            <DialogContent sx={{ textAlign: 'center', py: 6 }}>
              <Box sx={{ color: 'var(--lp-accent)', mb: 2 }}>
                <IconCheck size={48} strokeWidth={1.5} />
              </Box>
              <Typography
                sx={{
                  fontFamily: 'var(--lp-font-display)',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  mb: 1,
                }}
              >
                Request sent
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'var(--lp-font-body)',
                  fontSize: '0.938rem',
                  color: 'var(--lp-text-muted)',
                  lineHeight: 1.6,
                }}
              >
                Thanks{name ? `, ${name}` : ''}. We'll reach out within 24 hours to schedule your personalized demo of Letis.
              </Typography>
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
              <CtaButton variant="primary" onClick={handleClose}>
                Close
              </CtaButton>
            </DialogActions>
          </>
        ) : (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 0, mb: 3 }}>
              <Typography
                sx={{
                  fontFamily: 'var(--lp-font-display)',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                }}
              >
                Book a demo
              </Typography>
              <IconButton onClick={handleClose} size="small" sx={{ color: 'var(--lp-text-muted)' }}>
                <IconX size={18} />
              </IconButton>
            </DialogTitle>

            <form onSubmit={handleSubmit}>
              <DialogContent sx={{ p: 0, mb: 3 }}>
                <Typography
                  sx={{
                    fontFamily: 'var(--lp-font-body)',
                    fontSize: '0.875rem',
                    color: 'var(--lp-text-muted)',
                    mb: 3,
                  }}
                >
                  See Letis in action with a personalized walkthrough tailored to your business.
                </Typography>
                <Stack spacing={2.5}>
                  <TextField
                    label="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    fullWidth
                    InputLabelProps={{ sx: { fontFamily: 'var(--lp-font-body)' } }}
                    InputProps={{
                      sx: {
                        fontFamily: 'var(--lp-font-body)',
                        color: 'var(--lp-text)',
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--lp-border)' },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--lp-accent)' },
                      },
                    }}
                  />
                  <TextField
                    label="Email address"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    fullWidth
                    InputLabelProps={{ sx: { fontFamily: 'var(--lp-font-body)' } }}
                    InputProps={{
                      sx: {
                        fontFamily: 'var(--lp-font-body)',
                        color: 'var(--lp-text)',
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--lp-border)' },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--lp-accent)' },
                      },
                    }}
                  />
                  <TextField
                    label="Company (optional)"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    fullWidth
                    InputLabelProps={{ sx: { fontFamily: 'var(--lp-font-body)' } }}
                    InputProps={{
                      sx: {
                        fontFamily: 'var(--lp-font-body)',
                        color: 'var(--lp-text)',
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--lp-border)' },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--lp-accent)' },
                      },
                    }}
                  />
                </Stack>
              </DialogContent>
              <DialogActions sx={{ p: 0 }}>
                <CtaButton variant="secondary" onClick={handleClose}>
                  Cancel
                </CtaButton>
                <CtaButton variant="primary" type="submit">
                  Request demo
                </CtaButton>
              </DialogActions>
            </form>
          </>
        )}
      </Dialog>
    </DemoDialogContext.Provider>
  );
}
