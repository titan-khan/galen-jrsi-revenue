import { useState, useCallback } from "react";
import type { MetricDefinition, MetricFilter, Aggregation, SparklineType, TimeGranularity, ValueSentiment } from "@/types/metric";

export interface MetricFormState {
  dataSource: string;
  name: string;
  description: string;
  measure: string;
  aggregation: Aggregation;
  sparklineType: SparklineType;
  dateField: string;
  timeGranularity: TimeGranularity;
  filters: MetricFilter[];
  adjustableFilters: string[];
  valueSentiment: ValueSentiment;
  insightTypes: {
    trend: boolean;
    comparison: boolean;
    anomaly: boolean;
  };
  category: string;
  owner: string;
  // Target fields
  hasTarget: boolean;
  targetValue: string;
  targetLabel: string;
  targetPeriod: string;
}

const initialState: MetricFormState = {
  dataSource: "",
  name: "",
  description: "",
  measure: "",
  aggregation: "sum",
  sparklineType: "non-cumulative",
  dateField: "",
  timeGranularity: "month",
  filters: [],
  adjustableFilters: [],
  valueSentiment: "up-good",
  insightTypes: {
    trend: true,
    comparison: true,
    anomaly: false,
  },
  category: "",
  owner: "",
  hasTarget: false,
  targetValue: "",
  targetLabel: "",
  targetPeriod: "",
};

export const useMetricForm = () => {
  const [formState, setFormState] = useState<MetricFormState>(initialState);
  const [currentStep, setCurrentStep] = useState(0);
  const [editingMetricId, setEditingMetricId] = useState<string | null>(null);

  const updateField = useCallback(<K extends keyof MetricFormState>(
    field: K,
    value: MetricFormState[K]
  ) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  }, []);

  const addFilter = useCallback(() => {
    setFormState((prev) => ({
      ...prev,
      filters: [...prev.filters, { dimension: "", operator: "equals", value: "" }],
    }));
  }, []);

  const removeFilter = useCallback((index: number) => {
    setFormState((prev) => ({
      ...prev,
      filters: prev.filters.filter((_, i) => i !== index),
    }));
  }, []);

  const updateFilter = useCallback((
    index: number,
    field: "dimension" | "operator" | "value",
    value: string
  ) => {
    setFormState((prev) => ({
      ...prev,
      filters: prev.filters.map((filter, i) =>
        i === index ? { ...filter, [field]: value } : filter
      ),
    }));
  }, []);

  const loadMetric = useCallback((metric: MetricDefinition) => {
    setFormState({
      dataSource: metric.dataSource,
      name: metric.name,
      description: metric.description,
      measure: metric.measure,
      aggregation: metric.aggregation,
      sparklineType: metric.sparklineType,
      dateField: metric.dateField,
      timeGranularity: metric.timeGranularity,
      filters: metric.filters,
      adjustableFilters: metric.adjustableFilters,
      valueSentiment: metric.valueSentiment,
      insightTypes: metric.insightTypes,
      category: metric.category,
      owner: metric.owner,
      hasTarget: !!metric.target,
      targetValue: metric.target?.value?.toString() || "",
      targetLabel: metric.target?.label || "",
      targetPeriod: metric.target?.period || "",
    });
    setEditingMetricId(metric.id);
  }, []);

  const isPreviewReady = !!(formState.measure && formState.dateField);

  const resetForm = useCallback(() => {
    setFormState(initialState);
    setCurrentStep(0);
    setEditingMetricId(null);
  }, []);

  const toMetricDefinition = useCallback((id?: string): MetricDefinition => {
    const now = new Date().toISOString();
    const targetValue = parseFloat(formState.targetValue);
    
    return {
      id: id || `metric-${Date.now()}`,
      name: formState.name,
      description: formState.description,
      dataSource: formState.dataSource,
      measure: formState.measure,
      aggregation: formState.aggregation,
      sparklineType: formState.sparklineType,
      dateField: formState.dateField,
      timeGranularity: formState.timeGranularity,
      filters: formState.filters,
      adjustableFilters: formState.adjustableFilters,
      valueSentiment: formState.valueSentiment,
      insightTypes: formState.insightTypes,
      category: formState.category || "General",
      owner: formState.owner || "You",
      createdAt: now,
      updatedAt: now,
      isFollowing: true,
      target: formState.hasTarget && !isNaN(targetValue) ? {
        value: targetValue,
        label: formState.targetLabel || undefined,
        period: formState.targetPeriod || undefined,
      } : undefined,
      displayData: {
        filterContext: "All data",
        currentValue: "0",
        changePercent: 0,
        changeAbsolute: "+0",
        status: "healthy" as const,
        sparklineData: Array.from({ length: 12 }, (_, i) => ({
          month: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i],
          value: Math.floor(Math.random() * 100),
        })),
        insight: { text: "Metric created. Data will populate shortly.", boldParts: [] },
        targetProgress: formState.hasTarget && !isNaN(targetValue) ? 0 : undefined,
      },
    };
  }, [formState]);

  return {
    formState,
    updateField,
    addFilter,
    removeFilter,
    updateFilter,
    currentStep,
    setCurrentStep,
    isPreviewReady,
    resetForm,
    loadMetric,
    editingMetricId,
    toMetricDefinition,
  };
};
