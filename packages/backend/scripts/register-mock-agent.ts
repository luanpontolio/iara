#!/usr/bin/env tsx
/**
 * Mock Agent Registration Script
 * 
 * Registers a mock URL summarizer agent on ForoRegistry for testing.
 * 
 * Steps:
 * 1. Mint a new ERC-8004 token (MockERC8004.register())
 * 2. Set foro:contract metadata with Agent Contract JSON
 * 3. Set foro:endpoint metadata with mock agent URL
 * 4. Call ForoRegistry.registerAgent() to register on-chain
 * 
 * Usage: tsx scripts/register-mock-agent.ts
 */

import { ethers } from 'ethers';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const MOCK_ERC8004_ABI = [
  'function register() external returns (uint256 agentId)',
  'function register(string calldata agentURI) external returns (uint256 agentId)',
  'function setMetadata(uint256 agentId, string calldata key, bytes calldata value) external',
  'function getMetadata(uint256 agentId, string calldata key) external view returns (bytes memory)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function tokenURI(uint256 agentId) external view returns (string memory)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
];

const FORO_REGISTRY_ABI = [
  'function registerAgent(address erc8004Address, uint256 erc8004AgentId) external returns (uint256 foroId)',
  'function getAgent(uint256 foroId) external view returns (tuple(uint256 foroId, address erc8004Address, uint256 erc8004AgentId, bytes32 contractHash, address creatorWallet, uint8 status, uint256 testCount, uint256 cumulativeScore, uint256 registrationTimestamp))',
  'event AgentRegistered(uint256 indexed foroId, address indexed erc8004Address, uint256 erc8004AgentId, bytes32 contractHash, address creatorWallet)',
];

async function main() {
  console.log('🤖 Mock Agent Registration Script\n');

  const rpcUrl = process.env.ZG_CHAIN_RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;
  const erc8004Address = process.env.ERC8004_ADDRESS;
  const foroRegistryAddress = process.env.FORO_REGISTRY_ADDRESS;
  const mockAgentUrl = process.env.MOCK_AGENT_URL || 'http://localhost:3001/summarize';

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

  console.log('📡 Connected to:', rpcUrl);
  console.log('👤 Wallet:', await wallet.getAddress());
  console.log('  ERC8004_ADDRESS:', erc8004Address);
  console.log('  MOCK_AGENT_URL:', mockAgentUrl);
  console.log('  FORO_REGISTRY_ADDRESS:', foroRegistryAddress);
  console.log('💰 Balance:', ethers.formatEther(await provider.getBalance(wallet.address)), 'ETH\n');

  const erc8004 = new ethers.Contract(erc8004Address, MOCK_ERC8004_ABI, wallet);
  const foroRegistry = new ethers.Contract(foroRegistryAddress, FORO_REGISTRY_ABI, wallet);

  const agentContractPath = join(__dirname, '../data/mock-agent-contract.json');
  const agentContractJSON = readFileSync(agentContractPath, 'utf-8');
  const agentContract = JSON.parse(agentContractJSON);

  console.log('📄 Agent Contract loaded:');
  console.log('  Category:', agentContract.category);
  console.log('  Version:', agentContract.version);
  console.log('  Test Cases:', agentContract.testCases.length);
  console.log('  Endpoint:', mockAgentUrl);
  console.log();

  console.log('Step 1: Minting ERC-8004 token...');
  const registerTx = await erc8004.register();
  const registerReceipt = await registerTx.wait();

  const transferEvent = registerReceipt?.logs.find(
    (log: ethers.Log) => {
      try {
        const parsed = erc8004.interface.parseLog(log);
        return parsed?.name === 'Transfer';
      } catch {
        return false;
      }
    }
  );

  if (!transferEvent) {
    console.error('❌ Failed to find Transfer event in transaction logs');
    process.exit(1);
  }

  const parsedEvent = erc8004.interface.parseLog(transferEvent);
  const erc8004AgentId = parsedEvent?.args[2];

  console.log('✅ ERC-8004 token minted!');
  console.log('  Token ID:', erc8004AgentId.toString());
  console.log('  Tx:', registerReceipt?.hash);
  console.log();

  console.log('Step 2: Setting foro:contract metadata...');
  const contractMetadataTx = await erc8004.setMetadata(
    erc8004AgentId,
    'foro:contract',
    ethers.toUtf8Bytes(agentContractJSON)
  );
  await contractMetadataTx.wait();
  console.log('✅ Agent Contract metadata set');
  console.log('  Tx:', contractMetadataTx.hash);
  console.log();

  console.log('Step 3: Setting foro:endpoint metadata...');
  const endpointMetadataTx = await erc8004.setMetadata(
    erc8004AgentId,
    'foro:endpoint',
    ethers.toUtf8Bytes(mockAgentUrl)
  );
  await endpointMetadataTx.wait();
  console.log('✅ Endpoint metadata set');
  console.log('  Tx:', endpointMetadataTx.hash);
  console.log();

  console.log('Step 4: Registering agent on ForoRegistry...');
  const registerAgentTx = await foroRegistry.registerAgent(
    erc8004Address,
    erc8004AgentId
  );
  const registerAgentReceipt = await registerAgentTx.wait();

  const agentRegisteredEvent = registerAgentReceipt?.logs.find(
    (log: ethers.Log) => {
      try {
        const parsed = foroRegistry.interface.parseLog(log);
        return parsed?.name === 'AgentRegistered';
      } catch {
        return false;
      }
    }
  );

  if (!agentRegisteredEvent) {
    console.error('❌ Failed to find AgentRegistered event');
    process.exit(1);
  }

  const agentEvent = foroRegistry.interface.parseLog(agentRegisteredEvent);
  const foroId = agentEvent?.args[0];
  const contractHash = agentEvent?.args[3];

  console.log('✅ Agent registered on ForoRegistry!');
  console.log('  Foro ID:', foroId.toString());
  console.log('  Contract Hash:', contractHash);
  console.log('  Tx:', registerAgentReceipt?.hash);
  console.log();

  const agent = await foroRegistry.getAgent(foroId);
  console.log('📊 Agent Details:');
  console.log('  Foro ID:', agent.foroId.toString());
  console.log('  ERC-8004 Address:', agent.erc8004Address);
  console.log('  ERC-8004 Token ID:', agent.erc8004AgentId.toString());
  console.log('  Contract Hash:', agent.contractHash);
  console.log('  Creator:', agent.creatorWallet);
  console.log('  Status:', ['PENDING', 'PROBATION', 'VERIFIED', 'ELITE', 'FAILED'][agent.status]);
  console.log('  Test Count:', agent.testCount.toString());
  console.log('  Cumulative Score:', agent.cumulativeScore.toString());
  console.log();

  console.log('🎉 Mock agent registration complete!');
  console.log();
  console.log('Next steps:');
  console.log('  1. Start mock agent server: npm run mock-agent:serve');
  console.log('  2. Request a test: npm run test:full-flow');
  console.log();
  console.log('📝 Save these values for testing:');
  console.log(`  export MOCK_AGENT_FORO_ID=${foroId.toString()}`);
  console.log(`  export MOCK_AGENT_ERC8004_ID=${erc8004AgentId.toString()}`);
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
