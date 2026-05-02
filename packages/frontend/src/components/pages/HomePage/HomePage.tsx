'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/atoms';
import { AgentCard } from '@/components/organisms';
import { Header } from '@/components/organisms';
import { pluralize } from '@/lib';
import { ColumnDivider } from './ColumnDivider';
import { ColumnCount, SubHeader } from './columnHelpers';
import { DonePanel } from './DonePanel';
import { QueuePanel } from './QueuePanel';
import { HOME_FAILED, HOME_LIVE, HOME_VERIFIED, HOME_WAITING } from './data';

export function HomePage() {
  const router = useRouter();
  const [queueOpen, setQueueOpen] = useState(false);
  const [doneOpen, setDoneOpen] = useState(false);

  const settledCount = HOME_VERIFIED.length + HOME_FAILED.length;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-bg-primary">
      <Header
        title="FORO"
        onLogoClick={() => router.push('/')}
        actions={
          <>
            <Button variant="ghost" size="md">
              Register as Keeper
            </Button>
            <Button variant="primary" size="md">
              Verify my agent
            </Button>
          </>
        }
        className="border-b border-border-subtle"
      />

      <div className="flex flex-1 justify-center overflow-hidden">
        <div className="grid h-full w-full max-w-[920px] grid-cols-[1fr_48px_1fr_48px_1fr]">
          {/* Col 1: Waiting / Queue */}
          <div className="flex flex-col overflow-hidden">
            <div className="flex h-14 flex-shrink-0 items-center justify-center">
              {!queueOpen && (
                <ColumnCount count={HOME_WAITING.length} label={`${pluralize(HOME_WAITING.length, 'agent')} queued`} />
              )}
            </div>
            <div className="scrollbar-thin flex-1 overflow-y-auto">
              {queueOpen ? (
                <QueuePanel
                  onContinue={() => {
                    setQueueOpen(false);
                    setDoneOpen(true);
                  }}
                />
              ) : (
                <div className="flex flex-col gap-2 px-5 pb-6">
                  {HOME_WAITING.map(a => (
                    <AgentCard
                      key={a.id}
                      agent={a}
                      variant="waiting"
                      onClick={() => router.push(`/${a.id}`)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <ColumnDivider
            label="Queue"
            active={queueOpen}
            onClick={() => {
              setQueueOpen(v => !v);
              setDoneOpen(false);
            }}
          />

          {/* Col 2: Live */}
          <div className="flex flex-col overflow-hidden">
            <div className="flex h-14 flex-shrink-0 items-center justify-center">
              <ColumnCount count={HOME_LIVE.length} label={`${pluralize(HOME_LIVE.length, 'agent')} running`} />
            </div>
            <div className="scrollbar-thin flex flex-1 flex-col gap-2 overflow-y-auto px-5 pb-6">
              {HOME_LIVE.map(a => (
                <AgentCard key={a.id} agent={a} variant="live" onClick={() => router.push(`/${a.id}`)} />
              ))}
            </div>
          </div>

          <ColumnDivider
            label="Done"
            active={doneOpen}
            onClick={() => {
              setDoneOpen(v => !v);
              setQueueOpen(false);
            }}
          />

          {/* Col 3: Settled */}
          <div className="flex flex-col overflow-hidden">
            <div className="flex h-14 flex-shrink-0 items-center justify-center">
              {!doneOpen && (
                <ColumnCount count={settledCount} label={`${pluralize(settledCount, 'agent')} settled`} />
              )}
            </div>
            <div className="scrollbar-thin flex-1 overflow-y-auto">
              {doneOpen ? (
                <DonePanel onClose={() => setDoneOpen(false)} />
              ) : (
                <div className="px-5 pb-6">
                  <div className="flex flex-col gap-2">
                    {HOME_VERIFIED.map(a => (
                      <AgentCard
                        key={a.id}
                        agent={a}
                        variant="result"
                        onClick={() => router.push(`/${a.id}`)}
                      />
                    ))}
                  </div>
                  {HOME_FAILED.length > 0 && (
                    <>
                      <SubHeader count={HOME_FAILED.length} label={`failed ${pluralize(HOME_FAILED.length, 'agent')}`} />
                      <div className="flex flex-col gap-2">
                        {HOME_FAILED.map(a => (
                          <AgentCard
                            key={a.id}
                            agent={a}
                            variant="result"
                            onClick={() => router.push(`/${a.id}`)}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
