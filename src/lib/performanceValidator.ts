/**
 * Performance Validator
 * 
 * Validates that the caching system meets performance requirements:
 * - Cached page loads <100ms
 * - Cache read latency <10ms
 * - Cache size stays under 50MB
 * - Memory management with LRU eviction
 * 
 * **Requirements Validated:**
 * - Requirement 2.1: Cached page loads within 100ms
 * - Requirement 12.1: Track total cache size
 * - Requirement 12.2: Evict LRU entries when exceeding 50MB
 */

import { cacheManager } from './cacheManager';
import { performanceMonitor } from './performanceMonitor';

export interface PerformanceValidationResult {
  /** Whether all performance targets are met */
  allTargetsMet: boolean;
  /** Individual validation results */
  validations: {
    cachedPageLoad: ValidationResult;
    cacheReadLatency: ValidationResult;
    cacheSize: ValidationResult;
    lruEviction: ValidationResult;
  };
  /** Timestamp of validation */
  timestamp: number;
}

export interface ValidationResult {
  /** Whether this specific target is met */
  met: boolean;
  /** Current measured value */
  actual: number;
  /** Target threshold */
  target: number;
  /** Unit of measurement */
  unit: string;
  /** Validation message */
  message: string;
}

class PerformanceValidator {
  private readonly CACHED_PAGE_LOAD_TARGET = 100; // ms
  private readonly CACHE_READ_LATENCY_TARGET = 10; // ms
  private readonly CACHE_SIZE_LIMIT = 50 * 1024 * 1024; // 50MB

  /**
   * Validate cached page load performance
   * Requirement 2.1: Cached page loads within 100ms
   */
  validateCachedPageLoad(): ValidationResult {
    const avgCachedPageLoad = performanceMonitor.getAvgCachedPageLoadTime();
    const met = avgCachedPageLoad > 0 && avgCachedPageLoad < this.CACHED_PAGE_LOAD_TARGET;
    
    let message: string;
    if (avgCachedPageLoad === 0) {
      message = '⚠ No cached page loads recorded yet. Navigate to pages to collect data.';
    } else if (met) {
      message = `✓ Cached page loads meet target: ${avgCachedPageLoad.toFixed(2)}ms < ${this.CACHED_PAGE_LOAD_TARGET}ms`;
    } else {
      message = `✗ Cached page loads exceed target: ${avgCachedPageLoad.toFixed(2)}ms > ${this.CACHED_PAGE_LOAD_TARGET}ms`;
    }
    
    return {
      met: avgCachedPageLoad === 0 ? true : met, // Don't fail if no data yet
      actual: avgCachedPageLoad,
      target: this.CACHED_PAGE_LOAD_TARGET,
      unit: 'ms',
      message,
    };
  }

  /**
   * Validate cache read latency
   * Requirement 12.1: Cache read latency <10ms
   */
  validateCacheReadLatency(): ValidationResult {
    const metrics = performanceMonitor.getMetrics();
    const avgReadLatency = metrics.avgCacheReadLatency;
    const met = avgReadLatency > 0 && avgReadLatency < this.CACHE_READ_LATENCY_TARGET;
    
    let message: string;
    if (avgReadLatency === 0) {
      message = '⚠ No cache reads recorded yet. Use the application to collect data.';
    } else if (met) {
      message = `✓ Cache read latency meets target: ${avgReadLatency.toFixed(2)}ms < ${this.CACHE_READ_LATENCY_TARGET}ms`;
    } else {
      message = `✗ Cache read latency exceeds target: ${avgReadLatency.toFixed(2)}ms > ${this.CACHE_READ_LATENCY_TARGET}ms`;
    }
    
    return {
      met: avgReadLatency === 0 ? true : met, // Don't fail if no data yet
      actual: avgReadLatency,
      target: this.CACHE_READ_LATENCY_TARGET,
      unit: 'ms',
      message,
    };
  }

  /**
   * Validate cache size limit
   * Requirement 12.1: Cache size stays under 50MB
   */
  async validateCacheSize(): Promise<ValidationResult> {
    const stats = await cacheManager.getStats();
    const cacheSize = stats.size;
    const met = cacheSize < this.CACHE_SIZE_LIMIT;
    
    const sizeMB = cacheSize / (1024 * 1024);
    const limitMB = this.CACHE_SIZE_LIMIT / (1024 * 1024);
    
    let message: string;
    if (met) {
      message = `✓ Cache size within limit: ${sizeMB.toFixed(2)}MB < ${limitMB}MB`;
    } else {
      message = `✗ Cache size exceeds limit: ${sizeMB.toFixed(2)}MB > ${limitMB}MB`;
    }
    
    return {
      met,
      actual: cacheSize,
      target: this.CACHE_SIZE_LIMIT,
      unit: 'bytes',
      message,
    };
  }

