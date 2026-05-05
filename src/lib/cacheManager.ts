import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
  logCacheHit,
  logCacheMiss,
  logCacheWrite,
  logCacheEviction,
  logCacheInit,
  logCacheError,
} from './cacheLogger';

/**
 * Cache entry stored in IndexedDB and memory
 * 
 * @template T - The type of the cached value
 */
interface CacheEntry<T = unknown> {
  /** Unique cache key */
  key: string;
  /** Cached value */
  value: T;
  /** Creation timestamp in milliseconds */
  timestamp: number;
  /** Time-to-live in milliseconds */
  ttl: number;
  /** Number of times this entry has been accessed */
  accessCount: number;
  /** Last access timestamp in milliseconds */
  lastAccessed: number;
  /** Approximate size in bytes (UTF-16 encoding) */
  size: number;
}

/**
 * IndexedDB schema for cache storage
 */
interface CacheDB extends DBSchema {
  cache: {
    key: string;
    value: CacheEntry;
    indexes: { 'by-timestamp': number; 'by-lastAccessed': number };
  };
  metadata: {
    key: string;
    value: { totalSize: number; entryCount: number };
  };
}

/**
 * Cache statistics for monitoring and debugging
 */
export interface CacheStats {
  /** Current cache size in bytes */
  size: number;
  /** Number of entries in cache */
  entryCount: number;
  /** Cache hit rate as decimal (0-1) */
  hitRate: number;
  /** Number of evictions performed */
  evictions: number;
  /** Total cache hits */
  cacheHits: number;
  /** Total cache misses */
  cacheMisses: number;
  /** Average read latency in milliseconds */
  avgReadLatency: number;
  /** Average write latency in milliseconds */
  avgWriteLatency: number;
}

/**
 * CacheManager - Manages IndexedDB persistence with LRU eviction
 * 
 * Provides a two-tier caching system:
 * - Memory cache for fast access (hot entries)
 * - IndexedDB for persistence across sessions
 * 
 * Features:
 * - Automatic LRU eviction when cache exceeds 50MB
 * - Debounced writes to IndexedDB (1 second delay)
 * - Preloading of hot entries on initialization
 * - Fallback to memory-only mode if IndexedDB unavailable
 * - Comprehensive statistics tracking
 * 
 * **Requirements Validated:**
 * - Requirement 3.1: Store cache entries in IndexedDB
 * - Requirement 3.2: Load cache entries from IndexedDB on init
 * - Requirement 3.3: Persist entries to IndexedDB within 1 second
 * - Requirement 3.4: Mark stale entries but retain for SWR
 * - Requirement 3.5: Implement LRU eviction when exceeding 50MB
 * - Requirement 3.6: Fall back to memory-only on IndexedDB failure
 * - Requirement 12.1: Track total cache size
 * - Requirement 12.2: Evict LRU entries when exceeding 50MB
 * - Requirement 12.3: Update access timestamps on reads
 * - Requirement 12.4: Prioritize stale entries for eviction
 * - Requirement 12.5: Expose cache size through monitoring
 * 
 * @example
 * ```typescript
 * // Initialize cache manager
 * await cacheManager.init();
 * 
 * // Store data
 * await cacheManager.set('user:123', userData, 5 * 60 * 1000); // 5 min TTL
 * 
 * // Retrieve data
 * const user = await cacheManager.get<User>('user:123');
 * 
 * // Get statistics
 * const stats = await cacheManager.getStats();
 * console.log(`Hit rate: ${stats.hitRate * 100}%`);
 * 
 * // Clear cache
 * await cacheManager.clear();
 * ```
 */
export class CacheManager {
  private db: IDBPDatabase<CacheDB> | null = null;
  private memoryCache: Map<string, CacheEntry> = new Map();
  private readonly MAX_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly TARGET_SIZE = 45 * 1024 * 1024; // 45MB after eviction
  private currentSize = 0;
  private initPromise: Promise<void> | null = null;
  private fallbackMode = false;
  private persistQueue: Map<string, CacheEntry> = new Map();
  private persistTimer: NodeJS.Timeout | null = null;
  
  // Statistics tracking
  private cacheHits = 0;
  private cacheMisses = 0;
  private evictionCount = 0;
  private readLatencies: number[] = [];
  private writeLatencies: number[] = [];
  private readonly MAX_LATENCY_SAMPLES = 100; // Keep last 100 samples for average calculation

