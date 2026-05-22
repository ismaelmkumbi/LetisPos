import { IconButton, Tooltip, Avatar } from '@mui/material';
import { IconTrash } from '@tabler/icons-react';
import { formatMoney } from 'src/utils/smartpos/currency';
import { brand } from 'src/theme/smartpos/brand';
import type { Variant } from 'src/api/smartpos/types';
import type { Column } from 'src/components/smartpos/DataTable';

export function variantColumns({
  onDelete,
  isDark = false,
}: {
  onDelete: (id: string) => void;
  isDark?: boolean;
}): Column<Variant>[] {
  const nameColor = isDark ? brand.neutral[100] : brand.neutral[800];
  const mutedColor = isDark ? brand.neutral[400] : brand.neutral[300];
  const codeColor = isDark ? brand.neutral[300] : brand.neutral[600];
  const bgColor = isDark ? brand.neutral[800] : brand.primary[50];
  const borderColor = isDark ? brand.neutral[600] : brand.neutral[200];

  return [
    {
      key: 'image',
      label: '',
      width: 52,
      sortable: false,
      enableHiding: false,
      exportValue: () => '',
      render: (row) => (
        <Avatar
          src={row.imageUrl ?? undefined}
          variant="rounded"
          sx={{
            width: 30,
            height: 30,
            borderRadius: '8px',
            bgcolor: bgColor,
            border: `1px solid ${borderColor}`,
            fontSize: '0.7rem',
            color: mutedColor,
          }}
        >
          {row.name.charAt(0).toUpperCase()}
        </Avatar>
      ),
    },
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      exportValue: (row) => row.name,
      render: (row) => (
        <span style={{ fontWeight: 600, fontSize: '0.8125rem', color: nameColor }}>
          {row.name}
        </span>
      ),
    },
    {
      key: 'code',
      label: 'SKU',
      sortable: true,
      exportValue: (row) => row.code ?? '',
      render: (row) => (
        <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: codeColor }}>
          {row.code ?? '—'}
        </span>
      ),
    },
    {
      key: 'cost',
      label: 'Cost',
      align: 'right',
      sortable: true,
      exportValue: (row) => row.cost ?? '',
      render: (row) => (
        <span style={{ fontWeight: 600, fontSize: '0.8125rem', fontVariantNumeric: 'tabular-nums' }}>
          {row.cost != null ? formatMoney(row.cost) : '—'}
        </span>
      ),
    },
    {
      key: 'price',
      label: 'Price',
      align: 'right',
      sortable: true,
      exportValue: (row) => row.price ?? '',
      render: (row) => (
        <span
          style={{
            fontWeight: 700,
            fontSize: '0.8125rem',
            color: brand.primary[600],
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {row.price != null ? formatMoney(row.price) : '—'}
        </span>
      ),
    },
    {
      key: 'wholesalePrice',
      label: 'Wholesale',
      align: 'right',
      sortable: true,
      defaultHidden: true,
      exportValue: (row) => row.wholesalePrice ?? '',
      render: (row) => (
        <span style={{ fontWeight: 500, fontSize: '0.8125rem', fontVariantNumeric: 'tabular-nums' }}>
          {row.wholesalePrice != null ? formatMoney(row.wholesalePrice) : '—'}
        </span>
      ),
    },
    {
      key: 'minPrice',
      label: 'Min Price',
      align: 'right',
      sortable: true,
      defaultHidden: true,
      exportValue: (row) => row.minPrice ?? '',
      render: (row) => (
        <span style={{ fontWeight: 500, fontSize: '0.8125rem', fontVariantNumeric: 'tabular-nums' }}>
          {row.minPrice != null ? formatMoney(row.minPrice) : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: 48,
      align: 'center',
      sortable: false,
      enableHiding: false,
      exportValue: () => '',
      render: (row) => (
        <Tooltip title="Delete variant">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(row.id);
            }}
            sx={{
              borderRadius: '8px',
              color: isDark ? brand.neutral[500] : brand.neutral[400],
              '&:hover': {
                color: brand.error.main,
                bgcolor: isDark ? 'rgba(239,68,68,0.15)' : brand.error.light,
              },
            }}
          >
            <IconTrash size={16} />
          </IconButton>
        </Tooltip>
      ),
    },
  ];
}
