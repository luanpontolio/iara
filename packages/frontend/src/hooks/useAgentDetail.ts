'use client';

/**
 * useAgentDetail
 *
 * Fetches all on-chain data for a single agent by foroId using two rounds of
 * contract reads:
 *
 * Round 1 — single multicall (3 ForoRegistry reads batched together):
 *   getAgent(foroId)      → identity, status, score, timestamps
 *   getTestJob(foroId)    → fee, keeper, job lifecycle timestamps and status
 *   getTestResult(foroId) → TEE proof, scores, latency
 *
 * Round 2 — single read (enabled once Round 1 resolves erc8004 info):
 *   ERC-8004 getMetadata(agentId, 'foro:contract') → agent name (JSON)
 *
 * Returns a `ForoDetailAgent` ready to render in AgentDetailPage.
 */

import { useEffect, useMemo, useState } from 'react';
import { formatEther, hexToString } from 'viem';
import { usePublicClient, useReadContract, useReadContracts } from 'wagmi';
import { AGENT_VAULT_ABI } from '@/contracts/abis/agentVault';
import { ERC8004_ABI } from '@/contracts/abis/erc8004';
import { FORO_REGISTRY_ABI } from '@/contracts/abis/foroRegistry';
import type { AgentStatus, ForoDetailAgent, ForoPhase } from '@/lib/constants/types';
import { zgNewtonTestnet } from '@/lib/wagmi';

const FORO_REGISTRY_ADDRESS = (
  process.env.NEXT_PUBLIC_FORO_REGISTRY_ADDRESS ?? '0x'
) as `0x${string}`;

// Index 6 = AgentRegistered event (mirrors useAgentIndexer).
const AGENT_REGISTERED_EVENT = FORO_REGISTRY_ABI[6];
const DEPLOY_BLOCK = 31011609n;


const AGENT_VAULT_ADDRESS = (
  process.env.NEXT_PUBLIC_AGENT_VAULT_ADDRESS ?? '0x'
) as `0x${string}`;

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;
const ZERO_BYTES32 =
  '0x0000000000000000000000000000000000000000000000000000000000000000' as const;

// Maps on-chain AgentStatus uint8 to UI AgentStatus string.
const ON_CHAIN_STATUS: AgentStatus[] = [
  'pending',  // 0 PENDING
  'live',     // 1 PROBATION
  'verified', // 2 VERIFIED
  'elite',    // 3 ELITE
  'failed',   // 4 FAILED
];

// Maps on-chain AgentStatus uint8 to ForoPhase string.
const ON_CHAIN_PHASE: ForoPhase[] = [
  'queued',   // 0
  'running',  // 1
  'settled',  // 2
  'settled',  // 3
  'settled',  // 4
];

// Maps on-chain JobStatus uint8 to the step label shown in DetailHeader.
const JOB_STEP: Array<'committed' | 'revealed' | 'submitted' | undefined> = [
  undefined,   // 0 REQUESTED
  'committed', // 1 COMMITTED
  'revealed',  // 2 REVEALED
  'submitted', // 3 SUBMITTED
  'submitted', // 4 CONTESTED
  'submitted', // 5 FINALIZED
  undefined,   // 6 REFUNDED
  undefined,   // 7 FAILED
];

