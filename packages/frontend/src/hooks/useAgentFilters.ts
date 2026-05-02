/**
 * useAgentFilters Hook
 * 
 * Manages agent list filtering and grouping.
 */

'use client';

import { useMemo, useState } from 'react';
import type { Agent, AgentStatus } from '@/lib/constants/types';

export interface UseAgentFiltersOptions {
  agents: Agent[];
}

export interface UseAgentFiltersReturn {
  filteredAgents: Agent[];
  groupedAgents: {
    waiting: Agent[];
    live: Agent[];
    verified: Agent[];
    failed: Agent[];
  };
  filters: {
    status: AgentStatus | 'all';
    search: string;
  };
  setStatusFilter: (status: AgentStatus | 'all') => void;
  setSearchFilter: (search: string) => void;
  clearFilters: () => void;
}

/**
 * Hook for filtering and grouping agents
 * 
 * @example
 * ```tsx
 * const { groupedAgents, setStatusFilter } = useAgentFilters({ agents });
 * 
 * <button onClick={() => setStatusFilter('verified')}>
 *   Show Verified ({groupedAgents.verified.length})
 * </button>
 * ```
 */
export function useAgentFilters({
  agents,
}: UseAgentFiltersOptions): UseAgentFiltersReturn {
  const [statusFilter, setStatusFilter] = useState<AgentStatus | 'all'>('all');
  const [searchFilter, setSearchFilter] = useState('');

  const filteredAgents = useMemo(() => {
    let filtered = agents;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(agent => agent.status === statusFilter);
    }

    // Search filter
    if (searchFilter) {
      const search = searchFilter.toLowerCase();
      filtered = filtered.filter(
        agent =>
          agent.name.toLowerCase().includes(search) ||
          agent.foroId.toLowerCase().includes(search) ||
          agent.fullAddress.toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [agents, statusFilter, searchFilter]);

  const groupedAgents = useMemo(() => {
    return {
      waiting: agents.filter(a => a.status === 'pending'),
      live: agents.filter(a => a.status === 'live'),
      verified: agents.filter(a => ['verified', 'elite', 'probation'].includes(a.status)),
      failed: agents.filter(a => a.status === 'failed'),
    };
  }, [agents]);

  const clearFilters = () => {
    setStatusFilter('all');
    setSearchFilter('');
  };

  return {
    filteredAgents,
    groupedAgents,
    filters: {
      status: statusFilter,
      search: searchFilter,
    },
    setStatusFilter,
    setSearchFilter,
    clearFilters,
  };
}
