import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions,
  DialogContent, DialogContentText, DialogTitle, IconButton, Skeleton,
  Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import {
  IconArrowLeft, IconBuildingWarehouse, IconClipboardCheck, IconDeviceFloppy,
  IconEdit, IconTrash,
} from '@tabler/icons-react';

import {
  getStockCount, submitStockCountLines, postStockCount,
  type StockCount, type StockCountLine,
} from 'src/api/smartpos/inventory';
import DataTable, { type Column, StatusBadge } from 'src/components/smartpos/DataTable';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import { brand } from 'src/theme/smartpos/brand';

const countStatusTone: Record<string, 'info' | 'success' | 'neutral'> = {
  OPEN: 'info',
  POSTED: 'success',
  CANCELLED: 'neutral',
};

export default function StockCountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [count, setCount] = useState<StockCount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCount = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const c = await getStockCount(id);
      setCount(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load count');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchCount(); }, [fetchCount]);

  // Editable lines
  const [editingLines, setEditingLines] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [posting, setPosting] = useState(false);
  const [confirmPostOpen, setConfirmPostOpen] = useState(false);

  const startEditing = (lineId: string, currentQty: number) => {
    setEditingLines((e) => ({ ...e, [lineId]: currentQty }));
  };
  const cancelEditing = (lineId: string) => {
    setEditingLines((e) => { const n = { ...e }; delete n[lineId]; return n; });
  };
  const setCountedQty = (lineId: string, qty: number) => {
    setEditingLines((e) => ({ ...e, [lineId]: qty }));
  };

  const hasEdits = Object.keys(editingLines).length > 0;

  const handleSubmitLines = async () => {
    if (!id || !hasEdits) return;
    setSubmitting(true);
    try {
      const lines = Object.entries(editingLines).map(([productId, countedQty]) => ({
        productId,
        countedQty,
      }));
      const updated = await submitStockCountLines(id, lines);
      setCount(updated);
      setEditingLines({});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit lines');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePost = async () => {
    if (!id) return;
    setPosting(true);
    try {
      const updated = await postStockCount(id);
      setCount(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to post count');
    } finally {
      setPosting(false);
      setConfirmPostOpen(false);
    }
  };

  const columns: Column<StockCountLine>[] = useMemo(() => [
    {
      key: 'productId', label: 'Product ID', width: 240,
      render: (l) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
          {l.productId.slice(0, 12)}…
        </Typography>
      ),
    },
    {
      key: 'systemQty', label: 'System qty', align: 'right', width: 110, sortable: true,
      render: (l) => (
        <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          {l.systemQty}
        </Typography>
      ),
    },
    {
      key: 'countedQty', label: 'Counted qty', align: 'right', width: 140,
      render: (l) => {
        const editing = l.id !== undefined && l.id in editingLines;
        if (count?.status !== 'OPEN') {
          return (
            <Typography variant="body2" sx={{
              fontWeight: 700, fontVariantNumeric: 'tabular-nums',
              color: (l.countedQty !== l.systemQty) ? brand.warning.dark : brand.success.dark,
            }}>
              {l.countedQty}
            </Typography>
          );
        }
        if (editing) {
          return (
            <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
              <TextField
                type="number"
                size="small"
                value={editingLines[l.id!]}
                onChange={(e) => setCountedQty(l.id!, Number(e.target.value))}
                sx={{ width: 90, '& input': { textAlign: 'right', fontWeight: 700 } }}
              />
              <Tooltip title="Save">
                <IconButton size="small" onClick={() => {
                  handleSubmitLines();
                }} sx={{ color: brand.success.dark }}>
                  <IconDeviceFloppy size={16} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Cancel">
                <IconButton size="small" onClick={() => cancelEditing(l.id!)} sx={{ color: brand.neutral[400] }}>
                  <IconTrash size={14} />
                </IconButton>
              </Tooltip>
            </Stack>
          );
        }
        return (
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
            <Typography
              variant="body2"
              sx={{
                fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                color: (l.countedQty !== l.systemQty) ? brand.warning.dark : brand.success.dark,
                cursor: 'pointer',
                '&:hover': { textDecoration: 'underline' },
              }}
              onClick={() => startEditing(l.id!, l.countedQty)}
            >
              {l.countedQty}
            </Typography>
            <IconButton size="small" onClick={() => startEditing(l.id!, l.countedQty)}>
              <IconEdit size={12} color={brand.neutral[400]} />
            </IconButton>
          </Stack>
        );
      },
    },
    {
      key: 'difference', label: 'Δ Diff', align: 'right', width: 100, sortable: true,
      render: (l) => {
        const diff = l.difference ?? l.countedQty - l.systemQty;
        if (diff === 0) return <Typography variant="body2" sx={{ color: brand.neutral[400] }}>0</Typography>;
        const sign = diff > 0 ? '+' : '';
        return (
          <Chip
            size="small"
            label={`${sign}${diff}`}
            sx={{
              height: 22, fontWeight: 700, fontSize: '0.6875rem',
              bgcolor: diff > 0 ? brand.success.light : brand.error.light,
              color: diff > 0 ? brand.success.dark : brand.error.dark,
            }}
          />
        );
      },
    },
  ], [count?.status, editingLines]);

  if (loading) {
    return (
      <Box>
        <Stack spacing={3}>
          <Skeleton variant="rounded" height={48} width={320} />
          <Skeleton variant="rounded" height={120} />
          <Skeleton variant="rounded" height={300} />
        </Stack>
      </Box>
    );
  }

  if (error || !count) {
    return (
      <Box>
        <Alert severity="error" action={
          <Button size="small" onClick={() => navigate('/smartpos/stock/counts')}>
            Back to stock counts
          </Button>
        }>
          {error ?? 'Stock count not found'}
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title={count.ref}
        subtitle="Stock count session"
        action={count.status === 'OPEN' ? {
          label: 'Post & apply',
          icon: <IconClipboardCheck size={18} />,
          onClick: () => setConfirmPostOpen(true),
        } : undefined}
      />

      <Stack direction="row" spacing={0.75} sx={{ mb: 3 }}>
        <Button
          size="small" variant="text"
          onClick={() => navigate('/smartpos/stock/counts')}
          sx={{ fontWeight: 600, fontSize: '0.75rem', color: brand.neutral[600], minWidth: 0 }}
        >
          <IconArrowLeft size={14} style={{ marginRight: 4 }} />
          All counts
        </Button>
      </Stack>

      {/* Info card */}
      <Card sx={{
        borderRadius: '14px', border: `1px solid ${brand.neutral[200]}`,
        boxShadow: `0 1px 2px ${brand.neutral[900]}06, 0 4px 12px ${brand.neutral[900]}05`,
        mb: 3,
      }}>
        <CardContent sx={{ p: 2.5 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center">
            <Stack direction="row" spacing={0.75} alignItems="center">
              <IconBuildingWarehouse size={16} color={brand.neutral[400]} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {count.warehouseId.slice(0, 8)}…
              </Typography>
            </Stack>
            <StatusBadge label={count.status} tone={countStatusTone[count.status] ?? 'neutral'} />
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
                Started:
              </Typography>
              <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {count.startedAt?.slice(0, 10)}
              </Typography>
            </Stack>
            {count.postedAt && (
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
                  Posted:
                </Typography>
                <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {count.postedAt.slice(0, 10)}
                </Typography>
              </Stack>
            )}
            <Chip
              size="small"
              label={`${count.lines.length} line${count.lines.length !== 1 ? 's' : ''}`}
              sx={{ height: 22, fontWeight: 600, fontSize: '0.6875rem', bgcolor: brand.neutral[100] }}
            />
          </Stack>
          {count.notes && (
            <Typography variant="body2" sx={{ color: brand.neutral[600], mt: 1.5 }}>
              {count.notes}
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Lines table */}
      <Box sx={{ mb: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Count lines
          </Typography>
          {count.status === 'OPEN' && hasEdits && (
            <Button
              variant="contained"
              size="small"
              startIcon={<IconDeviceFloppy size={14} />}
              onClick={handleSubmitLines}
              disabled={submitting}
              sx={{
                bgcolor: brand.accent[500], fontWeight: 700, borderRadius: '8px',
                '&:hover': { bgcolor: brand.accent[600] },
              }}
            >
              {submitting ? 'Saving…' : `Save ${Object.keys(editingLines).length} change${Object.keys(editingLines).length !== 1 ? 's' : ''}`}
            </Button>
          )}
        </Stack>
      </Box>
      <DataTable
        tableKey="stock-count-detail"
        columns={columns}
        rows={count.lines}
        loading={false}
        emptyText="No lines in this count."
        toolbarTitle={undefined}
        getRowKey={(l) => l.id ?? l.productId}
        enableSorting
      />

      {/* Post confirmation */}
      <Dialog open={confirmPostOpen} onClose={() => setConfirmPostOpen(false)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Post stock count?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will finalize the count and apply inventory differences. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmPostOpen(false)} disabled={posting}>Cancel</Button>
          <Button
            onClick={handlePost}
            color="primary"
            variant="contained"
            disabled={posting}
            sx={{ fontWeight: 700 }}
          >
            {posting ? 'Posting…' : 'Post count'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
