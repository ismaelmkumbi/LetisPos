/**
 * SmartPOS Settings module — enterprise-grade settings pages for the admin UI.
 *
 * Exports:
 *   SettingsHome         — /smartpos/settings (Preferences)
 *   UsersRolesSettings   — /smartpos/settings/users
 *   TenantsSettings      — /smartpos/settings/tenants
 *   LocaleSettings       — /smartpos/settings/locale
 *   SettingsPlaceholder  — generic placeholder (legacy compat)
 */
import {
  useEffect, useMemo, useState, useCallback,
} from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  IconEdit,
  IconPlus,
  IconSearch,
  IconShieldLock,
  IconTrash,
  IconBuildingWarehouse,
  IconBuilding,
  IconUsers,
  IconLock,
  IconChartBar,
  IconArrowUpRight,
  IconCreditCard,
  IconBuildingStore,
  IconLayoutGrid,
  IconPercentage,
  IconCash,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import PageHeader from 'src/components/smartpos/PageHeader';
import {
  SMARTPOS_LOCALES, setSmartPosLocale, getSmartPosLocale, type SmartPosLocale,
} from 'src/i18n/smartpos';
import { brand } from 'src/theme/smartpos/brand';
import { premiumFieldSx } from 'src/components/smartpos/PosLayouts/shared';
import { useAuth } from 'src/context/smartpos/AuthContext';
import { getPosSettings, updatePosSettings, resetPosSettings, type PosSettings } from 'src/api/smartpos/posSettings';
import { listWarehouses, type Warehouse } from 'src/api/smartpos/inventory';
import {
  listUsers,
  updateUser,
  setUserStatus,
  assignUserWarehouses,
  listRoles,
  createRole,
  updateRole,
  deleteRole,
  setRolePermissions,
  listPermissions,
  type UserDto,
  type RoleDto,
  type PermissionDto,
} from 'src/api/smartpos/users';
import type { UUID } from 'src/api/smartpos/types';
import {
  cardSx, SectionTitle, FloatingSaveBar, CardSkeletonGroup,
} from 'src/components/smartpos/SettingsHelpers';
import DataTable, { type Column, StatusBadge } from 'src/components/smartpos/DataTable';

const t_brand = brand;

const fieldSx = { ...premiumFieldSx, '& .MuiOutlinedInput-root': { ...premiumFieldSx['& .MuiOutlinedInput-root'], borderRadius: '10px' } };

const toggleGroupSx = {
  '& .MuiToggleButton-root': {
    textTransform: 'none', fontWeight: 700, fontSize: '0.82rem', py: 0.8, px: 2, borderRadius: '8px',
  },
};

const CURRENCY_CODES = [
  'TZS', 'KES', 'UGX', 'RWF', 'BIF', 'USD', 'EUR', 'GBP', 'ZAR', 'NGN', 'GHS', 'AED',
];

const PRODUCTS_PER_PAGE_OPTS = [10, 20, 30, 50, 100];

/* ──────────────────────────────────────────────────────────────────────────
   Preferences (POS Settings)
   ────────────────────────────────────────────────────────────────────────── */

