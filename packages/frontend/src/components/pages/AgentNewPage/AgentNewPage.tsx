'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/organisms';
import { cn } from '@/lib/utils/styles';
import { RegisterAgentStep } from './RegisterAgentStep';
import { RequestTestStep } from './RequestTestStep';

export function AgentNewPage() {
  const router = useRouter();
  const [foroId, setForoId] = useState<bigint | null>(null);

  const step = foroId === null ? 1 : 2;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-bg-primary">
      <Header
        title="FORO"
        onLogoClick={() => router.push('/')}
        className="border-b border-border-subtle"
      />

      <div className="flex flex-1 items-start justify-center overflow-y-auto py-12 px-4">
        <div className="w-full max-w-[540px]">
          <div className="mb-8 flex items-center gap-0">
            {[1, 2].map((s, i) => (
              <div key={s} className="flex items-center">
                {i > 0 && (
                  <div
                    className={cn(
                      'h-px w-10 transition-colors',
                      step > i ? 'bg-accent' : 'bg-border-default'
                    )}
                  />
                )}
                <div
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full font-mono text-xs font-medium transition-colors',
                    step === s && 'bg-accent text-bg-primary',
                    step > s && 'bg-accent/20 text-accent',
                    step < s && 'border border-border-default text-text-muted'
                  )}
                >
                  {step > s ? (
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    s
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mb-8">
            <h1 className="font-sans text-lg font-medium text-text-primary">
              {step === 1 ? 'Register Agent' : 'Request Test'}
            </h1>
            <p className="mt-1 font-mono text-xs text-text-muted">
              {step === 1
                ? 'Mint an ERC-8004 token, set metadata, and register your agent on ForoRegistry.'
                : 'Pay the test fee to trigger an on-chain evaluation by a keeper.'}
            </p>
          </div>

          {step === 1 ? (
            <RegisterAgentStep onSuccess={id => setForoId(id)} />
          ) : foroId !== null ? (
            <RequestTestStep foroId={foroId} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
