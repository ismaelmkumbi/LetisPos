import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Skeleton,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  IconChevronDown,
  IconChevronRight,
  IconEdit,
  IconEye,
  IconEyeOff,
  IconRoute,
  IconSearch,
  IconShieldLock,
  IconSitemap,
} from '@tabler/icons-react';
import {
  getFullMenu,
  updateMenuItem,
  type MenuDefinition,
  type UpdateMenuRequest,
} from 'src/api/smartpos/features';
import { brand } from 'src/theme/smartpos/brand';

type EditableMenu = Pick<
  MenuDefinition,
  'id' | 'label' | 'icon' | 'route' | 'requiredFeatureKey' | 'sortOrder' | 'visible' | 'sectionHeader'
>;

function flattenMenu(items: MenuDefinition[], depth = 0): Array<MenuDefinition & { depth: number }> {
  return items.flatMap((item) => [
    { ...item, depth },
    ...flattenMenu(item.children ?? [], depth + 1),
  ]);
}

function itemMatches(item: MenuDefinition, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    item.label,
    item.key,
    item.route ?? '',
    item.requiredFeatureKey ?? '',
    item.icon ?? '',
  ].join(' ').toLowerCase();
  return haystack.includes(q) || (item.children ?? []).some((child) => itemMatches(child, query));
}

function visibleChildren(item: MenuDefinition, query: string): MenuDefinition[] {
  if (!query.trim()) return item.children ?? [];
  return (item.children ?? []).filter((child) => itemMatches(child, query));
}

