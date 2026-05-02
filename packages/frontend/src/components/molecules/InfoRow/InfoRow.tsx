/**
 * InfoRow Component
 * 
 * Displays a label-value pair, commonly used in detail panels.
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils/styles';
import { Text } from '@/components/atoms';

export interface InfoRowProps {
  label: string;
  value: string | React.ReactNode;
  layout?: 'vertical' | 'horizontal';
  className?: string;
}

/**
 * InfoRow component for label-value pairs
 * 
 * @example
 * ```tsx
 * <InfoRow label="Proof hash" value="0x7c4d..." />
 * <InfoRow label="Network" value="mainnet" layout="horizontal" />
 * ```
 */
export function InfoRow({
  label,
  value,
  layout = 'vertical',
  className,
}: InfoRowProps) {
  const isVertical = layout === 'vertical';

  return (
    <div
      className={cn(
        'flex',
        isVertical ? 'flex-col gap-1.5' : 'flex-row justify-between items-baseline',
        className
      )}
    >
      <Text
        variant="label"
        color="muted"
        className="text-[10px]"
      >
        {label}
      </Text>
      {typeof value === 'string' ? (
        <Text
          variant="code"
          color="tertiary"
          className="text-[11px] break-all leading-relaxed"
        >
          {value}
        </Text>
      ) : (
        value
      )}
    </div>
  );
}

InfoRow.displayName = 'InfoRow';
