// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useContext, useState, useRef, useEffect } from 'react';

import { useLocation, NavLink } from 'react-router';

// mui imports
import {
  ListItemIcon,
  ListItemButton,
  Collapse,
  styled,
  ListItemText,
  List,
  useTheme,
  Chip,
  Typography,
} from '@mui/material';

// custom imports
import NavItem from '../NavItem';
import NavFlyout from '../NavFlyout/NavFlyout';

// plugins
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { CustomizerContext } from 'src/context/CustomizerContext';

type NavGroupProps = {
  [x: string]: any;
  navlabel?: boolean;
  subheader?: string;
  title?: string;
  icon?: any;
  href?: any;
};

interface NavCollapseProps {
  menu: NavGroupProps;
  level: number;
  pathWithoutLastPart: any;
  pathDirect: any;
  hideMenu: any;
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
}

// FC Component For Dropdown Menu
const NavCollapse = ({
  menu,
  level,
  pathWithoutLastPart,
  pathDirect,
  hideMenu,
  onClick
}: NavCollapseProps) => {
  const { isBorderRadius } = useContext(CustomizerContext);

  const Icon = menu?.icon;
  const theme = useTheme();
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);

  // Flyout state for collapsed sidebar
  const [flyoutAnchor, setFlyoutAnchor] = useState<HTMLElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const menuIcon =
    level > 1 ? <Icon stroke={1.5} size="1rem" /> : <Icon stroke={1.5} size="1.3rem" />;

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (hideMenu) {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      setFlyoutAnchor((current) => current ? null : event.currentTarget);
      return;
    }
    setOpen(!open);
  };

  // Flyout mouse handlers
  const handleFlyoutEnter = (e: React.MouseEvent<HTMLElement>) => {
    if (!hideMenu) return;
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setFlyoutAnchor(e.currentTarget);
  };

  const handleFlyoutLeave = () => {
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

  const handleFlyoutItemClick = (event: React.MouseEvent<HTMLElement>) => {
    setFlyoutAnchor(null);
    onClick(event);
  };

  // menu collapse for sub-levels
  React.useEffect(() => {
    setOpen(false);
    menu?.children?.forEach((item: any) => {
      if (item?.href === pathname) {
        setOpen(true);
      }
    });
  }, [pathname, menu.children]);

  const ListItemStyled = styled(ListItemButton)(() => ({
    marginBottom: '2px',
    padding: '8px 10px',
    paddingLeft: hideMenu ? '10px' : level > 2 ? `${level * 15}px` : '10px',
    backgroundColor: open && level < 2 ? theme.palette.primary.main : '',
    whiteSpace: 'nowrap',
    minHeight: 44,
    contentVisibility: 'auto',
    containIntrinsicSize: 'auto 48px',
    justifyContent: hideMenu ? 'center' : 'flex-start',
    '&:hover': {
      backgroundColor: pathname.includes(menu.href) || open
        ? theme.palette.primary.main
        : theme.palette.primary.light,
      color: pathname.includes(menu.href) || open ? 'white' : theme.palette.primary.main,
    },
    color:
      open && level < 2
        ? 'white'
        : level > 1 && open
          ? theme.palette.primary.main
          : theme.palette.text.secondary,
    borderRadius: `${isBorderRadius}px`,
  }));

  // If Menu has Children
  const submenus = menu.children?.map((item: any) => {
    if (item.children) {
      return (
        <NavCollapse
          key={item?.id}
          menu={item}
          level={level + 1}
          pathWithoutLastPart={pathWithoutLastPart}
          pathDirect={pathDirect}
          hideMenu={hideMenu}
          onClick={onClick}
        />
      );
    } else {
      return (
        <NavItem
          key={item.id}
          item={item}
          level={level + 1}
          pathDirect={pathDirect}
          hideMenu={hideMenu}
          onClick={onClick}
        />
      );
    }
  });

  // Build flat flyout children (no nested flyouts)
  const renderFlyoutChildren = (children: any[] | undefined) => {
    if (!children) return null;
    return children.map((child: any) => {
      if (child.children) {
        // Flatten grandchildren with a subheader label
        return (
          <React.Fragment key={child.id}>
            <Typography
              variant="overline"
              sx={{
                display: 'block',
                px: 1.5,
                pt: 1,
                pb: 0.25,
                fontSize: '0.6rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: theme.palette.text.disabled,
              }}
            >
              {t(`${child.title}`)}
            </Typography>
            {child.children.map((grandchild: any) => (
              <ListItemButton
                key={grandchild.id}
                component={NavLink}
                to={grandchild.href}
                selected={pathDirect === grandchild.href}
                onClick={handleFlyoutItemClick}
                sx={{ borderRadius: '8px', mb: 0.25, minHeight: 44 }}
              >
                {grandchild.icon && (
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <grandchild.icon stroke={1.5} size={16} />
                  </ListItemIcon>
                )}
                <ListItemText
                  primary={t(`${grandchild.title}`)}
                  primaryTypographyProps={{ variant: 'body2', fontSize: '0.8125rem' }}
                />
                {grandchild.chip && (
                  <Chip
                    color={grandchild.chipColor ?? 'primary'}
                    variant="filled"
                    size="small"
                    label={grandchild.chip}
                    sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800, borderRadius: '6px', ml: 0.5 }}
                  />
                )}
              </ListItemButton>
            ))}
          </React.Fragment>
        );
      }

      return (
        <ListItemButton
          key={child.id}
          component={NavLink}
          to={child.href}
          selected={pathDirect === child.href}
          onClick={handleFlyoutItemClick}
          sx={{ borderRadius: '8px', mb: 0.25, minHeight: 44 }}
        >
          {child.icon && (
            <ListItemIcon sx={{ minWidth: 32 }}>
              <child.icon stroke={1.5} size={16} />
            </ListItemIcon>
          )}
          <ListItemText
            primary={t(`${child.title}`)}
            primaryTypographyProps={{ variant: 'body2', fontSize: '0.8125rem' }}
          />
          {child.chip && (
            <Chip
              color={child.chipColor ?? 'primary'}
              variant="filled"
              size="small"
              label={child.chip}
              sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800, borderRadius: '6px', ml: 0.5 }}
            />
          )}
        </ListItemButton>
      );
    });
  };

  return (
    <>
      <ListItemStyled
        onClick={handleClick}
        onMouseEnter={handleFlyoutEnter}
        onMouseLeave={handleFlyoutLeave}
        selected={pathWithoutLastPart === menu.href}
        key={menu?.id}
      >
        <ListItemIcon
          sx={{
            minWidth: hideMenu ? 0 : '36px',
            p: '3px 0',
            color: 'inherit',
            justifyContent: hideMenu ? 'center' : undefined,
          }}
        >
          {menuIcon}
        </ListItemIcon>
        {!hideMenu && (
          <ListItemText color="inherit">{t(`${menu.title}`)}</ListItemText>
        )}
        {!hideMenu && (
          !open ? <IconChevronDown size="1rem" /> : <IconChevronUp size="1rem" />
        )}
      </ListItemStyled>

      {/* Full sidebar: click-based Collapse */}
      {!hideMenu && (
        <Collapse in={open} timeout="auto" unmountOnExit>
          {submenus}
        </Collapse>
      )}

      {/* Collapsed sidebar: hover flyout */}
      {hideMenu && flyoutAnchor && (
        <NavFlyout
          anchorEl={flyoutAnchor}
          open={Boolean(flyoutAnchor)}
          onClose={() => setFlyoutAnchor(null)}
          onMouseEnter={keepFlyoutOpen}
          onMouseLeave={closeFlyoutSoon}
          title={t(`${menu.title}`)}
          titleIcon={menu.icon}
        >
          <List dense disablePadding>
            {renderFlyoutChildren(menu.children)}
          </List>
        </NavFlyout>
      )}
    </>
  );
};

export default NavCollapse;
