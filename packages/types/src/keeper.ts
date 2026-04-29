/**
 * Keeper service types
 * Defines structures for test execution, results, and TEE proofs
 */

import type { AgentContract, TestCase } from './agent.js';

export enum JobStatus {
  REQUESTED = 0,
  COMMITTED = 1,
  REVEALED = 2,
  SUBMITTED = 3,
  CONTESTED = 4,
  FINALIZED = 5,
  REFUNDED = 6,
}

export interface TestJob {
  foroId: bigint;
  agentId: bigint;
  requester: string;
  testFee: bigint;
  keeperAddress: string;
  keeperStake: bigint;
  commitHash: string;
  commitTimestamp: bigint;
  revealTimestamp: bigint;
  status: JobStatus;
  contestationDeadline: bigint;
}

export interface ExecutionResult {
  testCaseId: string;
  success: boolean;
  output?: Record<string, unknown>;
  error?: string;
  latencyMs: number;
  timestamp: number;
}

export interface TEEProof {
  chatId: string;
  enclaveSig: string;
  publicKey: string;
  timestamp: number;
}

export interface TestResult {
  foroId: bigint;
  score: bigint;
  latencyScore: bigint;
  qualityScore: bigint;
  avgLatencyMs: bigint;
  rounds: bigint;
  chatId: string;
  teeProof: Uint8Array;
  teeVerified: boolean;
  submissionTimestamp: bigint;
  finalized: boolean;
}

export interface KeeperConfig {
  privateKey: string;
  rpcUrl: string;
  foroRegistryAddress: string;
  agentVaultAddress: string;
  zgComputeProvider: string;
  minStakeEth: string;
  maxConcurrentJobs: number;
  timeoutSeconds: number;
}

export interface Keeper {
  keeperAddress: string;
  stakedAmount: bigint;
  jobsCompleted: bigint;
  jobsContested: bigint;
  contestationsWon: bigint;
  contestationsLost: bigint;
  totalEarned: bigint;
  active: boolean;
}

export interface ExecutionContext {
  testJob: TestJob;
  agentContract: AgentContract;
  agentEndpoint: string;
  salt: string;
}

export interface LLMJudgeRequest {
  testCase: TestCase;
  agentOutput: Record<string, unknown>;
  criteria: string[];
}

export interface LLMJudgeResponse {
  scores: number[];
  reasoning: string[];
  chatId: string;
  teeProof: TEEProof;
}

export function calculateLatencyScore(avgLatencyMs: number): number {
  const minLatency = 500;
  const maxLatency = 3000;
  
  if (avgLatencyMs <= minLatency) return 100;
  if (avgLatencyMs >= maxLatency) return 0;
  
  return Math.floor(100 - ((avgLatencyMs - minLatency) / (maxLatency - minLatency)) * 100);
}

export function calculateCompositeScore(latencyScore: number, qualityScore: number): number {
  return Math.floor(latencyScore * 0.3 + qualityScore * 0.7);
}

export function getKeeperWeight(
  jobsCompleted: bigint,
  stakedAmount: bigint,
  minStake: bigint
): bigint {
  const baseWeight = 1n;
  const experienceBonus = jobsCompleted / 10n;
  const stakeBonus = stakedAmount / minStake - 1n;
  
  return baseWeight + experienceBonus + stakeBonus;
}
