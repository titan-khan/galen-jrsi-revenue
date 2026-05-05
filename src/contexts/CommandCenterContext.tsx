import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { 
  DateRangeOption, 
  ComparisonPeriod, 
  CommandCenterState, 
  DashboardPreset, 
  DashboardComponentVisibility, 
  ProgressiveDisclosureState,
  ActionTabType
} from "@/types/commandCenter";
import { PRESET_CONFIGS as PresetConfigs, defaultDisclosureState } from "@/types/commandCenter";

interface CommandCenterContextType extends CommandCenterState {
  setSelectedKPIIds: (ids: string[]) => void;
  setNorthStarId: (id: string | null) => void;
  setDateRange: (range: DateRangeOption) => void;
  setComparisonPeriod: (period: ComparisonPeriod) => void;
  applyTemplate: (kpiIds: string[], northStarId: string) => void;
  setDashboardPreset: (preset: DashboardPreset) => void;
  setCustomVisibility: (visibility: Partial<DashboardComponentVisibility>) => void;
  getVisibility: () => DashboardComponentVisibility;
  // Progressive Disclosure setters
  setContextZoneExpanded: (expanded: boolean) => void;
  setActiveActionTab: (tab: ActionTabType) => void;
  setExpandedIntelligenceSection: (section: string | null) => void;
}

const STORAGE_KEY = "command-center-state";

const defaultVisibility: DashboardComponentVisibility = {
  northStar: true,
  impactSummary: true,
  miniWaterfall: true,
  contributingMetrics: true,
  growthDrivers: true,
  riskAlerts: true,
  approvalQueue: true,
  agentInsights: true,
};

const defaultState: CommandCenterState = {
  selectedKPIIds: ["metric-revenue-growth", "metric-profit-margin", "metric-nps", "metric-churn-rate"],
  northStarId: "metric-revenue-growth",
  dateRange: "last-30-days",
  comparisonPeriod: "previous-period",
  dashboardPreset: "executive",
  customVisibility: defaultVisibility,
  disclosureState: defaultDisclosureState,
};

const CommandCenterContext = createContext<CommandCenterContextType | undefined>(undefined);

export function CommandCenterProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CommandCenterState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults to handle missing fields from old localStorage
        return { 
          ...defaultState, 
          ...parsed, 
          customVisibility: { ...defaultVisibility, ...(parsed.customVisibility || {}) },
          disclosureState: { ...defaultDisclosureState, ...(parsed.disclosureState || {}) }
        };
      }
      return defaultState;
    } catch (error) {
      console.error("Failed to parse localStorage state:", error);
      // Clear corrupted localStorage
      localStorage.removeItem(STORAGE_KEY);
      return defaultState;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const setSelectedKPIIds = (ids: string[]) => {
    setState((prev) => ({ ...prev, selectedKPIIds: ids }));
  };

  const setNorthStarId = (id: string | null) => {
    setState((prev) => ({ ...prev, northStarId: id }));
  };

  const setDateRange = (range: DateRangeOption) => {
    setState((prev) => ({ ...prev, dateRange: range }));
  };

  const setComparisonPeriod = (period: ComparisonPeriod) => {
    setState((prev) => ({ ...prev, comparisonPeriod: period }));
  };

  const applyTemplate = (kpiIds: string[], northStarId: string) => {
    setState((prev) => ({
      ...prev,
      selectedKPIIds: kpiIds,
      northStarId,
    }));
  };

  const setDashboardPreset = (preset: DashboardPreset) => {
    setState((prev) => ({ ...prev, dashboardPreset: preset }));
  };

  const setCustomVisibility = (visibility: Partial<DashboardComponentVisibility>) => {
    setState((prev) => ({
      ...prev,
      customVisibility: { ...prev.customVisibility, ...visibility },
    }));
  };

  const getVisibility = (): DashboardComponentVisibility => {
    const preset = state.dashboardPreset || 'executive';
    if (preset === 'custom') {
      return state.customVisibility || defaultVisibility;
    }
    return PresetConfigs[preset]?.visibility || defaultVisibility;
  };

  // Progressive Disclosure setters
  const setContextZoneExpanded = (expanded: boolean) => {
    setState((prev) => ({
      ...prev,
      disclosureState: { ...prev.disclosureState, contextZoneExpanded: expanded },
    }));
  };

  const setActiveActionTab = (tab: ActionTabType) => {
    setState((prev) => ({
      ...prev,
      disclosureState: { ...prev.disclosureState, activeActionTab: tab },
    }));
  };

  const setExpandedIntelligenceSection = (section: string | null) => {
    setState((prev) => ({
      ...prev,
      disclosureState: { ...prev.disclosureState, expandedIntelligenceSection: section },
    }));
  };

  return (
    <CommandCenterContext.Provider
      value={{
        ...state,
        setSelectedKPIIds,
        setNorthStarId,
        setDateRange,
        setComparisonPeriod,
        applyTemplate,
        setDashboardPreset,
        setCustomVisibility,
        getVisibility,
        setContextZoneExpanded,
        setActiveActionTab,
        setExpandedIntelligenceSection,
      }}
    >
      {children}
    </CommandCenterContext.Provider>
  );
}

export function useCommandCenter() {
  const context = useContext(CommandCenterContext);
  if (!context) {
    throw new Error("useCommandCenter must be used within CommandCenterProvider");
  }
  return context;
}
