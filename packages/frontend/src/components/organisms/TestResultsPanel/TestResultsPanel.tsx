/**
 * TestResultsPanel Component
 * 
 * Displays test results with rounds and scores.
 */

'use client';

import React from 'react';
import { cn, transition } from '@/lib/utils/styles';
import { Text, Badge } from '@/components/atoms';
import { useHover } from '@/hooks';
import type { TestRound } from '@/lib/constants/types';

export interface TestResultsPanelProps {
  rounds: TestRound[];
  className?: string;
}

interface RoundRowProps {
  round: TestRound;
}

function RoundRow({ round }: RoundRowProps) {
  const { isHovered, hoverProps } = useHover();

  return (
    <div
      {...hoverProps}
      className={cn(
        'grid grid-cols-[32px_1fr_80px_80px] items-center gap-3',
        'px-4 py-3 border-b border-border-subtle last:border-b-0',
        isHovered ? 'bg-bg-tertiary' : 'bg-transparent',
        transition(['background'])
      )}
    >
      <Text variant="code" color="muted" className="text-[11px]">
        {round.n}
      </Text>
      <Text
        variant="code"
        color={round.passed ? 'secondary' : 'error'}
      >
        {round.score}
      </Text>
      <Text variant="code" color="quaternary">
        {round.latency}
      </Text>
      <Badge variant={round.passed ? 'verified' : 'failed'} size="xs" />
    </div>
  );
}

/**
 * TestResultsPanel component for displaying test rounds
 * 
 * @example
 * ```tsx
 * <TestResultsPanel rounds={testRounds} />
 * ```
 */
export function TestResultsPanel({
  rounds,
  className,
}: TestResultsPanelProps) {
  if (!rounds || rounds.length === 0) {
    return (
      <div className={cn('py-12 text-center', className)}>
        <Text variant="caption" color="muted">
          No test results available
        </Text>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header */}
      <div className="grid grid-cols-[32px_1fr_80px_80px] gap-3 px-4 py-2 border-b border-border-subtle">
        {['Round', 'Score', 'Latency', 'Status'].map(h => (
          <Text key={h} variant="label" color="muted" className="text-[10px]">
            {h}
          </Text>
        ))}
      </div>

      {/* Rows */}
      <div>
        {rounds.map(round => (
          <RoundRow key={round.n} round={round} />
        ))}
      </div>
    </div>
  );
}

TestResultsPanel.displayName = 'TestResultsPanel';
