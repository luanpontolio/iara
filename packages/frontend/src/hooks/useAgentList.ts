'use client';

/**
 * useAgentList
 *
 * Fetches live on-chain data for all registered agents via three rounds of
 * wagmi multicalls (useReadContracts batches each round into a single call):
 *
 * Round 1 — getAgent(foroId) per agent → identity, AgentStatus, score
 * Round 2 — getLatestTestJobId(foroId) per agent → latest job ID
 * Round 3 — getTestJob(jobId) per agent → JobStatus (used to override display)
 *
 * The list of agents to query is provided by useAgentIndexer, which
 * continuously polls ForoRegistry for AgentRegistered events and resolves
 * each agent's name from its ERC-8004 metadata.
 *
 * Returns agents bucketed into the four columns shown on the HomePage:
 *   waiting  → PENDING or (PROBATION + terminal job — idle between tests)
 *   live     → PROBATION with an active job currently running
 *   verified → VERIFIED or ELITE
 *   failed   → FAILED
 *
 * Status displayed on each card is also derived from JobStatus so that
 * a PROBATION agent whose job is FINALIZED shows 'pending' rather than 'live'.
 */

import { useMemo } from 'react';
import { useReadContracts } from 'wagmi';
import { formatEther } from 'viem';
import { FORO_REGISTRY_ABI } from '@/contracts/abis/foroRegistry';
import type { Agent, AgentStatus } from '@/lib/constants/types';
import { zgNewtonTestnet } from '@/lib/wagmi';
import { useAgentIndexer } from './useAgentIndexer';

const FORO_REGISTRY_ADDRESS = (
  process.env.NEXT_PUBLIC_FORO_REGISTRY_ADDRESS ?? '0x'
) as `0x${string}`;

// Maps the on-chain AgentStatus uint8 to the UI AgentStatus string.
const ON_CHAIN_STATUS: AgentStatus[] = [
  'pending',   // 0 PENDING
  'live',      // 1 PROBATION
  'verified',  // 2 VERIFIED
  'elite',     // 3 ELITE
  'failed',    // 4 FAILED
];

// JobStatus values whose presence means the latest test is over and the agent
// is idle — waiting for a new test request.
// const TERMINAL_JOB_STATUSES = new Set([5, 6, 7]); // FINALIZED, REFUNDED, FAILED

// JobStatus values that indicate an active test is in progress.
// const ACTIVE_JOB_STATUSES = new Set([0, 1, 2, 3, 4]); // REQUESTED…CONTESTED

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

interface JobOnChain {
  foroId: bigint;
  status: number;
  testFee: bigint;
  keeperAddress: `0x${string}`;
  commitTimestamp: bigint;
  revealTimestamp: bigint;
}

interface TestResultOnChain {
  foroId: bigint;
  score: bigint;
  latencyScore: bigint;
  qualityScore: bigint;
  avgLatencyMs: bigint;
  rounds: bigint;
  chatId: `0x${string}`;
  teeVerified: boolean;
  submissionTimestamp: bigint;
  finalized: boolean;
}

const SUBMITTED_JOB_STATUS = 3; // JobStatus.SUBMITTED

function formatScore(cumulativeScore: bigint, testCount: bigint): string {
  if (testCount === 0n) return '—';
  const avg = Number(cumulativeScore) / Number(testCount);
  const normalised = avg > 1 ? avg / 100 : avg;
  return normalised.toFixed(2);
}

