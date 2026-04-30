import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const configSchema = z.object({
  // Blockchain
  rpcUrl: z.string().url(),
  privateKey: z.string().min(64),
  chainId: z.number().default(16600),
  
  // Contract Addresses
  foroRegistryAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  agentVaultAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  
  // 0G Compute
  zgComputeProvider: z.string().optional(),
  zgComputeEnabled: z.boolean().default(true),
  
  // Keeper Settings
  minTestFee: z.string().default('0.001'),
  stakeMultiplier: z.number().default(2),
  
  // Monitoring
  pollIntervalMs: z.number().default(5000),
  blockConfirmations: z.number().default(1),
  
  // Execution
  agentTimeoutMs: z.number().default(10000),
  maxRetries: z.number().default(0), // MVP: no retries
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(): Config {
  const raw = {
    rpcUrl: process.env.RPC_URL || '',
    privateKey: process.env.KEEPER_PRIVATE_KEY || '',
    chainId: parseInt(process.env.CHAIN_ID || '16600', 10),
    
    foroRegistryAddress: process.env.FORO_REGISTRY_ADDRESS || '',
    agentVaultAddress: process.env.AGENT_VAULT_ADDRESS || '',
    
    zgComputeProvider: process.env.ZG_COMPUTE_PROVIDER,
    zgComputeEnabled: process.env.ZG_COMPUTE_ENABLED !== 'false',
    
    minTestFee: process.env.MIN_TEST_FEE || '0.001',
    stakeMultiplier: parseInt(process.env.STAKE_MULTIPLIER || '2', 10),
    
    pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '5000', 10),
    blockConfirmations: parseInt(process.env.BLOCK_CONFIRMATIONS || '1', 10),
    
    agentTimeoutMs: parseInt(process.env.AGENT_TIMEOUT_MS || '10000', 10),
    maxRetries: parseInt(process.env.MAX_RETRIES || '0', 10),
  };
  
  return configSchema.parse(raw);
}
