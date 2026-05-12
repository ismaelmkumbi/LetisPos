import React, { useEffect, useState } from 'react';
import { Container, Typography, Box, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { useParams, useSearchParams } from 'react-router';
import ProductGrid from '../../../components/commerce/ProductGrid';
import { storefront } from '../../../api/smartpos/commerce';
import type { StorefrontProduct } from '../../../types/commerce';

const ProductListPage: React.FC = () => {
  const { slug, categoryId } = useParams<{ slug: string; categoryId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<StorefrontProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const currentPage = parseInt(searchParams.get('page') || '0', 10);
  const sort = searchParams.get('sort') || 'newest';

  useEffect(() => {
    setLoading(true);
    storefront.getProducts(slug!, {
      categoryId: categoryId !== 'all' ? categoryId : undefined,
      sort,
      page: currentPage,
      size: 20,
    })
      .then(data => {
        setProducts(data.content);
        setTotalPages(data.totalPages);
        setTotalElements(data.totalElements);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [slug, categoryId, currentPage, sort]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" component="h1"
          sx={{ fontFamily: 'var(--commerce-font-heading, inherit)', color: 'var(--commerce-text, inherit)' }}>
          {categoryId && categoryId !== 'all' ? 'Category' : 'All Products'}
          {totalElements > 0 && (
            <Typography component="span" variant="body1" color="text.secondary" sx={{ ml: 2 }}>
              ({totalElements} products)
            </Typography>
          )}
        </Typography>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Sort By</InputLabel>
          <Select
            value={sort}
            label="Sort By"
            onChange={(e) => {
              setSearchParams(prev => { prev.set('sort', e.target.value); prev.set('page', '0'); return prev; });
            }}
          >
            <MenuItem value="newest">Newest</MenuItem>
            <MenuItem value="priceAsc">Price: Low to High</MenuItem>
            <MenuItem value="priceDesc">Price: High to Low</MenuItem>
            <MenuItem value="name">Name</MenuItem>
          </Select>
        </FormControl>
      </Box>
      <ProductGrid products={products} loading={loading} emptyMessage="No products found in this category." />
      {/* Simple pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 4 }}>
          {Array.from({ length: totalPages }, (_, i) => (
            <Box
              key={i}
              onClick={() => setSearchParams(prev => { prev.set('page', String(i)); return prev; })}
              sx={{
                px: 2, py: 1, cursor: 'pointer', borderRadius: 1,
                bgcolor: currentPage === i ? 'var(--commerce-primary, #1976d2)' : 'grey.100',
                color: currentPage === i ? 'white' : 'inherit',
              }}
            >
              {i + 1}
            </Box>
          ))}
        </Box>
      )}
    </Container>
  );
};

export default ProductListPage;
