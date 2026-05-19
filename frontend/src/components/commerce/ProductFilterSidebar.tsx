import React, { useState } from 'react';
import {
  Box, Typography, Drawer, IconButton, Slider, Checkbox,
  FormControlLabel, Switch, Button, Divider, Stack, Chip,
} from '@mui/material';
import { Close, Replay } from '@mui/icons-material';
import type { ProductFilterState } from '../../hooks/useProductFilters';
import { useStorefront } from '../../context/CommerceContext';

interface CategoryInfo {
  id: string;
  name: string;
  slug: string;
}

interface ProductFilterSidebarProps {
  open: boolean;
  onClose: () => void;
  filters: ProductFilterState;
  categories: CategoryInfo[];
  availableBrands: string[];
  setFilter: (key: string, value: string | string[] | number | boolean | undefined) => void;
  toggleBrand: (brand: string) => void;
  setPriceRange: (min: number | undefined, max: number | undefined) => void;
  clearAllFilters: () => void;
  PRICE_RANGES: readonly { label: string; min: number; max: number | undefined }[];
  RATING_OPTIONS: readonly { label: string; value: number }[];
}

const SIDEBAR_WIDTH = 280;

const sectionTitleSx = {
  fontSize: '0.8rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'text.secondary',
  mb: 1.5,
};

