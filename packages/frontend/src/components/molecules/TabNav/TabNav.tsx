/**
 * TabNav Component
 * 
 * Tabbed navigation with composable parts.
 */

'use client';

import React, { createContext, useContext, useState } from 'react';
import { cn, transition } from '@/lib/utils/styles';

interface TabContextValue {
  activeTab: string;
  setActiveTab: (id: string) => void;
}

const TabContext = createContext<TabContextValue | undefined>(undefined);

function useTabContext() {
  const context = useContext(TabContext);
  if (!context) {
    throw new Error('Tab components must be used within TabNav');
  }
  return context;
}

export interface TabNavProps {
  defaultTab: string;
  children: React.ReactNode;
  className?: string;
  onChange?: (tabId: string) => void;
}

/**
 * TabNav container - manages tab state
 */
export function TabNav({ defaultTab, children, className, onChange }: TabNavProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const handleTabChange = (id: string) => {
    setActiveTab(id);
    onChange?.(id);
  };

  return (
    <TabContext.Provider value={{ activeTab, setActiveTab: handleTabChange }}>
      <div className={className}>{children}</div>
    </TabContext.Provider>
  );
}

export interface TabListProps {
  children: React.ReactNode;
  className?: string;
  centered?: boolean;
}

/**
 * TabList - container for Tab buttons
 */
export function TabList({ children, className, centered = false }: TabListProps) {
  return (
    <div
      className={cn(
        'flex border-b border-border-subtle',
        centered && 'justify-center',
        className
      )}
      role="tablist"
    >
      {children}
    </div>
  );
}

export interface TabProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Tab - individual tab button
 */
export function Tab({ id, children, className }: TabProps) {
  const { activeTab, setActiveTab } = useTabContext();
  const isActive = activeTab === id;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-controls={`panel-${id}`}
      onClick={() => setActiveTab(id)}
      className={cn(
        'px-0 py-2.5 mr-5',
        'font-sans text-xs font-medium',
        'border-b border-transparent',
        'cursor-pointer',
        isActive ? 'text-text-primary border-text-primary' : 'text-text-muted',
        transition(['color', 'border-color']),
        className
      )}
    >
      {children}
    </button>
  );
}

export interface TabPanelProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * TabPanel - content panel for a tab
 */
export function TabPanel({ id, children, className }: TabPanelProps) {
  const { activeTab } = useTabContext();
  const isActive = activeTab === id;

  if (!isActive) return null;

  return (
    <div
      role="tabpanel"
      id={`panel-${id}`}
      aria-labelledby={`tab-${id}`}
      className={className}
    >
      {children}
    </div>
  );
}

/**
 * Complete TabNav system with sub-components
 * 
 * @example
 * ```tsx
 * <TabNav defaultTab="tests">
 *   <TabList>
 *     <Tab id="tests">Tests</Tab>
 *     <Tab id="proof">Proof</Tab>
 *     <Tab id="rewards">Rewards</Tab>
 *   </TabList>
 *   <TabPanel id="tests">Tests content</TabPanel>
 *   <TabPanel id="proof">Proof content</TabPanel>
 *   <TabPanel id="rewards">Rewards content</TabPanel>
 * </TabNav>
 * ```
 */
TabNav.List = TabList;
TabNav.Tab = Tab;
TabNav.Panel = TabPanel;
