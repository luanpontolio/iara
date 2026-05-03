'use client';

import { Button } from '@/components/atoms';
import { Text } from '@/components/atoms';
import type { ForoDetailAgent } from '@/lib/constants/types';
import { cn } from '@/lib/utils/styles';

function Row({ label, value, valueClass }: { label: string; value: string | undefined; valueClass?: string }) {
  return (
    <div className="flex flex-col gap-1.5 border-b border-border-subtle py-2.5">
      <Text variant="bodySmall" color="muted" className="whitespace-nowrap text-xs">
        {label}
      </Text>
      <span className={cn('font-mono text-xs text-text-tertiary', valueClass)}>
        {value ?? '—'}
      </span>
    </div>
  );
}

export function RewardsTab({ agent }: { agent: ForoDetailAgent }) {
  const rawFee = parseFloat((agent.testFee ?? '0').replace(/[^0-9.]/g, ''));
  const currency = (agent.testFee ?? '').split(' ').pop() || '0G';
  const fmt = (n: number) => `${n.toFixed(4)} ${currency}`;

  const isSettled = agent.phase === 'settled';
  const isFailed = agent.badgeStatus === 'failed';

  const dist = [
    { label: 'Keeper · 70%', colorClass: 'text-success', amt: agent.keeperEarned ?? fmt(rawFee * 0.7) },
    { label: 'Creator · 20%', colorClass: 'text-text-tertiary', amt: fmt(rawFee * 0.2) },
    { label: 'Protocol · 10%', colorClass: 'text-text-muted', amt: fmt(rawFee * 0.1) },
  ];

  return (
    <div>
      <Row label="Total in escrow" value={agent.testFee} />
      <Row label="Keeper stake" value={agent.stakeRequired} />

      {dist.map(d => (
        <Row key={d.label} label={d.label} value={d.amt} valueClass={d.colorClass} />
      ))}

      {isSettled && isFailed ? (
        <div className="mt-3.5 rounded border border-error/15 bg-error/10 px-3 py-2.5">
          <Text variant="bodySmall" color="error" className="text-xs">
            Agent failed verification
          </Text>
          <Text variant="bodySmall" color="quaternary" className="mt-1 text-[11px] leading-snug">
            Your stake is returned and fee earned. The agent bears the reputation cost.
          </Text>
        </div>
      ) : null}

      {isSettled ? (
        <div className="mt-4 flex items-center justify-between gap-4">
          <Text variant="bodySmall" color="muted" className="text-xs leading-snug">
            Are you the keeper of this job?
          </Text>
          <Button variant="primary" size="sm">
            Claim Rewards
          </Button>
        </div>
      ) : null}
    </div>
  );
}
