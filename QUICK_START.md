# Quick Start - 0G Compute with TEE Verification

Get started with verified 0G Compute LLM calls in 3 steps.

## What You Get

- ✅ Direct API calls to 0G Router
- ✅ Automatic TEE verification (cryptographic proof)
- ✅ No blockchain complexity
- ✅ No SDK dependencies
- ✅ 3 environment variables

## Prerequisites

1. ✅ Node.js v22.14.0 (already installed)
2. ⚠️ 0G Router API key (get from dashboard)

## Setup (3 Steps)

### Step 1: Get Your API Key

1. Visit [pc.0g.ai](https://pc.0g.ai)
2. Generate a new API key
3. Copy the key (starts with `sk-`)

### Step 2: Configure Environment

Edit `packages/backend/.env`:

```bash
# 0G Compute Configuration
ZG_COMPUTE_ENDPOINT=https://router-api.0g.ai/v1/chat/completions
ZG_COMPUTE_AUTH_TOKEN=sk-your-key-here  # ← Paste your key
ZG_COMPUTE_MODEL=zai-org/GLM-5-FP8
ZG_COMPUTE_ENABLED=true
```

### Step 3: Run the Keeper

```bash
cd packages/backend
npm run dev
```

## Verify It Works

Watch for these log messages:

```
✅ 0G Compute broker created (simplified)
✅ Calling 0G Compute LLM
✅ LLM response received with TEE verification
   chatId: "chat-..."
   provider: "0x..."
   teeVerified: true  ← Cryptographically verified!
```

## What Is TEE Verification?

Every LLM response is cryptographically verified:

1. Provider runs in **Trusted Execution Environment (TEE)**
2. Provider **signs** every response
3. Router **verifies** signature on-chain
4. You get `tee_verified: true/false` flag

**Result:** Cryptographic proof your response wasn't tampered with! 🔒

## Verification Status

| `tee_verified` | Meaning |
|----------------|---------|
| `true` ✅ | Cryptographically verified by Router |
| `false` ❌ | Verification failed - don't trust response |
| `null` ⚠️ | Provider doesn't support verification |

## That's It!

No wallet, no blockchain, no complexity. Just verified AI responses.

## What You Get

- **Verified responses** - Cryptographic proof of execution
- **Simple setup** - Just add an API key
- **Instant startup** - No initialization delays
- **Direct API calls** - Simple fetch-based requests
- **Full functionality** - Judge module works with verification

## Configuration Reference

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `ZG_COMPUTE_ENDPOINT` | Router API URL | `https://router-api.0g.ai/v1/chat/completions` |
| `ZG_COMPUTE_AUTH_TOKEN` | API key | `sk-...` |
| `ZG_COMPUTE_MODEL` | Model name | `zai-org/GLM-5-FP8` |
| `ZG_COMPUTE_ENABLED` | Enable/disable | `true` |

### Available Models

Popular models on the Router:

- `zai-org/GLM-5-FP8` (default, recommended, fast)
- `openai/gpt-4o`
- `openai/gpt-4o-mini`
- `anthropic/claude-3.5-sonnet`
- `meta-llama/llama-3.3-70b-instruct`

See [full model list](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/models).

## Troubleshooting

### Error: "0G Compute is disabled"
**Solution:** Set `ZG_COMPUTE_ENABLED=true` in `.env`

### Error: "endpoint or auth token not configured"
**Solution:** Add `ZG_COMPUTE_ENDPOINT` and `ZG_COMPUTE_AUTH_TOKEN` to `.env`

### Error: "401 Unauthorized"
**Solution:** Check your API key is valid and not expired

### `tee_verified: false` in logs
**Warning:** Response verification failed - provider's signature didn't match. Treat response as untrusted.

### `tee_verified: null` in logs
**Info:** Provider doesn't support TEE verification. Consider switching models.

## Testing the Integration

Test with a simple LLM call:

```typescript
import { createZGComputeBroker } from './utils/0g-compute.js';

const broker = createZGComputeBroker({
  endpoint: process.env.ZG_COMPUTE_ENDPOINT!,
  authToken: process.env.ZG_COMPUTE_AUTH_TOKEN!,
  model: 'zai-org/GLM-5-FP8',
  enabled: true
});

const response = await broker.callLLM("What is 2+2?");
console.log(response.output);          // "4" or explanation
console.log(response.proof.verified);  // true = verified!
console.log(response.proof.provider);  // Provider address
```

## How Verification Works

```
1. You send request → Router (with verify_tee: true)
2. Router forwards → TEE Provider
3. Provider processes in secure enclave
4. Provider signs response cryptographically
5. Router verifies signature on-chain
6. Router returns: response + tee_verified flag
7. You get verified response ✅
```

**Trust model:** You trust the Router to verify signatures. For most apps, this is perfectly fine. For zero-trust verification, see [0G docs](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/features/verifiable-execution#independent-verification-advanced).

## Next Steps

1. ✅ Confirm the keeper starts without errors
2. ✅ Check `tee_verified: true` in logs
3. ✅ Test agent evaluation with your contracts
4. ✅ Monitor API usage in Router dashboard

## Documentation

- **Full Guide:** [`packages/backend/0G_SDK_INTEGRATION_UPDATED.md`](packages/backend/0G_SDK_INTEGRATION_UPDATED.md)
- **Summary:** [`0G_INTEGRATION_COMPLETE.md`](0G_INTEGRATION_COMPLETE.md)
- **Official:** [0G Router Docs](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router)

## Comparison: Before vs After

| Feature | Before | After |
|---------|--------|-------|
| Setup time | 10 minutes | 2 minutes |
| Dependencies | SDK packages | None |
| Verification | Manual/None | Automatic |
| Configuration | 5+ variables | 3 variables |
| Blockchain | Required | Not needed |
| Startup | ~5-10 seconds | Instant |
| Trust | Self-verify | Trust Router |

## Why This Approach?

**Simple + Verified = Perfect for most apps**

- Most applications don't need zero-trust verification
- Router verification is cryptographically sound
- Simpler code = fewer bugs
- Faster development = ship sooner

For highest security needs (audits, compliance), see [independent verification](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/features/verifiable-execution#independent-verification-advanced).

---

**You're ready!** Every LLM response is now cryptographically verified. 🔒🚀
