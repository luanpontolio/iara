/**
 * Mock Agent Server
 *
 * Simulates an AI agent endpoint for testing the Foro protocol.
 * Responds to URL summarization requests with pre-configured mock responses.
 *
 * Why mock instead of real agent:
 * - Predictable responses for testing
 * - No external API dependencies
 * - Configurable latency for score testing
 * - Demonstrates agent endpoint contract compliance
 *
 * Usage: tsx src/mock-agent/server.ts
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

const PORT = parseInt(process.env.MOCK_AGENT_PORT || '3001', 10);
const ARTIFICIAL_LATENCY_MS = parseInt(process.env.MOCK_AGENT_LATENCY_MS || '500', 10);

interface SummarizeRequest {
  url: string;
}

interface SummarizeResponse {
  summary: string;
}

interface MockResponses {
  [url: string]: {
    summary: string;
  };
}

let mockResponses: MockResponses;

try {
  const mockResponsesPath = join(__dirname, '../../data/mock-responses.json');
  const mockResponsesContent = readFileSync(mockResponsesPath, 'utf-8');
  mockResponses = JSON.parse(mockResponsesContent) as MockResponses;
  console.log('📄 Loaded mock responses for', Object.keys(mockResponses).length, 'URLs');
} catch (error) {
  console.error('❌ Failed to load mock responses:', error);
  process.exit(1);
}

const server = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/summarize') {
    let body = '';

    req.on('data', (chunk) => {
      body += (chunk as Buffer).toString();
    });

    req.on('end', () => {
      void (async () => {
        try {
          const request: SummarizeRequest = JSON.parse(body) as SummarizeRequest;

          if (!request.url || typeof request.url !== 'string') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid request: url field required' }));
            return;
          }

          console.log(`📥 Request: ${request.url}`);

          await new Promise((resolve) => setTimeout(resolve, ARTIFICIAL_LATENCY_MS));

          const mockResponse = mockResponses[request.url] || mockResponses['default'];

          const response: SummarizeResponse = {
            summary: mockResponse?.summary || 'Unable to generate summary for this URL.',
          };

          console.log(`📤 Response: ${response.summary.substring(0, 50)}...`);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(response));
        } catch (error) {
          console.error('❌ Error processing request:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      })();
    });

    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', uptime: process.uptime() }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log('🤖 Mock Agent Server Started');
  console.log(`📡 Listening on: http://localhost:${PORT}`);
  console.log(`⏱️  Artificial latency: ${ARTIFICIAL_LATENCY_MS}ms`);
  console.log(`🔗 Endpoint: POST http://localhost:${PORT}/summarize`);
  console.log(`💚 Health check: GET http://localhost:${PORT}/health`);
  console.log();
  console.log('Ready to receive test requests from Keeper service!');
  console.log();
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down mock agent server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down mock agent server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
