'use client';

import { useState } from 'react';
import { Badge, Text } from '@/components/atoms';
import { cn } from '@/lib/utils/styles';
import { DashboardMain, DashboardTopBar } from './layout';
import { DASHBOARD_PROOFS } from './data';

export function ProofsView() {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  return (
    <DashboardMain>
      <DashboardTopBar page="Proofs" />
      <div className="p-5">
        <div className="overflow-hidden rounded-md border border-border-subtle bg-bg-secondary">
          <div className="grid grid-cols-[1.5fr_1fr_1fr_80px_100px] gap-3 border-b border-border-subtle px-4 py-2">
            {['Proof ID', 'Agent', 'Block', 'Network', 'Anchored'].map(h => (
              <Text key={h} variant="label" color="muted" className="text-[10px]">
                {h}
              </Text>
            ))}
          </div>
          {DASHBOARD_PROOFS.map((r, i) => (
            <div
              key={r.id}
              onMouseEnter={() => setHoveredRow(i)}
              onMouseLeave={() => setHoveredRow(null)}
              className={cn(
                'grid grid-cols-[1.5fr_1fr_1fr_80px_100px] items-center gap-3 px-4 py-2.5 transition-colors',
                i < DASHBOARD_PROOFS.length - 1 && 'border-b border-border-subtle',
                hoveredRow === i ? 'bg-bg-tertiary' : 'bg-transparent'
              )}
            >
              <Text variant="code" color="tertiary" className="text-xs">
                {r.id}
              </Text>
              <Text variant="caption" color="primary" className="text-[13px]">
                {r.agent}
              </Text>
              <Text variant="code" color="tertiary" className="text-xs">
                {r.block}
              </Text>
              <Text variant="code" color="quaternary" className="text-[11px]">
                {r.network}
              </Text>
              <div className="flex justify-end">
                <Badge variant="verified" size="xs" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardMain>
  );
}
