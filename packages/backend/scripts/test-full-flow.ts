#!/usr/bin/env tsx
/**
 * Full Flow Integration Test
 * 
 * Tests the complete workflow from agent registration through test execution.
 * 
 * Workflow:
 * 1. Verify mock agent is registered on ForoRegistry
 * 2. Request a test for the agent (pay test fee)
 * 3. Wait for Keeper to claim, execute, and submit result
 * 4. Wait for contestation window
 * 5. Finalize result and check agent status
 * 
 * Prerequisites:
 * - Mock agent must be registered (run register-mock-agent.ts first)
 * - Mock agent server must be running (run mock-agent:serve)
 * - Keeper service should be running (optional, can be manual)
 * 
 * Usage: tsx scripts/test-full-flow.ts <foroId>
 */

import { ethers } from 'ethers';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const FORO_REGISTRY_ABI = [
  'function getAgent(uint256 foroId) external view returns (tuple(uint256 foroId, address erc8004Address, uint256 erc8004AgentId, bytes32 contractHash, address creatorWallet, uint8 status, uint256 testCount, uint256 cumulativeScore, uint256 registrationTimestamp))',
  'function requestTest(uint256 agentId) external payable returns (uint256 foroId)',
  'function getTestJob(uint256 foroId) external view returns (tuple(uint256 foroId, uint256 agentId, address requester, uint256 testFee, address keeperAddress, uint256 keeperStake, bytes32 commitHash, uint256 commitTimestamp, uint256 revealTimestamp, uint8 status, uint256 contestationDeadline))',
  'function getTestResult(uint256 foroId) external view returns (tuple(uint256 foroId, uint256 score, uint256 latencyScore, uint256 qualityScore, uint256 avgLatencyMs, uint256 rounds, bytes32 chatId, bytes teeProof, bool teeVerified, uint256 submissionTimestamp, bool finalized))',
  'event TestRequested(uint256 indexed foroId, uint256 indexed agentId, address requester, uint256 fee, uint256 timestamp)',
  'event JobClaimed(uint256 indexed foroId, address indexed keeper, bytes32 commitHash, uint256 stake)',
  'event ResultSubmitted(uint256 indexed foroId, uint256 score, uint256 avgLatencyMs, bytes32 chatId, bool teeVerified)',
  'event ResultFinalized(uint256 indexed foroId, uint256 indexed agentId, uint256 newScore, uint8 newStatus)',
];

const JobStatus = {
  REQUESTED: 0,
  COMMITTED: 1,
  REVEALED: 2,
  SUBMITTED: 3,
  CONTESTED: 4,
  FINALIZED: 5,
  REFUNDED: 6,
  FAILED: 7,
};

