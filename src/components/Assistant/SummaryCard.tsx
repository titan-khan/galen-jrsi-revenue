import { Sparkles, CheckCircle2, AlertCircle, HelpCircle, AlertTriangle, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ParsedSummary } from '@/utils/streamingParser';

interface SummaryCardProps {
  summary: ParsedSummary;
  isStreaming?: boolean;
}

function parseConfidenceScore(confidence: string): {
  score: number;
  breakdown: { sample: string; attribution: string; alignment: string } | null;
} {
  // Try to extract numeric score: "0.85" or "Confidence: 0.85 (Sample: high, ...)"
  const scoreMatch = confidence.match(/(\d+\.\d+)/);
  const score = scoreMatch ? parseFloat(scoreMatch[1]) : 0.5;
  
  // Try to extract breakdown
  const sampleMatch = confidence.match(/Sample:\s*(\w+)/i);
  const attributionMatch = confidence.match(/Attribution:\s*(\w+)/i);
  const alignmentMatch = confidence.match(/Alignment:\s*(\w+)/i);
  
  if (sampleMatch || attributionMatch || alignmentMatch) {
    return {
      score,
      breakdown: {
        sample: sampleMatch?.[1] || 'unknown',
        attribution: attributionMatch?.[1] || 'unknown',
        alignment: alignmentMatch?.[1] || 'unknown',
      },
    };
  }
  
  return { score, breakdown: null };
}

function getConfidenceConfig(confidence: string) {
  const { score, breakdown } = parseConfidenceScore(confidence);
  
  if (score >= 0.7) {
    return {
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-500/10',
      icon: CheckCircle2,
      label: `High (${score.toFixed(2)})`,
      breakdown,
    };
  }
  
  if (score < 0.5) {
    return {
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500/10',
      icon: AlertCircle,
      label: `Low (${score.toFixed(2)})`,
      breakdown,
    };
  }
  
  return {
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-500/10',
    icon: HelpCircle,
    label: `Medium (${score.toFixed(2)})`,
    breakdown,
  };
}

function parseDataSources(text: string): string[] {
  // Extract data sources from summary
  const sourcesMatch = text.match(/Data Sources?:\s*(.+?)(?:\n|$)/i);
  if (sourcesMatch) {
    return sourcesMatch[1]
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  return [];
}

export function SummaryCard({ summary, isStreaming }: SummaryCardProps) {
  const { keyTakeaway, confidence, nextSteps } = summary;
  const confidenceConfig = getConfidenceConfig(confidence);
  const ConfidenceIcon = confidenceConfig.icon;
  const dataSources = parseDataSources(confidence + ' ' + (nextSteps || ''));

  if (!keyTakeaway && !nextSteps) return null;

  return (
    <div
      className={cn(
        'mt-3 rounded-lg border border-border/50 bg-muted/20 p-3 space-y-2',
        'animate-fade-in'
      )}
    >
      {/* Header with sparkles */}
      <div className="flex items-start gap-2">
        <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div className="space-y-2 flex-1 min-w-0">
          {/* Key Takeaway */}
          {keyTakeaway && (
            <p className="text-sm font-medium leading-snug">
              {keyTakeaway}
              {isStreaming && (
                <span className="inline-block w-1.5 h-3.5 bg-primary/50 ml-0.5 animate-pulse" />
              )}
            </p>
          )}

          {/* Confidence Badge with Tooltip */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium cursor-help',
                  confidenceConfig.bg,
                  confidenceConfig.color
                )}
              >
                <ConfidenceIcon className="h-3 w-3" />
                <span>Confidence: {confidenceConfig.label}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="text-sm font-medium mb-1">Confidence Breakdown</p>
              {confidenceConfig.breakdown ? (
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p>• Sample Size: {confidenceConfig.breakdown.sample}</p>
                  <p>• Attribution: {confidenceConfig.breakdown.attribution}</p>
                  <p>• Cross-Metric Alignment: {confidenceConfig.breakdown.alignment}</p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Based on available data quality and cross-metric alignment.
                </p>
              )}
            </TooltipContent>
          </Tooltip>

          {/* Next Steps */}
          {nextSteps && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Next:</span> {nextSteps}
            </p>
          )}

          {/* Data Sources */}
          {dataSources.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Database className="h-3 w-3" />
              <span>Sources: {dataSources.join(', ')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
