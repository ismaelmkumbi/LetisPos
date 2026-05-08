/**
 * Right-side drawer used by every SmartPOS create/edit form.
 *
 * Provides the shell — header with close, scrollable body, sticky footer
 * with Cancel / Save buttons. Consumers pass the form body as children
 * and implement `onSubmit`.
 */
import {
  Box, Button, CircularProgress, Drawer, IconButton, Stack, Typography,
} from '@mui/material';
import { IconX } from '@tabler/icons-react';
import { brand } from 'src/theme/smartpos/brand';
import { StatusIndicator, type OperationalState } from './StatusIndicator';

const SIZE_WIDTHS = { sm: 400, md: 560, lg: 720 } as const;

export interface EditDrawerProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  onSubmit: () => void;
  submitting?: boolean;
  submitLabel?: string;
  disabled?: boolean;
  width?: number;
  /** Predefined size: 'sm' (400), 'md' (560), 'lg' (720). Overridden by `width`. */
  size?: 'sm' | 'md' | 'lg';
  /** Operational status shown alongside the title */
  statusIndicator?: { state: OperationalState; label: string };
  /** Extra footer buttons rendered to the LEFT of Cancel / Save. */
  extraActions?: React.ReactNode;
  children: React.ReactNode;
}

export function EditDrawer({
  open, title, subtitle, onClose, onSubmit, submitting, submitLabel = 'Save',
  disabled, width, size, statusIndicator, extraActions, children,
}: EditDrawerProps) {
  const drawerWidth = width ?? SIZE_WIDTHS[size ?? 'md'];

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: drawerWidth },
          maxWidth: '100vw',
          height: { xs: '100%', sm: 'auto' },
          maxHeight: { xs: '100dvh', sm: '90vh' },
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Header */}
      <Box sx={{
        px: 3, py: 2,
        borderBottom: `1px solid ${brand.neutral[200]}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 2,
      }}>
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 700 }} noWrap>{title}</Typography>
            {statusIndicator && (
              <StatusIndicator state={statusIndicator.state} label={statusIndicator.label} size="sm" />
            )}
          </Stack>
          {subtitle && (
            <Typography variant="caption" sx={{ color: brand.neutral[500] }} noWrap>
              {subtitle}
            </Typography>
          )}
        </Box>
        <IconButton onClick={onClose} size="small">
          <IconX size={18} />
        </IconButton>
      </Box>

      {/* Body */}
      <Box
        component="form"
        onSubmit={(e) => { e.preventDefault(); if (!disabled && !submitting) onSubmit(); }}
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 3,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {children}
      </Box>

      {/* Footer */}
      <Box sx={{
        px: 3, py: 2,
        borderTop: `1px solid ${brand.neutral[200]}`,
        bgcolor: brand.neutral[50],
      }}>
        <Stack direction="row" spacing={1} justifyContent={extraActions ? 'space-between' : 'flex-end'}>
          {extraActions && <Stack direction="row" spacing={1}>{extraActions}</Stack>}
          <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={onSubmit}
            disabled={disabled || submitting}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{
              bgcolor: brand.accent[500],
              '&:hover': { bgcolor: brand.accent[600] },
              fontWeight: 700,
            }}
          >
            {submitting ? 'Saving…' : submitLabel}
          </Button>
          </Stack>
        </Stack>
      </Box>
    </Drawer>
  );
}

export default EditDrawer;
