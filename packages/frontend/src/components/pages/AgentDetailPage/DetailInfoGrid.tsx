'use client';

import { Text } from '@/components/atoms';
import type { ForoDetailAgent } from '@/lib/constants/types';

const EXPLORER_BASE =
  process.env.NEXT_PUBLIC_CHAIN_EXPLORER ?? 'https://explorer.0g.ai/testnet/blockchain';

function truncateTxHash(hash: string): string {
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}


const linkClass =
  'font-mono text-[13px] leading-normal text-text-quaternary transition-colors hover:text-text-primary hover:underline cursor-pointer';

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

function CreatorCol({ label, address, fullAddress }: { label: string; address: string | undefined; fullAddress: string | undefined }) {
  return (
    <div className="flex flex-col items-center gap-[7px]">
      <Text variant="label" color="muted" className="text-[10px] tracking-widest">
        {label}
      </Text>
      {address && fullAddress ? (
        <a
          href={`${EXPLORER_BASE}/address/${fullAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          {address}
        </a>
      ) : (
        <Text variant="code" color="primary" className="text-[13px] leading-normal">
          {address ?? '—'}
        </Text>
      )}
    </div>
  );
}

function TxHashCol({ hash }: { hash: string | undefined }) {
  return (
    <div className="flex flex-col items-center gap-[7px]">
      <Text variant="label" color="muted" className="text-[10px] tracking-widest">
        TX HASH
      </Text>
      {hash ? (
        <a
          href={`${EXPLORER_BASE}/tx/${hash}`}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          {truncateTxHash(hash)}
        </a>
      ) : (
        <Text variant="code" color="quaternary" className="text-[13px] leading-normal">
          —
        </Text>
      )}
    </div>
  );
}

export function DetailInfoGrid({ agent }: { agent: ForoDetailAgent }) {
  const hasKeeper = Boolean(agent.keeper);
  const [done, total] = agent.progress ?? [0, 0];

  return (
    <div className="w-full">
      <div className="grid grid-cols-3">
        <InfoCol label="FORO ID" value={String(agent.id)} />
        <CreatorCol label="FORO CREATOR" address={agent.creator} fullAddress={agent.creatorFull} />
        <TxHashCol hash={agent.txHash} />
      </div>

      {hasKeeper ? (
        <>
          <div className="my-5 h-px bg-border-subtle" />
          <div className="grid grid-cols-3">
            <InfoCol label="STARTED" value={agent.startedAt} />
            <InfoCol label="TESTS DONE" value={`${done}/${total}`} highlight />
            <InfoCol label="REWARD" value={agent.keeperEarned} />
          </div>
        </>
      ) : null}
    </div>
  );
}
