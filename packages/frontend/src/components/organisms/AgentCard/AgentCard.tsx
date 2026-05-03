/**
 * AgentCard Component
 * 
 * Unified card component with variants for different agent states.
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils/styles';
import { CardShell } from '@/components/molecules/Card';
import { Badge, Divider, Text } from '@/components/atoms';
import { Tooltip } from '@/components/molecules';
import { GaugeChart } from './GaugeChart';
import { useHover, useAgentStatus } from '@/hooks';
import type { Agent } from '@/lib/constants/types';

type AgentCardVariant = 'waiting' | 'live' | 'result';

export interface AgentCardProps {
  agent: Agent;
  variant: AgentCardVariant;
  selected?: boolean;
  onClick?: () => void;
}

/**
 * Unified AgentCard component with variants
 * 
 * @example
 * ```tsx
 * <AgentCard agent={agent} variant="waiting" onClick={handleClick} />
 * <AgentCard agent={agent} variant="live" />
 * <AgentCard agent={agent} variant="result" selected />
 * ```
 */
export function AgentCard({
  agent,
  variant,
  selected = false,
  onClick,
}: AgentCardProps) {
  const { isHovered, hoverProps } = useHover();
  const { color, meaning, scoreNum } = useAgentStatus({
    status: agent.status,
    score: agent.lastJobScore ?? 0,
  });

  // Common gauge row
  const renderGauge = (scoreValue: number, overrideColor?: string, showFill = true) => (
    <div className="px-3 pt-1.5 flex justify-center">
      <GaugeChart
        score={scoreValue}
        status={agent.status}
        showFill={showFill}
        {...(overrideColor !== undefined ? { overrideColor } : {})}
      />
    </div>
  );

  // Common name row
  const renderName = () => (
    <div className="px-3 py-2 text-center">
      <Text variant="caption" color="tertiary" className="overflow-hidden text-ellipsis whitespace-nowrap">
        {agent.name}
      </Text>
    </div>
  );

  // Waiting variant
  if (variant === 'waiting') {
    return (
      <CardShell hovered={isHovered} selected={selected} {...(onClick ? { onClick } : {})} {...hoverProps}>
        <div className="px-3 pt-2.5 flex justify-center">
          <Text variant="code" color="secondary" className="tracking-wide">
            {agent.testFee ?? '—'}
          </Text>
        </div>
        {renderGauge(0, undefined, false)}
        <Divider className="mt-2.5" />
        {renderName()}
      </CardShell>
    );
  }

  // Live variant
  if (variant === 'live') {
    const parts = agent.tests.split('/');
    console.log('parts------', parts);
    const done = Number(parts[0] ?? 0);
    const total = Number(parts[1] ?? 0);
    const progress = total > 0 ? done / total : 0;

    return (
      <CardShell hovered={isHovered} selected={selected} {...(onClick ? { onClick } : {})} {...hoverProps}>
        {/* Progress bar */}
        <div className="h-0.5 bg-bg-elevated rounded-t-md overflow-hidden">
          <div
            className="h-full bg-info transition-[width] duration-300 ease-out"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        <div className="px-3 pt-2.5 flex justify-center">
          <Text variant="code" color="info" className="text-xs tracking-wide">
            Started {agent.elapsedTime ?? '—'} ago
          </Text>
        </div>

        {renderGauge(scoreNum, '#5C9EE8')}

        <div className="flex justify-center px-3 pt-1">
          <Text variant="code" color="muted" className="text-xs tracking-wide">
            {agent.tests} tests
          </Text>
        </div>

        <Divider className="mt-2.5" />
        {renderName()}
      </CardShell>
    );
  }

  // Result variant
  return (
    <CardShell hovered={isHovered} selected={selected} {...(onClick ? { onClick } : {})} {...hoverProps}>
      <div className="px-3 pt-2.5 flex justify-center">
        <Badge variant={agent.status} size="xs" />
      </div>

      {renderGauge(scoreNum)}

      {/* Score + tooltip */}
      <div className="flex items-center justify-center gap-1 px-3 pt-1.5 relative">
        <Text
          variant="code"
          className="text-xs font-medium tracking-wide"
          style={{ color }}
        >
          {agent.score}
        </Text>
        <Tooltip content={meaning} position="top">
          <div
            className={cn(
              'w-[13px] h-[13px] rounded-full border border-border-default',
              'flex items-center justify-center cursor-default',
              'text-text-muted text-[8px] font-mono flex-shrink-0'
            )}
          >
            i
          </div>
        </Tooltip>
      </div>

      <Divider className="mt-2.5" />
      {renderName()}
    </CardShell>
  );
}

AgentCard.displayName = 'AgentCard';

// Backward compatibility exports
export function AgentCardWaiting(props: Omit<AgentCardProps, 'variant'>) {
  return <AgentCard {...props} variant="waiting" />;
}

export function AgentCardLive(props: Omit<AgentCardProps, 'variant'>) {
  return <AgentCard {...props} variant="live" />;
}

export function AgentCardResult(props: Omit<AgentCardProps, 'variant'>) {
  return <AgentCard {...props} variant="result" />;
}
