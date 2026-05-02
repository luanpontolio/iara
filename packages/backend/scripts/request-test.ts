#!/usr/bin/env tsx
/**
 * Test Request Script
 * 
 * Requests a test for a registered agent on ForoRegistry.
 * The keeper service will automatically pick up and process the test job.
 * 
 * Steps:
 * 1. Verify agent is registered and exists
 * 2. Call ForoRegistry.requestTest() with test fee
 * 3. Return test job ID for tracking
 * 
 * Usage: tsx scripts/request-test.ts <agentForoId>
 * 
 * Example:
 *   tsx scripts/request-test.ts 1
 */

import { ethers } from 'ethers';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const FORO_REGISTRY_ABI = [
  'function getAgent(uint256 foroId) external view returns (tuple(uint256 foroId, address erc8004Address, uint256 erc8004AgentId, bytes32 contractHash, address creatorWallet, uint8 status, uint256 testCount, uint256 cumulativeScore, uint256 registrationTimestamp))',
  'function requestTest(uint256 agentId) external payable returns (uint256 foroId)',
  'event TestRequested(uint256 indexed foroId, uint256 indexed agentId, address requester, uint256 fee, uint256 timestamp)',
];

const AgentStatus = {
  0: 'PENDING',
  1: 'PROBATION',
  2: 'VERIFIED',
  3: 'ELITE',
  4: 'FAILED',
};

async function main() {
  console.log('🧪 Test Request Script\n');

  // Parse command line arguments
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('❌ Missing required argument: agentForoId\n');
    console.error('Usage: tsx scripts/request-test.ts <agentForoId>\n');
    console.error('Example:');
    console.error('  tsx scripts/request-test.ts 1\n');
    process.exit(1);
  }

  const agentForoId = BigInt(args[0]);

  // Load environment variables
  const rpcUrl = process.env.ZG_CHAIN_RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;
  const foroRegistryAddress = process.env.FORO_REGISTRY_ADDRESS;
  const testFee = ethers.parseEther(process.env.MIN_TEST_FEE || '0.001');

  if (!rpcUrl || !privateKey || !foroRegistryAddress) {
    console.error('❌ Missing required environment variables:');
    console.error('  ZG_CHAIN_RPC_URL:', rpcUrl ? '✓' : '✗');
    console.error('  PRIVATE_KEY:', privateKey ? '✓' : '✗');
    console.error('  FORO_REGISTRY_ADDRESS:', foroRegistryAddress ? '✓' : '✗');
    process.exit(1);
  }

  // Connect to blockchain
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log('📡 Connected to:', rpcUrl);
  console.log('👤 Wallet:', await wallet.getAddress());
  console.log('💰 Balance:', ethers.formatEther(await provider.getBalance(wallet.address)), 'ETH');
  console.log('  FORO_REGISTRY_ADDRESS:', foroRegistryAddress);
  console.log();

  const foroRegistry = new ethers.Contract(foroRegistryAddress, FORO_REGISTRY_ABI, wallet);

  // Step 1: Verify agent exists
  console.log('Step 1: Verifying agent exists...');
  try {
    const agent = await foroRegistry.getAgent(agentForoId);
    console.log('✅ Agent found!');
    console.log('  Foro ID:', agent.foroId.toString());
    console.log('  ERC-8004 Address:', agent.erc8004Address);
    console.log('  ERC-8004 Token ID:', agent.erc8004AgentId.toString());
    console.log('  Status:', AgentStatus[agent.status as keyof typeof AgentStatus]);
    console.log('  Test Count:', agent.testCount.toString());
    console.log('  Cumulative Score:', agent.cumulativeScore.toString());
    if (agent.testCount > 0n) {
      console.log('  Score (0-100):', (Number(agent.cumulativeScore) / 100).toFixed(2));
    }
    console.log();
  } catch (error) {
    console.error('❌ Failed to fetch agent. Does it exist?');
    console.error('   Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  // Step 2: Request test
  console.log('Step 2: Requesting test...');
  console.log('  Test Fee:', ethers.formatEther(testFee), 'ETH');
  
  try {
    const requestTx = await foroRegistry.requestTest(agentForoId, { value: testFee });
    console.log('  Tx submitted:', requestTx.hash);
    console.log('  Waiting for confirmation...');
    
    const requestReceipt = await requestTx.wait();

    // Parse TestRequested event to get test job ID
    const testRequestedEvent = requestReceipt?.logs.find((log: ethers.Log) => {
      try {
        const parsed = foroRegistry.interface.parseLog(log);
        return parsed?.name === 'TestRequested';
      } catch {
        return false;
      }
    });

    if (!testRequestedEvent) {
      console.error('❌ Failed to find TestRequested event in transaction logs');
      process.exit(1);
    }

    const testEvent = foroRegistry.interface.parseLog(testRequestedEvent);
    const testJobId = testEvent?.args[0];

    console.log('✅ Test requested successfully!');
    console.log('  Test Job ID:', testJobId.toString());
    console.log('  Tx:', requestReceipt?.hash);
    console.log();

    // Step 3: Output instructions
    console.log('🎉 Test job created!');
    console.log();
    console.log('Next steps:');
    console.log('  1. The keeper service will automatically pick up this job');
    console.log('  2. Track job status with: npm run check-job', testJobId.toString());
    console.log();
    console.log('📝 Save this value for tracking:');
    console.log(`  export TEST_JOB_ID=${testJobId.toString()}`);
    console.log();
  } catch (error) {
    console.error('❌ Failed to request test');
    console.error('   Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
