import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { MetricRelationship } from "@/types/metricRelationship";

interface RelationshipContextType {
  relationships: MetricRelationship[];
  addRelationship: (relationship: MetricRelationship) => void;
  addBulkRelationships: (relationships: MetricRelationship[]) => void;
  updateRelationship: (id: string, updates: Partial<MetricRelationship>) => void;
  confirmRelationship: (id: string) => void;
  dismissRelationship: (id: string) => void;
  removeRelationship: (id: string) => void;
  getRelationshipsByMetric: (metricId: string) => MetricRelationship[];
  getConfirmedRelationships: () => MetricRelationship[];
  getSuggestedRelationships: () => MetricRelationship[];
  clearAllRelationships: () => void;
}

const RelationshipContext = createContext<RelationshipContextType | undefined>(undefined);

const STORAGE_KEY = "galen_relationships";

export const RelationshipProvider = ({ children }: { children: ReactNode }) => {
  const [relationships, setRelationships] = useState<MetricRelationship[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(relationships));
  }, [relationships]);

  const addRelationship = (relationship: MetricRelationship) => {
    setRelationships((prev) => {
      // Prevent duplicates based on source + target + relationshipType
      const exists = prev.some(
        (r) =>
          r.sourceMetricId === relationship.sourceMetricId &&
          r.targetMetricId === relationship.targetMetricId &&
          r.relationshipType === relationship.relationshipType
      );
      if (exists) return prev;
      return [...prev, relationship];
    });
  };

  const addBulkRelationships = (newRelationships: MetricRelationship[]) => {
    setRelationships((prev) => {
      const existingKeys = new Set(
        prev.map((r) => `${r.sourceMetricId}-${r.targetMetricId}-${r.relationshipType}`)
      );
      const unique = newRelationships.filter(
        (r) => !existingKeys.has(`${r.sourceMetricId}-${r.targetMetricId}-${r.relationshipType}`)
      );
      return [...prev, ...unique];
    });
  };

  const updateRelationship = (id: string, updates: Partial<MetricRelationship>) => {
    setRelationships((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  };

  const confirmRelationship = (id: string) => {
    setRelationships((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, source: "user-defined" as const, confirmedAt: new Date().toISOString() }
          : r
      )
    );
  };

  const dismissRelationship = (id: string) => {
    setRelationships((prev) => prev.filter((r) => r.id !== id));
  };

  const removeRelationship = (id: string) => {
    setRelationships((prev) => prev.filter((r) => r.id !== id));
  };

  const getRelationshipsByMetric = (metricId: string) => {
    return relationships.filter(
      (r) => r.sourceMetricId === metricId || r.targetMetricId === metricId
    );
  };

  const getConfirmedRelationships = () => {
    return relationships.filter(
      (r) => r.source === "user-defined" || r.source === "data-validated"
    );
  };

  const getSuggestedRelationships = () => {
    return relationships.filter(
      (r) => r.source === "ai-detected" || r.source === "industry-pattern"
    );
  };

  const clearAllRelationships = () => {
    setRelationships([]);
  };

  return (
    <RelationshipContext.Provider
      value={{
        relationships,
        addRelationship,
        addBulkRelationships,
        updateRelationship,
        confirmRelationship,
        dismissRelationship,
        removeRelationship,
        getRelationshipsByMetric,
        getConfirmedRelationships,
        getSuggestedRelationships,
        clearAllRelationships,
      }}
    >
      {children}
    </RelationshipContext.Provider>
  );
};

export const useRelationships = () => {
  const context = useContext(RelationshipContext);
  if (!context) {
    throw new Error("useRelationships must be used within a RelationshipProvider");
  }
  return context;
};
