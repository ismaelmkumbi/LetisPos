import axios from 'axios';

const AUTH_URL = import.meta.env.VITE_AUTH_URL || 'http://localhost:8081';
const HUB_URL = import.meta.env.VITE_HUB_URL || '/hub';

export const authApi = axios.create({ baseURL: AUTH_URL, timeout: 10000 });
export const hubApi = axios.create({ baseURL: HUB_URL, timeout: 15000 });

const TOKEN_KEY = 'lcc_token';
const REFRESH_KEY = 'lcc_refresh';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  setRefresh: (t: string) => localStorage.setItem(REFRESH_KEY, t),
  clear: () => { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(REFRESH_KEY); },
};

// Attach token to hub requests
hubApi.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Refresh on 401
hubApi.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const refresh = tokenStore.getRefresh();
      if (refresh) {
        try {
          const res = await authApi.post('/api/v1/auth/refresh', { refreshToken: refresh });
          tokenStore.set(res.data.accessToken);
          tokenStore.setRefresh(res.data.refreshToken);
          error.config.headers.Authorization = `Bearer ${res.data.accessToken}`;
          return hubApi.request(error.config);
        } catch { tokenStore.clear(); }
      }
    }
    return Promise.reject(error);
  }
);

export async function login(email: string, password: string) {
  const res = await authApi.post('/api/v1/auth/login', { email, password });
  tokenStore.set(res.data.accessToken);
  tokenStore.setRefresh(res.data.refreshToken);
  return res.data;
}

export function logout() { tokenStore.clear(); window.location.href = '/login'; }
export function isAuthenticated() { return !!tokenStore.get(); }
