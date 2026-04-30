/**
 * Tests for Judge module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildJudgePrompt,
  parseCriterionScores,
  judgeAgentOutput,
} from '../../src/keeper/judge';
import { ExecutionResult } from '../../src/keeper/executor';
import { ZGComputeBroker } from '../../src/utils/0g-compute';

describe('Judge', () => {
  describe('buildJudgePrompt', () => {
    it('should build correct prompt', () => {
      const output = { summary: 'Test summary' };
      const criteria = ['Criterion 1', 'Criterion 2'];
      
      const prompt = buildJudgePrompt(output, criteria);
      
      expect(prompt).toContain('Test summary');
      expect(prompt).toContain('Criterion 1');
      expect(prompt).toContain('Criterion 2');
      expect(prompt).toContain('criterion_1');
      expect(prompt).toContain('criterion_2');
    });
  });
  
  describe('parseCriterionScores', () => {
    it('should parse valid scores', () => {
      const llmOutput = '{"criterion_1": 80, "criterion_2": 75, "criterion_3": 90}';
      
      const scores = parseCriterionScores(llmOutput, 3);
      
      expect(scores).toHaveLength(3);
      expect(scores[0]).toEqual({ criterionId: 'criterion_1', score: 80 });
      expect(scores[1]).toEqual({ criterionId: 'criterion_2', score: 75 });
      expect(scores[2]).toEqual({ criterionId: 'criterion_3', score: 90 });
    });
    
    it('should handle invalid scores', () => {
      const llmOutput = '{"criterion_1": 150, "criterion_2": -10}';
      
      const scores = parseCriterionScores(llmOutput, 2);
      
      expect(scores).toHaveLength(2);
      expect(scores[0].score).toBe(0);
      expect(scores[1].score).toBe(0);
    });
    
    it('should handle parse errors', () => {
      const llmOutput = 'invalid json';
      
      const scores = parseCriterionScores(llmOutput, 2);
      
      expect(scores).toHaveLength(2);
      expect(scores.every(s => s.score === 0)).toBe(true);
    });
    
    it('should handle missing criteria', () => {
      const llmOutput = '{"criterion_1": 80}';
      
      const scores = parseCriterionScores(llmOutput, 3);
      
      expect(scores).toHaveLength(3);
      expect(scores[0].score).toBe(80);
      expect(scores[1].score).toBe(0);
      expect(scores[2].score).toBe(0);
    });
  });
  
  describe('judgeAgentOutput', () => {
    it('should judge successful execution', async () => {
      const mockBroker = {
        callLLM: vi.fn().mockResolvedValue({
          output: '{"criterion_1": 80, "criterion_2": 75}',
          proof: {
            chatId: '0x1234567890abcdef',
            signature: 'mock-sig',
            verified: true,
          },
        }),
        verifyProof: vi.fn().mockResolvedValue(true),
      } as unknown as ZGComputeBroker;
      
      const executionResult: ExecutionResult = {
        testCaseId: 'tc-01',
        output: { summary: 'Test summary' },
        latencyMs: 1500,
        success: true,
      };
      
      const criteria = ['Criterion 1', 'Criterion 2'];
      
      const result = await judgeAgentOutput(mockBroker, executionResult, criteria);
      
      expect(result.qualityScore).toBe((80 + 75) / 2);
      expect(result.criterionScores).toHaveLength(2);
      expect(result.teeProof.chatId).toBe('0x1234567890abcdef');
      expect(result.teeProof.verified).toBe(true);
    });
    
    it('should return zero score for failed execution', async () => {
      const mockBroker = {} as ZGComputeBroker;
      
      const executionResult: ExecutionResult = {
        testCaseId: 'tc-02',
        output: null,
        latencyMs: 5000,
        success: false,
        error: 'Timeout',
      };
      
      const criteria = ['Criterion 1'];
      
      const result = await judgeAgentOutput(mockBroker, executionResult, criteria);
      
      expect(result.qualityScore).toBe(0);
      expect(result.criterionScores[0].score).toBe(0);
      expect(result.teeProof.verified).toBe(false);
    });
    
    it('should handle LLM errors gracefully', async () => {
      const mockBroker = {
        callLLM: vi.fn().mockResolvedValue({
          output: 'invalid json',
          proof: {
            chatId: '',
            signature: '',
            verified: false,
          },
        }),
        verifyProof: vi.fn().mockResolvedValue(false),
      } as unknown as ZGComputeBroker;
      
      const executionResult: ExecutionResult = {
        testCaseId: 'tc-03',
        output: { summary: 'Test' },
        latencyMs: 1000,
        success: true,
      };
      
      const criteria = ['Criterion 1'];
      
      const result = await judgeAgentOutput(mockBroker, executionResult, criteria);
      
      expect(result.qualityScore).toBe(0);
      expect(result.teeProof.verified).toBe(false);
    });
  });
});
