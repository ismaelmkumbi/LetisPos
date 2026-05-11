/**
 * SmartPOS API client.
 *
 * - Access JWT: kept in memory + localStorage for same-origin reload and
 *   cross-tab sync (short-lived; XSS cannot read HttpOnly refresh cookie).
 * - Refresh token: HttpOnly cookie (Path=/api/v1/auth), set by auth-service.
 * - Cross-tab refresh serialization via the Web Locks API when available so
 *   rotation races do not revoke sibling tabs.
 * - On 401, single in-flight cookie/body refresh; failure clears session.
 */
import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

function autoApiBaseUrl(): string {
  if (typeof window === 'undefined') return 'http://localhost:8080';
  const { hostname, protocol } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8080';
  }
  return `${protocol}//${hostname}:8080`;
}

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? autoApiBaseUrl();

export const TOKEN_KEY = 'smartpos.accessToken';
/** Legacy: migration only — refreshed once then removed. */
export const REFRESH_KEY = 'smartpos.refreshToken';
export const TENANT_ID_KEY = 'smartpos.tenantId';

let accessTokenMemory: string | null = null;

function initAccessFromStorage(): void {
  if (accessTokenMemory) return;
  if (typeof localStorage === 'undefined') return;
  try {
    accessTokenMemory = localStorage.getItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

function setAccessToken(t: string | null): void {
  accessTokenMemory = t;
  if (typeof localStorage === 'undefined') return;
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

function getAccessToken(): string | null {
  if (accessTokenMemory) return accessTokenMemory;
  initAccessFromStorage();
  return accessTokenMemory;
}

export const tokenStore = {
  get: getAccessToken,
  set: setAccessToken,
  /** @deprecated Refresh is HttpOnly cookie — always null/ no-op. */
  getRefresh: () => null,
  setRefresh: () => { /* cookie managed by browser */ },
  getTenantId: () => (typeof localStorage !== 'undefined' ? localStorage.getItem(TENANT_ID_KEY) : null),
  setTenantId: (t: string | null) => {
    if (typeof localStorage === 'undefined') return;
    if (t) localStorage.setItem(TENANT_ID_KEY, t);
    else localStorage.removeItem(TENANT_ID_KEY);
  },
  clear: () => {
    setAccessToken(null);
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(REFRESH_KEY);
      localStorage.removeItem(TENANT_ID_KEY);
    } catch {
      /* ignore */
    }
  },
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token && !config.headers?.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshInFlight: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  const run = async (): Promise<string | null> => {
    let legacyRefresh: string | null = null;
    try {
      legacyRefresh = typeof localStorage !== 'undefined' ? localStorage.getItem(REFRESH_KEY) : null;
    } catch {
      legacyRefresh = null;
    }
    const body = legacyRefresh ? { refreshToken: legacyRefresh } : {};
    try {
      const res = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, body, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
        timeout: 20_000,
      });
      if (legacyRefresh && typeof localStorage !== 'undefined') {
        try {
          localStorage.removeItem(REFRESH_KEY);
        } catch {
          /* ignore */
        }
      }
      const { accessToken } = res.data;
      setAccessToken(accessToken);
      schedulePreemptiveRefresh(accessToken);
      return accessToken;
    } catch {
      return null;
    }
  };

  const locks = typeof navigator !== 'undefined' && navigator.locks;
  if (!locks) return run();
  return navigator.locks.request('smartpos-auth-refresh', { mode: 'exclusive' }, run);
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = doRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

let preemptiveTimer: ReturnType<typeof setTimeout> | null = null;

function decodeJwtExpMs(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof json.exp === 'number' ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function schedulePreemptiveRefresh(token: string | null = getAccessToken()): void {
  if (preemptiveTimer) {
    clearTimeout(preemptiveTimer);
    preemptiveTimer = null;
  }
  if (!token) return;
  const expMs = decodeJwtExpMs(token);
  if (expMs == null) return;
  const fireInMs = Math.max(5_000, expMs - Date.now() - 60_000);
  preemptiveTimer = setTimeout(() => {
    if (!refreshInFlight) {
      refreshInFlight = doRefresh().finally(() => {
        refreshInFlight = null;
      });
    }
  }, fireInMs);
}

/** Restore session from cookie when there is no access JWT (e.g. full page reload). */
export async function bootstrapAuthSession(): Promise<void> {
  initAccessFromStorage();
  if (getAccessToken()) {
    schedulePreemptiveRefresh(getAccessToken());
    return;
  }
  await refreshAccessToken();
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e: StorageEvent) => {
    if (e.key !== TOKEN_KEY) return;
    accessTokenMemory = e.newValue;
    if (e.newValue) schedulePreemptiveRefresh(e.newValue);
    else if (preemptiveTimer) {
      clearTimeout(preemptiveTimer);
      preemptiveTimer = null;
    }
  });
}

initAccessFromStorage();
schedulePreemptiveRefresh(getAccessToken());

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (!original || error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }
    const url = original.url ?? '';
    if (url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/logout')) {
      return Promise.reject(error);
    }
    original._retry = true;
    const newToken = await refreshAccessToken();
    if (!newToken) {
      tokenStore.clear();
      window.dispatchEvent(new CustomEvent('smartpos:auth:logout'));
      return Promise.reject(error);
    }
    original.headers = { ...(original.headers ?? {}), Authorization: `Bearer ${newToken}` };
    return api.request(original);
  },
);
