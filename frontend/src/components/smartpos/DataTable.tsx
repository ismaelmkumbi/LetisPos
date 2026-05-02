/**
 * Letis POS — enterprise-grade data table.
 *
 * Internally driven by `@tanstack/react-table` so we get sort, filter and
 * column-visibility state machinery "for free", but the public API is the
 * same simple `Column<T>` shape we've used since v1 — every existing list
 * page continues to work without changes.
 *
 * Visual chrome stays Letis: skeleton loading rows, sticky pill header,
 * subtle indigo-tinted row hover, polished empty state, and a footer with
 * row count + pagination.
 *
 * NEW (all opt-in, all optional):
 *   • enableSorting          — clickable header sorts with up/down indicators.
 *                              Emits `onSortChange` for server-side pagination.
 *   • enableColumnVisibility — "Columns" toolbar menu to show/hide columns.
 *                              Persisted per `tableKey` in localStorage.
 *   • enableExport           — "Export CSV" toolbar button.
 *   • toolbar                — extra React slot rendered to the right of the
 *                              built-in toolbar buttons.
 *   • toolbarTitle           — small caption rendered on the left.
 */
import {
  Box, Button, Card, Checkbox, Collapse, Divider, FormControlLabel, Menu,
  MenuItem, Pagination, Skeleton, Stack, Table, TableBody, TableCell,
  TableHead, TableRow, Tooltip, Typography, Chip,
} from '@mui/material';
import {
  IconArrowDown, IconArrowsSort, IconArrowUp, IconChevronDown, IconChevronRight,
  IconColumns, IconDownload, IconEyeOff,
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  flexRender, getCoreRowModel, useReactTable,
  type ColumnDef, type SortingState, type VisibilityState,
} from '@tanstack/react-table';
import { brand } from 'src/theme/smartpos/brand';
import * as XLSX from 'xlsx';

// ─── Public API — UNCHANGED from v1 ──────────────────────────────────────────

export interface Column<T> {
  /** Unique column key. Also used as the sort id and the export header. */
  key: string;
  label: string;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  /** Allow this column to participate in sorting (when `enableSorting` is on). */
  sortable?: boolean;
  /** Allow this column to be hidden via the column-visibility menu (default: true). */
  enableHiding?: boolean;
  /** Render the cell — second arg is the row index within the current page. */
  render?: (row: T, index: number) => React.ReactNode;
  /** Override how this column is serialized for CSV export.
   *  Falls back to the cell's text content when omitted. */
  exportValue?: (row: T) => string | number | null | undefined;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  emptyText?: string;
  emptyIcon?: React.ReactNode;
  totalPages?: number;
  totalElements?: number;
  page?: number;            // 0-based
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onRowClick?: (row: T) => void;
  getRowKey?: (row: T, index: number) => string;
  dense?: boolean;
  stickyHeader?: boolean;
  // ── NEW (opt-in) ──────────────────────────────────────────────────────────
  /** Stable identifier — column-visibility preferences are persisted under this key. */
  tableKey?: string;
  /** Enable header click-to-sort. */
  enableSorting?: boolean;
  /** Called with the new sort state. `null` means "default order". */
  onSortChange?: (sort: { id: string; desc: boolean } | null) => void;
  /** Show a "Columns" button to toggle column visibility. */
  enableColumnVisibility?: boolean;
  /** Show an "Export CSV" button. */
  enableExport?: boolean;
  /** Also offer Excel (.xlsx) export alongside CSV. Requires `enableExport` to be true. */
  enableExcelExport?: boolean;
  /** Filename used by the export (no extension). Defaults to "table-export". */
  exportFileName?: string;
  /** Caption shown on the left of the toolbar. */
  toolbarTitle?: string;
  /** Extra slot rendered after the built-in toolbar buttons. */
  toolbar?: React.ReactNode;
  /** Enable expandable rows — a chevron toggle reveals expanded content below the row. */
  expandable?: boolean;
  /** Render the expanded panel for a row. Only used when `expandable` is true. */
  renderExpanded?: (row: T) => React.ReactNode;
}

// ─── Status badge helper (unchanged) ──────────────────────────────────────────

export type StatusTone = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary';

