// =============================================================================
// INLINE CHART — Wrapper around VegaLiteChart for assistant chat messages
// Handles streaming state, JSON parse errors, and provides consistent styling
// Features: chart title extraction, download as PNG, expand/fullscreen dialog
// =============================================================================

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Maximize2, AlertTriangle } from 'lucide-react';
import ChartPlaceholder from './ChartPlaceholder';
import type { VegaLiteBlock } from '@/utils/streamingParser';
import { tryRepairJson, ensureEncoding } from '@/utils/streamingParser';
import { ChartErrorBoundary } from '@/components/ui/ChartErrorBoundary';
import { preloadVegaEmbed } from '@/components/ui/VegaLiteChart';
import type { VegaLiteChartHandle } from '@/components/ui/VegaLiteChart';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { validateChartData, hasExtremeOutliers } from '@/utils/chartDataValidation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Start downloading vega-embed as soon as this module is imported
// (i.e. when the first chart block starts streaming — before it's complete)
preloadVegaEmbed();

const VegaLiteChart = lazy(() => import('@/components/ui/VegaLiteChart'));

interface InlineChartProps {
  block: VegaLiteBlock;
  evidenceText?: string; // Optional evidence text for validation
}

type ChartType = 'auto' | 'line' | 'bar' | 'area' | 'scatter' | 'pie';

// ─── Download Utility ─────────────────────────────────────────────────

/** Trigger a PNG download from a VegaLiteChart ref. */
async function downloadChartAsPNG(
  chartRef: React.RefObject<VegaLiteChartHandle | null>,
  filename: string,
) {
  if (!chartRef.current) return;
  const canvas = await chartRef.current.toCanvas();
  if (!canvas) return;

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 'image/png');
}

// ─── Component ────────────────────────────────────────────────────────

