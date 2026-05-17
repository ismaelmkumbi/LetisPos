# Admin Tenant & User Management — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Super admin power panel: full tenant lifecycle (delete/close/disable), cross-tenant user deletion, and route scoping fix.

**Architecture:** Backend adds `AdminUserController` with delete/search endpoints. Frontend adds `RequireAdmin` gate, redesigns `TenantListPage` as power panel with stats/bulk-actions/full-lifecycle-menu, and adds delete confirmations.

**Tech Stack:** Java 21, Spring Boot 3.3, React 18, TypeScript, MUI v5, existing brand tokens.

---

### Task 1: Backend — Admin User Controller (delete + search)

**Files:**
- Create: `backend/auth-service/src/main/java/io/smartpos/auth/api/AdminUserController.java`

- [ ] **Step 1: Create the controller**

```java
package io.smartpos.auth.api;

import io.smartpos.auth.api.dto.DeleteUserRequest;
import io.smartpos.auth.domain.model.User;
import io.smartpos.auth.domain.model.UserStatus;
import io.smartpos.auth.domain.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminUserController {

    private final UserRepository userRepository;

    /** Search all users across all tenants — admin only. */
    @GetMapping("/users")
    @PreAuthorize("hasAuthority('admin')")
    public ResponseEntity<Page<Map<String, Object>>> searchUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) UUID tenantId,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Page<User> users;
        if (tenantId != null) {
            users = userRepository.findByTenantId(tenantId,
                PageRequest.of(page, size, Sort.by("createdAt").descending()));
        } else if (search != null && !search.isBlank()) {
            users = userRepository.findByEmailContainingIgnoreCase(search,
                PageRequest.of(page, size, Sort.by("createdAt").descending()));
        } else {
            users = userRepository.findAll(
                PageRequest.of(page, size, Sort.by("createdAt").descending()));
        }

        var result = users.map(u -> {
            Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("id", u.getId());
            m.put("email", u.getEmail());
            m.put("status", u.getStatus().name());
            m.put("tenantId", u.getTenantId());
            m.put("createdAt", u.getCreatedAt());
            return m;
        });

        return ResponseEntity.ok(result);
    }

    /** Soft-delete a user — admin only. */
    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasAuthority('admin')")
    public ResponseEntity<Void> softDeleteUser(@PathVariable UUID id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                HttpStatus.NOT_FOUND, "User not found"));
        if (user.getStatus() == UserStatus.DELETED) {
            throw new org.springframework.web.server.ResponseStatusException(
                HttpStatus.CONFLICT, "User is already deleted");
        }
        user.setStatus(UserStatus.DELETED);
        userRepository.save(user);
        return ResponseEntity.noContent().build();
    }

    /** Hard-delete a user — admin only, only on already-soft-deleted users. */
    @DeleteMapping("/users/{id}/hard")
    @PreAuthorize("hasAuthority('admin')")
    public ResponseEntity<Void> hardDeleteUser(@PathVariable UUID id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                HttpStatus.NOT_FOUND, "User not found"));
        if (user.getStatus() != UserStatus.DELETED) {
            throw new org.springframework.web.server.ResponseStatusException(
                HttpStatus.CONFLICT, "User must be soft-deleted first before hard delete");
        }
        userRepository.delete(user);
        return ResponseEntity.noContent().build();
    }
}
```

- [ ] **Step 2: Check if UserStatus.DELETED exists**

Read `backend/auth-service/src/main/java/io/smartpos/auth/domain/model/UserStatus.java`. If DELETED doesn't exist, add it.

- [ ] **Step 3: Check UserRepository for needed methods**

Read the UserRepository — confirm `findByTenantId`, `findByEmailContainingIgnoreCase`, `findAll` exist.

- [ ] **Step 4: Build and verify**

```bash
cd /Users/ismaelmkumbi/Desktop/LetisPos/backend && mvn -q compile -pl auth-service
```

- [ ] **Step 5: Commit**

```bash
git add backend/auth-service/src/main/java/io/smartpos/auth/api/AdminUserController.java
git commit -m "feat: add admin user controller — cross-tenant search, soft/hard delete"
```

---

### Task 2: Frontend — RequireAdmin Gate

**Files:**
- Create: `frontend/src/components/smartpos/RequireAdmin.tsx`

- [ ] **Step 1: Create RequireAdmin component**

```typescript
import { Navigate } from 'react-router';
import { useAuth } from 'src/context/smartpos/AuthContext';

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const permissions: string[] = (user as any)?.permissions ?? [];
  if (!permissions.includes('admin')) {
    return <Navigate to="/smartpos/dashboard" replace />;
  }
  return <>{children}</>;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/smartpos/RequireAdmin.tsx
git commit -m "feat: add RequireAdmin permission gate component"
```

