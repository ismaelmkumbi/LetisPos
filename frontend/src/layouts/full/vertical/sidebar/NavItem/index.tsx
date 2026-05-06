// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useContext, useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router';
import { Box, Chip, ListItemButton, ListItemIcon, ListItemText, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { CustomizerContext } from 'src/context/CustomizerContext';
import { brand } from 'src/theme/smartpos/brand';
import NavFlyout from '../NavFlyout/NavFlyout';

type NavGroup = {
  [x: string]: any;
  id?: string;
  navlabel?: boolean;
  subheader?: string;
  title?: string;
  icon?: any;
  href?: string;
  children?: NavGroup[];
  chip?: string;
  chipColor?: any;
  variant?: string | any;
  external?: boolean;
  level?: number;
  onClick?: React.MouseEvent<HTMLButtonElement, MouseEvent>;
};

interface ItemType {
  item: NavGroup;
  hideMenu?: any;
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
  level?: number | any;
  pathDirect: string;
}

const NavItem = ({ item, level, pathDirect, hideMenu, onClick }: ItemType) => {
  const { activeMode } = useContext(CustomizerContext);
  const isDark = activeMode === 'dark';
  const isActive = pathDirect === item?.href;

  const Icon = item?.icon;
  const { t } = useTranslation();

  // Flyout state for collapsed sidebar
  const [flyoutAnchor, setFlyoutAnchor] = useState<HTMLElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    if (!hideMenu) return;
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setFlyoutAnchor(e.currentTarget);
  };

  const handleMouseLeave = () => {
    if (!hideMenu) return;
    closeTimerRef.current = setTimeout(() => setFlyoutAnchor(null), 260);
  };

  const keepFlyoutOpen = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  };

  const closeFlyoutSoon = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => setFlyoutAnchor(null), 260);
  };

  const iconSize = level > 1 ? 16 : 18;
  const itemIcon = <Icon stroke={isActive ? 2 : 1.5} size={iconSize} />;

  const listItemProps: {
    component: any;
    href?: string;
    target?: any;
    to?: any;
  } = {
    component: item?.external ? 'a' : NavLink,
    to: item?.href,
    href: item?.external ? item?.href : '',
    target: item?.external ? '_blank' : '',
  };

  const button = (
    <ListItemButton
      {...listItemProps}
      disabled={item?.disabled}
      selected={isActive}
      onClick={onClick}
      sx={{
        position: 'relative',
        mx: 1.5,
        mb: 0.25,
        borderRadius: '10px',
        padding: hideMenu ? '10px 0' : '8px 10px',
        justifyContent: hideMenu ? 'center' : 'flex-start',
        minHeight: 44,
        color: isActive
          ? isDark ? brand.primary[300] : brand.primary[700]
          : isDark ? brand.neutral[400] : brand.neutral[600],
        backgroundColor: isActive
          ? isDark ? `rgba(42, 143, 132,0.15)` : brand.primary[50]
          : 'transparent',
        transition: 'all 0.15s ease',

        // Active: left accent bar
        '&::before': isActive ? {
          content: '""',
          position: 'absolute',
          left: -6,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 3,
          height: '60%',
          borderRadius: '0 3px 3px 0',
          backgroundColor: brand.primary[600],
        } : {},

        '&:hover': {
          backgroundColor: isDark ? 'rgba(42, 143, 132,0.10)' : brand.primary[50],
          color: isDark ? brand.primary[300] : brand.primary[700],
        },
        '&.Mui-selected': {
          backgroundColor: isDark ? 'rgba(42, 143, 132,0.15)' : brand.primary[50],
          '&:hover': {
            backgroundColor: isDark ? 'rgba(42, 143, 132,0.20)' : brand.primary[100],
          },
        },
        // Nested items
        ...(level > 1 && {
          mx: 1,
          pl: hideMenu ? 0 : `${(level - 1) * 12 + 10}px`,
          borderRadius: '8px',
          minHeight: 44,
          padding: hideMenu ? '8px 0' : '6px 10px',
          color: isActive
            ? isDark ? brand.primary[300] : brand.primary[700]
            : isDark ? brand.neutral[500] : brand.neutral[500],
          fontSize: '0.8125rem',
        }),
      }}
    >
      {/* Icon */}
      <ListItemIcon
        sx={{
          minWidth: hideMenu ? 0 : 34,
          color: 'inherit',
          justifyContent: 'center',
          mr: hideMenu ? 0 : 0.5,
        }}
      >
        {itemIcon}
      </ListItemIcon>

      {/* Label */}
      {!hideMenu && (
        <ListItemText
          primary={
            <Typography
              variant="body2"
              sx={{
                fontWeight: isActive ? 600 : 500,
                fontSize: level > 1 ? '0.8125rem' : '0.875rem',
                color: 'inherit',
                lineHeight: 1.3,
              }}
            >
              {t(`${item?.title}`)}
            </Typography>
          }
          secondary={
            item?.subtitle ? (
              <Typography variant="caption" sx={{ color: brand.neutral[500], lineHeight: 1.2 }}>
                {item.subtitle}
              </Typography>
            ) : null
          }
          sx={{ m: 0 }}
        />
      )}

      {/* Chip badge */}
      {!hideMenu && item?.chip && (
        <Chip
          color={item?.chipColor ?? 'primary'}
          variant="filled"
          size="small"
          label={item.chip}
          sx={{
            height: 18,
            fontSize: '0.6rem',
            fontWeight: 800,
            letterSpacing: '0.05em',
            borderRadius: '6px',
            ml: 0.5,
          }}
        />
      )}
    </ListItemButton>
  );

  // Collapsed sidebar: hover flyout (no tooltip — flyout provides the label)
  if (hideMenu) {
    return (
      <Box
        component="li"
        sx={{ listStyle: 'none' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {button}
        {flyoutAnchor && (
          <NavFlyout
            anchorEl={flyoutAnchor}
            open={Boolean(flyoutAnchor)}
            onClose={() => setFlyoutAnchor(null)}
            onMouseEnter={keepFlyoutOpen}
            onMouseLeave={closeFlyoutSoon}
            title={t(`${item?.title}`)}
            titleIcon={item?.icon}
          >
            <Box sx={{ px: 1, py: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" fontWeight={500}>
                {t(`${item?.title}`)}
              </Typography>
              {item?.chip && (
                <Chip
                  color={item?.chipColor ?? 'primary'}
                  variant="filled"
                  size="small"
                  label={item.chip}
                  sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800, borderRadius: '6px' }}
                />
              )}
            </Box>
          </NavFlyout>
        )}
      </Box>
    );
  }

  return <Box component="li" sx={{ listStyle: 'none' }}>{button}</Box>;
};

export default NavItem;
