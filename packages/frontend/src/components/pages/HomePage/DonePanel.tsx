'use client';

import { Text, Button } from '@/components/atoms';

const LINES = [
  '0G Compute provides TEE-secured, neutral execution — no vendor controls the result.',
  'Keepers stake collateral and earn 70% of the test fee for verified work.',
  'Final scores are written on-chain as an ERC-8004 verifiable credential.',
] as const;

export function DonePanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col gap-6 px-6 py-7">
      <div>
        <Text variant="label" color="secondary" className="mb-3 text-[13px] normal-case tracking-normal font-medium">
          How it works
        </Text>
        <div className="flex flex-col gap-1.5">
          {LINES.map((line, i) => (
            <Text key={i} variant="caption" color="muted" className="leading-relaxed text-[13px]">
              {line}
            </Text>
          ))}
        </div>
      </div>

      <div>
        <Text variant="label" color="secondary" className="mb-3 text-[13px] normal-case tracking-normal font-medium">
          Why it matters
        </Text>
        <Text variant="caption" color="muted" className="leading-relaxed text-[13px]">
          There is a missing piece on ERC-8004 today — no decentralised mechanism exists to evaluate agents at
          runtime. Foro closes that gap with a permissionless, economically incentivised verification layer.
        </Text>
      </div>

      <Button variant="ghost" size="sm" onClick={onClose} className="self-start text-text-tertiary">
        Close
      </Button>
    </div>
  );
}