export function SettingsHome() {
  const { t } = useTranslation('smartpos');
  const { user } = useAuth();

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState<UUID | null>(null);
  const [settings, setSettings] = useState<PosSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Load warehouses
  useEffect(() => {
    listWarehouses()
      .then((w) => setWarehouses(w.filter((x) => x.active)))
      .catch(() => setError('Failed to load warehouses'));
  }, []);

  // Load settings when warehouse changes
  useEffect(() => {
    if (!warehouseId) { setSettings(null); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getPosSettings(warehouseId)
      .then((s) => { if (!cancelled) setSettings(s); })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load settings');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [warehouseId]);

  // Default to user's first warehouse
  useEffect(() => {
    if (warehouseId || warehouses.length === 0) return;
    const first = user?.warehouseIds?.[0] ?? warehouses[0]?.id;
    if (first) setWarehouseId(first);
  }, [warehouses, warehouseId, user]);

  const update = useCallback((patch: Partial<PosSettings>) => {
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const [resetting, setResetting] = useState(false);

  const handleSave = async () => {
    if (!warehouseId || !settings) return;
    setSaving(true);
    setError(null);
    setInfo(null);
    try {
      const updated = await updatePosSettings(warehouseId, {
        storeName: settings.storeName,
        storeAddress: settings.storeAddress,
        storePhone: settings.storePhone,
        storeEmail: settings.storeEmail,
        storeTaxId: settings.storeTaxId,
        footerMessage: settings.footerMessage,
        logoUrl: settings.logoUrl,
        storeWebsite: settings.storeWebsite,
        productsPerPage: settings.productsPerPage,
        defaultTaxRate: settings.defaultTaxRate,
        defaultTaxMethod: settings.defaultTaxMethod,
        currencyCode: settings.currencyCode,
        currencySymbol: settings.currencySymbol,
      });
      setSettings(updated);
      setInfo(t('settings:preferences.saved'));
      setTimeout(() => setInfo(null), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('settings:preferences.save_failed'));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!warehouseId) return;
    setResetting(true);
    setError(null);
    try {
      const defaults = await resetPosSettings(warehouseId);
      setSettings(defaults);
      setInfo('Settings reset to factory defaults.');
      setTimeout(() => setInfo(null), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reset failed');
    } finally {
      setResetting(false);
    }
  };

  const selWarehouse = warehouses.find((w) => w.id === warehouseId);

  return (
    <Box>
      <PageHeader
        title={t('settings:preferences.title')}
        subtitle={t('settings:preferences.subtitle')}
        badge={{ label: 'Enterprise', tone: 'primary' }}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>
      )}
      {info && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setInfo(null)}>{info}</Alert>
      )}

      {/* Warehouse selector */}
      <Box sx={{ ...cardSx, p: 2.5, mb: 2.5 }}>
        <SectionTitle icon={<IconBuildingStore size={20} />} title={t('settings:preferences.warehouse')} />
        <Typography variant="body2" sx={{ color: t_brand.neutral[500], mb: 1.5 }}>
          {t('settings:preferences.warehouse_hint')}
        </Typography>
        <Autocomplete
          value={selWarehouse ?? null}
          options={warehouses}
          getOptionLabel={(w) => `${w.name}${w.city ? ` — ${w.city}` : ''}`}
          onChange={(_, v) => v && setWarehouseId(v.id)}
          renderInput={(p) => (
            <TextField {...p} size="small" sx={{ ...fieldSx, minWidth: 360 }} />
          )}
          sx={{ maxWidth: 480 }}
        />
      </Box>

      {!warehouseId && !loading && (
        <Alert severity="info">{t('settings:preferences.no_warehouse')}</Alert>
      )}

      {loading && warehouseId && <CardSkeletonGroup heights={[220, 160, 180, 140]} count={4} />}

      {!loading && settings && warehouseId && (
        <Stack spacing={2.5} sx={{ maxWidth: 1680, mx: 'auto' }}>
          {/* Row: Store Information + POS Behaviour */}
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5}>
            <Box sx={{ ...cardSx, p: 2.5, flex: 1 }}>
              <SectionTitle icon={<IconBuildingStore size={20} />} title={t('settings:preferences.store_info')} />
              <Stack spacing={1.5}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <TextField
                    label={t('settings:preferences.store_name')}
                    value={settings.storeName}
                    onChange={(e) => update({ storeName: e.target.value })}
                    size="small" fullWidth sx={fieldSx}
                  />
                  <TextField
                    label={t('settings:preferences.store_tax_id')}
                    value={settings.storeTaxId}
                    onChange={(e) => update({ storeTaxId: e.target.value })}
                    size="small" fullWidth sx={fieldSx}
                  />
                </Stack>
                <TextField
                  label={t('settings:preferences.store_address')}
                  value={settings.storeAddress}
                  onChange={(e) => update({ storeAddress: e.target.value })}
                  size="small" fullWidth sx={fieldSx}
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <TextField
                    label={t('settings:preferences.store_phone')}
                    value={settings.storePhone}
                    onChange={(e) => update({ storePhone: e.target.value })}
                    size="small" fullWidth sx={fieldSx}
                  />
                  <TextField
                    label={t('settings:preferences.store_email')}
                    value={settings.storeEmail}
                    onChange={(e) => update({ storeEmail: e.target.value })}
                    size="small" fullWidth sx={fieldSx}
                  />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <TextField label="Website" value={settings.storeWebsite}
                    onChange={(e) => update({ storeWebsite: e.target.value })}
                    size="small" fullWidth sx={fieldSx} placeholder="https://example.com" />
                  <TextField label="Logo URL" value={settings.logoUrl}
                    onChange={(e) => update({ logoUrl: e.target.value })}
                    size="small" fullWidth sx={fieldSx} placeholder="https://cdn.example.com/logo.png" />
                </Stack>
                <TextField label="Footer message" value={settings.footerMessage}
                  onChange={(e) => update({ footerMessage: e.target.value })}
                  size="small" fullWidth sx={fieldSx}
                  helperText="Shown at the bottom of every receipt" />
              </Stack>
            </Box>

            <Box sx={{ ...cardSx, p: 2.5, flex: 1 }}>
              <SectionTitle icon={<IconLayoutGrid size={20} />} title={t('settings:preferences.pos_behaviour')} />
              <Typography variant="body2" sx={{ color: t_brand.neutral[500], mb: 1.5 }}>
                {t('settings:preferences.products_per_page_hint')}
              </Typography>
              <ToggleButtonGroup
                value={settings.productsPerPage}
                exclusive size="small"
                onChange={(_, v) => v && update({ productsPerPage: v })}
                sx={toggleGroupSx}
              >
                {PRODUCTS_PER_PAGE_OPTS.map((n) => (
                  <ToggleButton key={n} value={n}>{n}</ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>
          </Stack>

          {/* Row: Tax Defaults + Currency */}
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5}>
            <Box sx={{ ...cardSx, p: 2.5, flex: 1 }}>
              <SectionTitle icon={<IconPercentage size={20} />} title={t('settings:preferences.tax_defaults')} />
              <Stack spacing={1.5}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <TextField
                    label={t('settings:preferences.default_tax_rate')}
                    value={settings.defaultTaxRate}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v)) update({ defaultTaxRate: v });
                    }}
                    type="number" size="small"
                    sx={{ maxWidth: 200, ...fieldSx }}
                    InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                    helperText={t('settings:preferences.default_tax_rate_hint')}
                  />
                </Stack>
                <Box>
                  <ToggleButtonGroup
                    value={settings.defaultTaxMethod}
                    exclusive size="small"
                    onChange={(_, v) => v && update({ defaultTaxMethod: v })}
                    sx={toggleGroupSx}
                  >
                    <ToggleButton value="EXCLUSIVE">
                      {t('settings:preferences.tax_method_exclusive')}
                    </ToggleButton>
                    <ToggleButton value="INCLUSIVE">
                      {t('settings:preferences.tax_method_inclusive')}
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              </Stack>
            </Box>

            <Box sx={{ ...cardSx, p: 2.5, flex: 1 }}>
              <SectionTitle icon={<IconCash size={20} />} title={t('settings:preferences.currency')} />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  select
                  label={t('settings:preferences.currency_code')}
                  value={settings.currencyCode}
                  onChange={(e) => update({ currencyCode: e.target.value })}
                  size="small"
                  sx={{ minWidth: 140, ...fieldSx }}
                  helperText={t('settings:preferences.currency_code_hint')}
                >
                  {CURRENCY_CODES.map((c) => (
                    <MenuItem key={c} value={c}>{c}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  label={t('settings:preferences.currency_symbol')}
                  value={settings.currencySymbol}
                  onChange={(e) => update({ currencySymbol: e.target.value })}
                  size="small"
                  sx={{ maxWidth: 140, ...fieldSx }}
                  helperText={t('settings:preferences.currency_symbol_hint')}
                />
              </Stack>
            </Box>
          </Stack>

          {/* Floating save bar */}
          <FloatingSaveBar
            saving={saving}
            onSave={handleSave}
            onReset={handleReset}
            resetting={resetting}
            saveLabel={t('settings:preferences.save')}
            lastSavedAt={settings.updatedAt ? new Date(settings.updatedAt).toLocaleString() : undefined}
          />
        </Stack>
      )}
    </Box>
  );
}

export default SettingsHome;

/* ──────────────────────────────────────────────────────────────────────────
   Users & Roles
   ────────────────────────────────────────────────────────────────────────── */

export function UsersRolesSettings() {
  const { t } = useTranslation('smartpos');
  const [tab, setTab] = useState<'users' | 'roles'>('users');

  return (
    <Box>
      <PageHeader
        title={t('settings:users.title')}
        subtitle={t('settings:users.subtitle')}
      />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2.5 }}>
        <Tab
          value="users"
          label={t('settings:users.users_tab')}
          icon={<IconUsers size={18} />}
          iconPosition="start"
        />
        <Tab
          value="roles"
          label={t('settings:users.roles_tab')}
          icon={<IconShieldLock size={18} />}
          iconPosition="start"
        />
      </Tabs>
      {tab === 'users' && <UsersTab />}
      {tab === 'roles' && <RolesTab />}
    </Box>
  );
}

