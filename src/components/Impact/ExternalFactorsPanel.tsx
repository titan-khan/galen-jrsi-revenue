import { useState } from "react";
import { Calendar, Globe, Building2, Scale, MoreHorizontal, ChevronDown, ChevronUp, Bot, AlertTriangle, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAttribution } from "@/contexts/AttributionContext";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { ExternalFactor, DetectionSource } from "@/types/attribution";
import { format } from "date-fns";

const CATEGORY_ICONS = {
  seasonal: Calendar,
  market: Globe,
  competitor: Building2,
  regulatory: Scale,
  other: MoreHorizontal,
};

const CATEGORY_LABELS = {
  seasonal: 'Seasonality',
  market: 'Market',
  competitor: 'Competitor',
  regulatory: 'Regulatory',
  other: 'Other',
};

const SOURCE_CONFIG: Record<DetectionSource, { label: string; color: string; icon: typeof Bot }> = {
  agent: { label: 'Agent Detected', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: Bot },
  system: { label: 'System Detected', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Bot },
  manual: { label: 'Manually Added', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400', icon: MessageSquare },
};

export function ExternalFactorsPanel() {
  const { externalFactors, formatCurrency } = useAttribution();
  const [isOpen, setIsOpen] = useState(true);

  const includedTotal = externalFactors
    .filter(f => f.isIncluded)
    .reduce((sum, f) => sum + f.estimatedImpact, 0);

  const agentDetected = externalFactors.filter(f => f.detectionSource === 'agent');
  const systemDetected = externalFactors.filter(f => f.detectionSource === 'system');

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                External Factors
                <Badge variant="secondary" className="ml-2">
                  {externalFactors.filter(f => f.isIncluded).length} active
                </Badge>
              </CardTitle>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </CollapsibleTrigger>
          <p className="text-xs text-muted-foreground mt-1">
            Factors detected by AI agents based on data patterns and market intelligence
          </p>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-3">
            {agentDetected.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Bot className="h-3.5 w-3.5" />
                  <span className="font-medium">Agent Detected ({agentDetected.length})</span>
                </div>
                {agentDetected.map((factor) => (
                  <ExternalFactorRow 
                    key={factor.id} 
                    factor={factor} 
                    formatCurrency={formatCurrency}
                  />
                ))}
              </div>
            )}

            {systemDetected.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Bot className="h-3.5 w-3.5" />
                  <span className="font-medium">System Detected ({systemDetected.length})</span>
                </div>
                {systemDetected.map((factor) => (
                  <ExternalFactorRow 
                    key={factor.id} 
                    factor={factor} 
                    formatCurrency={formatCurrency}
                  />
                ))}
              </div>
            )}

            <div className="pt-3 border-t flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total External Impact</span>
              <span className="font-semibold text-foreground">{formatCurrency(includedTotal)}</span>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

interface ExternalFactorRowProps {
  factor: ExternalFactor;
  formatCurrency: (value: number) => string;
}

function ExternalFactorRow({ factor, formatCurrency }: ExternalFactorRowProps) {
  const { challengeExternalFactor } = useAttribution();
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [challengeReason, setChallengeReason] = useState("");
  
  const Icon = CATEGORY_ICONS[factor.category];
  const sourceConfig = SOURCE_CONFIG[factor.detectionSource];
  
  const handleChallenge = () => {
    if (challengeReason.trim()) {
      challengeExternalFactor(factor.id, challengeReason);
      setChallengeOpen(false);
      setChallengeReason("");
    }
  };
  
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
      factor.isChallenged ? 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800' :
      factor.isIncluded ? 'bg-background' : 'bg-muted/30 opacity-60'
    }`}>
      <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
        <Icon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-medium text-sm text-foreground">{factor.name}</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {CATEGORY_LABELS[factor.category]}
          </Badge>
          <Badge className={`text-[10px] px-1.5 py-0 ${sourceConfig.color}`}>
            {sourceConfig.label}
          </Badge>
          <ConfidenceBadge level={factor.confidence} showLabel={false} size="sm" />
        </div>
        
        {factor.agentName && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <Bot className="h-3 w-3" />
            <span>{factor.agentName}</span>
          </div>
        )}
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            {format(new Date(factor.dateRange.start), "MMM d")} - {format(new Date(factor.dateRange.end), "MMM d, yyyy")}
          </span>
        </div>

        {factor.evidence && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="mt-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground cursor-help">
                <span className="font-medium text-foreground">Evidence: </span>
                <span className="line-clamp-2">{factor.evidence}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-sm">
              <p className="text-xs">{factor.evidence}</p>
              {factor.impactRange && (
                <p className="text-xs text-muted-foreground mt-1">
                  Impact Range: {formatCurrency(factor.impactRange.min)} - {formatCurrency(factor.impactRange.max)}
                </p>
              )}
            </TooltipContent>
          </Tooltip>
        )}

        {factor.isChallenged && factor.challengeReason && (
          <div className="mt-2 p-2 bg-amber-100 dark:bg-amber-900/20 rounded text-xs">
            <div className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-medium">
              <AlertTriangle className="h-3 w-3" />
              <span>Challenged</span>
            </div>
            <p className="text-amber-600 dark:text-amber-300 mt-1">{factor.challengeReason}</p>
          </div>
        )}
      </div>

      <div className="text-right shrink-0">
        <p className={`text-sm font-semibold ${
          factor.isChallenged ? 'text-amber-600 dark:text-amber-400 line-through' :
          factor.isIncluded ? 'text-foreground' : 'text-muted-foreground'
        }`}>
          {formatCurrency(factor.estimatedImpact)}
        </p>
        
        {!factor.isChallenged && (
          <Dialog open={challengeOpen} onOpenChange={setChallengeOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground mt-1 h-auto py-1 px-2">
                Challenge
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Challenge Finding</DialogTitle>
                <DialogDescription>
                  Explain why this external factor should not be included in the attribution. This will be logged for audit purposes.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium text-sm">{factor.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">Impact: {formatCurrency(factor.estimatedImpact)}</p>
                </div>
                <Textarea
                  placeholder="Provide justification for challenging this finding..."
                  value={challengeReason}
                  onChange={(e) => setChallengeReason(e.target.value)}
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setChallengeOpen(false)}>Cancel</Button>
                <Button onClick={handleChallenge} disabled={!challengeReason.trim()}>
                  Submit Challenge
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}