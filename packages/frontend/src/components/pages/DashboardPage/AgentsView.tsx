'use client';

import { useState } from 'react';
import { Button } from '@/components/atoms';
import { Text } from '@/components/atoms';
import { AgentCard } from '@/components/organisms';
import type { Agent } from '@/lib/constants/types';
import { VerificationPanel } from './VerificationPanel';
import { DashboardMain, DashboardTopBar } from './layout';
import { DASHBOARD_AGENTS } from './data';

export function AgentsView({ agents = DASHBOARD_AGENTS }: { agents?: Agent[] }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const agent = agents.find(a => a.id === selectedId) ?? null;

  return (
    <DashboardMain className="flex flex-row overflow-hidden">
      <div className="flex w-[260px] flex-shrink-0 flex-col overflow-hidden border-r border-border-subtle">
        <DashboardTopBar page="Agents">
          <Button variant="primary" size="sm">
            +
          </Button>
        </DashboardTopBar>
        <div className="flex flex-1 flex-col gap-2 overflow-auto p-3">
          {agents.map(a => (
            <AgentCard
              key={a.id}
              agent={a}
              variant="result"
              selected={selectedId === a.id}
              onClick={() => setSelectedId(a.id)}
            />
          ))}
        </div>
      </div>
      {agent ? (
        <VerificationPanel agent={agent} onClose={() => setSelectedId(null)} />
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <Text variant="code" color="muted" className="text-xs">
            select an agent to inspect
          </Text>
        </div>
      )}
    </DashboardMain>
  );
}
