'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/atoms';
import { Badge } from '@/components/atoms';
import { Text } from '@/components/atoms';
import type { ForoDetailAgent } from '@/lib/constants/types';
import { DetailProgressBar } from './DetailProgressBar';

function HeaderCenter({ agent }: { agent: ForoDetailAgent }) {
  if (agent.phase === 'queued') {
    return (
      <Text variant="bodySmall" color="tertiary" className="block text-center text-sm">
        Waiting for a Keeper
      </Text>
    );
  }
  if (agent.phase === 'running') {
    return (
      <Text variant="bodySmall" color="info" className="block text-center text-sm">
        Started {agent.startedAt}
      </Text>
    );
  }
  return (
    <div className="flex items-center justify-center">
      <Badge variant={agent.badgeStatus} size="md" showDot={false} />
    </div>
  );
}

export function DetailHeader({ agent }: { agent: ForoDetailAgent }) {
  const router = useRouter();

  return (
    <header className="relative shrink-0">
      <div className="grid h-[60px] grid-cols-[1fr_auto_1fr] items-center px-8">
        <button
          type="button"
          onClick={() => router.push('/app')}
          className="cursor-pointer justify-self-start border-none bg-transparent p-0 font-serif text-[22px] font-bold uppercase italic leading-none text-text-primary"
        >
          FORO
        </button>
        <HeaderCenter agent={agent} />
        <div className="justify-self-end">
          {agent.phase === 'queued' ? (
            <Button variant="primary" size="sm">
              Register a Keeper
            </Button>
          ) : null}
        </div>
      </div>
      <DetailProgressBar agent={agent} />
    </header>
  );
}