function MenuRow({
  item,
  depth,
  query,
  expanded,
  onToggle,
  onEdit,
}: {
  item: MenuDefinition;
  depth: number;
  query: string;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onEdit: (item: MenuDefinition) => void;
}) {
  const children = visibleChildren(item, query);
  const hasChildren = children.length > 0;
  const isOpen = expanded.has(item.id);
  const isSection = item.sectionHeader;
  const hasRoute = Boolean(item.route);
  const protectedByFeature = Boolean(item.requiredFeatureKey);

  return (
    <Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(280px, 1fr) minmax(240px, 0.9fr) minmax(180px, 0.65fr) 88px' },
          gap: { xs: 0.75, md: 1.25 },
          alignItems: 'center',
          px: 1.25,
          py: 1,
          borderRadius: '9px',
          bgcolor: isSection ? brand.neutral[50] : '#FFFFFF',
          border: `1px solid ${isSection ? brand.neutral[200] : 'transparent'}`,
          '&:hover': { bgcolor: brand.primary[50] },
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, pl: { md: depth * 1.75 } }}>
          {hasChildren ? (
            <IconButton
              size="small"
              aria-label={isOpen ? `Collapse ${item.label}` : `Expand ${item.label}`}
              onClick={() => onToggle(item.id)}
              sx={{ width: 28, height: 28, flexShrink: 0 }}
            >
              {isOpen ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
            </IconButton>
          ) : (
            <Box sx={{ width: 28, flexShrink: 0 }} />
          )}
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
              <Typography sx={{ color: brand.neutral[900], fontWeight: isSection ? 900 : 800, fontSize: '0.86rem' }} noWrap>
                {item.label}
              </Typography>
              {isSection && (
                <Chip
                  label="section"
                  size="small"
                  sx={{ height: 18, borderRadius: '5px', color: brand.neutral[600], fontWeight: 800 }}
                />
              )}
              {!item.visible && (
                <Chip
                  label="hidden"
                  size="small"
                  sx={{ height: 18, borderRadius: '5px', bgcolor: brand.neutral[100], color: brand.neutral[600], fontWeight: 800 }}
                />
              )}
            </Stack>
            <Typography sx={{ color: brand.neutral[500], fontWeight: 650, fontSize: '0.7rem' }} noWrap>
              {item.key}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
          <IconRoute size={15} color={hasRoute ? brand.info.dark : brand.neutral[400]} />
          <Typography sx={{ color: hasRoute ? brand.neutral[700] : brand.neutral[400], fontWeight: 700, fontSize: '0.76rem' }} noWrap>
            {item.route || 'No route'}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
          <IconShieldLock size={15} color={protectedByFeature ? brand.primary[700] : brand.warning.dark} />
          {protectedByFeature ? (
            <Typography
              component="code"
              sx={{
                color: brand.primary[800],
                bgcolor: brand.primary[50],
                px: 0.65,
                py: 0.25,
                borderRadius: '5px',
                fontWeight: 800,
                fontSize: '0.7rem',
              }}
              noWrap
            >
              {item.requiredFeatureKey}
            </Typography>
          ) : (
            <Typography sx={{ color: brand.warning.dark, fontWeight: 800, fontSize: '0.72rem' }} noWrap>
              No feature key
            </Typography>
          )}
        </Stack>

        <Stack direction="row" justifyContent={{ xs: 'flex-start', md: 'flex-end' }} spacing={0.25}>
          <Tooltip title={item.visible ? 'Visible in menu' : 'Hidden from menu'}>
            <Box sx={{ color: item.visible ? brand.success.dark : brand.neutral[400], display: 'flex', alignItems: 'center', px: 0.5 }}>
              {item.visible ? <IconEye size={16} /> : <IconEyeOff size={16} />}
            </Box>
          </Tooltip>
          <Tooltip title="Edit menu item">
            <IconButton size="small" aria-label={`Edit ${item.label}`} onClick={() => onEdit(item)}>
              <IconEdit size={16} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {hasChildren && isOpen && (
        <Stack spacing={0.5} sx={{ mt: 0.5 }}>
          {children.map((child) => (
            <MenuRow
              key={child.id}
              item={child}
              depth={depth + 1}
              query={query}
              expanded={expanded}
              onToggle={onToggle}
              onEdit={onEdit}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}

export default function MenuPermissions() {
  const [menu, setMenu] = useState<MenuDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<EditableMenu | null>(null);

  const loadMenu = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getFullMenu();
      setMenu(data);
      setExpanded(new Set(flattenMenu(data).map((item) => item.id)));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dynamic menu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  const flat = useMemo(() => flattenMenu(menu), [menu]);
  const filteredMenu = useMemo(
    () => (query.trim() ? menu.filter((item) => itemMatches(item, query)) : menu),
    [menu, query],
  );

  const stats = useMemo(() => {
    const routed = flat.filter((item) => item.route).length;
    const protectedItems = flat.filter((item) => item.requiredFeatureKey).length;
    const hidden = flat.filter((item) => !item.visible).length;
    const missingFeature = flat.filter((item) => item.route && !item.requiredFeatureKey && !item.sectionHeader).length;
    return { total: flat.length, routed, protectedItems, hidden, missingFeature };
  }, [flat]);

  const openEdit = (item: MenuDefinition) => {
    setEditing({
      id: item.id,
      label: item.label,
      icon: item.icon ?? '',
      route: item.route ?? '',
      requiredFeatureKey: item.requiredFeatureKey ?? '',
      sortOrder: item.sortOrder,
      visible: item.visible,
      sectionHeader: item.sectionHeader,
    });
  };

  const toggleExpanded = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (!editing?.label.trim()) return;
    setSaving(true);
    try {
      const body: UpdateMenuRequest = {
        label: editing.label.trim(),
        icon: editing.icon?.trim() || undefined,
        route: editing.route?.trim() || undefined,
        requiredFeatureKey: editing.requiredFeatureKey?.trim() || undefined,
        sortOrder: Number(editing.sortOrder) || 0,
        visible: editing.visible,
        sectionHeader: editing.sectionHeader,
      };
      await updateMenuItem(editing.id, body);
      setEditing(null);
      await loadMenu();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update menu item');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Stack spacing={1.5}>
        <Skeleton variant="rounded" height={42} />
        <Skeleton variant="rounded" height={110} />
        <Skeleton variant="rounded" height={420} />
      </Stack>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search menu label, route, key, or feature permission"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <IconSearch size={16} />
              </InputAdornment>
            ),
          }}
          sx={{ flex: 1 }}
        />
        <Button
          variant="outlined"
          startIcon={<IconSitemap size={16} />}
          onClick={() => setExpanded(new Set(flat.map((item) => item.id)))}
          sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 800 }}
        >
          Expand All
        </Button>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} sx={{ mb: 2 }}>
        {[
          ['Menu items', stats.total],
          ['Routes', stats.routed],
          ['Protected', stats.protectedItems],
          ['Hidden', stats.hidden],
          ['Missing keys', stats.missingFeature],
        ].map(([label, value]) => (
          <Card
            key={label}
            elevation={0}
            sx={{
              flex: 1,
              p: 1.25,
              borderRadius: '9px',
              border: `1px solid ${brand.neutral[200]}`,
              bgcolor: label === 'Missing keys' && value ? brand.warning.light : '#FFFFFF',
            }}
          >
            <Typography sx={{ color: brand.neutral[500], fontWeight: 800, fontSize: '0.68rem', textTransform: 'uppercase' }}>
              {label}
            </Typography>
            <Typography sx={{ color: brand.neutral[900], fontWeight: 900, fontSize: '1.35rem', lineHeight: 1.2 }}>
              {value}
            </Typography>
          </Card>
        ))}
      </Stack>

      <Card
        elevation={0}
        sx={{
          border: `1px solid ${brand.neutral[200]}`,
          borderRadius: '10px',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            display: { xs: 'none', md: 'grid' },
            gridTemplateColumns: 'minmax(280px, 1fr) minmax(240px, 0.9fr) minmax(180px, 0.65fr) 88px',
            gap: 1.25,
            px: 1.25,
            py: 1,
            bgcolor: brand.neutral[50],
            borderBottom: `1px solid ${brand.neutral[200]}`,
          }}
        >
          {['Menu hierarchy', 'Route', 'Feature / permission', ''].map((heading) => (
            <Typography key={heading} sx={{ color: brand.neutral[500], fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase' }}>
              {heading}
            </Typography>
          ))}
        </Box>

        <Stack spacing={0.5} sx={{ p: 1 }}>
          {filteredMenu.map((item) => (
            <MenuRow
              key={item.id}
              item={item}
              depth={0}
              query={query}
              expanded={expanded}
              onToggle={toggleExpanded}
              onEdit={openEdit}
            />
          ))}
          {filteredMenu.length === 0 && (
            <Typography sx={{ color: brand.neutral[500], fontWeight: 650, py: 4, textAlign: 'center' }}>
              No menu items match this search.
            </Typography>
          )}
        </Stack>
      </Card>

      <Dialog open={Boolean(editing)} onClose={() => !saving && setEditing(null)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 850 }}>Edit menu item</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Label"
              size="small"
              required
              value={editing?.label ?? ''}
              onChange={(e) => setEditing((current) => current ? { ...current, label: e.target.value } : current)}
            />
            <TextField
              label="Icon key"
              size="small"
              value={editing?.icon ?? ''}
              onChange={(e) => setEditing((current) => current ? { ...current, icon: e.target.value } : current)}
              helperText="Use the dynamic icon key, for example users, settings, chart-bar."
            />
            <TextField
              label="Route"
              size="small"
              value={editing?.route ?? ''}
              onChange={(e) => setEditing((current) => current ? { ...current, route: e.target.value } : current)}
              helperText="Use an absolute SmartPOS route, for example /smartpos/settings/users."
            />
            <TextField
              label="Required feature key"
              size="small"
              value={editing?.requiredFeatureKey ?? ''}
              onChange={(e) => setEditing((current) => current ? { ...current, requiredFeatureKey: e.target.value } : current)}
              helperText="Leave empty only for safe public navigation such as Dashboard or Help."
            />
            <TextField
              label="Sort order"
              type="number"
              size="small"
              value={editing?.sortOrder ?? 0}
              onChange={(e) => setEditing((current) => current ? { ...current, sortOrder: Number(e.target.value) } : current)}
            />
            <Divider />
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(editing?.visible)}
                    onChange={(e) => setEditing((current) => current ? { ...current, visible: e.target.checked } : current)}
                  />
                }
                label="Visible"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(editing?.sectionHeader)}
                    onChange={(e) => setEditing((current) => current ? { ...current, sectionHeader: e.target.checked } : current)}
                  />
                }
                label="Section header"
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditing(null)} disabled={saving} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !editing?.label.trim()}
            sx={{ textTransform: 'none', fontWeight: 850, borderRadius: '8px' }}
          >
            {saving ? 'Saving...' : 'Save menu item'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
