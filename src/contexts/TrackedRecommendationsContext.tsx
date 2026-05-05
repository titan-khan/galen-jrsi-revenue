import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { TrackedRecommendation, RecommendationStatus, RealizedImpact, ActionRecommendation } from '@/types/agent';

interface TrackedRecommendationsContextType {
  recommendations: TrackedRecommendation[];
  addRecommendation: (rec: ActionRecommendation, agentId: string, agentName: string) => void;
  updateStatus: (id: string, status: RecommendationStatus) => void;
  recordImpact: (id: string, impact: RealizedImpact) => void;
  updateRecommendation: (id: string, updates: Partial<TrackedRecommendation>) => void;
  getRecommendationsByAgent: (agentId: string) => TrackedRecommendation[];
}

const TrackedRecommendationsContext = createContext<TrackedRecommendationsContextType | undefined>(undefined);

function parseNumericValue(value: string | undefined): number {
  if (!value) return 0;
  const match = value.match(/[\d.]+/);
  if (!match) return 0;
  const num = parseFloat(match[0]);
  if (value.toLowerCase().includes('m')) return num * 1000000;
  if (value.toLowerCase().includes('k')) return num * 1000;
  return num;
}

export function TrackedRecommendationsProvider({ children }: { children: ReactNode }) {
  // Initialize with empty array - no demo recommendations
  const [recommendations, setRecommendations] = useState<TrackedRecommendation[]>([]);

  const addRecommendation = useCallback((rec: ActionRecommendation, agentId: string, agentName: string) => {
    const trackedRec: TrackedRecommendation = {
      ...rec,
      agentId,
      agentName,
      status: 'proposed',
      statusUpdatedAt: new Date().toISOString(),
      potentialImpactNumeric: rec.potentialImpactNumeric || parseNumericValue(rec.potentialImpact),
    };
    setRecommendations(prev => [...prev, trackedRec]);
  }, []);

  const updateStatus = useCallback((id: string, status: RecommendationStatus) => {
    setRecommendations(prev => prev.map(rec => {
      if (rec.id !== id) return rec;
      
      const updates: Partial<TrackedRecommendation> = {
        status,
        statusUpdatedAt: new Date().toISOString(),
      };

      if (status === 'approved' && !rec.approvedAt) {
        updates.approvedAt = new Date().toISOString();
      }
      if (status === 'implemented' && !rec.implementedAt) {
        updates.implementedAt = new Date().toISOString();
      }

      return { ...rec, ...updates };
    }));
  }, []);

  const recordImpact = useCallback((id: string, impact: RealizedImpact) => {
    setRecommendations(prev => prev.map(rec => {
      if (rec.id !== id) return rec;

      const actualNumeric = impact.actualValueNumeric || parseNumericValue(impact.actualValue);
      const predictedNumeric = rec.potentialImpactNumeric || parseNumericValue(rec.potentialImpact);
      const roiPercentage = predictedNumeric > 0 ? Math.round((actualNumeric / predictedNumeric) * 100) : 0;

      return {
        ...rec,
        realizedImpact: { ...impact, actualValueNumeric: actualNumeric },
        roiPercentage,
        status: 'measured' as RecommendationStatus,
        statusUpdatedAt: new Date().toISOString(),
      };
    }));
  }, []);

  const updateRecommendation = useCallback((id: string, updates: Partial<TrackedRecommendation>) => {
    setRecommendations(prev => prev.map(rec => 
      rec.id === id ? { ...rec, ...updates } : rec
    ));
  }, []);

  const getRecommendationsByAgent = useCallback((agentId: string) => {
    return recommendations.filter(rec => rec.agentId === agentId);
  }, [recommendations]);

  return (
    <TrackedRecommendationsContext.Provider
      value={{
        recommendations,
        addRecommendation,
        updateStatus,
        recordImpact,
        updateRecommendation,
        getRecommendationsByAgent,
      }}
    >
      {children}
    </TrackedRecommendationsContext.Provider>
  );
}

export function useTrackedRecommendations() {
  const context = useContext(TrackedRecommendationsContext);
  if (!context) {
    throw new Error('useTrackedRecommendations must be used within a TrackedRecommendationsProvider');
  }
  return context;
}
