// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useContext, useMemo } from 'react';
import DemoMenuitems from './MenuItems';
import { buildSmartPosMenu, type MenuItem } from './SmartPosMenuItems';
import { useLocation } from 'react-router';
import { Box, List, useMediaQuery } from '@mui/material';
import { useTranslation } from 'react-i18next';
import NavItem from './NavItem';
import NavCollapse from './NavCollapse';
import NavGroup from './NavGroup/NavGroup';

import { CustomizerContext } from 'src/context/CustomizerContext';
import { useAuth } from 'src/context/smartpos/AuthContext';
import { PLAN_LEVEL } from 'src/context/smartpos/AuthContext';

function filterByPlan(items: MenuItem[], billingPlan: string): MenuItem[] {
  const planLevel = PLAN_LEVEL[billingPlan] ?? 0;
  const visible: MenuItem[] = [];
  for (const item of items) {
    if (item.minPlan) {
      const required = PLAN_LEVEL[item.minPlan] ?? 0;
      if (planLevel < required) continue;
    }
    // Filter children recursively
    if (item.children) {
      const filteredChildren = filterByPlan(item.children, billingPlan);
      if (filteredChildren.length === 0) continue;
      visible.push({ ...item, children: filteredChildren });
    } else {
      visible.push(item);
    }
  }
  // Remove orphan subheaders
  const result: MenuItem[] = [];
  for (let i = 0; i < visible.length; i++) {
    const item = visible[i];
    if (item.subheader) {
      // Check if the next item exists and is not a subheader
      const next = visible[i + 1];
      if (!next || next.subheader) {
        continue; // skip orphan subheader
      }
    }
    result.push(item);
  }
  return result;
}

const SidebarItems = () => {
  const { pathname } = useLocation();
  const pathDirect = pathname;
  const pathWithoutLastPart = pathname.slice(0, pathname.lastIndexOf('/'));
  const { isCollapse, isMobileSidebar, setIsMobileSidebar } = useContext(CustomizerContext);
  const { t } = useTranslation('smartpos');
  const { tenants } = useAuth();

  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
  const hideMenu: any = lgUp ? isCollapse == "mini-sidebar" : '';

  const billingPlan = tenants[0]?.billingPlan ?? 'FREE';

  // Use SmartPOS menu inside /smartpos/*, Modernize demo menu everywhere else.
  // SmartPOS menu is rebuilt on each render so it picks up locale changes.
  const isSmartPos = pathname.startsWith('/smartpos');
  const rawItems = isSmartPos
    ? buildSmartPosMenu(t as any)
    : DemoMenuitems;

  const Menuitems = useMemo(() => {
    if (isSmartPos) {
      return filterByPlan(rawItems as MenuItem[], billingPlan);
    }
    return rawItems;
  }, [rawItems, billingPlan, isSmartPos]);

  return (
    <Box sx={{ px: 1, pt: 1, pb: 2 }}>
      <List sx={{ pt: 0 }} className="sidebarNav">
        {Menuitems.map((item) => {
          // {/********SubHeader**********/}
          if (item.subheader) {
            return <NavGroup item={item} hideMenu={hideMenu} key={item.subheader} />;

            // {/********If Sub Menu**********/}
            /* eslint no-else-return: "off" */
          } else if (item.children) {
            return (
              <NavCollapse
                menu={item}
                pathDirect={pathDirect}
                hideMenu={hideMenu}
                pathWithoutLastPart={pathWithoutLastPart}
                level={1}
                key={item.id}
                onClick={() => setIsMobileSidebar(!isMobileSidebar)}

              />
            );

            // {/********If Sub No Menu**********/}
          } else {
            return (
              <NavItem item={item} key={item.id} pathDirect={pathDirect} hideMenu={hideMenu}
                onClick={() => setIsMobileSidebar(!isMobileSidebar)} />
            );
          }
        })}
      </List>
    </Box>
  );
};
export default SidebarItems;
