import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { performanceValidator } from '@/lib/performanceValidator';
import type { PerformanceValidationResult, ValidationResult } from '@/lib/performanceValidator';

/**
 * PerformanceValidationPanel - Displays performance validation results
 * 
 * Shows validation status for:
 * - Cached page load performance (<100ms)
 * - Cache read latency (<10ms)
 * - Cache size limit (<50MB)
 * - LRU eviction functionality
 * 
 * Requirements: 2.1, 12.1, 12.2
 */
export function PerformanceValidationPanel() {
  const [results, setResults] = useState<PerformanceValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [lastValidated, setLastValidated] = useState<Date | null>(null);

  // Run validation on mount and every 5 seconds
  useEffect(() => {
    runValidation();
    const interval = setInterval(runValidation, 5000);
    return () => clearInterval(interval);
  }, []);

  const runValidation = async () => {
    setIsValidating(true);
    try {
      const validationResults = await performanceValidator.validateAll();
      setResults(validationResults);
      setLastValidated(new Date());
    } catch (error) {
      console.error('[PerformanceValidationPanel] Validation failed:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleManualValidation = async () => {
    await runValidation();
  };

  const getStatusIcon = (validation: ValidationResult) => {
    if (validation.message.startsWith('⚠')) {
      return <AlertCircle className="h-5 w-5 text-yellow-600" />;
    }
    return validation.met ? (
      <CheckCircle className="h-5 w-5 text-green-600" />
    ) : (
      <XCircle className="h-5 w-5 text-red-600" />
    );
  };

  const getStatusColor = (validation: ValidationResult): string => {
    if (validation.message.startsWith('⚠')) {
      return 'border-yellow-200 bg-yellow-50';
    }
    return validation.met
      ? 'border-green-200 bg-green-50'
      : 'border-red-200 bg-red-50';
  };

  const formatValue = (value: number, unit: string): string => {
    if (unit === 'ms') {
      return `${value.toFixed(2)}ms`;
    } else if (unit === 'bytes') {
      const mb = value / (1024 * 1024);
      return `${mb.toFixed(2)}MB`;
    } else {
      return `${value}`;
    }
  };

  if (!results) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Status Card */}
      <Card className={`border-2 ${results.allTargetsMet ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {results.allTargetsMet ? (
              <CheckCircle className="h-6 w-6 text-green-600" />
            ) : (
              <AlertCircle className="h-6 w-6 text-yellow-600" />
            )}
            Performance Validation Status
          </CardTitle>
          <CardDescription>
            {results.allTargetsMet
              ? 'All performance targets are being met'
              : 'Some performance targets need attention'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Overall Status</div>
              <div className={`text-3xl font-bold ${results.allTargetsMet ? 'text-green-600' : 'text-yellow-600'}`}>
                {results.allTargetsMet ? '✓ PASS' : '⚠ REVIEW'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">
                Last validated: {lastValidated?.toLocaleTimeString()}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualValidation}
                disabled={isValidating}
                className="mt-2"
              >
                {isValidating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Validate Now
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Validation Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cached Page Load */}
        <Card className={`border ${getStatusColor(results.validations.cachedPageLoad)}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {getStatusIcon(results.validations.cachedPageLoad)}
              Cached Page Load Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Current</span>
                <span className="font-bold">
                  {formatValue(results.validations.cachedPageLoad.actual, results.validations.cachedPageLoad.unit)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Target</span>
                <span className="font-medium">
                  &lt;{formatValue(results.validations.cachedPageLoad.target, results.validations.cachedPageLoad.unit)}
                </span>
              </div>
              <div className="pt-2 border-t text-xs">
                {results.validations.cachedPageLoad.message}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cache Read Latency */}
        <Card className={`border ${getStatusColor(results.validations.cacheReadLatency)}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {getStatusIcon(results.validations.cacheReadLatency)}
              Cache Read Latency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Current</span>
                <span className="font-bold">
                  {formatValue(results.validations.cacheReadLatency.actual, results.validations.cacheReadLatency.unit)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Target</span>
                <span className="font-medium">
                  &lt;{formatValue(results.validations.cacheReadLatency.target, results.validations.cacheReadLatency.unit)}
                </span>
              </div>
              <div className="pt-2 border-t text-xs">
                {results.validations.cacheReadLatency.message}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cache Size */}
        <Card className={`border ${getStatusColor(results.validations.cacheSize)}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {getStatusIcon(results.validations.cacheSize)}
              Cache Size Limit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Current</span>
                <span className="font-bold">
                  {formatValue(results.validations.cacheSize.actual, results.validations.cacheSize.unit)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Limit</span>
                <span className="font-medium">
                  &lt;{formatValue(results.validations.cacheSize.target, results.validations.cacheSize.unit)}
                </span>
              </div>
              <div className="pt-2 border-t text-xs">
                {results.validations.cacheSize.message}
              </div>
              
              {/* Progress bar */}
              <div className="pt-2">
                <div className="h-2 rounded-full bg-gray-200">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      results.validations.cacheSize.met ? 'bg-green-500' : 'bg-red-500'
                    }`}
                    style={{
                      width: `${Math.min((results.validations.cacheSize.actual / results.validations.cacheSize.target) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* LRU Eviction */}
        <Card className={`border ${getStatusColor(results.validations.lruEviction)}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {getStatusIcon(results.validations.lruEviction)}
              LRU Eviction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Evictions</span>
                <span className="font-bold">
                  {results.validations.lruEviction.actual}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className="font-medium">
                  {results.validations.lruEviction.met ? 'Working' : 'Issue Detected'}
                </span>
              </div>
              <div className="pt-2 border-t text-xs">
                {results.validations.lruEviction.message}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Requirements</CardTitle>
          <CardDescription>
            System performance targets and validation criteria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <div className="font-medium min-w-[200px]">Cached Page Load:</div>
              <div className="text-muted-foreground">
                Pages loaded from cache should display within 100ms to provide instant navigation experience.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="font-medium min-w-[200px]">Cache Read Latency:</div>
              <div className="text-muted-foreground">
                Cache reads should complete in under 10ms for memory cache, 20ms for IndexedDB.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="font-medium min-w-[200px]">Cache Size Limit:</div>
              <div className="text-muted-foreground">
                Total cache size must stay under 50MB to avoid excessive memory usage.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="font-medium min-w-[200px]">LRU Eviction:</div>
              <div className="text-muted-foreground">
                When cache exceeds 50MB, least recently used entries should be evicted automatically.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
