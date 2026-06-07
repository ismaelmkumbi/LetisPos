/**
 * Users & Roles — tenant admin page for managing staff, roles, and permissions.
 * Dedicated page (extracted from SettingsPlaceholder to be its own route).
 *
 * Features:
 *   Users tab  — list, search, edit, activate/deactivate, assign warehouses, INVITE
 *   Roles tab  — create, edit, delete, assign permissions per role
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
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
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  IconBuildingWarehouse,
  IconEdit,
  IconLock,
  IconMail,
  IconPlus,
  IconSearch,
  IconShieldLock,
  IconTrash,
  IconUsers,
  IconUserPlus,
} from '@tabler/icons-react';
import PageHeader from 'src/components/smartpos/PageHeader';
import DataTable, { type Column, StatusBadge } from 'src/components/smartpos/DataTable';
import { brand } from 'src/theme/smartpos/brand';
import { premiumFieldSx } from 'src/components/smartpos/PosLayouts/shared';
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
import { register as inviteUserApi, type RegisterPayload } from 'src/api/smartpos/auth';
import { listWarehouses, type Warehouse } from 'src/api/smartpos/inventory';
import type { UUID } from 'src/api/smartpos/types';

// ── Helpers ──────────────────────────────────────────────────────────────────

const fieldSx = (theme: any) => {
  const base = premiumFieldSx(theme);
  return {
    ...base,
    '& .MuiOutlinedInput-root': { ...base['& .MuiOutlinedInput-root'], borderRadius: '10px' },
  };
};

function userName(u: UserDto | null): string {
  if (!u) return '';
  return [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email;
}

// ── Main component ───────────────────────────────────────────────────────────

export default function UsersRolesPage() {
  const { t } = useTranslation('smartpos');
  const [tab, setTab] = useState<'users' | 'roles'>('users');

  return (
    <Box>
      <PageHeader
        title={t('settings.users.title')}
        subtitle={t('settings.users.subtitle')}
        badge={{ label: 'Enterprise', tone: 'primary' }}
        breadcrumbs={[
          { label: 'Dashboard', href: '/smartpos' },
          { label: 'Settings' },
          { label: 'Users & Roles' },
        ]}
      />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2.5 }}>
        <Tab value="users" label={t('settings.users.users_tab')} icon={<IconUsers size={18} />} iconPosition="start" />
        <Tab value="roles" label={t('settings.users.roles_tab')} icon={<IconShieldLock size={18} />} iconPosition="start" />
      </Tabs>
      {tab === 'users' && <UsersTab />}
      {tab === 'roles' && <RolesTab />}
    </Box>
  );
}

// ── Users Tab ────────────────────────────────────────────────────────────────

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
  const [inviteOpen, setInviteOpen] = useState(false);

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
      showInfo(t('settings.users.status_toggled'));
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
      showInfo(t('settings.users.user_saved'));
      fetchUsers(page, search);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('settings.users.user_save_failed'));
    }
  };

  const userColumns = useMemo<Column<UserDto>[]>(
    () => [
      {
        key: 'name', label: 'Name', width: 240, sortable: true,
        render: (u) => (
          <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{
              width: 32, height: 32, borderRadius: 2,
              bgcolor: brand.primary[100], color: brand.primary[700],
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '0.75rem',
            }}>
              {(u.firstName?.[0] ?? u.email[0]).toUpperCase()}
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: '0.82rem' }}>
              {userName(u)}
            </Typography>
          </Stack>
        ),
      },
      {
        key: 'email', label: 'Email', width: 220, sortable: true,
        render: (u) => <Typography sx={{ fontSize: '0.8rem', color: brand.neutral[600] }}>{u.email}</Typography>,
      },
      {
        key: 'roles', label: 'Roles', width: 220,
        render: (u) => (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" rowGap={0.5}>
            {u.roles.slice(0, 3).map((r) => (
              <Chip key={r} label={r} size="small" sx={{
                fontSize: '0.7rem', fontWeight: 600,
                bgcolor: brand.primary[50], color: brand.primary[700],
              }} />
            ))}
            {u.roles.length > 3 && (
              <Tooltip title={u.roles.slice(3).join(', ')}>
                <Chip label={`+${u.roles.length - 3}`} size="small" sx={{
                  fontSize: '0.7rem', fontWeight: 600,
                  bgcolor: brand.neutral[100], color: brand.neutral[600],
                }} />
              </Tooltip>
            )}
          </Stack>
        ),
      },
      {
        key: 'active', label: 'Status', align: 'center', width: 100, sortable: true,
        render: (u) => (
          <StatusBadge
            label={u.active ? t('settings.users.active') : t('settings.users.inactive')}
            tone={u.active ? 'success' : 'neutral'}
          />
        ),
      },
      {
        key: 'actions', label: '', align: 'right', width: 150, enableHiding: false,
        render: (u) => (
          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
            <Tooltip title="Edit user">
              <IconButton size="small" onClick={() => { setEditingUser(u); setEditOpen(true); }}>
                <IconEdit size={16} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Assign warehouses">
              <IconButton size="small" onClick={() => { setWarehouseUser(u); setWarehouseOpen(true); }}>
                <IconBuildingWarehouse size={16} />
              </IconButton>
            </Tooltip>
            <Tooltip title={u.active ? 'Deactivate' : 'Activate'}>
              <IconButton size="small" onClick={() => setStatusConfirm(u)}>
                <IconLock size={16} color={u.active ? brand.warning.dark : brand.success.dark} />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },
    ],
    [t],
  );

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {info && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setInfo(null)}>{info}</Alert>}

      <DataTable
        columns={userColumns}
        rows={users}
        loading={loading}
        emptyText={t('settings.users.no_users')}
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
          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              placeholder={t('settings.users.search_users')}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              sx={(theme) => ({ minWidth: 240, ...fieldSx(theme) })}
              InputProps={{
                startAdornment: <InputAdornment position="start"><IconSearch size={18} /></InputAdornment>,
              }}
            />
            <Button
              variant="contained"
              startIcon={<IconUserPlus size={16} />}
              onClick={() => setInviteOpen(true)}
              sx={{
                bgcolor: brand.accent[500], '&:hover': { bgcolor: brand.accent[600] },
                textTransform: 'none', fontWeight: 700, borderRadius: '10px',
              }}
            >
              Invite User
            </Button>
          </Stack>
        }
      />

      {/* Edit User Dialog */}
      <EditUserDialog open={editOpen} user={editingUser} onSave={handleSaveUser} onClose={() => setEditOpen(false)} />

      {/* Status Toggle Dialog */}
      <Dialog open={!!statusConfirm} onClose={() => setStatusConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {statusConfirm?.active ? 'Deactivate user?' : 'Activate user?'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: brand.neutral[600] }}>
            {statusConfirm?.active
              ? `${userName(statusConfirm)} will no longer be able to sign in.`
              : `${userName(statusConfirm!)} will regain access to their account.`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusConfirm(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleToggleStatus} color={statusConfirm?.active ? 'warning' : 'success'}>
            {statusConfirm?.active ? 'Deactivate' : 'Activate'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Warehouses Dialog */}
      <AssignWarehousesDialog
        open={warehouseOpen} user={warehouseUser}
        onClose={() => setWarehouseOpen(false)}
        onAssigned={() => { setWarehouseOpen(false); showInfo('Warehouses updated'); fetchUsers(page, search); }}
      />

      {/* Invite User Dialog */}
      <InviteUserDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={() => { setInviteOpen(false); showInfo('Invite sent — user can now sign in'); fetchUsers(page, search); }}
      />
    </Box>
  );
}

