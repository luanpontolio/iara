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
    // this.startForfeitMonitoring();
  }

  /**
   * Finalize the result for a single foroId.
   * Useful for manually finalizing after the contestation window has passed.
   */
  async finalizeJob(foroId: bigint): Promise<void> {
    logger.info({ foroId: foroId.toString() }, 'Finalizing result');

    const finalizeTx = await this.contracts.foroRegistry.finalizeResult(foroId);
    if (!finalizeTx) {
      throw new Error('Failed to create finalize transaction');
    }
    await finalizeTx.wait(this.config.blockConfirmations);

    logger.info({ foroId: foroId.toString(), txHash: finalizeTx.hash }, 'Result finalized');
  }

  /**
   * Run the full keeper workflow for a single foroId and exit.
   * Useful for one-off executions without polling.
   */
  async runSingleJob(foroId: bigint): Promise<void> {
    logger.info({ foroId: foroId.toString() }, 'Running single job');

    // @ts-expect-error - getAllTestJobs exists on ForoRegistry contract
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const job = await this.contracts.foroRegistry.getTestJob(foroId);

    if (!job) {
      throw new Error(`No job found for foroId ${foroId.toString()}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const agentId = (job as { [k: number]: bigint })[1] as bigint;

    await this.handleTestRequest(foroId, agentId);
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
        // Get all test jobs directly from contract
        // @ts-expect-error - getAllTestJobs exists on ForoRegistry contract
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const allJobs = await this.contracts.foroRegistry.getAllTestJobs();
        const availableJobs: Array<{ foroId: bigint; agentId: bigint; requester: string; testFee: bigint }> = [];

        // Filter for jobs in REQUESTED state that haven't been processed
        // Job is Result array: [foroId, agentId, requester, testFee, keeperAddress, status, commitHash, commitTimestamp, score, latency, rounds]
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        for (const job of allJobs) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const foroId = job[0] as bigint;
          const foroIdStr = foroId?.toString();

          if (!foroIdStr) continue;

          // Skip if already processed
          if (this.processedJobs.has(foroIdStr)) {
            continue;
          }

          // Check if job is in REQUESTED state (JobStatus.REQUESTED = 0)
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const status = job[5] as bigint;
          if (status === 0n) {
            availableJobs.push({
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              foroId: job[0] as bigint,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              agentId: job[1] as bigint,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              requester: job[2] as string,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              testFee: job[3] as bigint,
            });
          }
        }

        logger.debug(
          {
            totalJobs: ((allJobs as unknown[] | undefined)?.length) || 0,
            availableJobs: availableJobs?.length || 0,
            processedCount: this.processedJobs.size
          },
          'Polling for jobs'
        );

        for (const job of availableJobs) {
          const foroIdStr = job.foroId.toString();

          // Mark as processed immediately to prevent duplicates
          this.processedJobs.add(foroIdStr);

          logger.info(
            {
              foroId: foroIdStr,
              agentId: job.agentId.toString(),
              requester: job.requester,
              fee: ethers.formatEther(job.testFee),
            },
            'New test job found'
          );

          // Process job asynchronously
          void (async () => {
            try {
              await this.handleTestRequest(job.foroId, job.agentId);
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

    try {
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
      logger.info({ testCasesJSON }, 'testCasesJSON ');
      const commitHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['string', 'bytes32'],
          [testCasesJSON, salt]
        )
      );
      
      // 5. Claim job with stake
      const testJob = await this.contracts.foroRegistry.getTestJob(foroId);
      logger.info({ testJob }, 'testJob fetched');
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
        logger.info({ executionResults }, 'executionResults=======');

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
        // Convert chatId to bytes32 format (remove hyphens, ensure 64 hex chars)
        const chatId = this.convertToBytes32(chatIdHex);
        
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
        logger.info({ 
          foroId: foroId.toString(),
          compositeScore,
          avgLatencyMs: Math.round(avgLatencyMs),
          avgQualityScore: Math.round(avgQualityScore),
          rounds,
          chatId,
        }, 'Submitting result');
        
        const submitTx = await this.contracts.foroRegistry?.submitResult?.(
          foroId,
          compositeScore,
          Math.round(avgLatencyMs),
          rounds,
          chatId
        );
        await submitTx.wait(this.config.blockConfirmations);
        
        logger.info({ foroId: foroId.toString(), txHash: submitTx.hash }, 'Result submitted');
        
        // 11. Wait for contestation window, then finalize
        // const contestationWindow = 3600; // 1 hour in seconds
        logger.info(
          { foroId: foroId.toString() },
          'Waiting for contestation window'
        );
        
        await new Promise(resolve => setTimeout(resolve, 0));
        
        logger.info({ foroId: foroId.toString() }, 'Awaiting to Finalizing');
        
        // const finalizeTx = await this.contracts.foroRegistry.finalizeResult(foroId);
        // if (!finalizeTx) {
        //   throw new Error('Failed to create finalize transaction');
        // }
        // await finalizeTx.wait(this.config.blockConfirmations);
        
        // logger.info({ foroId: foroId.toString(), txHash: finalizeTx.hash }, 'Result finalized');
        
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
    } catch (error) {
      logger.error({ error, foroId: foroId.toString() }, 'Error handling test request');
    }
    finally {
      logger.info({ foroId: foroId.toString() }, 'Test request handled');
    }
  }
  
  /**
   * Convert chatId to bytes32 format using ethers.js
   * Removes hyphens from UUID-like strings and ensures proper bytes32 format
   * @param chatId Raw chatId from zg-res-key header (may contain hyphens)
   * @returns Properly formatted bytes32 string
   */
  private convertToBytes32(chatId: string): string {
    // Remove all hyphens from UUID format
    let hex = chatId.replace(/-/g, '');
    
    // Ensure 0x prefix
    if (!hex.startsWith('0x')) {
      hex = `0x${hex}`;
    }
    
    // Use ethers to pad to 32 bytes (64 hex chars)
    // zeroPadValue pads on the right (for bytes-like data)
    return ethers.zeroPadValue(hex, 32);
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
        // Get all test jobs directly from contract
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        // @ts-expect-error - getAllTestJobs exists on ForoRegistry contract
        const allJobs = await this.contracts.foroRegistry.getAllTestJobs();

        logger.info({ jobCount: (allJobs as unknown[] | undefined)?.length || 0 }, 'Checking for expired committed jobs');

        // Job is Result array: [foroId, agentId, requester, testFee, keeperAddress, status, commitHash, commitTimestamp, score, latency, rounds]
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        for (const job of allJobs) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const foroId = job[0] as bigint;

          try {
            // Check if job is still in COMMITTED state (JobStatus.COMMITTED = 1)
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            const status = job[5] as bigint;
            if (status !== 1n) {
              continue;
            }

            // Check if reveal timeout has passed
            const currentTimestamp = Math.floor(Date.now() / 1000);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            const commitTimestamp = Number(job[7] as bigint);
            const timeElapsed = currentTimestamp - commitTimestamp;
            
            if (timeElapsed > REVEAL_TIMEOUT_SECONDS) {
              logger.warn(
                {
                  foroId: foroId.toString(),
                  timeElapsed,
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                  keeperAddress: job[4] as string,
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