const STATUS_STYLES: Record<StatusTone, { bg: string; color: string }> = {
  success: { bg: brand.success.light,  color: brand.success.dark },
  warning: { bg: brand.warning.light,  color: brand.warning.dark },
  error:   { bg: brand.error.light,    color: brand.error.dark },
  info:    { bg: brand.info.light,     color: brand.info.dark },
  neutral: { bg: brand.neutral[100],   color: brand.neutral[700] },
  primary: { bg: brand.primary[50],    color: brand.primary[700] },
};

export function StatusBadge({ label, tone = 'neutral' }: { label: string; tone?: StatusTone }) {
  const s = STATUS_STYLES[tone];
  return (
    <Chip
      label={label}
      size="small"
      sx={{
        height: 20,
        fontWeight: 700,
        fontSize: '0.625rem',
        letterSpacing: '0.04em',
        borderRadius: '5px',
        bgcolor: s.bg,
        color: s.color,
        '& .MuiChip-label': { px: 0.875 },
      }}
    />
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SKELETON_ROWS = 6;
const VISIBILITY_LS_PREFIX = 'smartpos:dt:vis:';
const WIDTHS_LS_PREFIX = 'smartpos:dt:w:';

const loadVisibility = (key: string | undefined): VisibilityState => {
  if (!key || typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(VISIBILITY_LS_PREFIX + key) ?? '{}');
  } catch { return {}; }
};
const saveVisibility = (key: string | undefined, v: VisibilityState) => {
  if (!key || typeof window === 'undefined') return;
  try { window.localStorage.setItem(VISIBILITY_LS_PREFIX + key, JSON.stringify(v)); } catch { /* ignore */ }
};

const loadColumnWidths = (key: string | undefined): Record<string, number> => {
  if (!key || typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(WIDTHS_LS_PREFIX + key) ?? '{}');
  } catch { return {}; }
};
const saveColumnWidths = (key: string | undefined, w: Record<string, number>) => {
  if (!key || typeof window === 'undefined') return;
  try { window.localStorage.setItem(WIDTHS_LS_PREFIX + key, JSON.stringify(w)); } catch { /* ignore */ }
};

/** Best-effort CSV cell serializer — escapes quotes, wraps if needed. */
const csvCell = (value: unknown): string => {
  if (value == null) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
};

/** Try to flatten a React node to plain text (best-effort fallback for export). */
const reactNodeToText = (node: React.ReactNode): string => {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(reactNodeToText).join(' ');
  if (typeof node === 'object' && 'props' in node) {
    return reactNodeToText((node as { props: { children?: React.ReactNode } }).props.children);
  }
  return '';
};

// ─── Component ────────────────────────────────────────────────────────────────

