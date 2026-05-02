import { type ReactNode } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { brand } from 'src/theme/smartpos/brand';

export interface BulkActionBarProps {
  /** Number of selected items. */
  selectedCount: number;
  /** Called when "Cancel" is clicked. */
  onClear: () => void;
  /** Singular label for the count (e.g. "product", "category"). Defaults to "item". */
  itemLabel?: string;
  /** Action buttons to render. */
  children?: ReactNode;
}

export default function BulkActionBar({
  selectedCount,
  onClear,
  children,
}: BulkActionBarProps) {
  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      sx={{
        mb: 1.2,
        px: 1.75,
        py: 1.25,
        borderRadius: '10px',
        border: `1px solid ${brand.neutral[200]}`,
        bgcolor: brand.success.light,
        flexWrap: 'wrap',
        rowGap: 1,
      }}
    >
      <Typography
        sx={{
          color: brand.primary[700],
          fontWeight: 800,
          fontSize: '1rem',
          mr: 1,
        }}
      >
        {selectedCount} selected
      </Typography>
      {children}
      <Box sx={{ flex: 1 }} />
      <Button
        size="small"
        variant="text"
        onClick={onClear}
        sx={{ fontWeight: 700, color: brand.neutral[600] }}
      >
        Cancel
      </Button>
    </Stack>
  );
}
