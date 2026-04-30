/**
 * LLM Judge for Agent Output Evaluation
 * 
 * Uses 0G Compute TEE to evaluate agent outputs against criteria
 */

import { ZGComputeBroker, LLMResponse, TEEProof } from '../utils/0g-compute.js';
import { ExecutionResult } from './executor.js';
import logger from '../utils/logger.js';

export interface EvaluationCriterion {
  id: string;
  description: string;
}

export interface CriterionScore {
  criterionId: string;
  score: number; // 0-100
}

export interface JudgeResult {
  qualityScore: number; // Average of all criterion scores (0-100)
  criterionScores: CriterionScore[];
  teeProof: TEEProof;
}

/**
 * Build LLM prompt for judging agent output
 * 
 * @param agentOutput The agent's output
 * @param criteria Evaluation criteria from Agent Contract
 * @returns Formatted prompt for LLM judge
 */
export function buildJudgePrompt(
  agentOutput: Record<string, unknown>,
  criteria: string[]
): string {
  const prompt = `You are an impartial judge evaluating an AI agent's output.

**Agent Output:**
${JSON.stringify(agentOutput, null, 2)}

**Evaluation Criteria:**
${criteria.map((criterion, idx) => `${idx + 1}. ${criterion}`).join('\n')}

**Instructions:**
Rate each criterion on a scale of 0-100, where:
- 0 = Completely fails the criterion
- 50 = Partially meets the criterion
- 100 = Perfectly meets the criterion

Respond ONLY with valid JSON in this exact format:
{
  "criterion_1": <score>,
  "criterion_2": <score>,
  "criterion_3": <score>
  ...
}

Do not include any explanation, only the JSON object.`;

  return prompt;
}

/**
 * Parse LLM response to extract criterion scores
 * 
 * @param llmOutput The LLM's JSON response
 * @param criteriaCount Number of criteria being evaluated
 * @returns Array of criterion scores
 */
export function parseCriterionScores(
  llmOutput: string,
  criteriaCount: number
): CriterionScore[] {
  try {
    const parsed = JSON.parse(llmOutput);
    const scores: CriterionScore[] = [];
    
    for (let i = 1; i <= criteriaCount; i++) {
      const key = `criterion_${i}`;
      const score = parsed[key];
      
      if (typeof score !== 'number' || score < 0 || score > 100) {
        logger.warn({ key, score }, 'Invalid criterion score, defaulting to 0');
        scores.push({ criterionId: key, score: 0 });
      } else {
        scores.push({ criterionId: key, score });
      }
    }
    
    return scores;
  } catch (error) {
    logger.error({ error, llmOutput }, 'Failed to parse LLM output');
    
    // Return zeros for all criteria on parse error
    return Array.from({ length: criteriaCount }, (_, i) => ({
      criterionId: `criterion_${i + 1}`,
      score: 0,
    }));
  }
}

/**
 * Evaluate agent output using LLM judge with TEE proof
 * 
 * @param broker 0G Compute broker
 * @param executionResult The agent's execution result
 * @param criteria Evaluation criteria from Agent Contract
 * @returns Judge result with quality score and TEE proof
 */
export async function judgeAgentOutput(
  broker: ZGComputeBroker,
  executionResult: ExecutionResult,
  criteria: string[]
): Promise<JudgeResult> {
  if (!executionResult.success || !executionResult.output) {
    logger.warn(
      { testCaseId: executionResult.testCaseId },
      'Execution failed, returning zero quality score'
    );
    
    return {
      qualityScore: 0,
      criterionScores: criteria.map((_, i) => ({
        criterionId: `criterion_${i + 1}`,
        score: 0,
      })),
      teeProof: {
        chatId: '',
        signature: '',
        verified: false,
      },
    };
  }
  
  logger.info({ testCaseId: executionResult.testCaseId }, 'Judging agent output');
  
  // Build prompt
  const prompt = buildJudgePrompt(executionResult.output, criteria);
  
  // Call LLM via 0G Compute TEE
  const llmResponse: LLMResponse = await broker.callLLM(prompt);
  
  // Parse scores
  const criterionScores = parseCriterionScores(llmResponse.output, criteria.length);
  
  // Calculate average quality score
  const qualityScore = criterionScores.length > 0
    ? criterionScores.reduce((sum, s) => sum + s.score, 0) / criterionScores.length
    : 0;
  
  // Verify TEE proof off-chain (optional pre-check)
  if (llmResponse.proof.chatId) {
    const verified = await broker.verifyProof(llmResponse.proof.chatId);
    if (!verified) {
      logger.warn({ chatId: llmResponse.proof.chatId }, 'TEE proof verification failed');
    }
  }
  
  logger.info(
    {
      testCaseId: executionResult.testCaseId,
      qualityScore: Math.round(qualityScore),
      chatId: llmResponse.proof.chatId,
      teeVerified: llmResponse.proof.verified,
    },
    'Agent output judged'
  );
  
  return {
    qualityScore,
    criterionScores,
    teeProof: llmResponse.proof,
  };
}

/**
 * Calculate average quality score from multiple judge results
 * 
 * @param judgeResults Array of judge results
 * @returns Average quality score (0-100)
 */
export function calculateAverageQualityScore(judgeResults: JudgeResult[]): number {
  if (judgeResults.length === 0) return 0;
  
  const sum = judgeResults.reduce((acc, result) => acc + result.qualityScore, 0);
  return sum / judgeResults.length;
}
