/**
 * Letis POS — Floating Action Button (FAB) System
 *
 * Primary actions that follow the user, with expanded menu on hover/click.
 * Perfect for the most common actions across any page.
 */
import { useState } from 'react';
import {
  Fab, Zoom, Tooltip, SpeedDial, SpeedDialAction, SpeedDialIcon
} from '@mui/material';
import {
  IconPlus, IconCashRegister, IconPackage, IconUsers,
  IconShoppingCart, IconReceipt, IconArrowUp
} from '@tabler/icons-react';
import { useNavigate, useLocation } from 'react-router';
import { brand } from 'src/theme/smartpos/brand';

interface FloatingAction {
  key: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  shortcut?: string;
}

// Context-aware actions based on current route
const CONTEXT_ACTIONS: Record<string, FloatingAction[]> = {
  default: [
    { key: 'new-sale', label: 'New Sale', icon: <IconCashRegister size={20} />, path: '/smartpos/sales/pos', shortcut: 'N' },
    { key: 'new-product', label: 'New Product', icon: <IconPackage size={20} />, path: '/smartpos/products', shortcut: 'P' },
    { key: 'new-customer', label: 'New Customer', icon: <IconUsers size={20} />, path: '/smartpos/customers', shortcut: 'C' },
  ],
  '/smartpos/products': [
    { key: 'new-product', label: 'New Product', icon: <IconPackage size={20} />, path: '/smartpos/products', shortcut: 'P' },
    { key: 'import', label: 'Import CSV', icon: <IconArrowUp size={20} />, path: '/smartpos/products?import=ai' },
  ],
  '/smartpos/customers': [
    { key: 'new-customer', label: 'New Customer', icon: <IconUsers size={20} />, path: '/smartpos/customers', shortcut: 'C' },
    { key: 'import', label: 'Import CSV', icon: <IconArrowUp size={20} />, path: '/smartpos/customers/import' },
  ],
  '/smartpos/sales': [
    { key: 'new-sale', label: 'New Sale', icon: <IconCashRegister size={20} />, path: '/smartpos/sales/pos', shortcut: 'N' },
    { key: 'new-quotation', label: 'New Quote', icon: <IconReceipt size={20} />, path: '/smartpos/quotations' },
  ],
  '/smartpos/purchases': [
    { key: 'new-purchase', label: 'New Purchase', icon: <IconShoppingCart size={20} />, path: '/smartpos/purchases/new', shortcut: 'O' },
  ],
};

export function FloatingActions() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Get actions for current context
  const actions = CONTEXT_ACTIONS[location.pathname] || CONTEXT_ACTIONS.default;
  const primaryAction = actions[0];

  // Simple FAB for single primary action
  if (actions.length === 1) {
    return (
      <Zoom in unmountOnExit>
        <Tooltip title={`${primaryAction.label} (${primaryAction.shortcut ? `Alt+${primaryAction.shortcut}` : ''})`} placement="left">
          <Fab
            color="primary"
            aria-label={primaryAction.label}
            onClick={() => navigate(primaryAction.path)}
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              bgcolor: brand.primary[500],
              background: `linear-gradient(135deg, ${brand.primary[500]} 0%, ${brand.primary[600]} 100%)`,
              boxShadow: `0 8px 24px ${brand.primary[500]}40`,
              '&:hover': {
                bgcolor: brand.primary[600],
                boxShadow: `0 12px 32px ${brand.primary[500]}50`,
              },
            }}
          >
            {primaryAction.icon}
          </Fab>
        </Tooltip>
      </Zoom>
    );
  }

  // SpeedDial for multiple actions
  return (
    <SpeedDial
      ariaLabel="Quick actions"
      sx={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        '& .MuiFab-root': {
          bgcolor: brand.primary[500],
          background: `linear-gradient(135deg, ${brand.primary[500]} 0%, ${brand.primary[600]} 100%)`,
          boxShadow: `0 8px 24px ${brand.primary[500]}40`,
          '&:hover': {
            bgcolor: brand.primary[600],
            boxShadow: `0 12px 32px ${brand.primary[500]}50`,
          },
        },
        '& .MuiSpeedDialAction-fab': {
          bgcolor: 'white',
          color: brand.neutral[700],
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          '&:hover': {
            bgcolor: brand.primary[50],
            color: brand.primary[700],
          },
        },
      }}
      icon={<SpeedDialIcon icon={primaryAction.icon} openIcon={<IconPlus size={20} />} />}
      onClose={() => setOpen(false)}
      onOpen={() => setOpen(true)}
      open={open}
      direction="up"
    >
      {actions.slice(1).map((action) => (
        <SpeedDialAction
          key={action.key}
          icon={action.icon}
          tooltipTitle={action.label}
          tooltipOpen
          onClick={() => {
            navigate(action.path);
            setOpen(false);
          }}
        />
      ))}
    </SpeedDial>
  );
}

export default FloatingActions;
