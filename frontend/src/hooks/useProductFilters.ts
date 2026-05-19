import { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router';

export interface ProductFilterState {
  q: string;
  categoryId: string;
  sort: string;
  page: number;
  minPrice: number | undefined;
  maxPrice: number | undefined;
  brands: string[];
  rating: number | undefined;
  inStock: boolean | undefined;
}

export interface ActiveFilter {
  key: string;
  label: string;
  clear: () => void;
}

const PRICE_RANGES = [
  { label: 'Under $25', min: 0, max: 25 },
  { label: '$25 – $50', min: 25, max: 50 },
  { label: '$50 – $100', min: 50, max: 100 },
  { label: '$100 – $200', min: 100, max: 200 },
  { label: 'Over $200', min: 200, max: undefined },
] as const;

const RATING_OPTIONS = [
  { label: '4★ & up', value: 4 },
  { label: '3★ & up', value: 3 },
  { label: '2★ & up', value: 2 },
] as const;

function parseNumParam(value: string | null): number | undefined {
  if (value === null || value === '') return undefined;
  const n = parseFloat(value);
  return isNaN(n) ? undefined : n;
}

export function useProductFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: ProductFilterState = useMemo(() => {
    const brandParam = searchParams.get('brand') || '';
    return {
      q: searchParams.get('q') || '',
      categoryId: searchParams.get('categoryId') || '',
      sort: searchParams.get('sort') || 'newest',
      page: parseInt(searchParams.get('page') || '0', 10),
      minPrice: parseNumParam(searchParams.get('minPrice')),
      maxPrice: parseNumParam(searchParams.get('maxPrice')),
      brands: brandParam ? brandParam.split(',').filter(Boolean) : [],
      rating: parseNumParam(searchParams.get('rating')),
      inStock: searchParams.get('inStock') === 'true' ? true : undefined,
    };
  }, [searchParams]);

  const setFilter = useCallback(
    (key: string, value: string | string[] | number | boolean | undefined) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value === undefined || value === '' || value === false || (Array.isArray(value) && value.length === 0)) {
          next.delete(key);
        } else if (Array.isArray(value)) {
          next.set(key, value.join(','));
        } else {
          next.set(key, String(value));
        }
        if (key !== 'page') next.set('page', '0');
        return next;
      });
    },
    [setSearchParams],
  );

  const removeFilter = useCallback(
    (key: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete(key);
        if (key !== 'page') next.set('page', '0');
        return next;
      });
    },
    [setSearchParams],
  );

  const toggleBrand = useCallback(
    (brand: string) => {
      const current = filters.brands;
      const updated = current.includes(brand)
        ? current.filter((b) => b !== brand)
        : [...current, brand];
      setFilter('brand', updated.length ? updated : undefined);
    },
    [filters.brands, setFilter],
  );

  const setPriceRange = useCallback(
    (min: number | undefined, max: number | undefined) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (min !== undefined) next.set('minPrice', String(min));
        else next.delete('minPrice');
        if (max !== undefined) next.set('maxPrice', String(max));
        else next.delete('maxPrice');
        next.set('page', '0');
        return next;
      });
    },
    [setSearchParams],
  );

  const clearAllFilters = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams();
      const q = prev.get('q');
      if (q) next.set('q', q);
      return next;
    });
  }, [setSearchParams]);

  const activeFilterChips: ActiveFilter[] = useMemo(() => {
    const chips: ActiveFilter[] = [];

    if (filters.categoryId) {
      chips.push({
        key: 'categoryId',
        label: `Category: ${filters.categoryId}`,
        clear: () => removeFilter('categoryId'),
      });
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      const range = PRICE_RANGES.find(
        (r) => r.min === filters.minPrice && r.max === filters.maxPrice,
      );
      chips.push({
        key: 'price',
        label: range
          ? `Price: ${range.label}`
          : `Price: $${filters.minPrice || 0} – $${filters.maxPrice || 'Any'}`,
        clear: () => {
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.delete('minPrice');
            next.delete('maxPrice');
            next.set('page', '0');
            return next;
          });
        },
      });
    }

    filters.brands.forEach((brand) => {
      chips.push({
        key: `brand-${brand}`,
        label: `Brand: ${brand}`,
        clear: () => toggleBrand(brand),
      });
    });

    if (filters.rating !== undefined) {
      chips.push({
        key: 'rating',
        label: `Rating: ${filters.rating}★ & up`,
        clear: () => removeFilter('rating'),
      });
    }

    if (filters.inStock) {
      chips.push({
        key: 'inStock',
        label: 'In Stock Only',
        clear: () => removeFilter('inStock'),
      });
    }

    return chips;
  }, [filters, removeFilter, toggleBrand, setSearchParams]);

  const apiParams = useMemo(
    () => ({
      search: filters.q || undefined,
      categoryId: filters.categoryId || undefined,
      sort: filters.sort,
      page: filters.page,
      size: 20,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      brand: filters.brands.length ? filters.brands.join(',') : undefined,
      rating: filters.rating,
      inStock: filters.inStock,
    }),
    [filters],
  );

  return {
    filters,
    setFilter,
    removeFilter,
    toggleBrand,
    setPriceRange,
    clearAllFilters,
    activeFilterChips,
    apiParams,
    PRICE_RANGES,
    RATING_OPTIONS,
  } as const;
}
