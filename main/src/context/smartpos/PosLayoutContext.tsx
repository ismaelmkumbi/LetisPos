import { createContext, useContext, useState, ReactNode } from 'react';

export type PosLayout = 'classic' | 'compact' | 'sidebar' | 'modal' | 'modern';

interface PosLayoutContextType {
  layout: PosLayout;
  setLayout: (layout: PosLayout) => void;
}

const PosLayoutContext = createContext<PosLayoutContextType | undefined>(undefined);

const STORAGE_KEY = 'smartpos.posLayout';

export function PosLayoutProvider({ children }: { children: ReactNode }) {
  const [layout, setLayoutState] = useState<PosLayout>(() => {
    if (typeof window === 'undefined') return 'modern';
    const stored = localStorage.getItem(STORAGE_KEY) as PosLayout | null;
    return stored && ['classic', 'compact', 'sidebar', 'modal', 'modern'].includes(stored)
      ? stored
      : 'modern';
  });

  const setLayout = (newLayout: PosLayout) => {
    setLayoutState(newLayout);
    localStorage.setItem(STORAGE_KEY, newLayout);
  };

  return (
    <PosLayoutContext.Provider value={{ layout, setLayout }}>
      {children}
    </PosLayoutContext.Provider>
  );
}

export function usePosLayout() {
  const context = useContext(PosLayoutContext);
  if (!context) {
    throw new Error('usePosLayout must be used within PosLayoutProvider');
  }
  return context;
}
