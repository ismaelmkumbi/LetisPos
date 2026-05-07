import React from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from 'src/context/smartpos/AuthContext';
import { useSetupGate } from './useSetupGate';

/**
 * Wrap any route element that requires authentication.
 *   <Route element={<RequireAuth><FullLayout/></RequireAuth>}>
 *     ...protected routes...
 *   </Route>
 *
 * Optionally enforce a specific permission:
 *   <Route element={<RequireAuth perm="sale.create"><SalesCreate/></RequireAuth>} />
 */
export function RequireAuth({
  children, perm, role,
}: { children: React.ReactNode; perm?: string; role?: string }) {
  const { user, loading, hasPermission, hasRole } = useAuth();
  const location = useLocation();

  if (loading) return null; // could render a splash

  const { needsSetup, loading: setupLoading } = useSetupGate();
  const setupAllowedRoutes = [
    '/smartpos/setup',
    '/smartpos/products',
    '/smartpos/categories',
    '/smartpos/products/units',
    '/smartpos/settings',
  ];

  if (!setupLoading && needsSetup) {
    const isSetupRoute = setupAllowedRoutes.some((r) => location.pathname.startsWith(r));
    if (!isSetupRoute) {
      return <Navigate to="/smartpos/setup" state={{ from: location }} replace />;
    }
  }

  if (!user) {
    return <Navigate to="/auth/login" replace state={{ from: location }} />;
  }
  if (perm && !hasPermission(perm)) {
    return <Navigate to="/auth/403" replace />;
  }
  if (role && !hasRole(role)) {
    return <Navigate to="/auth/403" replace />;
  }
  return <>{children}</>;
}

/** Render children only if the current user has the given permission. */
export function PermissionGate({
  perm, children, fallback = null,
}: { perm: string; children: React.ReactNode; fallback?: React.ReactNode }) {
  const { hasPermission } = useAuth();
  return <>{hasPermission(perm) ? children : fallback}</>;
}
