# Foro Backend — Keeper Service & Mock Agent

Node.js service that operates as a Foro **Keeper**: polls the blockchain for open test requests, executes agent test cases, routes outputs through a 0G Compute TEE for LLM evaluation, and submits cryptographically-proven scores on-chain.

Also includes a **Mock Agent** server for end-to-end testing without external dependencies.

## Tech Stack

- **Runtime**: Node.js 18+ with ESM
- **Blockchain client**: ethers.js v6
- **Config validation**: Zod
- **Logging**: pino (`utils/logger.ts`)
- **TEE integration**: direct `fetch` to 0G Compute API

---

## Keeper Service

### Entry Point

`src/main.ts` — loads config, wires up contract instances and the 0G Compute broker, starts `KeeperService`.

### Polling Loop (`src/keeper/index.ts`)

```
KeeperService.start()
  └─ pollForJobs()   every POLL_INTERVAL_MS (default 10 s)
       └─ foroRegistry.getAllTestJobs()
            filter: status == REQUESTED && not in processedJobs set
            └─ handleTestRequest(foroId, agentId)  [async, fire-and-forget]
```

`processedJobs: Set<string>` prevents the same job from being picked up twice within a single Keeper process lifetime.

### Full Job Handling (`handleTestRequest`)

```
1. getAgent(agentId)                          → Agent struct
2. erc8004.getMetadata("foro:contract")       → AgentContract JSON
   erc8004.getMetadata("foro:endpoint")       → HTTP URL

3. Build commit-reveal
   salt        = ethers.id(`salt-${Date.now()}-${random}`)
   commitHash  = keccak256(abi.encode(testCasesJSON, salt))

4. claimJob(foroId, commitHash, { value: fee × 2 })

5. revealTestInputs(foroId, testCasesJSON, salt)

6. executeAllTestCases(endpoint, agentContract, timeoutMs)
   └─ POST each testCase.input  →  { output, latencyMs, success }

7. judgeAgentOutput(zgBroker, executionResult, criteria)
   └─ buildJudgePrompt() → 0G Compute (verify_tee: true)
        headers["zg-res-key"]           → chatId
        x_0g_trace.tee_verified         → boolean
        body  →  { criterion_1: N, criterion_2: N, … }

8. compositeScore = latencyScore × 0.30 + avgQualityScore × 0.70
   (latencyScore: 100 at ≤ 500 ms, 0 at ≥ 3 000 ms, linear)

9. submitResult(foroId, compositeScore, avgLatency, rounds, chatId)

10. [production: wait 1 h]

11. finalizeResult(foroId)
    → agentVault.distributePass()  →  70 / 20 / 10 split
```

**Failure path** — any error after `revealTestInputs` results in:
```
submitTestFailed(foroId, failureReason, errorDetails)
finalizeTestFailure(foroId)
  → full fee refund to requester, stake returned to Keeper
```

**Forfeit monitoring** (`startForfeitMonitoring`, disabled in demo) — checks every 5 minutes for `COMMITTED` jobs that exceeded the 1-hour reveal timeout and calls `forfeitStake` to slash the unresponsive Keeper.

---

### Test Executor (`src/keeper/executor.ts`)

```typescript
interface ExecutionResult {
  testCaseId: string;
  output: Record<string, unknown> | null;
  latencyMs: number;
  success: boolean;
  error?: string;
}
```

`executeTestCase` uses `AbortController` to enforce `agentTimeoutMs`. Returns a structured result even on failure so the Keeper can decide whether to proceed to judging.

---

### LLM Judge (`src/keeper/judge.ts`)

**Prompt format**

```
You are an impartial judge evaluating an AI agent's output.

Agent Output: { … }

Evaluation Criteria:
1. <criterion 1>
2. <criterion 2>
…

Respond ONLY with valid JSON:
{ "criterion_1": <0-100>, "criterion_2": <0-100>, … }
```

`parseCriterionScores` extracts the numeric scores and defaults invalid values to 0. `calculateAverageQualityScore` averages across all test cases.

---

### 0G Compute Broker (`src/utils/0g-compute.ts`)

Direct `fetch`-based integration — no SDK, no on-chain ledger interaction.

```
POST https://compute-network-6.integratenetwork.work/v1/proxy/chat/completions
Authorization: Bearer <ZG_COMPUTE_AUTH_TOKEN>
{ model, messages, verify_tee: true }

→ headers["zg-res-key"]         chatId stored on-chain as bytes32
→ x_0g_trace.tee_verified       if false, ForoRegistry forces score = 0
→ x_0g_trace.provider           enclave provider address
```

---

## Mock Agent Server (`src/mock-agent/server.ts`)

Simulates an AI agent for local/testnet demos.

```
POST /summarize   { url: string }  →  { summary: string }
GET  /health                       →  { status: "healthy", uptime }
```

Responses come from `data/mock-responses.json` (URL → summary). Configurable artificial latency via `MOCK_AGENT_LATENCY_MS` (default 500 ms).

The accompanying `data/mock-agent-contract.json` defines the `url-summarizer` Agent Contract:

```json
{
  "category": "url-summarizer",
  "sla": { "maxLatencyMs": 5000, "maxCostUSD": 0.01 },
  "testCases": [
    { "id": "tc-01", "input": { "url": "https://docs.0g.ai/" }, "evaluation": { "criteria": [...] } },
    { "id": "tc-02", "input": { "url": "https://blog.0g.ai/" }, "evaluation": { "criteria": [...] } }
  ]
}
```

---

## Demo Scripts (`scripts/`)

| Script | Purpose |
|---|---|
| `register-mock-agent.ts` | Mints ERC-8004 token, publishes metadata, registers with ForoRegistry |
| `request-test.ts` | Sends `requestTest` with the minimum fee |
| `test-full-flow.ts` | Runs the entire lifecycle end-to-end |

---

## Configuration

Copy `.env.example` to `.env` and fill in:

```bash
# Blockchain
ZG_CHAIN_RPC_URL=http://178.238.236.119:6789
CHAIN_ID=16602
KEEPER_PRIVATE_KEY=0x…

# Deployed contracts
FORO_REGISTRY_ADDRESS=0x…
AGENT_VAULT_ADDRESS=0x…

# 0G Compute
ZG_COMPUTE_ENDPOINT=https://compute-network-6.integratenetwork.work/v1/proxy/chat/completions
ZG_COMPUTE_AUTH_TOKEN=<bearer token>
ZG_COMPUTE_MODEL=qwen/qwen-2.5-7b-instruct
ZG_COMPUTE_ENABLED=true

# Keeper tuning
POLL_INTERVAL_MS=10000
AGENT_TIMEOUT_MS=10000
BLOCK_CONFIRMATIONS=1

# Mock agent
MOCK_AGENT_PORT=3001
MOCK_AGENT_LATENCY_MS=500
```

---

## Running

```bash
pnpm install
pnpm build

# Keeper service
pnpm start

# Mock agent (separate terminal)
pnpm mock-agent

# Full demo flow
pnpm tsx scripts/test-full-flow.ts
```
