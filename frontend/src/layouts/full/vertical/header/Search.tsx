import { useMemo, useState } from 'react';
import {
  Box,
  Chip,
  Dialog,
  DialogContent,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { IconArrowRight, IconSearch, IconX } from '@tabler/icons-react';
import { Link, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';

import DemoMenuitems from '../sidebar/MenuItems';
import { buildSmartPosMenu } from '../sidebar/SmartPosMenuItems';
import { brand } from 'src/theme/smartpos/brand';

interface MenuNode {
  id?: string;
  title?: string;
  subheader?: string;
  icon?: any;
  href?: string;
  children?: MenuNode[];
  chip?: string;
  chipColor?: any;
}

interface SearchRoute {
  id: string;
  title: string;
  href: string;
  group: string;
  icon?: any;
  chip?: string;
  chipColor?: any;
  haystack: string;
}

function flattenMenu(items: MenuNode[], group = 'Navigation'): SearchRoute[] {
  let activeGroup = group;
  const routes: SearchRoute[] = [];

  items.forEach((item) => {
    if (item.subheader) {
      activeGroup = item.subheader;
      return;
    }

    if (item.title && item.href) {
      routes.push({
        id: item.id || item.href,
        title: item.title,
        href: item.href,
        group: activeGroup,
        icon: item.icon,
        chip: item.chip,
        chipColor: item.chipColor,
        haystack: `${item.title} ${item.href} ${activeGroup}`.toLowerCase(),
      });
    }

    if (item.children) {
      routes.push(...flattenMenu(item.children, item.title || activeGroup));
    }
  });

  return routes;
}

const Search = () => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { pathname } = useLocation();
  const { t } = useTranslation('smartpos');
  const onSmartPos = pathname.startsWith('/smartpos');

  const routes = useMemo(() => {
    const menu = onSmartPos ? buildSmartPosMenu(t as any) : DemoMenuitems;
    return flattenMenu(menu as MenuNode[]);
  }, [onSmartPos, t]);

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matched = q
      ? routes.filter((route) => route.haystack.includes(q))
      : onSmartPos
        ? routes.filter((route) => [
            '/smartpos/dashboard',
            '/smartpos/sales/pos',
            '/smartpos/products',
            '/smartpos/sales',
            '/smartpos/customers',
            '/smartpos/reports',
            '/smartpos/settings',
          ].includes(route.href))
        : routes;

    return matched.slice(0, 12);
  }, [onSmartPos, routes, search]);

  const grouped = useMemo(() => {
    const groups = new Map<string, SearchRoute[]>();
    results.forEach((route) => {
      const key = route.group || 'Navigation';
      groups.set(key, [...(groups.get(key) || []), route]);
    });
    return Array.from(groups.entries());
  }, [results]);

  const close = () => {
    setOpen(false);
    setSearch('');
  };

  return (
    <>
      <IconButton
        aria-label="Search navigation"
        color="inherit"
        aria-controls={open ? 'navigation-search' : undefined}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        size="large"
      >
        <IconSearch size="17" />
      </IconButton>

      <Dialog
        id="navigation-search"
        open={open}
        onClose={close}
        fullWidth
        maxWidth="sm"
        slotProps={{
          paper: {
            sx: {
              position: 'fixed',
              top: { xs: 14, sm: 34 },
              m: 0,
              borderRadius: '18px',
              overflow: 'hidden',
              boxShadow: '0 28px 80px rgba(15,23,42,0.22)',
            },
          },
        }}
      >
        <DialogContent sx={{ p: 0 }}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ p: 2 }}>
            <TextField
              id="navigation-search-input"
              placeholder={onSmartPos ? 'Find a page, report, setting...' : 'Search pages...'}
              fullWidth
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              slotProps={{
                htmlInput: { 'aria-label': 'Search navigation' },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <IconSearch size={19} color={brand.neutral[400]} />
                  </InputAdornment>
                ),
                sx: {
                  borderRadius: 3,
                  bgcolor: brand.neutral[50],
                  '& fieldset': { borderColor: brand.neutral[200] },
                },
              }}
            />
            <IconButton size="small" onClick={close} aria-label="Close search">
              <IconX size="18" />
            </IconButton>
          </Stack>

          <Divider />

          <Box sx={{ maxHeight: '58vh', overflow: 'auto', p: 1.25 }}>
            {results.length === 0 ? (
              <Box sx={{ px: 3, py: 4, textAlign: 'center' }}>
                <Typography sx={{ fontWeight: 700, color: brand.neutral[800] }}>
                  No matching pages
                </Typography>
                <Typography sx={{ mt: 0.5, fontSize: 13.5, color: brand.neutral[500] }}>
                  Try a module name like products, sales, stock, reports, or settings.
                </Typography>
              </Box>
            ) : (
              <List component="nav" disablePadding>
                {grouped.map(([group, items], groupIndex) => (
                  <Box key={group}>
                    {groupIndex > 0 && <Divider sx={{ my: 1 }} />}
                    <Typography
                      sx={{
                        px: 1.25,
                        py: 0.75,
                        fontSize: 11,
                        fontWeight: 800,
                        color: brand.neutral[400],
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {group}
                    </Typography>
                    {items.map((route) => {
                      const Icon = route.icon;
                      return (
                        <ListItemButton
                          key={route.id}
                          to={route.href}
                          component={Link}
                          onClick={close}
                          sx={{
                            mx: 0.25,
                            mb: 0.35,
                            py: 1,
                            px: 1.25,
                            borderRadius: 2,
                            '&:hover': {
                              bgcolor: brand.primary[50],
                              color: brand.primary[700],
                            },
                          }}
                        >
                          {Icon && (
                            <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                              <Icon size={18} stroke={1.7} />
                            </ListItemIcon>
                          )}
                          <ListItemText
                            primary={
                              <Stack direction="row" spacing={0.8} alignItems="center">
                                <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'inherit' }}>
                                  {route.title}
                                </Typography>
                                {route.chip && (
                                  <Chip
                                    color={route.chipColor ?? 'primary'}
                                    label={route.chip}
                                    size="small"
                                    sx={{ height: 18, fontSize: 10, fontWeight: 800 }}
                                  />
                                )}
                              </Stack>
                            }
                            secondary={route.href}
                            secondaryTypographyProps={{ fontSize: 12, color: brand.neutral[400] }}
                            sx={{ m: 0 }}
                          />
                          <IconArrowRight size={16} color={brand.neutral[400]} />
                        </ListItemButton>
                      );
                    })}
                  </Box>
                ))}
              </List>
            )}
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Search;
