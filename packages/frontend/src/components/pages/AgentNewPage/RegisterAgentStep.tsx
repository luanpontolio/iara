'use client';

import { Button } from '@/components/atoms';
import { useAgentRegister } from '@/hooks/useAgentRegister';
import { FieldLabel, FieldInput, FieldTextarea } from './FormFields';
import { StepRow } from './StepRow';

interface RegisterAgentStepProps {
  onSuccess: (foroId: bigint) => void;
}

export function RegisterAgentStep({ onSuccess }: RegisterAgentStepProps) {
  const {
    erc8004Address,
    setErc8004Address,
    endpointUrl,
    setEndpointUrl,
    contractJson,
    setContractJson,
    steps,
    running,
    error,
    anyTxStarted,
    handleRegister,
    walletClient,
  } = useAgentRegister({ onSuccess });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <FieldLabel>ERC-8004 Contract Address</FieldLabel>
        <FieldInput
          value={erc8004Address}
          onChange={setErc8004Address}
          placeholder="0x…"
          disabled={running}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <FieldLabel>Agent Endpoint URL</FieldLabel>
        <FieldInput
          value={endpointUrl}
          onChange={setEndpointUrl}
          placeholder="http://localhost:3001/summarize"
          disabled={running}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <FieldLabel>Agent Contract JSON</FieldLabel>
        <FieldTextarea
          value={contractJson}
          onChange={setContractJson}
          placeholder={'{\n  "category": "url-summarizer",\n  "version": "1.0.0",\n  "testCases": []\n}'}
          disabled={running}
        />
      </div>

      {anyTxStarted && (
        <div className="rounded-md border border-border-subtle bg-bg-secondary px-4 py-3">
          {steps.map((step, i) => (
            <StepRow key={i} step={step} index={i} />
          ))}
        </div>
      )}

      {error && (
        <p className="rounded-md border border-error/30 bg-error/10 px-3 py-2 font-mono text-sm text-error">
          {error}
        </p>
      )}

      <Button
        variant="primary"
        size="md"
        disabled={running || !walletClient || !erc8004Address || !endpointUrl || !contractJson}
        onClick={() => { void handleRegister(); }}
        title={!walletClient ? 'Connect your wallet via the header first' : undefined}
      >
        {running ? 'Registering…' : 'Save'}
      </Button>
    </div>
  );
}
