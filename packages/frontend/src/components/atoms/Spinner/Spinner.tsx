/**
 * Spinner Component
 * 
 * Loading indicator with multiple sizes.
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils/styles';

type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface SpinnerProps {
  size?: SpinnerSize;
  color?: string;
  className?: string;
  'aria-label'?: string;
}

const sizeStyles: Record<SpinnerSize, string> = {
  xs: 'w-3 h-3 border',
  sm: 'w-4 h-4 border',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-2',
  xl: 'w-12 h-12 border-2',
};

/**
 * Spinner component for loading states
 * 
 * @example
 * ```tsx
 * <Spinner size="md" />
 * <Spinner size="lg" color="#B8FF4F" />
 * ```
 */
export function Spinner({
  size = 'md',
  color,
  className,
  'aria-label': ariaLabel = 'Loading',
}: SpinnerProps) {
  return (
    <div
      className={cn(
        'inline-block rounded-full animate-spin',
        'border-border-subtle border-t-current',
        sizeStyles[size],
        className
      )}
      style={color ? { borderTopColor: color } : undefined}
      role="status"
      aria-label={ariaLabel}
    >
      <span className="sr-only">{ariaLabel}</span>
    </div>
  );
}

Spinner.displayName = 'Spinner';
