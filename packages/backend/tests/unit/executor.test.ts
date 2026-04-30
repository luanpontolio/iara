/**
 * Tests for Executor module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeTestCase, executeAllTestCases, AgentContract } from '../../src/keeper/executor';

describe('Executor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('executeTestCase', () => {
    it('should execute test case successfully', async () => {
      const mockResponse = { summary: 'Test summary' };
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });
      
      const result = await executeTestCase(
        'https://agent.example.com',
        {
          id: 'tc-01',
          description: 'Test case 1',
          input: { url: 'https://example.com' },
        },
        5000
      );
      
      expect(result.success).toBe(true);
      expect(result.output).toEqual(mockResponse);
      expect(result.testCaseId).toBe('tc-01');
      expect(result.latencyMs).toBeGreaterThan(0);
    });
    
    it('should handle HTTP errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });
      
      const result = await executeTestCase(
        'https://agent.example.com',
        {
          id: 'tc-02',
          description: 'Test case 2',
          input: { url: 'https://example.com' },
        },
        5000
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('HTTP 500');
    });
    
    it('should handle timeout', async () => {
      global.fetch = vi.fn().mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('AbortError')), 100);
        });
      });
      
      const result = await executeTestCase(
        'https://agent.example.com',
        {
          id: 'tc-03',
          description: 'Test case 3',
          input: { url: 'https://example.com' },
        },
        50 // Very short timeout
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    }, 10000);
    
    it('should handle network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      
      const result = await executeTestCase(
        'https://agent.example.com',
        {
          id: 'tc-04',
          description: 'Test case 4',
          input: { url: 'https://example.com' },
        },
        5000
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });
  
  describe('executeAllTestCases', () => {
    it('should execute all test cases', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ summary: 'Test summary' }),
      });
      
      const agentContract: AgentContract = {
        category: 'url-summarizer',
        version: '1.0.0',
        input: {},
        output: {},
        sla: {
          maxLatencyMs: 3000,
          maxCostUSD: 0.02,
        },
        testCases: [
          {
            id: 'tc-01',
            description: 'Test 1',
            input: { url: 'https://example1.com' },
          },
          {
            id: 'tc-02',
            description: 'Test 2',
            input: { url: 'https://example2.com' },
          },
        ],
      };
      
      const results = await executeAllTestCases(
        'https://agent.example.com',
        agentContract,
        5000
      );
      
      expect(results).toHaveLength(2);
      expect(results[0].testCaseId).toBe('tc-01');
      expect(results[1].testCaseId).toBe('tc-02');
      expect(results.every(r => r.success)).toBe(true);
    });
    
    it('should handle mixed success/failure', async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ summary: 'Success' }),
          });
        } else {
          return Promise.resolve({
            ok: false,
            status: 500,
            statusText: 'Error',
          });
        }
      });
      
      const agentContract: AgentContract = {
        category: 'url-summarizer',
        version: '1.0.0',
        input: {},
        output: {},
        sla: { maxLatencyMs: 3000, maxCostUSD: 0.02 },
        testCases: [
          { id: 'tc-01', description: 'Test 1', input: {} },
          { id: 'tc-02', description: 'Test 2', input: {} },
        ],
      };
      
      const results = await executeAllTestCases(
        'https://agent.example.com',
        agentContract,
        5000
      );
      
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });
  });
});
