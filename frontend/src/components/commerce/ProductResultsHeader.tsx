import React from 'react';
import { Box, Typography, Select, MenuItem, FormControl, IconButton } from '@mui/material';
import { TuneOutlined } from '@mui/icons-material';
import { useStorefront } from '../../context/CommerceContext';

interface ProductResultsHeaderProps {
  totalElements: number;
  sort: string;
  onSortChange: (value: string) => void;
  onFilterToggle: () => void;
  filtersActive: boolean;
  query?: string;
}

const ProductResultsHeader: React.FC<ProductResultsHeaderProps> = ({
  totalElements,
  sort,
  onSortChange,
  onFilterToggle,
  filtersActive,
  query,
}) => {
  const { theme } = useStorefront();
  const accent = theme?.settings?.colors?.accent || '#ff6b35';

  return (
    <Box sx={{ mb: 2.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
        <Box>
          <Typography variant="h5" fontWeight={800} sx={{ fontFamily: 'var(--commerce-font-heading, Outfit, sans-serif)' }}>
            {query ? `Results for "${query}"` : 'All Products'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {totalElements} product{totalElements !== 1 ? 's' : ''} found
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <Select
              value={sort}
              onChange={(e) => onSortChange(e.target.value)}
              displayEmpty
              sx={{ borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600 }}
            >
              <MenuItem value="newest">Newest</MenuItem>
              <MenuItem value="priceAsc">Price: Low – High</MenuItem>
              <MenuItem value="priceDesc">Price: High – Low</MenuItem>
              <MenuItem value="name">Name</MenuItem>
              <MenuItem value="discount">Best Discount</MenuItem>
            </Select>
          </FormControl>
          <IconButton
            onClick={onFilterToggle}
            sx={{
              display: { md: 'none' },
              border: filtersActive ? `2px solid ${accent}` : '1px solid #e5e7eb',
              borderRadius: '8px',
              bgcolor: filtersActive ? `${accent}14` : 'transparent',
              width: 40,
              height: 40,
            }}
          >
            <TuneOutlined sx={{ color: filtersActive ? accent : 'inherit' }} />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
};

export default ProductResultsHeader;
