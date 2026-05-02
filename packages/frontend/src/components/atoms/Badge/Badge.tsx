/**
 * Badge Component
 * 
 * Status and label badges with variants and sizes.
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils/styles';
import { STATUS_CONFIG } from '@/lib/constants';
import type { AgentStatus } from '@/lib/constants/types';

type BadgeSize = 'xs' | 'sm' | 'md';
type BadgeVariant = AgentStatus | 'default' | 'success' | 'warning' | 'error' | 'info';

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  showDot?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const sizeStyles: Record<BadgeSize, { fontSize: string; padding: string; dotSize: string }> = {
  xs: {
    fontSize: 'text-[9px]',
    padding: 'px-1.5 py-0.5',
    dotSize: 'w-1 h-1',
  },
  sm: {
    fontSize: 'text-[10px]',
    padding: 'px-2 py-0.5',
    dotSize: 'w-[5px] h-[5px]',
  },
  md: {
    fontSize: 'text-[11px]',
    padding: 'px-2 py-1',
    dotSize: 'w-[5px] h-[5px]',
  },
};

function getVariantStyles(variant: BadgeVariant): { bg: string; color: string; label?: string } {
  // Use status config if it's an agent status
  if (variant in STATUS_CONFIG) {
    return STATUS_CONFIG[variant as AgentStatus];
  }

  // Generic variants
  const genericVariants = {
    default: { bg: 'rgba(114,114,126,0.12)', color: '#72727E' },
    success: { bg: '#0A1F10', color: '#4ADE80' },
    warning: { bg: '#1F1400', color: '#E8A935' },
    error: { bg: '#210A0A', color: '#F26B6B' },
    info: { bg: '#080F1F', color: '#5C9EE8' },
  } as const;

  return genericVariants[variant as keyof typeof genericVariants] ?? genericVariants.default;
}

/**
 * Badge component for status indicators and labels
 * 
 * @example
 * ```tsx
 * <Badge variant="verified" size="sm" />
 * <Badge variant="success" size="md" showDot>Active</Badge>
 * <Badge variant="error">Error</Badge>
 * ```
 */
export function Badge({
  variant = 'default',
  size = 'sm',
  showDot = true,
  className,
  children,
}: BadgeProps) {
  const { bg, color, label } = getVariantStyles(variant);
  const { fontSize, padding, dotSize } = sizeStyles[size];
  
  const content = children || label || variant;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1',
        'font-mono font-medium',
        'rounded-full',
        'tracking-wide whitespace-nowrap',
        'w-fit self-start',
        fontSize,
        padding,
        className
      )}
      style={{ background: bg, color }}
    >
      {showDot && (
        <span
          className={cn('rounded-full flex-shrink-0 block', dotSize)}
          style={{ background: color }}
        />
      )}
      {content}
    </span>
  );
}

Badge.displayName = 'Badge';

// Legacy StatusBadge compatibility export
export function StatusBadge({ 
  status, 
  size = 'sm' 
}: { 
  status: AgentStatus; 
  size?: BadgeSize;
}) {
  return <Badge variant={status} size={size} />;
}

StatusBadge.displayName = 'StatusBadge';
