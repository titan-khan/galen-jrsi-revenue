// Chart data validation utilities
// Validates consistency between evidence text and chart data

export interface ValidationResult {
  isValid: boolean;
  inconsistencies: DataInconsistency[];
  warnings: string[];
}

export interface DataInconsistency {
  field: string;
  evidenceValue: number;
  chartValue: number;
  ratio: number;
}

/**
 * Extract numerical values from evidence text
 * Handles formats like "121.5M IDR", "177.1M IDR", etc.
 */
export function extractValuesFromEvidence(evidenceText: string): Record<string, number> {
  const values: Record<string, number> = {};
  
  // Match patterns like "Route-Name: 121.5M IDR" or "Route-Name - 121.5M IDR"
  const patterns = [
    /([A-Za-z-]+(?:-[A-Za-z]+)*)[:\-]\s*([0-9,]+\.?[0-9]*)\s*M\s+IDR/gi,
    /•\s*([A-Za-z-]+(?:-[A-Za-z]+)*)[:\-]\s*([0-9,]+\.?[0-9]*)\s*M\s+IDR/gi
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(evidenceText)) !== null) {
      const routeName = match[1].trim();
      const valueStr = match[2].replace(/,/g, ''); // Remove commas
      const valueInMillions = parseFloat(valueStr);
      
      if (!isNaN(valueInMillions)) {
        values[routeName] = valueInMillions * 1_000_000; // Convert M to actual number
      }
    }
  });
  
  return values;
}

/**
 * Validate chart data against evidence text
 * Returns validation result with inconsistencies and warnings
 */
export function validateChartData(
  chartData: any[], 
  evidenceText: string,
  valueField: string = 'revenue',
  labelField: string = 'route',
  tolerancePercent: number = 10
): ValidationResult {
  const evidenceValues = extractValuesFromEvidence(evidenceText);
  const inconsistencies: DataInconsistency[] = [];
  
  chartData.forEach(item => {
    const chartValue = Number(item[valueField]);
    const label = item[labelField];
    const evidenceValue = evidenceValues[label];
    
    if (evidenceValue && chartValue) {
      // Calculate percentage difference
      const diff = Math.abs(evidenceValue - chartValue);
      const ratio = (diff / evidenceValue) * 100;
      
      // Check if difference exceeds tolerance
      if (ratio > tolerancePercent) {
        inconsistencies.push({
          field: label,
          evidenceValue,
          chartValue,
          ratio
        });
      }
    }
  });
  
  const warnings = inconsistencies.map(inc => {
    const evidenceFormatted = formatIDR(inc.evidenceValue);
    const chartFormatted = formatIDR(inc.chartValue);
    return `${inc.field}: Evidence shows ${evidenceFormatted} but chart shows ${chartFormatted} (${inc.ratio.toFixed(1)}% difference)`;
  });
  
  return {
    isValid: inconsistencies.length === 0,
    inconsistencies,
    warnings
  };
}

/**
 * Format IDR values for display
 */
function formatIDR(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M IDR`;
  } else if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K IDR`;
  } else {
    return `${value} IDR`;
  }
}

/**
 * Check if chart data has extreme outliers that would make visualization unreadable
 */
export function hasExtremeOutliers(
  chartData: any[], 
  valueField: string = 'revenue',
  extremeRatio: number = 1000
): boolean {
  const values = chartData
    .map(item => Number(item[valueField]))
    .filter(v => Number.isFinite(v) && v > 0);
    
  if (values.length < 2) return false;
  
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const ratio = maxVal / minVal;
  
  return ratio > extremeRatio;
}