function formatAddress(addr: `0x${string}`): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function toAgent(raw: AgentOnChain, name: string): Agent {
  const status = ON_CHAIN_STATUS[raw.status] ?? 'pending';
  const score = formatScore(raw.cumulativeScore, raw.testCount);
  const tests = raw.testCount.toString();
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

  // Round 1: agent identity + AgentStatus.
  const agentContracts = useMemo(
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

  const { data: agentData, isLoading: agentsLoading, isError } = useReadContracts({
    contracts: agentContracts,
  });

  // Round 2: latest job ID per agent (index-aligned with agentContracts).
  const jobIdContracts = useMemo(
    () =>
      agents.map(({ foroId }) => ({
        address: FORO_REGISTRY_ADDRESS,
        abi: FORO_REGISTRY_ABI,
        functionName: 'getLatestTestJobId' as const,
        args: [foroId] as const,
        chainId: zgNewtonTestnet.id,
      })),
    [agents],
  );

  const { data: jobIdData, isLoading: jobIdsLoading } = useReadContracts({
    contracts: jobIdContracts,
    query: { enabled: agents.length > 0 },
  });

  // Round 3: job struct for each resolved job ID (index-aligned).
  // jobId=0n returns an empty struct (foroId===0n) — safe to query.
  const jobContracts = useMemo(() => {
    if (!jobIdData) return [];
    return jobIdData.map((result) => {
      const jobId = result.status === 'success' ? result.result : 0n;
      return {
        address: FORO_REGISTRY_ADDRESS,
        abi: FORO_REGISTRY_ABI,
        functionName: 'getTestJob' as const,
        args: [jobId] as const,
        chainId: zgNewtonTestnet.id,
      };
    });
  }, [jobIdData]);

  const { data: jobData, isLoading: jobsLoading } = useReadContracts({
    contracts: jobContracts,
    query: { enabled: jobContracts.length > 0 },
  });

  // Round 4: test result for each resolved job ID (index-aligned with jobContracts).
  const resultContracts = useMemo(() => {
    if (!jobIdData) return [];
    return jobIdData.map((result) => {
      const jobId = result.status === 'success' ? result.result : 0n;
      return {
        address: FORO_REGISTRY_ADDRESS,
        abi: FORO_REGISTRY_ABI,
        functionName: 'getTestResult' as const,
        args: [jobId] as const,
        chainId: zgNewtonTestnet.id,
      };
    });
  }, [jobIdData]);

  const { data: resultData, isLoading: resultsLoading } = useReadContracts({
    contracts: resultContracts,
    query: { enabled: resultContracts.length > 0 },
  });

  

  const { waiting, live, verified, failed } = useMemo(() => {
    const buckets: UseAgentListReturn = {
      waiting: [],
      live: [],
      verified: [],
      failed: [],
      isLoading: false,
      isError: false,
    };

    if (!agentData) return buckets;

    agentData.forEach((result, idx) => {
      if (result.status !== 'success' || !result.result) return;

      const raw = result.result as AgentOnChain;
      const name = agents[idx]?.name ?? `agent-${idx}`;

      const agent = toAgent(raw, name);

      const jobResult = jobData?.[idx];
      const job = jobResult?.status === 'success' ? (jobResult.result as JobOnChain) : undefined;

      const resultResult = resultData?.[idx];
      const testResult = resultResult?.status === 'success' ? (resultResult.result as TestResultOnChain) : undefined;

      if (job) {
        agent.testFee = formatEther(job.testFee);
        agent.keeper = formatAddress(job.keeperAddress);
      }
      if (testResult) {
        agent.lastJobScore = formatScore(testResult.score, 1n);
        agent.latencyScore = testResult.latencyScore.toString();
        agent.qualityScore = testResult.qualityScore.toString();
        agent.avgLatencyMs = Number(testResult.avgLatencyMs);
        agent.teeVerified = testResult.teeVerified;
        agent.tests = testResult.rounds.toString();
      }

      if (job?.status === SUBMITTED_JOB_STATUS) {
        buckets.live.push(agent);
      } else if (agent.status === 'pending') {
        buckets.waiting.push(agent);
      } else if (agent.status === 'verified' || agent.status === 'elite') {
        buckets.verified.push(agent);
      } else if (agent.status === 'failed') {
        buckets.failed.push(agent);
      }
    });

    return buckets;
  }, [agentData, agents, jobData, resultData]);

  return {
    waiting,
    live,
    verified,
    failed,
    isLoading: agentsLoading || isIndexing || jobIdsLoading || jobsLoading || resultsLoading,
    isError,
  };
}