/* ─── Users Tab ─────────────────────────────────────────────────────── */

function UsersTab() {
  const { t } = useTranslation('smartpos');
  const [users, setUsers] = useState<UserDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDto | null>(null);
  const [statusConfirm, setStatusConfirm] = useState<UserDto | null>(null);
  const [warehouseOpen, setWarehouseOpen] = useState(false);
  const [warehouseUser, setWarehouseUser] = useState<UserDto | null>(null);

  const PAGE_SIZE = 20;

  const fetchUsers = useCallback(async (p: number, s: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await listUsers({ search: s || undefined, page: p, size: PAGE_SIZE });
      setUsers(res.content);
      setTotal(res.totalElements);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(page, search);
  }, [page, search, fetchUsers]);

  const showInfo = (msg: string) => {
    setInfo(msg);
    setTimeout(() => setInfo(null), 3000);
  };

  const handleToggleStatus = async () => {
    if (!statusConfirm) return;
    try {
      await setUserStatus(statusConfirm.id, !statusConfirm.active);
      setStatusConfirm(null);
      showInfo(t('settings:users.status_toggled'));
      fetchUsers(page, search);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    try {
      await updateUser(editingUser.id, {
        firstName: editingUser.firstName,
        lastName: editingUser.lastName,
        phone: editingUser.phone,
        isAllWarehouses: editingUser.isAllWarehouses,
      });
      setEditOpen(false);
      showInfo(t('settings:users.user_saved'));
      fetchUsers(page, search);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('settings:users.user_save_failed'));
    }
  };

  const userColumns = useMemo<Column<UserDto>[]>(() => [
    {
      key: 'name', label: 'Name', width: 240,
      sortable: true,
      exportValue: (u) => [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email,
      render: (u) => (
        <Stack direction="row" spacing={1} alignItems="center">
          <Box
            sx={{
              width: 32, height: 32, borderRadius: 2,
              bgcolor: t_brand.primary[100],
              color: t_brand.primary[700],
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '0.75rem',
            }}
          >
            {(u.firstName?.[0] ?? u.email[0]).toUpperCase()}
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: '0.82rem' }}>
            {[u.firstName, u.lastName].filter(Boolean).join(' ') || u.email}
          </Typography>
        </Stack>
      ),
    },
    {
      key: 'email', label: 'Email', width: 220,
      sortable: true,
      exportValue: (u) => u.email,
      render: (u) => (
        <Typography sx={{ fontSize: '0.8rem', color: t_brand.neutral[600] }}>
          {u.email}
        </Typography>
      ),
    },
    {
      key: 'roles', label: 'Roles', width: 200,
      exportValue: (u) => u.roles.join(', '),
      render: (u) => (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" rowGap={0.5}>
          {u.roles.slice(0, 3).map((r) => (
            <Chip key={r} label={r} size="small"
              sx={{ fontSize: '0.7rem', fontWeight: 600,
                bgcolor: t_brand.primary[50], color: t_brand.primary[700] }} />
          ))}
          {u.roles.length > 3 && (
            <Tooltip title={u.roles.slice(3).join(', ')}>
              <Chip label={`+${u.roles.length - 3}`} size="small"
                sx={{ fontSize: '0.7rem', fontWeight: 600,
                  bgcolor: t_brand.neutral[100], color: t_brand.neutral[600] }} />
            </Tooltip>
          )}
        </Stack>
      ),
    },
    {
      key: 'active', label: 'Status', align: 'center', width: 100,
      sortable: true,
      exportValue: (u) => u.active ? 'Active' : 'Inactive',
      render: (u) => (
        <StatusBadge
          label={u.active ? t('settings:users.active') : t('settings:users.inactive')}
          tone={u.active ? 'success' : 'neutral'}
        />
      ),
    },
    {
      key: 'actions', label: '', align: 'right', width: 140,
      enableHiding: false,
      render: (u) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
          <Tooltip title="Edit user">
            <IconButton size="small"
              onClick={() => { setEditingUser(u); setEditOpen(true); }}>
              <IconEdit size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Assign warehouses">
            <IconButton size="small"
              onClick={() => { setWarehouseUser(u); setWarehouseOpen(true); }}>
              <IconBuildingWarehouse size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title={u.active ? 'Deactivate' : 'Activate'}>
            <IconButton size="small"
              onClick={() => setStatusConfirm(u)}>
              <IconLock size={16}
                color={u.active ? t_brand.warning.dark : t_brand.success.dark} />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ], [t]);

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {info && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setInfo(null)}>{info}</Alert>}

      <DataTable
        columns={userColumns}
        rows={users}
        loading={loading}
        emptyText={t('settings:users.no_users')}
        getRowKey={(u) => u.id}
        tableKey="users"
        enableSorting
        enableExport
        enableColumnVisibility
        exportFileName="users-export"
        page={page}
        totalPages={Math.ceil(total / PAGE_SIZE)}
        totalElements={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        toolbarTitle={total > 0 ? `${total.toLocaleString()} users` : undefined}
        toolbar={
          <TextField
            size="small"
            placeholder={t('settings:users.search_users')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            sx={{ minWidth: 280, ...fieldSx }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <IconSearch size={18} color={t_brand.neutral[400]} />
                </InputAdornment>
              ),
            }}
          />
        }
      />

      {/* Edit User Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('settings:users.edit_user_title')}</DialogTitle>
        <DialogContent>
          {editingUser && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Stack direction="row" spacing={1.5}>
                <TextField fullWidth size="small" label={t('settings:users.first_name')}
                  value={editingUser.firstName}
                  onChange={(e) => setEditingUser({ ...editingUser, firstName: e.target.value })}
                  sx={premiumFieldSx} />
                <TextField fullWidth size="small" label={t('settings:users.last_name')}
                  value={editingUser.lastName}
                  onChange={(e) => setEditingUser({ ...editingUser, lastName: e.target.value })}
                  sx={premiumFieldSx} />
              </Stack>
              <TextField fullWidth size="small" label={t('settings:users.email')}
                value={editingUser.email} disabled sx={premiumFieldSx} />
              <TextField fullWidth size="small" label={t('settings:users.phone')}
                value={editingUser.phone}
                onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                sx={premiumFieldSx} />
              <FormControlLabel
                control={
                  <Switch
                    checked={editingUser.isAllWarehouses}
                    onChange={(_, v) => setEditingUser({ ...editingUser, isAllWarehouses: v })}
                  />
                }
                label={t('settings:users.all_warehouses')}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>{t('common:cancel')}</Button>
          <Button variant="contained" onClick={handleSaveUser}
            sx={{
              bgcolor: t_brand.accent[500],
              '&:hover': { bgcolor: t_brand.accent[600] },
            }}>
            {t('common:save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toggle Status Confirmation */}
      <Dialog open={!!statusConfirm} onClose={() => setStatusConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {statusConfirm?.active
            ? t('settings:users.deactivate_confirm_title')
            : t('settings:users.activate_confirm_title')}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: t_brand.neutral[600] }}>
            {statusConfirm?.active
              ? t('settings:users.deactivate_confirm_body', {
                name: [statusConfirm?.firstName, statusConfirm?.lastName].filter(Boolean).join(' ') || statusConfirm?.email,
              })
              : t('settings:users.activate_confirm_body', {
                name: [statusConfirm?.firstName, statusConfirm?.lastName].filter(Boolean).join(' ') || statusConfirm?.email,
              })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusConfirm(null)}>{t('common:cancel')}</Button>
          <Button
            variant="contained"
            onClick={handleToggleStatus}
            color={statusConfirm?.active ? 'warning' : 'success'}
          >
            {statusConfirm?.active ? 'Deactivate' : 'Activate'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Warehouses Dialog */}
      <AssignWarehousesDialog
        open={warehouseOpen}
        user={warehouseUser}
        onClose={() => setWarehouseOpen(false)}
        onAssigned={() => {
          setWarehouseOpen(false);
          showInfo(t('settings:users.warehouses_assigned'));
          fetchUsers(page, search);
        }}
      />
    </Box>
  );
}