const AgentStatus = {
  PENDING: 0,
  PROBATION: 1,
  VERIFIED: 2,
  ELITE: 3,
  FAILED: 4,
};

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForJobStatus(
  foroRegistry: ethers.Contract,
  testJobId: bigint,
  targetStatus: number,
  maxWaitMs: number = 300000
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    const job = await foroRegistry.getTestJob(testJobId);
    
    if (job.status === targetStatus) {
      return;
    }
    
    await sleep(5000);
  }
  
  throw new Error(`Timeout waiting for job status ${targetStatus}`);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: tsx scripts/test-full-flow.ts <agentForoId>');
    console.error('\nExample: tsx scripts/test-full-flow.ts 1');
    console.error('\nGet the foroId by running register-mock-agent.ts first');
    process.exit(1);
  }

  const agentForoId = BigInt(args[0]);

  console.log('🧪 Full Flow Integration Test\n');

  const rpcUrl = process.env.ZG_CHAIN_RPC_URL;
  const privateKey = process.env.KEEPER_PRIVATE_KEY;
  const foroRegistryAddress = process.env.FORO_REGISTRY_ADDRESS;
  const testFee = ethers.parseEther(process.env.MIN_TEST_FEE || '0.001');

  if (!rpcUrl || !privateKey || !foroRegistryAddress) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const foroRegistry = new ethers.Contract(foroRegistryAddress, FORO_REGISTRY_ABI, wallet);

  console.log('📡 Connected to:', rpcUrl);
  console.log('👤 Wallet:', await wallet.getAddress());
  console.log('💰 Balance:', ethers.formatEther(await provider.getBalance(wallet.address)), 'ETH');
  console.log();

  console.log('Step 1: Verify agent is registered...');
  const agent = await foroRegistry.getAgent(agentForoId);
  console.log('✅ Agent found!');
  console.log('  Foro ID:', agent.foroId.toString());
  console.log('  Status:', Object.keys(AgentStatus)[agent.status]);
  console.log('  Test Count:', agent.testCount.toString());
  console.log('  Cumulative Score:', agent.cumulativeScore.toString());
  console.log();

  console.log('Step 2: Request test...');
  console.log('  Test Fee:', ethers.formatEther(testFee), 'ETH');
  const requestTx = await foroRegistry.requestTest(agentForoId, { value: testFee });
  const requestReceipt = await requestTx.wait();

  const testRequestedEvent = requestReceipt?.logs.find((log: ethers.Log) => {
    try {
      const parsed = foroRegistry.interface.parseLog(log);
      return parsed?.name === 'TestRequested';
    } catch {
      return false;
    }
  });

  if (!testRequestedEvent) {
    console.error('❌ Failed to find TestRequested event');
    process.exit(1);
  }

  const testEvent = foroRegistry.interface.parseLog(testRequestedEvent);
  const testJobId = testEvent?.args[0];

  console.log('✅ Test requested!');
  console.log('  Test Job ID:', testJobId.toString());
  console.log('  Tx:', requestReceipt?.hash);
  console.log();

  console.log('Step 3: Waiting for Keeper to claim job...');
  console.log('  (Keeper service must be running)');
  
  try {
    await waitForJobStatus(foroRegistry, testJobId, JobStatus.COMMITTED, 60000);
    const job = await foroRegistry.getTestJob(testJobId);
    console.log('✅ Job claimed by Keeper:', job.keeperAddress);
    console.log('  Commit Hash:', job.commitHash);
    console.log('  Stake:', ethers.formatEther(job.keeperStake), 'ETH');
    console.log();
  } catch (error) {
    console.log('⚠️  Job not claimed yet. Is Keeper service running?');
    console.log('   You can start it with: npm run dev');
    console.log();
  }

  console.log('Step 4: Waiting for result submission...');
  console.log('  (This may take a few minutes as Keeper executes tests)');
  
  try {
    await waitForJobStatus(foroRegistry, testJobId, JobStatus.SUBMITTED, 300000);
    const result = await foroRegistry.getTestResult(testJobId);
    console.log('✅ Result submitted!');
    console.log('  Score:', result.score.toString());
    console.log('  Avg Latency:', result.avgLatencyMs.toString(), 'ms');
    console.log('  Rounds:', result.rounds.toString());
    console.log('  TEE Verified:', result.teeVerified);
    console.log('  Chat ID:', result.chatId);
    console.log();
  } catch (error) {
    console.log('⚠️  Result not submitted within timeout');
    console.log('   Check Keeper service logs for errors');
    console.log();
    process.exit(1);
  }

  console.log('Step 5: Waiting for contestation window...');
  const job = await foroRegistry.getTestJob(testJobId);
  const contestationDeadline = Number(job.contestationDeadline) * 1000;
  const now = Date.now();
  const waitTime = Math.max(0, contestationDeadline - now);
  
  if (waitTime > 0) {
    console.log(`  Waiting ${Math.round(waitTime / 1000)}s for contestation window...`);
    await sleep(waitTime + 5000);
  }
  console.log();

  console.log('Step 6: Checking final status...');
  try {
    await waitForJobStatus(foroRegistry, testJobId, JobStatus.FINALIZED, 60000);
    
    const finalAgent = await foroRegistry.getAgent(agentForoId);
    const finalResult = await foroRegistry.getTestResult(testJobId);
    
    console.log('✅ Test finalized!');
    console.log();
    console.log('📊 Final Agent Status:');
    console.log('  Foro ID:', finalAgent.foroId.toString());
    console.log('  Status:', Object.keys(AgentStatus)[finalAgent.status]);
    console.log('  Test Count:', finalAgent.testCount.toString());
    console.log('  Cumulative Score:', finalAgent.cumulativeScore.toString());
    console.log('  Score (0-100):', (Number(finalAgent.cumulativeScore) / 100).toFixed(2));
    console.log();
    console.log('📊 Test Result:');
    console.log('  Score:', finalResult.score.toString());
    console.log('  Avg Latency:', finalResult.avgLatencyMs.toString(), 'ms');
    console.log('  Rounds:', finalResult.rounds.toString());
    console.log('  TEE Verified:', finalResult.teeVerified);
    console.log('  Finalized:', finalResult.finalized);
    console.log();
    console.log('🎉 Full flow test completed successfully!');
  } catch (error) {
    console.log('⚠️  Job not finalized within timeout');
    console.log('   It may still be in contestation window');
  }
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
