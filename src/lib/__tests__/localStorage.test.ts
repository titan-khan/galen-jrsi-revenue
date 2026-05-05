/**
 * Unit tests for localStorage helper functions
 * Tests save/load operations, error handling, and key format
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveCollapseState, loadCollapseState } from '../localStorage';

describe('localStorage helpers', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Clear any mocked console.warn calls
    vi.clearAllMocks();
  });

  describe('saveCollapseState', () => {
    it('should save state to localStorage with correct key format', () => {
      saveCollapseState('Today', true);
      expect(localStorage.getItem('sidebar-collapse-Today')).toBe('true');
      
      saveCollapseState('Yesterday', false);
      expect(localStorage.getItem('sidebar-collapse-Yesterday')).toBe('false');
    });

    it('should handle localStorage errors gracefully', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      expect(() => saveCollapseState('Today', true)).not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to save collapse state:', expect.any(Error));

      setItemSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });
  });

  describe('loadCollapseState', () => {
    it('should load saved state and return defaultValue when not found', () => {
      localStorage.setItem('sidebar-collapse-Today', 'true');
      expect(loadCollapseState('Today', false)).toBe(true);
      
      expect(loadCollapseState('NotFound', true)).toBe(true);
    });

    it('should return defaultValue when localStorage throws error', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });

      expect(loadCollapseState('Today', true)).toBe(true);
      expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to load collapse state:', expect.any(Error));

      getItemSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });
  });

  describe('save and load integration', () => {
    it('should save, load, and overwrite state correctly', () => {
      saveCollapseState('Today', true);
      expect(loadCollapseState('Today', false)).toBe(true);
      
      saveCollapseState('Today', false);
      expect(loadCollapseState('Today', true)).toBe(false);
    });
  });
});