/* ─── Assign Warehouses Dialog ──────────────────────────────────────── */

function AssignWarehousesDialog({
  open, user, onClose, onAssigned,
}: {
  open: boolean; user: UserDto | null; onClose: () => void; onAssigned: () => void;
}) {
  const { t } = useTranslation('smartpos');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selected, setSelected] = useState<Set<UUID>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && user) {
      setSelected(new Set(user.warehouseIds));
      listWarehouses()
        .then((w) => setWarehouses(w.filter((x) => x.active)))
        .catch(() => {});
    }
  }, [open, user]);

  const toggle = (id: UUID) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await assignUserWarehouses(user.id, Array.from(selected));
      onAssigned();
    } catch {
      /* handled by parent */
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('settings:users.assign_warehouses')}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: t_brand.neutral[500], mb: 2 }}>
          {user ? `${[user.firstName, user.lastName].filter(Boolean).join(' ') || user.email}` : ''}
        </Typography>
        <Stack spacing={0.5}>
          {warehouses.map((w) => (
            <FormControlLabel
              key={w.id}
              control={
                <Checkbox
                  checked={selected.has(w.id)}
                  onChange={() => toggle(w.id)}
                  size="small"
                />
              }
              label={w.name}
            />
          ))}
          {warehouses.length === 0 && (
            <Typography variant="body2" sx={{ color: t_brand.neutral[400] }}>
              No warehouses found.
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common:cancel')}</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}
          sx={{ bgcolor: t_brand.accent[500], '&:hover': { bgcolor: t_brand.accent[600] } }}>
          {saving ? t('common:saving') : t('common:save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ─── Roles Tab ──────────────────────────────────────────────────────── */

function RolesTab() {
  const { t } = useTranslation('smartpos');
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [permissions, setPermissions] = useState<PermissionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Partial<RoleDto> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<RoleDto | null>(null);
  const [permOpen, setPermOpen] = useState(false);
  const [permRole, setPermRole] = useState<RoleDto | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, p] = await Promise.all([listRoles(), listPermissions()]);
      setRoles(r);
      setPermissions(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const showInfo = (msg: string) => {
    setInfo(msg);
    setTimeout(() => setInfo(null), 3000);
  };

  const handleCreate = () => {
    setEditingRole({ name: '', label: '', description: '' });
    setIsNew(true);
    setEditOpen(true);
  };

  const handleEdit = (role: RoleDto) => {
    setEditingRole({ ...role });
    setIsNew(false);
    setEditOpen(true);
  };

  const handleSaveRole = async () => {
    if (!editingRole) return;
    try {
      if (isNew) {
        await createRole({
          name: editingRole.name!,
          label: editingRole.label,
          description: editingRole.description,
        });
        showInfo(t('settings:users.role_saved'));
      } else {
        await updateRole(editingRole.id!, {
          name: editingRole.name!,
          label: editingRole.label,
          description: editingRole.description,
        });
        showInfo(t('settings:users.role_saved'));
      }
      setEditOpen(false);
      fetchData();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('settings:users.role_save_failed'));
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteRole(deleteConfirm.id);
      setDeleteConfirm(null);
      showInfo(t('settings:users.role_deleted'));
      fetchData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete role');
    }
  };

  const roleColumns = useMemo<Column<RoleDto>[]>(() => [
    {
      key: 'name', label: 'Name', width: 180,
      sortable: true,
      exportValue: (r) => r.name,
      render: (r) => (
        <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', fontFamily: 'monospace' }}>
          {r.name}
        </Typography>
      ),
    },
    {
      key: 'label', label: 'Label', width: 180,
      sortable: true,
      exportValue: (r) => r.label ?? '',
      render: (r) => (
        <Typography sx={{ fontSize: '0.82rem' }}>
          {r.label || '—'}
        </Typography>
      ),
    },
    {
      key: 'permissions', label: 'Permissions', width: 160,
      exportValue: (r) => r.permissions.join(', '),
      render: (r) => (
        <Tooltip title={r.permissions.join(', ') || 'None'}>
          <Chip
            label={t('settings:users.permissions_count', { count: r.permissions.length })}
            size="small"
            sx={{
              fontSize: '0.7rem', fontWeight: 600,
              bgcolor: t_brand.primary[50], color: t_brand.primary[700],
              cursor: 'pointer',
            }}
          />
        </Tooltip>
      ),
    },
    {
      key: 'isSystem', label: 'Type', align: 'center', width: 100,
      sortable: true,
      exportValue: (r) => r.isSystem ? 'System' : 'Custom',
      render: (r) =>
        r.isSystem ? (
          <StatusBadge label={t('settings:users.system_role')} tone="warning" />
        ) : (
          <Typography sx={{ fontSize: '0.78rem', color: t_brand.neutral[400] }}>Custom</Typography>
        ),
    },
    {
      key: 'actions', label: '', align: 'right', width: 150,
      enableHiding: false,
      render: (r) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
          <Tooltip title="Manage Permissions">
            <IconButton size="small"
              onClick={() => { setPermRole(r); setPermOpen(true); }}>
              <IconLock size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => handleEdit(r)}>
              <IconEdit size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title={r.isSystem ? t('settings:users.system_role_warning') : 'Delete'}>
            <span>
              <IconButton size="small"
                disabled={r.isSystem}
                onClick={() => setDeleteConfirm(r)}>
                <IconTrash size={16}
                  color={r.isSystem ? t_brand.neutral[300] : t_brand.error.main} />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      ),
    },
  ], [t]);

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {info && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setInfo(null)}>{info}</Alert>}

      <DataTable
        columns={roleColumns}
        rows={roles}
        loading={loading}
        emptyText={t('settings:users.no_roles')}
        getRowKey={(r) => r.id}
        tableKey="roles"
        enableSorting
        enableExport
        enableColumnVisibility
        exportFileName="roles-export"
        toolbarTitle={roles.length > 0 ? `${roles.length} roles` : undefined}
        toolbar={
          <Button
            variant="contained"
            startIcon={<IconPlus size={16} />}
            onClick={handleCreate}
            sx={{
              bgcolor: t_brand.accent[500],
              '&:hover': { bgcolor: t_brand.accent[600] },
              textTransform: 'none', fontWeight: 700, borderRadius: '10px',
            }}
          >
            {t('settings:users.create_role')}
          </Button>
        }
      />

      {/* Create / Edit Role Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {isNew ? t('settings:users.create_role') : t('settings:users.edit_role')}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField fullWidth size="small" label={t('settings:users.role_name')} required
              value={editingRole?.name ?? ''}
              onChange={(e) => setEditingRole((prev) => ({ ...prev, name: e.target.value }))}
              sx={premiumFieldSx} />
            <TextField fullWidth size="small" label={t('settings:users.role_label')}
              value={editingRole?.label ?? ''}
              onChange={(e) => setEditingRole((prev) => ({ ...prev, label: e.target.value }))}
              sx={premiumFieldSx} />
            <TextField fullWidth size="small" label={t('settings:users.role_description')}
              multiline minRows={2}
              value={editingRole?.description ?? ''}
              onChange={(e) => setEditingRole((prev) => ({ ...prev, description: e.target.value }))}
              sx={premiumFieldSx} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>{t('common:cancel')}</Button>
          <Button variant="contained" onClick={handleSaveRole}
            disabled={!editingRole?.name?.trim()}
            sx={{ bgcolor: t_brand.accent[500], '&:hover': { bgcolor: t_brand.accent[600] } }}>
            {t('common:save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Role Confirmation */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('settings:users.delete_role_confirm_title')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: t_brand.neutral[600] }}>
            {t('settings:users.delete_role_confirm_body', { name: deleteConfirm?.name ?? '' })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>{t('common:cancel')}</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            {t('common:delete')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manage Permissions Dialog */}
      <ManagePermissionsDialog
        open={permOpen}
        role={permRole}
        allPermissions={permissions}
        onClose={() => setPermOpen(false)}
        onUpdated={() => {
          setPermOpen(false);
          showInfo(t('settings:users.permissions_updated'));
          fetchData();
        }}
      />
    </Box>
  );
}

