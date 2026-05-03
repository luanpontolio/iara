'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { GaugeChart } from '@/components/organisms';
import { Text } from '@/components/atoms';
import { Tooltip } from '@/components/molecules';
import { useAgentDetail, useAgentStatus } from '@/hooks';
import type { ForoDetailAgent, ForoTabId } from '@/lib/constants/types';
import { DetailHeader } from './DetailHeader';
import { DetailInfoGrid } from './DetailInfoGrid';
import { TestsTab } from './TestsTab';
import { ProofTab } from './ProofTab';
import { RewardsTab } from './RewardsTab';
import { cn } from '@/lib/utils/styles';

const TABS: { id: ForoTabId; label: string }[] = [
  { id: 'test-cases', label: 'Test Cases' },
  { id: 'tests', label: 'Tests' },
  { id: 'proof', label: 'Proof' },
  { id: 'rewards', label: 'Rewards' },
];

function gaugePropsFor(agent: ForoDetailAgent) {
  const scoreNum = agent.score ? parseFloat(agent.score) : 0;
  const [done, total] = agent.progress ?? [0, 0];

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
  const foroId = parseInt(id, 10);

  const { agent, isLoading, isError } = useAgentDetail(isNaN(foroId) ? 0 : foroId);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <Text variant="code" color="muted" className="text-sm">
          Loading…
        </Text>
      </div>
    );
  }

  if (isError || !agent) {
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

function TestCasesBlock({ agentContractJson }: { agentContractJson: string | undefined }) {
  const formatted = useMemo(() => {
    if (!agentContractJson) return null;
    try {
      const contract = JSON.parse(agentContractJson) as { testCases?: unknown };
      if (!contract.testCases) return null;
      return JSON.stringify(contract.testCases, null, 2);
    } catch {
      return null;
    }
  }, [agentContractJson]);

  if (!formatted) return null;

  return (
    <div className="overflow-hidden rounded border border-border-subtle bg-bg-tertiary">
      <pre className="scrollbar-thin overflow-auto p-4 text-[11px] leading-relaxed text-text-secondary">
        <code>{formatted}</code>
      </pre>
    </div>
  );
}

function AgentDetailBody({ agent }: { agent: ForoDetailAgent }) {
  const [tab, setTab] = useState<ForoTabId>(() =>
    agent.phase === 'settled' ? 'proof' : 'test-cases'
  );

  const gauge = gaugePropsFor(agent);
  const { color, meaning } = useAgentStatus({ status: agent.badgeStatus, score: agent.score });

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-bg-primary">
      <DetailHeader agent={agent} />

      <div className="flex shrink-0 flex-col items-center px-6 pt-8">
        <GaugeChart {...gauge} svgWidth={200} svgHeight={120} />

        {agent.phase === 'settled' && agent.score && (
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <Text
              variant="code"
              className="text-sm font-medium tracking-wide"
              style={{ color }}
            >
              {agent.score}
            </Text>
            <Tooltip content={meaning} position="top">
              <div
                className={cn(
                  'w-[15px] h-[15px] rounded-full border border-border-default',
                  'flex items-center justify-center cursor-default',
                  'text-text-muted text-[9px] font-mono flex-shrink-0'
                )}
              >
                i
              </div>
            </Tooltip>
          </div>
        )}

        {agent.agentEndpointUrl ? (
          <a
            href={agent.agentEndpointUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3.5 mb-8 font-sans text-base font-medium text-text-primary transition-colors hover:text-text-secondary hover:underline cursor-pointer"
          >
            {agent.name}
          </a>
        ) : (
          <Text variant="bodySmall" color="primary" className="mt-3.5 mb-8 text-base font-medium">
            {agent.name}
          </Text>
        )}

        <div className="mb-10 w-full max-w-[540px]">
          <DetailInfoGrid agent={agent} />
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="pointer-events-none absolute left-0 right-0 top-0 z-[1] h-7 bg-gradient-to-b from-bg-primary to-transparent" />
        <div className="h-full overflow-y-auto px-6 pb-12 pt-3">
          <div className="mx-auto max-w-[540px]">

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

            {tab === 'test-cases' ? <TestCasesBlock agentContractJson={agent.agentContractJson} /> : null}
            {tab === 'tests' ? <TestsTab agent={agent} /> : null}
            {tab === 'proof' ? <ProofTab agent={agent} /> : null}
            {tab === 'rewards' ? <RewardsTab agent={agent} /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
