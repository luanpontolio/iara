'use client';

import { Badge } from '@/components/atoms';
import { Text } from '@/components/atoms';
import type { ForoDetailAgent } from '@/lib/constants/types';
import { cn } from '@/lib/utils/styles';

export function TestsTab({ agent }: { agent: ForoDetailAgent }) {
  if (agent.phase === 'settled') {
    return (
      <div className="flex flex-col gap-2">
        {agent.rounds?.map(r => (
          <div
            key={r.n}
            className="grid grid-cols-[32px_1fr_80px_80px] items-center gap-3 rounded border border-border-subtle bg-bg-tertiary px-4 py-3"
          >
            <Text variant="code" color="muted" className="text-[11px]">
              {r.n}
            </Text>
            <Text
              variant="code"
              color={r.passed ? 'secondary' : 'error'}
              className="text-xs"
            >
              {r.score}
            </Text>
            <Text variant="code" color="quaternary" className="text-xs">
              {r.latency}
            </Text>
            <div className="flex justify-end">
              <Badge variant={r.passed ? 'verified' : 'failed'} size="xs" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (agent.phase === 'running') {
    const [done, total] = agent.progress ?? [0, 14];
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

  return (
    <div className="flex flex-col gap-2">
      {agent.testCases?.map(tc => (
        <div
          key={tc.id}
          className="rounded border border-border-subtle bg-bg-tertiary py-3.5"
        >
          <div className="mb-2 flex items-baseline gap-2 px-3.5">
            <Text variant="code" color="muted" className="text-[10px]">
              {tc.id}
            </Text>
            <Text variant="bodySmall" color="secondary" className="text-xs">
              {tc.description}
            </Text>
          </div>
          <div className="flex flex-col gap-1 px-3.5">
            {tc.criteria.map((c, idx) => (
              <Text key={idx} variant="bodySmall" color="muted" className="text-[11px]">
                · {c}
              </Text>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
