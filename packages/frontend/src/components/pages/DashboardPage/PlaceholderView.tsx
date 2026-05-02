'use client';

import { Text } from '@/components/atoms';
import { DashboardMain, DashboardTopBar } from './layout';

export function PlaceholderView({ title }: { title: string }) {
  return (
    <DashboardMain>
      <DashboardTopBar page={title} />
      <div className="flex flex-1 items-center justify-center">
        <Text variant="code" color="muted" className="text-xs">
          coming soon
        </Text>
      </div>
    </DashboardMain>
  );
}