---

### Task 3: Frontend — Router Scoping Fix

**Files:**
- Modify: `frontend/src/routes/Router.tsx`

- [ ] **Step 1: Add import**

```typescript
import RequireAdmin from 'src/components/smartpos/RequireAdmin';
```

- [ ] **Step 2: Wrap admin routes**

Find the three admin tenant routes and wrap them:

```typescript
{ path: 'admin/tenants', element: <RequireAuth><RequireAdmin><TenantDashboardPage /></RequireAdmin></RequireAuth> },
{ path: 'admin/tenants/list', element: <RequireAuth><RequireAdmin><TenantListPage /></RequireAdmin></RequireAuth> },
{ path: 'admin/tenants/:id', element: <RequireAuth><RequireAdmin><TenantDetailPage /></RequireAdmin></RequireAuth> },
```

Also wrap `admin/billing`, `admin/billing/plans`, `admin/billing/invoices`, `admin/audit-logs`, `admin/sessions`, `admin/api-keys`, `admin/backups`, `admin/data-retention` with RequireAdmin.

- [ ] **Step 3: Verify**

```bash
/Users/ismaelmkumbi/Desktop/LetisPos/frontend/node_modules/.bin/tsc --noEmit --pretty -p /Users/ismaelmkumbi/Desktop/LetisPos/frontend/tsconfig.json
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/routes/Router.tsx
git commit -m "fix: wrap admin routes with RequireAdmin permission gate"
```

---

### Task 4: Frontend — API additions (delete, disable, close, user search)

**Files:**
- Modify: `frontend/src/api/smartpos/auth.ts`

- [ ] **Step 1: Add new API functions**

Add after the existing tenant API functions:

```typescript
export async function deleteTenant(id: string, hard?: boolean, reason?: string): Promise<void> {
  if (hard) {
    await api.delete(`/api/v1/tenants/${id}`, { params: { hard: true, reason } });
  } else {
    await api.delete(`/api/v1/tenants/${id}`, { data: { reason: reason || 'Admin action' } });
  }
}

export async function disableTenant(id: string, reason: string): Promise<Tenant> {
  const { data } = await api.post<Tenant>(`/api/v1/tenants/${id}/disable`, { reason });
  return data;
}

export async function deleteUser(id: string, hard?: boolean): Promise<void> {
  if (hard) {
    await api.delete(`/api/v1/admin/users/${id}/hard`);
  } else {
    await api.delete(`/api/v1/admin/users/${id}`);
  }
}

export interface UserSearchParams {
  search?: string;
  tenantId?: string;
  status?: string;
  page?: number;
  size?: number;
}

export async function searchAllUsers(params: UserSearchParams = {}): Promise<{ content: Array<{ id: string; email: string; status: string; tenantId: string; createdAt: string }>; totalElements: number }> {
  const { data } = await api.get('/api/v1/admin/users', { params });
  return data;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/api/smartpos/auth.ts
git commit -m "feat: add admin API functions — delete/disable tenant, delete user, user search"
```

---

### Task 5: Frontend — TenantListPage Power Panel Redesign

**Files:**
- Modify: `frontend/src/views/smartpos/admin/TenantListPage.tsx`

- [ ] **Step 1: Add new imports**

```typescript
import {
  deleteTenant,
  disableTenant,
  closeTenant,
  type Tenant,
} from 'src/api/smartpos/auth';
import { IconTrash, IconPlayerPause, IconPlayerPlay, IconDoorExit, IconBan, IconUsers } from '@tabler/icons-react';
```

- [ ] **Step 2: Add stats bar above the table**

```typescript
const stats = useMemo(() => ({
  total: tenants.length,
  active: tenants.filter(t => t.status === 'ACTIVE').length,
  trial: tenants.filter(t => t.status === 'TRIAL').length,
  suspended: tenants.filter(t => t.status === 'SUSPENDED').length,
  deleted: tenants.filter(t => t.status === 'DELETED').length,
}), [tenants]);

// Render above filters:
<Stack direction="row" spacing={2} sx={{ mb: 2 }}>
  {[
    { label: 'Total', value: stats.total, color: brand.neutral[700] },
    { label: 'Active', value: stats.active, color: brand.success.main },
    { label: 'Trial', value: stats.trial, color: brand.info.main },
    { label: 'Suspended', value: stats.suspended, color: brand.warning.main },
    { label: 'Deleted', value: stats.deleted, color: brand.error.main },
  ].map(s => (
    <Box key={s.label} sx={{ flex: 1, bgcolor: '#fff', borderRadius: '10px', p: 2, border: `1px solid ${brand.neutral[200]}`, textAlign: 'center' }}>
      <Typography sx={{ fontSize: '1.5rem', fontWeight: 900, color: s.color }}>{s.value}</Typography>
      <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 600 }}>{s.label}</Typography>
    </Box>
  ))}
</Stack>
```

