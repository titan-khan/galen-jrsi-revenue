import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import DefinitionSection from "./DefinitionSection";
import ValueSection from "./ValueSection";
import TimeSection from "./TimeSection";
import FiltersSection from "./FiltersSection";
import InsightsSettings from "./InsightsSettings";
import TargetSection from "./TargetSection";
import { MetricFormState } from "../hooks/useMetricForm";
import type { Aggregation, SparklineType, TimeGranularity, ValueSentiment } from "@/types/metric";

interface ConfigPanelProps {
  formState: MetricFormState;
  updateField: <K extends keyof MetricFormState>(field: K, value: MetricFormState[K]) => void;
  addFilter: () => void;
  removeFilter: (index: number) => void;
  updateFilter: (index: number, field: "dimension" | "operator" | "value", value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isPreviewReady: boolean;
  isEditMode?: boolean;
}

const ConfigPanel = ({
  formState,
  updateField,
  addFilter,
  removeFilter,
  updateFilter,
  onSave,
  onCancel,
  isPreviewReady,
  isEditMode = false,
}: ConfigPanelProps) => {
  return (
    <div className="h-full flex flex-col bg-card border-r">
      
      <Tabs defaultValue="definition" className="flex-1 flex flex-col min-h-0">
        <div className="border-b px-4">
          <TabsList className="h-10 bg-transparent w-full justify-start gap-4 p-0">
            <TabsTrigger 
              value="definition" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2"
            >
              Definition
            </TabsTrigger>
            <TabsTrigger 
              value="insights"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2"
            >
              Insights
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          <TabsContent value="definition" className="p-4 space-y-6 m-0">
            <DefinitionSection
              dataSource={formState.dataSource}
              name={formState.name}
              description={formState.description}
              onNameChange={(v) => updateField("name", v)}
              onDescriptionChange={(v) => updateField("description", v)}
            />

            <Separator />

            <ValueSection
              measure={formState.measure}
              aggregation={formState.aggregation}
              sparklineType={formState.sparklineType}
              onMeasureChange={(v) => updateField("measure", v)}
              onAggregationChange={(v) => updateField("aggregation", v as Aggregation)}
              onSparklineTypeChange={(v) => updateField("sparklineType", v)}
            />

            <Separator />

            <TargetSection
              hasTarget={formState.hasTarget}
              targetValue={formState.targetValue}
              targetLabel={formState.targetLabel}
              targetPeriod={formState.targetPeriod}
              onHasTargetChange={(v) => updateField("hasTarget", v)}
              onTargetValueChange={(v) => updateField("targetValue", v)}
              onTargetLabelChange={(v) => updateField("targetLabel", v)}
              onTargetPeriodChange={(v) => updateField("targetPeriod", v)}
            />

            <Separator />

            <TimeSection
              dateField={formState.dateField}
              timeGranularity={formState.timeGranularity}
              onDateFieldChange={(v) => updateField("dateField", v)}
              onTimeGranularityChange={(v) => updateField("timeGranularity", v as TimeGranularity)}
            />

            <Separator />

            <FiltersSection
              filters={formState.filters}
              onAddFilter={addFilter}
              onRemoveFilter={removeFilter}
              onUpdateFilter={updateFilter}
            />
          </TabsContent>

          <TabsContent value="insights" className="p-4 m-0">
            <InsightsSettings
              adjustableFilters={formState.adjustableFilters}
              valueSentiment={formState.valueSentiment}
              insightTypes={formState.insightTypes}
              onAdjustableFiltersChange={(v) => updateField("adjustableFilters", v)}
              onValueSentimentChange={(v) => updateField("valueSentiment", v)}
              onInsightTypeToggle={(type, value) =>
                updateField("insightTypes", { ...formState.insightTypes, [type]: value })
              }
            />
          </TabsContent>
        </ScrollArea>
      </Tabs>

      {/* Action Buttons */}
      <div className="p-4 border-t flex gap-2">
        <Button 
          variant="outline"
          className="flex-1"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button 
          className="flex-1" 
          onClick={onSave}
          disabled={!isPreviewReady}
        >
          {isEditMode ? "Update Metric" : "Save Metric"}
        </Button>
      </div>
    </div>
  );
};

export default ConfigPanel;