  /**
   * Initialize the cache manager
   * 
   * Sets up IndexedDB connection and preloads hot entries into memory.
   * Falls back to memory-only mode if IndexedDB is unavailable.
   * 
   * This method is idempotent - calling it multiple times will return
   * the same initialization promise.
   * 
   * **Requirements: 3.2, 3.6, 10.1**
   * 
   * @returns Promise that resolves when initialization is complete
   * 
   * @example
   * ```typescript
   * await cacheManager.init();
   * ```
   */
  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = this._init();
    return this.initPromise;
  }

  private async _init(): Promise<void> {
    try {
      this.db = await openDB<CacheDB>('app-cache', 1, {
        upgrade(db) {
          const store = db.createObjectStore('cache', { keyPath: 'key' });
          store.createIndex('by-timestamp', 'timestamp');
          store.createIndex('by-lastAccessed', 'lastAccessed');
          db.createObjectStore('metadata', { keyPath: 'key' });
        },
      });
      
      // Load metadata
      const metadata = await this.db.get('metadata', 'stats');
      if (metadata) {
        this.currentSize = metadata.totalSize;
      }
      
      // Preload hot entries into memory
      const preloadedCount = await this.preloadHotEntries();
      
      // Log successful initialization
      logCacheInit('indexeddb', preloadedCount);
    } catch (error) {
      console.error('[CacheManager] IndexedDB initialization failed:', error);
      logCacheError('init', null, error);
      // Fallback to memory-only mode
      this.fallbackMode = true;
      this.db = null;
      logCacheInit('memory-only');
    }
  }

  /**
   * Get a value from the cache
   * 
   * Checks memory cache first, then IndexedDB if not found in memory.
   * Updates access metadata (lastAccessed, accessCount) for LRU tracking.
   * Tracks cache hits/misses and read latency for monitoring.
   * 
   * **Requirements: 3.1, 3.2, 10.2, 12.3**
   * 
   * @template T - The type of the cached value
   * @param key - Cache key to retrieve
   * @returns Promise resolving to cached value, or null if not found
   * 
   * @example
   * ```typescript
   * const user = await cacheManager.get<User>('user:123');
   * if (user) {
   *   console.log('Cache hit:', user);
   * } else {
   *   console.log('Cache miss');
   * }
   * ```
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = performance.now();
    
    // Check memory cache first
    const memEntry = this.memoryCache.get(key);
    if (memEntry) {
      memEntry.lastAccessed = Date.now();
      memEntry.accessCount++;
      
      // Track cache hit and latency
      this.cacheHits++;
      const latency = performance.now() - startTime;
      this.trackReadLatency(latency);
      
      // Log cache hit
      logCacheHit(key, latency, 'memory');
      
      return memEntry.value as T;
    }

    // Check IndexedDB
    if (!this.db || this.fallbackMode) {
      this.cacheMisses++;
      const latency = performance.now() - startTime;
      this.trackReadLatency(latency);
      logCacheMiss(key, latency);
      return null;
    }

    try {
      const entry = await this.db.get('cache', key);
      if (!entry) {
        this.cacheMisses++;
        const latency = performance.now() - startTime;
        this.trackReadLatency(latency);
        logCacheMiss(key, latency);
        return null;
      }

      // Validate entry structure
      if (!this.isValidEntry(entry)) {
        console.error('[CacheManager] Corrupted entry detected:', key);
        await this.delete(key);
        this.cacheMisses++;
        const latency = performance.now() - startTime;
        this.trackReadLatency(latency);
        logCacheMiss(key, latency);
        return null;
      }

      // Update access metadata
      entry.lastAccessed = Date.now();
      entry.accessCount++;
      await this.db.put('cache', entry);

      // Add to memory cache
      this.memoryCache.set(key, entry);
      
      // Track cache hit and latency
      this.cacheHits++;
      const latency = performance.now() - startTime;
      this.trackReadLatency(latency);
      
      // Log cache hit from IndexedDB
      logCacheHit(key, latency, 'indexeddb');

      return entry.value as T;
    } catch (error) {
      console.error('[CacheManager] Failed to read from cache:', error);
      logCacheError('read', key, error);
      
      // If corruption is detected, clear and reinitialize
      if (this.isCorruptionError(error)) {
        await this.handleCorruption();
      }
      
      this.cacheMisses++;
      const latency = performance.now() - startTime;
      this.trackReadLatency(latency);
      logCacheMiss(key, latency);
      return null;
    }
  }

  /**
   * Store a value in the cache
   * 
   * Stores the value in memory cache and schedules a debounced write to IndexedDB.
   * Automatically evicts LRU entries if adding this entry would exceed the 50MB limit.
   * Tracks write latency and logs cache operations.
   * 
   * **Requirements: 3.1, 3.3, 3.5, 10.3, 11.3, 12.1, 12.2**
   * 
   * @template T - The type of the value to cache
   * @param key - Cache key
   * @param value - Value to cache (must be JSON-serializable)
   * @param ttl - Time-to-live in milliseconds
   * @returns Promise that resolves when value is stored in memory
   * 
   * @example
   * ```typescript
   * // Cache user data for 5 minutes
   * await cacheManager.set('user:123', userData, 5 * 60 * 1000);
   * 
   * // Cache with custom TTL
   * await cacheManager.set('temp:data', tempData, 30 * 1000); // 30 seconds
   * ```
   */
  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    const startTime = performance.now();
    
    try {
      // Test serialization
      const serialized = JSON.stringify(value);
      const size = this.estimateSize(value);

      const entry: CacheEntry<T> = {
        key,
        value,
        timestamp: Date.now(),
        ttl,
        accessCount: 1,
        lastAccessed: Date.now(),
        size,
      };

      // Check if we need to evict
      if (this.currentSize + size > this.MAX_SIZE) {
        await this.evictLRU(size);
      }

      // Update memory cache
      const existingEntry = this.memoryCache.get(key);
      if (existingEntry) {
        this.currentSize -= existingEntry.size;
      }
      
      this.memoryCache.set(key, entry);
      this.currentSize += size;

      // Persist to IndexedDB (debounced)
      this.debouncedPersist(entry);
      
      // Track write latency
      this.trackWriteLatency(performance.now() - startTime);
      
      // Log cache write
      logCacheWrite(key, size, ttl);
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('circular')) {
        console.error('[CacheManager] Cannot cache object with circular references:', key);
        logCacheError('write', key, error);
      } else if (error instanceof Error && error.message.includes('stringify')) {
        console.error('[CacheManager] Serialization failed:', key, error);
        logCacheError('write', key, error);
      } else {
        console.error('[CacheManager] Failed to cache entry:', key, error);
        logCacheError('write', key, error);
      }
      
      // Track write latency even on error
      this.trackWriteLatency(performance.now() - startTime);
      // Skip caching this entry, but don't throw
    }
  }

  /**
   * Invalidate cache entries matching a pattern
   * 
   * Removes all cache entries whose keys match the given pattern.
   * Supports wildcard patterns using '*' (e.g., 'specialists:*').
   * 
   * **Requirements: 7.4**
   * 
   * @param pattern - Pattern to match cache keys (supports '*' wildcard)
   * @returns Promise that resolves when all matching entries are deleted
   * 
   * @example
   * ```typescript
   * // Invalidate all specialist caches
   * await cacheManager.invalidate('specialists:*');
   * 
   * // Invalidate specific cache
   * await cacheManager.invalidate('user:123');
   * ```
   */
  async invalidate(pattern: string): Promise<void> {
    const keys = await this.getMatchingKeys(pattern);
    await Promise.all(keys.map(key => this.delete(key)));
  }

  /**
   * Clear all cache entries
   * 
   * Removes all entries from memory cache and IndexedDB.
   * Resets cache size and statistics.
   * 
   * **Requirements: 10.4**
   * 
   * @returns Promise that resolves when cache is cleared
   * 
   * @example
   * ```typescript
   * // Clear all cached data
   * await cacheManager.clear();
   * ```
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    this.currentSize = 0;
    
    if (this.db && !this.fallbackMode) {
      await this.db.clear('cache');
      await this.db.put('metadata', { key: 'stats', totalSize: 0, entryCount: 0 });
    }
  }

  /**
   * Get cache statistics
   * 
   * Returns comprehensive statistics about cache performance including:
   * - Cache size and entry count
   * - Hit rate and hit/miss counts
   * - Eviction count
   * - Average read/write latency
   * 
   * **Requirements: 12.5, 15.1, 15.2, 15.4**
   * 
   * @returns Promise resolving to cache statistics
   * 
   * @example
   * ```typescript
   * const stats = await cacheManager.getStats();
   * console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
   * console.log(`Cache size: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);
   * console.log(`Avg read latency: ${stats.avgReadLatency.toFixed(2)}ms`);
   * ```
   */
  async getStats(): Promise<CacheStats> {
    const totalRequests = this.cacheHits + this.cacheMisses;
    const hitRate = totalRequests > 0 ? this.cacheHits / totalRequests : 0;
    
    const avgReadLatency = this.readLatencies.length > 0
      ? this.readLatencies.reduce((sum, lat) => sum + lat, 0) / this.readLatencies.length
      : 0;
    
    const avgWriteLatency = this.writeLatencies.length > 0
      ? this.writeLatencies.reduce((sum, lat) => sum + lat, 0) / this.writeLatencies.length
      : 0;
    
    return {
      size: this.currentSize,
      entryCount: this.memoryCache.size,
      hitRate,
      evictions: this.evictionCount,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      avgReadLatency,
      avgWriteLatency,
    };
  }

  private async evictLRU(requiredSpace: number): Promise<void> {
    const entries = Array.from(this.memoryCache.values());
    
    // Sort by last accessed (LRU)
    entries.sort((a, b) => a.lastAccessed - b.lastAccessed);
    
    // Prioritize stale entries
    const staleEntries = entries.filter(e => this.isStale(e));
    const freshEntries = entries.filter(e => !this.isStale(e));
    
    const toEvict = [...staleEntries, ...freshEntries];
    let freedSpace = 0;
    
    for (const entry of toEvict) {
      if (this.currentSize - freedSpace <= this.TARGET_SIZE) break;
      
      // Determine eviction reason
      const reason = this.isStale(entry) ? 'ttl-expired' : 'lru';
      
      // Log eviction
      logCacheEviction(entry.key, reason, entry.size);
      
      await this.delete(entry.key);
      freedSpace += entry.size;
      this.evictionCount++;
    }
  }

  private isStale(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private estimateSize(value: unknown): number {
    try {
      return JSON.stringify(value).length * 2; // UTF-16 encoding
    } catch {
      return 1024; // Default estimate
    }
  }

  private async delete(key: string): Promise<void> {
    const entry = this.memoryCache.get(key);
    if (entry) {
      this.currentSize -= entry.size;
      this.memoryCache.delete(key);
    }
    
    if (this.db && !this.fallbackMode) {
      await this.db.delete('cache', key);
    }
  }

  private async getMatchingKeys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace('*', '.*'));
    return Array.from(this.memoryCache.keys()).filter(key => regex.test(key));
  }

  private debouncedPersist(entry: CacheEntry): void {
    this.persistQueue.set(entry.key, entry);
    
    if (this.persistTimer) clearTimeout(this.persistTimer);
    
    this.persistTimer = setTimeout(() => {
      this.flushPersistQueue();
    }, 1000);
  }

  private async flushPersistQueue(): Promise<void> {
    if (!this.db || this.fallbackMode || this.persistQueue.size === 0) return;

    const entries = Array.from(this.persistQueue.values());
    this.persistQueue.clear();

    try {
      const tx = this.db.transaction('cache', 'readwrite');
      await Promise.all(entries.map(entry => tx.store.put(entry)));
      await tx.done;

      // Update metadata
      await this.db.put('metadata', {
        key: 'stats',
        totalSize: this.currentSize,
        entryCount: this.memoryCache.size,
      });
    } catch (error) {
      console.error('[CacheManager] Failed to persist cache:', error);
    }
  }

  private async preloadHotEntries(): Promise<number> {
    if (!this.db || this.fallbackMode) return 0;

    try {
      const tx = this.db.transaction('cache', 'readonly');
      const index = tx.store.index('by-lastAccessed');
      const entries = await index.getAll();
      
      // Load top 100 most recently accessed entries
      const preloaded = entries
        .sort((a, b) => b.lastAccessed - a.lastAccessed)
        .slice(0, 100);
      
      preloaded.forEach(entry => {
        this.memoryCache.set(entry.key, entry);
        this.currentSize += entry.size;
      });
      
      return preloaded.length;
    } catch (error) {
      console.error('[CacheManager] Failed to preload entries:', error);
      return 0;
    }
  }

  private isValidEntry(entry: unknown): entry is CacheEntry {
    if (!entry || typeof entry !== 'object') return false;
    const e = entry as Record<string, unknown>;
    return (
      typeof e.key === 'string' &&
      typeof e.timestamp === 'number' &&
      typeof e.ttl === 'number' &&
      typeof e.accessCount === 'number' &&
      typeof e.lastAccessed === 'number' &&
      typeof e.size === 'number' &&
      'value' in e
    );
  }

  private async handleCorruption(): Promise<void> {
    console.warn('[CacheManager] Cache corruption detected, clearing cache');
    await this.clear();
    await this.init();
  }

  private isCorruptionError(error: unknown): boolean {
    return error instanceof Error && 
      (error.name === 'DataError' || error.message.includes('corrupt'));
  }
  
  private trackReadLatency(latency: number): void {
    this.readLatencies.push(latency);
    // Keep only the last MAX_LATENCY_SAMPLES samples
    if (this.readLatencies.length > this.MAX_LATENCY_SAMPLES) {
      this.readLatencies.shift();
    }
  }
  
  private trackWriteLatency(latency: number): void {
    this.writeLatencies.push(latency);
    // Keep only the last MAX_LATENCY_SAMPLES samples
    if (this.writeLatencies.length > this.MAX_LATENCY_SAMPLES) {
      this.writeLatencies.shift();
    }
  }
}

export const cacheManager = new CacheManager();
