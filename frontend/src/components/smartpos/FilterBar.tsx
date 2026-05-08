import { type ReactNode } from 'react';
import {
  Box, Button, Chip, Collapse, InputAdornment,
  Paper, Stack, TextField,
} from '@mui/material';
import { IconFilter, IconSearch } from '@tabler/icons-react';
import { brand } from 'src/theme/smartpos/brand';

export interface ActiveFilter {
  key: string;
  label: string;
  clear: () => void;
}

export interface FilterBarProps {
  /** Search input placeholder text. */
  searchPlaceholder?: string;
  /** Current search value. */
  searchValue: string;
  /** Called when search text changes. */
  onSearchChange: (value: string) => void;
  /** aria-label for the search input. */
  searchAriaLabel?: string;

  /** Whether the collapsible filter panel is open. */
  filtersOpen: boolean;
  /** Called to toggle the filter panel. */
  onFiltersToggle: () => void;

  /** Active filter chips to display below the search row. */
  activeFilters: ActiveFilter[];
  /** Called when "Clear all" is clicked. */
  onClearAll: () => void;

  /** Filter controls rendered inside the collapsible panel. */
  children?: ReactNode;

  /** Optional ref for the search input (keyboard shortcut focus). */
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
}

const chipSx = {
  height: 32,
  borderRadius: '8px',
  bgcolor: brand.primary[50],
  border: `1px solid ${brand.primary[200]}`,
  fontWeight: 600,
  color: brand.primary[700],
  '& .MuiChip-deleteIcon': { color: brand.primary[500], fontSize: 16 },
};

export default function FilterBar({
  searchPlaceholder = 'Search…',
  searchValue,
  onSearchChange,
  searchAriaLabel = 'Search',
  filtersOpen,
  onFiltersToggle,
  activeFilters,
  onClearAll,
  children,
  searchInputRef,
}: FilterBarProps) {
  const hasActiveFilters = activeFilters.length > 0;

  return (
    <Paper
      elevation={0}
      sx={{
        mb: 2,
        borderRadius: '12px',
        border: `1px solid ${brand.neutral[200]}`,
        bgcolor: '#fff',
        overflow: 'hidden',
      }}
    >
      {/* Search row */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ px: 2, py: 1.5 }}>
        <TextField
          size="small"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          inputRef={searchInputRef}
          inputProps={{ 'aria-label': searchAriaLabel }}
          sx={{
            minWidth: { xs: '100%', md: 360 },
            flex: 1.2,
            '& .MuiOutlinedInput-root': { borderRadius: '10px', height: 44, fontSize: '0.95rem' },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <IconSearch size={18} color={brand.neutral[500]} />
              </InputAdornment>
            ),
          }}
        />
        <Button
          variant={hasActiveFilters ? 'contained' : 'outlined'}
          size="small"
          startIcon={<IconFilter size={15} />}
          onClick={onFiltersToggle}
          sx={{
            height: 44,
            borderRadius: '10px',
            px: 1.75,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            flexShrink: 0,
            ...(hasActiveFilters
              ? {
                  background: `linear-gradient(135deg, ${brand.primary[500]} 0%, ${brand.primary[700]} 100%)`,
                }
              : { borderColor: brand.neutral[200], color: brand.neutral[700] }),
          }}
        >
          Filters
          {hasActiveFilters && (
            <Box
              component="span"
              sx={{
                ml: 0.75,
                width: 20,
                height: 20,
                borderRadius: '50%',
                bgcolor: 'rgba(255,255,255,0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.7rem',
                fontWeight: 800,
              }}
            >
              {activeFilters.length}
            </Box>
          )}
        </Button>
      </Stack>

      {/* Collapsible filter controls */}
      <Collapse in={filtersOpen}>
        <Stack
          direction="row"
          spacing={1.25}
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
          sx={{ px: 2, pb: 1.5, pt: 0 }}
        >
          {children}
        </Stack>
      </Collapse>

      {/* Active filter chips — always visible */}
      {activeFilters.length > 0 && (
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
          sx={{
            px: 2,
            pb: 1.5,
            borderTop: filtersOpen ? `1px solid ${brand.neutral[100]}` : 'none',
          }}
        >
          {activeFilters.map((f) => (
            <Chip
              key={f.key}
              label={f.label}
              size="medium"
              onDelete={f.clear}
              sx={chipSx}
            />
          ))}
          <Button
            variant="text"
            onClick={onClearAll}
            size="small"
            sx={{
              color: brand.neutral[500],
              fontWeight: 600,
              textTransform: 'none',
              px: 0.75,
              fontSize: '0.8rem',
            }}
          >
            Clear all
          </Button>
        </Stack>
      )}
    </Paper>
  );
}
