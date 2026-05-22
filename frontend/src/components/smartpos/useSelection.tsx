import { useCallback, useRef, useState } from 'react';
import { Checkbox } from '@mui/material';
import { brand } from 'src/theme/smartpos/brand';
import type { Column } from './DataTable';

/**
 * Reusable checkbox selection with shift+click range-select.
 *
 * Usage:
 *   const sel = useSelection(rows);
 *   // sel.selectedIds, sel.selectedIdsRef, sel.clearSelection
 *   // Pass sel.selectionColumn() into your columns array
 */
export function useSelection<T extends { id: string }>(rows: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectedIdsRef = useRef(selectedIds);
  // Sync ref during render so checkboxes never read a stale value.
  // useEffect runs after paint — by then the column render already ran
  // with the old ref, causing the checkbox to lag one click behind.
  selectedIdsRef.current = selectedIds;

  const lastClickedIndexRef = useRef<number | null>(null);

  const handleCheckboxClick = useCallback(
    (row: T, index: number, e: React.MouseEvent) => {
      if (e.shiftKey && lastClickedIndexRef.current !== null) {
        const from = Math.min(lastClickedIndexRef.current, index);
        const to = Math.max(lastClickedIndexRef.current, index);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          for (let i = from; i <= to; i++) {
            const r = rows[i];
            if (r) next.add(r.id);
          }
          return next;
        });
      } else {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(row.id)) next.delete(row.id);
          else next.add(row.id);
          return next;
        });
      }
      lastClickedIndexRef.current = index;
    },
    [rows],
  );

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  /** Standard checkbox column definition. Add this to your columns array. */
  const selectionColumn = useCallback(
    (): Column<T> => ({
      key: '_select',
      label: '',
      width: 44,
      enableHiding: false,
      exportValue: () => '',
      render: (row, idx) => (
        <Checkbox
          size="small"
          checked={selectedIdsRef.current.has(row.id)}
          onChange={() => {}}
          onClick={(e) => {
            e.stopPropagation();
            handleCheckboxClick(row, idx, e);
          }}
          sx={{
            p: 0.375,
            color: brand.neutral[300],
            '&.Mui-checked': { color: brand.primary[600] },
          }}
        />
      ),
    }),
    [handleCheckboxClick],
  );

  return {
    selectedIds,
    selectedIdsRef,
    handleCheckboxClick,
    clearSelection,
    selectionColumn,
  } as const;
}
