// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useContext, useMemo } from 'react';
import DemoMenuitems from './MenuItems';
import { useLocation } from 'react-router';
import { Box, List, useMediaQuery } from '@mui/material';
import NavItem from './NavItem';
import NavCollapse from './NavCollapse';
import NavGroup from './NavGroup/NavGroup';
import {
  IconBuildingStore, IconShoppingCart, IconRocket, IconSettings,
  IconPackage, IconCategory, IconPalette, IconTruck,
} from '@tabler/icons-react';

import { CustomizerContext, MobileSidebarContext } from 'src/context/CustomizerContext';
import { useAuth } from 'src/context/smartpos/AuthContext';
import type { MenuNode } from 'src/api/smartpos/features';
import { mapIcon } from './IconMap';

// Hardcoded commerce admin links shown in SmartPOS sidebar when no commerce
// menu items exist in the API-driven menu. These ensure the admin can always
// find storefront setup pages.
const COMMERCE_FALLBACK_SECTION = {
  id: 'commerce-fallback',
  title: 'Commerce',
  children: [
    { id: 'commerce-dashboard', title: 'Dashboard', icon: IconBuildingStore, href: '/smartpos/admin/commerce' },
    { id: 'commerce-go-live', title: 'Go-Live Checklist', icon: IconRocket, href: '/smartpos/admin/commerce/go-live' },
    { id: 'commerce-products', title: 'Products', icon: IconPackage, href: '/smartpos/admin/commerce/products' },
    { id: 'commerce-categories', title: 'Categories', icon: IconCategory, href: '/smartpos/admin/commerce/categories' },
    { id: 'commerce-theme', title: 'Theme', icon: IconPalette, href: '/smartpos/admin/commerce/theme' },
    { id: 'commerce-shipping', title: 'Shipping', icon: IconTruck, href: '/smartpos/admin/commerce/shipping' },
    { id: 'commerce-orders', title: 'Orders', icon: IconShoppingCart, href: '/smartpos/admin/commerce/orders' },
    { id: 'commerce-settings', title: 'Settings', icon: IconSettings, href: '/smartpos/admin/commerce/settings' },
  ],
};

/**
 * Recursively transform a MenuNode (from the API) into the shape that
 * NavItem and NavCollapse expect.
 */
function transformNode(node: MenuNode): Record<string, unknown> {
  const children: Record<string, unknown>[] = node.children.map((c) => transformNode(c));
  // Ensure routes are absolute under /smartpos so NavLink resolves correctly
  const href = node.route
    ? node.route.startsWith('/') ? node.route : `/smartpos/${node.route}`
    : undefined;
  return {
    id: node.id,
    title: node.label,
    icon: mapIcon(node.icon),
    href,
    children: children.length > 0 ? children : undefined,
  };
}

/**
 * Role hierarchy for client-side menu safety-net filtering.
 * Higher = more privileged. Mirrors the backend ROLE_LEVEL map.
 */
const ROLE_LEVEL: Record<string, number> = {
  SUPER_ADMIN: 5,
  TENANT_ADMIN: 4,
  OWNER: 3,
  MANAGER: 2,
  CASHIER: 1,
};

/** Route prefixes for platform-only items that require SUPER_ADMIN (level 5). */
const PLATFORM_ROUTE_PREFIXES = [
  '/smartpos/admin/tenants', '/smartpos/admin/platform-settings',
  '/smartpos/admin/features', '/smartpos/admin/sessions',
  '/smartpos/admin/api-keys', '/smartpos/admin/audit-logs',
  '/smartpos/admin/error-logs', '/smartpos/admin/data-retention',
  '/smartpos/admin/backups', '/smartpos/admin/troubleshooting',
];

/** Route prefixes that require at least TENANT_ADMIN (level 4). */
const ADMIN_ROUTE_PREFIXES = ['/smartpos/admin', '/smartpos/integrations', '/smartpos/settings'];

