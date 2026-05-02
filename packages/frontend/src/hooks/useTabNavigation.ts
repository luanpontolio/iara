/**
 * useTabNavigation Hook
 * 
 * Manages tab navigation state.
 */

'use client';

import { useState, useCallback } from 'react';

export interface UseTabNavigationOptions<T extends string> {
  defaultTab: T;
  onChange?: (tab: T) => void;
}

export interface UseTabNavigationReturn<T extends string> {
  activeTab: T;
  setActiveTab: (tab: T) => void;
  isActive: (tab: T) => boolean;
}

/**
 * Hook for managing tab navigation
 * 
 * @example
 * ```tsx
 * const { activeTab, setActiveTab, isActive } = useTabNavigation({
 *   defaultTab: 'tests'
 * });
 * 
 * <button 
 *   onClick={() => setActiveTab('proof')}
 *   className={isActive('proof') ? 'active' : ''}
 * >
 *   Proof
 * </button>
 * ```
 */
export function useTabNavigation<T extends string>({
  defaultTab,
  onChange,
}: UseTabNavigationOptions<T>): UseTabNavigationReturn<T> {
  const [activeTab, setActiveTabState] = useState<T>(defaultTab);

  const setActiveTab = useCallback(
    (tab: T) => {
      setActiveTabState(tab);
      onChange?.(tab);
    },
    [onChange]
  );

  const isActive = useCallback(
    (tab: T) => activeTab === tab,
    [activeTab]
  );

  return {
    activeTab,
    setActiveTab,
    isActive,
  };
}
