/**
 * Letis POS — Enterprise-Grade Data Table
 *
 * Advanced features:
 *  - Advanced filters with filter chips
 *  - Bulk actions bar (select all, delete, export)
 *  - Column visibility toggle
 *  - View density switcher (compact/comfortable)
 *  - Export dropdown (CSV, PDF, Excel)
 *  - Sticky column support
 *  - Row selection with checkboxes
 */
import { useState, useMemo } from 'react';
import {
  Box, Card, Skeleton, Stack, Table, TableBody, TableCell,
  TableHead, TableRow, Typography, Pagination, Chip,
  Checkbox, IconButton, Button, Menu, MenuItem, Tooltip,
  Toolbar, Badge, Divider, TextField, InputAdornment,
  ToggleButton, ToggleButtonGroup, FormControlLabel, ListItemIcon
} from '@mui/material';
import {
  IconSearch, IconFilter, IconDownload,
  IconEye, IconLayoutGrid, IconList,
  IconCheck, IconX, IconFileSpreadsheet, IconFileTypePdf,
  IconFileTypeCsv, IconChevronDown
} from '@tabler/icons-react';
import { brand } from 'src/theme/smartpos/brand';

export interface Column<T> {
  key: string;
  label: string;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  filterable?: boolean;
  hidden?: boolean;
  sticky?: boolean;
  render?: (row: T) => React.ReactNode;
}

export interface FilterChip {
  key: string;
  label: string;
  value: string;
  onRemove: () => void;
}

export interface BulkAction<T> {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: (selected: T[]) => void;
  variant?: 'primary' | 'danger' | 'neutral';
  disabled?: (selected: T[]) => boolean;
}

export interface EnhancedDataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  emptyText?: string;
  emptyIcon?: React.ReactNode;
  emptyActions?: React.ReactNode;
  totalPages?: number;
  totalElements?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onRowClick?: (row: T) => void;
  getRowKey: (row: T, index: number) => string;
  getRowId: (row: T) => string;

  // Selection
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;

  // Filters
  filterChips?: FilterChip[];
  onFilterClick?: () => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;

  // Bulk actions
  bulkActions?: BulkAction<T>[];

  // Export
  onExport?: (format: 'csv' | 'pdf' | 'excel') => void;

  // View options
  density?: 'compact' | 'comfortable';
  onDensityChange?: (density: 'compact' | 'comfortable') => void;
  onColumnVisibilityChange?: (columns: Column<T>[]) => void;
}

const SKELETON_ROWS = 6;

