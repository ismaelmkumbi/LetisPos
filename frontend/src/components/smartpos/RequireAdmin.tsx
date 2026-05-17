import { Navigate } from 'react-router';
import { useAuth } from 'src/context/smartpos/AuthContext';

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const permissions: string[] = (user as any)?.permissions ?? [];
  if (!permissions.includes('admin')) {
    return <Navigate to="/smartpos/dashboard" replace />;
  }
  return <>{children}</>;
}
