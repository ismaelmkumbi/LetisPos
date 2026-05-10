import { createContext, useContext, useState, ReactNode } from 'react';

export type PosLayout = 'modern' | 'split' | 'classic' | 'compact' | 'sidebar' | 'modal';

interface PosLayoutContextType {
  layout: PosLayout;
  setLayout: (layout: PosLayout) => void;
}

const PosLayoutContext = createContext<PosLayoutContextType | undefined>(undefined);

const DEFAULT_LAYOUT: PosLayout = 'modern';
const STORAGE_KEY = 'smartpos.posLayout.v2';
const LEGACY_STORAGE_KEY = 'smartpos.posLayout';
const VALID_LAYOUTS: PosLayout[] = ['modern', 'split', 'classic', 'compact', 'sidebar', 'modal'];

export function PosLayoutProvider({ children }: { children: ReactNode }) {
  const [layout, setLayoutState] = useState<PosLayout>(() => {
    if (typeof window === 'undefined') return DEFAULT_LAYOUT;
    const stored = localStorage.getItem(STORAGE_KEY) as PosLayout | null;
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return stored && VALID_LAYOUTS.includes(stored) ? stored : DEFAULT_LAYOUT;
  });

  const setLayout = (newLayout: PosLayout) => {
    setLayoutState(newLayout);
    localStorage.setItem(STORAGE_KEY, newLayout);
  };

  return (
    <PosLayoutContext.Provider value={{ layout, setLayout }}>{children}</PosLayoutContext.Provider>
  );
}

export function usePosLayout() {
  const context = useContext(PosLayoutContext);
  if (!context) {
    throw new Error('usePosLayout must be used within PosLayoutProvider');
  }
  return context;
}
