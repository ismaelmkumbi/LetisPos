import React from 'react';
import { Navigate, useLocation } from 'react-router';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from 'src/context/smartpos/AuthContext';
import { useSetupGate } from './useSetupGate';
import { brand } from 'src/theme/smartpos/brand';

const SETUP_ALLOWED_ROUTES = [
  '/smartpos/setup',
  '/smartpos/dashboard',
  '/smartpos/products',
  '/smartpos/categories',
  '/smartpos/products/units',
  '/smartpos/settings',
];

/**
 * Wrap any route element that requires authentication.
 * Also gates access to /smartpos/setup until at least one product exists.
 */
export function RequireAuth({
  children, perm, role,
}: { children: React.ReactNode; perm?: string; role?: string }) {
  const { user, loading, hasPermission, hasRole } = useAuth();
  const location = useLocation();
  const { needsSetup, loading: setupLoading } = useSetupGate({ skip: loading || !user });

  // Show spinner while auth or setup check is in progress
  if (loading || setupLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100dvh' }}>
        <CircularProgress size={32} sx={{ color: brand.primary[500] }} />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace state={{ from: location }} />;
  }
  if (needsSetup) {
    const isSetupRoute = SETUP_ALLOWED_ROUTES.some((r) => location.pathname.startsWith(r));
    if (!isSetupRoute) {
      return <Navigate to="/smartpos/setup" state={{ from: location }} replace />;
    }
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
