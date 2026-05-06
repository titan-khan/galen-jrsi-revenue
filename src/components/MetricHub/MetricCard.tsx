import { useState } from "react";
import { TrendingUp, TrendingDown, Check, X, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SVGSparkline } from "./SVGSparkline";
import { cn } from "@/lib/utils";
import type { MetricDefinition } from "@/types/metric";
import { useMetrics } from "@/contexts/MetricsContext";
import { MetricCertBadge } from "@/components/MetricCertBadge";

interface MetricCardProps {
  metric: MetricDefinition;
  onUnfollow?: (id: string) => void;
  onViewDetails?: (metricId: string) => void;
}

const DOMAIN_COLORS: Record<string, string> = {
  Revenue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  Cost: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800',
  Fee: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  Margin: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  Operational: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800',
  Performance: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
};

const TYPE_LABELS: Record<string, string> = {
  result: 'Hasil bisnis',
  actionable: 'Bisa langsung ditindaklanjuti',
  observational: 'Pengamatan',
  experimental: 'Skenario eksperimental',
};

const highlightText = (text: string, boldParts: string[]) => {
  let result = text;
  boldParts.forEach((part) => {
    result = result.replace(part, `<strong class="font-semibold text-foreground">${part}</strong>`);
  });
  return result;
};

const SHOW_CERT_BADGES = import.meta.env.VITE_SHOW_CERT_BADGES === "true";

const MetricCard = ({ metric, onUnfollow, onViewDetails }: MetricCardProps) => {
  const [isHoveringFollow, setIsHoveringFollow] = useState(false);
  const { displayData } = metric;
  const { getCertForMetric } = useMetrics();
  const cert = getCertForMetric(metric.id);
  const isPositive = displayData.changePercent >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  const domainColor = DOMAIN_COLORS[metric.domain || ''] || 'bg-muted text-muted-foreground';

  // Determine if the change is "good" or "bad" based on metric direction
  const isGood =
    metric.direction === "down_is_good"
      ? displayData.changePercent <= 0
      : displayData.changePercent >= 0;

  return (
    <div
      className="relative bg-card border border-border rounded-lg p-4 hover:shadow-md transition-all duration-200 cursor-pointer group"
      onClick={() => onViewDetails?.(metric.id)}
    >
      {/* Top-right actions: Following button + menu */}
      <div className="absolute top-3 right-3 flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-6 text-[10px] px-2 gap-1 font-medium transition-colors',
            isHoveringFollow
              ? 'text-red-600 hover:text-red-600 hover:bg-red-500/10'
              : 'text-emerald-600 hover:text-emerald-600 hover:bg-emerald-500/10'
          )}
          onMouseEnter={() => setIsHoveringFollow(true)}
          onMouseLeave={() => setIsHoveringFollow(false)}
          onClick={(e) => {
            e.stopPropagation();
            onUnfollow?.(metric.id);
          }}
        >
          {isHoveringFollow ? (
            <>
              <X className="h-3 w-3" />
              Unfollow
            </>
          ) : (
            <>
              <Check className="h-3 w-3" />
              Following
            </>
          )}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewDetails?.(metric.id); }}>
              View details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onUnfollow?.(metric.id); }}>
              Unfollow
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Domain + (optional) cert badges */}
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        {metric.domain && (
          <Badge
            variant="outline"
            className={cn('text-[10px] h-5 px-1.5 font-medium', domainColor)}
          >
            {metric.domain}
          </Badge>
        )}
        {SHOW_CERT_BADGES && cert && <MetricCertBadge cert={cert} size="sm" />}
      </div>

      {/* Metric name */}
      <h3 className="text-[14px] font-medium text-foreground mb-1 pr-20 leading-tight">
        {metric.name}
      </h3>

      {/* Subtitle: plain "apa yang diukur" caption (Palantir-style data product) */}
      {displayData.subtitle && (
        <p className="text-[11px] text-muted-foreground/70 mb-2 leading-snug pr-20">
          {displayData.subtitle}
        </p>
      )}

      {/* Value + change */}
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-xl font-bold text-foreground font-mono tracking-tight">
          {displayData.currentValue}
        </span>
        {displayData.changeAbsolute !== 'N/A' && (
          <div
            className={cn(
              'inline-flex items-center gap-0.5 text-[11px] font-medium',
              isGood
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400'
            )}
          >
            <TrendIcon className="h-3 w-3" />
            <span>
              {isPositive ? '+' : ''}
              {displayData.changePercent}%
            </span>
          </div>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground/60 mb-3">
        {displayData.comparisonLabel || displayData.filterContext}
      </p>

      {/* SVG Sparkline */}
      {displayData.sparklineData.length >= 2 && (
        <div className="mb-3">
          <SVGSparkline
            data={displayData.sparklineData}
            width={260}
            height={40}
            showLabels={true}
            className="w-full"
          />
        </div>
      )}

      {/* Insight text */}
      {displayData.insight.text && (
        <p
          className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2"
          dangerouslySetInnerHTML={{
            __html: highlightText(displayData.insight.text, displayData.insight.boldParts),
          }}
        />
      )}

      {/* Metric type label */}
      {!displayData.insight.text && (
        <p className="text-[11px] text-muted-foreground/50">
          {TYPE_LABELS[metric.metricType || ''] || 'Metric'}
        </p>
      )}

      {/* View details hint — appears on hover */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-2">
        <span className="text-[11px] text-primary font-medium">
          View details →
        </span>
      </div>
    </div>
  );
};

export default MetricCard;
