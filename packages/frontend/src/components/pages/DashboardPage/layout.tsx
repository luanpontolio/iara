'use client';

import { Text } from '@/components/atoms';
import { cn } from '@/lib/utils/styles';

export function DashboardTopBar({ page, children }: { page: string; children?: React.ReactNode }) {
  return (
    <div className="flex h-12 flex-shrink-0 items-center justify-between border-b border-border-subtle px-5">
      <Text variant="caption" color="tertiary" className="text-[13px] font-medium tracking-wide">
        {page}
      </Text>
      {children ? <div className="flex items-center gap-2">{children}</div> : null}
    </div>
  );
}

export function DashboardMain({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex flex-1 flex-col overflow-auto', className)}>{children}</div>;
}
