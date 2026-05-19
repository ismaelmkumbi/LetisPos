import React, { useEffect, useState, useMemo } from 'react';
import { Container, Box } from '@mui/material';
import { useParams } from 'react-router';
import ProductGrid from '../../../components/commerce/ProductGrid';
import ProductFilterSidebar from '../../../components/commerce/ProductFilterSidebar';
import ProductResultsHeader from '../../../components/commerce/ProductResultsHeader';
import ActiveFilterChips from '../../../components/commerce/ActiveFilterChips';
import { storefront } from '../../../api/smartpos/commerce';
import { useProductFilters } from '../../../hooks/useProductFilters';
import type { StorefrontProduct } from '../../../types/commerce';

const ProductListPage: React.FC = () => {
  const { slug, categoryId } = useParams<{ slug: string; categoryId: string }>();
  const { filters, setFilter, toggleBrand, setPriceRange, clearAllFilters, activeFilterChips, apiParams, PRICE_RANGES, RATING_OPTIONS } =
    useProductFilters();
  const [products, setProducts] = useState<StorefrontProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Sync categoryId from URL param into filters
  useEffect(() => {
    if (categoryId && categoryId !== 'all' && categoryId !== filters.categoryId) {
      setFilter('categoryId', categoryId);
    }
  }, [categoryId]); // eslint-disable-line react-hooks/exhaustive-deps

  const effectiveApiParams = useMemo(
    () => ({
      ...apiParams,
      categoryId: apiParams.categoryId || (categoryId && categoryId !== 'all' ? categoryId : undefined),
    }),
    [apiParams, categoryId],
  );

  useEffect(() => {
    setLoading(true);
    storefront
      .getProducts(slug!, effectiveApiParams)
      .then((data) => {
        setProducts(data.content);
        setTotalPages(data.totalPages);
        setTotalElements(data.totalElements);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [slug, effectiveApiParams]);

  const availableBrands = useMemo(() => {
    const brands = new Set<string>();
    products.forEach((p) => {
      if (p.brand?.name) brands.add(p.brand.name);
    });
    return Array.from(brands).sort();
  }, [products]);

  const categories = useMemo(
    () => [
      { id: 'cat-electronics', name: 'Electronics', slug: 'electronics' },
      { id: 'cat-fashion', name: 'Fashion', slug: 'fashion' },
      { id: 'cat-home', name: 'Home & Living', slug: 'home' },
      { id: 'cat-sports', name: 'Sports & Outdoors', slug: 'sports' },
    ],
    [],
  );

  const filtersActive = activeFilterChips.length > 0;

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', gap: 3 }}>
        {/* Sidebar */}
        <ProductFilterSidebar
          open={mobileFilterOpen}
          onClose={() => setMobileFilterOpen(false)}
          filters={filters}
          categories={categories}
          availableBrands={availableBrands}
          setFilter={setFilter}
          toggleBrand={toggleBrand}
          setPriceRange={setPriceRange}
          clearAllFilters={clearAllFilters}
          PRICE_RANGES={PRICE_RANGES}
          RATING_OPTIONS={RATING_OPTIONS}
        />

        {/* Main content area */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <ProductResultsHeader
            totalElements={totalElements}
            sort={filters.sort}
            onSortChange={(v) => setFilter('sort', v)}
            onFilterToggle={() => setMobileFilterOpen(true)}
            filtersActive={filtersActive}
          />

          <Box sx={{ mb: 2 }}>
            <ActiveFilterChips chips={activeFilterChips} onClearAll={clearAllFilters} />
          </Box>

          <ProductGrid
            products={products}
            loading={loading}
            emptyMessage="No products found. Try adjusting your filters."
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 4 }}>
              {Array.from({ length: totalPages }, (_, i) => (
                <Box
                  key={i}
                  onClick={() => setFilter('page', i)}
                  sx={{
                    px: 2,
                    py: 1,
                    cursor: 'pointer',
                    borderRadius: 2,
                    fontWeight: 600,
                    bgcolor: filters.page === i ? 'var(--commerce-primary, #1a1a2e)' : 'grey.100',
                    color: filters.page === i ? 'white' : 'inherit',
                    '&:hover': { bgcolor: filters.page === i ? undefined : 'grey.200' },
                  }}
                >
                  {i + 1}
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </Container>
  );
};

export default ProductListPage;
