import { useEffect, useRef, useState } from 'react';
import { listProducts } from 'src/api/smartpos/products';

export function useSetupGate({ skip }: { skip?: boolean } = {}) {
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (skip) {
      // Don't show spinner if we already checked — just report ready
      if (checkedRef.current) {
        setLoading(false);
      }
      return;
    }
    let cancelled = false;
    listProducts({ size: 1 })
      .then((p) => {
        if (!cancelled) {
          setNeedsSetup((p.totalElements ?? 0) === 0);
          checkedRef.current = true;
        }
      })
      .catch((err) => {
        console.error('useSetupGate: failed to check product count, defaulting to no-setup', err);
        if (!cancelled) setNeedsSetup(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [skip]);

  return { loading, needsSetup };
}
