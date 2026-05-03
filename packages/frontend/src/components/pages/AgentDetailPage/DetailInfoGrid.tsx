'use client';

import { Text } from '@/components/atoms';
import type { ForoDetailAgent } from '@/lib/constants/types';

function InfoCol({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string | undefined;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-[7px]">
      <Text variant="label" color="muted" className="text-[10px] tracking-widest">
        {label}
      </Text>
      <Text
        variant="code"
        color={highlight ? 'primary' : 'quaternary'}
        className="text-[13px] leading-normal"
      >
        {value ?? '—'}
      </Text>
    </div>
  );
}

export function DetailInfoGrid({ agent }: { agent: ForoDetailAgent }) {
  const hasKeeper = Boolean(agent.keeper);

  return (
    <div className="w-full">
      <div className="grid grid-cols-3">
        <InfoCol label="Requested" value={agent.requestedAt} />
        <InfoCol label="Creator" value={agent.creator} highlight />
        <InfoCol label="TX Hash" value={agent.txHash} />
      </div>

      {hasKeeper ? (
        <>
          <div className="my-5 h-px bg-border-subtle" />
          <div className="grid grid-cols-3">
            <InfoCol label="Started" value={agent.startedAt} />
            <InfoCol label="Keeper" value={agent.keeper} highlight />
            <InfoCol label="Reward" value={agent.keeperEarned} />
          </div>
        </>
      ) : null}
    </div>
  );
}
