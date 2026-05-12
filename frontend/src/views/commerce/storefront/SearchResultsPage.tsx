import React, { useEffect, useState } from 'react';
import { Container, Typography } from '@mui/material';
import { useParams, useSearchParams } from 'react-router';
import ProductGrid from '../../../components/commerce/ProductGrid';
import { storefront } from '../../../api/smartpos/commerce';
import type { StorefrontProduct } from '../../../types/commerce';

const SearchResultsPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [products, setProducts] = useState<StorefrontProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalElements, setTotalElements] = useState(0);
  const currentPage = parseInt(searchParams.get('page') || '0', 10);

  useEffect(() => {
    if (!query) { setLoading(false); return; }
    setLoading(true);
    storefront.search(slug!, query, currentPage, 20)
      .then(data => {
        setProducts(data.content);
        setTotalElements(data.totalElements);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [slug, query, currentPage]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom
        sx={{ fontFamily: 'var(--commerce-font-heading, inherit)', color: 'var(--commerce-text, inherit)' }}>
        Search results for "{query}"
        {!loading && (
          <Typography component="span" variant="body1" color="text.secondary" sx={{ ml: 2 }}>
            ({totalElements} found)
          </Typography>
        )}
      </Typography>
      <ProductGrid products={products} loading={loading} emptyMessage={`No results found for "${query}". Try a different search term.`} />
    </Container>
  );
};

export default SearchResultsPage;
