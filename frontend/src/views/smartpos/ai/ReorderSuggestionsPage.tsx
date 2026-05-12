/**
 * Reorder Suggestions — AI-recommended purchase quantities based on sales velocity,
 * lead times, and seasonality.
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import {
  IconAlertTriangle,
  IconRefresh,
  IconShoppingCart,
  IconTruck,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router';

import { DataTable, StatusBadge, type Column } from 'src/components/smartpos/DataTable';
import PageHeader from 'src/components/smartpos/PageHeader';
import { brand } from 'src/theme/smartpos/brand';
import {
  getReorderSuggestions,
  type ReorderSuggestion,
} from 'src/api/smartpos/reorderRules';

interface SuggestionRow {
  id: string;
  productId: string;
  product: string;
  currentStock: number;
  suggestedReorderQty: number;
  minQty: number;
  supplier: string;
  urgency: string;
  expectedShortageDate: string;
  dailyVelocity: number;
}

const URGENCY_TONES: Record<string, 'success' | 'warning' | 'error'> = {
  LOW: 'success',
  MEDIUM: 'warning',
  HIGH: 'error',
};

function mapToRow(s: ReorderSuggestion, index: number): SuggestionRow {
  return {
    id: String(index),
    productId: s.productId,
    product: s.productName ?? s.productId.slice(0, 8),
    currentStock: s.currentStock,
    suggestedReorderQty: s.suggestedQty,
    minQty: s.minQty,
    supplier: s.supplierId ? s.supplierId.slice(0, 8) : '—',
    urgency: s.urgency,
    expectedShortageDate: s.expectedShortageDate ?? '—',
    dailyVelocity: s.dailyVelocity,
  };
}

function reasonFromVelocity(velocity: number, urgency: string): string {
  if (urgency === 'HIGH') return `Velocity ${velocity.toFixed(1)}/day — urgent restock`;
  if (urgency === 'MEDIUM') return `Velocity ${velocity.toFixed(1)}/day — plan reorder`;
  return `Velocity ${velocity.toFixed(1)}/day — monitor`;
}

const columns: Column<SuggestionRow>[] = [
  {
    key: 'product', label: 'Product', sortable: true,
    render: (row) => (
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 700, color: brand.neutral[900], fontSize: '0.85rem' }}>
          {row.product}
        </Typography>
        <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
          {row.productId.slice(0, 8)}
        </Typography>
      </Box>
    ),
  },
  {
    key: 'currentStock', label: 'Current Stock', align: 'center', sortable: true,
    render: (row) => (
      <Typography variant="body2" sx={{
        fontWeight: 700,
        color: row.currentStock <= row.minQty / 3 ? brand.error.dark : brand.neutral[800],
      }}>
        {row.currentStock}
      </Typography>
    ),
  },
  {
    key: 'suggestedReorderQty', label: 'Suggested Reorder', align: 'center', sortable: true,
    render: (row) => (
      <Typography variant="body2" sx={{ fontWeight: 700, color: brand.primary[700] }}>
        {row.suggestedReorderQty}
      </Typography>
    ),
  },
  {
    key: 'dailyVelocity', label: 'Daily Velocity', align: 'center', sortable: true,
    render: (row) => (
      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem', color: brand.neutral[600] }}>
        {row.dailyVelocity.toFixed(1)}/day
      </Typography>
    ),
  },
  { key: 'supplier', label: 'Supplier', sortable: true },
  {
    key: 'urgency', label: 'Urgency', align: 'center', sortable: true,
    render: (row) => (
      <StatusBadge label={row.urgency.toUpperCase()} tone={URGENCY_TONES[row.urgency] ?? 'success'} />
    ),
  },
  {
    key: 'expectedShortageDate', label: 'Expected Shortage', align: 'center', sortable: true,
    render: (row) => (
      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
        {row.expectedShortageDate}
      </Typography>
    ),
  },
  {
    key: 'reason', label: 'Reason',
    render: (row) => (
      <Chip
        label={reasonFromVelocity(row.dailyVelocity, row.urgency)}
        size="small"
        sx={{
          height: 20, fontWeight: 600, fontSize: '0.65rem', borderRadius: '5px',
          bgcolor: brand.neutral[100], color: brand.neutral[600],
        }}
      />
    ),
  },
];

export default function ReorderSuggestionsPage() {
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<SuggestionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const loadSuggestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getReorderSuggestions();
      setSuggestions(data.map((s, i) => mapToRow(s, i)));
      setLoaded(true);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to load reorder suggestions');
    } finally {
      setLoading(false);
    }
  };

  // Auto-load on first render
  useEffect(() => {
    loadSuggestions();
  }, []);

  const handleCreatePO = () => {
    navigate('/smartpos/purchases/new');
  };

  return (
    <>
      <PageHeader
        title="Reorder Suggestions"
        subtitle="AI-recommended purchase quantities based on sales velocity, lead times, and seasonality"
        action={{
          label: 'Create Purchase Order',
          icon: <IconShoppingCart size={16} />,
          onClick: handleCreatePO,
          variant: 'accent',
        }}
      />

      {/* Info banner */}
      <Card
        elevation={0}
        sx={{
          mb: 2.5, p: 2,
          border: `1px solid ${brand.warning.light}`,
          borderRadius: '8px',
          bgcolor: brand.warning.light,
        }}
      >
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <IconAlertTriangle size={18} color={brand.warning.main} style={{ marginTop: 2 }} />
          <Typography variant="body2" sx={{ color: brand.warning.dark, fontWeight: 500, lineHeight: 1.5 }}>
            Suggestions are recalculated daily based on sales velocity and current stock levels.
          </Typography>
        </Stack>
      </Card>

      {/* Error state */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} action={
          <Button size="small" onClick={loadSuggestions} startIcon={<IconRefresh size={14} />}>Retry</Button>
        }>
          {error}
        </Alert>
      )}

      {/* Empty state */}
      {!loaded && !loading && !error && (
        <Card
          elevation={0}
          sx={{
            p: 6, textAlign: 'center',
            border: `1px solid ${brand.neutral[200]}`,
            borderRadius: '8px', bgcolor: brand.neutral[50],
          }}
        >
          <Box sx={{
            width: 56, height: 56, borderRadius: '14px', bgcolor: brand.neutral[100],
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            mx: 'auto', mb: 2,
          }}>
            <IconTruck size={28} color={brand.neutral[400]} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: brand.neutral[700], mb: 0.5 }}>
            No suggestions loaded
          </Typography>
          <Typography variant="body2" sx={{ color: brand.neutral[500], mb: 3 }}>
            Click the button below to load the latest AI reorder suggestions.
          </Typography>
          <Button
            variant="contained"
            startIcon={<IconRefresh size={16} />}
            onClick={loadSuggestions}
            sx={{
              bgcolor: brand.accent[500],
              '&:hover': { bgcolor: brand.accent[600] },
              fontWeight: 700, borderRadius: '10px',
            }}
          >
            Load Suggestions
          </Button>
        </Card>
      )}

      {/* Data table */}
      {loaded && (
        <DataTable<SuggestionRow>
          columns={columns}
          rows={suggestions}
          loading={loading}
          emptyText="No reorder suggestions available"
          itemLabel="suggestions"
          tableKey="ai-reorder-suggestions"
          enableSorting
          toolbarTitle="Reorder Suggestions"
          emptyAction={{ label: 'Refresh', onClick: loadSuggestions }}
        />
      )}

      {/* Quick refresh */}
      {loaded && (
        <Stack direction="row" justifyContent="center" sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            startIcon={loading ? <CircularProgress size={14} /> : <IconRefresh size={16} />}
            onClick={loadSuggestions}
            disabled={loading}
            sx={{
              borderColor: brand.neutral[300], color: brand.neutral[700],
              fontWeight: 700, borderRadius: '10px',
              '&:hover': { borderColor: brand.primary[400], color: brand.primary[700], bgcolor: brand.primary[50] },
            }}
          >
            Refresh Suggestions
          </Button>
        </Stack>
      )}
    </>
  );
}
