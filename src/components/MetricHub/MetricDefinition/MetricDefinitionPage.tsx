import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import ConfigPanel from "./ConfigPanel";
import PreviewPanel from "./PreviewPanel";
import { useMetricForm } from "./hooks/useMetricForm";
import { getMetricById } from "@/data/metricsData";
import { useMetrics } from "@/contexts/MetricsContext";
import { useToast } from "@/hooks/use-toast";

const MetricDefinitionPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const dataSourceName = searchParams.get("source") || "";
  const [showPreview, setShowPreview] = useState(false);
  const { updateMetric, addMetric } = useMetrics();
  const { toast } = useToast();

  const {
    formState,
    updateField,
    addFilter,
    removeFilter,
    updateFilter,
    isPreviewReady,
    loadMetric,
    editingMetricId,
    toMetricDefinition,
  } = useMetricForm();

  // Load existing metric if editing
  useEffect(() => {
    if (id) {
      const metric = getMetricById(id);
      if (metric) {
        loadMetric(metric);
        setShowPreview(true);
      }
    }
  }, [id, loadMetric]);

  useEffect(() => {
    if (dataSourceName && !id) {
      updateField("dataSource", dataSourceName);
    }
  }, [dataSourceName, updateField, id]);

  const handleSaveMetric = () => {
    if (editingMetricId) {
      // Update existing metric
      updateMetric(editingMetricId, {
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
        category: formState.category,
        owner: formState.owner,
      });
      toast({
        title: "Metric updated",
        description: `"${formState.name}" has been updated successfully.`,
      });
    } else {
      // Add new metric
      const newMetric = toMetricDefinition();
      addMetric(newMetric);
      toast({
        title: "Metric created",
        description: `"${formState.name}" has been added to your metrics.`,
      });
    }
    navigate("/metrics");
  };

  const isEditMode = !!editingMetricId;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 border-b bg-card px-4 flex items-center shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/metrics")}
            className="h-8 w-8"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-sm font-semibold text-foreground">
              {isEditMode ? `Edit: ${formState.name}` : formState.name || "New Metric Definition"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {formState.dataSource || "No data source connected"}
            </p>
          </div>
        </div>
      </header>

      {/* Split Pane Layout */}
      <div className="flex-1 min-h-0">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
            <ConfigPanel
              formState={formState}
              updateField={updateField}
              addFilter={addFilter}
              removeFilter={removeFilter}
              updateFilter={updateFilter}
              onSave={handleSaveMetric}
              onCancel={() => navigate("/metrics")}
              isPreviewReady={isPreviewReady}
              isEditMode={isEditMode}
            />
          </ResizablePanel>

          <ResizableHandle withHandle={true} />

          <ResizablePanel defaultSize={75}>
            <PreviewPanel formState={formState} isReady={showPreview && isPreviewReady} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default MetricDefinitionPage;
