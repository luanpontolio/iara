/**
 * StatCard Component
 * 
 * Displays a statistic with label and optional subtitle.
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils/styles';
import { Text } from '@/components/atoms';

export interface StatCardProps {
  value: string | number;
  label: string;
  subtitle?: string;
  valueColor?: string;
  className?: string;
}

/**
 * StatCard component for displaying metrics
 * 
 * @example
 * ```tsx
 * <StatCard value="0.97" label="avg score" subtitle="verified only" />
 * <StatCard value={42} label="proofs anchored" subtitle="on mainnet" />
 * ```
 */
export function StatCard({
  value,
  label,
  subtitle,
  valueColor = 'primary',
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'bg-bg-secondary border border-border-subtle rounded-md',
        'px-4 py-3.5',
        'flex flex-col gap-1.5',
        className
      )}
    >
      <Text
        variant="h2"
        color={valueColor as any}
        className="leading-none tracking-tighter"
      >
        {value}
      </Text>
      <div className="flex flex-col gap-px">
        <Text
          variant="label"
          color="quaternary"
          className="text-[10px]"
        >
          {label}
        </Text>
        {subtitle && (
          <Text
            variant="code"
            color="muted"
            className="text-[10px]"
          >
            {subtitle}
          </Text>
        )}
      </div>
    </div>
  );
}

StatCard.displayName = 'StatCard';