export function DataTable<T>({
  columns, rows, loading, emptyText = 'No records found',
  emptyIcon, totalPages, totalElements, page = 0, pageSize = 20,
  onPageChange, onRowClick, getRowKey, dense = false, stickyHeader = true,
  tableKey,
  enableSorting = false,
  onSortChange,
  enableColumnVisibility = false,
  enableExport = false,
  enableExcelExport = false,
  exportFileName = 'table-export',
  toolbarTitle,
  toolbar,
  expandable = false,
  renderExpanded,
}: DataTableProps<T>) {
  // ── Expandable row state ──────────────────────────────────────────────────
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // ── Header context menu state ─────────────────────────────────────────────
  const [headerMenuAnchor, setHeaderMenuAnchor] = useState<HTMLElement | null>(null);
  const [headerMenuColKey, setHeaderMenuColKey] = useState<string | null>(null);
  const headerMenuOpen = !!headerMenuAnchor;

  // ── Sort state ────────────────────────────────────────────────────────────
  const [sorting, setSorting] = useState<SortingState>([]);

  useEffect(() => {
    if (!onSortChange) return;
    onSortChange(sorting.length === 0 ? null : { id: sorting[0].id, desc: sorting[0].desc });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorting]);

  // ── Visibility state (with localStorage persistence per tableKey) ─────────
  const [visibility, setVisibility] = useState<VisibilityState>(() => loadVisibility(tableKey));
  useEffect(() => { saveVisibility(tableKey, visibility); }, [tableKey, visibility]);

  // ── Column width state (with localStorage persistence per tableKey) ────────
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => loadColumnWidths(tableKey));
  useEffect(() => { saveColumnWidths(tableKey, colWidths); }, [tableKey, colWidths]);

  // ── Column resize (drag) state ──────────────────────────────────────────────
  const [resizing, setResizing] = useState<{
    colKey: string; startX: number; startWidth: number;
  } | null>(null);

  const handleResizeStart = useCallback((colKey: string, startX: number, startWidth: number) => {
    setResizing({ colKey, startX, startWidth });
  }, []);

  // Global mouse-move / mouse-up during resize
  useEffect(() => {
    if (!resizing) return;
    const onMove = (e: MouseEvent) => {
      const delta = e.clientX - resizing.startX;
      const newWidth = Math.max(60, resizing.startWidth + delta); // min 60px
      setColWidths((prev) => ({ ...prev, [resizing.colKey]: newWidth }));
    };
    const onUp = () => setResizing(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [resizing]);

  // Merge column widths: static width from column def overridden by dynamic resize
  const getColWidth = useCallback((colKey: string, staticWidth?: number | string) => {
    if (colWidths[colKey]) return colWidths[colKey];
    if (staticWidth) return staticWidth;
    return undefined;
  }, [colWidths]);

  // ── Adapt our Column<T> to TanStack's ColumnDef<T> ────────────────────────
  const tanColumns = useMemo<ColumnDef<T, unknown>[]>(
    () => columns.map((c) => ({
      id: c.key,
      header: c.label,
      enableSorting: enableSorting && (c.sortable !== false) && !!c.key && !c.key.startsWith('_') && c.key !== 'actions',
      enableHiding: c.enableHiding !== false && c.key !== 'actions',
      cell: (ctx) => (c.render ? c.render(ctx.row.original, ctx.row.index) : (ctx.row.original as Record<string, unknown>)[c.key] ?? '—'),
    })),
    [columns, enableSorting],
  );

  const table = useReactTable({
    data: rows,
    columns: tanColumns,
    state: { sorting, columnVisibility: visibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setVisibility,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,        // server-side: parent handles re-fetching via onSortChange
    manualPagination: true,
    enableSortingRemoval: true, // clicking a sorted column 3 times clears it
  });

  const showPagination = totalPages !== undefined && totalPages > 1;
  const rowHeight = dense ? 46 : 64;
  const cellPx    = dense ? 1.5 : 1.75;
  const cellPyHd  = dense ? 0.9 : 1.35;
  const cellPyBd  = dense ? 0.65 : 1.1;
  const startRow = page * pageSize + 1;
  const endRow = Math.min((page + 1) * pageSize, totalElements ?? rows.length);

  // ── Shared styles ───────────────────────────────────────────────────────────
  const exportBtnSx = {
    borderRadius: '8px',
    borderColor: brand.neutral[200],
    color: brand.neutral[700],
    fontWeight: 600,
    fontSize: '0.75rem',
    textTransform: 'none' as const,
    py: 0.25, px: 1,
    minHeight: 28,
    '&:hover': { borderColor: brand.primary[400], color: brand.primary[700], bgcolor: brand.primary[50] },
  };

  // ── Toolbar (rendered only when at least one enhancement is enabled) ──────
  const showToolbar = !!(toolbarTitle || toolbar || enableColumnVisibility || enableExport);

  // ── CSV export ────────────────────────────────────────────────────────────
  const handleExport = () => {
    const visibleCols = table.getVisibleLeafColumns()
      .map((vc) => columns.find((c) => c.key === vc.id))
      .filter((c): c is Column<T> => !!c && c.key !== 'actions' && !c.key.startsWith('_'));

    const headers = visibleCols.map((c) => csvCell(c.label));

    const lines = rows.map((row, i) => visibleCols.map((c) => {
      if (c.exportValue) return csvCell(c.exportValue(row));
      if (c.render) return csvCell(reactNodeToText(c.render(row, i)));
      return csvCell((row as Record<string, unknown>)[c.key] ?? '');
    }).join(','));

    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${exportFileName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ── Excel export ───────────────────────────────────────────────────────────
  const handleExcelExport = () => {
    const visibleCols = table.getVisibleLeafColumns()
      .map((vc) => columns.find((c) => c.key === vc.id))
      .filter((c): c is Column<T> => !!c && c.key !== 'actions' && !c.key.startsWith('_'));

    const headers = visibleCols.map((c) => c.label);

    const data = rows.map((row, i) => {
      const rowData: Record<string, unknown> = {};
      visibleCols.forEach((c) => {
        if (c.exportValue) rowData[c.label] = c.exportValue(row);
        else if (c.render) rowData[c.label] = reactNodeToText(c.render(row, i));
        else rowData[c.label] = (row as Record<string, unknown>)[c.key] ?? '';
      });
      return rowData;
    });

    const ws = XLSX.utils.json_to_sheet(data, { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, `${exportFileName}.xlsx`);
  };

  const [exportAnchor, setExportAnchor] = useState<HTMLElement | null>(null);

  // ── Column visibility menu ────────────────────────────────────────────────
  const [colMenuAnchor, setColMenuAnchor] = useState<null | HTMLElement>(null);
  const hideableColumns = useMemo(
    () => columns.filter((c) => c.enableHiding !== false && c.key !== 'actions' && !c.key.startsWith('_')),
    [columns],
  );

  return (
    <Card
      elevation={0}
      sx={{
        border: `1px solid ${brand.neutral[200]}`,
        borderRadius: '8px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#fff',
        boxShadow: `0 1px 2px ${brand.neutral[900]}08, 0 24px 60px -44px ${brand.neutral[900]}55`,
      }}
    >
      {/* ── Toolbar (optional) ── */}
      {showToolbar && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ sm: 'center' }}
          justifyContent="space-between"
          spacing={1}
          sx={{
            px: 1.25,
            py: 1,
            borderBottom: `1px solid ${brand.neutral[200]}`,
            bgcolor: '#fff',
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            {toolbarTitle && (
              <Typography
                variant="caption"
                sx={{
                  color: brand.neutral[500], fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}
              >
                {toolbarTitle}
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            {toolbar}
            {enableColumnVisibility && (
              <>
                <Tooltip title="Show / hide columns">
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<IconColumns size={14} />}
                    onClick={(e) => setColMenuAnchor(e.currentTarget)}
                    sx={{
                      borderRadius: '8px',
                      borderColor: brand.neutral[200],
                      color: brand.neutral[700],
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      textTransform: 'none',
                      py: 0.25, px: 1,
                      minHeight: 28,
                      '&:hover': { borderColor: brand.primary[400], color: brand.primary[700], bgcolor: brand.primary[50] },
                    }}
                  >
                    Columns
                  </Button>
                </Tooltip>
                <Menu
                  anchorEl={colMenuAnchor}
                  open={!!colMenuAnchor}
                  onClose={() => setColMenuAnchor(null)}
                  PaperProps={{
                    sx: {
                      mt: 0.5, p: 0.5, minWidth: 220,
                      borderRadius: '12px', border: `1px solid ${brand.neutral[200]}`,
                      boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
                    },
                  }}
                >
                  <Typography variant="caption" sx={{
                    px: 1.5, pt: 0.75, pb: 0.5, display: 'block',
                    color: brand.neutral[500], fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>
                    Visible columns
                  </Typography>
                  {hideableColumns.map((c) => {
                    const tanCol = table.getColumn(c.key);
                    if (!tanCol) return null;
                    const isVisible = tanCol.getIsVisible();
                    return (
                      <MenuItem
                        key={c.key}
                        onClick={() => tanCol.toggleVisibility(!isVisible)}
                        sx={{ borderRadius: '8px', py: 0.5 }}
                      >
                        <FormControlLabel
                          sx={{ m: 0, width: '100%' }}
                          control={
                            <Checkbox
                              size="small"
                              checked={isVisible}
                              sx={{ p: 0.5 }}
                            />
                          }
                          label={
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {c.label || c.key}
                            </Typography>
                          }
                        />
                      </MenuItem>
                    );
                  })}
                  <Divider sx={{ my: 0.5 }} />
                  <MenuItem
                    onClick={() => { table.resetColumnVisibility(); setColMenuAnchor(null); }}
                    sx={{ borderRadius: '8px', color: brand.primary[600], fontWeight: 600 }}
                  >
                    Reset
                  </MenuItem>
                </Menu>
              </>
            )}
            {enableExport && !enableExcelExport && (
              <Tooltip title="Export current rows as CSV">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<IconDownload size={14} />}
                  onClick={handleExport}
                  sx={exportBtnSx}
                >
                  Export
                </Button>
              </Tooltip>
            )}
            {enableExport && enableExcelExport && (
              <>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<IconDownload size={14} />}
                  onClick={(e) => setExportAnchor(e.currentTarget)}
                  endIcon={<IconChevronDown size={12} />}
                  sx={exportBtnSx}
                >
                  Export
                </Button>
                <Menu
                  anchorEl={exportAnchor}
                  open={!!exportAnchor}
                  onClose={() => setExportAnchor(null)}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                >
                  <MenuItem onClick={() => { handleExport(); setExportAnchor(null); }} dense>
                    Export as CSV
                  </MenuItem>
                  <MenuItem onClick={() => { handleExcelExport(); setExportAnchor(null); }} dense>
                    Export as Excel
                  </MenuItem>
                </Menu>
              </>
            )}
          </Stack>
        </Stack>
      )}

      {/* ── Table ── */}
      <Box sx={{ overflowX: 'auto', flex: 1, ...(resizing ? { cursor: 'col-resize' } : {}) }}>
        <Table
          size={dense ? 'small' : 'medium'}
          stickyHeader={stickyHeader}
          sx={{
            minWidth: 500,
            width: '100%',
            tableLayout: 'fixed',
            borderCollapse: 'separate',
            borderSpacing: 0,
          }}
        >
          <TableHead>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {expandable && (
                  <TableCell key="_expand" sx={{ width: 40, py: cellPyHd, px: 0.5, backgroundColor: brand.neutral[50], borderBottom: `1px solid ${brand.neutral[200]}` }} />
                )}
                {hg.headers.map((header) => {
                  const col = columns.find((c) => c.key === header.column.id);
                  const canSort = header.column.getCanSort();
                  const sortState = header.column.getIsSorted();
                  return (
                    <TableCell
                      key={header.id}
                      align={col?.align ?? 'left'}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setHeaderMenuColKey(col?.key ?? header.column.id);
                        setHeaderMenuAnchor(e.currentTarget as HTMLElement);
                      }}
                      sx={{
                        width: getColWidth(col?.key ?? header.column.id, col?.width),
                        py: cellPyHd,
                        px: cellPx,
                        backgroundColor: brand.neutral[50],
                        fontWeight: 800,
                        color: brand.neutral[800],
                        fontSize: '0.82rem',
                        letterSpacing: 0,
                        borderBottom: `1px solid ${brand.neutral[200]}`,
                        whiteSpace: 'nowrap',
                        userSelect: resizing ? 'none' : 'none',
                        cursor: canSort ? 'pointer' : 'default',
                        transition: resizing ? 'none' : 'color 0.12s ease',
                        '&:hover': canSort ? { color: brand.primary[700] } : undefined,
                        position: 'relative',
                      }}
                      onClick={canSort && !resizing ? header.column.getToggleSortingHandler() : undefined}
                    >
                      <Stack
                        direction="row"
                        spacing={0.5}
                        alignItems="center"
                        justifyContent={col?.align === 'right' ? 'flex-end' : col?.align === 'center' ? 'center' : 'flex-start'}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</span>
                        {canSort && (
                          <Box sx={{
                            display: 'flex', alignItems: 'center',
                            color: sortState ? brand.primary[700] : brand.neutral[300],
                          }}>
                            {sortState === 'asc' ? <IconArrowUp size={12} stroke={2.5} />
                            : sortState === 'desc' ? <IconArrowDown size={12} stroke={2.5} />
                            : <IconArrowsSort size={12} stroke={2} />}
                          </Box>
                        )}
                        {col?.key !== '_select' && col?.key !== 'actions' && (
                          <Box
                            component="span"
                            onClick={(e) => {
                              e.stopPropagation();
                              setHeaderMenuColKey(col?.key ?? header.column.id);
                              setHeaderMenuAnchor(e.currentTarget as unknown as HTMLElement);
                            }}
                            sx={{
                              display: 'flex', alignItems: 'center',
                              ml: 0.25, cursor: 'pointer',
                              color: brand.neutral[300],
                              borderRadius: '4px',
                              '&:hover': { color: brand.neutral[600], bgcolor: brand.neutral[100] },
                            }}
                          >
                            <IconChevronDown size={10} stroke={2} />
                          </Box>
                        )}
                        {/* Column resize drag handle — always visible as a subtle line */}
                        {col?.key !== '_select' && col?.key !== 'actions' && (
                          <Box
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const cell = (e.currentTarget as HTMLElement).parentElement!.closest('th');
                              const currentWidth = cell ? cell.offsetWidth : 150;
                              handleResizeStart(col?.key ?? header.column.id, e.clientX, currentWidth);
                            }}
                            sx={{
                              position: 'absolute', right: 0, top: 0, bottom: 0,
                              width: 10, cursor: 'col-resize', zIndex: 2,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              '&::before': {
                                content: '""',
                                position: 'absolute',
                                width: 1.5, height: '60%',
                                borderRadius: '1px',
                                bgcolor: brand.neutral[200],
                                transition: 'all 0.15s ease',
                              },
                              '&:hover::before': {
                                width: 3,
                                height: '85%',
                                bgcolor: brand.primary[400],
                              },
                              '&:active::before': {
                                width: 3,
                                height: '85%',
                                bgcolor: brand.primary[600],
                              },
                            }}
                          />
                        )}
                      </Stack>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableHead>

          {headerMenuOpen && headerMenuColKey && (
            <Menu
              anchorEl={headerMenuAnchor}
              open={headerMenuOpen}
              onClose={() => setHeaderMenuAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            >
              {(() => {
                const col = table.getColumn(headerMenuColKey);
                const canSort = col?.getCanSort();
                const sortState = col?.getIsSorted();
                const canHide = headerMenuColKey !== 'actions' && !headerMenuColKey.startsWith('_');
                return (
                  <>
                    {canSort && (
                      <MenuItem
                        onClick={() => { col!.toggleSorting(false); setHeaderMenuAnchor(null); }}
                        dense
                        selected={sortState === 'asc'}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <IconArrowUp size={14} />
                          Sort A→Z
                        </Box>
                      </MenuItem>
                    )}
                    {canSort && (
                      <MenuItem
                        onClick={() => { col!.toggleSorting(true); setHeaderMenuAnchor(null); }}
                        dense
                        selected={sortState === 'desc'}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <IconArrowDown size={14} />
                          Sort Z→A
                        </Box>
                      </MenuItem>
                    )}
                    {canSort && canHide && <Divider sx={{ my: 0.25 }} />}
                    {canHide && (
                      <MenuItem
                        onClick={() => { col?.toggleVisibility(false); setHeaderMenuAnchor(null); }}
                        dense
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: brand.neutral[600] }}>
                          <IconEyeOff size={14} />
                          Hide column
                        </Box>
                      </MenuItem>
                    )}
                  </>
                );
              })()}
            </Menu>
          )}

          <TableBody>
            {loading ? (
              Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                <TableRow key={`sk-${i}`} sx={{ height: rowHeight }}>
                  {table.getVisibleLeafColumns().map((vc) => (
                    <TableCell key={vc.id} sx={{ py: cellPyBd, px: cellPx }}>
                      <Skeleton
                        variant="text"
                        sx={{
                          borderRadius: '6px',
                          width: `${60 + Math.random() * 30}%`,
                          height: 18,
                        }}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  align="center"
                  sx={{ py: 8, border: 0 }}
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    {emptyIcon ? (
                      <Box sx={{ color: brand.neutral[300], mb: 0.5 }}>{emptyIcon}</Box>
                    ) : (
                      <Box
                        sx={{
                          width: 48, height: 48, borderRadius: '14px',
                          bgcolor: brand.neutral[100],
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          mb: 0.5,
                        }}
                      >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={brand.neutral[400]} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                        </svg>
                      </Box>
                    )}
                    <Typography variant="body2" sx={{ fontWeight: 600, color: brand.neutral[700] }}>
                      {emptyText}
                    </Typography>
                    <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
                      Try adjusting your filters or search terms
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => {
                const original = row.original;
                const rowKey = getRowKey ? getRowKey(original, row.index) : row.id;
                const isExpanded = expandable && expandedRowId === rowKey;
                const toggleExpand = () => setExpandedRowId(isExpanded ? null : rowKey);
                const totalCells = row.getVisibleCells().length + (expandable ? 1 : 0);
                return (
                  <>
                    <TableRow
                      key={rowKey}
                      hover={!!onRowClick}
                      onClick={onRowClick ? () => onRowClick(original) : undefined}
                      sx={{
                        height: rowHeight,
                        cursor: onRowClick ? 'pointer' : 'default',
                        transition: 'background 0.14s ease, box-shadow 0.14s ease',
                        bgcolor: '#fff',
                        '&.MuiTableRow-hover:hover': {
                          backgroundColor: brand.primary[50],
                          boxShadow: `inset 3px 0 0 ${brand.primary[600]}`,
                        },
                        '&:last-child td': { borderBottom: 0 },
                      }}
                    >
                      {expandable && (
                        <TableCell
                          sx={{ width: 40, py: cellPyBd, px: 0.5, borderBottom: `1px solid ${brand.neutral[200]}` }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Box
                            onClick={toggleExpand}
                            sx={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', color: isExpanded ? brand.primary[600] : brand.neutral[400],
                              transition: 'color 0.15s ease',
                              '&:hover': { color: brand.primary[600] },
                            }}
                          >
                            {isExpanded ? <IconChevronDown size={16} stroke={2} /> : <IconChevronRight size={16} stroke={2} />}
                          </Box>
                        </TableCell>
                      )}
                      {row.getVisibleCells().map((cell) => {
                        const col = columns.find((c) => c.key === cell.column.id);
                        return (
                          <TableCell
                            key={cell.id}
                            align={col?.align ?? 'left'}
                            sx={{
                              py: cellPyBd,
                              px: cellPx,
                              borderBottom: `1px solid ${brand.neutral[100]}`,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: col?.key === 'actions' || col?.key === '_select' ? 'initial' : 'nowrap',
                              color: brand.neutral[800],
                            }}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                    {expandable && isExpanded && (
                      <TableRow key={`${rowKey}-exp`}>
                        <TableCell colSpan={totalCells} sx={{ py: 0, border: 0, bgcolor: brand.neutral[50] }}>
                          <Collapse in>
                            <Box sx={{ px: 2.5, py: 2 }}>
                              {renderExpanded?.(original)}
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })
            )}
          </TableBody>
        </Table>
      </Box>

      {/* ── Footer: row count + pagination ── */}
      {(showPagination || (totalElements !== undefined && rows.length > 0)) && (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            px: 1.5,
            py: 1.4,
            borderTop: `1px solid ${brand.neutral[200]}`,
            bgcolor: brand.neutral[50],
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          {totalElements !== undefined ? (
            <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 500 }}>
              Showing{' '}
              <Typography component="span" variant="caption" sx={{ fontWeight: 700, color: brand.neutral[700] }}>
                {startRow} to {endRow}
              </Typography>{' '}
              of{' '}
              <Typography component="span" variant="caption" sx={{ fontWeight: 700, color: brand.neutral[700] }}>
                {totalElements.toLocaleString()}
              </Typography>{' '}
              products
            </Typography>
          ) : (
            <Box />
          )}
          {showPagination && (
            <Pagination
              count={totalPages}
              page={page + 1}
              onChange={(_, p) => onPageChange?.(p - 1)}
              shape="rounded"
              color="primary"
              size="small"
              sx={{
                '& .MuiPaginationItem-root': {
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  border: `1px solid ${brand.neutral[200]}`,
                  bgcolor: '#fff',
                },
                '& .Mui-selected': {
                  bgcolor: `${brand.primary[600]} !important`,
                  color: '#fff',
                  borderColor: `${brand.primary[600]} !important`,
                  boxShadow: `0 10px 22px -14px ${brand.primary[700]}`,
                },
              }}
            />
          )}
        </Stack>
      )}
    </Card>
  );
}

export default DataTable;
