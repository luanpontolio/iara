/**
 * Keeper Service - Main Orchestrator
 * 
 * Monitors blockchain for test requests and executes the full workflow:
 * 1. Poll for available test jobs
 * 2. Claim job with commit hash and stake
 * 3. Execute test cases against agent endpoint
 * 4. Judge outputs via 0G Compute TEE
 * 5. Reveal test inputs
 * 6. Submit results with TEE proof
 * 7. Finalize after contestation window
 */

import { ethers } from 'ethers';
import { Config } from '../config.js';
import { Contracts, createERC8004Contract } from '../utils/contracts.js';
import { ZGComputeBroker } from '../utils/0g-compute.js';
import {
  AgentContract,
  executeAllTestCases,
  ExecutionResult,
} from './executor.js';
import { judgeAgentOutput, calculateAverageQualityScore } from './judge.js';
import logger from '../utils/logger.js';

export class KeeperService {
  private config: Config;
  private contracts: Contracts;
  private zgBroker: ZGComputeBroker;
  private isRunning: boolean = false;
  private processedJobs: Set<string> = new Set();
  
  constructor(
    config: Config,
    contracts: Contracts,
    zgBroker: ZGComputeBroker
  ) {
    this.config = config;
    this.contracts = contracts;
    this.zgBroker = zgBroker;
  }
  
  /**
   * Start polling for test requests
   */
  start(): void {
    this.isRunning = true;
    logger.info('Keeper service started');
    
    // Start polling for jobs
    void this.pollForJobs();
    
    // Start background forfeit monitoring
    this.startForfeitMonitoring();
  }
  
  /**
   * Stop the keeper service
   */
  stop(): void {
    this.isRunning = false;
    void this.contracts.foroRegistry.removeAllListeners();
    logger.info('Keeper service stopped');
  }
  
  /**
   * Poll for available jobs
   */
  private async pollForJobs(): Promise<void> {
    logger.info({ pollIntervalMs: this.config.pollIntervalMs }, 'Starting job polling');
    
    while (this.isRunning) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const allJobs = await (this.contracts.foroRegistry as any).getAllTestJobs();
        
        // Filter for REQUESTED jobs only (JobStatus.REQUESTED = 0)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
        const availableJobs = (allJobs as any[]).filter((job: any) => job.status === 0);
        
        logger.debug(
          { 
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            totalJobs: (allJobs as any[]).length, 
            availableJobs: availableJobs.length,
            processedCount: this.processedJobs.size
          },
          'Polling for jobs'
        );
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const job of availableJobs as any[]) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
          const foroIdStr = job.foroId.toString() as string;
          
          // Skip if already processed
          if (this.processedJobs.has(foroIdStr)) {
            continue;
          }
          
          // Mark as processed immediately to prevent duplicates
          this.processedJobs.add(foroIdStr);
          
          logger.info(
            {
              foroId: foroIdStr,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
              agentId: job.agentId.toString() as string,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              requester: job.requester as string,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              fee: ethers.formatEther(job.testFee),
            },
            'New test job found'
          );
          
