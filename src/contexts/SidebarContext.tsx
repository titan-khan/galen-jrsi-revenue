import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

export interface PinnedItem {
  id: string;
  type: 'metric' | 'agent' | 'recommendation';
  name: string;
  status?: string;
  value?: string;
  trend?: 'up' | 'down' | 'stable';
  addedAt: string;
}

export interface InsightItem {
  id: string;
  type: 'discovery' | 'risk' | 'milestone' | 'status';
  message: string;
  source: string;
  timestamp: string;
  severity?: 'info' | 'warning' | 'success' | 'error';
}

interface SidebarContextType {
  // Pinned items
  pinnedItems: PinnedItem[];
  addPin: (item: Omit<PinnedItem, 'addedAt'>) => void;
  removePin: (id: string) => void;
  reorderPins: (fromIndex: number, toIndex: number) => void;
  isPinned: (id: string) => boolean;
  maxPins: number;
  
  // Insights feed
  insights: InsightItem[];
  addInsight: (insight: Omit<InsightItem, 'id' | 'timestamp'>) => void;
  clearInsights: () => void;
}

const STORAGE_KEY = 'galen-sidebar-pins';
const MAX_PINS = 5;
const MAX_INSIGHTS = 10;

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [pinnedItems, setPinnedItems] = useState<PinnedItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      return [];
    } catch {
      return [];
    }
  });

  // Initialize with empty insights - no demo data
  const [insights, setInsights] = useState<InsightItem[]>([]);

  // Persist pinned items to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pinnedItems));
  }, [pinnedItems]);

  const addPin = useCallback((item: Omit<PinnedItem, 'addedAt'>) => {
    setPinnedItems((prev) => {
      if (prev.length >= MAX_PINS) {
        return prev; // Don't add if at max
      }
      if (prev.some((p) => p.id === item.id)) {
        return prev; // Already pinned
      }
      return [...prev, { ...item, addedAt: new Date().toISOString() }];
    });
  }, []);

  const removePin = useCallback((id: string) => {
    setPinnedItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const reorderPins = useCallback((fromIndex: number, toIndex: number) => {
    setPinnedItems((prev) => {
      const result = [...prev];
      const [removed] = result.splice(fromIndex, 1);
      result.splice(toIndex, 0, removed);
      return result;
    });
  }, []);

  const isPinned = useCallback((id: string) => {
    return pinnedItems.some((item) => item.id === id);
  }, [pinnedItems]);

  const addInsight = useCallback((insight: Omit<InsightItem, 'id' | 'timestamp'>) => {
    setInsights((prev) => {
      const newInsight: InsightItem = {
        ...insight,
        id: `insight-${Date.now()}`,
        timestamp: new Date().toISOString(),
      };
      return [newInsight, ...prev].slice(0, MAX_INSIGHTS);
    });
  }, []);

  const clearInsights = useCallback(() => {
    setInsights([]);
  }, []);

  return (
    <SidebarContext.Provider
      value={{
        pinnedItems,
        addPin,
        removePin,
        reorderPins,
        isPinned,
        maxPins: MAX_PINS,
        insights,
        addInsight,
        clearInsights,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
