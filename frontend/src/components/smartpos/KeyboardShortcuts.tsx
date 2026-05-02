/**
 * Letis POS — Keyboard Shortcuts System
 *
 * Enterprise-grade keyboard navigation for power users.
 * Includes a help dialog showing all available shortcuts.
 */
import { useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, Box, Typography,
  Stack, Chip, Divider, IconButton, Grid, Paper
} from '@mui/material';
import {
  IconKeyboard, IconX, IconCommand,
  IconRefresh, IconEdit
} from '@tabler/icons-react';
import { brand } from 'src/theme/smartpos/brand';

export interface ShortcutDefinition {
  key: string;
  modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta')[];
  description: string;
  scope?: 'global' | 'table' | 'form' | 'modal';
  action: () => void;
}

// Default shortcuts registry
const SHORTCUTS: ShortcutDefinition[] = [
  // Global
  { key: 'k', modifiers: ['ctrl'], description: 'Open command palette', scope: 'global', action: () => {} },
  { key: '/', modifiers: [], description: 'Focus search', scope: 'global', action: () => {} },
  { key: '?', modifiers: [], description: 'Show keyboard shortcuts', scope: 'global', action: () => {} },
  { key: 'Escape', modifiers: [], description: 'Close modal / Go back', scope: 'global', action: () => {} },
  { key: 'n', modifiers: ['alt'], description: 'New record', scope: 'global', action: () => {} },

  // Table actions
  { key: 'a', modifiers: ['ctrl'], description: 'Select all rows', scope: 'table', action: () => {} },
  { key: 'e', modifiers: ['ctrl'], description: 'Export data', scope: 'table', action: () => {} },
  { key: 'f', modifiers: ['ctrl'], description: 'Open filters', scope: 'table', action: () => {} },
  { key: 'r', modifiers: ['ctrl'], description: 'Refresh data', scope: 'table', action: () => {} },
  { key: 'Delete', modifiers: [], description: 'Delete selected', scope: 'table', action: () => {} },

  // Navigation
  { key: 'g', modifiers: ['alt'], description: 'Go to dashboard', scope: 'global', action: () => {} },
  { key: 'p', modifiers: ['alt'], description: 'Go to products', scope: 'global', action: () => {} },
  { key: 'c', modifiers: ['alt'], description: 'Go to customers', scope: 'global', action: () => {} },
  { key: 's', modifiers: ['alt'], description: 'Go to sales', scope: 'global', action: () => {} },
  { key: 't', modifiers: ['alt'], description: 'Go to POS', scope: 'global', action: () => {} },
];

// Hook to register and handle keyboard shortcuts
export function useKeyboardShortcuts(
  shortcuts: ShortcutDefinition[],
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs (except for Esc)
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (isInput && e.key !== 'Escape') return;

      for (const shortcut of shortcuts) {
        const matchesKey = e.key === shortcut.key || e.code === shortcut.key;
        const matchesModifiers = (shortcut.modifiers ?? []).every(mod => {
          if (mod === 'ctrl') return e.ctrlKey;
          if (mod === 'alt') return e.altKey;
          if (mod === 'shift') return e.shiftKey;
          if (mod === 'meta') return e.metaKey;
          return false;
        });

        if (matchesKey && matchesModifiers) {
          e.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
}

// Helper to format shortcut display
function formatShortcut(shortcut: ShortcutDefinition): string {
  const parts: string[] = [];
  if (shortcut.modifiers?.includes('ctrl')) parts.push('Ctrl');
  if (shortcut.modifiers?.includes('alt')) parts.push('Alt');
  if (shortcut.modifiers?.includes('shift')) parts.push('Shift');
  if (shortcut.modifiers?.includes('meta')) parts.push('⌘');

  const key = shortcut.key === ' ' ? 'Space' : shortcut.key;
  parts.push(key);

  return parts.join(' + ');
}

// Get icon for scope
function getScopeIcon(scope: string) {
  switch (scope) {
    case 'global': return <IconCommand size={14} />;
    case 'table': return <IconRefresh size={14} />;
    case 'form': return <IconEdit size={14} />;
    default: return <IconKeyboard size={14} />;
  }
}

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsHelp({ open, onClose }: KeyboardShortcutsHelpProps) {
  const grouped = SHORTCUTS.reduce((acc, shortcut) => {
    if (!acc[shortcut.scope || 'global']) {
      acc[shortcut.scope || 'global'] = [];
    }
    acc[shortcut.scope || 'global'].push(shortcut);
    return acc;
  }, {} as Record<string, ShortcutDefinition[]>);

  const scopeLabels: Record<string, string> = {
    global: 'Global Shortcuts',
    table: 'Table Actions',
    form: 'Form Actions',
    modal: 'Modal Actions',
  };

  const scopeOrder = ['global', 'table', 'form', 'modal'];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: '16px',
          overflow: 'hidden',
          maxHeight: '80vh',
        }
      }}
    >
      <DialogTitle sx={{ px: 3, py: 2, borderBottom: `1px solid ${brand.neutral[200]}` }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 40, height: 40, borderRadius: '10px',
                bgcolor: brand.primary[50],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: brand.primary[600],
              }}
            >
              <IconKeyboard size={20} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                Keyboard Shortcuts
              </Typography>
              <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
                Work faster with keyboard navigation
              </Typography>
            </Box>
          </Stack>
          <IconButton onClick={onClose} size="small" sx={{ color: brand.neutral[400] }}>
            <IconX size={20} />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 2 }}>
        <Grid container spacing={3}>
          {scopeOrder.map(scope => {
            const shortcuts = grouped[scope];
            if (!shortcuts?.length) return null;

            return (
              <Grid key={scope} size={{ xs: 12, md: 6 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    border: `1px solid ${brand.neutral[200]}`,
                    borderRadius: '12px',
                    height: '100%',
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                    <Box sx={{ color: brand.primary[500] }}>
                      {getScopeIcon(scope)}
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {scopeLabels[scope]}
                    </Typography>
                  </Stack>

                  <Stack spacing={1.5}>
                    {shortcuts.map((shortcut, idx) => (
                      <Stack
                        key={idx}
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Typography
                          variant="body2"
                          sx={{ color: brand.neutral[700], fontWeight: 500 }}
                        >
                          {shortcut.description}
                        </Typography>
                        <Chip
                          label={formatShortcut(shortcut)}
                          size="small"
                          sx={{
                            height: 24,
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            bgcolor: brand.neutral[100],
                            color: brand.neutral[700],
                            border: `1px solid ${brand.neutral[200]}`,
                          }}
                        />
                      </Stack>
                    ))}
                  </Stack>
                </Paper>
              </Grid>
            );
          })}
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Typography variant="caption" sx={{ color: brand.neutral[500], display: 'block', textAlign: 'center' }}>
          Press <kbd style={{ padding: '2px 6px', background: brand.neutral[100], borderRadius: 4, fontFamily: 'inherit' }}>?</kbd> from anywhere to open this help
        </Typography>
      </DialogContent>
    </Dialog>
  );
}

// Hook to toggle help dialog
document.addEventListener('keydown', (e) => {
  if (e.key === '?' && !e.ctrlKey && !e.altKey && !e.metaKey) {
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
    if (!isInput) {
      window.dispatchEvent(new CustomEvent('toggle-keyboard-help'));
    }
  }
});

export default KeyboardShortcutsHelp;
