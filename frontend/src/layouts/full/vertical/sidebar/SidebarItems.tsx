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

  // For smartpos paths, render from the API menu. Otherwise keep the demo menu.
  const Menuitems = useMemo(() => {
    if (isSmartPos && apiMenu.length > 0) {
      return { source: 'api' as const, nodes: apiMenu };
    }
    return { source: 'demo' as const, nodes: null };
  }, [isSmartPos, apiMenu]);

  // Check if commerce links already exist in the API menu
  const hasCommerceInMenu = useMemo(() => {
    if (!isSmartPos || apiMenu.length === 0) return false;
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
    return walk(apiMenu);
  }, [isSmartPos, apiMenu]);

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
