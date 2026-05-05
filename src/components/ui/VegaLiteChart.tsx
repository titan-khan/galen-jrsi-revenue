// =============================================================================
// VEGA-LITE CHART — Lazy-loaded renderer for Vega-Lite JSON specs
// Uses dynamic import() so the ~755KB Vega bundle only loads on first chart.
// Call preloadVegaEmbed() early (e.g. when streaming starts) so the bundle
// is already cached by the time the chart component mounts.
// =============================================================================

import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { getVegaTheme } from './vega-theme';
import { cn } from '@/lib/utils';

// Module-level cache: import once, reuse forever.
let vegaEmbedPromise: Promise<typeof import('vega-embed')> | null = null;

function getVegaEmbed() {
  if (!vegaEmbedPromise) {
    vegaEmbedPromise = import('vega-embed');
  }
  return vegaEmbedPromise;
}

/** Call this early to start downloading the Vega bundle in the background. */
export function preloadVegaEmbed() {
  getVegaEmbed();
}

export interface VegaLiteChartHandle {
  /** Export the current chart as a canvas element. Returns null if view is not ready. */
  toCanvas: () => Promise<HTMLCanvasElement | null>;
}

interface VegaLiteChartProps {
  spec: object;
  className?: string;
  height?: number;
}

/**
 * Analyse the spec's x-axis labels and return axisX overrides.
 * - Few short labels → horizontal (angle 0)
 * - Many labels or long text → rotate -35° so nothing overlaps
 */
function getAxisXOverrides(spec: any): Record<string, any> {
  // Try to figure out x-axis field and values from inline data
  const xField = spec?.encoding?.x?.field;
  const data: any[] = spec?.data?.values;

  if (!xField || !Array.isArray(data) || data.length === 0) {
    // Can't detect — return safe defaults (let Vega decide)
    return {};
  }

  const labels = data.map((d) => String(d[xField] ?? ''));
  const uniqueLabels = [...new Set(labels)];
  const maxLen = Math.max(...uniqueLabels.map((l) => l.length));
  const count = uniqueLabels.length;

  // Heuristic: if labels are short AND few, keep horizontal
  // "short" = max 8 chars, "few" = up to 6 labels
  if (maxLen <= 8 && count <= 6) {
    return {
      labelAngle: 0,
      labelAlign: 'center',
      labelOverlap: 'parity',
    };
  }

  // Otherwise rotate so labels don't collide
  return {
    labelAngle: -35,
    labelAlign: 'right',
    labelBaseline: 'middle',
    labelOverlap: false,      // show all — rotation gives enough room
  };
}

/**
 * Normalise the Y-axis domain:
 * 1. Always start from 0 for positive data (prevents misleading "zoomed-in" charts)
 * 2. Pad the max ~20% above the highest value so bars/lines don't touch the top edge
 * Only applies when the spec uses inline data with a quantitative y encoding.
 */
function padYDomain(spec: any): any {
  const yField = spec?.encoding?.y?.field;
  const data: any[] = spec?.data?.values;

  if (!yField || !Array.isArray(data) || data.length === 0) return spec;

  const values = data.map((d) => Number(d[yField])).filter((v) => Number.isFinite(v));
  if (values.length === 0) return spec;

  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  if (maxVal <= 0) return spec; // skip for non-positive ranges

  // Round the padded max to a "nice" tick-friendly number.
  // Steps give fine-grained choices: 12, 15, 20, 25, 30, 40, 50, 60, 80, 100…
  const padded = maxVal * 1.2;
  const magnitude = Math.pow(10, Math.floor(Math.log10(padded)));
  const niceSteps = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  const niceMax = niceSteps
    .map((s) => s * magnitude)
    .find((v) => v >= padded) ?? Math.ceil(padded / magnitude) * magnitude;

  // Force Y-axis to start from 0 when all values are positive.
  // This prevents misleading charts where e.g. 128→130 looks like a huge jump.
  const zero = minVal >= 0 ? true : undefined;

  return {
    ...spec,
    encoding: {
      ...spec.encoding,
      y: {
        ...spec.encoding.y,
        scale: { ...spec.encoding.y.scale, zero, domainMax: niceMax },
      },
    },
  };
}

