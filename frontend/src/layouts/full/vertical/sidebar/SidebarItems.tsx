// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useContext, useMemo } from 'react';
import DemoMenuitems from './MenuItems';
import { useLocation } from 'react-router';
import { Box, List, useMediaQuery } from '@mui/material';
import NavItem from './NavItem';
import NavCollapse from './NavCollapse';
import NavGroup from './NavGroup/NavGroup';

import { CustomizerContext, MobileSidebarContext } from 'src/context/CustomizerContext';
import { useAuth } from 'src/context/smartpos/AuthContext';
import type { MenuNode } from 'src/api/smartpos/features';
import { mapIcon } from './IconMap';

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
      </List>
    </Box>
  );
};

export default SidebarItems;
