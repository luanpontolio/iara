'use client';

import { Text } from '@/components/atoms';

export function ColumnCount({ count, label }: { count: number; label: string }) {
  return (
    <Text variant="caption" color="quaternary" className="text-center text-sm tracking-wide">
      <span className="font-medium text-text-secondary">{count}</span> {label}
    </Text>
  );
}

export function SubHeader({ count, label }: { count: number; label: string }) {
  return (
    <div className="pb-4 pt-5 text-center">
      <Text variant="caption" color="muted" className="text-sm tracking-wide">
        <span className="text-text-quaternary">{count}</span> {label}
      </Text>
    </div>
  );
}