const VegaLiteChart = forwardRef<VegaLiteChartHandle, VegaLiteChartProps>(function VegaLiteChart(
  { spec, className, height = 300 },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<any>(null);
  const renderingRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Expose toCanvas() to parent via ref
  useImperativeHandle(ref, () => ({
    async toCanvas() {
      if (!viewRef.current) return null;
      try {
        return await viewRef.current.toCanvas();
      } catch (err) {
        console.error('Failed to export chart to canvas:', err);
        return null;
      }
    },
  }));

  // Stabilize spec reference — only change when content actually changes.
  // This prevents redundant vegaEmbed() calls when a parent re-renders
  // and creates a new spec object with identical content.
  const specJsonRef = useRef<string>('');
  const stableSpecRef = useRef<object>(spec);
  const specJson = JSON.stringify(spec);
  if (specJson !== specJsonRef.current) {
    specJsonRef.current = specJson;
    stableSpecRef.current = spec;
  }
  const stableSpec = stableSpecRef.current;

  useEffect(() => {
    let cancelled = false;

    async function render() {
      if (!containerRef.current) return;

      try {
        renderingRef.current = true;
        setLoading(true);
        setError(null);

        // Use cached import — first call downloads, subsequent calls reuse
        const vegaEmbed = (await getVegaEmbed()).default;

        if (cancelled) return;

        // Clean up previous view
        if (viewRef.current) {
          viewRef.current.finalize();
          viewRef.current = null;
        }

        // Get theme from current CSS variables
        const theme = getVegaTheme();

        // Dynamically detect if x-labels need rotation based on data
        const axisXOverrides = getAxisXOverrides(stableSpec);
        const config = {
          ...theme,
          axisX: { ...(theme as any).axisX, ...axisXOverrides },
        };

        // Pad Y-axis so bars/lines don't touch the top edge
        const paddedSpec = padYDomain(stableSpec);

        // Merge width: "container" into spec so chart fills parent
        const fullSpec = {
          ...paddedSpec,
          width: 'container',
          height,
          autosize: { type: 'fit', contains: 'padding' },
        };

        const result = await vegaEmbed(containerRef.current, fullSpec as any, {
          actions: false,
          config,
          renderer: 'canvas',
        });

        if (cancelled) {
          result.view.finalize();
          return;
        }

        viewRef.current = result.view;
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          console.error('Vega-Lite render error:', err);
          setError((err as Error).message || 'Failed to render chart');
          setLoading(false);
        }
      } finally {
        renderingRef.current = false;
      }
    }

    render();

    return () => {
      cancelled = true;
      if (viewRef.current) {
        viewRef.current.finalize();
        viewRef.current = null;
      }
    };
  }, [stableSpec, height]);

  // Re-render on theme change (dark/light toggle).
  // Debounced to coalesce rapid class mutations and guarded against
  // racing with the primary render effect.
  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const observer = new MutationObserver(() => {
      // Skip if primary render is already in-flight
      if (renderingRef.current) return;

      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        if (!viewRef.current || !containerRef.current) return;
        renderingRef.current = true;
        try {
          const vegaEmbed = (await getVegaEmbed()).default;
          const theme = getVegaTheme();
          const axisXOverrides = getAxisXOverrides(stableSpec);
          const config = {
            ...theme,
            axisX: { ...(theme as any).axisX, ...axisXOverrides },
          };
          const paddedSpec = padYDomain(stableSpec);
          const fullSpec = {
            ...paddedSpec,
            width: 'container',
            height,
            autosize: { type: 'fit', contains: 'padding' },
          };

          if (viewRef.current) {
            viewRef.current.finalize();
          }

          const result = await vegaEmbed(containerRef.current!, fullSpec as any, {
            actions: false,
            config,
            renderer: 'canvas',
          });
          viewRef.current = result.view;
        } catch (err) {
          console.error('Vega theme re-render error:', err);
        } finally {
          renderingRef.current = false;
        }
      }, 150);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      observer.disconnect();
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [stableSpec, height]);

  if (error) {
    return (
      <div className={cn('flex items-center gap-2 text-xs text-muted-foreground rounded-md border border-border/50 bg-muted/50 px-3 py-2', className)}>
        <svg className="h-4 w-4 shrink-0 text-destructive-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>Chart failed to render</span>
      </div>
    );
  }

  return (
    <div className={cn('relative w-full', className)}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/30 rounded-lg">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent text-muted-foreground" />
        </div>
      )}
      <div ref={containerRef} className="w-full [&>div]:!w-full [&_canvas]:!w-full" />
    </div>
  );
});

export default VegaLiteChart;
