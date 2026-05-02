/**
 * Tooltip Component
 * 
 * Contextual information on hover.
 */

'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils/styles';
import { Text } from '@/components/atoms';

export interface TooltipProps {
  content: string | React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

const positionStyles = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
  left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
  right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
};

/**
 * Tooltip component for contextual information
 * 
 * @example
 * ```tsx
 * <Tooltip content="This is a tooltip">
 *   <Icon icon="i" />
 * </Tooltip>
 * ```
 */
export function Tooltip({
  content,
  children,
  position = 'top',
  className,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={cn(
            'absolute z-tooltip',
            'bg-bg-tertiary border border-border-default rounded',
            'px-2.5 py-1.5',
            'shadow-2xl',
            'whitespace-normal',
            'pointer-events-none',
            positionStyles[position],
            className
          )}
          style={{ minWidth: '150px', maxWidth: '200px' }}
          role="tooltip"
        >
          {typeof content === 'string' ? (
            <Text variant="caption" color="secondary" className="leading-relaxed">
              {content}
            </Text>
          ) : (
            content
          )}
        </div>
      )}
    </div>
  );
}

Tooltip.displayName = 'Tooltip';