          // Process job asynchronously
          void (async () => {
            try {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              await this.handleTestRequest(job.foroId as bigint, job.agentId as bigint);
            } catch (error) {
              logger.error({ error, foroId: foroIdStr }, 'Failed to handle test request');
            }
          })();
        }
      } catch (error) {
        logger.error({ error }, 'Error polling for jobs');
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, this.config.pollIntervalMs));
    }
  }
  
  /**
   * Handle a test request through the full workflow
   */
  private async handleTestRequest(foroId: bigint, agentId: bigint): Promise<void> {
    logger.info({ foroId: foroId.toString(), agentId: agentId.toString() }, 'Handling test request');
    
    // 1. Fetch agent details
    const agent = await this.contracts.foroRegistry.getAgent(agentId);
    const erc8004 = createERC8004Contract(agent.erc8004Address, this.contracts.provider);
    
    // 2. Fetch Agent Contract metadata
    const metadataBytes = await erc8004.getMetadata(agent.erc8004AgentId, 'foro:contract');
    const agentContract: AgentContract = JSON.parse(ethers.toUtf8String(metadataBytes));
    
    // 3. Fetch agent endpoint
    const endpointBytes = await erc8004.getMetadata(agent.erc8004AgentId, 'foro:endpoint');
    const agentEndpoint = ethers.toUtf8String(endpointBytes);
    
    logger.info({ agentEndpoint, testCases: agentContract.testCases.length }, 'Agent contract loaded');
    
    // 4. Prepare commit-reveal
    const testCasesJSON = JSON.stringify(agentContract.testCases);
    const salt = ethers.id(`salt-${Date.now()}-${Math.random()}`);
    const commitHash = ethers.solidityPackedKeccak256(
      ['string', 'bytes32'],
      [testCasesJSON, salt]
    );
    
    // 5. Claim job with stake
    const testJob = await this.contracts.foroRegistry.getTestJob(foroId);
    const requiredStake = testJob.testFee * BigInt(2);
    
    logger.info({ foroId: foroId.toString(), stake: ethers.formatEther(requiredStake) }, 'Claiming job');
    
    const claimTx = await this.contracts.foroRegistry.claimJob(foroId, commitHash, {
      value: requiredStake,
    });
    await claimTx.wait(this.config.blockConfirmations);
    
    logger.info({ foroId: foroId.toString(), txHash: claimTx.hash }, 'Job claimed');
    
    // 6. Reveal test inputs first (before execution)
    logger.info({ foroId: foroId.toString() }, 'Revealing test inputs');
    
    const revealTx = await this.contracts.foroRegistry.revealTestInputs(
      foroId,
      testCasesJSON,
      salt
    );
    await revealTx.wait(this.config.blockConfirmations);
    
    logger.info({ foroId: foroId.toString(), txHash: revealTx.hash }, 'Test inputs revealed');
    
    try {
      // 7. Execute test cases
      const executionResults = await executeAllTestCases(
        agentEndpoint,
        agentContract,
        this.config.agentTimeoutMs
      );
      
      // Check if all executions failed
      const successfulExecutions = executionResults.filter(r => r.success);
      if (successfulExecutions.length === 0) {
        throw new Error('All test case executions failed - agent endpoint unreachable or erroring');
      }
      
      // 8. Judge outputs with TEE
      const judgeResults = [];
      const criteria = agentContract.testCases[0]?.['evaluation']?.['criteria'] || [];
      
      for (const executionResult of executionResults) {
        if (!executionResult.success) continue;
        const judgeResult = await judgeAgentOutput(this.zgBroker, executionResult, criteria);
        judgeResults.push(judgeResult);
      }
      
      // Check if TEE evaluation failed
      if (judgeResults.length === 0) {
        throw new Error('TEE evaluation failed - 0G Compute unavailable');
      }
      
      // 9. Calculate metrics
      const avgQualityScore = calculateAverageQualityScore(judgeResults);
      const avgLatencyMs = successfulExecutions.reduce((sum, r) => sum + r.latencyMs, 0) / successfulExecutions.length;
      const rounds = successfulExecutions.length;
      
      // Get chatId from first judge result with TEE proof
      const chatIdHex = judgeResults[0]?.teeProof.chatId || '0x' + '0'.repeat(64);
      const chatId = chatIdHex.startsWith('0x') ? chatIdHex : `0x${chatIdHex}`;
      
      // Composite score: 30% latency + 70% quality (scaled to 0-10000)
      const latencyScore = this.calculateLatencyScore(avgLatencyMs);
      const compositeScore = Math.round((latencyScore * 0.3 + avgQualityScore * 0.7) * 100);
      
      logger.info(
        {
          foroId: foroId.toString(),
          compositeScore,
          avgLatencyMs: Math.round(avgLatencyMs),
          avgQualityScore: Math.round(avgQualityScore),
          rounds,
          chatId,
        },
        'Test evaluation complete'
      );
      
      // 10. Submit successful result
      logger.info({ foroId: foroId.toString() }, 'Submitting result');
      
      const submitTx = await this.contracts.foroRegistry.submitResult(
        foroId,
        compositeScore,
        Math.round(avgLatencyMs),
        rounds,
        chatId
      );
      await submitTx.wait(this.config.blockConfirmations);
      
      logger.info({ foroId: foroId.toString(), txHash: submitTx.hash }, 'Result submitted');
      
      // 11. Wait for contestation window, then finalize
      const contestationWindow = 3600; // 1 hour in seconds
      logger.info(
        { foroId: foroId.toString(), waitSeconds: contestationWindow },
        'Waiting for contestation window'
      );
      
      await new Promise(resolve => setTimeout(resolve, contestationWindow * 1000));
      
      logger.info({ foroId: foroId.toString() }, 'Finalizing result');
      
      const finalizeTx = await this.contracts.foroRegistry.finalizeResult(foroId);
      await finalizeTx.wait(this.config.blockConfirmations);
      
      logger.info({ foroId: foroId.toString(), txHash: finalizeTx.hash }, 'Result finalized');
      
    } catch (testError) {
      // Handle test failure - submit failed result
      logger.error({ error: testError, foroId: foroId.toString() }, 'Test execution or TEE evaluation failed');
      
      // Determine failure reason
      let failureReason = 0; // TIMEOUT
      const errorMessage = testError instanceof Error ? testError.message : String(testError);
      
      if (errorMessage.includes('unreachable')) {
        failureReason = 1; // UNREACHABLE
      } else if (errorMessage.includes('invalid') || errorMessage.includes('response')) {
        failureReason = 2; // INVALID_RESPONSE
      } else if (errorMessage.includes('endpoint')) {
        failureReason = 3; // ENDPOINT_ERROR
      } else if (errorMessage.includes('TEE') || errorMessage.includes('0G Compute')) {
        failureReason = 4; // TEE_UNAVAILABLE
      }
      
      logger.warn({ foroId: foroId.toString(), failureReason }, 'Submitting failed test result');
      
      const failTx = await this.contracts.foroRegistry.submitTestFailed(
        foroId,
        failureReason,
        errorMessage.substring(0, 200) // Truncate error details
      );
      await failTx.wait(this.config.blockConfirmations);
      
      logger.info({ foroId: foroId.toString(), txHash: failTx.hash }, 'Failed test submitted');
      
      // Finalize failure immediately (no contestation window for failures)
      const finalizeFailTx = await this.contracts.foroRegistry.finalizeTestFailure(foroId);
      await finalizeFailTx.wait(this.config.blockConfirmations);
      
      logger.info({ foroId: foroId.toString(), txHash: finalizeFailTx.hash }, 'Test failure finalized');
    }
  }
  
  /**
   * Calculate latency score (0-100)
   * 100 at 500ms, 0 at 3000ms, linear interpolation
   */
  private calculateLatencyScore(avgLatencyMs: number): number {
    if (avgLatencyMs <= 500) return 100;
    if (avgLatencyMs >= 3000) return 0;
    
    const excess = avgLatencyMs - 500;
    const range = 2500; // 3000 - 500
    
    return 100 - (excess / range) * 100;
  }
  
  /**
   * Monitor for committed jobs that exceeded reveal timeout and forfeit their stakes
   * Runs as a background job every 5 minutes
   */
  private startForfeitMonitoring(): void {
    const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
    const REVEAL_TIMEOUT_SECONDS = 3600; // 1 hour
    
    const monitor = async () => {
      if (!this.isRunning) return;
      
      try {
        // Query recent JobClaimed events to find committed jobs
        const currentBlock = await this.contracts.provider.getBlockNumber();
        const BLOCKS_TO_SCAN = 1000; // Approximately last hour on most chains
        
        const filter = this.contracts.foroRegistry.filters.JobClaimed();
        const events = await this.contracts.foroRegistry.queryFilter(
          filter,
          currentBlock - BLOCKS_TO_SCAN,
          currentBlock
        );
        
        logger.info({ eventCount: events.length }, 'Checking for expired committed jobs');
        
        for (const event of events) {
          const foroId = event.args[0];
          
          try {
            // Get job details
            const job = await this.contracts.foroRegistry.getTestJob(foroId);
            
            // Check if job is still in COMMITTED state (JobStatus.COMMITTED = 1)
            if (job.status !== 1) {
              continue;
            }
            
            // Check if reveal timeout has passed
            const currentTimestamp = Math.floor(Date.now() / 1000);
            const commitTimestamp = Number(job.commitTimestamp);
            const timeElapsed = currentTimestamp - commitTimestamp;
            
            if (timeElapsed > REVEAL_TIMEOUT_SECONDS) {
              logger.warn(
                {
                  foroId: foroId.toString(),
                  timeElapsed,
                  keeperAddress: job.keeperAddress,
                },
                'Forfeiting stake for expired job'
              );
              
              // Call forfeitStake to slash the unresponsive keeper
              const forfeitTx = await this.contracts.foroRegistry.forfeitStake(foroId);
              await forfeitTx.wait(this.config.blockConfirmations);
              
              logger.info(
                { foroId: foroId.toString(), txHash: forfeitTx.hash },
                'Stake forfeited successfully'
              );
            }
          } catch (error) {
            // Log but don't stop monitoring other jobs
            logger.error(
              { error, foroId: foroId.toString() },
              'Error checking job for forfeit'
            );
          }
        }
      } catch (error) {
        logger.error({ error }, 'Error in forfeit monitoring');
      }
      
      // Schedule next check
      if (this.isRunning) {
        setTimeout(monitor, CHECK_INTERVAL_MS);
      }
    };
    
    // Start monitoring
    logger.info('Starting forfeit stake monitoring');
    setTimeout(monitor, CHECK_INTERVAL_MS); // First check after 5 minutes
  }
}
