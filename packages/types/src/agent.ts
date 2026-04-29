/**
 * Agent Contract JSON schema types
 * Defines the structure of Agent Contract metadata stored in ERC-8004
 */

export interface AgentContract {
  category: string;
  version: string;
  input: JSONSchema;
  output: JSONSchema;
  sla: SLA;
  testCases: TestCase[];
}

export interface JSONSchema {
  type: string;
  required?: string[];
  properties?: Record<string, JSONSchemaProperty>;
  minLength?: number;
  maxLength?: number;
  format?: string;
}

export interface JSONSchemaProperty {
  type: string;
  format?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
}

export interface SLA {
  maxLatencyMs: number;
  maxCostUSD: number;
}

export interface TestCase {
  id: string;
  description: string;
  input: Record<string, unknown>;
  evaluation: Evaluation;
}

export interface Evaluation {
  criteria: string[];
}

export enum AgentStatus {
  PENDING = 0,
  PROBATION = 1,
  VERIFIED = 2,
  ELITE = 3,
  FAILED = 4,
}

export interface Agent {
  foroId: bigint;
  erc8004Address: string;
  erc8004AgentId: bigint;
  contractHash: string;
  creatorWallet: string;
  status: AgentStatus;
  testCount: bigint;
  cumulativeScore: bigint;
  registrationTimestamp: bigint;
}

export interface AgentMetadata {
  contract: AgentContract;
  endpoint: string;
}

export function validateAgentContract(contract: unknown): contract is AgentContract {
  if (typeof contract !== 'object' || contract === null) return false;
  
  const c = contract as Partial<AgentContract>;
  
  return (
    typeof c.category === 'string' &&
    typeof c.version === 'string' &&
    typeof c.input === 'object' &&
    typeof c.output === 'object' &&
    typeof c.sla === 'object' &&
    typeof c.sla?.maxLatencyMs === 'number' &&
    typeof c.sla?.maxCostUSD === 'number' &&
    Array.isArray(c.testCases) &&
    c.testCases.length > 0 &&
    c.testCases.every(
      (tc) =>
        typeof tc === 'object' &&
        typeof tc.id === 'string' &&
        typeof tc.description === 'string' &&
        typeof tc.input === 'object' &&
        typeof tc.evaluation === 'object' &&
        Array.isArray(tc.evaluation?.criteria) &&
        tc.evaluation.criteria.length > 0
    )
  );
}

export function computeContractHash(contract: AgentContract): string {
  const jsonString = JSON.stringify(contract);
  return `0x${Buffer.from(jsonString).toString('hex')}`;
}