- [ ] **Step 3: Add checkboxes for bulk selection**

Add `selectedIds` state and checkbox column:
```typescript
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
```

Add to columns array (before name):
```typescript
{
  key: 'select',
  label: '',
  width: 40,
  render: (t) => (
    <Checkbox
      checked={selectedIds.has(t.id)}
      onChange={() => {
        const next = new Set(selectedIds);
        next.has(t.id) ? next.delete(t.id) : next.add(t.id);
        setSelectedIds(next);
      }}
      onClick={(e) => e.stopPropagation()}
      size="small"
    />
  ),
},
```

- [ ] **Step 4: Add bulk actions bar**

```typescript
{selectedIds.size > 0 && (
  <Box sx={{ py: 1, px: 2, mb: 1, bgcolor: brand.primary[50], borderRadius: '8px', display: 'flex', alignItems: 'center', gap: 1 }}>
    <Typography sx={{ fontWeight: 700, fontSize: '0.82rem' }}>{selectedIds.size} selected</Typography>
    <Button size="small" color="warning" onClick={handleBulkSuspend}>Suspend</Button>
    <Button size="small" color="error" startIcon={<IconTrash size={14} />} onClick={handleBulkDelete}>Delete</Button>
  </Box>
)}
```

- [ ] **Step 5: Add full lifecycle actions to MoreMenu**

Add to MoreMenu component:
```typescript
// Props additions:
onClose?: () => void;
onDisable?: () => void;
onDelete?: () => void;

// Menu items:
{(status === 'ACTIVE' || status === 'TRIAL' || status === 'PAST_DUE') && (
  <MenuItem onClick={onDisable}>🚫 Disable</MenuItem>
  <MenuItem onClick={onClose}>❌ Close</MenuItem>
)}
<Divider />
<MenuItem onClick={onDelete} sx={{ color: brand.error.main }}>
  🗑 Delete Tenant
</MenuItem>
```

- [ ] **Step 6: Add delete confirmation dialog**

```typescript
const [deleteDialog, setDeleteDialog] = useState<{ tenant: Tenant } | null>(null);
const [deleteConfirmName, setDeleteConfirmName] = useState('');
const [deleteHard, setDeleteHard] = useState(false);

// Dialog with type-to-confirm:
<Dialog open={!!deleteDialog} onClose={() => setDeleteDialog(null)} maxWidth="sm" fullWidth>
  <DialogTitle sx={{ fontWeight: 800, color: brand.error.main }}>
    ⚠️ Delete Tenant — {deleteDialog?.tenant?.name}
  </DialogTitle>
  <DialogContent>
    <Stack spacing={2}>
      <Typography>This action cannot be undone. All users will lose access immediately.</Typography>
      <FormControl>
        <RadioGroup value={deleteHard ? 'hard' : 'soft'} onChange={(e) => setDeleteHard(e.target.value === 'hard')}>
          <FormControlLabel value="soft" control={<Radio />} label="Soft Delete — data retained 30 days, reversible" />
          <FormControlLabel value="hard" control={<Radio />} label="Hard Delete — immediate, irreversible" />
        </RadioGroup>
      </FormControl>
      <TextField label={`Type "${deleteDialog?.tenant?.name}" to confirm`} value={deleteConfirmName}
        onChange={(e) => setDeleteConfirmName(e.target.value)} fullWidth />
    </Stack>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setDeleteDialog(null)}>Cancel</Button>
    <Button variant="contained" color="error"
      disabled={deleteConfirmName !== deleteDialog?.tenant?.name}
      onClick={handleDelete}>
      {deleteHard ? 'Hard Delete' : 'Soft Delete'}
    </Button>
  </DialogActions>
</Dialog>
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/views/smartpos/admin/TenantListPage.tsx
git commit -m "feat: redesign tenant list as power panel with stats, bulk actions, and delete"
```

---

### Task 6: Frontend — Type check & build verification

- [ ] **Step 1: Type check**

```bash
/Users/ismaelmkumbi/Desktop/LetisPos/frontend/node_modules/.bin/tsc --noEmit --pretty -p /Users/ismaelmkumbi/Desktop/LetisPos/frontend/tsconfig.json
```

Fix any type errors.

- [ ] **Step 2: Verify auth service compiles**

```bash
mvn -f /Users/ismaelmkumbi/Desktop/LetisPos/backend/pom.xml -q compile -pl auth-service
```

- [ ] **Step 3: Commit any fixes**

```bash
git add . && git commit -m "fix: type errors from admin tenant management implementation"
```
