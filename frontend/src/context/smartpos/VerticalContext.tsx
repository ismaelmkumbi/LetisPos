import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  getMyVerticals,
  activateVertical,
  deactivateVertical,
  type TenantVertical,
} from 'src/api/smartpos/verticals';
import { tokenStore } from 'src/api/smartpos/client';

// ── Types ──────────────────────────────────────────────────────────────────

export interface Vertical {
  key: string;
  label: string;
  description?: string | null;
}

interface VerticalContextValue {
  /** All verticals activated by the current tenant. */
  activeVerticals: Vertical[];
  /** True while initial fetch is in progress. */
  loading: boolean;
  /** Error message if fetch failed. */
  error: string | null;
  /** Check whether a specific vertical is active. */
  hasVertical: (key: string) => boolean;
  /** Check whether any of the given verticals are active. */
  hasAnyVertical: (keys: string[]) => boolean;
  /** Activate a vertical for the tenant. */
  activate: (key: string) => Promise<void>;
  /** Deactivate a vertical for the tenant. */
  deactivate: (key: string) => Promise<void>;
  /** Reload verticals from the API. */
  refresh: () => Promise<void>;
}

const VerticalContext = createContext<VerticalContextValue | undefined>(undefined);

function mapTenantVerticals(tvs: TenantVertical[]): Vertical[] {
  return tvs.map((tv) => ({
    key: tv.vertical_key,
    label: tv.label,
    description: tv.description,
  }));
}

export function VerticalProvider({ children }: { children: React.ReactNode }) {
  const [activeVerticals, setActiveVerticals] = useState<Vertical[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!tokenStore.get()) {
      setActiveVerticals([]);
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const tvs = await getMyVerticals();
      setActiveVerticals(mapTenantVerticals(tvs));
    } catch {
      // verticals endpoint may not be deployed yet — silent fallback
      setActiveVerticals([]);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const hasVertical = useCallback(
    (key: string) => activeVerticals.some((v) => v.key === key),
    [activeVerticals],
  );

  const hasAnyVertical = useCallback(
    (keys: string[]) => keys.some((k) => hasVertical(k)),
    [hasVertical],
  );

  const activate = useCallback(async (key: string) => {
    await activateVertical(key);
    await refresh();
  }, [refresh]);

  const deactivate = useCallback(async (key: string) => {
    await deactivateVertical(key);
    await refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ activeVerticals, loading, error, hasVertical, hasAnyVertical, activate, deactivate, refresh }),
    [activeVerticals, loading, error, hasVertical, hasAnyVertical, activate, deactivate, refresh],
  );

  return (
    <VerticalContext.Provider value={value}>
      {children}
    </VerticalContext.Provider>
  );
}

export function useVerticals(): VerticalContextValue {
  const ctx = useContext(VerticalContext);
  if (!ctx) throw new Error('useVerticals must be used within VerticalProvider');
  return ctx;
}

export { VerticalContext };
