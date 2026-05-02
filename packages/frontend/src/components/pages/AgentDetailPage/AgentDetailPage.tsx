'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { GaugeChart } from '@/components/organisms';
import { Text } from '@/components/atoms';
import type { ForoDetailAgent, ForoTabId } from '@/lib/constants/types';
import { FORO_AGENTS } from './data';
import { DetailHeader } from './DetailHeader';
import { DetailInfoGrid } from './DetailInfoGrid';
import { TestsTab } from './TestsTab';
import { ProofTab } from './ProofTab';
import { RewardsTab } from './RewardsTab';
import { cn } from '@/lib/utils/styles';

const TABS: { id: ForoTabId; label: string }[] = [
  { id: 'tests', label: 'Tests' },
  { id: 'proof', label: 'Proof' },
  { id: 'rewards', label: 'Rewards' },
];

function gaugePropsFor(agent: ForoDetailAgent) {
  const scoreNum = agent.score ? parseFloat(agent.score) : 0;
  const [done, total] = agent.progress ?? [0, 14];

  if (agent.phase === 'queued') {
    return { score: 0, status: agent.badgeStatus, showFill: false as const };
  }
  if (agent.phase === 'running') {
    return {
      score: total > 0 ? done / total : 0,
      status: agent.badgeStatus,
      overrideColor: '#5C9EE8',
    };
  }
  return { score: scoreNum, status: agent.badgeStatus };
}

export function AgentDetailPage() {
  const params = useParams();
  const id = typeof params.foroId === 'string' ? params.foroId : '';
  const agent = FORO_AGENTS[id];

  if (!agent) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <Text variant="code" color="muted" className="text-sm">
          foro not found · id: {id}
        </Text>
      </div>
    );
  }

  return <AgentDetailBody key={id} agent={agent} />;
}

function AgentDetailBody({ agent }: { agent: ForoDetailAgent }) {
  const [tab, setTab] = useState<ForoTabId>(() =>
    agent.phase === 'settled' ? 'proof' : 'tests'
  );

  const gauge = gaugePropsFor(agent);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-bg-primary">
      <DetailHeader agent={agent} />

      <div className="flex shrink-0 flex-col items-center px-6 pt-8">
        <div className="mb-6 text-center">
          <Text variant="code" color="primary" className="text-[32px] leading-none tracking-tight">
            {agent.testFee ?? '—'}
          </Text>
          <Text variant="bodySmall" color="quaternary" className="mt-2 text-[13px]">
            {agent.phase === 'settled' ? 'Available to claim' : 'Locked in escrow'}
          </Text>
        </div>

        <GaugeChart {...gauge} svgWidth={200} svgHeight={120} />

        <Text variant="bodySmall" color="primary" className="mt-3.5 mb-8 text-base font-medium">
          {agent.name}
        </Text>

        <div className="mb-10 w-full max-w-[540px]">
          <DetailInfoGrid agent={agent} />
        </div>

        <div className="w-full max-w-[540px]">
          <div className="flex justify-center gap-9 pb-5">
            {TABS.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'cursor-pointer border-b bg-transparent px-0 pb-1.5 font-sans text-sm transition-colors',
                  tab === t.id
                    ? 'border-text-primary font-medium text-text-primary'
                    : 'border-transparent font-normal text-text-muted hover:text-text-tertiary'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="pointer-events-none absolute left-0 right-0 top-0 z-[1] h-7 bg-gradient-to-b from-bg-primary to-transparent" />
        <div className="h-full overflow-y-auto px-6 pb-12 pt-3">
          <div className="mx-auto max-w-[540px]">
            {tab === 'tests' ? <TestsTab agent={agent} /> : null}
            {tab === 'proof' ? <ProofTab agent={agent} /> : null}
            {tab === 'rewards' ? <RewardsTab agent={agent} /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
