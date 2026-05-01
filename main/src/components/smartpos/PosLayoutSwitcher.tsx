import { ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import {
  IconLayoutSidebarLeftCollapse,
  IconLayoutGridAdd,
  IconLayoutSidebarLeftExpand,
  IconLayoutBoardSplit,
  IconSparkles,
} from '@tabler/icons-react';
import { usePosLayout, type PosLayout } from 'src/context/smartpos/PosLayoutContext';
import { brand } from 'src/theme/smartpos/brand';

const layoutOptions = [
  {
    value: 'modern' as PosLayout,
    icon: IconSparkles,
    label: 'Modern',
    tooltip: 'Premium Shopify-style: left checkout, sticky pay bar',
  },
  {
    value: 'classic' as PosLayout,
    icon: IconLayoutSidebarLeftCollapse,
    label: 'Classic',
    tooltip: 'Left products, right sticky cart',
  },
  {
    value: 'compact' as PosLayout,
    icon: IconLayoutGridAdd,
    label: 'Compact',
    tooltip: 'Full products, floating checkout',
  },
  {
    value: 'sidebar' as PosLayout,
    icon: IconLayoutSidebarLeftExpand,
    label: 'Sidebar',
    tooltip: 'Left cart, right full products',
  },
  {
    value: 'modal' as PosLayout,
    icon: IconLayoutBoardSplit,
    label: 'Modal',
    tooltip: 'Full products, modal checkout',
  },
];

export default function PosLayoutSwitcher() {
  const { layout, setLayout } = usePosLayout();

  return (
    <ToggleButtonGroup
      value={layout}
      exclusive
      onChange={(_, newLayout) => newLayout && setLayout(newLayout)}
      size="small"
      sx={{
        border: `1px solid ${brand.neutral[200]}`,
        borderRadius: '8px',
        '& .MuiToggleButton-root': {
          border: 'none',
          padding: '8px 10px',
          '&:hover': {
            bgcolor: brand.neutral[100],
          },
          '&.Mui-selected': {
            bgcolor: brand.primary[100],
            color: brand.primary[600],
            '&:hover': {
              bgcolor: brand.primary[100],
            },
          },
        },
      }}
    >
      {layoutOptions.map(({ value, icon: Icon, tooltip }) => (
        <Tooltip key={value} title={tooltip} arrow>
          <ToggleButton value={value} aria-label={value}>
            <Icon size={18} />
          </ToggleButton>
        </Tooltip>
      ))}
    </ToggleButtonGroup>
  );
}
