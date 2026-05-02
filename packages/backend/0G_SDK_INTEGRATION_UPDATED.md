# 0G Compute Integration - Router verify_tee

This document explains the simplified 0G Compute integration using Router's built-in `verify_tee` feature for TEE verification.

## Overview

The integration uses direct HTTP requests to the 0G Compute Router API with:
- **Built-in TEE verification** via Router's `verify_tee: true` parameter
- **No SDK required** for basic LLM calls and verification
- **No blockchain interaction** for making requests
- **Automatic verification** handled by the Router

## Architecture

```
Your App → fetch() → 0G Router (with verify_tee: true)
                         ↓
                    Verifies TEE signature
                         ↓
                    Returns response + tee_verified flag
```

## Installation

No additional packages needed. Uses built-in `fetch` API.

## Configuration

Add these environment variables to your `.env` file:

```bash
# 0G Compute Configuration
ZG_COMPUTE_ENDPOINT=https://router-api.0g.ai/v1/chat/completions
ZG_COMPUTE_AUTH_TOKEN=sk-your-api-key-here
ZG_COMPUTE_MODEL=zai-org/GLM-5-FP8
ZG_COMPUTE_ENABLED=true
```

### Getting Your API Key

1. Visit the [0G Compute Router](https://pc.0g.ai)
2. Generate an API key
3. Copy the key (starts with `sk-`)
4. Add it to your `.env` file

## Usage

### Initialize Broker

```typescript
import { createZGComputeBroker } from './utils/0g-compute.js';

const broker = createZGComputeBroker({
  endpoint: process.env.ZG_COMPUTE_ENDPOINT!,
  authToken: process.env.ZG_COMPUTE_AUTH_TOKEN!,
  model: process.env.ZG_COMPUTE_MODEL || 'zai-org/GLM-5-FP8',
  enabled: true
});

// No initialization needed - ready to use immediately
```

### Make Verified LLM Calls

```typescript
const response = await broker.callLLM("What is the capital of France?");

console.log(response.output);           // "The capital of France is Paris."
console.log(response.proof.chatId);     // Chat ID from ZG-Res-Key header
console.log(response.proof.provider);   // Provider address (0x...)
console.log(response.proof.verified);   // true/false/null (Router verified)
```

## TEE Verification

### How It Works

Every request automatically includes `verify_tee: true`, which tells the Router to:

1. Forward your request to a TEE provider
2. Fetch the provider's cryptographic signature
3. Verify the signature on-chain
4. Return the verification result in `x_0g_trace.tee_verified`

### Verification Results

| `tee_verified` | Meaning |
|----------------|---------|
| `true` | ✅ Router successfully verified the TEE signature |
| `false` | ❌ Signature present but verification failed (untrusted) |
| `null` | ⚠️ No verification available for this provider |

### Trust Model

With `verify_tee: true`, you're trusting the **Router** to:
- Fetch the TEE signature from the provider
- Check the signer address on-chain
- Verify the cryptographic signature

The Router returns a single boolean summarizing that check. For most applications, this level of trust is acceptable.

### Independent Verification (Advanced)

If you need to verify independently without trusting the Router, see the [0G Documentation on Independent Verification](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/features/verifiable-execution#independent-verification-advanced).

## Implementation Details

### Request Format

```typescript
{
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer sk-...'
  },
  body: JSON.stringify({
    model: 'zai-org/GLM-5-FP8',
    messages: [{ role: 'user', content: prompt }],
    verify_tee: true  // Enable Router verification
  })
}
```

### Response Format

```typescript
{
  id: "chat-...",
  choices: [{
    message: {
      content: "Response text..."
    }
  }],
  x_0g_trace: {
    request_id: "uuid",
    provider: "0x...",
    billing: { ... },
    tee_verified: true  // Verification result
  }
}
```

### Headers

- `ZG-Res-Key` response header contains the chat ID (preferred over `id` field)

## Code Structure

### ZGComputeBroker Class

Located in [`packages/backend/src/utils/0g-compute.ts`](packages/backend/src/utils/0g-compute.ts)

**Features:**
- Simple constructor (no async initialization)
- Single `callLLM()` method
- Automatic TEE verification via Router
- Parses verification result from response

### Judge Integration

The judge module in [`packages/backend/src/keeper/judge.ts`](packages/backend/src/keeper/judge.ts) uses the broker:

```typescript
import { judgeAgentOutput } from './keeper/judge.js';

const judgeResult = await judgeAgentOutput(broker, executionResult, criteria);

// Access TEE verification status
console.log(judgeResult.teeProof.verified);  // true/false/null
console.log(judgeResult.teeProof.provider);  // Provider address
```

## Benefits

1. ✅ **Simple setup** - Just endpoint + API key
2. ✅ **Automatic verification** - Router handles TEE checks
3. ✅ **No blockchain** - No wallet or gas fees needed
4. ✅ **Instant startup** - No initialization required
5. ✅ **Fewer dependencies** - No SDK packages
6. ✅ **Verifiable responses** - Cryptographic proof of execution

## When to Use TEE Verification

From the [0G Documentation](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/features/verifiable-execution#when-to-use-it):

- **Most chat-like applications** don't need per-request verification
- **Audit logs, high-trust pipelines, research workloads** benefit from `verify_tee: true`
- Our implementation **enables it by default** for all requests

## Testing

Run the keeper to test:

```bash
cd packages/backend
npm run dev
```

Watch logs for:
```
✅ 0G Compute broker created (simplified)
✅ Calling 0G Compute LLM
✅ LLM response received with TEE verification
   chatId: "..."
   provider: "0x..."
   teeVerified: true
```

## Troubleshooting

### Error: "0G Compute is disabled"
→ Set `ZG_COMPUTE_ENABLED=true` in `.env`

### Error: "endpoint or auth token not configured"
→ Add `ZG_COMPUTE_ENDPOINT` and `ZG_COMPUTE_AUTH_TOKEN` to `.env`

### Error: "401 Unauthorized"
→ Check your API key is valid

### `tee_verified: false` in response
→ Provider's signature failed verification - treat response as untrusted

### `tee_verified: null` in response
→ Provider doesn't support TEE verification

## Comparison: SDK vs Router verify_tee

| Feature | SDK Independent Verification | Router verify_tee |
|---------|------------------------------|-------------------|
| Setup | Complex (wallet + SDK) | Simple (API key) |
| Trust model | Zero-trust (you verify) | Trust Router |
| Code complexity | High | Low |
| Dependencies | SDK package required | None |
| Use case | Highest security needs | Most applications |

## Available Models

Router supports many models. Common ones:

- `zai-org/GLM-5-FP8` (default, recommended)
- `openai/gpt-4o`
- `openai/gpt-4o-mini`
- `anthropic/claude-3.5-sonnet`
- `meta-llama/llama-3.3-70b-instruct`

See [0G Router Models](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/models) for full list.

## References

- [0G Router Verifiable Execution](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/features/verifiable-execution)
- [0G Router Quickstart](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/quickstart)
- [0G Compute Documentation](https://docs.0g.ai/developer-hub/building-on-0g/compute-network)
