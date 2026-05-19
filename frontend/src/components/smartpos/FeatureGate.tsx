import { useFeatures } from 'src/hooks/useFeatures';
import { Navigate } from 'react-router-dom';

interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
}

export default function FeatureGate({ feature, children }: FeatureGateProps) {
  const { hasFeature } = useFeatures();

  if (!hasFeature(feature)) {
    return <Navigate to="/smartpos/pricing" replace />;
  }

  return <>{children}</>;
}
