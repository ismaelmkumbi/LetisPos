import React from 'react';
import { Box, Chip, Button } from '@mui/material';
import type { ActiveFilter } from '../../hooks/useProductFilters';

interface ActiveFilterChipsProps {
  chips: ActiveFilter[];
  onClearAll: () => void;
}

const ActiveFilterChips: React.FC<ActiveFilterChipsProps> = ({ chips, onClearAll }) => {
  if (!chips.length) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        overflowX: 'auto',
        py: 0.5,
        '&::-webkit-scrollbar': { display: 'none' },
        scrollbarWidth: 'none',
      }}
    >
      {chips.map((chip) => (
        <Chip
          key={chip.key}
          label={chip.label}
          size="small"
          onDelete={chip.clear}
          sx={{
            flexShrink: 0,
            fontWeight: 600,
            fontSize: '0.75rem',
            bgcolor: 'var(--commerce-primary, #1a1a2e)',
            color: '#fff',
            '& .MuiChip-deleteIcon': {
              color: 'rgba(255,255,255,0.7)',
              fontSize: 16,
              '&:hover': { color: '#fff' },
            },
          }}
        />
      ))}
      <Button
        variant="text"
        onClick={onClearAll}
        size="small"
        sx={{
          fontWeight: 600,
          textTransform: 'none',
          px: 1,
          fontSize: '0.8rem',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          color: 'var(--commerce-text, #666)',
        }}
      >
        Clear all
      </Button>
    </Box>
  );
};

export default ActiveFilterChips;
