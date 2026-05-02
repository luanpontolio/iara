'use client';

/**
 * useAgentList
 *
 * Fetches live on-chain data for all registered agents via a single wagmi
 * multicall (useReadContracts batches every getAgent(foroId) call together).
 *
 * The list of agents to query is provided by useAgentIndexer, which
 * continuously polls ForoRegistry for AgentRegistered events and resolves
 * each agent's name from its ERC-8004 metadata. This replaces the previous
 * static REGISTERED_AGENTS constant.
 *
 * Returns agents bucketed into the four columns shown on the HomePage:
 *   waiting  → on-chain PENDING   (0)
 *   live     → on-chain PROBATION (1)
 *   verified → on-chain VERIFIED (2) or ELITE (3)
 *   failed   → on-chain FAILED   (4)
 */

import { useMemo } from 'react';
import { useReadContracts } from 'wagmi';
import { FORO_REGISTRY_ABI } from '@/contracts/abis/foroRegistry';
import type { Agent, AgentStatus } from '@/lib/constants/types';
import { zgNewtonTestnet } from '@/lib/wagmi';
import { useAgentIndexer } from './useAgentIndexer';

const FORO_REGISTRY_ADDRESS = (
  process.env.NEXT_PUBLIC_FORO_REGISTRY_ADDRESS ?? '0x'
) as `0x${string}`;

// Total test cases defined in the agent contract schema.
const TOTAL_TESTS = 14;

// Maps the on-chain uint8 status to the AgentStatus union used by the UI.
const ON_CHAIN_STATUS: AgentStatus[] = [
  'pending',   // 0
  'live',      // 1  (PROBATION → shown as "live" in the UI)
  'verified',  // 2
  'elite',     // 3
  'failed',    // 4
];

interface AgentOnChain {
  foroId: bigint;
  erc8004Address: `0x${string}`;
  erc8004AgentId: bigint;
  contractHash: `0x${string}`;
  creatorWallet: `0x${string}`;
  status: number;
  testCount: bigint;
  cumulativeScore: bigint;
  registrationTimestamp: bigint;
}

function formatScore(cumulativeScore: bigint, testCount: bigint): string {
  if (testCount === 0n) return '—';
  // cumulativeScore is stored as a scaled integer (×1e18 or ×100 depending on
  // the contract). Treat it as a percentage 0–100 and normalise to 0–1.
  const avg = Number(cumulativeScore) / Number(testCount);
  // If the value is already in 0–1 range (common for score×1e0), use it
  // directly; otherwise divide by 100.
  const normalised = avg > 1 ? avg / 100 : avg;
  return normalised.toFixed(2);
}

function formatAddress(addr: `0x${string}`): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function toAgent(raw: AgentOnChain, name: string): Agent {
  const status = ON_CHAIN_STATUS[raw.status] ?? 'pending';
  const score = formatScore(raw.cumulativeScore, raw.testCount);
  const tests = `${raw.testCount.toString()}/${TOTAL_TESTS}`;
  const addrShort = formatAddress(raw.erc8004Address);

  return {
    id: Number(raw.foroId),
    name,
    foroId: `foro_${addrShort}`,
    fullAddress: raw.erc8004Address,
    score,
    tests,
    latency: '—',
    block: '—',
    status,
  };
}

export interface UseAgentListReturn {
  waiting: Agent[];
  live: Agent[];
  verified: Agent[];
  failed: Agent[];
  isLoading: boolean;
  isError: boolean;
}

export function useAgentList(): UseAgentListReturn {
  const { agents, isIndexing } = useAgentIndexer();

  const contracts = useMemo(
    () =>
      agents.map(({ foroId }) => ({
        address: FORO_REGISTRY_ADDRESS,
        abi: FORO_REGISTRY_ABI,
        functionName: 'getAgent' as const,
        args: [foroId] as const,
        chainId: zgNewtonTestnet.id,
      })),
    [agents],
  );

  const { data, isLoading: contractsLoading, isError } = useReadContracts({ contracts });

  const { waiting, live, verified, failed } = useMemo(() => {
    const buckets: UseAgentListReturn = {
      waiting: [],
      live: [],
      verified: [],
      failed: [],
      isLoading: false,
      isError: false,
    };

    if (!data) return buckets;

    data.forEach((result, idx) => {
      if (result.status !== 'success' || !result.result) return;

      const raw = result.result as AgentOnChain;
      const name = agents[idx]?.name ?? `agent-${idx}`;
      const agent = toAgent(raw, name);

      if (agent.status === 'pending') buckets.waiting.push(agent);
      else if (agent.status === 'live') buckets.live.push(agent);
      else if (agent.status === 'verified' || agent.status === 'elite') buckets.verified.push(agent);
      else if (agent.status === 'failed') buckets.failed.push(agent);
    });

    return buckets;
  }, [data, agents]);

  return {
    waiting,
    live,
    verified,
    failed,
    isLoading: contractsLoading || isIndexing,
    isError,
  };
}
