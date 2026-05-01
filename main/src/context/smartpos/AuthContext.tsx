import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import {
  CurrentUser, fetchMe, fetchMyProfile, login as apiLogin, logout as apiLogout,
} from 'src/api/smartpos/auth';
import { tokenStore } from 'src/api/smartpos/client';

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (perm: string) => boolean;
  hasRole: (role: string) => boolean;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function SmartPosAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadMe = useCallback(async () => {
    if (!tokenStore.get()) { setUser(null); return; }
    let me: CurrentUser;
    try {
      me = await fetchMe();
    } catch {
      // auth/me failing means the token is invalid — clear and bail.
      tokenStore.clear();
      setUser(null);
      return;
    }
    // Profile enrichment is best-effort. If the user-service is unreachable
    // or the profile row isn't provisioned yet (e.g. the admin hasn't been
    // propagated from auth-service via the UserRegistered event), we still
    // log the user in with the auth-derived fields — they just won't have
    // warehouse scoping / extended permissions until the profile arrives.
    try {
      const profile = await fetchMyProfile(me.id);
      setUser({ ...me, ...profile });
    } catch (e) {
      console.warn('Profile enrichment failed; continuing with auth-only session.', e);
      setUser(me);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await loadMe();
      setLoading(false);
    })();
    const onLogout = () => setUser(null);
    window.addEventListener('smartpos:auth:logout', onLogout);
    return () => window.removeEventListener('smartpos:auth:logout', onLogout);
  }, [loadMe]);

  const login = useCallback(async (email: string, password: string) => {
    await apiLogin(email, password);
    await loadMe();
  }, [loadMe]);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  const hasPermission = useCallback((perm: string) => {
    return !!user?.permissions?.includes(perm);
  }, [user]);

  const hasRole = useCallback((role: string) => {
    return !!user?.roles?.includes(role);
  }, [user]);

  const value = useMemo<AuthContextValue>(() => ({
    user, loading, login, logout, hasPermission, hasRole, refreshMe: loadMe,
  }), [user, loading, login, logout, hasPermission, hasRole, loadMe]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within SmartPosAuthProvider');
  return ctx;
}
