import { useFeatures } from 'src/hooks/useFeatures';
import { Navigate } from 'react-router';

interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
}

export default function FeatureGate({ feature, children }: FeatureGateProps) {
  const { hasFeature } = useFeatures();

  if (!hasFeature(feature)) {
    return <Navigate to="/smartpos/dashboard" replace />;
  }

  return <>{children}</>;
}
