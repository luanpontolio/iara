/**
 * Shared Type Definitions
 * 
 * Common types used across the application.
 */

export type AgentStatus = 'pending' | 'probation' | 'verified' | 'elite' | 'failed' | 'live';

export type NavPage = 'dashboard' | 'agents' | 'proofs' | 'logs' | 'settings';

export type ForoPhase = 'queued' | 'running' | 'settled';

export type TabId = 'tests' | 'proof' | 'rewards' | 'metadata';

export interface Agent {
  id: number;
  name: string;
  foroId: string;
  fullAddress: string;
  score: string;
  tests: string;
  latency: string;
  block: string;
  status: AgentStatus;
  testFee?: string;
  elapsedTime?: string;
}

/** Agent detail view (Foro ID route) — richer than list `Agent` */
export interface ForoDetailAgent {
  id: number;
  name: string;
  foroId: string;
  badgeStatus: AgentStatus;
  phase: ForoPhase;
  creator?: string;
  txHash?: string;
  testFee?: string;
  stakeRequired?: string;
  requestedAt?: string;
  testCases?: TestCase[];
  keeper?: string;
  startedAt?: string;
  step?: 'committed' | 'revealed' | 'submitted';
  progress?: [number, number];
  score?: string;
  rounds?: TestRound[];
  chatId?: string;
  block?: string;
  vaultBalance?: string;
  keeperEarned?: string;
  stakeReturned?: string;
  teeVerified?: boolean;
  avgLatencyMs?: number;
  latencyScore?: string;
  qualityScore?: string;
  agentContractJson?: string;
}

export type ForoTabId = 'test-cases' | 'tests' | 'proof' | 'rewards';

export interface TestCase {
  id: string;
  description: string;
  criteria: string[];
}

export interface TestRound {
  n: string;
  score: string;
  latency: string;
  passed: boolean;
}

export interface Contestation {
  foroId: string;
  contestant: string;
  contestStake: string;
  evidence: string;
  resolved: boolean;
  contestantWins: boolean;
}
