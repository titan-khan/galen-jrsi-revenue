import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, TrendingUp, TrendingDown, ExternalLink, MessageSquare } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SVGSparkline } from './SVGSparkline';
import { useMetrics } from '@/contexts/MetricsContext';
import { getMetricPath } from '@/data/metricsTreeData';
import { cn } from '@/lib/utils';
import type { MetricStatus } from '@/types/metric';

interface MetricDetailDrawerProps {
  metricId: string | null;
  open: boolean;
  onClose: () => void;
}

const STATUS_CONFIG: Record<MetricStatus, { badge: string; label: string }> = {
  healthy: {
    badge: 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800',
    label: 'Sehat',
  },
  warning: {
    badge: 'bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800',
    label: 'Perlu Perhatian',
  },
  critical: {
    badge: 'bg-red-500/10 text-red-600 border-red-200 dark:border-red-800',
    label: 'Kritis',
  },
};

const highlightText = (text: string, boldParts: string[]) => {
  let result = text;
  boldParts.forEach((part) => {
    result = result.replace(
      part,
      `<strong class="font-semibold text-foreground">${part}</strong>`
    );
  });
  return result;
};

export function MetricDetailDrawer({ metricId, open, onClose }: MetricDetailDrawerProps) {
  const navigate = useNavigate();
  const { getMetricById } = useMetrics();
  const metric = metricId ? getMetricById(metricId) : undefined;

  const breadcrumbPath = useMemo(() => {
    if (!metricId) return [];
    return getMetricPath(metricId);
  }, [metricId]);

  if (!metric) {
    return (
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent className="w-[400px] sm:w-[440px] p-0">
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Metrik tidak ditemukan
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const { displayData } = metric;
  const isPositive = displayData.changePercent >= 0;
  const isGood =
    metric.direction === 'down_is_good'
      ? displayData.changePercent <= 0
      : displayData.changePercent >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  const statusConfig = STATUS_CONFIG[displayData.status];

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-[400px] sm:w-[440px] p-0 flex flex-col [&>button.absolute]:hidden">
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-border space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-3">
              <SheetTitle className="text-base font-semibold text-foreground leading-tight">
                {metric.name}
              </SheetTitle>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge
                  variant="outline"
                  className={cn('text-[10px] h-5 px-1.5 font-medium', statusConfig.badge)}
                >
                  {statusConfig.label}
                </Badge>
                <span className="text-[11px] text-muted-foreground">
                  {displayData.filterContext}
                </span>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {/* Large Sparkline */}
          <div>
            <SVGSparkline
              data={displayData.sparklineData}
              width={360}
              height={120}
              showLabels={true}
              className="w-full"
            />
          </div>

          {/* Value + Change */}
          <div className="space-y-2">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-foreground font-mono tracking-tight">
                {displayData.currentValue}
              </span>
              {displayData.changeAbsolute !== 'N/A' && (
                <div
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
                    isGood
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-red-500/10 text-red-600 dark:text-red-400'
                  )}
                >
                  <TrendIcon className="h-3.5 w-3.5" />
                  <span>
                    {isPositive ? '+' : ''}
                    {displayData.changePercent}%
                  </span>
                </div>
              )}
            </div>
            {displayData.changeAbsolute !== 'N/A' && (
              <p className="text-xs text-muted-foreground">
                Perubahan: {displayData.changeAbsolute} {displayData.comparisonLabel || 'vs periode sebelumnya'}
              </p>
            )}
          </div>

          <Separator />

          {/* AI Insight (full text, not truncated) */}
          <div className="space-y-2">
            <h4 className="text-[13px] font-medium text-foreground">Insight AI</h4>
            <p
              className="text-[13px] leading-relaxed text-muted-foreground"
              dangerouslySetInnerHTML={{
                __html: highlightText(displayData.insight.text, displayData.insight.boldParts),
              }}
            />
          </div>

          <Separator />

          {/* Metric Details */}
          <div className="space-y-3">
            <h4 className="text-[13px] font-medium text-foreground">Detail</h4>
            <div className="grid grid-cols-2 gap-3">
              <DetailItem label="Domain" value={metric.domain || '—'} />
              <DetailItem label="Tipe" value={formatMetricType(metric.metricType)} />
              <DetailItem label="Agregasi" value={metric.aggregation.toUpperCase()} />
              <DetailItem label="Granularitas" value={metric.timeGranularity} />
              <DetailItem label="Sumber Data" value={metric.dataSource} />
              <DetailItem label="Pemilik" value={metric.owner} />
            </div>
          </div>

          {/* Related Metrics (breadcrumb path) */}
          {breadcrumbPath.length > 1 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-[13px] font-medium text-foreground">Metrik Terkait</h4>
                <div className="flex items-center gap-1 flex-wrap text-[11px] text-muted-foreground">
                  {breadcrumbPath.map((name, i) => (
                    <span key={i} className="flex items-center gap-1">
                      {i > 0 && <span className="text-muted-foreground/40">→</span>}
                      <span
                        className={cn(
                          'px-1.5 py-0.5 rounded',
                          i === breadcrumbPath.length - 1
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'bg-muted'
                        )}
                      >
                        {name}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Description */}
          <Separator />
          <div className="space-y-2">
            <h4 className="text-[13px] font-medium text-foreground">Deskripsi</h4>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              {metric.description}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-5 py-3 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => {
              onClose();
              navigate(`/metrics/edit/${metric.id}`);
            }}
          >
            Ubah Definisi
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-primary"
            onClick={() => {
              onClose();
              const changeDir = displayData.changePercent >= 0 ? '+' : '';
              navigate('/assistant', {
                state: {
                  prefillMessage: `Analisis @${metric.name} — saat ini di ${displayData.currentValue} (${changeDir}${displayData.changePercent}%). Apa yang mendorong perubahan ini dan langkah apa yang harus kita ambil?`,
                  metricContext: {
                    metricId: metric.id,
                    name: metric.name,
                    currentValue: displayData.currentValue,
                    changePercent: displayData.changePercent,
                    changeAbsolute: displayData.changeAbsolute,
                    status: displayData.status,
                    domain: metric.domain,
                  },
                },
              });
            }}
          >
            <MessageSquare className="h-3 w-3" />
            Buka di Asisten
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <p className="text-[12px] text-foreground/80 capitalize">{value}</p>
    </div>
  );
}

function formatMetricType(type?: string): string {
  if (!type) return '—';
  return type.charAt(0).toUpperCase() + type.slice(1);
}
