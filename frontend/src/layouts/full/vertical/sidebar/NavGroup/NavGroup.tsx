import { Box, Typography, Collapse } from '@mui/material';
import { IconChevronDown, IconDots } from '@tabler/icons-react';
import { useState } from 'react';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { brand } from 'src/theme/smartpos/brand';

type NavGroup = {
  navlabel?: boolean;
  subheader?: string;
};

interface ItemType {
  item: NavGroup;
  hideMenu: string | boolean;
  defaultCollapsed?: boolean;
  children?: React.ReactNode;
}

const COLLAPSED_KEY = 'smartpos.sidebar.collapsed';

function isCollapsed(label: string): boolean {
  try {
    const stored = localStorage.getItem(COLLAPSED_KEY);
    if (stored) {
      const set = new Set(JSON.parse(stored));
      return set.has(label);
    }
  } catch { /* ignore */ }
  return false;
}

function toggleCollapsed(label: string): boolean {
  try {
    const stored = localStorage.getItem(COLLAPSED_KEY);
    const set: Set<string> = stored ? new Set(JSON.parse(stored)) : new Set();
    const nowCollapsed = !set.has(label);
    if (nowCollapsed) set.add(label);
    else set.delete(label);
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...set]));
    return nowCollapsed;
  } catch {
    return false;
  }
}

const NavGroup = ({ item, hideMenu, children }: ItemType) => {
  const [collapsed, setCollapsed] = useState(() => isCollapsed(item.subheader ?? ''));

  const handleToggle = () => {
    const nowCollapsed = toggleCollapsed(item.subheader ?? '');
    setCollapsed(nowCollapsed);
  };

  // Mini-sidebar — show subtle dot separator (original behavior)
  if (hideMenu) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 1.5, opacity: 0.35 }}>
        <IconDots size={14} color={brand.neutral[500]} />
      </Box>
    );
  }

  // Full sidebar — collapsible section with chevron
  return (
    <Box>
      <Box
        onClick={handleToggle}
        sx={{
          px: 2, pt: 2.5, pb: 0.5,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', userSelect: 'none',
          '&:hover .nav-group-chevron': { opacity: 1 },
        }}
      >
        <Typography
          variant="overline"
          sx={{
            color: brand.neutral[400],
            fontWeight: 700,
            fontSize: '0.6rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            lineHeight: 1,
          }}
        >
          {item?.subheader}
        </Typography>
        <IconChevronDown
          className="nav-group-chevron"
          size={14}
          color={brand.neutral[400]}
          style={{
            opacity: 0.5,
            transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease, opacity 0.2s ease',
          }}
        />
      </Box>
      <Collapse in={!collapsed} timeout="auto" unmountOnExit={false}>
        {children}
      </Collapse>
    </Box>
  );
};

export default NavGroup;
