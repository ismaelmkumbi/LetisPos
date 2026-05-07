/**
 * SmartPOS API client.
 *
 * - Adds the JWT access token to every outgoing request.
 * - On 401, tries to refresh using the stored refresh token exactly once
 *   (concurrent 401s wait on a single in-flight refresh).
 * - On refresh failure, clears tokens and emits a 'smartpos:auth:logout' event
 *   that AuthProvider listens to.
 *
 * Requires `axios` (add to package.json: "axios": "^1.7.7").
 */
import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8080';

export const TOKEN_KEY = 'smartpos.accessToken';
export const REFRESH_KEY = 'smartpos.refreshToken';
export const TENANT_ID_KEY = 'smartpos.tenantId';

export const tokenStore = {
  get:         () => localStorage.getItem(TOKEN_KEY),
  set:         (t: string) => localStorage.setItem(TOKEN_KEY, t),
  getRefresh:  () => localStorage.getItem(REFRESH_KEY),
  setRefresh:  (t: string) => localStorage.setItem(REFRESH_KEY, t),
  getTenantId: () => localStorage.getItem(TENANT_ID_KEY),
  setTenantId: (t: string | null) => {
    if (t) localStorage.setItem(TENANT_ID_KEY, t);
    else localStorage.removeItem(TENANT_ID_KEY);
  },
  clear:       () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(TENANT_ID_KEY);
  },
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
});

// ---- Request interceptor: attach JWT ----
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.get();
  if (token && !config.headers?.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---- Response interceptor: refresh on 401 ----
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStore.getRefresh();
  if (!refresh) return null;
  try {
    const res = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, { refreshToken: refresh });
    const { accessToken, refreshToken } = res.data;
    tokenStore.set(accessToken);
    tokenStore.setRefresh(refreshToken);
    schedulePreemptiveRefresh(accessToken);
    return accessToken;
  } catch {
    return null;
  }
}

// ---- Proactive refresh ----
// Decode the JWT's exp claim and schedule a refresh ~60 seconds before it
// expires so the user never sees a natural-expiry 401. Falls back silently if
// the token is malformed (the reactive 401 interceptor below still saves us).
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

export function schedulePreemptiveRefresh(token: string | null = tokenStore.get()): void {
  if (preemptiveTimer) { clearTimeout(preemptiveTimer); preemptiveTimer = null; }
  if (!token) return;
  const expMs = decodeJwtExpMs(token);
  if (expMs == null) return;
  // Fire 60s before expiry, with a 5s floor so we never schedule in the past.
  const fireInMs = Math.max(5_000, expMs - Date.now() - 60_000);
  preemptiveTimer = setTimeout(() => {
    if (!refreshInFlight) {
      refreshInFlight = refreshAccessToken().finally(() => { refreshInFlight = null; });
    }
  }, fireInMs);
}

// Kick off a timer for any token that's already in localStorage at app boot.
schedulePreemptiveRefresh();

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (!original || error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }
    // Don't try to refresh for login/refresh/logout themselves.
    const url = original.url ?? '';
    if (url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/logout')) {
      return Promise.reject(error);
    }
    original._retry = true;
    if (!refreshInFlight) refreshInFlight = refreshAccessToken().finally(() => { refreshInFlight = null; });
    const newToken = await refreshInFlight;
    if (!newToken) {
      tokenStore.clear();
      window.dispatchEvent(new CustomEvent('smartpos:auth:logout'));
      return Promise.reject(error);
    }
    original.headers = { ...(original.headers ?? {}), Authorization: `Bearer ${newToken}` };
    return api.request(original);
  }
);