export default function InlineChart({ block, evidenceText }: InlineChartProps) {
  const [selectedChartType] = useState<ChartType>('auto');
  const [expandedOpen, setExpandedOpen] = useState(false);

  // Refs for inline and expanded chart instances
  const chartRef = useRef<VegaLiteChartHandle>(null);
  const expandedChartRef = useRef<VegaLiteChartHandle>(null);

  // All hooks must be called unconditionally (React Rules of Hooks)
  const parsed = useMemo(() => {
    if (!block.isComplete) return { spec: null, error: null };
    try {
      const spec = JSON.parse(block.rawJson);
      return { spec, error: null };
    } catch {
      // JSON.parse failed — attempt repair (LLM often truncates JSON)
      const repaired = tryRepairJson(block.rawJson);
      if (repaired) {
        const withEncoding = ensureEncoding(repaired);
        console.warn('[InlineChart] Repaired malformed chart JSON', {
          blockId: block.id,
          rawPreview: block.rawJson.slice(0, 120),
          hadEncoding: Boolean((repaired as any).encoding),
        });
        return { spec: withEncoding, error: null };
      }
      console.error('[InlineChart] Chart JSON is unrecoverable', {
        blockId: block.id,
        rawPreview: block.rawJson.slice(0, 200),
      });
      return { spec: null, error: 'Malformed chart data from AI' };
    }
  }, [block.rawJson, block.isComplete]);

  const detectedChartType = useMemo((): ChartType => {
    if (!parsed.spec) return 'bar';

    const spec = parsed.spec as any;
    const markType = typeof spec.mark === 'string' ? spec.mark : spec.mark?.type;

    switch (markType) {
      case 'line':
        return 'line';
      case 'bar':
        return 'bar';
      case 'area':
        return 'area';
      case 'point':
        return 'scatter';
      case 'arc':
        return 'pie';
      default:
        return 'bar';
    }
  }, [parsed.spec]);

  const transformedSpec = useMemo(() => {
    if (!parsed.spec) {
      return parsed.spec;
    }

    const originalSpec = parsed.spec as any;
    const newSpec = { ...originalSpec };

    // Extract encoding from original spec
    const encoding = originalSpec.encoding || {};

    // Apply chart type transformation
    if (selectedChartType !== 'auto') {
      switch (selectedChartType) {
        case 'line':
          newSpec.mark = { type: 'line', point: true, tooltip: true };
          break;
        case 'bar':
          newSpec.mark = { type: 'bar', tooltip: true };
          // Bar charts must start from 0 for correct proportions
          if (newSpec.encoding?.y) {
            newSpec.encoding.y = {
              ...newSpec.encoding.y,
              scale: { ...newSpec.encoding.y.scale, zero: true },
            };
          }
          break;
        case 'area':
          newSpec.mark = { type: 'area', tooltip: true };
          // Area charts must start from 0 for correct proportions
          if (newSpec.encoding?.y) {
            newSpec.encoding.y = {
              ...newSpec.encoding.y,
              scale: { ...newSpec.encoding.y.scale, zero: true },
            };
          }
          break;
        case 'scatter':
          newSpec.mark = { type: 'point', tooltip: true, filled: true, size: 60 };
          break;
        case 'pie':
          // Pie chart requires different structure with percentage labels
          if (encoding.x && encoding.y) {
            // Calculate total for percentage
            newSpec.transform = [
              {
                joinaggregate: [{
                  op: 'sum',
                  field: encoding.y.field,
                  as: 'TotalValue',
                }],
              },
              {
                calculate: `datum.${encoding.y.field} / datum.TotalValue`,
                as: 'PercentValue',
              },
            ];

            newSpec.layer = [
              {
                mark: { type: 'arc', tooltip: true, outerRadius: 100 },
                encoding: {
                  theta: {
                    field: encoding.y.field,
                    type: 'quantitative',
                    stack: true,
                  },
                  color: encoding.x,
                  tooltip: [
                    encoding.x,
                    encoding.y,
                    {
                      field: 'PercentValue',
                      type: 'quantitative',
                      title: 'Persentase',
                      format: '.1%',
                    },
                  ],
                },
              },
              {
                mark: { type: 'text', radius: 130, fontSize: 13, fontWeight: 600 },
                encoding: {
                  text: {
                    field: 'PercentValue',
                    type: 'quantitative',
                    format: '.1%',
                  },
                  theta: {
                    field: encoding.y.field,
                    type: 'quantitative',
                    stack: true,
                  },
                  color: { value: 'black' },
                },
              },
            ];

            // Remove top-level mark and encoding since we're using layers
            delete newSpec.mark;
            delete newSpec.encoding;
          }
          break;
      }
    }

    return newSpec;
  }, [parsed.spec, selectedChartType]);

  // Validate chart data against evidence text if available
  const validationResult = useMemo(() => {
    if (!evidenceText || !transformedSpec?.data?.values) {
      return { isValid: true, inconsistencies: [], warnings: [] };
    }
    
    return validateChartData(transformedSpec.data.values, evidenceText);
  }, [transformedSpec, evidenceText]);

  // Check for extreme outliers that would make chart unreadable
  const hasOutliers = useMemo(() => {
    if (!transformedSpec?.data?.values) return false;
    return hasExtremeOutliers(transformedSpec.data.values);
  }, [transformedSpec]);

  // Extract title from spec and produce a title-stripped display spec
  const { chartTitle, displaySpec } = useMemo(() => {
    if (!transformedSpec) return { chartTitle: 'Visualisasi Data', displaySpec: transformedSpec };

    const spec = transformedSpec as any;
    let title = '';

    // 1) Check top-level title (string or object)
    if (typeof spec.title === 'string' && spec.title.trim()) {
      title = spec.title.trim();
    } else if (spec.title && typeof spec.title === 'object' && typeof spec.title.text === 'string' && spec.title.text.trim()) {
      title = spec.title.text.trim();
    }

    // 2) Fallback: derive from axis encoding titles (e.g. "Revenue (IDR) by Route")
    if (!title && spec.encoding) {
      const yTitle = spec.encoding?.y?.title;
      const xTitle = spec.encoding?.x?.title;
      if (yTitle && xTitle) {
        title = `${yTitle} by ${xTitle}`;
      } else if (yTitle) {
        title = yTitle;
      }
    }

    // 3) Final fallback
    if (!title) title = 'Visualisasi Data';

    // Strip title from spec to avoid double rendering (VegaEmbed renders it natively)
    const { title: _stripped, ...specWithoutTitle } = spec;

    return { chartTitle: title, displaySpec: specWithoutTitle };
  }, [transformedSpec]);

  // Slugified filename for PNG download
  const pngFilename = useMemo(() => {
    const slug = chartTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'chart';
    return `${slug}.png`;
  }, [chartTitle]);

  // Download handlers
  const handleDownloadPNG = useCallback(() => downloadChartAsPNG(chartRef, pngFilename), [pngFilename]);
  const handleExpandedDownloadPNG = useCallback(() => downloadChartAsPNG(expandedChartRef, pngFilename), [pngFilename]);

  // Stagger chart renders — when multiple charts in a single message complete
  // streaming simultaneously, this prevents a burst of parallel vegaEmbed() calls.
  // First chart (vega-0): 0ms, second (vega-1): 80ms, third (vega-2): 160ms, etc.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!block.isComplete) {
      setReady(false);
      return;
    }
    const index = parseInt(block.id.replace(/\D/g, ''), 10) || 0;
    const delay = index * 80;  // 80ms stagger — just enough to avoid burst
    const timer = setTimeout(() => setReady(true), delay);
    return () => clearTimeout(timer);
  }, [block.isComplete, block.id]);

  // Suppress unused variable warnings for chart type switching (hidden for now)
  void detectedChartType;

  // Early returns AFTER all hooks
  if (!block.isComplete || !ready) {
    return <ChartPlaceholder />;
  }

  if (parsed.error || !parsed.spec) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground rounded-md border border-border/50 bg-muted/50 px-3 py-2">
        <svg
          className="h-4 w-4 shrink-0 text-destructive-foreground"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>Chart failed to render</span>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-border bg-background p-3 mt-3 mb-6 shadow-sm">
        {/* Header: chart title */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
          <span className="text-sm font-semibold text-foreground">{chartTitle}</span>
        </div>

        {/* Data validation warnings */}
        {!validationResult.isValid && (
          <Alert variant="destructive" className="mb-3">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Data Inconsistency Detected</AlertTitle>
            <AlertDescription>
              <div className="space-y-1">
                {validationResult.warnings.map((warning, i) => (
                  <div key={i} className="text-sm">{warning}</div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Extreme outlier warning */}
        {hasOutliers && validationResult.isValid && (
          <Alert className="mb-3">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Extreme Data Range</AlertTitle>
            <AlertDescription>
              This chart contains values with very large differences that may affect readability.
            </AlertDescription>
          </Alert>
        )}

        {/* Chart */}
        <div className="overflow-auto">
          <ChartErrorBoundary>
            <Suspense fallback={<ChartPlaceholder />}>
              <VegaLiteChart ref={chartRef} spec={displaySpec} height={300} />
            </Suspense>
          </ChartErrorBoundary>
        </div>

        {/* Footer: action buttons */}
        <div className="flex items-center justify-end gap-1 pt-2 mt-2 border-t border-border">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={handleDownloadPNG}
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Download as PNG</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => setExpandedOpen(true)}
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Expand chart</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Expanded chart dialog */}
      <Dialog open={expandedOpen} onOpenChange={setExpandedOpen}>
        <DialogContent className="max-w-[90vw] w-full max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">{chartTitle}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto min-h-0">
            <ChartErrorBoundary>
              <Suspense fallback={<ChartPlaceholder />}>
                <VegaLiteChart ref={expandedChartRef} spec={displaySpec} height={500} />
              </Suspense>
            </ChartErrorBoundary>
          </div>
          <div className="flex items-center justify-end gap-1 pt-2 border-t border-border/50">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground/50 hover:text-foreground"
                  onClick={handleExpandedDownloadPNG}
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download as PNG</TooltipContent>
            </Tooltip>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
