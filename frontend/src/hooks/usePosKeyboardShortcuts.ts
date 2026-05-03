/**
 * POS terminal keyboard shortcuts.
 *
 * F1  = focus barcode input
 * F2  = quick add customer (if callback provided)
 * F4  = hold cart
 * F8  = open/close cash register
 * F12 = complete sale / pay now
 * Ctrl+P = reprint last receipt
 */
import { useEffect } from 'react';

interface PosShortcutHandlers {
  focusBarcode: () => void;
  onQuickAddCustomer?: () => void;
  onHoldCart?: () => void;
  onRegisterToggle?: () => void;
  onCompleteSale?: () => void;
  onReprint?: () => void;
}

export function usePosKeyboardShortcuts(handlers: PosShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1' || e.key === 'f1') {
        e.preventDefault();
        handlers.focusBarcode();
        return;
      }

      if (e.key === 'F2' || e.key === 'f2') {
        e.preventDefault();
        handlers.onQuickAddCustomer?.();
        return;
      }

      if (e.key === 'F4' || e.key === 'f4') {
        e.preventDefault();
        handlers.onHoldCart?.();
        return;
      }

      if (e.key === 'F8' || e.key === 'f8') {
        e.preventDefault();
        handlers.onRegisterToggle?.();
        return;
      }

      if (e.key === 'F12' || e.key === 'f12') {
        e.preventDefault();
        handlers.onCompleteSale?.();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        handlers.onReprint?.();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
