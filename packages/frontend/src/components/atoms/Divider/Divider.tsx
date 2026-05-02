/**
 * Divider Component
 * 
 * Visual separator with orientation and spacing options.
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils/styles';

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  spacing?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

const spacingStyles = {
  horizontal: {
    none: '',
    sm: 'my-2',
    md: 'my-4',
    lg: 'my-6',
  },
  vertical: {
    none: '',
    sm: 'mx-2',
    md: 'mx-4',
    lg: 'mx-6',
  },
};

/**
 * Divider component for visual separation
 * 
 * @example
 * ```tsx
 * <Divider />
 * <Divider orientation="vertical" spacing="md" />
 * ```
 */
export function Divider({
  orientation = 'horizontal',
  spacing = 'none',
  className,
}: DividerProps) {
  const isHorizontal = orientation === 'horizontal';

  return (
    <div
      className={cn(
        'bg-border-subtle',
        isHorizontal ? 'h-px w-full' : 'w-px h-full',
        spacingStyles[orientation][spacing],
        className
      )}
      role="separator"
      aria-orientation={orientation}
    />
  );
}

Divider.displayName = 'Divider';
