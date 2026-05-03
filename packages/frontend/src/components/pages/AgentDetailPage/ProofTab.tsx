'use client';

import { Text } from '@/components/atoms';
import type { ForoDetailAgent } from '@/lib/constants/types';

function Row({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="flex flex-col gap-1.5 border-b border-border-subtle py-2.5">
      <Text variant="bodySmall" color="muted" className="whitespace-nowrap text-xs">
        {label}
      </Text>
      <span className="break-all font-mono text-xs text-text-tertiary">
        {value ?? '—'}
      </span>
    </div>
  );
}

export function ProofTab({ agent }: { agent: ForoDetailAgent }) {
  const rows = [
    { label: 'chatId (0G Compute)', value: agent.chatId },
    {
      label: 'TEE Verified',
      value: agent.teeVerified !== undefined ? String(agent.teeVerified) : undefined,
    },
    {
      label: 'Avg Latency',
      value: agent.avgLatencyMs !== undefined ? `${agent.avgLatencyMs}ms` : undefined,
    },
    { label: 'Latency Score', value: agent.latencyScore },
    { label: 'Quality Score', value: agent.qualityScore },
    { label: 'Submitted', value: agent.block },
    { label: 'Network', value: '0G-Galileo-Testnet' },
  ];

  return (
    <div>
      {rows.map(r => (
        <Row key={r.label} label={r.label} value={r.value} />
      ))}
    </div>
  );
}
