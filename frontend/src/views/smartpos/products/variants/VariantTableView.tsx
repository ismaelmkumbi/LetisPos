import { useContext, useMemo } from 'react';
import DataTable from 'src/components/smartpos/DataTable';
import { useSelection } from 'src/components/smartpos/useSelection';
import { CustomizerContext } from 'src/context/CustomizerContext';
import { variantColumns } from './variantColumns';
import type { Variant } from 'src/api/smartpos/types';

interface VariantTableViewProps {
  variants: Variant[];
  loading?: boolean;
  onDelete: (id: string) => void;
}

export function VariantTableView({ variants, loading, onDelete }: VariantTableViewProps) {
  const { activeMode } = useContext(CustomizerContext);
  const isDark = activeMode === 'dark';
  const sel = useSelection(variants);

  const columns = useMemo(
    () => [sel.selectionColumn(), ...variantColumns({ onDelete, isDark })],
    [sel, onDelete, isDark],
  );

  return (
    <DataTable
      columns={columns}
      rows={variants}
      loading={loading}
      emptyText="No variants yet"
      page={0}
      totalPages={1}
      totalElements={variants.length}
      getRowKey={(v) => v.id}
      density="compact"
      tableKey="product-variants"
      enableSorting
      enableColumnVisibility
      enableExport
      exportFileName="variants-export"
    />
  );
}

export { useSelection };
export type { VariantTableViewProps };
