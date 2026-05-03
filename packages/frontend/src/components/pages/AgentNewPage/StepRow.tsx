import type { TxStep } from '@/hooks/useAgentRegister';
import { cn } from '@/lib/utils/styles';

interface StepRowProps {
  step: TxStep;
  index: number;
}

export function StepRow({ step, index }: StepRowProps) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center">
        {step.status === 'idle' && (
          <span className="h-1.5 w-1.5 rounded-full bg-border-default" />
        )}
        {step.status === 'pending' && (
          <svg
            className="h-4 w-4 animate-spin text-accent"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {step.status === 'done' && (
          <svg
            className="h-4 w-4 text-accent"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
        {step.status === 'error' && (
          <svg
            className="h-4 w-4 text-error"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </div>
      <span
        className={cn(
          'font-mono text-xs',
          step.status === 'idle' && 'text-text-muted',
          step.status === 'pending' && 'text-text-primary',
          step.status === 'done' && 'text-text-secondary',
          step.status === 'error' && 'text-error'
        )}
      >
        {index + 1}. {step.label}
      </span>
      {step.txHash && (
        <a
          href={`${process.env.NEXT_PUBLIC_CHAIN_EXPLORER}/txns/${step.txHash}/overview`}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto font-mono text-[10px] text-text-muted underline hover:text-text-secondary"
        >
          {step.txHash.slice(0, 8)}…
        </a>
      )}
    </div>
  );
}
