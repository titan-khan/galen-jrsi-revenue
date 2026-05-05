import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';
import {
  PerformanceSummary,
  ExternalFactor,
  AttributionChain,
  AttributionEntry,
  ConfidenceLevel,
} from '@/types/attribution';

interface AttributionContextType {
  performanceSummary: PerformanceSummary | null;
  externalFactors: ExternalFactor[];
  attributionChains: AttributionChain[];
  selectedPeriod: { start: string; end: string };
  setSelectedPeriod: (period: { start: string; end: string }) => void;
  challengeExternalFactor: (factorId: string, reason: string) => void;
  getAttributionChain: (actionItemId: string) => AttributionChain | undefined;
  formatCurrency: (value: number) => string;
  formatPercentage: (value: number) => string;
}

const AttributionContext = createContext<AttributionContextType | undefined>(undefined);

function generatePerformanceSummary(externalFactors: ExternalFactor[]): PerformanceSummary | null {
  // Return null when no data is available
  if (externalFactors.length === 0) {
    return null;
  }

  const includedExternals = externalFactors.filter(f => f.isIncluded);
  const externalTotal = includedExternals.reduce((sum, f) => sum + f.estimatedImpact, 0);
  
  const galenTotal = 0;
  const totalChange = externalTotal + galenTotal;

  if (totalChange === 0) {
    return null;
  }

  const attributions: AttributionEntry[] = includedExternals.map((ef, idx): AttributionEntry => ({
    id: `attr-ext-${idx}`,
    category: ef.category === 'seasonal' ? 'external-seasonal' as const : 
             ef.category === 'market' || ef.category === 'competitor' ? 'external-market' as const : 
             'external-other' as const,
    label: ef.name,
    value: ef.estimatedImpact,
    percentage: (ef.estimatedImpact / totalChange) * 100,
    confidence: ef.confidence,
    sourceType: 'external' as const,
    sourceId: ef.id,
    description: ef.source,
  }));

  const avgConfidence = calculateOverallConfidence(attributions);

  return {
    id: 'perf-current',
    period: {
      start: '2026-01-01',
      end: '2026-01-31',
      label: 'January 2026',
    },
    metricName: 'Monthly Revenue',
    metricUnit: 'USD',
    startValue: 0,
    endValue: totalChange,
    totalChange,
    totalChangePercentage: 0,
    attributions,
    galenTotal: 0,
    galenPercentage: 0,
    externalTotal,
    externalPercentage: 100,
    unexplainedTotal: 0,
    unexplainedPercentage: 0,
    overallConfidence: avgConfidence,
    generatedAt: new Date().toISOString(),
    predictedImpact: 0,
    realizedImpact: 0,
    overallROI: 0,
  };
}

function calculateOverallConfidence(attributions: AttributionEntry[]): ConfidenceLevel {
  if (attributions.length === 0) return 'low';
  
  const weights = { high: 3, medium: 2, low: 1 };
  const totalWeight = attributions.reduce((sum, a) => sum + a.value, 0);
  if (totalWeight === 0) return 'low';
  
  const weightedScore = attributions.reduce((sum, a) => {
    return sum + (weights[a.confidence] * a.value);
  }, 0) / totalWeight;
  
  if (weightedScore >= 2.5) return 'high';
  if (weightedScore >= 1.5) return 'medium';
  return 'low';
}

export function AttributionProvider({ children }: { children: ReactNode }) {
  // Initialize with empty arrays - no demo data
  const [externalFactors, setExternalFactors] = useState<ExternalFactor[]>([]);
  const [attributionChains] = useState<AttributionChain[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState({ start: '2026-01-01', end: '2026-01-31' });

  const performanceSummary = useMemo(() => {
    return generatePerformanceSummary(externalFactors);
  }, [externalFactors]);

  const challengeExternalFactor = (factorId: string, reason: string) => {
    setExternalFactors(prev => 
      prev.map(f => f.id === factorId ? { 
        ...f, 
        isIncluded: false, 
        isChallenged: true, 
        challengeReason: reason,
        challengedAt: new Date().toISOString(),
      } : f)
    );
  };

  const getAttributionChain = (actionItemId: string) => {
    return attributionChains.find(c => c.actionItemId === actionItemId);
  };

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  return (
    <AttributionContext.Provider
      value={{
        performanceSummary,
        externalFactors,
        attributionChains,
        selectedPeriod,
        setSelectedPeriod,
        challengeExternalFactor,
        getAttributionChain,
        formatCurrency,
        formatPercentage,
      }}
    >
      {children}
    </AttributionContext.Provider>
  );
}

export function useAttribution() {
  const context = useContext(AttributionContext);
  if (context === undefined) {
    throw new Error('useAttribution must be used within an AttributionProvider');
  }
  return context;
}
