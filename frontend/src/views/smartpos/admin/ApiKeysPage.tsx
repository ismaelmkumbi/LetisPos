import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormGroup,
  FormControlLabel,
  Checkbox,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  IconKey,
  IconPlus,
  IconTrash,
  IconRefresh,
  IconCopy,
} from '@tabler/icons-react';

import {
  listApiKeys,
  createApiKey,
  revokeApiKey,
  rotateApiKey,
  type ApiKeyData,
} from 'src/api/smartpos/audit';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { brand } from 'src/theme/smartpos/brand';

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  ACTIVE: { bg: brand.success.light, color: brand.success.dark },
  REVOKED: { bg: brand.error.light, color: brand.error.dark },
  EXPIRED: { bg: brand.warning.light, color: brand.warning.dark },
};

function statusChip(status: string) {
  const c = STATUS_COLORS[status] ?? { bg: brand.neutral[100], color: brand.neutral[600] };
  return (
    <Chip
      label={status}
      size="small"
      sx={{
        height: 20,
        fontWeight: 700,
        fontSize: '0.625rem',
        letterSpacing: '0.04em',
        borderRadius: '5px',
        bgcolor: c.bg,
        color: c.color,
        '& .MuiChip-label': { px: 0.875 },
      }}
    />
  );
}

