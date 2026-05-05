/**
 * LocalStorage helper functions for sidebar collapse state management
 * Provides safe localStorage operations with error handling
 */

const STORAGE_PREFIX = 'sidebar-collapse-';

/**
 * Save collapse state for a history group to localStorage
 * @param groupName - Name of the history group (e.g., "Today", "Yesterday")
 * @param isExpanded - Whether the group is expanded (true) or collapsed (false)
 */
export function saveCollapseState(groupName: string, isExpanded: boolean): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${groupName}`, String(isExpanded));
  } catch (error) {
    console.warn('Failed to save collapse state:', error);
  }
}

/**
 * Load collapse state for a history group from localStorage
 * @param groupName - Name of the history group (e.g., "Today", "Yesterday")
 * @param defaultValue - Default value to return if no saved state exists
 * @returns The saved collapse state, or defaultValue if not found or on error
 */
export function loadCollapseState(groupName: string, defaultValue: boolean): boolean {
  try {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}${groupName}`);
    return saved !== null ? saved === 'true' : defaultValue;
  } catch (error) {
    console.warn('Failed to load collapse state:', error);
    return defaultValue;
  }
}
