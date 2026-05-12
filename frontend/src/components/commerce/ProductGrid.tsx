import React from 'react';
import { Grid, Typography, Box } from '@mui/material';
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
      <Grid container spacing={3}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Grid size={{ xs: 6, sm: 4, md: 3 }} key={i}>
            <Box sx={{ height: 340, bgcolor: 'grey.100', borderRadius: 1, animation: 'pulse 1.5s infinite' }} />
          </Grid>
        ))}
      </Grid>
    );
  }

  if (!products.length) {
    return (
      <Box textAlign="center" py={8}>
        <Typography variant="h6" color="text.secondary">{emptyMessage}</Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={3}>
      {products.map((product) => (
        <Grid size={{ xs: 6, sm: 4, md: 3 }} key={product.id}>
          <ProductCard product={product} />
        </Grid>
      ))}
    </Grid>
  );
};

export default ProductGrid;
