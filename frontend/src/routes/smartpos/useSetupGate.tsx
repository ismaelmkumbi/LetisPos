import { useEffect, useState } from 'react';
import { listProducts } from 'src/api/smartpos/products';

export function useSetupGate() {
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listProducts({ size: 1 })
      .then((p) => {
        if (!cancelled) setNeedsSetup((p.totalElements ?? 0) === 0);
      })
      .catch((err) => {
        console.error('useSetupGate: failed to check product count, defaulting to no-setup', err);
        if (!cancelled) setNeedsSetup(false); // fail open
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { loading, needsSetup };
}
