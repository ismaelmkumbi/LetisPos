import { useState, useMemo } from 'react';
import {
  Box, Card, Table, TableBody, TableCell, TableHead, TableRow,
  TableSortLabel, TextField, Typography, TablePagination,
} from '@mui/material';
import { brand } from 'src/theme/smartpos/brand';

export interface Column<T> {
  id: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  render: (row: T) => React.ReactNode;
  sortable?: boolean;
}

interface Props<T> {
  title?: string;
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T, index: number) => string;
  searchPlaceholder?: string;
  defaultSort?: string;
  defaultSortDir?: 'asc' | 'desc';
}

export default function ReportDataTable<T>({
  title, columns, rows, getRowKey,
  searchPlaceholder = 'Search…',
  defaultSort, defaultSortDir = 'desc',
}: Props<T>) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState(defaultSort ?? '');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultSortDir);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      columns.some((c) => {
        const node = c.render(r);
        if (node == null) return false;
        const text = typeof node === 'string' ? node : (node as any)?.props?.children ?? '';
        return String(text).toLowerCase().includes(q);
      }),
    );
  }, [rows, search, columns]);

  const sorted = useMemo(() => {
    if (!sortBy) return filtered;
    const col = columns.find((c) => c.id === sortBy);
    if (!col) return filtered;
    return [...filtered].sort((a, b) => {
      const va = col.render(a);
      const vb = col.render(b);
      const sa = typeof va === 'string' ? va : (va as any)?.props?.children ?? '';
      const sb = typeof vb === 'string' ? vb : (vb as any)?.props?.children ?? '';
      const cmp = String(sa).localeCompare(String(sb), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortBy, sortDir, columns]);

  const paged = sorted.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  return (
    <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: '12px' }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        {title && <Typography sx={{ fontWeight: 800, fontSize: 17, color: brand.neutral[900] }}>{title}</Typography>}
        <TextField size="small" placeholder={searchPlaceholder} value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          sx={{ minWidth: 220, '& .MuiOutlinedInput-root': { borderRadius: '9px' } }} />
      </Box>
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: brand.neutral[50] }}>
            <TableRow>
              {columns.map((c) => (
                <TableCell key={c.id} align={c.align ?? 'left'} sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {c.sortable !== false ? (
                    <TableSortLabel active={sortBy === c.id} direction={sortBy === c.id ? sortDir : 'asc'}
                      onClick={() => {
                        if (sortBy === c.id) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
                        else { setSortBy(c.id); setSortDir('asc'); }
                      }}>
                      {c.label}
                    </TableSortLabel>
                  ) : c.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {paged.map((row, i) => (
              <TableRow key={getRowKey(row, i)} hover>
                {columns.map((c) => (
                  <TableCell key={c.id} align={c.align ?? 'left'}>{c.render(row)}</TableCell>
                ))}
              </TableRow>
            ))}
            {paged.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 4, color: brand.neutral[500] }}>
                  No data to display
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>
      <TablePagination component="div" count={sorted.length} page={page} rowsPerPage={rowsPerPage}
        onPageChange={(_, p) => setPage(p)} onRowsPerPageChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }} />
    </Card>
  );
}
