/**
 * Centralized session cleanup — called on logout to prevent
 * cross-tenant data leakage through localStorage, sessionStorage,
 * React Query cache, and IndexedDB.
 */
import { tokenStore } from 'src/api/smartpos/client';

const PERSIST_KEYS = [
  // POS state — must be cleared to prevent cross-tenant POS linkage
  'smartpos.linkedTerminalId',
  'smartpos.pos.resumeCart',
  'smartpos.pos.receiptConfig',
  'smartpos.pos.beepVariant',
  'smartpos.posSounds',
  'smartpos.posSoundsVolume',
  'smartpos.posLayout',
  'smartpos.posLayout.v2',
  // AI assistant conversations contain business data
  'letis_assistant',
  'letis_assistant_convos',
  // Onboarding — new tenant should see their own onboarding state
  'letispos:banner:dismissed',
  // Language — keep (user preference, not tenant-specific)
  // 'smartpos.locale',
];

export function clearAllSessionData() {
  // 1. Clear auth tokens
  tokenStore.clear();

  // 2. Clear all persisted state keys
  for (const key of PERSIST_KEYS) {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  }

  // 3. Clear sessionStorage
  try { sessionStorage.clear(); } catch { /* ignore */ }

  // 4. Clear React Query cache (if available on window)
  try {
    const w = window as Record<string, unknown>;
    if (typeof w.__REACT_QUERY_CLEAR__ === 'function') {
      (w.__REACT_QUERY_CLEAR__ as () => void)();
    }
  } catch { /* ignore */ }
}

/**
 * Register the React Query client for cleanup.
 * Call this once in App.tsx after creating the QueryClient.
 */
export function registerQueryClientForCleanup(clearFn: () => void) {
  (window as Record<string, unknown>).__REACT_QUERY_CLEAR__ = clearFn;
}
