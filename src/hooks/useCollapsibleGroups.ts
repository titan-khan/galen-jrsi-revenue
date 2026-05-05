import { useState, useEffect, useCallback } from 'react';
import { loadCollapseState, saveCollapseState } from '../lib/localStorage';

/**
 * State object mapping group names to their expanded state
 * true = expanded, false = collapsed
 */
interface CollapsibleGroupsState {
  [groupName: string]: boolean;
}

/**
 * Return type for the useCollapsibleGroups hook
 */
interface UseCollapsibleGroupsReturn {
  groupStates: CollapsibleGroupsState;
  toggleGroup: (groupName: string) => void;
  isGroupExpanded: (groupName: string) => boolean;
}

/**
 * Custom hook for managing collapsible group states with localStorage persistence
 * 
 * @param groupNames - Array of group names to manage
 * @param defaultExpanded - Array of group names that should be expanded by default
 * @returns Object containing group states and functions to manage them
 * 
 * @example
 * const { groupStates, toggleGroup, isGroupExpanded } = useCollapsibleGroups(
 *   ['Today', 'Yesterday', 'Previous 7 Days'],
 *   ['Today', 'Yesterday']
 * );
 */
export function useCollapsibleGroups(
  groupNames: string[],
  defaultExpanded: string[] = ['Today', 'Yesterday']
): UseCollapsibleGroupsReturn {
  // Initialize state by loading from localStorage or using defaults
  const [groupStates, setGroupStates] = useState<CollapsibleGroupsState>(() => {
    const initialState: CollapsibleGroupsState = {};
    
    groupNames.forEach((groupName) => {
      const isDefaultExpanded = defaultExpanded.includes(groupName);
      initialState[groupName] = loadCollapseState(groupName, isDefaultExpanded);
    });
    
    return initialState;
  });

  // Update state when groupNames change
  useEffect(() => {
    setGroupStates((prevState) => {
      const newState: CollapsibleGroupsState = {};
      
      groupNames.forEach((groupName) => {
        // Preserve existing state if available, otherwise use default
        if (groupName in prevState) {
          newState[groupName] = prevState[groupName];
        } else {
          const isDefaultExpanded = defaultExpanded.includes(groupName);
          newState[groupName] = loadCollapseState(groupName, isDefaultExpanded);
        }
      });
      
      return newState;
    });
  }, [groupNames, defaultExpanded]);

  /**
   * Toggle the expanded state of a group
   * Automatically saves the new state to localStorage
   */
  const toggleGroup = useCallback((groupName: string) => {
    setGroupStates((prevState) => {
      const newExpandedState = !prevState[groupName];
      
      // Save to localStorage
      saveCollapseState(groupName, newExpandedState);
      
      return {
        ...prevState,
        [groupName]: newExpandedState,
      };
    });
  }, []);

  /**
   * Check if a group is currently expanded
   * @param groupName - Name of the group to check
   * @returns true if expanded, false if collapsed
   */
  const isGroupExpanded = useCallback(
    (groupName: string): boolean => {
      return groupStates[groupName] ?? false;
    },
    [groupStates]
  );

  return {
    groupStates,
    toggleGroup,
    isGroupExpanded,
  };
}
