import { useAuth } from '../context/smartpos/AuthContext';

export function useFeatures() {
  const { user } = useAuth();

  const features: string[] = (user as any)?.features ?? [];

  const hasFeature = (key: string): boolean => {
    if ((user as any)?.roles?.includes('SUPER_ADMIN')) return true;
    return features.includes(key);
  };

  const hasAnyFeature = (keys: string[]): boolean => {
    if ((user as any)?.roles?.includes('SUPER_ADMIN')) return true;
    return keys.some((k) => features.includes(k));
  };

  const hasAllFeatures = (keys: string[]): boolean => {
    if ((user as any)?.roles?.includes('SUPER_ADMIN')) return true;
    return keys.every((k) => features.includes(k));
  };

  return { features, hasFeature, hasAnyFeature, hasAllFeatures };
}
