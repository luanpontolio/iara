import type { Agent } from '@/lib/constants/types';

export const HOME_WAITING: Agent[] = [
  { id: 10, name: 'theta-agent-4', foroId: 'foro_0x1a2b…3c4d', fullAddress: '0x1a2b3c4d', score: '—', tests: '0/14', latency: '—', block: '—', status: 'pending', testFee: '1.00 USDC' },
  { id: 11, name: 'iota-agent-1', foroId: 'foro_0x5e6f…7a8b', fullAddress: '0x5e6f7a8b', score: '—', tests: '0/14', latency: '—', block: '—', status: 'pending', testFee: '2.00 USDC' },
  { id: 12, name: 'kappa-agent-9', foroId: 'foro_0x9c0d…1e2f', fullAddress: '0x9c0d1e2f', score: '—', tests: '0/14', latency: '—', block: '—', status: 'pending', testFee: '0.80 USDC' },
  { id: 13, name: 'lambda-agent-3', foroId: 'foro_0x3a4b…5c6d', fullAddress: '0x3a4b5c6d', score: '—', tests: '0/14', latency: '—', block: '—', status: 'pending', testFee: '10.00 USDC' },
];

export const HOME_LIVE: Agent[] = [
  { id: 20, name: 'mu-agent-7', foroId: 'foro_0x7e8f…9a0b', fullAddress: '0x7e8f9a0b', score: '0.71', tests: '10/14', latency: '156ms', block: '—', status: 'live', elapsedTime: '2 min' },
  { id: 21, name: 'nu-agent-2', foroId: 'foro_0xb1c2…d3e4', fullAddress: '0xb1c2d3e4', score: '0.55', tests: '7/14', latency: '220ms', block: '—', status: 'live', elapsedTime: '5 min' },
  { id: 22, name: 'xi-agent-5', foroId: 'foro_0xe5f6…a7b8', fullAddress: '0xe5f6a7b8', score: '0.83', tests: '11/14', latency: '189ms', block: '—', status: 'live', elapsedTime: '6 min' },
];

export const HOME_VERIFIED: Agent[] = [
  { id: 1, name: 'alpha-agent-7', foroId: 'foro_0x4a3f…c91b', fullAddress: '0x4a3f8c2d', score: '0.97', tests: '14/14', latency: '142ms', block: '#21,304,991', status: 'elite' },
  { id: 3, name: 'gamma-agent-1', foroId: 'foro_0x2c8a…7d40', fullAddress: '0x2c8a3f1b', score: '0.89', tests: '12/14', latency: '205ms', block: '#21,304,988', status: 'verified' },
];

export const HOME_FAILED: Agent[] = [
  { id: 2, name: 'beta-agent-2', foroId: 'foro_0x9b1e…f302', fullAddress: '0x9b1ef302', score: '0.41', tests: '6/14', latency: '831ms', block: '#21,304,990', status: 'failed' },
];
