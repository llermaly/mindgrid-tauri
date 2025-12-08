import { createContext, useContext, ReactNode } from 'react';
import { PanelType } from './Panel';

interface LayoutContextValue {
  maximizedPanel: PanelType | null;
  toggleMaximize: (panelId: PanelType) => void;
  hidePanel: (panelId: PanelType) => void;
  showPanel: (panelId: PanelType) => void;
}

export const LayoutContext = createContext<LayoutContextValue | null>(null);

export function useLayoutContext() {
  return useContext(LayoutContext);
}

interface LayoutProviderProps {
  children: ReactNode;
  value: LayoutContextValue;
}

export function LayoutProvider({ children, value }: LayoutProviderProps) {
  return (
    <LayoutContext.Provider value={value}>
      {children}
    </LayoutContext.Provider>
  );
}
