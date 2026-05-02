/**
 * 0G Compute API Integration (Simplified)
 * 
 * Direct fetch-based integration without SDK complexity.
 * Uses Router's built-in verify_tee feature for TEE verification.
 * No blockchain interaction, no ledger management.
 */

import logger from './logger.js';

export interface TEEProof {
  chatId: string;
  provider: string;        // Provider address from x_0g_trace
  verified: boolean | null; // From x_0g_trace.tee_verified (null = not requested)
}

export interface ZGComputeConfig {
  endpoint: string;     // e.g., https://compute-network-6.integratenetwork.work/v1/proxy/chat/completions
  authToken: string;    // Bearer token from environment
  model: string;        // e.g., qwen/qwen-2.5-7b-instruct
  enabled: boolean;
}

export interface LLMResponse {
  output: string;
  proof: TEEProof;
}

/**
 * 0G Compute broker for LLM inference (simplified, fetch-based)
 */
export class ZGComputeBroker {
  private config: ZGComputeConfig;
  
  constructor(config: ZGComputeConfig) {
    this.config = config;
    this.config.endpoint = process.env.ZG_COMPUTE_ENDPOINT || '';
    this.config.authToken = process.env.ZG_COMPUTE_AUTH_TOKEN || '';
    logger.info({ enabled: config.enabled, endpoint: config.endpoint }, '0G Compute broker created (simplified)');
  }

  /**
   * Call LLM using direct fetch API with TEE verification
   * 
   * @param prompt The LLM prompt
   * @returns Response with output and TEE verification status
   */
  async callLLM(prompt: string): Promise<LLMResponse> {
    if (!this.config.enabled) {
      logger.error('0G Compute is disabled');
      throw new Error('0G Compute is disabled. Set ZG_COMPUTE_ENABLED=true');
    }

    console.log('this.config', this.config);
    // if (!this.config.endpoint || !this.config.authToken) {
    //   logger.error('0G Compute endpoint or auth token not configured');
    //   throw new Error('0G Compute endpoint and auth token are required');
    // }

    try {
      logger.info({ 
        endpoint: this.config.endpoint || 'https://compute-network-6.integratenetwork.work/v1/proxy/chat/completions', 
        model: 'qwen/qwen-2.5-7b-instruct',
        promptLength: prompt.length,
        authToken: process.env.ZG_COMPUTE_AUTH_TOKEN
      }, 'Calling 0G Compute LLM');


      const response = await fetch("https://compute-network-6.integratenetwork.work/v1/proxy/chat/completions", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.ZG_COMPUTE_AUTH_TOKEN}`
        },
        body: JSON.stringify({
          model: 'qwen/qwen-2.5-7b-instruct',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          verify_tee: true  // Enable Router's built-in TEE verification
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error({ 
          status: response.status, 
          statusText: response.statusText,
          error: errorText 
        }, 'LLM request failed');
        throw new Error(`LLM call failed: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json() as {
        id?: string;
        choices?: Array<{ message?: { content?: string } }>;
        x_0g_trace?: {
          request_id?: string;
          provider?: string;
          billing?: {
            input_cost?: string;
            output_cost?: string;
            total_cost?: string;
          };
          tee_verified?: boolean | null;
        };
      };

      const output = data.choices?.[0]?.message?.content || '';
      
      // Get chatId from ZG-Res-Key header (preferred) or fall back to response id
      const chatId = response.headers.get('zg-res-key') || data.id || '';
      
      // Extract TEE verification result from x_0g_trace
      const provider = data.x_0g_trace?.provider || '';
      const teeVerified = data.x_0g_trace?.tee_verified ?? null;

      if (!output) {
        logger.error({ data }, 'No output content in LLM response');
        throw new Error('No output content in LLM response');
      }

      logger.info({ 
        chatId,
        provider,
        teeVerified,
        outputLength: output.length 
      }, 'LLM response received with TEE verification');

      return {
        output,
        proof: {
          chatId,
          provider,
          verified: teeVerified
        }
      };
    } catch (error) {
      logger.error({ error }, 'Failed to call 0G Compute LLM');
      throw error;
    }
  }
}

export function createZGComputeBroker(config: ZGComputeConfig): ZGComputeBroker {
  return new ZGComputeBroker(config);
}
