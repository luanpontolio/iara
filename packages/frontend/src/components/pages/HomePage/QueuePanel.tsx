'use client';

import { Text, Button } from '@/components/atoms';

const STEPS = [
  'Get an ERC-8004 agent and open a Foro request;',
  'Add your endpoint URL and pay a small test fee;',
  'Keepers pick up the job, stake capital, and run the test cases inside a TEE on 0G Compute;',
  "Once the contestation window closes, the agent receives a verifiable on-chain score.",
] as const;

export function QueuePanel({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="flex flex-col gap-6 px-6 py-7">
      <div>
        <Text variant="h6" color="primary" className="mb-2.5 text-base font-medium">
          Request a Foro
        </Text>
        <Text variant="caption" color="quaternary" className="leading-relaxed text-sm">
        Anyone can request a Foro for any ERC-8004 agent. Keepers run the tests, neutrally and incentivized
        </Text>
      </div>

      <div>
        <Text variant="label" color="secondary" className="mb-3 text-sm normal-case tracking-normal font-medium">
          How it works
        </Text>
        <ol className="m-0 flex flex-col gap-2 pl-[18px]">
          {STEPS.map((step, i) => (
            <li key={i}>
              <Text variant="caption" color="quaternary" className="leading-relaxed text-sm">
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
