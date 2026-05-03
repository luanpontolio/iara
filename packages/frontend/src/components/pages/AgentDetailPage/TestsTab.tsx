'use client';

import { Badge } from '@/components/atoms';
import { Text } from '@/components/atoms';
import type { ForoDetailAgent } from '@/lib/constants/types';
import { cn } from '@/lib/utils/styles';

export function TestsTab({ agent }: { agent: ForoDetailAgent }) {
  if (agent.phase === 'settled') {
    const [done] = agent.progress ?? [0, 0];
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded border border-border-subtle bg-bg-tertiary px-4 py-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="flex flex-col items-center gap-1.5">
              <Text variant="label" color="muted" className="text-[10px] tracking-widest">
                TESTS RUN
              </Text>
              <Text variant="code" color="secondary" className="text-sm">
                {done}/{done}
              </Text>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <Text variant="label" color="muted" className="text-[10px] tracking-widest">
                SCORE
              </Text>
              <Text variant="code" color="primary" className="text-sm">
                {agent.score ?? '—'}
              </Text>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <Text variant="label" color="muted" className="text-[10px] tracking-widest">
                RESULT
              </Text>
              <Badge variant={agent.badgeStatus} size="xs" />
            </div>
          </div>
        </div>
        {agent.avgLatencyMs !== undefined && (
          <div className="flex items-baseline justify-between border-b border-border-subtle py-2.5">
            <Text variant="bodySmall" color="muted" className="text-xs">
              Avg latency
            </Text>
            <Text variant="code" color="tertiary" className="text-xs">
              {agent.avgLatencyMs}ms
            </Text>
          </div>
        )}
      </div>
    );
  }

  if (agent.phase === 'running') {
    const [done, total] = agent.progress ?? [0, 0];
    return (
      <div className="flex flex-col gap-1.5">
        {Array.from({ length: total }, (_, i) => {
          const isDone = i < done;
          const isActive = i === done;
          return (
            <div
              key={i}
              className={cn(
                'flex items-center gap-2.5 rounded border px-3.5 py-2',
                isActive
                  ? 'border-[#1D3144] bg-[rgba(92,158,232,0.05)]'
                  : 'border-border-subtle bg-bg-tertiary'
              )}
            >
              <span
                className={cn(
                  'shrink-0 font-mono text-[10px]',
                  isDone ? 'text-success' : isActive ? 'text-info' : 'text-text-disabled'
                )}
              >
                {isDone ? '✓' : isActive ? '·' : '○'}
              </span>
              <Text
                variant="bodySmall"
                color={isDone ? 'quaternary' : isActive ? 'secondary' : 'disabled'}
                className="text-xs"
              >
                Test case {String(i + 1).padStart(2, '0')}
              </Text>
              {isActive ? (
                <Text variant="code" color="info" className="ml-auto text-[10px]">
                  running…
                </Text>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  // Queued phase — test cases are shown above the tabs
  return null;
}