export function EnhancedDataTable<T>({
  columns: initialColumns,
  rows,
  loading,
  emptyText = 'No records found',
  emptyIcon,
  emptyActions,
  totalPages,
  totalElements,
  page = 0,
  pageSize = 20,
  onPageChange,
  onRowClick,
  getRowKey,
  getRowId,

  // Selection
  selectable = false,
  selectedIds: controlledSelectedIds,
  onSelectionChange,

  // Filters
  filterChips,
  onFilterClick,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',

  // Bulk actions
  bulkActions,

  // Export
  onExport,

  // View options
  density: controlledDensity,
  onDensityChange,
  onColumnVisibilityChange,
}: EnhancedDataTableProps<T>) {
  // State
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>([]);
  const [internalDensity, setInternalDensity] = useState<'compact' | 'comfortable'>('comfortable');
  const [columns, setColumns] = useState<Column<T>[]>(initialColumns);
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  const [columnMenuAnchor, setColumnMenuAnchor] = useState<null | HTMLElement>(null);

  // Use controlled or uncontrolled state
  const selectedIds = controlledSelectedIds ?? internalSelectedIds;
  const density = controlledDensity ?? internalDensity;

  const setSelectedIds = (ids: string[]) => {
    if (controlledSelectedIds === undefined) {
      setInternalSelectedIds(ids);
    }
    onSelectionChange?.(ids);
  };

  const setDensity = (d: 'compact' | 'comfortable') => {
    if (controlledDensity === undefined) {
      setInternalDensity(d);
    }
    onDensityChange?.(d);
  };

  // Derived values
  const visibleColumns = columns.filter(c => !c.hidden);
  const rowHeight = density === 'compact' ? 44 : 56;
  const hasSelection = selectable && selectedIds.length > 0;
  const allSelected = rows.length > 0 && selectedIds.length === rows.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < rows.length;

  // Selection handlers
  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(rows.map(getRowId));
    }
  };

  const handleSelectRow = (row: T) => {
    const id = getRowId(row);
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleColumnVisibilityToggle = (key: string) => {
    const newColumns = columns.map(c =>
      c.key === key ? { ...c, hidden: !c.hidden } : c
    );
    setColumns(newColumns);
    onColumnVisibilityChange?.(newColumns);
  };

  // Selected rows data for bulk actions
  const selectedRows = useMemo(() => {
    return rows.filter(r => selectedIds.includes(getRowId(r)));
  }, [rows, selectedIds, getRowId]);

  // Pagination display
  const startRow = page * pageSize + 1;
  const endRow = Math.min((page + 1) * pageSize, totalElements ?? rows.length);
  const showPagination = totalPages !== undefined && totalPages > 1;

  return (
    <Card
      elevation={0}
      sx={{
        border: `1px solid ${brand.neutral[200]}`,
        borderRadius: '16px',
        overflow: 'hidden',
      }}
    >
      {/* Toolbar */}
      <Toolbar
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: `1px solid ${brand.neutral[200]}`,
          bgcolor: 'white',
          minHeight: 'auto',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        {hasSelection ? (
          // Bulk action bar
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1 }}>
            <Chip
              icon={<IconCheck size={14} />}
              label={`${selectedIds.length} selected`}
              size="small"
              onDelete={() => setSelectedIds([])}
              sx={{
                height: 28,
                fontWeight: 600,
                bgcolor: brand.primary[50],
                color: brand.primary[700],
                '& .MuiChip-deleteIcon': { color: brand.primary[500] },
              }}
            />
            <Divider orientation="vertical" flexItem sx={{ height: 24 }} />
            {bulkActions?.map(action => {
              const disabled = action.disabled?.(selectedRows) ?? false;
              const isDanger = action.variant === 'danger';
              return (
                <Button
                  key={action.key}
                  size="small"
                  startIcon={action.icon}
                  onClick={() => action.onClick(selectedRows)}
                  disabled={disabled}
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    color: isDanger ? brand.error.main : brand.neutral[700],
                    '&:hover': {
                      bgcolor: isDanger ? brand.error.light : brand.neutral[100],
                    },
                  }}
                >
                  {action.label}
                </Button>
              );
            })}
          </Stack>
        ) : (
          // Search + filters
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1, flexWrap: 'wrap' }}>
            {onSearchChange && (
              <TextField
                size="small"
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <IconSearch size={16} color={brand.neutral[400]} />
                    </InputAdornment>
                  ),
                  endAdornment: searchValue && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => onSearchChange('')}>
                        <IconX size={14} />
                      </IconButton>
                    </InputAdornment>
                  ),
                  sx: {
                    borderRadius: '10px',
                    bgcolor: brand.neutral[50],
                    '& fieldset': { borderColor: brand.neutral[200] },
                    minWidth: 240,
                  }
                }}
              />
            )}

            {onFilterClick && (
              <Button
                size="small"
                startIcon={<IconFilter size={16} />}
                onClick={onFilterClick}
                sx={{
                  fontWeight: 600,
                  color: brand.neutral[700],
                  borderColor: brand.neutral[300],
                  borderRadius: '10px',
                }}
                variant="outlined"
              >
                Filters
                {filterChips && filterChips.length > 0 && (
                  <Badge
                    badgeContent={filterChips.length}
                    color="primary"
                    sx={{ ml: 1, '& .MuiBadge-badge': { fontSize: '0.65rem', height: 16, minWidth: 16 } }}
                  />
                )}
              </Button>
            )}

            {/* Filter chips */}
            {filterChips?.map(chip => (
              <Chip
                key={chip.key}
                label={`${chip.label}: ${chip.value}`}
                size="small"
                onDelete={chip.onRemove}
                sx={{
                  height: 26,
                  fontWeight: 500,
                  fontSize: '0.75rem',
                  bgcolor: brand.neutral[100],
                  color: brand.neutral[700],
                }}
              />
            ))}
          </Stack>
        )}

        {/* View controls */}
        <Stack direction="row" spacing={0.5} alignItems="center">
          {/* Export */}
          {onExport && (
            <>
              <Button
                size="small"
                startIcon={<IconDownload size={16} />}
                endIcon={<IconChevronDown size={14} />}
                onClick={(e) => setExportMenuAnchor(e.currentTarget)}
                sx={{
                  fontWeight: 600,
                  color: brand.neutral[700],
                  borderRadius: '10px',
                }}
              >
                Export
              </Button>
              <Menu
                anchorEl={exportMenuAnchor}
                open={Boolean(exportMenuAnchor)}
                onClose={() => setExportMenuAnchor(null)}
                PaperProps={{ sx: { borderRadius: '10px', minWidth: 140 } }}
              >
                <MenuItem onClick={() => { onExport('csv'); setExportMenuAnchor(null); }}>
                  <ListItemIcon><IconFileTypeCsv size={16} /></ListItemIcon>
                  <Typography variant="body2">Export CSV</Typography>
                </MenuItem>
                <MenuItem onClick={() => { onExport('excel'); setExportMenuAnchor(null); }}>
                  <ListItemIcon><IconFileSpreadsheet size={16} /></ListItemIcon>
                  <Typography variant="body2">Export Excel</Typography>
                </MenuItem>
                <MenuItem onClick={() => { onExport('pdf'); setExportMenuAnchor(null); }}>
                  <ListItemIcon><IconFileTypePdf size={16} /></ListItemIcon>
                  <Typography variant="body2">Export PDF</Typography>
                </MenuItem>
              </Menu>
            </>
          )}

          <Divider orientation="vertical" flexItem sx={{ height: 24, mx: 0.5 }} />

          {/* Column visibility */}
          <Tooltip title="Column visibility">
            <IconButton
              size="small"
              onClick={(e) => setColumnMenuAnchor(e.currentTarget)}
              sx={{ color: brand.neutral[500] }}
            >
              <IconEye size={18} />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={columnMenuAnchor}
            open={Boolean(columnMenuAnchor)}
            onClose={() => setColumnMenuAnchor(null)}
            PaperProps={{ sx: { borderRadius: '10px', minWidth: 180, maxHeight: 320 } }}
          >
            <Typography
              variant="caption"
              sx={{
                px: 2,
                py: 1,
                display: 'block',
                color: brand.neutral[500],
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              Toggle columns
            </Typography>
            {columns.map(col => (
              <MenuItem
                key={col.key}
                dense
                onClick={() => handleColumnVisibilityToggle(col.key)}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={!col.hidden}
                      onChange={() => {}}
                      sx={{ py: 0.5 }}
                    />
                  }
                  label={col.label}
                  sx={{ m: 0, width: '100%' }}
                />
              </MenuItem>
            ))}
          </Menu>

          {/* Density toggle */}
          <ToggleButtonGroup
            size="small"
            value={density}
            exclusive
            onChange={(_, v) => v && setDensity(v)}
            sx={{
              '& .MuiToggleButton-root': {
                borderColor: brand.neutral[200],
                color: brand.neutral[500],
                '&.Mui-selected': {
                  bgcolor: brand.neutral[100],
                  color: brand.neutral[700],
                },
              }
            }}
          >
            <ToggleButton value="compact" title="Compact">
              <IconList size={16} />
            </ToggleButton>
            <ToggleButton value="comfortable" title="Comfortable">
              <IconLayoutGrid size={16} />
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Toolbar>

      {/* Table */}
      <Box sx={{ overflowX: 'auto' }}>
        <Table size={density === 'compact' ? 'small' : 'medium'} stickyHeader>
          <TableHead>
            <TableRow>
              {/* Selection checkbox header */}
              {selectable && (
                <TableCell
                  padding="checkbox"
                  sx={{
                    bgcolor: brand.neutral[50],
                    borderBottom: `1px solid ${brand.neutral[200]}`,
                    width: 48,
                  }}
                >
                  <Checkbox
                    size="small"
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={handleSelectAll}
                  />
                </TableCell>
              )}

              {visibleColumns.map((col) => (
                <TableCell
                  key={col.key}
                  align={col.align ?? 'left'}
                  sx={{
                    width: col.width,
                    py: density === 'compact' ? 1 : 1.25,
                    px: 2,
                    bgcolor: brand.neutral[50],
                    fontWeight: 700,
                    color: brand.neutral[500],
                    fontSize: '0.6875rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    borderBottom: `1px solid ${brand.neutral[200]}`,
                    whiteSpace: 'nowrap',
                    userSelect: 'none',
                    ...(col.sticky && {
                      position: 'sticky',
                      left: selectable ? 48 : 0,
                      zIndex: 2,
                    }),
                  }}
                >
                  {col.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              // Skeleton rows
              Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                <TableRow key={`sk-${i}`} sx={{ height: rowHeight }}>
                  {selectable && (
                    <TableCell padding="checkbox">
                      <Skeleton variant="rectangular" width={18} height={18} sx={{ borderRadius: '4px' }} />
                    </TableCell>
                  )}
                  {visibleColumns.map((col) => (
                    <TableCell key={col.key} sx={{ py: density === 'compact' ? 0.75 : 1.25, px: 2 }}>
                      <Skeleton variant="text" sx={{ borderRadius: '6px', width: '70%', height: 18 }} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={visibleColumns.length + (selectable ? 1 : 0)}
                  align="center"
                  sx={{ py: 8, border: 0 }}
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                    {emptyIcon ? (
                      <Box sx={{ color: brand.neutral[300] }}>{emptyIcon}</Box>
                    ) : (
                      <Box
                        sx={{
                          width: 56, height: 56, borderRadius: '16px',
                          bgcolor: brand.neutral[100],
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <IconSearch size={24} color={brand.neutral[400]} />
                      </Box>
                    )}
                    <Typography variant="body1" sx={{ fontWeight: 600, color: brand.neutral[700] }}>
                      {emptyText}
                    </Typography>
                    {(searchValue || filterChips?.length) ? (
                      <Typography variant="body2" sx={{ color: brand.neutral[500] }}>
                        Try adjusting your filters or search terms
                      </Typography>
                    ) : (
                      <Typography variant="body2" sx={{ color: brand.neutral[500] }}>
                        Get started by creating your first record
                      </Typography>
                    )}
                    {emptyActions && (
                      <Box sx={{ mt: 1 }}>{emptyActions}</Box>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, i) => {
                const rowId = getRowId(row);
                const isSelected = selectedIds.includes(rowId);

                return (
                  <TableRow
                    key={getRowKey(row, i)}
                    hover={!!onRowClick}
                    selected={isSelected}
                    onClick={() => {
                      if (selectable) handleSelectRow(row);
                      onRowClick?.(row);
                    }}
                    sx={{
                      height: rowHeight,
                      cursor: onRowClick || selectable ? 'pointer' : 'default',
                      transition: 'background 0.12s ease',
                      '&.MuiTableRow-hover:hover': {
                        backgroundColor: brand.primary[50],
                      },
                      '&.Mui-selected': {
                        backgroundColor: brand.primary[50],
                      },
                      '&:last-child td': { borderBottom: 0 },
                    }}
                  >
                    {/* Selection checkbox */}
                    {selectable && (
                      <TableCell
                        padding="checkbox"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          size="small"
                          checked={isSelected}
                          onChange={() => handleSelectRow(row)}
                        />
                      </TableCell>
                    )}

                    {visibleColumns.map((col) => (
                      <TableCell
                        key={col.key}
                        align={col.align ?? 'left'}
                        sx={{
                          py: density === 'compact' ? 0.75 : 1.25,
                          px: 2,
                          borderBottom: `1px solid ${brand.neutral[100]}`,
                          ...(col.sticky && {
                            position: 'sticky',
                            left: selectable ? 48 : 0,
                            bgcolor: isSelected ? brand.primary[50] : 'inherit',
                            zIndex: 1,
                          }),
                        }}
                      >
                        {col.render ? col.render(row) : (row as any)[col.key] ?? '—'}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Box>

      {/* Footer */}
      {(showPagination || (totalElements !== undefined && rows.length > 0)) && (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            px: 2.5,
            py: 1.25,
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
                {startRow}–{endRow}
              </Typography>{' '}
              of{' '}
              <Typography component="span" variant="caption" sx={{ fontWeight: 700, color: brand.neutral[700] }}>
                {totalElements.toLocaleString()}
              </Typography>{' '}
              records
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
                  fontWeight: 600,
                  fontSize: '0.75rem',
                },
              }}
            />
          )}
        </Stack>
      )}
    </Card>
  );
}

export default EnhancedDataTable;
