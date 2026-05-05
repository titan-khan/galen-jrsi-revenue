/**
 * Property-based tests for useCollapsibleGroups hook
 * Tests collapse state persistence across reloads
 * **Validates: Requirements 1.4, 1.5**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import * as fc from 'fast-check';
import { useCollapsibleGroups } from '../useCollapsibleGroups';
import { saveCollapseState, loadCollapseState } from '../../lib/localStorage';

describe('useCollapsibleGroups - Property Tests', () => {
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
  it('Property 1: collapse state persists across hook re-initialization', () => {
    fc.assert(
      fc.property(
        // Generate random group names (1-5 groups from the available options)
        fc.array(
          fc.constantFrom('Today', 'Yesterday', 'Previous 7 Days', 'Previous 30 Days', 'Older'),
          { minLength: 1, maxLength: 5 }
        ).map(arr => [...new Set(arr)]), // Remove duplicates
        // Generate random collapse states for each group
        fc.array(fc.boolean(), { minLength: 1, maxLength: 5 }),
        (groupNames, collapseStates) => {
          // Ensure we have a collapse state for each group
          const states = collapseStates.slice(0, groupNames.length);
          while (states.length < groupNames.length) {
            states.push(false);
          }

          // First render: initialize hook with no defaults (all collapsed by default)
          const { result: result1, unmount: unmount1 } = renderHook(() =>
            useCollapsibleGroups(groupNames, [])
          );

          // Set each group to its desired state
          act(() => {
            groupNames.forEach((groupName, index) => {
              const currentState = result1.current.isGroupExpanded(groupName);
              const desiredState = states[index];
              
              // Toggle if current state doesn't match desired state
              if (currentState !== desiredState) {
                result1.current.toggleGroup(groupName);
              }
            });
          });

          // Verify states are set correctly
          const statesAfterToggle = groupNames.map(groupName =>
            result1.current.isGroupExpanded(groupName)
          );
          expect(statesAfterToggle).toEqual(states);

          // Unmount to simulate component unmount
          unmount1();

          // Second render: re-initialize hook (simulates reload)
          const { result: result2 } = renderHook(() =>
            useCollapsibleGroups(groupNames, [])
          );

          // Verify states are restored from localStorage
          const statesAfterReload = groupNames.map(groupName =>
            result2.current.isGroupExpanded(groupName)
          );

          // Property assertion: states should match after reload
          expect(statesAfterReload).toEqual(states);
        }
      ),
      { numRuns: 20 } // Run 20 iterations as specified in task
    );
  });

  /**
   * Property 1 (variant): Direct localStorage persistence test
   * **Validates: Requirements 1.4, 1.5**
   * 
   * Tests that saveCollapseState and loadCollapseState work correctly
   * with random group names and states
   */
  it('Property 1 (variant): localStorage save and load persistence', () => {
    fc.assert(
      fc.property(
        // Generate random group name
        fc.constantFrom('Today', 'Yesterday', 'Previous 7 Days', 'Previous 30 Days', 'Older'),
        // Generate random state
        fc.boolean(),
        (groupName, state) => {
          // Save the state
          saveCollapseState(groupName, state);
          
          // Load it back
          const loadedState = loadCollapseState(groupName, !state); // Use opposite as default
          
          // Property assertion: loaded state should match saved state
          expect(loadedState).toBe(state);
        }
      ),
      { numRuns: 20 }
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

          // Save all states directly to localStorage
          groupNames.forEach((groupName) => {
            const state = desiredStates[groupName as keyof typeof desiredStates];
            saveCollapseState(groupName, state);
          });

          // Load all states back
          const loadedStates: Record<string, boolean> = {};
          groupNames.forEach((groupName) => {
            loadedStates[groupName] = loadCollapseState(groupName, false);
          });

          // Property assertion: all states should persist independently
          groupNames.forEach((groupName) => {
            expect(loadedStates[groupName]).toBe(
              desiredStates[groupName as keyof typeof desiredStates]
            );
          });
        }
      ),
      { numRuns: 20 }
    );
  });
});
