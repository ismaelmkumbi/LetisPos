import { Stack, TextField, MenuItem } from '@mui/material';

export interface ReportFilters {
  dateFrom: string;
  dateTo: string;
  warehouseId: string;
  period: string;
}

interface Props {
  filters: ReportFilters;
  onChange: (f: ReportFilters) => void;
  showWarehouse?: boolean;
  showPeriod?: boolean;
  warehouses?: { id: string; name: string }[];
}

const PERIODS = [
  { value: '', label: 'Custom' },
  { value: 'TODAY', label: 'Today' },
  { value: 'WEEK', label: 'This week' },
  { value: 'MONTH', label: 'This month' },
  { value: 'LAST_30_DAYS', label: 'Last 30 days' },
  { value: 'YTD', label: 'Year to date' },
];

function periodRange(period: string): { from: string; to: string } | null {
  const today = new Date();
  const start = new Date(today);
  const end = new Date(today);
  if (period === 'TODAY') { /* today */ }
  else if (period === 'YESTERDAY') { start.setDate(today.getDate() - 1); end.setDate(today.getDate() - 1); }
  else if (period === 'WEEK') { const d = today.getDay() || 7; start.setDate(today.getDate() - d + 1); }
  else if (period === 'MONTH') { start.setDate(1); }
  else if (period === 'YTD') { start.setMonth(0, 1); }
  else if (period === 'LAST_30_DAYS') { start.setDate(today.getDate() - 30); }
  else return null;
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
}

export default function ReportFilterBar({ filters, onChange, showWarehouse, showPeriod, warehouses }: Props) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
      {showPeriod !== false && (
        <TextField select size="small" label="Period" value={filters.period}
          onChange={(e) => {
            const p = e.target.value;
            const range = periodRange(p);
            onChange({ ...filters, period: p, ...(range ?? {}) });
          }}
          sx={{ minWidth: 140 }}>
          {PERIODS.map((p) => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
        </TextField>
      )}
      <TextField type="date" label="From" size="small" value={filters.dateFrom}
        onChange={(e) => onChange({ ...filters, dateFrom: e.target.value, period: '' })}
        InputLabelProps={{ shrink: true }} sx={{ minWidth: 160 }} />
      <TextField type="date" label="To" size="small" value={filters.dateTo}
        onChange={(e) => onChange({ ...filters, dateTo: e.target.value, period: '' })}
        InputLabelProps={{ shrink: true }} sx={{ minWidth: 160 }} />
      {showWarehouse && warehouses && warehouses.length > 0 && (
        <TextField select size="small" label="Warehouse" value={filters.warehouseId}
          onChange={(e) => onChange({ ...filters, warehouseId: e.target.value })}
          sx={{ minWidth: 160 }}>
          <MenuItem value="">All warehouses</MenuItem>
          {warehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
        </TextField>
      )}
    </Stack>
  );
}
