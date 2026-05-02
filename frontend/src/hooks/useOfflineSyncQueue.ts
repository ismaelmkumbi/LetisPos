/**
 * React hook around the offline POS queue.
 *
 *   const { queueSize, enqueue, flush } = useOfflineSyncQueue(terminalId);
 *
 * `enqueue(saleBody)`  → store in IndexedDB; safe to call when offline.
 * `flush()`            → upload everything queued for `terminalId` via
 *                        POST /api/v1/offline/sync; deletes successful rows.
 *
 * The queue auto-refreshes when the browser fires `online` so consumers
 * just need to call flush() — typically from a `useEffect(online)` watcher.
 */
import { useCallback, useEffect, useState } from 'react';

import { syncOfflineBatch, type CreateSaleBody, type OfflineBatchResult } from 'src/api/smartpos/sales';
import {
  addPending, countPending, deletePending, listPending, newClientOpId,
} from './offlineDb';

export interface UseOfflineSyncQueue {
  queueSize: number;
  enqueue: (sale: CreateSaleBody) => Promise<void>;
  flush:   () => Promise<OfflineBatchResult | null>;
  refresh: () => Promise<void>;
}

export function useOfflineSyncQueue(terminalId: string): UseOfflineSyncQueue {
  const [queueSize, setQueueSize] = useState(0);

  const refresh = useCallback(async () => {
    if (!terminalId) { setQueueSize(0); return; }
    setQueueSize(await countPending(terminalId));
  }, [terminalId]);

  // Refresh on mount + whenever the bound terminal changes.
  useEffect(() => { refresh().catch(() => {}); }, [refresh]);

  // Re-count after the browser comes back online — the parent will trigger
  // flush() from its own effect; we just keep the badge fresh.
  useEffect(() => {
    const onOnline = () => { refresh().catch(() => {}); };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [refresh]);

  const enqueue = useCallback(async (sale: CreateSaleBody) => {
    if (!terminalId) throw new Error('No terminal paired — cannot queue offline.');
    await addPending({
      clientOpId: newClientOpId(),
      terminalId,
      sale,
      capturedAt: Date.now(),
    });
    await refresh();
  }, [terminalId, refresh]);

  const flush = useCallback(async (): Promise<OfflineBatchResult | null> => {
    if (!terminalId) return null;
    const pending = await listPending(terminalId);
    if (pending.length === 0) return null;

    const result = await syncOfflineBatch({
      terminalId,
      clientBatchId: newClientOpId(),
      items: pending.map((p) => ({ clientOpId: p.clientOpId, sale: p.sale })),
    });

    // Drop rows the server marked OK; leave failures on disk for the next attempt.
    const okOpIds = new Set(result.items.filter((i) => i.status === 'OK').map((i) => i.clientOpId));
    const idsToDelete = pending
      .filter((p) => okOpIds.has(p.clientOpId))
      .map((p) => p.id!)
      .filter((id): id is number => typeof id === 'number');
    await deletePending(idsToDelete);
    await refresh();
    return result;
  }, [terminalId, refresh]);

  return { queueSize, enqueue, flush, refresh };
}
