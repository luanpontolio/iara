/**
 * Icon Component
 * 
 * Wrapper for icon system (emoji/SVG support).
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils/styles';

type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface IconProps {
  icon: string | React.ReactNode;
  size?: IconSize;
  color?: string;
  className?: string;
  'aria-label'?: string;
}

const sizeStyles: Record<IconSize, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
};

/**
 * Icon component - wrapper for emoji or SVG icons
 * 
 * @example
 * ```tsx
 * <Icon icon="⊞" size="md" aria-label="Dashboard" />
 * <Icon icon={<CustomSvg />} size="lg" />
 * ```
 */
export function Icon({
  icon,
  size = 'md',
  color,
  className,
  'aria-label': ariaLabel,
}: IconProps) {
  const isString = typeof icon === 'string';

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center flex-shrink-0',
        'leading-none',
        sizeStyles[size],
        className
      )}
      style={color ? { color } : undefined}
      aria-label={ariaLabel}
      aria-hidden={!ariaLabel}
    >
      {isString ? icon : icon}
    </span>
  );
}

Icon.displayName = 'Icon';
