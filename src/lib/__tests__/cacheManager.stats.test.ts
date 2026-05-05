/**
 * Unit tests for CacheManager statistics API
 * Tests cache hits/misses tracking, latency tracking, eviction count, and hit rate calculation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CacheManager } from '../cacheManager';

describe('CacheManager Statistics API', () => {
  let cacheManager: CacheManager;

  beforeEach(async () => {
    cacheManager = new CacheManager();
    await cacheManager.init();
  });

  describe('cache hits and misses tracking', () => {
    it('should track cache miss when key does not exist', async () => {
      await cacheManager.get('nonexistent-key');
      
      const stats = await cacheManager.getStats();
      expect(stats.cacheMisses).toBe(1);
      expect(stats.cacheHits).toBe(0);
    });

    it('should track cache hit when key exists in memory', async () => {
      await cacheManager.set('test-key', 'test-value', 5000);
      await cacheManager.get('test-key');
      
      const stats = await cacheManager.getStats();
      expect(stats.cacheHits).toBe(1);
      expect(stats.cacheMisses).toBe(0);
    });

    it('should track multiple hits and misses correctly', async () => {
      await cacheManager.set('key1', 'value1', 5000);
      await cacheManager.set('key2', 'value2', 5000);
      
      await cacheManager.get('key1'); // hit
      await cacheManager.get('key2'); // hit
      await cacheManager.get('key3'); // miss
      await cacheManager.get('key1'); // hit
      await cacheManager.get('key4'); // miss
      
      const stats = await cacheManager.getStats();
      expect(stats.cacheHits).toBe(3);
      expect(stats.cacheMisses).toBe(2);
    });
  });

  describe('hit rate calculation', () => {
    it('should calculate hit rate as 0 when no requests made', async () => {
      const stats = await cacheManager.getStats();
      expect(stats.hitRate).toBe(0);
    });

    it('should calculate hit rate correctly with only hits', async () => {
      await cacheManager.set('key1', 'value1', 5000);
      await cacheManager.get('key1');
      await cacheManager.get('key1');
      
      const stats = await cacheManager.getStats();
      expect(stats.hitRate).toBe(1); // 2 hits / 2 total = 100%
    });

    it('should calculate hit rate correctly with only misses', async () => {
      await cacheManager.get('key1');
      await cacheManager.get('key2');
      
      const stats = await cacheManager.getStats();
      expect(stats.hitRate).toBe(0); // 0 hits / 2 total = 0%
    });

    it('should calculate hit rate correctly with mixed hits and misses', async () => {
      await cacheManager.set('key1', 'value1', 5000);
      
      await cacheManager.get('key1'); // hit
      await cacheManager.get('key2'); // miss
      await cacheManager.get('key1'); // hit
      await cacheManager.get('key3'); // miss
      
      const stats = await cacheManager.getStats();
      expect(stats.hitRate).toBe(0.5); // 2 hits / 4 total = 50%
    });
  });

  describe('read latency tracking', () => {
    it('should track read latency for cache operations', async () => {
      await cacheManager.set('key1', 'value1', 5000);
      await cacheManager.get('key1');
      
      const stats = await cacheManager.getStats();
      expect(stats.avgReadLatency).toBeGreaterThanOrEqual(0);
      expect(stats.avgReadLatency).toBeLessThan(100); // Should be fast
    });

    it('should calculate average read latency across multiple reads', async () => {
      await cacheManager.set('key1', 'value1', 5000);
      await cacheManager.set('key2', 'value2', 5000);
      
      await cacheManager.get('key1');
      await cacheManager.get('key2');
      await cacheManager.get('key1');
      
      const stats = await cacheManager.getStats();
      expect(stats.avgReadLatency).toBeGreaterThanOrEqual(0);
      expect(stats.avgReadLatency).toBeLessThan(100);
    });

    it('should return 0 average read latency when no reads performed', async () => {
      const stats = await cacheManager.getStats();
      expect(stats.avgReadLatency).toBe(0);
    });
  });

  describe('write latency tracking', () => {
    it('should track write latency for cache operations', async () => {
      await cacheManager.set('key1', 'value1', 5000);
      
      const stats = await cacheManager.getStats();
      expect(stats.avgWriteLatency).toBeGreaterThanOrEqual(0);
      expect(stats.avgWriteLatency).toBeLessThan(100); // Should be fast
    });

    it('should calculate average write latency across multiple writes', async () => {
      await cacheManager.set('key1', 'value1', 5000);
      await cacheManager.set('key2', 'value2', 5000);
      await cacheManager.set('key3', 'value3', 5000);
      
      const stats = await cacheManager.getStats();
      expect(stats.avgWriteLatency).toBeGreaterThanOrEqual(0);
      expect(stats.avgWriteLatency).toBeLessThan(100);
    });

    it('should return 0 average write latency when no writes performed', async () => {
      const stats = await cacheManager.getStats();
      expect(stats.avgWriteLatency).toBe(0);
    });
  });

  describe('eviction count tracking', () => {
    it('should start with 0 evictions', async () => {
      const stats = await cacheManager.getStats();
      expect(stats.evictions).toBe(0);
    });

    it('should track evictions when cache size exceeds limit', async () => {
      // Create large entries to trigger eviction
      const largeValue = 'x'.repeat(10 * 1024 * 1024); // 10MB string
      
      await cacheManager.set('key1', largeValue, 5000);
      await cacheManager.set('key2', largeValue, 5000);
      await cacheManager.set('key3', largeValue, 5000);
      await cacheManager.set('key4', largeValue, 5000);
      await cacheManager.set('key5', largeValue, 5000);
      await cacheManager.set('key6', largeValue, 5000); // Should trigger eviction
      
      const stats = await cacheManager.getStats();
      expect(stats.evictions).toBeGreaterThan(0);
    });
  });

  describe('cache size and entry count', () => {
    it('should track cache size correctly', async () => {
      const stats1 = await cacheManager.getStats();
      expect(stats1.size).toBe(0);
      
      await cacheManager.set('key1', 'value1', 5000);
      
      const stats2 = await cacheManager.getStats();
      expect(stats2.size).toBeGreaterThan(0);
    });

    it('should track entry count correctly', async () => {
      const stats1 = await cacheManager.getStats();
      expect(stats1.entryCount).toBe(0);
      
      await cacheManager.set('key1', 'value1', 5000);
      await cacheManager.set('key2', 'value2', 5000);
      
      const stats2 = await cacheManager.getStats();
      expect(stats2.entryCount).toBe(2);
    });
  });

  describe('comprehensive statistics', () => {
    it('should return all statistics fields', async () => {
      await cacheManager.set('key1', 'value1', 5000);
      await cacheManager.get('key1');
      await cacheManager.get('key2');
      
      const stats = await cacheManager.getStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('entryCount');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('evictions');
      expect(stats).toHaveProperty('cacheHits');
      expect(stats).toHaveProperty('cacheMisses');
      expect(stats).toHaveProperty('avgReadLatency');
      expect(stats).toHaveProperty('avgWriteLatency');
    });

    it('should maintain accurate statistics across multiple operations', async () => {
      // Perform various operations
      await cacheManager.set('key1', 'value1', 5000);
      await cacheManager.set('key2', 'value2', 5000);
      await cacheManager.set('key3', 'value3', 5000);
      
      await cacheManager.get('key1'); // hit
      await cacheManager.get('key2'); // hit
      await cacheManager.get('key4'); // miss
      await cacheManager.get('key1'); // hit
      
      const stats = await cacheManager.getStats();
      
      expect(stats.entryCount).toBe(3);
      expect(stats.cacheHits).toBe(3);
      expect(stats.cacheMisses).toBe(1);
      expect(stats.hitRate).toBe(0.75); // 3/4 = 75%
      expect(stats.avgReadLatency).toBeGreaterThanOrEqual(0);
      expect(stats.avgWriteLatency).toBeGreaterThanOrEqual(0);
    });
  });

  describe('error handling in statistics tracking', () => {
    it('should track miss when get operation fails', async () => {
      // Mock a corrupted entry scenario
      await cacheManager.set('key1', 'value1', 5000);
      
      // Force a read that will fail validation
      const result = await cacheManager.get('nonexistent');
      
      expect(result).toBeNull();
      const stats = await cacheManager.getStats();
      expect(stats.cacheMisses).toBeGreaterThan(0);
    });

    it('should track write latency even when serialization fails', async () => {
      // Create circular reference
      const circular: any = { a: 1 };
      circular.self = circular;
      
      await cacheManager.set('circular', circular, 5000);
      
      const stats = await cacheManager.getStats();
      // Write latency should still be tracked even though write failed
      expect(stats.avgWriteLatency).toBeGreaterThanOrEqual(0);
    });
  });
});
