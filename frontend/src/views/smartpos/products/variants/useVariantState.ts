import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AxiosError } from 'axios';
import { getProduct, updateProduct } from 'src/api/smartpos/products';
import type { VariantInput } from 'src/api/smartpos/products';
import type { Product, Variant, UUID } from 'src/api/smartpos/types';

function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    return (err.response?.data as { detail?: string } | undefined)?.detail ?? err.message ?? fallback;
  }
  return err instanceof Error ? err.message : fallback;
}

export interface UseVariantStateReturn {
  product: Product | null;
  variants: Variant[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  isDirty: boolean;
  updateVariant: (id: UUID, patch: Partial<Variant>) => void;
  updateMany: (ids: UUID[], field: keyof Variant, value: number | string | null) => void;
  addVariants: (newVariants: VariantInput[]) => void;
  removeVariants: (ids: UUID[]) => void;
  save: () => Promise<void>;
  reset: () => void;
}

export function useVariantState(productId: UUID): UseVariantStateReturn {
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const originalRef = useRef<Variant[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function fetch() {
      setLoading(true);
      setError(null);
      try {
        const p = await getProduct(productId);
        if (cancelled) return;
        setProduct(p);
        const v = p.variants ?? [];
        setVariants(v);
        originalRef.current = JSON.parse(JSON.stringify(v));
      } catch (err: unknown) {
        if (cancelled) return;
        setError(extractErrorMessage(err, 'Failed to load product'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetch();
    return () => { cancelled = true; };
  }, [productId]);

  const isDirty = useMemo(() => {
    if (variants.length !== originalRef.current.length) return true;
    return JSON.stringify(variants) !== JSON.stringify(originalRef.current);
  }, [variants]);

  const updateVariant = useCallback((id: UUID, patch: Partial<Variant>) => {
    setVariants((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }, []);

  const updateMany = useCallback(
    (ids: UUID[], field: keyof Variant, value: number | string | null) => {
      const idSet = new Set(ids);
      setVariants((prev) =>
        prev.map((v) => (idSet.has(v.id) ? { ...v, [field]: value } : v)),
      );
    },
    [],
  );

  const addVariants = useCallback((newVariants: VariantInput[]) => {
    setVariants((prev) => {
      const existingNames = new Set(prev.map((v) => v.name));
      const toAdd = newVariants
        .filter((nv) => !existingNames.has(nv.name))
        .map((nv) => ({
          id: crypto.randomUUID() as UUID,
          name: nv.name,
          code: nv.code ?? null,
          cost: nv.cost ?? null,
          price: nv.price ?? null,
          wholesalePrice: nv.wholesalePrice ?? null,
          minPrice: nv.minPrice ?? null,
          imageUrl: nv.imageUrl ?? null,
        }));
      return [...prev, ...toAdd];
    });
  }, []);

  const removeVariants = useCallback((ids: UUID[]) => {
    const idSet = new Set(ids);
    setVariants((prev) => prev.filter((v) => !idSet.has(v.id)));
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: VariantInput[] = variants.map((v) => ({
        name: v.name,
        code: v.code ?? undefined,
        cost: v.cost ?? undefined,
        price: v.price ?? undefined,
        wholesalePrice: v.wholesalePrice ?? undefined,
        minPrice: v.minPrice ?? undefined,
        imageUrl: v.imageUrl ?? undefined,
      }));
      const updated = await updateProduct(productId, { variants: payload });
      setProduct(updated);
      const updatedVariants = updated.variants ?? [];
      setVariants(updatedVariants);
      originalRef.current = JSON.parse(JSON.stringify(updatedVariants));
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Failed to save variants'));
    } finally {
      setSaving(false);
    }
  }, [productId, variants]);

  const reset = useCallback(() => {
    setVariants(JSON.parse(JSON.stringify(originalRef.current)));
  }, []);

  return {
    product,
    variants,
    loading,
    saving,
    error,
    isDirty,
    updateVariant,
    updateMany,
    addVariants,
    removeVariants,
    save,
    reset,
  };
}
