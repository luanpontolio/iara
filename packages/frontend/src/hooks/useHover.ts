/**
 * useHover Hook
 * 
 * Manages hover state for interactive elements.
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseHoverOptions {
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
  delay?: number;
}

export interface UseHoverReturn {
  isHovered: boolean;
  hoverProps: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
  };
}

/**
 * Hook for managing hover state
 * 
 * @example
 * ```tsx
 * const { isHovered, hoverProps } = useHover();
 * 
 * <div {...hoverProps} className={isHovered ? 'hovered' : ''}>
 *   Hover me
 * </div>
 * ```
 */
export function useHover(options: UseHoverOptions = {}): UseHoverReturn {
  const { onHoverStart, onHoverEnd, delay = 0 } = options;
  const [isHovered, setIsHovered] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleMouseEnter = useCallback(() => {
    if (delay > 0) {
      timeoutRef.current = setTimeout(() => {
        setIsHovered(true);
        onHoverStart?.();
      }, delay);
    } else {
      setIsHovered(true);
      onHoverStart?.();
    }
  }, [delay, onHoverStart]);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsHovered(false);
    onHoverEnd?.();
  }, [onHoverEnd]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    isHovered,
    hoverProps: {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
    },
  };
}
