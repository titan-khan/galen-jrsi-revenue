/**
 * RequestDeduplicator - Prevents duplicate concurrent requests for the same resource
 * 
 * This class ensures that when multiple components request the same resource concurrently,
 * only one network request is executed. All pending promises are resolved with the same
 * result (or rejected with the same error).
 */

import { logRequestDeduplication } from './cacheLogger';

type PendingRequest<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  subscribers: number;
};

export class RequestDeduplicator {
  private pending = new Map<string, PendingRequest<any>>();

  /**
   * Deduplicate a request by cache key
   * 
   * @param key - Unique cache key identifying the request
   * @param fn - Function that performs the actual network request
   * @returns Promise that resolves with the request result
   */
  async dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // Check if request is already in flight
    const existing = this.pending.get(key);
    if (existing) {
      existing.subscribers++;
      logRequestDeduplication(key, existing.subscribers, 'joined');
      return existing.promise;
    }

    // Create new request
    let resolve: (value: T) => void;
    let reject: (error: Error) => void;
    
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    const request: PendingRequest<T> = {
      promise,
      resolve: resolve!,
      reject: reject!,
      subscribers: 1,
    };

    this.pending.set(key, request);
    logRequestDeduplication(key, 1, 'new');

    try {
      const result = await fn();
      request.resolve(result);
      logRequestDeduplication(key, request.subscribers, 'completed');
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      request.reject(err);
      throw err;
    } finally {
      this.pending.delete(key);
    }
  }

  /**
   * Clear a pending request from the map
   * 
   * @param key - Cache key of the request to clear
   */
  clearPending(key: string): void {
    this.pending.delete(key);
  }

  /**
   * Get the number of pending requests
   * 
   * @returns Number of requests currently in flight
   */
  getPendingCount(): number {
    return this.pending.size;
  }

  /**
   * Get the number of subscribers for a specific request
   * 
   * @param key - Cache key of the request
   * @returns Number of subscribers waiting for this request, or 0 if not pending
   */
  getSubscriberCount(key: string): number {
    return this.pending.get(key)?.subscribers ?? 0;
  }
}

export const requestDeduplicator = new RequestDeduplicator();
