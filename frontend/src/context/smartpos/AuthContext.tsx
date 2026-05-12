import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import {
  CurrentUser, fetchMe, fetchMyProfile, fetchTenants, login as apiLogin, logout as apiLogout,
  type Tenant,
} from 'src/api/smartpos/auth';
import { bootstrapAuthSession, tokenStore } from 'src/api/smartpos/client';

export const PLAN_LEVEL: Record<string, number> = {
  STARTER: 1, BUSINESS: 2, PROFESSIONAL: 3, ENTERPRISE: 4,
};

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  tenants: Tenant[];
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
  hasPermission: (perm: string) => boolean;
  hasRole: (role: string) => boolean;
  refreshMe: () => Promise<void>;
  hasPlan: (minPlan: string) => boolean;
  isTrialing: () => boolean;
  getTrialDaysLeft: () => number | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function SmartPosAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [tenants, setTenants] = useState<Tenant[]>([]);

  const loadMe = useCallback(async () => {
    if (!tokenStore.get()) { setUser(null); return; }
    let me: CurrentUser;
    try {
      me = await fetchMe();
    } catch {
      tokenStore.clear();
      setUser(null);
      return;
    }
    // Persist the signed-token tenant for UI state only; requests use the JWT.
    tokenStore.setTenantId(me.tenantId || null);

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
      await bootstrapAuthSession();
      await loadMe();

      // Load available tenants for the switcher (only if authenticated)
      if (tokenStore.get()) {
        try {
          const list = await fetchTenants();
          setTenants(list);
        } catch {
          // Tenant list is non-critical
        }
      }

      setLoading(false);
    })();
    const onLogout = () => setUser(null);
    window.addEventListener('smartpos:auth:logout', onLogout);
    return () => window.removeEventListener('smartpos:auth:logout', onLogout);
  }, [loadMe]);

  const login = useCallback(async (email: string, password: string) => {
    await apiLogin(email, password);
    await loadMe();
    // Reload tenants after login
    try {
      const list = await fetchTenants();
      setTenants(list);
    } catch { /* non-critical */ }
  }, [loadMe]);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    setTenants([]);
  }, []);

  const switchTenant = useCallback(async (tenantId: string) => {
    if (!tenantId || tenantId === user?.tenantId) return;
    await loadMe();
  }, [loadMe, user?.tenantId]);

  const hasPermission = useCallback((perm: string) => {
    return !!user?.permissions?.includes(perm);
  }, [user]);

  const hasRole = useCallback((role: string) => {
    return !!user?.roles?.includes(role);
  }, [user]);

  const hasPlan = useCallback((minPlan: string): boolean => {
    const tenant = tenants[0];
    if (!tenant) return false;
    const current = PLAN_LEVEL[tenant.billingPlan] ?? 0;
    const required = PLAN_LEVEL[minPlan] ?? 0;
    return current >= required;
  }, [tenants]);

  const isTrialing = useCallback((): boolean => {
    const tenant = tenants[0];
    return tenant?.status === 'TRIAL';
  }, [tenants]);

  const getTrialDaysLeft = useCallback((): number | null => {
    const tenant = tenants[0];
    if (!tenant?.trialEndsAt) return null;
    const end = new Date(tenant.trialEndsAt);
    const now = new Date();
    return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }, [tenants]);

  const value = useMemo<AuthContextValue>(() => ({
    user, loading, tenants, login, logout, switchTenant, hasPermission, hasRole, refreshMe: loadMe,
    hasPlan, isTrialing, getTrialDaysLeft,
  }), [user, loading, tenants, login, logout, switchTenant, hasPermission, hasRole, loadMe,
    hasPlan, isTrialing, getTrialDaysLeft]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within SmartPosAuthProvider');
  return ctx;
}
