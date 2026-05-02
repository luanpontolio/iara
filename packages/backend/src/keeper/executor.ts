/**
 * Test Case Executor
 * 
 * Executes agent test cases by calling agent endpoints
 */

import logger from '../utils/logger.js';

export interface TestCase {
  id: string;
  description: string;
  input: Record<string, unknown>;
}

export interface ExecutionResult {
  testCaseId: string;
  output: Record<string, unknown> | null;
  latencyMs: number;
  success: boolean;
  error?: string;
}

export interface AgentContract {
  category: string;
  version: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  sla: {
    maxLatencyMs: number;
    maxCostUSD: number;
  };
  testCases: TestCase[];
}

/**
 * Execute a single test case against an agent endpoint
 * 
 * @param agentEndpoint The agent HTTP endpoint
 * @param testCase The test case to execute
 * @param timeoutMs Timeout in milliseconds
 * @returns Execution result with output and latency
 */
export async function executeTestCase(
  agentEndpoint: string,
  testCase: TestCase,
  timeoutMs: number = 10000
): Promise<ExecutionResult> {
  const startTime = Date.now();

  try {
    logger.info({ testCaseId: testCase.id, endpoint: agentEndpoint }, 'Executing test case');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(agentEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCase.input),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      logger.warn(
        { testCaseId: testCase.id, status: response.status },
        'Agent endpoint returned error'
      );

      return {
        testCaseId: testCase.id,
        output: null,
        latencyMs,
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const output = await response.json();

    logger.info(
      { testCaseId: testCase.id, latencyMs },
      'Test case executed successfully'
    );

    return {
      testCaseId: testCase.id,
      output: output as Record<string, unknown> | null,
      latencyMs,
      success: true,
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        logger.error({ testCaseId: testCase.id, timeoutMs }, 'Test case timed out');

        return {
          testCaseId: testCase.id,
          output: null,
          latencyMs,
          success: false,
          error: `Timeout after ${timeoutMs}ms`,
        };
      }
      logger.error(
        { testCaseId: testCase.id, error: error.message },
        'Test case execution failed'
      );
      return {
        testCaseId: testCase.id,
        output: null,
        latencyMs,
        success: false,
        error: error.message,
      };
    }

    return {
      testCaseId: testCase.id,
      output: null,
      latencyMs,
      success: false,
      error: 'Unknown error',
    };
  }
}

/**
 * Execute all test cases for an agent
 *
 * @param agentEndpoint The agent HTTP endpoint
 * @param agentContract The agent contract with test cases
 * @param timeoutMs Timeout per test case in milliseconds
 * @returns Array of execution results
 */
export async function executeAllTestCases(
  agentEndpoint: string,
  agentContract: AgentContract,
  timeoutMs: number = 10000
): Promise<ExecutionResult[]> {
  logger.info(
    { endpoint: agentEndpoint, testCount: agentContract.testCases.length },
    'Executing all test cases'
  );

  const results: ExecutionResult[] = [];

  for (const testCase of agentContract.testCases) {
    const result = await executeTestCase(agentEndpoint, testCase, timeoutMs);
    results.push(result);
  }

  const successCount = results.filter(r => r.success).length;
  const avgLatency = results.reduce((sum, r) => sum + r.latencyMs, 0) / results.length;

  logger.info(
    {
      total: results.length,
      successful: successCount,
      failed: results.length - successCount,
      avgLatencyMs: Math.round(avgLatency),
    },
    'All test cases executed'
  );

  return results;
}
