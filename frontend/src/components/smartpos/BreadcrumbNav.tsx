/**
 * Letis POS — Enterprise Breadcrumb Navigation
 *
 * Wayfinding with hierarchy awareness and context menus.
 * Shows the user's location and provides quick navigation up the hierarchy.
 */
import { useMemo, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router';
import {
  Breadcrumbs, Typography, Box, Chip,
  Menu, MenuItem, ListItemIcon, ListItemText, IconButton
} from '@mui/material';
import {
  IconHome, IconChevronRight, IconDotsVertical,
  IconDashboard, IconPackage, IconUsers, IconShoppingCart,
  IconReceipt, IconBuildingWarehouse, IconChartBar, IconSettings
} from '@tabler/icons-react';
import { brand } from 'src/theme/smartpos/brand';

interface BreadcrumbSegment {
  label: string;
  path: string;
  icon?: React.ReactNode;
  isCurrent?: boolean;
  children?: { label: string; path: string; icon?: React.ReactNode }[];
}

// Route configuration with hierarchy
const ROUTE_MAP: Record<string, { label: string; icon: React.ReactNode; parent?: string; children?: string[] }> = {
  '/smartpos/dashboard': { label: 'Dashboard', icon: <IconDashboard size={14} /> },

  '/smartpos/pos': { label: 'POS Terminal', icon: <IconShoppingCart size={14} /> },
  '/smartpos/sales/pos': { label: 'POS Terminal', icon: <IconShoppingCart size={14} />, parent: '/smartpos/sales' },

  '/smartpos/products': { label: 'Products', icon: <IconPackage size={14} />, parent: '/smartpos/dashboard' },
  '/smartpos/customers': { label: 'Customers', icon: <IconUsers size={14} />, parent: '/smartpos/dashboard' },
  '/smartpos/suppliers': { label: 'Suppliers', icon: <IconUsers size={14} />, parent: '/smartpos/dashboard' },

  '/smartpos/sales': { label: 'Sales', icon: <IconReceipt size={14} />, parent: '/smartpos/dashboard' },
  '/smartpos/sales/new': { label: 'New Sale', icon: <IconReceipt size={14} />, parent: '/smartpos/sales' },
  '/smartpos/quotations': { label: 'Quotations', icon: <IconReceipt size={14} />, parent: '/smartpos/sales' },
  '/smartpos/returns': { label: 'Returns', icon: <IconReceipt size={14} />, parent: '/smartpos/sales' },

  '/smartpos/purchases': { label: 'Purchases', icon: <IconShoppingCart size={14} />, parent: '/smartpos/dashboard' },
  '/smartpos/purchases/new': { label: 'New Purchase', icon: <IconShoppingCart size={14} />, parent: '/smartpos/purchases' },

  '/smartpos/stock': { label: 'Stock Levels', icon: <IconBuildingWarehouse size={14} />, parent: '/smartpos/dashboard' },
  '/smartpos/warehouses': { label: 'Warehouses', icon: <IconBuildingWarehouse size={14} />, parent: '/smartpos/stock' },

  '/smartpos/reports': { label: 'Reports', icon: <IconChartBar size={14} />, parent: '/smartpos/dashboard' },

  '/smartpos/settings': { label: 'Settings', icon: <IconSettings size={14} /> },
};

// Sibling navigation for context menus
const SIBLINGS: Record<string, { label: string; path: string; icon: React.ReactNode }[]> = {
  '/smartpos/dashboard': [
    { label: 'Dashboard', path: '/smartpos/dashboard', icon: <IconDashboard size={14} /> },
    { label: 'POS Terminal', path: '/smartpos/sales/pos', icon: <IconShoppingCart size={14} /> },
  ],
  'catalog': [
    { label: 'Products', path: '/smartpos/products', icon: <IconPackage size={14} /> },
    { label: 'Customers', path: '/smartpos/customers', icon: <IconUsers size={14} /> },
    { label: 'Suppliers', path: '/smartpos/suppliers', icon: <IconUsers size={14} /> },
  ],
  'sales': [
    { label: 'Sales Orders', path: '/smartpos/sales', icon: <IconReceipt size={14} /> },
    { label: 'POS Terminal', path: '/smartpos/sales/pos', icon: <IconShoppingCart size={14} /> },
    { label: 'Quotations', path: '/smartpos/quotations', icon: <IconReceipt size={14} /> },
    { label: 'Returns', path: '/smartpos/returns', icon: <IconReceipt size={14} /> },
  ],
  'inventory': [
    { label: 'Stock Levels', path: '/smartpos/stock', icon: <IconBuildingWarehouse size={14} /> },
    { label: 'Warehouses', path: '/smartpos/warehouses', icon: <IconBuildingWarehouse size={14} /> },
  ],
};

function useBreadcrumbs(): BreadcrumbSegment[] {
  const location = useLocation();

  return useMemo(() => {
    const path = location.pathname;
    const segments: BreadcrumbSegment[] = [];

    // Build path hierarchy
    let currentPath = path;
    while (currentPath) {
      const config = ROUTE_MAP[currentPath];
      if (config) {
        segments.unshift({
          label: config.label,
          path: currentPath,
          icon: config.icon,
        });
        currentPath = config.parent || '';
      } else {
        // Handle dynamic routes like /smartpos/sales/:id/edit
        const parentPath = currentPath.split('/').slice(0, -1).join('/');
        if (parentPath && parentPath !== currentPath) {
          currentPath = parentPath;
        } else {
          break;
        }
      }
    }

    // Mark last as current
    if (segments.length > 0) {
      segments[segments.length - 1].isCurrent = true;
    }

    return segments;
  }, [location.pathname]);
}

function ContextMenu({
  siblings,
  currentPath,
  children
}: {
  siblings?: { label: string; path: string; icon: React.ReactNode }[];
  currentPath: string;
  children: React.ReactNode;
}) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const open = Boolean(anchorEl);

  if (!siblings || siblings.length <= 1) return <>{children}</>;

  return (
    <>
      <Box
        onClick={(e) => setAnchorEl(e.currentTarget as HTMLElement)}
        sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
      >
        {children}
        <IconButton size="small" sx={{ ml: -0.5, color: brand.neutral[400] }}>
          <IconDotsVertical size={14} />
        </IconButton>
      </Box>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        PaperProps={{
          sx: {
            minWidth: 180,
            borderRadius: '10px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
          }
        }}
      >
        {siblings.map((item) => (
          <MenuItem
            key={item.path}
            onClick={() => {
              navigate(item.path);
              setAnchorEl(null);
            }}
            selected={item.path === currentPath}
            sx={{ py: 1, borderRadius: '6px', mx: 0.5, my: 0.25 }}
          >
            <ListItemIcon sx={{ minWidth: 28, color: item.path === currentPath ? brand.primary[600] : brand.neutral[500] }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{
                fontSize: '0.875rem',
                fontWeight: item.path === currentPath ? 600 : 500,
                color: item.path === currentPath ? brand.primary[700] : brand.neutral[700],
              }}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

export function BreadcrumbNav() {
  const segments = useBreadcrumbs();
  const location = useLocation();

  if (segments.length <= 1) return null;

  return (
    <Box sx={{ mb: 2 }}>
      <Breadcrumbs
        separator={<IconChevronRight size={14} color={brand.neutral[400]} />}
        aria-label="breadcrumb"
      >
        {/* Home icon for dashboard */}
        <Link
          to="/smartpos/dashboard"
          style={{ textDecoration: 'none' }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              color: location.pathname === '/smartpos/dashboard' ? brand.primary[600] : brand.neutral[500],
              '&:hover': { color: brand.primary[600] },
            }}
          >
            <IconHome size={14} />
          </Box>
        </Link>

        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;

          // Determine siblings based on segment type
          let siblings: { label: string; path: string; icon: React.ReactNode }[] | undefined;
          if (segment.path.includes('/products') || segment.path.includes('/customers')) {
            siblings = SIBLINGS['catalog'];
          } else if (segment.path.includes('/sales') || segment.path.includes('/quotations') || segment.path.includes('/returns')) {
            siblings = SIBLINGS['sales'];
          } else if (segment.path.includes('/stock') || segment.path.includes('/warehouses')) {
            siblings = SIBLINGS['inventory'];
          }

          if (isLast) {
            return (
              <ContextMenu key={segment.path} siblings={siblings} currentPath={segment.path}>
                <Chip
                  icon={<span style={{ display: 'flex', alignItems: 'center' }}>{segment.icon}</span>}
                  label={segment.label}
                  size="small"
                  sx={{
                    height: 26,
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    bgcolor: brand.primary[50],
                    color: brand.primary[700],
                    borderRadius: '6px',
                    '& .MuiChip-icon': { color: brand.primary[500], ml: 0.5 },
                  }}
                />
              </ContextMenu>
            );
          }

          return (
            <ContextMenu key={segment.path} siblings={siblings} currentPath={segment.path}>
              <Link
                to={segment.path}
                style={{ textDecoration: 'none' }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: brand.neutral[500],
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    '&:hover': { color: brand.primary[600] },
                  }}
                >
                  {segment.icon}
                  {segment.label}
                </Typography>
              </Link>
            </ContextMenu>
          );
        })}
      </Breadcrumbs>
    </Box>
  );
}

export default BreadcrumbNav;
