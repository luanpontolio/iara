/**
 * usePanelState Hook
 * 
 * Manages panel open/close state with exclusive behavior.
 */

'use client';

import { useState, useCallback } from 'react';

export interface UsePanelStateOptions {
  defaultOpen?: string | null;
}

export interface UsePanelStateReturn {
  openPanel: string | null;
  isOpen: (panelId: string) => boolean;
  toggle: (panelId: string) => void;
  open: (panelId: string) => void;
  close: () => void;
}

/**
 * Hook for managing panel state (only one panel open at a time)
 * 
 * @example
 * ```tsx
 * const { openPanel, isOpen, toggle } = usePanelState();
 * 
 * <button onClick={() => toggle('queue')}>
 *   Queue
 * </button>
 * {isOpen('queue') && <QueuePanel />}
 * ```
 */
export function usePanelState({
  defaultOpen = null,
}: UsePanelStateOptions = {}): UsePanelStateReturn {
  const [openPanel, setOpenPanel] = useState<string | null>(defaultOpen);

  const isOpen = useCallback(
    (panelId: string) => openPanel === panelId,
    [openPanel]
  );

  const toggle = useCallback((panelId: string) => {
    setOpenPanel(prev => (prev === panelId ? null : panelId));
  }, []);

  const open = useCallback((panelId: string) => {
    setOpenPanel(panelId);
  }, []);

  const close = useCallback(() => {
    setOpenPanel(null);
  }, []);

  return {
    openPanel,
    isOpen,
    toggle,
    open,
    close,
  };
}
