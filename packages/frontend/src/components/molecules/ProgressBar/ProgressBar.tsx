/**
 * ProgressBar Component
 * 
 * Visual progress indicator with customizable appearance.
 */

'use client';

import React from 'react';
import { cn, transition } from '@/lib/utils/styles';

export interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  color?: string;
  height?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
  label?: string;
  className?: string;
}

const heightStyles = {
  xs: 'h-0.5',
  sm: 'h-1',
  md: 'h-2',
};

/**
 * ProgressBar component for showing completion status
 * 
 * @example
 * ```tsx
 * <ProgressBar value={70} />
 * <ProgressBar value={10} max={14} color="#5C9EE8" showLabel label="10/14 tests" />
 * ```
 */
export function ProgressBar({
  value,
  max = 100,
  color,
  height = 'sm',
  showLabel = false,
  label,
  className,
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const displayLabel = label || `${Math.round(percentage)}%`;

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-mono text-text-quaternary">
            {displayLabel}
          </span>
        </div>
      )}
      <div
        className={cn(
          'w-full rounded-full bg-bg-elevated overflow-hidden',
          heightStyles[height]
        )}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={cn('h-full rounded-full', transition(['width'], '300ms'))}
          style={{
            width: `${percentage}%`,
            backgroundColor: color || 'currentColor',
          }}
        />
      </div>
    </div>
  );
}

ProgressBar.displayName = 'ProgressBar';
