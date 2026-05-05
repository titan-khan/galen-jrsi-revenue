import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRight, TrendingUp, TrendingDown, GitCompare, Lightbulb } from "lucide-react";
import { useMetrics } from "@/contexts/MetricsContext";
import type { MetricRelationship, RelationshipType } from "@/types/metricRelationship";

interface CreateRelationshipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (relationship: Omit<MetricRelationship, 'id' | 'createdAt'>) => void;
  existingRelationship?: MetricRelationship;
}

const relationshipTypeConfig: Record<RelationshipType, { 
  label: string; 
  icon: typeof TrendingUp; 
  color: string;
  description: string;
}> = {
  leads: {
    label: 'Leads',
    icon: TrendingUp,
    color: 'text-blue-500',
    description: 'Source metric predicts changes in target metric'
  },
  lags: {
    label: 'Lags',
    icon: TrendingDown,
    color: 'text-orange-500',
    description: 'Source metric follows changes in target metric'
  },
  correlates: {
    label: 'Correlates',
    icon: GitCompare,
    color: 'text-purple-500',
    description: 'Metrics move together without clear causation'
  }
};

export const CreateRelationshipDialog = ({
  open,
  onOpenChange,
  onSave,
  existingRelationship
}: CreateRelationshipDialogProps) => {
  const { metrics } = useMetrics();
  
  const [sourceMetricId, setSourceMetricId] = useState(existingRelationship?.sourceMetricId || '');
  const [targetMetricId, setTargetMetricId] = useState(existingRelationship?.targetMetricId || '');
  const [relationshipType, setRelationshipType] = useState<RelationshipType>(
    existingRelationship?.relationshipType || 'leads'
  );
  const [lagPeriodDays, setLagPeriodDays] = useState(
    existingRelationship?.lagPeriodDays?.toString() || '14'
  );
  const [reasoning, setReasoning] = useState(existingRelationship?.reasoning || '');
  const [userNotes, setUserNotes] = useState(existingRelationship?.userNotes || '');

  const sourceMetric = metrics.find(m => m.id === sourceMetricId);
  const targetMetric = metrics.find(m => m.id === targetMetricId);
  
  const isValid = sourceMetricId && targetMetricId && sourceMetricId !== targetMetricId && reasoning;

  const handleSave = () => {
    if (!isValid || !sourceMetric || !targetMetric) return;
    
    onSave({
      sourceMetricId,
      sourceMetricName: sourceMetric.name,
      targetMetricId,
      targetMetricName: targetMetric.name,
      relationshipType,
      lagPeriodDays: lagPeriodDays ? parseInt(lagPeriodDays) : undefined,
      source: 'user-defined',
      reasoning,
      userNotes: userNotes || undefined,
      isConfirmed: true,
      createdBy: 'user'
    });
    
    // Reset form
    setSourceMetricId('');
    setTargetMetricId('');
    setRelationshipType('leads');
    setLagPeriodDays('14');
    setReasoning('');
    setUserNotes('');
    onOpenChange(false);
  };

  const TypeIcon = relationshipTypeConfig[relationshipType].icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {existingRelationship ? 'Edit Relationship' : 'Define Metric Relationship'}
          </DialogTitle>
          <DialogDescription>
            Define how one metric influences or relates to another. This helps identify leading indicators.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[60vh] pr-4">
          <div className="space-y-4 py-4">
            {/* Relationship Visual */}
            <div className="flex items-center justify-center gap-3 p-4 bg-muted rounded-lg">
              <div className="text-center min-w-[100px]">
                {sourceMetric ? (
                  <Badge variant="outline" className="text-xs">
                    {sourceMetric.name}
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">Source</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <div className="h-px w-8 bg-border" />
                <TypeIcon className={`h-5 w-5 ${relationshipTypeConfig[relationshipType].color}`} />
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <div className="h-px w-8 bg-border" />
              </div>
              <div className="text-center min-w-[100px]">
                {targetMetric ? (
                  <Badge variant="outline" className="text-xs">
                    {targetMetric.name}
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">Target</span>
                )}
              </div>
            </div>

            {/* Source Metric */}
            <div className="space-y-2">
              <Label htmlFor="source-metric">Source Metric</Label>
              <Select value={sourceMetricId} onValueChange={setSourceMetricId}>
                <SelectTrigger id="source-metric">
                  <SelectValue placeholder="Select source metric" />
                </SelectTrigger>
                <SelectContent>
                  {metrics.map(metric => (
                    <SelectItem 
                      key={metric.id} 
                      value={metric.id}
                      disabled={metric.id === targetMetricId}
                    >
                      {metric.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Relationship Type */}
            <div className="space-y-2">
              <Label>Relationship Type</Label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(relationshipTypeConfig) as [RelationshipType, typeof relationshipTypeConfig.leads][]).map(
                  ([type, config]) => {
                    const Icon = config.icon;
                    return (
                      <Button
                        key={type}
                        type="button"
                        variant={relationshipType === type ? "default" : "outline"}
                        className="h-auto py-3 flex-col gap-1"
                        onClick={() => setRelationshipType(type)}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-xs">{config.label}</span>
                      </Button>
                    );
                  }
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {relationshipTypeConfig[relationshipType].description}
              </p>
            </div>

            {/* Target Metric */}
            <div className="space-y-2">
              <Label htmlFor="target-metric">Target Metric</Label>
              <Select value={targetMetricId} onValueChange={setTargetMetricId}>
                <SelectTrigger id="target-metric">
                  <SelectValue placeholder="Select target metric" />
                </SelectTrigger>
                <SelectContent>
                  {metrics.map(metric => (
                    <SelectItem 
                      key={metric.id} 
                      value={metric.id}
                      disabled={metric.id === sourceMetricId}
                    >
                      {metric.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Lag Period (for leads/lags) */}
            {relationshipType !== 'correlates' && (
              <div className="space-y-2">
                <Label htmlFor="lag-period">
                  Typical Lag Period (days)
                </Label>
                <Input
                  id="lag-period"
                  type="number"
                  min="1"
                  max="365"
                  value={lagPeriodDays}
                  onChange={(e) => setLagPeriodDays(e.target.value)}
                  placeholder="e.g., 14"
                />
                <p className="text-xs text-muted-foreground">
                  How many days before the source metric affects the target?
                </p>
              </div>
            )}

            {/* Reasoning */}
            <div className="space-y-2">
              <Label htmlFor="reasoning">
                Why does this relationship exist? *
              </Label>
              <Textarea
                id="reasoning"
                value={reasoning}
                onChange={(e) => setReasoning(e.target.value)}
                placeholder="Explain the causal mechanism or business logic..."
                rows={2}
              />
            </div>

            {/* User Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes (optional)</Label>
              <Textarea
                id="notes"
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                placeholder="Any additional context or observations..."
                rows={2}
              />
            </div>

            {/* Tip */}
            <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg border border-primary/10">
              <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Tip:</strong> Strong relationships have clear causal mechanisms. 
                For example, &quot;Trial signups lead to MRR because trials convert to paid subscriptions after 14 days.&quot;
              </p>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            {existingRelationship ? 'Save Changes' : 'Create Relationship'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
