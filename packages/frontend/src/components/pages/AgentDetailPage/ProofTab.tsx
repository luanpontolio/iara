'use client';

import { Text } from '@/components/atoms';
import type { ForoDetailAgent } from '@/lib/constants/types';

export function ProofTab({ agent }: { agent: ForoDetailAgent }) {
  if (agent.phase !== 'settled') {
    return (
      <div className="flex flex-col items-center gap-2 py-10">
        <Text variant="bodySmall" color="muted" className="text-[13px]">
          TEE proof will appear here once the test settles.
        </Text>
        <Text variant="code" color="disabled" className="text-[11px]">
          chatId · enclave signature · block anchor
        </Text>
      </div>
    );
  }

  const rows = [
    { label: 'chatId (0G Compute)', value: agent.chatId },
    { label: 'Block', value: agent.block },
    { label: 'Network', value: '0G-Galileo-Testnet' },
    { label: 'Verified off-chain', value: 'true' },
  ];

  return (
    <div>
      {rows.map(r => (
        <div
          key={r.label}
          className="flex items-baseline justify-between border-b border-border-subtle py-2.5"
        >
          <Text variant="bodySmall" color="muted" className="text-xs">
            {r.label}
          </Text>
          <Text variant="code" color="tertiary" className="text-xs">
            {r.value ?? '—'}
          </Text>
        </div>
      ))}
    </div>
  );
}