/* ─── Manage Permissions Dialog ─────────────────────────────────────── */

function ManagePermissionsDialog({
  open, role, allPermissions, onClose, onUpdated,
}: {
  open: boolean; role: RoleDto | null; allPermissions: PermissionDto[];
  onClose: () => void; onUpdated: () => void;
}) {
  const { t } = useTranslation('smartpos');
  const [selected, setSelected] = useState<Set<UUID>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && role) {
      const rolePermIds = allPermissions
        .filter((p) => role.permissions.includes(p.name))
        .map((p) => p.id);
      setSelected(new Set(rolePermIds));
    }
  }, [open, role, allPermissions]);

  const toggle = (id: UUID) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (!role) return;
    setSaving(true);
    try {
      await setRolePermissions(role.id, Array.from(selected));
      onUpdated();
    } catch {
      /* handled by parent */
    } finally {
      setSaving(false);
    }
  };

  // Group permissions by domain prefix
  const groups = useMemo(() => {
    const map = new Map<string, PermissionDto[]>();
    allPermissions.forEach((p) => {
      const domain = p.name.includes('.') ? p.name.split('.')[0] : 'other';
      if (!map.has(domain)) map.set(domain, []);
      map.get(domain)!.push(p);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [allPermissions]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {t('settings:users.manage_permissions')}
        {role && (
          <Typography variant="body2" sx={{ color: t_brand.neutral[500], fontWeight: 400, mt: 0.5 }}>
            {role.name}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent>
        {allPermissions.length === 0 && (
          <Typography variant="body2" sx={{ color: t_brand.neutral[400] }}>
            {t('settings:users.no_permissions')}
          </Typography>
        )}
        {groups.map(([domain, perms]) => (
          <Box key={domain} sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{
              fontWeight: 700, color: t_brand.neutral[500],
              textTransform: 'uppercase', letterSpacing: '0.03em', display: 'block', mb: 0.5,
            }}>
              {domain}
            </Typography>
            <Stack spacing={0.25}>
              {perms.map((p) => (
                <FormControlLabel
                  key={p.id}
                  control={
                    <Checkbox
                      checked={selected.has(p.id)}
                      onChange={() => toggle(p.id)}
                      size="small"
                    />
                  }
                  label={
                    <Box>
                      <Typography sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                        {p.name}
                      </Typography>
                      {p.description && (
                        <Typography variant="caption" sx={{ color: t_brand.neutral[400] }}>
                          {p.description}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              ))}
            </Stack>
          </Box>
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common:cancel')}</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}
          sx={{ bgcolor: t_brand.accent[500], '&:hover': { bgcolor: t_brand.accent[600] } }}>
          {saving ? t('common:saving') : t('common:save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Tenants
   ────────────────────────────────────────────────────────────────────────── */

export function TenantsSettings() {
  const { t } = useTranslation('smartpos');
  const { user } = useAuth();

  const FEATURES = [
    { icon: <IconBuilding size={20} />, text: t('settings:tenants.feature_create') },
    { icon: <IconArrowUpRight size={20} />, text: t('settings:tenants.feature_switch') },
    { icon: <IconCreditCard size={20} />, text: t('settings:tenants.feature_billing') },
    { icon: <IconLock size={20} />, text: t('settings:tenants.feature_isolation') },
    { icon: <IconBuildingStore size={20} />, text: t('settings:tenants.feature_branding') },
  ];

  return (
    <Box>
      <PageHeader
        title={t('settings:tenants.title')}
        subtitle={t('settings:tenants.subtitle')}
        badge={{ label: 'Coming Q3', tone: 'warning' }}
      />

      <Stack spacing={2.5} sx={{ maxWidth: 1680, mx: 'auto' }}>
        {/* Current tenant info */}
        <Box sx={{ ...cardSx, p: 2.5 }}>
          <SectionTitle icon={<IconBuilding size={20} />} title={t('settings:tenants.current_tenant')} />
          <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" sx={{ color: t_brand.neutral[500] }}>
                {t('settings:tenants.tenant_id')}
              </Typography>
              <Typography sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.88rem', color: t_brand.neutral[900] }}>
                {user?.tenantId ?? '—'}
              </Typography>
            </Box>
            <Chip label="Active" size="small"
              sx={{ fontWeight: 600, bgcolor: t_brand.success.light, color: t_brand.success.dark }} />
          </Stack>
        </Box>

        {/* What are tenants */}
        <Box sx={{ ...cardSx, p: 2.5 }}>
          <SectionTitle icon={<IconBuilding size={20} />} title={t('settings:tenants.what_are_tenants')} />
          <Typography variant="body2" sx={{ color: t_brand.neutral[600], lineHeight: 1.7 }}>
            {t('settings:tenants.tenant_description')}
          </Typography>
        </Box>

        {/* Planned features */}
        <Box sx={{ ...cardSx, p: 2.5 }}>
          <SectionTitle icon={<IconChartBar size={20} />} title={t('settings:tenants.features_title')} />
          <Stack spacing={1.25}>
            {FEATURES.map((f, i) => (
              <Stack key={i} direction="row" spacing={1.5} alignItems="center"
                sx={{
                  p: 1.5, borderRadius: 2,
                  bgcolor: t_brand.neutral[50],
                  border: `1px solid ${t_brand.neutral[100]}`,
                }}>
                <Box sx={{ color: t_brand.primary[500] }}>{f.icon}</Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: t_brand.neutral[800] }}>
                  {f.text}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Locale (unchanged from prior implementation)
   ────────────────────────────────────────────────────────────────────────── */

export function LocaleSettings() {
  useTranslation('smartpos');
  const current = getSmartPosLocale();
  const pick = (code: SmartPosLocale) => setSmartPosLocale(code);

  return (
    <Box>
      <PageHeader
        title="Localization"
        subtitle="Language, currency format, tax rules"
      />
      <Box sx={{ ...cardSx, p: 2.5, maxWidth: 640 }}>
        <SectionTitle icon={<IconBuilding size={20} />} title="Display language" />
        <Typography variant="body2" sx={{ color: t_brand.neutral[500], mb: 2 }}>
          Applies to every page in this browser. Saved to local storage.
        </Typography>

        <Stack spacing={1.5}>
          {SMARTPOS_LOCALES.map((l) => {
            const selected = l.code === current;
            return (
              <Box
                key={l.code}
                onClick={() => pick(l.code)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 2,
                  p: 2, borderRadius: 2, cursor: 'pointer',
                  border: `1px solid ${selected ? t_brand.primary[500] : t_brand.neutral[200]}`,
                  bgcolor: selected ? t_brand.primary[50] : 'transparent',
                  transition: 'all 0.15s',
                  '&:hover': { borderColor: t_brand.primary[500] },
                }}
              >
                <Typography component="span" sx={{ fontSize: 28 }}>{l.flag}</Typography>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontWeight: 700 }}>{l.label}</Typography>
                  <Typography variant="caption" sx={{ color: t_brand.neutral[500] }}>
                    {l.code.toUpperCase()}
                  </Typography>
                </Box>
                {selected && (
                  <Typography
                    variant="caption"
                    sx={{ color: t_brand.primary[700], fontWeight: 700, letterSpacing: '0.08em' }}
                  >
                    ACTIVE
                  </Typography>
                )}
              </Box>
            );
          })}
        </Stack>
      </Box>
      <Alert severity="info" sx={{ mt: 2, maxWidth: 640 }}>
        Per-user persistence, currency formatting, and tax-rule presets land in a later phase.
      </Alert>
    </Box>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Legacy placeholder (kept for backwards compat if referenced elsewhere)
   ────────────────────────────────────────────────────────────────────────── */

export function SettingsPlaceholder({
  title, subtitle, info,
}: { title: string; subtitle: string; info: string }) {
  return (
    <Box>
      <PageHeader title={title} subtitle={subtitle} />
      <Alert severity="info">{info}</Alert>
    </Box>
  );
}
