import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import {
  CurrentUser, fetchMe, fetchMyProfile, fetchTenants,
  login as apiLogin, logout as apiLogout,
  type LoginResponse, type Tenant,
} from 'src/api/smartpos/auth';
import { bootstrapAuthSession, tokenStore, refreshAccessToken } from 'src/api/smartpos/client';
import { getMyMenu } from 'src/api/smartpos/features';

/** Decode JWT payload without verification (data is already trusted from login response). */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch { return null; }
}

/** Plan hierarchy — higher ordinal = more features. Mirrors backend BillingPlan.java. */
export const PLAN_LEVEL: Record<string, number> = {
  FREE: 0, STARTER: 1, BUSINESS: 2, PROFESSIONAL: 3, ENTERPRISE: 4,
};

function planHasAccess(currentPlan: string, minPlan: string): boolean {
  return (PLAN_LEVEL[currentPlan] ?? 0) >= (PLAN_LEVEL[minPlan] ?? 0);
}

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

  /**
   * Build user state from login response JWT claims — skips the redundant
   * GET /api/v1/auth/me round-trip. On page reload (no login response), falls
   * back to fetchMe().
   */
  const loadMe = useCallback(async (loginResp?: LoginResponse) => {
    const token = tokenStore.get();
    if (!token) { setUser(null); return; }

    // Build base user from login response JWT (avoids /me call after login)
    let baseUser: CurrentUser | null = null;
    if (loginResp) {
      const claims = decodeJwtPayload(token);
      baseUser = {
        id: loginResp.user.id,
        email: loginResp.user.email,
        status: 'ACTIVE',
        tenantId: (claims?.tenantId as string) ?? loginResp.user.tenantId ?? '',
        lastLoginAt: new Date().toISOString(),
        tenantStatus: claims?.tenantStatus as string | undefined,
        billingPlan: claims?.billingPlan as string | undefined,
        maxUsers: claims?.tenantMaxUsers as number | undefined,
        maxStores: claims?.tenantMaxStores as number | undefined,
        features: claims?.features as string[] | undefined,
        roles: claims?.roles as string[] | undefined,
        permissions: claims?.permissions as string[] | undefined,
      };
    }

    try {
      // On page reload (no loginResp), fetch /me. Otherwise skip it.
      const me = baseUser ?? await fetchMe();
      tokenStore.setTenantId(me.tenantId || null);
      setUser(me);

      // Fire profile + tenants + menu in parallel (non-blocking enrichment)
      const [profileResult, tenantsResult, menuResult] = await Promise.allSettled([
        fetchMyProfile(me.id),
        fetchTenants(),
        getMyMenu(),
      ]);

      const enrichedUser: CurrentUser = { ...me };
      if (profileResult.status === 'fulfilled') {
        Object.assign(enrichedUser, profileResult.value);
      }
      if (menuResult.status === 'fulfilled') {
        enrichedUser.menu = menuResult.value;
      }
      setUser(enrichedUser);

      if (tenantsResult.status === 'fulfilled') {
        setTenants(tenantsResult.value);
      }
    } catch {
      if (!baseUser) {
        tokenStore.clear();
        setUser(null);
      }
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
    setLoading(true);
    let loginResp: LoginResponse;
    try {
      loginResp = await apiLogin(email, password);
    } catch (e) {
      setLoading(false);
      throw e;
    }
    // Fire loadMe in background — don't block navigation.
    // Pass loginResp to skip redundant /me API call.
    void loadMe(loginResp);
    setLoading(false);
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
