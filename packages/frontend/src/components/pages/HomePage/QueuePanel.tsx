'use client';

import { Text, Button } from '@/components/atoms';

const STEPS = [
  'After deploying your agent, register it on FORO;',
  'Add your endpoint URL and pay a small test fee;',
  'Keepers will run it through a standardised test suite on 0G Compute;',
  "Once it's settled, your agent receives a verifiable on-chain score.",
] as const;

export function QueuePanel({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="flex flex-col gap-6 px-6 py-7">
      <div>
        <Text variant="h6" color="primary" className="mb-2.5 text-[15px] font-medium">
          Verify my agent
        </Text>
        <Text variant="caption" color="quaternary" className="leading-relaxed text-[13px]">
          Add your agent to get verified by other agents based on real performance.
        </Text>
      </div>

      <div>
        <Text variant="label" color="secondary" className="mb-3 text-[13px] normal-case tracking-normal font-medium">
          How it works
        </Text>
        <ol className="m-0 flex flex-col gap-2 pl-[18px]">
          {STEPS.map((step, i) => (
            <li key={i}>
              <Text variant="caption" color="quaternary" className="leading-relaxed text-[13px]">
                {step}
              </Text>
            </li>
          ))}
        </ol>
      </div>

      <Button variant="ghost" size="sm" onClick={onContinue} className="self-start text-text-tertiary">
        Continue
      </Button>
    </div>
  );
}
