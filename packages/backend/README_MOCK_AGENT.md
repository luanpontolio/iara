# Mock Agent for Foro Protocol Testing

This directory contains a complete mock agent testing infrastructure for the Foro protocol.

## Overview

The mock agent simulates an AI URL summarizer agent that:
- Accepts URLs as input
- Returns mock summaries
- Responds with configurable latency
- Allows testing the full Keeper workflow

## Components

### 1. Agent Contract Metadata
**File**: `data/mock-agent-contract.json`

Defines the agent's capabilities following ERC-8004 spec:
- Category: `url-summarizer`
- Input schema: `{ "url": "string" }`
- Output schema: `{ "summary": "string" }`
- Test cases with evaluation criteria

### 2. Mock Responses
**File**: `data/mock-responses.json`

Pre-configured responses for known URLs:
- `https://docs.0g.ai/` - Documentation summary
- `https://blog.0g.ai/` - Blog summary
- `default` - Fallback response

### 3. Mock Agent Server
**File**: `src/mock-agent/server.ts`

Express server that simulates the agent endpoint:
- Endpoint: `POST /summarize`
- Health check: `GET /health`
- Configurable latency via `MOCK_AGENT_LATENCY_MS`

### 4. Registration Script
**File**: `scripts/register-mock-agent.ts`

Registers the mock agent on-chain:
1. Mints ERC-8004 token
2. Sets `foro:contract` metadata
3. Sets `foro:endpoint` metadata
4. Registers with ForoRegistry

### 5. Test Request Script
**File**: `scripts/request-test.ts`

Requests a test for a registered agent:
1. Verifies agent exists
2. Calls `requestTest()` with test fee
3. Returns test job ID
4. Exits immediately for Keeper to process

This is the recommended way to test agents after registration, as it's simpler than the full flow test and allows you to iterate quickly.

### 6. Full Flow Test
**File**: `scripts/test-full-flow.ts`

End-to-end integration test:
1. Verifies agent registration
2. Requests a test
3. Monitors Keeper execution
4. Validates result finalization

## Usage

### Step 1: Setup Environment

Make sure your `.env` file has these values:
```bash
# Contract addresses (from deployment)
ERC8004_ADDRESS=0x...
FORO_REGISTRY_ADDRESS=0x...
AGENT_VAULT_ADDRESS=0x...

# Mock agent config
MOCK_AGENT_PORT=3001
MOCK_AGENT_URL=http://localhost:3001/summarize
MOCK_AGENT_LATENCY_MS=500
```

### Step 2: Register Mock Agent

```bash
npm run mock-agent:register
```

This will:
- Mint a new ERC-8004 token
- Set agent metadata
- Register on ForoRegistry
- Output the `foroId` (save this!)

### Step 3: Start Mock Agent Server

In a separate terminal:
```bash
npm run mock-agent:serve
```

The server will start on port 3001 and respond to test requests.

### Step 4: Start Keeper Service

In another terminal:
```bash
npm run dev
```

The Keeper will:
- Poll for test requests
- Execute tests against the mock agent
- Submit results with TEE validation

### Step 5: Request a Test

Now you can request tests for your registered agent:

```bash
npm run request-test <foroId>
```

Replace `<foroId>` with the ID from Step 2. For example:
```bash
npm run request-test 1
```

This script will:
- Verify the agent exists
- Create a test job with the minimum fee
- Return the test job ID
- Let the Keeper automatically process it

You can request multiple tests for the same agent to see how scores accumulate.

### Alternative: Run Full Flow Test

For a complete end-to-end test that monitors the entire process:

```bash
npm run test:full-flow <foroId>
```

Replace `<foroId>` with the ID from Step 2.

This will:
- Request a test
- Wait for Keeper execution
- Monitor result submission
- Verify finalization

**Note**: For most testing, `request-test` is simpler and faster. Use `test-full-flow` when you need to validate the entire workflow end-to-end.

## Example Output

### Registration
```
🤖 Mock Agent Registration Script

Step 1: Minting ERC-8004 token...
✅ ERC-8004 token minted!
  Token ID: 1
  Tx: 0x...

Step 2: Setting foro:contract metadata...
✅ Agent Contract metadata set

Step 3: Setting foro:endpoint metadata...
✅ Endpoint metadata set

Step 4: Registering agent on ForoRegistry...
✅ Agent registered on ForoRegistry!
  Foro ID: 1
  Contract Hash: 0x...
```

