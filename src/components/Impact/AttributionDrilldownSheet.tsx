import { ArrowRight, TrendingUp, BarChart3, Target, PieChart, ChevronRight } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAttribution } from "@/contexts/AttributionContext";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { ImpactCategory, CATEGORY_CONFIG, AttributionEntry } from "@/types/attribution";
import { useState } from "react";

interface AttributionDrilldownSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: ImpactCategory | string | null;
}

export function AttributionDrilldownSheet({ open, onOpenChange, category }: AttributionDrilldownSheetProps) {
  const { performanceSummary, attributionChains, formatCurrency } = useAttribution();
  const [expandedCategory, setExpandedCategory] = useState<ImpactCategory | null>(null);

  if (!performanceSummary) return null;

  // Overview mode when no category is provided
  if (!category) {
    const groupedAttributions = performanceSummary.attributions.reduce((acc, attr) => {
      if (!acc[attr.category]) acc[attr.category] = [];
      acc[attr.category].push(attr);
      return acc;
    }, {} as Record<ImpactCategory, AttributionEntry[]>);

    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary">
                <PieChart className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <SheetTitle className="text-lg">Full Attribution Breakdown</SheetTitle>
                <SheetDescription>
                  Complete performance attribution for {performanceSummary.period.label}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="space-y-6">
            {/* Performance Summary */}
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Change</p>
                    <p className="text-lg font-bold text-foreground">
                      {formatCurrency(performanceSummary.totalChange)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Galen Impact</p>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {performanceSummary.galenPercentage.toFixed(0)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">ROI</p>
                    <p className="text-lg font-bold text-primary">
                      {performanceSummary.overallROI.toFixed(0)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Category Sections */}
            {Object.entries(groupedAttributions).map(([cat, attrs]) => {
              const catKey = cat as ImpactCategory;
              const config = CATEGORY_CONFIG[catKey];
              const totalValue = attrs.reduce((sum, a) => sum + a.value, 0);
              const totalPercentage = attrs.reduce((sum, a) => sum + a.percentage, 0);
              const isExpanded = expandedCategory === catKey;

              return (
                <div key={cat} className="border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedCategory(isExpanded ? null : catKey)}
                    className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${config.bgColor}`}>
                        <TrendingUp className="h-4 w-4 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-sm">{config.label}</p>
                        <p className="text-xs text-muted-foreground">{attrs.length} items</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(totalValue)}</p>
                        <p className="text-xs text-muted-foreground">{totalPercentage.toFixed(1)}%</p>
                      </div>
                      <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </button>
                  
                  {isExpanded && (
                    <div className="border-t p-3 space-y-2 bg-muted/30">
                      {attrs.map((attr) => (
                        <AttributionItem 
                          key={attr.id} 
                          attribution={attr} 
                          formatCurrency={formatCurrency}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Methodology */}
            <Separator />
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">Methodology</h3>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  Attribution calculated using multi-touch attribution, A/B testing, and causal inference models. 
                  External factors detected by AI agents with evidence-based confidence scoring.
                </p>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Category-specific view
  const validCategory = category as ImpactCategory;
  const categoryConfig = CATEGORY_CONFIG[validCategory];
  const attributions = performanceSummary.attributions.filter(a => a.category === validCategory);
  const relevantChains = attributionChains.filter(c => 
    attributions.some(a => a.sourceId === c.actionItemId)
  );

  const isGalen = validCategory.startsWith('galen');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${categoryConfig.bgColor}`}>
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <SheetTitle className="text-lg">{categoryConfig.label}</SheetTitle>
              <SheetDescription>
                Detailed breakdown and attribution chain
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Impact</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(attributions.reduce((sum, a) => sum + a.value, 0))}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Contribution</p>
                  <p className="text-2xl font-bold text-primary">
                    {attributions.reduce((sum, a) => sum + a.percentage, 0).toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attribution Items */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Contributing Items</h3>
            {attributions.map((attr) => (
              <AttributionItem 
                key={attr.id} 
                attribution={attr} 
                formatCurrency={formatCurrency}
              />
            ))}
          </div>

          {/* Causal Chains (only for Galen items) */}
          {isGalen && relevantChains.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Attribution Chains
                </h3>
                <p className="text-xs text-muted-foreground">
                  Trace the impact from action items through metrics to the North Star
                </p>
                {relevantChains.map((chain) => (
                  <CausalChainView key={chain.actionItemId} chain={chain} />
                ))}
              </div>
            </>
          )}

          {/* Methodology */}
          <Separator />
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">Methodology</h3>
            <div className="p-3 bg-muted/50 rounded-lg">
              {attributions[0]?.methodology ? (
                <p className="text-xs text-muted-foreground">{attributions[0].methodology}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Impact calculated using standard attribution methodology with available data sources.
                </p>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface AttributionItemProps {
  attribution: AttributionEntry;
  formatCurrency: (value: number) => string;
}

function AttributionItem({ attribution, formatCurrency }: AttributionItemProps) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm text-foreground">{attribution.label}</span>
              <ConfidenceBadge level={attribution.confidence} showLabel={false} size="sm" />
            </div>
            {attribution.description && (
              <p className="text-xs text-muted-foreground">{attribution.description}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="font-semibold text-foreground">{formatCurrency(attribution.value)}</p>
            <p className="text-xs text-muted-foreground">{attribution.percentage.toFixed(1)}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface CausalChainViewProps {
  chain: {
    actionItemId: string;
    actionItemTitle: string;
    chain: Array<{
      level: 'action' | 'metric' | 'north-star';
      id: string;
      name: string;
      value: number;
      valueFormatted: string;
      contributionPercentage: number;
    }>;
    totalContribution: number;
    confidence: 'high' | 'medium' | 'low';
  };
}

function CausalChainView({ chain }: CausalChainViewProps) {
  const levelColors = {
    action: 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800',
    metric: 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
    'north-star': 'bg-primary/10 border-primary/20',
  };

  const levelIcons = {
    action: TrendingUp,
    metric: BarChart3,
    'north-star': Target,
  };

  return (
    <div className="p-3 border rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {chain.actionItemTitle}
        </span>
        <ConfidenceBadge level={chain.confidence} showLabel={false} size="sm" />
      </div>
      
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {chain.chain.map((step, index) => {
          const Icon = levelIcons[step.level];
          return (
            <div key={step.id} className="flex items-center shrink-0">
              <div className={`p-2 rounded-lg border ${levelColors[step.level]}`}>
                <div className="flex items-center gap-1.5">
                  <Icon className="h-3 w-3" />
                  <div>
                    <p className="text-[10px] font-medium line-clamp-1 max-w-[100px]">{step.name}</p>
                    <p className="text-[10px] text-muted-foreground">{step.valueFormatted}</p>
                  </div>
                </div>
              </div>
              {index < chain.chain.length - 1 && (
                <ArrowRight className="h-3 w-3 text-muted-foreground mx-1 shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