// ── Invite User Dialog ───────────────────────────────────────────────────────

function InviteUserDialog({
  open, onClose, onInvited,
}: {
  open: boolean; onClose: () => void; onInvited: () => void;
}) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setEmail(''); setFirstName(''); setLastName(''); setPassword(''); setError(null);
  };

  const handleInvite = async () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    if (!password.trim() || password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body: RegisterPayload = {
        email: email.trim(),
        password: password.trim(),
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
      };
      await inviteUserApi(body);
      reset();
      onInvited();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to invite user');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <IconMail size={20} />
          <Typography sx={{ fontWeight: 700 }}>Invite a team member</Typography>
        </Stack>
        <Typography variant="body2" sx={{ color: brand.neutral[500], fontWeight: 400, mt: 0.5 }}>
          They will receive a verification email and can sign in immediately. New users get the
          <strong> CASHIER </strong> role by default — you can edit their role afterwards from the Users list.
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
          <Stack direction="row" spacing={1.5}>
            <TextField fullWidth size="small" label="First name" value={firstName}
              onChange={(e) => setFirstName(e.target.value)} sx={(theme) => fieldSx(theme)} />
            <TextField fullWidth size="small" label="Last name" value={lastName}
              onChange={(e) => setLastName(e.target.value)} sx={(theme) => fieldSx(theme)} />
          </Stack>
          <TextField fullWidth size="small" label="Email address *" type="email" required value={email}
            onChange={(e) => setEmail(e.target.value)} sx={(theme) => fieldSx(theme)} />
          <TextField fullWidth size="small" label="Password *" type="password" required value={password}
            onChange={(e) => setPassword(e.target.value)} sx={(theme) => fieldSx(theme)}
            helperText="At least 8 characters. They can change it after signing in." />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleInvite} disabled={submitting}
          sx={{ bgcolor: brand.accent[500], '&:hover': { bgcolor: brand.accent[600] }, textTransform: 'none', fontWeight: 700 }}>
          {submitting ? 'Sending invite…' : 'Send Invite'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Edit User Dialog ─────────────────────────────────────────────────────────

function EditUserDialog({
  open, user, onSave, onClose,
}: {
  open: boolean; user: UserDto | null; onSave: () => void; onClose: () => void;
}) {
  const [edit, setEdit] = useState<UserDto | null>(null);

  useEffect(() => { if (user) setEdit({ ...user }); }, [user]);

  if (!edit) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit user</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Stack direction="row" spacing={1.5}>
            <TextField fullWidth size="small" label="First name" value={edit.firstName}
              onChange={(e) => setEdit({ ...edit, firstName: e.target.value })}
              sx={(theme) => premiumFieldSx(theme)} />
            <TextField fullWidth size="small" label="Last name" value={edit.lastName}
              onChange={(e) => setEdit({ ...edit, lastName: e.target.value })}
              sx={(theme) => premiumFieldSx(theme)} />
          </Stack>
          <TextField fullWidth size="small" label="Email" value={edit.email} disabled
            sx={(theme) => premiumFieldSx(theme)} />
          <TextField fullWidth size="small" label="Phone" value={edit.phone}
            onChange={(e) => setEdit({ ...edit, phone: e.target.value })}
            sx={(theme) => premiumFieldSx(theme)} />
          <FormControlLabel
            control={<Switch checked={edit.isAllWarehouses}
              onChange={(_, v) => setEdit({ ...edit, isAllWarehouses: v })} />}
            label="All warehouses"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={onSave}
          sx={{ bgcolor: brand.accent[500], '&:hover': { bgcolor: brand.accent[600] } }}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Assign Warehouses Dialog ─────────────────────────────────────────────────

function AssignWarehousesDialog({
  open, user, onClose, onAssigned,
}: {
  open: boolean; user: UserDto | null; onClose: () => void; onAssigned: () => void;
}) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selected, setSelected] = useState<Set<UUID>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && user) {
      setSelected(new Set(user.warehouseIds));
      listWarehouses().then((w) => setWarehouses(w.filter((x) => x.active))).catch(() => {});
    }
  }, [open, user]);

  const toggle = (id: UUID) => {
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try { await assignUserWarehouses(user.id, Array.from(selected)); onAssigned(); }
    catch { /* handled by parent */ }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Assign warehouses</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: brand.neutral[500], mb: 2 }}>
          {user ? userName(user) : ''}
        </Typography>
        <Stack spacing={0.5}>
          {warehouses.map((w) => (
            <FormControlLabel key={w.id}
              control={<Checkbox checked={selected.has(w.id)} onChange={() => toggle(w.id)} size="small" />}
              label={w.name} />
          ))}
          {warehouses.length === 0 && (
            <Typography variant="body2" sx={{ color: brand.neutral[400] }}>No warehouses found.</Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}
          sx={{ bgcolor: brand.accent[500], '&:hover': { bgcolor: brand.accent[600] } }}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Roles Tab ────────────────────────────────────────────────────────────────

function RolesTab() {
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
    setLoading(true); setError(null);
    try { const [r, p] = await Promise.all([listRoles(), listPermissions()]); setRoles(r); setPermissions(p); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to load roles'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const showInfo = (msg: string) => { setInfo(msg); setTimeout(() => setInfo(null), 3000); };

  const handleCreate = () => { setEditingRole({ name: '', label: '', description: '' }); setIsNew(true); setEditOpen(true); };
  const handleEdit = (role: RoleDto) => { setEditingRole({ ...role }); setIsNew(false); setEditOpen(true); };

  const handleSaveRole = async () => {
    if (!editingRole) return;
    try {
      if (isNew) {
        await createRole({ name: editingRole.name!, label: editingRole.label, description: editingRole.description });
      } else {
        await updateRole(editingRole.id!, { name: editingRole.name!, label: editingRole.label, description: editingRole.description });
      }
      setEditOpen(false); showInfo('Role saved'); fetchData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save role');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try { await deleteRole(deleteConfirm.id); setDeleteConfirm(null); showInfo('Role deleted'); fetchData(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to delete role'); }
  };

  const roleColumns = useMemo<Column<RoleDto>[]>(
    () => [
      {
        key: 'name', label: 'Name', width: 180,
        render: (r) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.82rem' }}>{r.name}</Typography>,
      },
      {
        key: 'label', label: 'Label', width: 180,
        render: (r) => <Typography sx={{ fontSize: '0.82rem' }}>{r.label || '—'}</Typography>,
      },
      {
        key: 'permissions', label: 'Permissions', width: 160,
        render: (r) => (
          <Tooltip title={r.permissions.join(', ') || 'None'}>
            <Chip label={`${r.permissions.length} permissions`} size="small"
              sx={{ fontSize: '0.7rem', fontWeight: 600, bgcolor: brand.primary[50], color: brand.primary[700], cursor: 'pointer' }} />
          </Tooltip>
        ),
      },
      {
        key: 'isSystem', label: 'Type', align: 'center', width: 100,
        render: (r) => r.isSystem
          ? <StatusBadge label="System" tone="warning" />
          : <Typography sx={{ fontSize: '0.78rem', color: brand.neutral[400] }}>Custom</Typography>,
      },
      {
        key: 'actions', label: '', align: 'right', width: 150, enableHiding: false,
        render: (r) => (
          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
            <Tooltip title="Manage permissions">
              <IconButton size="small" onClick={() => { setPermRole(r); setPermOpen(true); }}>
                <IconLock size={16} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit"><IconButton size="small" onClick={() => handleEdit(r)}><IconEdit size={16} /></IconButton></Tooltip>
            <Tooltip title={r.isSystem ? 'System roles cannot be deleted' : 'Delete'}>
              <span><IconButton size="small" disabled={r.isSystem} onClick={() => setDeleteConfirm(r)}>
                <IconTrash size={16} color={r.isSystem ? brand.neutral[300] : brand.error.main} />
              </IconButton></span>
            </Tooltip>
          </Stack>
        ),
      },
    ],
    [],
  );

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {info && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setInfo(null)}>{info}</Alert>}

      <DataTable
        columns={roleColumns} rows={roles} loading={loading}
        emptyText="No roles defined yet." getRowKey={(r) => r.id}
        tableKey="roles" enableSorting enableExport enableColumnVisibility
        exportFileName="roles-export"
        toolbarTitle={roles.length > 0 ? `${roles.length} roles` : undefined}
        toolbar={
          <Button variant="contained" startIcon={<IconPlus size={16} />} onClick={handleCreate}
            sx={{ bgcolor: brand.accent[500], '&:hover': { bgcolor: brand.accent[600] }, textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}>
            Create Role
          </Button>
        }
      />

      {/* Create/Edit Role Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{isNew ? 'Create role' : 'Edit role'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField fullWidth size="small" label="Role name (slug)" required value={editingRole?.name ?? ''}
              onChange={(e) => setEditingRole((prev) => ({ ...prev, name: e.target.value }))}
              sx={(theme) => premiumFieldSx(theme)} helperText="e.g. 'PHARMACIST' or 'STORE_CASHIER'" />
            <TextField fullWidth size="small" label="Display label" value={editingRole?.label ?? ''}
              onChange={(e) => setEditingRole((prev) => ({ ...prev, label: e.target.value }))}
              sx={(theme) => premiumFieldSx(theme)} />
            <TextField fullWidth size="small" label="Description" multiline minRows={2}
              value={editingRole?.description ?? ''}
              onChange={(e) => setEditingRole((prev) => ({ ...prev, description: e.target.value }))}
              sx={(theme) => premiumFieldSx(theme)} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveRole} disabled={!editingRole?.name?.trim()}
            sx={{ bgcolor: brand.accent[500], '&:hover': { bgcolor: brand.accent[600] } }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Role Dialog */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete role?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: brand.neutral[600] }}>
            Permanently delete "{deleteConfirm?.name}". Users assigned to this role will lose those permissions.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Manage Permissions Dialog */}
      <ManagePermissionsDialog
        open={permOpen} role={permRole} allPermissions={permissions}
        onClose={() => setPermOpen(false)}
        onUpdated={() => { setPermOpen(false); showInfo('Permissions updated'); fetchData(); }}
      />
    </Box>
  );
}

