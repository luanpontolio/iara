/**
 * AgentTable Component
 * 
 * Table for displaying agent list with sortable columns.
 */

'use client';

import React, { useState } from 'react';
import { cn, transition } from '@/lib/utils/styles';
import { Text, Badge } from '@/components/atoms';
import { useHover } from '@/hooks';
import type { Agent } from '@/lib/constants/types';

type SortKey = 'name' | 'score' | 'tests' | 'latency' | 'status';
type SortOrder = 'asc' | 'desc';

export interface AgentTableProps {
  agents: Agent[];
  onRowClick?: (agent: Agent) => void;
  className?: string;
}

interface TableRowProps {
  agent: Agent;
  isLast: boolean;
  onClick?: () => void;
}

function TableRow({ agent, isLast, onClick }: TableRowProps) {
  const { isHovered, hoverProps } = useHover();
  
  const scoreColor =
    agent.status === 'elite' ? '#B8FF4F' :
    agent.status === 'verified' ? '#4ADE80' :
    agent.status === 'failed' ? '#F26B6B' : '#52525E';

  return (
    <div
      {...hoverProps}
      onClick={onClick}
      className={cn(
        'grid grid-cols-[1fr_90px_90px_90px_100px] items-center',
        'px-4 py-2.5',
        !isLast && 'border-b border-border-subtle',
        isHovered ? 'bg-bg-tertiary' : 'bg-transparent',
        onClick && 'cursor-pointer',
        transition(['background'])
      )}
    >
      <div>
        <Text variant="caption" color="primary" className="font-medium">
          {agent.name}
        </Text>
        <Text variant="code" color="quaternary" className="text-[10px] mt-px">
          {agent.foroId}
        </Text>
      </div>
      <Text variant="code" color={scoreColor as any} className="text-right">
        {agent.score}
      </Text>
      <Text variant="code" color="tertiary" className="text-right">
        {agent.tests}
      </Text>
      <Text variant="code" color="tertiary" className="text-right">
        {agent.latency}
      </Text>
      <div className="flex justify-end">
        <Badge variant={agent.status} size="xs" />
      </div>
    </div>
  );
}

/**
 * AgentTable component with sortable columns
 * 
 * @example
 * ```tsx
 * <AgentTable agents={agents} onRowClick={handleRowClick} />
 * ```
 */
export function AgentTable({
  agents,
  onRowClick,
  className,
}: AgentTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const sortedAgents = React.useMemo(() => {
    return [...agents].sort((a, b) => {
      let aVal: any = a[sortKey];
      let bVal: any = b[sortKey];

      // Convert score to number for sorting
      if (sortKey === 'score') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [agents, sortKey, sortOrder]);

  const headers: { key: SortKey; label: string; align: 'left' | 'right' }[] = [
    { key: 'name', label: 'Agent', align: 'left' },
    { key: 'score', label: 'Score', align: 'right' },
    { key: 'tests', label: 'Tests', align: 'right' },
    { key: 'latency', label: 'Latency', align: 'right' },
    { key: 'status', label: 'Status', align: 'right' },
  ];

  return (
    <div
      className={cn(
        'bg-bg-secondary border border-border-subtle rounded overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="grid grid-cols-[1fr_90px_90px_90px_100px] items-center px-4 py-2 border-b border-border-subtle">
        {headers.map(({ key, label, align }) => (
          <button
            key={key}
            onClick={() => handleSort(key)}
            className={cn(
              'bg-transparent border-none cursor-pointer p-0',
              align === 'right' && 'text-right',
              transition(['color'])
            )}
          >
            <Text variant="label" color="muted" className="text-[10px] hover:text-text-quaternary">
              {label} {sortKey === key && (sortOrder === 'asc' ? '↑' : '↓')}
            </Text>
          </button>
        ))}
      </div>

      {/* Rows */}
      {sortedAgents.map((agent, i) => (
        <TableRow
          key={agent.id}
          agent={agent}
          isLast={i === sortedAgents.length - 1}
          {...(onRowClick ? { onClick: () => onRowClick(agent) } : {})}
        />
      ))}
    </div>
  );
}

AgentTable.displayName = 'AgentTable';
