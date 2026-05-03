'use client';

import { Text } from '@/components/atoms';
import type { ForoDetailAgent } from '@/lib/constants/types';
import { cn } from '@/lib/utils/styles';

export function TestsTab({ agent }: { agent: ForoDetailAgent }) {
  if (agent.phase === 'settled') {
    return (
      <div className="flex flex-col gap-3">
        {agent.avgLatencyMs !== undefined && (
          <div className="flex flex-col gap-1.5 border-b border-border-subtle py-2.5">
            <Text variant="bodySmall" color="muted" className="whitespace-nowrap text-xs">
              Avg latency
            </Text>
            <span className="font-mono text-xs text-text-tertiary">
              {agent.avgLatencyMs}ms
            </span>
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
