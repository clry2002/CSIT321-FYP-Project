// services/localStorageService.ts

/**
 * Safe localStorage wrapper for Next.js
 * Handles cases where window is not available (SSR)
 */
export const localStorageService = {
    getItem: (key: string): string | null => {
      if (typeof window === 'undefined') {
        return null;
      }
      return localStorage.getItem(key);
    },
    
    setItem: (key: string, value: string): void => {
      if (typeof window === 'undefined') {
        return;
      }
      localStorage.setItem(key, value);
    },
    
    removeItem: (key: string): void => {
      if (typeof window === 'undefined') {
        return;
      }
      localStorage.removeItem(key);
    }
  };