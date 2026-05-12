import React, { useEffect, useState } from 'react';
import { Typography, Box } from '@mui/material';
import ProductGrid from './ProductGrid';
import { storefront } from '../../api/smartpos/commerce';
import { useStorefront } from '../../context/CommerceContext';
import type { StorefrontProduct } from '../../types/commerce';

const FeaturedProducts: React.FC = () => {
  const { slug } = useStorefront();
  const [products, setProducts] = useState<StorefrontProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    storefront.getFeaturedProducts(slug)
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [slug]);

  if (!loading && !products.length) return null;

  return (
    <Box py={6}>
      <Typography variant="h4" component="h2" textAlign="center" gutterBottom
        sx={{ color: 'var(--commerce-text, inherit)', fontFamily: 'var(--commerce-font-heading, inherit)' }}>
        Featured Products
      </Typography>
      <ProductGrid products={products} loading={loading} />
    </Box>
  );
};

export default FeaturedProducts;