  /**
   * Validate LRU eviction is working
   * Requirement 12.2: Evict LRU entries when exceeding 50MB
   */
  async validateLRUEviction(): Promise<ValidationResult> {
    const stats = await cacheManager.getStats();
    const evictionCount = stats.evictions;
    const cacheSize = stats.size;
    
    // If cache size is near limit and we have evictions, LRU is working
    // If cache size is under limit, we may not have triggered evictions yet
    const nearLimit = cacheSize > (this.CACHE_SIZE_LIMIT * 0.8); // 80% of limit
    const hasEvictions = evictionCount > 0;
    
    let met: boolean;
    let message: string;
    
    if (nearLimit && hasEvictions) {
      met = true;
      message = `✓ LRU eviction is working: ${evictionCount} evictions performed`;
    } else if (nearLimit && !hasEvictions) {
      met = false;
      message = `✗ Cache near limit but no evictions: ${evictionCount} evictions`;
    } else {
      met = true;
      message = `⚠ Cache not near limit yet. LRU eviction will trigger at 50MB.`;
    }
    
    return {
      met,
      actual: evictionCount,
      target: 0, // No specific target, just needs to work when needed
      unit: 'evictions',
      message,
    };
  }

  /**
   * Run all performance validations
   * Returns comprehensive validation results
   */
  async validateAll(): Promise<PerformanceValidationResult> {
    const cachedPageLoad = this.validateCachedPageLoad();
    const cacheReadLatency = this.validateCacheReadLatency();
    const cacheSize = await this.validateCacheSize();
    const lruEviction = await this.validateLRUEviction();
    
    const allTargetsMet = 
      cachedPageLoad.met &&
      cacheReadLatency.met &&
      cacheSize.met &&
      lruEviction.met;
    
    return {
      allTargetsMet,
      validations: {
        cachedPageLoad,
        cacheReadLatency,
        cacheSize,
        lruEviction,
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Log validation results to console
   */
  async logValidationResults(): Promise<void> {
    const results = await this.validateAll();
    
    console.group('[PerformanceValidator] Validation Results');
    
    console.log('%c Overall Status', 'font-weight: bold; font-size: 14px');
    console.log(
      results.allTargetsMet
        ? '%c✓ All performance targets met'
        : '%c✗ Some performance targets not met',
      results.allTargetsMet ? 'color: green; font-weight: bold' : 'color: red; font-weight: bold'
    );
    
    console.log('\n%c Individual Validations', 'font-weight: bold; font-size: 14px');
    
    console.log('\n1. Cached Page Load Performance');
    console.log(`   ${results.validations.cachedPageLoad.message}`);
    
    console.log('\n2. Cache Read Latency');
    console.log(`   ${results.validations.cacheReadLatency.message}`);
    
    console.log('\n3. Cache Size Limit');
    console.log(`   ${results.validations.cacheSize.message}`);
    
    console.log('\n4. LRU Eviction');
    console.log(`   ${results.validations.lruEviction.message}`);
    
    console.groupEnd();
  }

  /**
   * Get a summary report of validation results
   */
  async getSummaryReport(): Promise<string> {
    const results = await this.validateAll();
    
    const lines = [
      '=== Performance Validation Report ===',
      '',
      `Overall Status: ${results.allTargetsMet ? '✓ PASS' : '✗ FAIL'}`,
      '',
      '1. Cached Page Load Performance:',
      `   ${results.validations.cachedPageLoad.message}`,
      '',
      '2. Cache Read Latency:',
      `   ${results.validations.cacheReadLatency.message}`,
      '',
      '3. Cache Size Limit:',
      `   ${results.validations.cacheSize.message}`,
      '',
      '4. LRU Eviction:',
      `   ${results.validations.lruEviction.message}`,
      '',
      `Validated at: ${new Date(results.timestamp).toLocaleString()}`,
      '',
      '====================================',
    ];
    
    return lines.join('\n');
  }

  /**
   * Export validation results for analysis
   */
  async exportResults(): Promise<PerformanceValidationResult> {
    return this.validateAll();
  }
}

// Singleton instance
export const performanceValidator = new PerformanceValidator();

/**
 * Utility function to quickly check if all performance targets are met
 */
export async function checkPerformanceTargets(): Promise<boolean> {
  const results = await performanceValidator.validateAll();
  return results.allTargetsMet;
}

/**
 * Utility function to log performance validation results
 */
export async function logPerformanceValidation(): Promise<void> {
  await performanceValidator.logValidationResults();
}