/** Route prefixes that require at least MANAGER (level 2). */
const MANAGER_ROUTE_PREFIXES = [
  '/smartpos/hrm', '/smartpos/accounting', '/smartpos/ai',
  '/smartpos/crm', '/smartpos/marketing',
  '/smartpos/reports/financial', '/smartpos/reports/employees',
  '/smartpos/reports/profit-loss',
];

/**
 * Compute the highest role level for the current user.
 * Defaults to CASHIER level (1) if no recognized role is found.
 */
function computeMaxRoleLevel(roles: string[]): number {
  if (!roles || roles.length === 0) return 1;
  let max = 1;
  for (const r of roles) {
    max = Math.max(max, ROLE_LEVEL[r] ?? 1);
  }
  return max;
}

/**
 * Client-side safety net: filter API menu nodes whose route implies a higher
 * role than the user has. This is defense-in-depth — the primary filtering
 * happens on the backend.
 *
 * Platform routes (level 5) are checked FIRST, before the broader admin
 * prefix (level 4), so a TENANT_ADMIN sees tenant settings but not Platform
 * Settings, Tenants list, Features manager, etc.
 */
function filterMenuNodesByRole(
  nodes: MenuNode[],
  maxRoleLevel: number,
): MenuNode[] {
  if (maxRoleLevel >= 5) return nodes; // SUPER_ADMIN sees everything
  return nodes
    .map((node) => {
      const route = node.route ?? '';
      // Platform routes → require SUPER_ADMIN (level 5)
      if (PLATFORM_ROUTE_PREFIXES.some((p) => route.startsWith(p))) {
        return null;
      }
      // Tenant admin prefixes → require level 4
      if (maxRoleLevel < 4 && ADMIN_ROUTE_PREFIXES.some((p) => route.startsWith(p))) {
        return null;
      }
      // Manager prefixes → require level 2
      if (maxRoleLevel < 2 && MANAGER_ROUTE_PREFIXES.some((p) => route.startsWith(p))) {
        return null;
      }
      // Recurse into children
      if (node.children.length > 0) {
        const filteredChildren = filterMenuNodesByRole(node.children, maxRoleLevel);
        // Hide section headers whose children all got filtered out
        if (node.sectionHeader && filteredChildren.length === 0) {
          return null;
        }
        return { ...node, children: filteredChildren };
      }
      return node;
    })
    .filter((n): n is MenuNode => n !== null);
}

