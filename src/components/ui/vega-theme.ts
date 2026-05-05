// =============================================================================
// VEGA THEME — Maps CSS custom properties to Vega Config
// Reads --chart-1..5, --background, --foreground, --border, --muted-foreground
// at render time so it adapts to light/dark mode automatically.
// =============================================================================

import type { Config } from 'vega-embed';

/**
 * Parse an HSL CSS variable value like "209 58% 39%" into "hsl(209, 58%, 39%)".
 */
function hslVar(value: string): string {
  const parts = value.trim().split(/\s+/);
  if (parts.length >= 3) {
    return `hsl(${parts[0]}, ${parts[1]}, ${parts[2]})`;
  }
  return value;
}

/**
 * Read a CSS custom property from the document root.
 */
function getCSSVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Build a Vega Config object from current CSS custom properties.
 * Call this at render time (not at module load) so it picks up theme changes.
 */
export function getVegaTheme(): Config {
  const bg = hslVar(getCSSVar('--background'));
  const fg = hslVar(getCSSVar('--foreground'));
  const border = hslVar(getCSSVar('--border'));
  const muted = hslVar(getCSSVar('--muted-foreground'));

  const chartColors = [
    hslVar(getCSSVar('--chart-1')),
    hslVar(getCSSVar('--chart-2')),
    hslVar(getCSSVar('--chart-3')),
    hslVar(getCSSVar('--chart-4')),
    hslVar(getCSSVar('--chart-5')),
  ];

  return {
    background: bg,
    font: 'Inter, system-ui, sans-serif',

    // Even padding on all sides. Vega's autosize "fit" + contains "padding"
    // reserves axis/label space from within this box automatically.
    padding: 16,

    title: {
      color: fg,
      fontSize: 14,
      fontWeight: 600,
      anchor: 'start' as const,
      offset: 12,
    },

    axis: {
      labelColor: muted,
      titleColor: fg,
      gridColor: border,
      domainColor: border,
      tickColor: border,
      labelFont: 'Inter, system-ui, sans-serif',
      titleFont: 'Inter, system-ui, sans-serif',
      labelFontSize: 11,
      titleFontSize: 12,
      titleFontWeight: 500,
      labelPadding: 4,
      titlePadding: 8,
    },

    // X-axis defaults — rotation is applied dynamically by VegaLiteChart
    // based on actual label count and length. These are conservative defaults.
    axisX: {
      labelLimit: 120,
    },

    // Y-axis: keep horizontal, allow generous label width
    axisY: {
      labelAngle: 0,
      labelLimit: 80,
    },

    legend: {
      labelColor: muted,
      titleColor: fg,
      labelFont: 'Inter, system-ui, sans-serif',
      titleFont: 'Inter, system-ui, sans-serif',
      labelFontSize: 11,
      titleFontSize: 12,
      symbolSize: 100,
      orient: 'bottom' as const,
      direction: 'horizontal' as const,
    },

    range: {
      category: chartColors,
      ordinal: chartColors,
    },

    mark: {
      tooltip: true,
    },

    bar: {
      fill: chartColors[0],
      cornerRadiusEnd: 3,
    },

    line: {
      stroke: chartColors[0],
      strokeWidth: 2,
    },

    point: {
      fill: chartColors[0],
      size: 40,
    },

    arc: {
      stroke: bg,
      strokeWidth: 1,
    },

    view: {
      stroke: 'transparent',
    },
  };
}
