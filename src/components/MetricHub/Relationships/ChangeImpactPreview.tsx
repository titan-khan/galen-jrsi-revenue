import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Minus,
  Plus,
  Sparkles,
  TrendingUp,
  X
} from "lucide-react";
import type { MetricSuggestion } from "@/types/metricSuggestion";
import type { Industry, StrategicGoal } from "@/types/companyProfile";

interface ChangeImpactPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  changeType: 'industry' | 'goal';
  currentValue: string;
  newValue: string;
  currentLabel: string;
  newLabel: string;
  onConfirm: () => void;
}

interface ImpactItem {
  type: 'added' | 'removed' | 'modified';
  metricName: string;
  reason: string;
}

// Mock impact calculation based on change type
const calculateImpact = (
  changeType: 'industry' | 'goal',
  currentValue: string,
  newValue: string
): ImpactItem[] => {
  // In a real app, this would calculate actual impact based on the knowledge base
  // For demo, we show illustrative examples
  
  if (changeType === 'industry') {
    return [
      { type: 'added', metricName: 'Industry-Specific Metric 1', reason: `Standard for ${newValue} industry` },
      { type: 'added', metricName: 'Industry-Specific Metric 2', reason: `Key performance indicator in ${newValue}` },
      { type: 'removed', metricName: 'Previous Industry Metric', reason: `Less relevant outside ${currentValue}` },
      { type: 'modified', metricName: 'Customer Acquisition Cost', reason: 'Benchmark targets adjusted' },
    ];
  } else {
    return [
      { type: 'added', metricName: 'Goal-Aligned Metric', reason: `Critical for ${newValue}` },
      { type: 'modified', metricName: 'Monthly Recurring Revenue', reason: 'Priority level changed' },
      { type: 'modified', metricName: 'Active Users', reason: 'Now a leading indicator for your goal' },
    ];
  }
};

export const ChangeImpactPreview = ({
  open,
  onOpenChange,
  changeType,
  currentValue,
  newValue,
  currentLabel,
  newLabel,
  onConfirm
}: ChangeImpactPreviewProps) => {
  const [isConfirming, setIsConfirming] = useState(false);

  const impactItems = useMemo(
    () => calculateImpact(changeType, currentValue, newValue),
    [changeType, currentValue, newValue]
  );

  const counts = useMemo(() => ({
    added: impactItems.filter(i => i.type === 'added').length,
    removed: impactItems.filter(i => i.type === 'removed').length,
    modified: impactItems.filter(i => i.type === 'modified').length,
  }), [impactItems]);

  const handleConfirm = async () => {
    setIsConfirming(true);
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 500));
    onConfirm();
    setIsConfirming(false);
    onOpenChange(false);
  };

  const typeConfig = {
    added: { icon: Plus, color: 'text-green-500', bg: 'bg-green-500/10', label: 'New' },
    removed: { icon: Minus, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Removed' },
    modified: { icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Modified' },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Review Changes
          </DialogTitle>
          <DialogDescription>
            Changing your {changeType === 'industry' ? 'industry' : 'strategic goal'} will 
            affect your metric recommendations.
          </DialogDescription>
        </DialogHeader>

        {/* Change summary */}
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <div className="flex-1 text-center">
            <p className="text-xs text-muted-foreground mb-1">Current</p>
            <Badge variant="outline" className="font-medium">
              {currentLabel}
            </Badge>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex-1 text-center">
            <p className="text-xs text-muted-foreground mb-1">New</p>
            <Badge className="font-medium bg-primary">
              {newLabel}
            </Badge>
          </div>
        </div>

        {/* Impact summary badges */}
        <div className="flex items-center justify-center gap-3">
          {counts.added > 0 && (
            <Badge variant="outline" className="gap-1 text-green-600 border-green-200 bg-green-50">
              <Plus className="h-3 w-3" />
              {counts.added} new
            </Badge>
          )}
          {counts.removed > 0 && (
            <Badge variant="outline" className="gap-1 text-red-600 border-red-200 bg-red-50">
              <Minus className="h-3 w-3" />
              {counts.removed} removed
            </Badge>
          )}
          {counts.modified > 0 && (
            <Badge variant="outline" className="gap-1 text-amber-600 border-amber-200 bg-amber-50">
              <TrendingUp className="h-3 w-3" />
              {counts.modified} modified
            </Badge>
          )}
        </div>

        <Separator />

        {/* Detailed impact list */}
        <div>
          <p className="text-sm font-medium mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Affected Recommendations
          </p>
          <ScrollArea className="h-48 pr-2">
            <div className="space-y-2">
              {impactItems.map((item, index) => {
                const config = typeConfig[item.type];
                const Icon = config.icon;
                return (
                  <div
                    key={index}
                    className={`flex items-start gap-3 p-2.5 rounded-lg ${config.bg}`}
                  >
                    <div className={`p-1 rounded ${config.bg}`}>
                      <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{item.metricName}</p>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.reason}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isConfirming}>
            {isConfirming ? (
              <>Processing...</>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Apply Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
