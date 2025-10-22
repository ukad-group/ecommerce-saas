/**
 * Local Storage Utilities
 *
 * Safe wrappers around localStorage with error handling and type safety
 */

/**
 * Retrieves an item from localStorage and parses it
 *
 * @param key - The storage key
 * @returns The parsed value, or null if not found or on error
 *
 * @example
 * const user = getItem<User>('currentUser');
 * if (user) {
 *   console.log(user.name);
 * }
 */
export function getItem<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      return null;
    }
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`Error reading from localStorage (key: ${key}):`, error);
    return null;
  }
}

/**
 * Stores an item in localStorage after stringifying it
 *
 * @param key - The storage key
 * @param value - The value to store
 *
 * @example
 * setItem('currentUser', { id: '123', name: 'John' });
 */
export function setItem<T>(key: string, value: T): void {
  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(key, serialized);
  } catch (error) {
    console.error(`Error writing to localStorage (key: ${key}):`, error);
    // Could be quota exceeded or serialization error
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      console.error('localStorage quota exceeded. Consider clearing old data.');
    }
  }
}

/**
 * Removes an item from localStorage
 *
 * @param key - The storage key to remove
 *
 * @example
 * removeItem('currentUser');
 */
export function removeItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing from localStorage (key: ${key}):`, error);
  }
}

/**
 * Clears all items from localStorage
 * Use with caution!
 *
 * @example
 * clearAll();
 */
export function clearAll(): void {
  try {
    localStorage.clear();
  } catch (error) {
    console.error('Error clearing localStorage:', error);
  }
}

/**
 * Checks if a key exists in localStorage
 *
 * @param key - The storage key to check
 * @returns true if key exists, false otherwise
 *
 * @example
 * if (hasItem('currentUser')) {
 *   // User is logged in
 * }
 */
export function hasItem(key: string): boolean {
  try {
    return localStorage.getItem(key) !== null;
  } catch (error) {
    console.error(`Error checking localStorage (key: ${key}):`, error);
    return false;
  }
}
