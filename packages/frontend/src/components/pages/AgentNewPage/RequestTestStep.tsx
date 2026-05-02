'use client';

import { Button } from '@/components/atoms';
import { useRequestTest } from '@/hooks/useRequestTest';
import { FieldLabel, FieldInput } from './FormFields';

interface RequestTestStepProps {
  foroId: bigint;
}

export function RequestTestStep({ foroId }: RequestTestStepProps) {
  const {
    amount,
    setAmount,
    running,
    txHash,
    testJobId,
    error,
    handleRequestTest,
  } = useRequestTest({ foroId });

  if (txHash) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <svg
            className="h-5 w-5 flex-shrink-0 text-accent"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-mono text-sm text-text-primary">Test requested successfully</span>
        </div>

        <div className="rounded-md border border-border-subtle bg-bg-secondary px-4 py-3 font-mono text-xs text-text-secondary space-y-1.5">
          <div className="flex gap-2">
            <span className="text-text-muted">Foro ID</span>
            <span>{foroId.toString()}</span>
          </div>
          {testJobId !== null && (
            <div className="flex gap-2">
              <span className="text-text-muted">Test Job ID</span>
              <span>{testJobId.toString()}</span>
            </div>
          )}
          <div className="flex gap-2">
            <span className="text-text-muted">Tx</span>
            <a
              href={`${process.env.NEXT_PUBLIC_CHAIN_EXPLORER}/txns/${txHash}/overview`}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate text-text-secondary underline hover:text-text-primary"
            >
              {txHash}
            </a>
          </div>
        </div>

        <p className="font-mono text-xs text-text-muted">
          A keeper will claim the job, run the evaluation, and submit results on-chain.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <FieldLabel>Foro ID</FieldLabel>
        <FieldInput
          value={foroId.toString()}
          onChange={() => {}}
          disabled
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <FieldLabel>Test Fee (ETH)</FieldLabel>
        <FieldInput
          value={amount}
          onChange={setAmount}
          placeholder="0.001"
          disabled={running}
        />
        <p className="font-mono text-[11px] text-text-muted">
          Minimum fee paid to the keeper for running the evaluation.
        </p>
      </div>

      {error && (
        <p className="rounded-md border border-error/30 bg-error/10 px-3 py-2 font-mono text-xs text-error">
          {error}
        </p>
      )}

      <Button
        variant="primary"
        size="md"
        disabled={running || !amount}
        onClick={() => { void handleRequestTest(); }}
      >
        {running ? 'Requesting…' : 'Request Test'}
      </Button>
    </div>
  );
}
