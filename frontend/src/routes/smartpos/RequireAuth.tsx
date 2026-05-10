import React from 'react';
import { Navigate, useLocation } from 'react-router';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from 'src/context/smartpos/AuthContext';
import { brand } from 'src/theme/smartpos/brand';

/**
 * Wrap any route element that requires authentication.
 */
export function RequireAuth({
  children, perm, role,
}: { children: React.ReactNode; perm?: string; role?: string }) {
  const { user, loading, hasPermission, hasRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100dvh' }}>
        <CircularProgress size={32} sx={{ color: brand.primary[500] }} />
      </Box>
    );
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
