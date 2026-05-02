'use client';

import type { CSSProperties } from 'react';
import { Button, Text } from '@/components/atoms';
import { InfoRow } from '@/components/molecules';
import { TabNav } from '@/components/molecules';
import { TestResultsPanel } from '@/components/organisms';
import { useAgentStatus } from '@/hooks';
import type { Agent, TestRound } from '@/lib/constants/types';
import { cn } from '@/lib/utils/styles';

const MOCK_ROUNDS: Array<{ n: string; score: string; status: 'verified' | 'failed'; latency: string }> = [
  { n: '01', score: '0.99', status: 'verified', latency: '112ms' },
  { n: '02', score: '0.97', status: 'verified', latency: '134ms' },
  { n: '03', score: '0.94', status: 'verified', latency: '128ms' },
  { n: '04', score: '0.98', status: 'verified', latency: '141ms' },
  { n: '05', score: '0.96', status: 'verified', latency: '119ms' },
  { n: '06', score: '0.31', status: 'failed', latency: '831ms' },
  { n: '07', score: '0.95', status: 'verified', latency: '122ms' },
  { n: '08', score: '0.97', status: 'verified', latency: '138ms' },
];

const roundsForPanel: TestRound[] = MOCK_ROUNDS.map(r => ({
  n: r.n,
  score: r.score,
  latency: r.latency,
  passed: r.status === 'verified',
}));

export function VerificationPanel({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const { color } = useAgentStatus({
    status: agent.status,
    score: agent.score,
  });

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden border-l border-border-subtle bg-bg-secondary">
      <div className="flex flex-shrink-0 items-start justify-between border-b border-border-subtle px-5 py-4">
        <div>
          <Text variant="h6" color="primary" className="text-[15px] font-medium">
            {agent.name}
          </Text>
          <Text variant="code" color="muted" className="mt-1 text-[11px]">
            {agent.foroId}
          </Text>
        </div>
        <Button variant="secondary" size="sm" onClick={onClose} className="text-xs font-normal">
          close
        </Button>
      </div>

      <div className="flex flex-shrink-0 gap-8 border-b border-border-subtle px-5 py-5">
        {[
          { value: agent.score, style: { color } as CSSProperties, label: 'score' },
          { value: agent.tests, className: 'text-text-primary', label: 'tests' },
          { value: agent.latency, className: 'text-text-tertiary', label: 'latency' },
        ].map(({ value, label, style, className }) => (
          <div key={label} className="flex flex-col gap-1">
            <Text
              variant="h2"
              className={cn('font-mono text-[32px] leading-none tracking-tight', className)}
              style={style}
            >
              {value}
            </Text>
            <Text variant="label" color="muted" className="text-[10px] normal-case tracking-wider">
              {label}
            </Text>
          </div>
        ))}
      </div>

      <TabNav defaultTab="tests" className="flex min-h-0 flex-1 flex-col">
        <TabNav.List className="flex-shrink-0 border-b border-border-subtle px-5">
          {(['tests', 'proof', 'metadata'] as const).map(t => (
            <TabNav.Tab key={t} id={t}>
              <span className="capitalize">{t}</span>
            </TabNav.Tab>
          ))}
        </TabNav.List>

        <TabNav.Panel id="tests" className="flex-1 overflow-auto">
          <TestResultsPanel rounds={roundsForPanel} />
        </TabNav.Panel>

        <TabNav.Panel id="proof" className="flex-1 overflow-auto p-5">
          <div className="flex flex-col gap-3.5">
            <InfoRow
              label="Proof hash"
              value="0x7c4d8f2a1b9e3c6d5f0a2b4c8e1d3f6a9b2c5e8f1d4a7b0c3e6f9a2b5c8e1d4"
            />
            <InfoRow label="Anchor block" value="#21,304,991" />
            <InfoRow label="Transaction" value="0x4a3f8c2d1e9b7f6a5c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b" />
            <InfoRow label="Network" value="mainnet" />
            <InfoRow label="Protocol" value="ERC-8004 v2.1" />
          </div>
        </TabNav.Panel>

        <TabNav.Panel id="metadata" className="flex-1 overflow-auto p-5">
          <div className="flex flex-col gap-3.5">
            <InfoRow label="foroId" value={agent.fullAddress} />
            <InfoRow label="Created" value="2026-04-14T08:22:01Z" />
            <InfoRow label="Last verified" value="2026-04-30T11:04:17Z" />
            <InfoRow label="Verification count" value="47" />
          </div>
        </TabNav.Panel>
      </TabNav>
    </div>
  );
}