### Test Request
```
🧪 Test Request Script

Step 1: Verifying agent exists...
✅ Agent found!
  Foro ID: 1
  Status: PENDING
  Test Count: 0

Step 2: Requesting test...
  Test Fee: 0.001 ETH
✅ Test requested successfully!
  Test Job ID: 5

🎉 Test job created!

Next steps:
  1. The keeper service will automatically pick up this job
  2. Track job status with: npm run check-job 5

📝 Save this value for tracking:
  export TEST_JOB_ID=5
```

### Mock Server
```
🤖 Mock Agent Server Started
📡 Listening on: http://localhost:3001
⏱️  Artificial latency: 500ms
🔗 Endpoint: POST http://localhost:3001/summarize
💚 Health check: GET http://localhost:3001/health

Ready to receive test requests from Keeper service!
```

### Full Flow Test
```
🧪 Full Flow Integration Test

Step 1: Verify agent is registered...
✅ Agent found!
  Foro ID: 1
  Status: PENDING
  Test Count: 0

Step 2: Request test...
✅ Test requested!
  Test Job ID: 2

Step 3: Waiting for Keeper to claim job...
✅ Job claimed by Keeper: 0x...

Step 4: Waiting for result submission...
✅ Result submitted!
  Score: 8500
  Avg Latency: 523 ms
  Rounds: 2
  TEE Verified: true

🎉 Full flow test completed successfully!
```

## Configuration

### Mock Agent URL
Set in `.env`:
```bash
MOCK_AGENT_URL=http://localhost:3001/summarize
```

For remote testing, use a public URL (e.g., ngrok):
```bash
MOCK_AGENT_URL=https://your-tunnel.ngrok.io/summarize
```

### Response Latency
Control response time for testing different score scenarios:
```bash
MOCK_AGENT_LATENCY_MS=500  # Fast (good score)
MOCK_AGENT_LATENCY_MS=2000 # Slow (lower score)
```

### Custom Responses
Edit `data/mock-responses.json` to add more URLs:
```json
{
  "https://example.com": {
    "summary": "Your custom summary here"
  }
}
```

## Testing Different Scenarios

### Test Fast Agent (High Score)
```bash
MOCK_AGENT_LATENCY_MS=300 npm run mock-agent:serve
```

### Test Slow Agent (Lower Score)
```bash
MOCK_AGENT_LATENCY_MS=2500 npm run mock-agent:serve
```

### Test Agent Failure
Stop the mock agent server before Keeper executes tests.
The Keeper should submit a `FAILED` result.

## Troubleshooting

### Agent Not Responding
- Check if mock server is running: `curl http://localhost:3001/health`
- Verify `MOCK_AGENT_URL` in `.env` matches the server address
- Check firewall settings if using remote URL

### Keeper Not Claiming Jobs
- Verify Keeper service is running: `npm run dev`
- Check Keeper has sufficient balance for stake
- Review Keeper logs for errors

### Test Not Finalizing
- Wait for contestation window (1 hour default)
- Check if result was contested
- Verify transaction didn't revert

## Architecture

```
┌─────────────────┐
│  User/Script    │
│  requestTest()  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ForoRegistry    │
│ (on-chain)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Keeper Service  │
│ - Poll events   │
│ - Execute tests │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Mock Agent      │
│ POST /summarize │
│ Returns summary │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 0G Compute TEE  │
│ Judge outputs   │
│ Return proof    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ForoRegistry    │
│ submitResult()  │
│ finalizeResult()│
└─────────────────┘
```

## Next Steps

1. **Multiple Agents**: Register multiple mock agents with different configurations
2. **Custom Categories**: Create agents for other categories (beyond url-summarizer)
3. **Load Testing**: Use multiple concurrent tests to stress-test the system
4. **Failure Scenarios**: Test timeout, unreachable endpoints, invalid responses

## Related Files

- Keeper Service: `src/keeper/index.ts`
- Test Executor: `src/keeper/executor.ts`
- TEE Judge: `src/keeper/judge.ts`
- Contract ABIs: `src/utils/contracts.ts`
