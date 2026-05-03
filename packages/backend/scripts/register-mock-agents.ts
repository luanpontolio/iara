#!/usr/bin/env tsx
/**
 * Bulk Mock Agent Registration Script
 *
 * Registers 10 DeFi-themed mock agents on ForoRegistry and writes two output files:
 *   - packages/backend/data/registered-agents.json  (raw records for tooling)
 *   - packages/frontend/src/lib/constants/registeredAgents.ts  (typed TS export for the frontend)
 *
 * All agents share the same endpoint (http://localhost:3001/summarize) and the
 * same agent-contract schema, differing only in their name.
 *
 * Usage: npm run mock-agent:register-all
 */

import { ethers } from 'ethers';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const MOCK_ERC8004_ABI = [
  'function register() external returns (uint256 agentId)',
  'function setMetadata(uint256 agentId, string calldata key, bytes calldata value) external',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
];

const FORO_REGISTRY_ABI = [
  'function registerAgent(address erc8004Address, uint256 erc8004AgentId) external returns (uint256 foroId)',
  'event AgentRegistered(uint256 indexed foroId, address indexed erc8004Address, uint256 erc8004AgentId, bytes32 contractHash, address creatorWallet)',
];

const AGENT_NAMES = [
  'agent-uni',
  'agent-makerdao',
  'agent-aave',
  'agent-compound',
  'agent-curve',
  'agent-lido',
  'agent-yearn',
  'agent-balancer',
  'agent-frax',
  'agent-convex',
];

const SHARED_ENDPOINT = 'http://localhost:3001/summarize';

interface RegisteredAgent {
  name: string;
  foroId: string;
  erc8004AgentId: string;
  erc8004Address: string;
}

async function registerAgent(
  name: string,
  erc8004: ethers.Contract,
  foroRegistry: ethers.Contract,
  erc8004Address: string,
  agentContractBase: object,
): Promise<RegisteredAgent> {
  console.log(`\n── Registering ${name} ──`);

  const agentContractJSON = JSON.stringify({ ...agentContractBase, name });

  console.log('  Step 1: Minting ERC-8004 token...');
  const registerTx = await erc8004.register();
  const registerReceipt = await registerTx.wait();

  const transferEvent = registerReceipt?.logs.find((log: ethers.Log) => {
    try {
      return erc8004.interface.parseLog(log)?.name === 'Transfer';
    } catch {
      return false;
    }
  });

  if (!transferEvent) throw new Error(`No Transfer event for ${name}`);

  const parsedTransfer = erc8004.interface.parseLog(transferEvent);
  const erc8004AgentId: bigint = parsedTransfer?.args[2];
  console.log(`  ✓ Token minted — id: ${erc8004AgentId}`);

  console.log('  Step 2: Setting foro:contract metadata...');
  const contractTx = await erc8004.setMetadata(
    erc8004AgentId,
    'foro:contract',
    ethers.toUtf8Bytes(agentContractJSON),
  );
  await contractTx.wait();
  console.log('  ✓ foro:contract set');

  console.log('  Step 3: Setting foro:endpoint metadata...');
  const endpointTx = await erc8004.setMetadata(
    erc8004AgentId,
    'foro:endpoint',
    ethers.toUtf8Bytes(SHARED_ENDPOINT),
  );
  await endpointTx.wait();
  console.log('  ✓ foro:endpoint set');

  console.log('  Step 4: Registering on ForoRegistry...');
  console.log('erc8004Address------', erc8004Address);
  console.log('erc8004AgentId------', erc8004AgentId);
  const regTx = await foroRegistry.registerAgent(erc8004Address, erc8004AgentId);
  const regReceipt = await regTx.wait();

  const agentEvent = regReceipt?.logs.find((log: ethers.Log) => {
    try {
      return foroRegistry.interface.parseLog(log)?.name === 'AgentRegistered';
    } catch {
      return false;
    }
  });

  if (!agentEvent) throw new Error(`No AgentRegistered event for ${name}`);

  const parsedAgent = foroRegistry.interface.parseLog(agentEvent);
  const foroId: bigint = parsedAgent?.args[0];
  console.log(`  ✓ Registered — foroId: ${foroId}`);

  return {
    name,
    foroId: foroId.toString(),
    erc8004AgentId: erc8004AgentId.toString(),
    erc8004Address,
  };
}

async function main() {
  console.log('🤖 Bulk Mock Agent Registration\n');

  const rpcUrl = process.env.ZG_CHAIN_RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;
  const erc8004Address = process.env.ERC8004_ADDRESS;
  const foroRegistryAddress = process.env.FORO_REGISTRY_ADDRESS;

  if (!rpcUrl || !privateKey || !erc8004Address || !foroRegistryAddress) {
    console.error('❌ Missing required environment variables:');
    console.error('  ZG_CHAIN_RPC_URL:', rpcUrl ? '✓' : '✗');
    console.error('  PRIVATE_KEY:', privateKey ? '✓' : '✗');
    console.error('  ERC8004_ADDRESS:', erc8004Address ? '✓' : '✗');
    console.error('  FORO_REGISTRY_ADDRESS:', foroRegistryAddress ? '✓' : '✗');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log('📡 RPC:', rpcUrl);
  console.log('👤 Wallet:', await wallet.getAddress());
  console.log('💰 Balance:', ethers.formatEther(await provider.getBalance(wallet.address)), 'A0GI');
  console.log('📋 Agents to register:', AGENT_NAMES.length);
  console.log('🌐 Shared endpoint:', SHARED_ENDPOINT);

  const erc8004 = new ethers.Contract(erc8004Address, MOCK_ERC8004_ABI, wallet);
  const foroRegistry = new ethers.Contract(foroRegistryAddress, FORO_REGISTRY_ABI, wallet);

  const agentContractBase = JSON.parse(
    readFileSync(join(__dirname, '../data/mock-agent-contract.json'), 'utf-8'),
  );

  const results: RegisteredAgent[] = [];

  for (const name of AGENT_NAMES) {
    const record = await registerAgent(name, erc8004, foroRegistry, erc8004Address, agentContractBase);
    results.push(record);
  }

  console.log('\n✅ All agents registered!\n');

  // Write raw JSON for tooling / backend use
  const jsonPath = join(__dirname, '../data/registered-agents.json');
  writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  console.log('📄 Written:', jsonPath);

  // Write typed TypeScript manifest for the frontend
  const tsLines = [
    '// This file is auto-generated by scripts/register-mock-agents.ts — do not edit manually.',
    '',
    'export interface RegisteredAgent {',
    '  foroId: bigint;',
    '  name: string;',
    '}',
    '',
    'export const REGISTERED_AGENTS: RegisteredAgent[] = [',
    ...results.map(r => `  { foroId: ${r.foroId}n, name: '${r.name}' },`),
    '];',
    '',
  ];

  const tsPath = join(__dirname, '../../../packages/frontend/src/lib/constants/registeredAgents.ts');
  writeFileSync(tsPath, tsLines.join('\n'));
  console.log('📄 Written:', tsPath);

  console.log('\n📝 Summary:');
  results.forEach(r => {
    console.log(`  foroId=${r.foroId}  ${r.name}`);
  });
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