function formatAddress(addr: `0x${string}` | undefined): string | undefined {
  if (!addr || addr === ZERO_ADDRESS) return undefined;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatFee(wei: bigint): string {
  const val = parseFloat(formatEther(wei));
  return `${val.toFixed(4)} 0G`;
}

function normaliseScore(raw: bigint): string {
  const v = Number(raw);
  if (v === 0) return '0.00';
  return (v > 1 ? v / 100 : v).toFixed(2);
}

function formatScore(cumulativeScore: bigint, testCount: bigint): string | undefined {
  if (testCount === 0n) return undefined;
  const avg = Number(cumulativeScore) / Number(testCount);
  const normalised = avg > 1 ? avg / 100 : avg;
  return normalised.toFixed(2);
}

function relativeTime(timestamp: bigint): string | undefined {
  const ts = Number(timestamp);
  if (ts === 0) return undefined;
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export interface UseAgentDetailReturn {
  agent: ForoDetailAgent | null;
  isLoading: boolean;
  isError: boolean;
}

export function useAgentDetail(foroId: number): UseAgentDetailReturn {
  const foroIdBig = BigInt(foroId);
  const publicClient = usePublicClient({ chainId: zgNewtonTestnet.id });
  const [registrationTxHash, setRegistrationTxHash] = useState<`0x${string}` | undefined>();

  useEffect(() => {
    if (!publicClient || foroId <= 0) return;
    let cancelled = false;
    publicClient.getLogs({
      address: FORO_REGISTRY_ADDRESS,
      event: AGENT_REGISTERED_EVENT,
      args: { foroId: BigInt(foroId) },
      fromBlock: DEPLOY_BLOCK,
      toBlock: 'latest',
    }).then(logs => {
      if (!cancelled) setRegistrationTxHash(logs[0]?.transactionHash);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [publicClient, foroId]);

  // Round 1: fetch agent data.
  const { data: round1, isLoading: r1Loading, isError: r1Error } = useReadContracts({
    contracts: [
      {
        address: FORO_REGISTRY_ADDRESS,
        abi: FORO_REGISTRY_ABI,
        functionName: 'getAgent' as const,
        args: [foroIdBig] as const,
        chainId: zgNewtonTestnet.id,
      },
    ],
  });

  const agentRaw = round1?.[0]?.status === 'success'
    ? (round1[0].result as {
        foroId: bigint;
        erc8004Address: `0x${string}`;
        erc8004AgentId: bigint;
        contractHash: `0x${string}`;
        creatorWallet: `0x${string}`;
        status: number;
        testCount: bigint;
        cumulativeScore: bigint;
        registrationTimestamp: bigint;
      })
    : undefined;

  // Round 2: resolve the latest job ID for this agent (separate counter from agentId).
  const { data: latestJobIdData, isLoading: r2Loading } = useReadContract({
    address: FORO_REGISTRY_ADDRESS,
    abi: FORO_REGISTRY_ABI,
    functionName: 'getLatestTestJobId' as const,
    args: [foroIdBig] as const,
    chainId: zgNewtonTestnet.id,
    query: { enabled: !!agentRaw },
  });

  const latestJobId = latestJobIdData;
  const hasJob = latestJobId !== undefined && latestJobId > 0n;

  // Round 3: fetch job and result using the resolved job ID.
  const { data: round3, isLoading: r3Loading } = useReadContracts({
    contracts: [
      {
        address: FORO_REGISTRY_ADDRESS,
        abi: FORO_REGISTRY_ABI,
        functionName: 'getTestJob' as const,
        args: [latestJobId ?? 0n] as const,
        chainId: zgNewtonTestnet.id,
      },
      {
        address: FORO_REGISTRY_ADDRESS,
        abi: FORO_REGISTRY_ABI,
        functionName: 'getTestResult' as const,
        args: [latestJobId ?? 0n] as const,
        chainId: zgNewtonTestnet.id,
      },
      {
        address: AGENT_VAULT_ADDRESS,
        abi: AGENT_VAULT_ABI,
        functionName: 'escrowed' as const,
        args: [latestJobId ?? 0n] as const,
        chainId: zgNewtonTestnet.id,
      },
    ],
    query: { enabled: hasJob },
  });

  const jobRaw = round3?.[0]?.status === 'success'
    ? (round3[0].result as {
        foroId: bigint;
        agentId: bigint;
        requester: `0x${string}`;
        testFee: bigint;
        keeperAddress: `0x${string}`;
        keeperStake: bigint;
        commitHash: `0x${string}`;
        commitTimestamp: bigint;
        revealTimestamp: bigint;
        status: number;
        contestationDeadline: bigint;
      })
    : undefined;
  console.log('jobRaw------', jobRaw);

  const resultRaw = round3?.[1]?.status === 'success'
    ? (round3[1].result as {
        foroId: bigint;
        score: bigint;
        latencyScore: bigint;
        qualityScore: bigint;
        avgLatencyMs: bigint;
        rounds: bigint;
        chatId: `0x${string}`;
        teeProof: `0x${string}`;
        teeVerified: boolean;
        submissionTimestamp: bigint;
        finalized: boolean;
      })
    : undefined;

  const escrowedRaw = round3?.[2]?.status === 'success'
    ? (round3[2].result)
    : undefined;

  const erc8004Address = agentRaw?.erc8004Address;
  const erc8004AgentId = agentRaw?.erc8004AgentId;

  const erc8004Enabled = !!erc8004Address && erc8004AgentId !== undefined;

  // Fetch agent contract JSON (name) and endpoint URL from ERC-8004 metadata.
  const { data: metaBytes, isLoading: metaLoading } = useReadContract({
    address: erc8004Address,
    abi: ERC8004_ABI,
    functionName: 'getMetadata',
    args: erc8004AgentId !== undefined ? [erc8004AgentId, 'foro:contract'] : undefined,
    chainId: zgNewtonTestnet.id,
    query: { enabled: erc8004Enabled },
  });

  const { data: endpointBytes, isLoading: endpointLoading } = useReadContract({
    address: erc8004Address,
    abi: ERC8004_ABI,
    functionName: 'getMetadata',
    args: erc8004AgentId !== undefined ? [erc8004AgentId, 'foro:endpoint'] : undefined,
    chainId: zgNewtonTestnet.id,
    query: { enabled: erc8004Enabled },
  });

  const agent = useMemo<ForoDetailAgent | null>(() => {
    if (!agentRaw) return null;

    // Resolve name and store raw contract JSON from ERC-8004 metadata.
    let name = `agent_${foroId}`;
    let agentContractJson: string | undefined;
    if (metaBytes) {
      try {
        const jsonStr = hexToString(metaBytes);
        agentContractJson = jsonStr;
        const json = JSON.parse(jsonStr) as { name?: string };
        if (json.name) name = json.name;
      } catch {
        // keep fallback name
      }
    }

    const status = ON_CHAIN_STATUS[agentRaw.status] ?? 'pending';
    let phase = ON_CHAIN_PHASE[agentRaw.status] ?? 'queued';


    // If the job has reached a terminal state, override phase to 'settled'
    // regardless of AgentStatus (e.g. PROBATION still maps to 'running' without this).
    const TERMINAL_JOB_STATUSES = [5, 6, 7]; // FINALIZED, REFUNDED, FAILED
    if (jobRaw?.status !== undefined && TERMINAL_JOB_STATUSES.includes(jobRaw.status)) {
      phase = 'settled';
    }
    const score = resultRaw?.score ? formatScore(resultRaw.score, 1n) : undefined;
    const totalTests = Number(agentRaw.testCount ?? 0n);
    const doneTests = Number(resultRaw?.rounds ?? 0n);
    const progress: [number, number] = [doneTests, totalTests];

    const hasResult =
      resultRaw?.submissionTimestamp !== undefined &&
      resultRaw.submissionTimestamp > 0n;
    const hasChatId = resultRaw?.chatId && resultRaw.chatId !== ZERO_BYTES32;

    // With exactOptionalPropertyTypes, we must not assign `undefined` to optional
    // fields — omit them via conditional spread instead.
    const detail: ForoDetailAgent = {
      id: foroId,
      name,
      foroId: String(foroId),
      badgeStatus: status,
      phase,
      progress,
    };

    if (registrationTxHash) detail.txHash = registrationTxHash;

    const creator = formatAddress(agentRaw.creatorWallet);
    if (creator) detail.creator = creator;

    const requestedAt = relativeTime(agentRaw.registrationTimestamp);
    if (requestedAt) detail.requestedAt = requestedAt;

    if (score) detail.score = score;

    if (jobRaw?.testFee && jobRaw.testFee > 0n)
      detail.testFee = formatFee(jobRaw.testFee);

    if (jobRaw?.keeperStake && jobRaw.keeperStake > 0n)
      detail.stakeRequired = formatFee(jobRaw.keeperStake);

    // Vault balance: actual escrowed amount (0 after finalization).
    if (escrowedRaw !== undefined)
      detail.vaultBalance = formatFee(escrowedRaw as bigint);

    // Reward distribution computed from the original test fee.
    console.log('jobRaw------', jobRaw);
    console.log('escrowedRaw------', escrowedRaw);
    console.log('jobResult------', resultRaw);
    if (jobRaw?.testFee && jobRaw.testFee > 0n) {
      const fee = jobRaw.testFee;
      detail.keeperEarned = formatFee((fee * 70n) / 100n);
      if (jobRaw.keeperStake > 0n)
        detail.stakeReturned = formatFee(jobRaw.keeperStake);
    }

    const keeper = formatAddress(jobRaw?.keeperAddress);
    if (keeper) detail.keeper = keeper;

    if (jobRaw?.status !== undefined) {
      const step = JOB_STEP[jobRaw.status];
      if (step) detail.step = step;
    }

    if (jobRaw?.commitTimestamp && jobRaw.commitTimestamp > 0n) {
      const startedAt = relativeTime(jobRaw.commitTimestamp);
      if (startedAt) detail.startedAt = startedAt;
    }

    if (hasChatId && resultRaw) detail.chatId = resultRaw.chatId;

    if (hasResult && resultRaw) {
      const submittedAt = relativeTime(resultRaw.submissionTimestamp);
      if (submittedAt) detail.block = submittedAt;

      detail.teeVerified = resultRaw.teeVerified;

      if (resultRaw.avgLatencyMs > 0n)
        detail.avgLatencyMs = Number(resultRaw.avgLatencyMs);

      if (resultRaw.latencyScore > 0n)
        detail.latencyScore = normaliseScore(resultRaw.latencyScore);

      if (resultRaw.qualityScore > 0n)
        detail.qualityScore = normaliseScore(resultRaw.qualityScore);
    }

    if (agentContractJson) detail.agentContractJson = agentContractJson;

    // Full creator address for linking.
    if (agentRaw.creatorWallet && agentRaw.creatorWallet !== ZERO_ADDRESS)
      detail.creatorFull = agentRaw.creatorWallet;

    // Agent endpoint URL from ERC-8004 foro:endpoint metadata.
    if (endpointBytes) {
      try {
        const url = hexToString(endpointBytes);
        if (url) detail.agentEndpointUrl = url;
      } catch {
        // ignore malformed bytes
      }
    }

    return detail;
  }, [agentRaw, jobRaw, resultRaw, escrowedRaw, metaBytes, endpointBytes, foroId, registrationTxHash]);

  return {
    agent,
    isLoading: r1Loading || r2Loading || r3Loading || metaLoading || endpointLoading,
    isError: r1Error,
  };
}
