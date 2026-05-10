import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, TextField, Select, MenuItem, FormControl,
  InputLabel, Button, Stack,
} from '@mui/material';
import { IconSearch, IconX } from '@tabler/icons-react';
import { EnhancedDataTable, type Column } from 'src/components/smartpos/EnhancedDataTable';
import DocumentStatusBadge from 'src/components/smartpos/documents/DocumentStatusBadge';
import DocumentActionsBar from 'src/components/smartpos/documents/DocumentActionsBar';
import { searchDocuments, type DocumentDto } from 'src/api/smartpos/documents';

const DOC_TYPES = [
  'quotation', 'tax-invoice', 'proforma-invoice', 'purchase-order',
  'payment-receipt', 'credit-note', 'delivery-note', 'goods-received',
  'customer-statement',
];

const STATUSES = ['draft', 'sent', 'approved', 'paid', 'cancelled', 'expired'];
const REF_TYPES = ['sale', 'purchase', 'payment', 'customer', 'return', 'transfer'];
const PAGE_SIZE = 20;

function formatDocType(v: string): string {
  return v?.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) ?? '';
}

export default function DocumentSearchPage() {
  const [results, setResults] = useState<DocumentDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({
    q: '', documentType: '', status: '', referenceType: '', dateFrom: '', dateTo: '',
  });

  const doSearch = useCallback(async (p: number, f: typeof filters) => {
    setLoading(true);
    try {
      const res = await searchDocuments({
        ...f, page: p, size: PAGE_SIZE, sort: 'createdAt,desc',
        q: f.q || undefined, documentType: f.documentType || undefined,
        status: f.status || undefined, referenceType: f.referenceType || undefined,
        dateFrom: f.dateFrom || undefined, dateTo: f.dateTo || undefined,
      });
      setResults(res.content);
      setTotalPages(res.totalPages);
      setTotalElements(res.totalElements);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { doSearch(0, filters); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateFilter = (key: string, value: string) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    setPage(0);
    doSearch(0, next);
  };

  const clearFilters = () => {
    const empty = { q: '', documentType: '', status: '', referenceType: '', dateFrom: '', dateTo: '' };
    setFilters(empty);
    setPage(0);
    doSearch(0, empty);
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    doSearch(p, filters);
  };

  const columns: Column<DocumentDto>[] = [
    { key: 'documentNumber', label: 'Document #', width: 160 },
    { key: 'documentType', label: 'Type', width: 160,
      render: (row: DocumentDto) => formatDocType(row.documentType) },
    { key: 'createdAt', label: 'Date', width: 130,
      render: (row: DocumentDto) => row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '' },
    { key: 'referenceType', label: 'Reference', width: 110,
      render: (row: DocumentDto) => row.referenceType ?? '-' },
    { key: 'status', label: 'Status', width: 140,
      render: (row: DocumentDto) => <DocumentStatusBadge status={row.status} /> },
    { key: 'id', label: 'Actions', width: 340, sortable: false,
      render: (row: DocumentDto) => (
        <DocumentActionsBar
          documentType={row.documentType}
          referenceType={row.referenceType}
          referenceId={row.referenceId}
        />
      )},
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3 }}>Document Search</Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }} flexWrap="wrap" useFlexGap>
        <TextField
          size="small" label="Document #" value={filters.q}
          onChange={e => updateFilter('q', e.target.value)} sx={{ minWidth: 200 }}
          InputProps={{
            startAdornment: <IconSearch size={16} style={{ marginRight: 8, color: '#888' }} />,
          }}
        />

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Type</InputLabel>
          <Select value={filters.documentType} label="Type"
            onChange={e => updateFilter('documentType', e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {DOC_TYPES.map(t => (
              <MenuItem key={t} value={t}>{formatDocType(t)}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Status</InputLabel>
          <Select value={filters.status} label="Status"
            onChange={e => updateFilter('status', e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {STATUSES.map(s => (
              <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>{s}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Reference Type</InputLabel>
          <Select value={filters.referenceType} label="Reference Type"
            onChange={e => updateFilter('referenceType', e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {REF_TYPES.map(r => (
              <MenuItem key={r} value={r} sx={{ textTransform: 'capitalize' }}>{r}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          size="small" label="From" type="date" value={filters.dateFrom}
          onChange={e => updateFilter('dateFrom', e.target.value)} sx={{ minWidth: 160 }}
          InputLabelProps={{ shrink: true }}
        />

        <TextField
          size="small" label="To" type="date" value={filters.dateTo}
          onChange={e => updateFilter('dateTo', e.target.value)} sx={{ minWidth: 160 }}
          InputLabelProps={{ shrink: true }}
        />

        <Button onClick={clearFilters} startIcon={<IconX size={14} />} size="small">Clear</Button>
      </Stack>

      <EnhancedDataTable<DocumentDto>
        columns={columns}
        rows={results}
        loading={loading}
        totalPages={totalPages}
        totalElements={totalElements}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={handlePageChange}
        getRowKey={(row) => row.id}
        getRowId={(row) => row.id}
      />
    </Box>
  );
}
