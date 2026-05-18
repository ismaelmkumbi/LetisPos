import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import {
  CurrentUser, fetchMe, fetchMyProfile, fetchTenants, login as apiLogin, logout as apiLogout,
  type Tenant,
} from 'src/api/smartpos/auth';
import { bootstrapAuthSession, tokenStore, refreshAccessToken } from 'src/api/smartpos/client';
import { planHasAccess, PLAN_LEVEL } from 'src/config/planGates';

export { PLAN_LEVEL };

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
  forceTokenRefresh: () => Promise<void>;
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
    try {
      const me = await fetchMe();
      tokenStore.setTenantId(me.tenantId || null);

      // Fire profile + tenants in parallel with me (non-blocking enrichment)
      const [profileResult, tenantsResult] = await Promise.allSettled([
        fetchMyProfile(me.id),
        fetchTenants(),
      ]);

      if (profileResult.status === 'fulfilled') {
        setUser({ ...me, ...profileResult.value });
      } else {
        setUser(me);
      }
      if (tenantsResult.status === 'fulfilled') {
        setTenants(tenantsResult.value);
      }
    } catch {
      tokenStore.clear();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await bootstrapAuthSession();
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
    // Reset sidebar to full on fresh login
    window.dispatchEvent(new CustomEvent('smartpos:auth:login'));
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
    if (user?.roles?.includes('SUPER_ADMIN')) return true;
    const tenant = tenants[0];
    if (!tenant) return false;
    return planHasAccess(tenant.billingPlan, minPlan);
  }, [tenants, user?.roles]);

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

  const forceTokenRefresh = useCallback(async () => {
    await refreshAccessToken();
    await loadMe();
  }, [loadMe]);

  const value = useMemo<AuthContextValue>(() => ({
    user, loading, tenants, login, logout, switchTenant, hasPermission, hasRole, refreshMe: loadMe,
    forceTokenRefresh, hasPlan, isTrialing, getTrialDaysLeft,
  }), [user, loading, tenants, login, logout, switchTenant, hasPermission, hasRole, loadMe,
    forceTokenRefresh, hasPlan, isTrialing, getTrialDaysLeft]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within SmartPosAuthProvider');
  return ctx;
}
