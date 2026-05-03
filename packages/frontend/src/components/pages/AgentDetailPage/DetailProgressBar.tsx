'use client';

import { cn } from '@/lib/utils/styles';
import type { ForoDetailAgent } from '@/lib/constants/types';

export function DetailProgressBar({ agent }: { agent: ForoDetailAgent }) {
  let colorClass = 'bg-success';
  let pct = 0;

  if (agent.phase === 'running') {
    const [done, total] = agent.progress ?? [0, 0];
    pct = total > 0 ? (done / total) * 100 : 0;
    colorClass = 'bg-info';
  } else if (agent.phase === 'settled') {
    pct = 100;
    colorClass =
      agent.badgeStatus === 'failed'
        ? 'bg-error'
        : agent.badgeStatus === 'elite'
          ? 'bg-accent'
          : 'bg-success';
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-bg-tertiary">
      <div className={cn('h-full', colorClass)} style={{ width: `${pct}%` }} />
    </div>
  );
}
