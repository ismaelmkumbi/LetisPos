import axios from 'axios';

const AUTH_URL = import.meta.env.VITE_AUTH_URL || '/api/v1/auth';
const HUB_URL = import.meta.env.VITE_HUB_URL || '/hub';

export const authApi = axios.create({ baseURL: AUTH_URL, timeout: 10000, withCredentials: true });
export const hubApi = axios.create({ baseURL: HUB_URL, timeout: 15000, withCredentials: true });

const TOKEN_KEY = 'lcc_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
  },
};

hubApi.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshInFlight: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  try {
    const res = await authApi.post('/refresh', {});
    tokenStore.set(res.data.accessToken);
    return res.data.accessToken;
  } catch {
    return null;
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const runInsideLock = async (): Promise<string | null> => {
    const locks = typeof navigator !== 'undefined' && navigator.locks;
    if (!locks) return doRefresh();
    return navigator.locks.request('letis-control-center-auth-refresh', { mode: 'exclusive' }, doRefresh);
  };

  if (!refreshInFlight) {
    refreshInFlight = runInsideLock().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

hubApi.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const next = await refreshAccessToken();
      if (next) {
        error.config.headers.Authorization = `Bearer ${next}`;
        return hubApi.request(error.config);
      }
      tokenStore.clear();
    }
    return Promise.reject(error);
  },
);

export async function login(email: string, password: string) {
  const res = await authApi.post('/login', { email, password });
  tokenStore.set(res.data.accessToken);
  return res.data;
}

export function logout() {
  tokenStore.clear();
  void authApi.post('/logout', {}).catch(() => {});
  window.location.href = '/login';
}

export function isAuthenticated() {
  return !!tokenStore.get();
}
