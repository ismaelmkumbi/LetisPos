import { useFeatures } from 'src/hooks/useFeatures';
import AccessDenied from './AccessDenied';

interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
}

export default function FeatureGate({ feature, children }: FeatureGateProps) {
  const { hasFeature } = useFeatures();

  if (!hasFeature(feature)) {
    return <AccessDenied feature={feature} />;
  }

  return <>{children}</>;
}