// ── Manage Permissions Dialog ────────────────────────────────────────────────

function ManagePermissionsDialog({
  open, role, allPermissions, onClose, onUpdated,
}: {
  open: boolean; role: RoleDto | null; allPermissions: PermissionDto[]; onClose: () => void; onUpdated: () => void;
}) {
  const [selected, setSelected] = useState<Set<UUID>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && role) {
      const rolePermIds = allPermissions.filter((p) => role.permissions.includes(p.name)).map((p) => p.id);
      setSelected(new Set(rolePermIds));
    }
  }, [open, role, allPermissions]);

  const toggle = (id: UUID) => {
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const handleSave = async () => {
    if (!role) return;
    setSaving(true);
    try { await setRolePermissions(role.id, Array.from(selected)); onUpdated(); }
    catch { /* handled by parent */ }
    finally { setSaving(false); }
  };

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
        Manage permissions
        {role && <Typography variant="body2" sx={{ color: brand.neutral[500], fontWeight: 400, mt: 0.5 }}>{role.name}</Typography>}
      </DialogTitle>
      <DialogContent>
        {groups.map(([domain, perms]) => (
          <Box key={domain} sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{
              fontWeight: 700, color: brand.neutral[500], textTransform: 'uppercase',
              letterSpacing: '0.03em', display: 'block', mb: 0.5,
            }}>
              {domain}
            </Typography>
            <Stack spacing={0.25}>
              {perms.map((p) => (
                <FormControlLabel key={p.id}
                  control={<Checkbox checked={selected.has(p.id)} onChange={() => toggle(p.id)} size="small" />}
                  label={
                    <Box>
                      <Typography sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{p.name}</Typography>
                      {p.description && <Typography variant="caption" sx={{ color: brand.neutral[400] }}>{p.description}</Typography>}
                    </Box>
                  } />
              ))}
            </Stack>
          </Box>
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}
          sx={{ bgcolor: brand.accent[500], '&:hover': { bgcolor: brand.accent[600] } }}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
