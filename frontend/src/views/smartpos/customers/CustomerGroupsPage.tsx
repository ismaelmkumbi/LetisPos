import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent,
  DialogContentText, DialogTitle, IconButton, Stack, TextField, Typography,
} from '@mui/material';
import { IconPlus, IconTrash } from '@tabler/icons-react';


import {
  createCustomerGroup, deleteCustomerGroup, listCustomerGroups,
  updateCustomerGroup,
  type CustomerGroup, type CustomerGroupInput,
} from 'src/api/smartpos/customerGroups';
import type { Page } from 'src/api/smartpos/types';
import PageHeader from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { brand } from 'src/theme/smartpos/brand';

export default function CustomerGroupsPage() {
  const [rows, setRows] = useState<CustomerGroup[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CustomerGroup | null>(null);
  const [form, setForm] = useState<CustomerGroupInput>({ name: '', description: '', discountPercent: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<CustomerGroup | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setLoading(true);
    listCustomerGroups(page, 50)
      .then((p: Page<CustomerGroup>) => { setRows(p.content); setTotalPages(p.totalPages || 1); })
      .catch((e: unknown) => setError(e instanceof Error ? (e as Error).message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [page, refreshToken]);

  const openCreate = () => {
    setEditTarget(null);
    setForm({ name: '', description: '', discountPercent: 0 });
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (g: CustomerGroup) => {
    setEditTarget(g);
    setForm({ name: g.name, description: g.description ?? '', discountPercent: g.discountPercent });
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError('Name is required.'); return; }
    setSubmitting(true);
    setFormError(null);
    try {
      if (editTarget) {
        await updateCustomerGroup(editTarget.id, form);
      } else {
        await createCustomerGroup(form);
      }
      setDialogOpen(false);
      setRefreshToken((n) => n + 1);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? (e as Error).message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCustomerGroup(deleteTarget.id);
      setDeleteTarget(null);
      setRefreshToken((n) => n + 1);
    } catch (e: unknown) {
      setError(e instanceof Error ? (e as Error).message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<CustomerGroup>[] = [
    {
      key: 'name', label: 'Group Name',
      render: (g) => (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{g.name}</Typography>
      ),
    },
    {
      key: 'discountPercent', label: 'Discount %', align: 'right',
      render: (g) => (
        <Chip
          label={`${g.discountPercent}%`}
          size="small"
          sx={{
            bgcolor: brand.accent[50], color: brand.accent[700],
            fontWeight: 700,
          }}
        />
      ),
    },
    {
      key: 'customerCount', label: 'Customers', align: 'right',
      render: (g) => (
        <Typography variant="body2">{(g.customerCount ?? 0).toLocaleString()}</Typography>
      ),
    },
    {
      key: 'actions',
      label: '',
      align: 'right' as const,
      width: 80,
      enableHiding: false,
      render: (g) => (
        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end"
          onClick={(e) => e.stopPropagation()}>
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(g); }}
            sx={{ color: brand.neutral[400], '&:hover': { color: brand.error.main } }}
          >
            <IconTrash size={16} />
          </IconButton>
        </Stack>
      ),
    },
  ];

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', pb: 3 }}>
      <PageHeader
        title="Customer Groups"
        subtitle="Organise customers into groups with discount tiers"
        action={{
          label: 'New Group',
          icon: <IconPlus size={18} />,
          onClick: openCreate,
        }}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyText="No customer groups yet."
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        getRowKey={(g) => g.id}
        onRowClick={(g) => openEdit(g)}
        tableKey="customer-groups"
        enableSorting
        toolbarTitle="Customer groups"
      />

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editTarget ? 'Edit Group' : 'New Customer Group'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField
              label="Group Name"
              value={form.name}
              onChange={(e) => setForm((f: CustomerGroupInput) => ({ ...f, name: e.target.value }))}
              size="small"
              required
              fullWidth
            />
            <TextField
              label="Description"
              value={form.description}
              onChange={(e) => setForm((f: CustomerGroupInput) => ({ ...f, description: e.target.value }))}
              size="small"
              multiline
              minRows={2}
              fullWidth
            />
            <TextField
              label="Discount %"
              type="number"
              value={form.discountPercent ?? 0}
              onChange={(e) => setForm((f: CustomerGroupInput) => ({ ...f, discountPercent: Number(e.target.value) }))}
              size="small"
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="outlined" onClick={() => setDialogOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={submitting}
            sx={{ fontWeight: 700 }}
          >
            {submitting ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Group</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
            Customers in this group will be unassigned.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="outlined" onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
            disabled={deleting}
            sx={{ fontWeight: 700 }}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