const ProductFilterSidebar: React.FC<ProductFilterSidebarProps> = ({
  open,
  onClose,
  filters,
  categories,
  availableBrands,
  setFilter,
  toggleBrand,
  setPriceRange,
  clearAllFilters,
  PRICE_RANGES,
  RATING_OPTIONS,
}) => {
  const { theme } = useStorefront();
  const primary = theme?.settings?.colors?.primary || '#1a1a2e';
  const accent = theme?.settings?.colors?.accent || '#ff6b35';

  const [priceSliderValue, setPriceSliderValue] = useState<[number, number]>([0, 200]);
  const [showSlider, setShowSlider] = useState(false);

  const hasActiveFilters =
    !!filters.categoryId ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined ||
    filters.brands.length > 0 ||
    filters.rating !== undefined ||
    filters.inStock;

  const content = (
    <Box sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={800}>
          Filters
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {hasActiveFilters && (
            <Button
              size="small"
              startIcon={<Replay sx={{ fontSize: 14 }} />}
              onClick={clearAllFilters}
              sx={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'none' }}
            >
              Reset
            </Button>
          )}
          <IconButton onClick={onClose} size="small" sx={{ display: { md: 'none' } }}>
            <Close fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <Divider />

      <Box sx={{ flex: 1, overflowY: 'auto', py: 2 }}>
        {/* Categories */}
        <Box sx={{ mb: 3 }}>
          <Typography sx={sectionTitleSx}>Category</Typography>
          <Stack spacing={0.5}>
            <Chip
              label="All Categories"
              size="small"
              variant={!filters.categoryId ? 'filled' : 'outlined'}
              onClick={() => setFilter('categoryId', undefined)}
              sx={{
                fontWeight: 600,
                justifyContent: 'flex-start',
                bgcolor: !filters.categoryId ? primary : 'transparent',
                color: !filters.categoryId ? '#fff' : 'inherit',
                '&:hover': { borderColor: primary },
              }}
            />
            {categories.map((cat) => (
              <Chip
                key={cat.id}
                label={cat.name}
                size="small"
                variant={filters.categoryId === cat.id ? 'filled' : 'outlined'}
                onClick={() =>
                  setFilter('categoryId', filters.categoryId === cat.id ? undefined : cat.id)
                }
                sx={{
                  fontWeight: 600,
                  justifyContent: 'flex-start',
                  bgcolor: filters.categoryId === cat.id ? primary : 'transparent',
                  color: filters.categoryId === cat.id ? '#fff' : 'inherit',
                  '&:hover': { borderColor: primary },
                }}
              />
            ))}
          </Stack>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Price Range */}
        <Box sx={{ mb: 3 }}>
          <Typography sx={sectionTitleSx}>Price Range</Typography>
          <Stack spacing={0.5}>
            {PRICE_RANGES.map((range) => {
              const isActive = filters.minPrice === range.min && filters.maxPrice === range.max;
              return (
                <Chip
                  key={range.label}
                  label={range.label}
                  size="small"
                  variant={isActive ? 'filled' : 'outlined'}
                  onClick={() =>
                    isActive
                      ? setPriceRange(undefined, undefined)
                      : setPriceRange(range.min, range.max)
                  }
                  sx={{
                    fontWeight: 600,
                    justifyContent: 'flex-start',
                    bgcolor: isActive ? primary : 'transparent',
                    color: isActive ? '#fff' : 'inherit',
                    '&:hover': { borderColor: primary },
                  }}
                />
              );
            })}
          </Stack>
          <Button
            size="small"
            onClick={() => setShowSlider(!showSlider)}
            sx={{ mt: 1, fontSize: '0.75rem', fontWeight: 600, textTransform: 'none', color: accent }}
          >
            {showSlider ? 'Hide custom range' : 'Custom range'}
          </Button>
          {showSlider && (
            <Box sx={{ px: 1, mt: 1 }}>
              <Slider
                value={priceSliderValue}
                onChange={(_, val) => setPriceSliderValue(val as [number, number])}
                onChangeCommitted={(_, val) => {
                  const [min, max] = val as [number, number];
                  setPriceRange(min, max > 199 ? undefined : max);
                }}
                min={0}
                max={200}
                step={5}
                valueLabelDisplay="auto"
                valueLabelFormat={(v) => `$${v}`}
                sx={{ color: primary }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" color="text.secondary">${priceSliderValue[0]}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {priceSliderValue[1] >= 199 ? '$200+' : `$${priceSliderValue[1]}`}
                </Typography>
              </Box>
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Brand */}
        {availableBrands.length > 0 && (
          <>
            <Box sx={{ mb: 3 }}>
              <Typography sx={sectionTitleSx}>Brand</Typography>
              <Stack spacing={0.5}>
                {availableBrands.map((brand) => (
                  <FormControlLabel
                    key={brand}
                    control={
                      <Checkbox
                        size="small"
                        checked={filters.brands.includes(brand)}
                        onChange={() => toggleBrand(brand)}
                        sx={{
                          color: primary,
                          '&.Mui-checked': { color: primary },
                        }}
                      />
                    }
                    label={brand}
                    sx={{ '& .MuiTypography-root': { fontSize: '0.85rem', fontWeight: 500 } }}
                  />
                ))}
              </Stack>
            </Box>
            <Divider sx={{ my: 2 }} />
          </>
        )}

        {/* Rating */}
        <Box sx={{ mb: 3 }}>
          <Typography sx={sectionTitleSx}>Minimum Rating</Typography>
          <Stack spacing={0.5}>
            {RATING_OPTIONS.map((opt) => (
              <Chip
                key={opt.value}
                label={opt.label}
                size="small"
                variant={filters.rating === opt.value ? 'filled' : 'outlined'}
                onClick={() =>
                  setFilter('rating', filters.rating === opt.value ? undefined : opt.value)
                }
                sx={{
                  fontWeight: 600,
                  justifyContent: 'flex-start',
                  bgcolor: filters.rating === opt.value ? primary : 'transparent',
                  color: filters.rating === opt.value ? '#fff' : 'inherit',
                  '&:hover': { borderColor: primary },
                }}
              />
            ))}
          </Stack>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Availability */}
        <Box>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={filters.inStock || false}
                onChange={(e) => setFilter('inStock', e.target.checked || undefined)}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: primary },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: primary },
                }}
              />
            }
            label={<Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>In Stock Only</Typography>}
          />
        </Box>
      </Box>
    </Box>
  );

  return (
    <>
      {/* Mobile drawer */}
      <Drawer
        anchor="left"
        open={open}
        onClose={onClose}
        sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH } }}
      >
        {content}
      </Drawer>

      {/* Desktop persistent sidebar */}
      <Box
        sx={{
          display: { xs: 'none', md: 'block' },
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            width: SIDEBAR_WIDTH,
            position: 'sticky',
            top: 120,
            maxHeight: 'calc(100vh - 140px)',
            overflowY: 'auto',
            borderRadius: 3,
            border: '1px solid #e5e7eb',
            bgcolor: '#fff',
          }}
        >
          {content}
        </Box>
      </Box>
    </>
  );
};

export default ProductFilterSidebar;
