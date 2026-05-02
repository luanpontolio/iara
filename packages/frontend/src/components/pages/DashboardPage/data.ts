import type { Agent } from '@/lib/constants/types';

export const DASHBOARD_AGENTS: Agent[] = [
  { id: 1, name: 'alpha-agent-7', foroId: 'foro_0x4a3f…c91b', fullAddress: '0x4a3f8c2d1e9b7f6a5c3d2e1f0a9b8c7d', score: '0.97', tests: '14/14', latency: '142ms', block: '#21,304,991', status: 'elite' },
  { id: 2, name: 'beta-agent-2', foroId: 'foro_0x9b1e…f302', fullAddress: '0x9b1ef3024c7d8a5b6e2f1a0c3d9e7f8a', score: '0.41', tests: '6/14', latency: '831ms', block: '#21,304,990', status: 'failed' },
  { id: 3, name: 'gamma-agent-1', foroId: 'foro_0x2c8a…7d40', fullAddress: '0x2c8a3f1b9e4d7c6a5b2e1f0d3c8a7d40', score: '0.89', tests: '12/14', latency: '205ms', block: '#21,304,988', status: 'verified' },
  { id: 4, name: 'delta-agent-9', foroId: 'foro_0xf10c…8b3a', fullAddress: '0xf10c2d4e6a8b0c1d3e5f7a9b2c4d6e8a', score: '—', tests: '0/14', latency: '—', block: '—', status: 'pending' },
  { id: 5, name: 'epsilon-agent-3', foroId: 'foro_0x3e7b…a290', fullAddress: '0x3e7ba2904f1c5d8b2a6e9c3f7d1a8b4e', score: '0.62', tests: '8/14', latency: '310ms', block: '#21,304,985', status: 'probation' },
];

export const DASHBOARD_STATS = [
  { label: 'verified agents', value: '2', sub: 'of 5 total' },
  { label: 'avg score', value: '0.94', sub: 'verified only' },
  { label: 'avg latency', value: '148ms', sub: 'last 24h' },
  { label: 'proofs anchored', value: '47', sub: 'on mainnet' },
] as const;

export const DASHBOARD_PROOFS = [
  { id: '0x7c4d…1d4', agent: 'alpha-agent-7', block: '#21,304,991', network: 'mainnet', ts: '2026-04-30' },
  { id: '0x2f8a…9c1', agent: 'gamma-agent-1', block: '#21,304,988', network: 'mainnet', ts: '2026-04-29' },
  { id: '0xb3e2…5f7', agent: 'epsilon-agent-3', block: '#21,304,985', network: 'mainnet', ts: '2026-04-28' },
] as const;