function formatTs(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const SCOPE_CATEGORIES: { category: string; scopes: string[] }[] = [
  { category: 'Products', scopes: ['product:read', 'product:write'] },
  { category: 'Sales', scopes: ['sale:read', 'sale:write'] },
  { category: 'Inventory', scopes: ['inventory:read', 'inventory:write'] },
  { category: 'Customers', scopes: ['customer:read', 'customer:write'] },
  { category: 'Suppliers', scopes: ['supplier:read', 'supplier:write'] },
  { category: 'Finance', scopes: ['finance:read', 'finance:write'] },
  { category: 'Reports', scopes: ['report:read'] },
  { category: 'Admin', scopes: ['admin:read', 'admin:write'] },
];

export default function ApiKeysPage() {
  const [rows, setRows] = useState<ApiKeyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createLabel, setCreateLabel] = useState('');
  const [createScopes, setCreateScopes] = useState<string[]>([]);
  const [createExpiry, setCreateExpiry] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Secret reveal
  const [secret, setSecret] = useState<string | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);

  // Revoke confirm
  const [revokeTarget, setRevokeTarget] = useState<ApiKeyData | null>(null);
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listApiKeys()
      .then((data) => {
        if (!cancelled) {
          setRows(data);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load API keys');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  const toggleScope = (scope: string) => {
    setCreateScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  };

  const handleCreate = async () => {
    if (!createLabel.trim()) {
      setFormError('Label is required.');
      return;
    }
    if (createScopes.length === 0) {
      setFormError('Select at least one scope.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const result = await createApiKey({
        label: createLabel.trim(),
        scopes: createScopes,
        ...(createExpiry ? { expiresAt: new Date(createExpiry).toISOString() } : {}),
      });
      setRefreshToken((n) => n + 1);
      setCreateOpen(false);
      setCreateLabel('');
      setCreateScopes([]);
      setCreateExpiry('');
      setSecret(result.secret);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      await revokeApiKey(revokeTarget.id);
      setRefreshToken((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Revoke failed');
    } finally {
      setRevoking(false);
      setRevokeTarget(null);
    }
  };

  const handleRotate = async (key: ApiKeyData) => {
    try {
      const result = await rotateApiKey(key.id);
      setRefreshToken((n) => n + 1);
      setSecret(result.secret);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Rotation failed');
    }
  };

  const copySecret = useCallback(() => {
    if (!secret) return;
    navigator.clipboard.writeText(secret).then(() => {
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 3000);
    });
  }, [secret]);

  const columns: Column<ApiKeyData>[] = useMemo(
    () => [
      {
        key: 'label',
        label: 'Label',
        sortable: true,
        exportValue: (k) => k.label,
        render: (k) => (
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
            <Box
              sx={{
                width: 30,
                height: 30,
                borderRadius: '8px',
                bgcolor: brand.primary[50],
                color: brand.primary[700],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 12,
                border: `1px solid ${brand.neutral[200]}`,
                flexShrink: 0,
              }}
            >
              <IconKey size={15} />
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 600, color: brand.neutral[800], fontSize: '0.8125rem' }} noWrap>
              {k.label}
            </Typography>
          </Stack>
        ),
      },
      {
        key: 'prefix',
        label: 'Prefix',
        sortable: false,
        exportValue: (k) => k.prefix,
        render: (k) => (
          <Typography variant="body2" sx={{ color: brand.neutral[500], fontSize: '0.75rem', fontFamily: 'monospace' }} noWrap>
            {k.prefix}****
          </Typography>
        ),
      },
      {
        key: 'scopes',
        label: 'Scopes',
        sortable: false,
        exportValue: (k) => k.scopes.join(', '),
        render: (k) => (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5 }}>
            {k.scopes.slice(0, 3).map((s) => (
              <Chip
                key={s}
                label={s}
                size="small"
                sx={{
                  height: 18,
                  fontWeight: 600,
                  fontSize: '0.6rem',
                  borderRadius: '4px',
                  bgcolor: brand.info.light,
                  color: brand.info.dark,
                }}
              />
            ))}
            {k.scopes.length > 3 && (
              <Tooltip title={k.scopes.slice(3).join(', ')}>
                <Chip
                  label={`+${k.scopes.length - 3}`}
                  size="small"
                  sx={{ height: 18, fontWeight: 600, fontSize: '0.6rem', borderRadius: '4px' }}
                />
              </Tooltip>
            )}
          </Stack>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        align: 'center',
        width: 100,
        sortable: true,
        exportValue: (k) => k.status,
        render: (k) => statusChip(k.status),
      },
      {
        key: 'createdAt',
        label: 'Created',
        sortable: true,
        exportValue: (k) => k.createdAt,
        render: (k) => (
          <Typography variant="body2" sx={{ color: brand.neutral[600], fontSize: '0.8125rem' }} noWrap>
            {formatTs(k.createdAt)}
          </Typography>
        ),
      },
      {
        key: 'actions',
        label: '',
        align: 'right',
        width: 100,
        enableHiding: false,
        exportValue: () => '',
        render: (k) =>
          k.status === 'ACTIVE' ? (
            <Stack direction="row" spacing={0.25} justifyContent="flex-end">
              <Tooltip title="Rotate">
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleRotate(k); }} sx={{ color: brand.neutral[400] }}>
                  <IconRefresh size={14} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Revoke">
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); setRevokeTarget(k); }}
                  sx={{ color: brand.error.main }}
                >
                  <IconTrash size={14} />
                </IconButton>
              </Tooltip>
            </Stack>
          ) : null,
      },
    ],
    [],
  );

  return (
    <Box>
      <PageHeader
        title="API Keys"
        subtitle="Manage API keys for integrations"
        actions={[
          {
            label: 'Create API key',
            icon: <IconPlus size={18} />,
            onClick: () => setCreateOpen(true),
          },
        ]}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyText="No API keys configured yet"
        emptyIcon={<IconKey size={32} />}
        getRowKey={(k) => k.id}
        tableKey="api-keys"
        toolbarTitle={rows.length > 0 ? `${rows.length} API keys` : undefined}
        enableSorting
        enableColumnVisibility
        enableExport
        exportFileName={`api-keys-${new Date().toISOString().slice(0, 10)}`}
        emptyAction={
          rows.length === 0 && !loading
            ? { label: 'Create your first API key', onClick: () => setCreateOpen(true) }
            : undefined
        }
      />

      {/* Create dialog */}
      <Dialog
        open={createOpen}
        onClose={() => !submitting && setCreateOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px' } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.1rem', pb: 0.5 }}>
          Create API key
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Stack spacing={2.5}>
            <TextField
              label="Label"
              required
              fullWidth
              size="small"
              value={createLabel}
              onChange={(e) => setCreateLabel(e.target.value)}
              helperText="A name to identify this key (e.g. 'Mobile App', 'ERP Integration')"
            />
            <TextField
              label="Expiry date"
              type="date"
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              value={createExpiry}
              onChange={(e) => setCreateExpiry(e.target.value)}
              helperText="Optional. Leave blank for no expiration."
            />
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, color: brand.neutral[700], mb: 1 }}>
                Scopes
              </Typography>
              <Typography variant="caption" sx={{ color: brand.neutral[500], mb: 1.5 }}>
                Selected: {createScopes.length}
              </Typography>
              {SCOPE_CATEGORIES.map((cat) => (
                <Box key={cat.category} sx={{ mb: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: brand.neutral[500], textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {cat.category}
                  </Typography>
                  <FormGroup row>
                    {cat.scopes.map((scope) => (
                      <FormControlLabel
                        key={scope}
                        control={
                          <Checkbox
                            size="small"
                            checked={createScopes.includes(scope)}
                            onChange={() => toggleScope(scope)}
                          />
                        }
                        label={<Typography variant="body2" sx={{ fontSize: '0.75rem' }}>{scope}</Typography>}
                      />
                    ))}
                  </FormGroup>
                </Box>
              ))}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleCreate} disabled={submitting}>
            {submitting ? 'Creating...' : 'Create key'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Secret reveal snackbar */}
      <Dialog
        open={!!secret}
        onClose={() => setSecret(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px' } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.1rem', pb: 0.5 }}>
          API Key Created
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Store this key safely. You will not be able to see it again.
          </Alert>
          <Box
            sx={{
              p: 2,
              borderRadius: '10px',
              bgcolor: brand.neutral[100],
              border: `1px solid ${brand.neutral[200]}`,
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              wordBreak: 'break-all',
              color: brand.neutral[800],
              position: 'relative',
            }}
          >
            {secret}
            <IconButton
              size="small"
              onClick={copySecret}
              sx={{ position: 'absolute', top: 8, right: 8 }}
            >
              <IconCopy size={14} />
            </IconButton>
          </Box>
          {secretCopied && (
            <Typography variant="caption" sx={{ color: brand.success.dark, mt: 0.5, display: 'block' }}>
              Copied to clipboard!
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="contained" onClick={() => { setSecret(null); setSecretCopied(false); }}>
            Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* Revoke confirmation */}
      <Dialog
        open={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Revoke API key?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <strong>{revokeTarget?.label}</strong> will be permanently revoked. This action cannot be undone. Any integrations using this key will stop working.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRevokeTarget(null)} disabled={revoking}>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={handleRevoke} disabled={revoking}>
            {revoking ? 'Revoking...' : 'Revoke'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
