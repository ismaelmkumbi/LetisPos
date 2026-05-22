import axios from 'axios';

const AUTH_URL = import.meta.env.VITE_AUTH_URL || '/api/v1/auth';

export const authApi = axios.create({ baseURL: AUTH_URL, timeout: 10000, withCredentials: true });

const TOKEN_KEY = 'lcc_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await authApi.post('/refresh', {});
        tokenStore.set(res.data.accessToken);
        return res.data.accessToken;
      } catch {
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

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

export { refreshAccessToken };