const SidebarItems = () => {
  const { pathname } = useLocation();
  const pathDirect = pathname;
  const pathWithoutLastPart = pathname.slice(0, pathname.lastIndexOf('/'));
  const { isCollapse } = useContext(CustomizerContext);
  const { isMobileSidebar, setIsMobileSidebar } = useContext(MobileSidebarContext);
  const { user } = useAuth();

  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
  const hideMenu: any = lgUp ? isCollapse == "mini-sidebar" : '';

  const isSmartPos = pathname.startsWith('/smartpos');
  const apiMenu: MenuNode[] = (user as any)?.menu ?? [];

  // Client-side safety net: apply role-based filtering to the API menu.
  const roles: string[] = (user as any)?.roles ?? [];
  const maxRoleLevel = useMemo(() => computeMaxRoleLevel(roles), [roles]);
  const filteredApiMenu = useMemo(
    () => filterMenuNodesByRole(apiMenu, maxRoleLevel),
    [apiMenu, maxRoleLevel],
  );

  // For smartpos paths, render from the API menu. Otherwise keep the demo menu.
  const Menuitems = useMemo(() => {
    if (isSmartPos && filteredApiMenu.length > 0) {
      return { source: 'api' as const, nodes: filteredApiMenu };
    }
    return { source: 'demo' as const, nodes: null };
  }, [isSmartPos, filteredApiMenu]);

  // Check if commerce links already exist in the API menu
  const hasCommerceInMenu = useMemo(() => {
    if (!isSmartPos || filteredApiMenu.length === 0) return false;
    const flat = new Set<string>();
    const walk = (nodes: MenuNode[]) => {
      for (const n of nodes) {
        flat.add(n.route || '');
        for (const kw of ['commerce', 'storefront', 'go-live']) {
          if ((n.label || '').toLowerCase().includes(kw) || (n.route || '').includes(kw)) return true;
          if (n.key === kw) return true;
        }
        if (n.children.length > 0 && walk(n.children)) return true;
      }
      return false;
    };
    return walk(filteredApiMenu);
  }, [isSmartPos, filteredApiMenu]);

  const closeMobileSidebar = () => setIsMobileSidebar(!isMobileSidebar);

  const renderApiMenu = (items: MenuNode[]): React.ReactNode => {
    return items.map((item) => {
      if (item.sectionHeader) {
        // Section headers render as NavGroup; their children follow as siblings.
        return (
          <React.Fragment key={item.id}>
            <NavGroup item={{ subheader: item.label }} hideMenu={hideMenu} />
            {item.children.map((child) => renderApiMenuItem(child))}
          </React.Fragment>
        );
      }
      return renderApiMenuItem(item);
    });
  };

  const renderApiMenuItem = (item: MenuNode): React.ReactNode => {
    const transformed = transformNode(item);

    if (item.children.length > 0) {
      return (
        <NavCollapse
          key={item.id}
          menu={transformed}
          level={1}
          pathWithoutLastPart={pathWithoutLastPart}
          pathDirect={pathDirect}
          hideMenu={hideMenu}
          onClick={closeMobileSidebar}
        />
      );
    }

    return (
      <NavItem
        key={item.id}
        item={transformed}
        level={1}
        pathDirect={pathDirect}
        hideMenu={hideMenu}
        onClick={closeMobileSidebar}
      />
    );
  };

  const renderCommerceFallback = () => {
    const section = COMMERCE_FALLBACK_SECTION;
    const collapseItem = {
      id: section.id,
      title: section.title,
      icon: IconBuildingStore,
      children: section.children.map(c => ({
        id: c.id,
        title: c.title,
        icon: c.icon,
        href: c.href,
      })),
    };
    return (
      <React.Fragment key="commerce-fallback">
        <NavGroup item={{ subheader: section.title }} hideMenu={hideMenu} />
        <NavCollapse
          menu={collapseItem}
          pathDirect={pathDirect}
          hideMenu={hideMenu}
          pathWithoutLastPart={pathWithoutLastPart}
          level={1}
          key={section.id}
          onClick={closeMobileSidebar}
        />
      </React.Fragment>
    );
  };

  return (
    <Box sx={{ px: 1, pt: 1, pb: 2 }}>
      <List sx={{ pt: 0 }} className="sidebarNav">
        {Menuitems.source === 'api'
          ? renderApiMenu(Menuitems.nodes!)
          : (DemoMenuitems as any[]).map((item: any) => {
              if (item.subheader) {
                return <NavGroup item={item} hideMenu={hideMenu} key={item.subheader} />;
              } else if (item.children) {
                return (
                  <NavCollapse
                    menu={item}
                    pathDirect={pathDirect}
                    hideMenu={hideMenu}
                    pathWithoutLastPart={pathWithoutLastPart}
                    level={1}
                    key={item.id}
                    onClick={closeMobileSidebar}
                  />
                );
              } else {
                return (
                  <NavItem item={item} key={item.id} pathDirect={pathDirect} hideMenu={hideMenu}
                    onClick={closeMobileSidebar} />
                );
              }
            })}

        {/* Commerce fallback — always shown in SmartPOS mode when not in API menu */}
        {isSmartPos && !hasCommerceInMenu && renderCommerceFallback()}
      </List>
    </Box>
  );
};

export default SidebarItems;
