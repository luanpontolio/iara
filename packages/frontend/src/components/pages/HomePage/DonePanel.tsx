'use client';

import { Text, Button } from '@/components/atoms';

const LINES = [
  '0G Compute provides TEE-secured, neutral execution. No vendor controls the result.',
  'Keepers stake capital and earn 70% of the test fee for verified work.',
  'Final scores are written on-chain as verifiable ERC-8004 reputation credentials.',
] as const;

export function DonePanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col gap-6 px-6 py-7">
      <div>
        <Text variant="label" color="secondary" className="mb-3 text-sm normal-case tracking-normal font-medium">
          How it works
        </Text>
        <div className="flex flex-col gap-1.5">
          {LINES.map((line, i) => (
            <Text key={i} variant="caption" color="muted" className="leading-relaxed text-sm">
              {line}
            </Text>
          ))}
        </div>
      </div>

      <div>
        <Text variant="label" color="secondary" className="mb-3 block text-sm normal-case tracking-normal font-medium">
          Why it matters
        </Text>
        <Text variant="caption" color="muted" className="leading-relaxed text-sm">
        ERC-8004 agents build reputation through user feedback today. There is no decentralised mechanism to prove actual performance. Foro closes that gap with a permissionless, economically incentivised verification layer.
        </Text>
      </div>

      <Button variant="ghost" size="sm" onClick={onClose} className="self-start text-text-tertiary">
        Close
      </Button>
    </div>
  );
}
