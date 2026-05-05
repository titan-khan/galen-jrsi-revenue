/**
 * Property-based tests for localStorage helper functions
 * Tests collapse state persistence with random inputs
 * **Validates: Requirements 1.4, 1.5**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { saveCollapseState, loadCollapseState } from '../localStorage';

describe('localStorage helpers - Property Tests', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  /**
   * Property 1: Collapse State Persistence
   * **Validates: Requirements 1.4, 1.5**
   * 
   * For any History_Group, when user toggles its Collapse_State and reloads 
   * the sidebar, the Collapse_State should be restored to the same value 
   * from LocalStorage.
   */
  it('Property 1: collapse state persists after save and load', () => {
    fc.assert(
      fc.property(
        // Generate random group name from valid options
        fc.constantFrom('Today', 'Yesterday', 'Previous 7 Days', 'Previous 30 Days', 'Older'),
        // Generate random collapse state
        fc.boolean(),
        (groupName, isExpanded) => {
          // Save the collapse state
          saveCollapseState(groupName, isExpanded);
          
          // Load it back (using opposite as default to ensure we're reading from storage)
          const loadedState = loadCollapseState(groupName, !isExpanded);
          
          // Property assertion: loaded state should match saved state
          expect(loadedState).toBe(isExpanded);
        }
      ),
      { numRuns: 20 } // Run 20 iterations as specified in task
    );
  });

  /**
   * Property 1 (variant): Multiple groups maintain independent state
   * **Validates: Requirements 1.4, 1.5**
   * 
   * Tests that multiple groups can have different states that persist independently
   */
  it('Property 1 (variant): multiple groups maintain independent persistence', () => {
    fc.assert(
      fc.property(
        // Generate random states for all 5 groups
        fc.record({
          Today: fc.boolean(),
          Yesterday: fc.boolean(),
          'Previous 7 Days': fc.boolean(),
          'Previous 30 Days': fc.boolean(),
          Older: fc.boolean(),
        }),
        (desiredStates) => {
          const groupNames = Object.keys(desiredStates);

          // Save all states to localStorage
          groupNames.forEach((groupName) => {
            const state = desiredStates[groupName as keyof typeof desiredStates];
            saveCollapseState(groupName, state);
          });

          // Load all states back and verify they match
          groupNames.forEach((groupName) => {
            const loadedState = loadCollapseState(groupName, false);
            const expectedState = desiredStates[groupName as keyof typeof desiredStates];
            
            // Property assertion: each group's state should persist independently
            expect(loadedState).toBe(expectedState);
          });
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 1 (variant): State persistence with multiple save/load cycles
   * **Validates: Requirements 1.4, 1.5**
   * 
   * Tests that state persists correctly through multiple save/load cycles
   */
  it('Property 1 (variant): state persists through multiple save/load cycles', () => {
    fc.assert(
      fc.property(
        // Generate random group name
        fc.constantFrom('Today', 'Yesterday', 'Previous 7 Days', 'Previous 30 Days', 'Older'),
        // Generate a sequence of random states to save
        fc.array(fc.boolean(), { minLength: 1, maxLength: 10 }),
        (groupName, stateSequence) => {
          // Apply each state in sequence
          stateSequence.forEach((state) => {
            saveCollapseState(groupName, state);
            
            // Immediately verify it can be loaded
            const loadedState = loadCollapseState(groupName, !state);
            expect(loadedState).toBe(state);
          });

          // Final verification: the last state should still be persisted
          const finalState = stateSequence[stateSequence.length - 1];
          const loadedFinalState = loadCollapseState(groupName, !finalState);
          
          // Property assertion: final state should match last saved state
          expect(loadedFinalState).toBe(finalState);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 1 (variant): State overrides default value when present
   * **Validates: Requirements 1.4, 1.5**
   * 
   * Tests that saved state always overrides the default value parameter
   */
  it('Property 1 (variant): saved state overrides default value', () => {
    fc.assert(
      fc.property(
        // Generate random group name
        fc.constantFrom('Today', 'Yesterday', 'Previous 7 Days', 'Previous 30 Days', 'Older'),
        // Generate random saved state
        fc.boolean(),
        // Generate random default value (should be ignored)
        fc.boolean(),
        (groupName, savedState, defaultValue) => {
          // Save a state
          saveCollapseState(groupName, savedState);
          
          // Load with a default value (which should be ignored)
          const loadedState = loadCollapseState(groupName, defaultValue);
          
          // Property assertion: loaded state should match saved state, not default
          expect(loadedState).toBe(savedState);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 1 (variant): Default value used when no saved state exists
   * **Validates: Requirements 1.4, 1.5, 5.2**
   * 
   * Tests that default value is returned when no state has been saved
   */
  it('Property 1 (variant): default value used when no saved state', () => {
    fc.assert(
      fc.property(
        // Generate random group name
        fc.constantFrom('Today', 'Yesterday', 'Previous 7 Days', 'Previous 30 Days', 'Older'),
        // Generate random default value
        fc.boolean(),
        (groupName, defaultValue) => {
          // Don't save anything - localStorage should be empty for this group
          
          // Load with a default value
          const loadedState = loadCollapseState(groupName, defaultValue);
          
          // Property assertion: should return default value when no saved state
          expect(loadedState).toBe(defaultValue);
        }
      ),
      { numRuns: 20 }
    );
  });
});
