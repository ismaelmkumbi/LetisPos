import React from 'react';
import { Grid, Typography, Box, Skeleton } from '@mui/material';
import ProductCard from './ProductCard';
import type { StorefrontProduct } from '../../types/commerce';

interface ProductGridProps {
  products: StorefrontProduct[];
  loading?: boolean;
  emptyMessage?: string;
}

const ProductGrid: React.FC<ProductGridProps> = ({ products, loading, emptyMessage = 'No products found' }) => {
  if (loading) {
    return (
      <Grid container spacing={2.5}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Grid size={{ xs: 6, sm: 4, md: 3 }} key={i}>
            <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 3 }} />
            <Skeleton width="40%" height={16} sx={{ mt: 1 }} />
            <Skeleton width="80%" height={24} />
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
              <Skeleton width="40%" height={28} />
              <Box sx={{ flex: 1 }} />
              <Skeleton variant="circular" width={40} height={40} />
            </Box>
          </Grid>
        ))}
      </Grid>
    );
  }

  if (!products.length) {
    return (
      <Box textAlign="center" py={8}>
        <Typography variant="h6" color="text.secondary" fontWeight={600}>
          {emptyMessage}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Try adjusting your search or browse categories.
        </Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={2.5}>
      {products.map((product) => (
        <Grid size={{ xs: 6, sm: 4, md: 3 }} key={product.id}>
          <ProductCard product={product} />
        </Grid>
      ))}
    </Grid>
  );
};

export default ProductGrid;
