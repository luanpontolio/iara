'use client';

import { Button } from '@/components/atoms';
import { Text } from '@/components/atoms';
import type { ForoDetailAgent } from '@/lib/constants/types';
import { cn } from '@/lib/utils/styles';

export function RewardsTab({ agent }: { agent: ForoDetailAgent }) {
  const rawFee = parseFloat((agent.testFee ?? '0').replace(/[^0-9.]/g, ''));
  const currency = (agent.testFee ?? '').split(' ').pop() || '0G';
  const fmt = (n: number) => `${n.toFixed(4)} ${currency}`;

  const isSettled = agent.phase === 'settled';
  const isFailed = agent.badgeStatus === 'failed';

  // Prefer on-chain pre-computed values; fall back to client-side calculation.
  const stakeDisplay = agent.stakeReturned ?? fmt(rawFee * 2);
  const earnedDisplay = agent.keeperEarned ?? fmt(rawFee * 0.7);
  const vaultDisplay = agent.vaultBalance;

  const dist = [
    { label: 'Keeper', pct: '70%', colorClass: 'text-success', amt: agent.keeperEarned ?? fmt(rawFee * 0.7) },
    { label: 'Creator', pct: '20%', colorClass: 'text-text-tertiary', amt: fmt(rawFee * 0.2) },
    { label: 'Protocol', pct: '10%', colorClass: 'text-text-muted', amt: fmt(rawFee * 0.1) },
  ];

  return (
    <div>
      {vaultDisplay !== undefined ? (
        <div className="flex items-baseline justify-between border-b border-border-subtle py-2.5">
          <Text variant="bodySmall" color="muted" className="text-xs">
            {isSettled ? 'Vault (distributed)' : 'Vault (locked)'}
          </Text>
          <Text variant="code" color={isSettled ? 'quaternary' : 'info'} className="text-xs">
            {vaultDisplay}
          </Text>
        </div>
      ) : null}

      <div className="flex items-baseline justify-between border-b border-border-subtle py-2.5">
        <Text variant="bodySmall" color="muted" className="text-xs">
          Stake {isSettled ? 'returned' : 'required (2×)'}
        </Text>
        <Text
          variant="code"
          color={isSettled ? 'success' : 'secondary'}
          className="text-xs"
        >
          {stakeDisplay}
          {isSettled ? ' ✓' : ''}
        </Text>
      </div>

      <div className="flex items-baseline justify-between border-b border-border-subtle py-2.5">
        <Text variant="bodySmall" color="muted" className="text-xs">
          {isSettled ? 'Fee earned (70%)' : 'Expected rewards'}
        </Text>
        <Text
          variant="code"
          color={isSettled ? 'success' : 'tertiary'}
          className="text-xs"
        >
          {earnedDisplay}
          {isSettled ? ' ✓' : ''}
        </Text>
      </div>

      <div className="flex items-baseline justify-between border-b border-border-subtle py-3">
        <Text variant="bodySmall" color="muted" className="text-xs">
          Net P&L
        </Text>
        <Text variant="code" color="success" className="text-sm font-medium">
          +{earnedDisplay}
        </Text>
      </div>

      <div className="flex flex-col gap-1 border-b border-border-subtle py-3.5">
        {dist.map(d => (
          <div key={d.label} className="flex justify-between">
            <Text variant="bodySmall" color="muted" className="text-[11px]">
              {d.label} · {d.pct}
            </Text>
            <span className={cn('font-mono text-[11px] font-medium', d.colorClass)}>
              {d.amt}
            </span>
          </div>
        ))}
      </div>

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
        <div className="mt-[18px]">
          <Button variant="primary" size="md">
            Claim Rewards
          </Button>
        </div>
      ) : null}
    </div>
  );
}
