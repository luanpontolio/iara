# Foro — Agent Verification Protocol

Foro is a smart contract system that verifies AI agent capabilities through economic staking, TEE-based evaluation, and on-chain reputation. Creators publish immutable Agent Contracts following ERC-8004 with test cases and evaluation criteria. Keepers execute tests, route outputs through an LLM running inside a 0G Compute hardware enclave, and submit cryptographically-proven scores on-chain. The result is a publicly auditable, tamper-resistant reputation for any AI agent.

**Network:** 0G-Galileo-Testnet · Chain ID `16602` · EVM-compatible L1 built for AI workloads

---

## Architecture Overview

```
 Agent Creator                       Foro Protocol                         Keeper Service
 ─────────────                       ─────────────                         ──────────────
 1. ERC8004.register()                                                      
 2. setMetadata("foro:contract", …)                                         
 3. ForoRegistry.registerAgent()──►  ForoRegistry.sol                       
                                     ├─ _agents mapping                     
                                     ├─ _testJobs mapping                   
                                     └─ agentVault.deposit()                
                                           │                                
 Test Requester                       AgentVault.sol                       
 4. requestTest{value}()──────────►  └─ _escrowed[foroId]                  
                                                                            5. pollForJobs()
                                                                            6. claimJob(commitHash, stake×2)
                                                                            7. revealTestInputs(cases, salt)
                                                                            8. executeTestCase() → Agent HTTP endpoint
                                                                            9. 0G Compute → Qwen 2.5-7B (TEE enclave)
                                                                               ├─ x_0g_trace.tee_verified
                                                                               └─ zg-res-key → chatId (bytes32)
                                                                           10. submitResult(score, latency, chatId)
                                                                     ◄────     contestationDeadline = now + 1h
                                     ForoRegistry                          11. finalizeResult()
                                     ├─ distributePass()                       agentVault distributes 70/20/10
                                     └─ _updateAgentStatus()
```

---

## Smart Contracts

Built with **Foundry** and **OpenZeppelin Contracts v5**.

### ForoRegistry.sol

The single entry point for every protocol action. Inherits `Ownable` and `ReentrancyGuard` from OpenZeppelin.

**State**

| Mapping | Type | Purpose |
|---|---|---|
| `_agents` | `uint256 → Agent` | Registered agents indexed by `foroId` |
| `_testJobs` | `uint256 → TestJob` | Test jobs (same counter as agents) |
| `_testResults` | `uint256 → TestResult` | Result per job, written on `submitResult` |
| `_keepers` | `address → Keeper` | Registered Keepers and their stats |
| `_contestations` | `uint256 → Contestation[]` | Per-job contestation history |
| `_pendingWithdrawals` | `address → uint256` | Pull-pattern balance for safe withdrawals |

**Agent lifecycle**

```
registerAgent()  →  PENDING
                     │
           requestTest() + claimJob() + revealTestInputs()
                     │
           submitResult() + finalizeResult()
                     │
           testCount = 1–2  →  PROBATION
           testCount ≥ 3, score ≥ 60  →  VERIFIED
           testCount ≥ 10, score ≥ 80  →  ELITE
           testCount ≥ 3, score < 40   →  FAILED
```

**Job state machine**

```
REQUESTED → COMMITTED → REVEALED → SUBMITTED → FINALIZED
                │                      │
           (timeout)              CONTESTED → FINALIZED | REFUNDED
                │
            REFUNDED
REVEALED → FAILED → FINALIZED
```

**Key functions**

| Function | Who calls it | What it does |
|---|---|---|
| `registerAgent(erc8004, agentId)` | Creator | Reads ERC-8004 metadata, stores `keccak256` as `contractHash` |
| `requestTest(agentId) payable` | Anyone | Escrows fee in AgentVault, emits `TestRequested` |
| `claimJob(foroId, commitHash) payable` | Keeper | Stakes `2× fee`, stores commitment |
| `revealTestInputs(foroId, casesJSON, salt)` | Keeper | Verifies hash, moves job to `REVEALED` |
| `submitResult(foroId, score, latency, rounds, chatId)` | Keeper | Stores `TestResult`; `teeVerified = chatId ≠ 0 && rounds > 0`; score forced to 0 if not verified |
| `finalizeResult(foroId)` | Keeper | Updates cumulative score, triggers `distributePass`, sets contestation deadline |
| `submitTestFailed(foroId, reason, details)` | Keeper | Records failure, transitions to `FAILED` |
| `finalizeTestFailure(foroId)` | Keeper | Returns stake to Keeper, full refund to requester |
| `contestResult(foroId, evidenceURI, hash) payable` | Anyone | Requires 50 % of job stake; blocks finalization |
| `resolveContestation(foroId, contestantWins)` | Owner | Slashes/rewards, routes funds accordingly |
| `withdraw()` | Any beneficiary | Pulls accumulated balance (checks-effects-interactions) |
| `forfeitStake(foroId)` | Anyone | Slashes stake of a Keeper that missed the 1-hour reveal window |

**Score formula (off-chain, submitted by Keeper)**

```
latencyScore  = 100 at ≤ 500 ms → 0 at ≥ 3 000 ms (linear)
qualityScore  = average of LLM criterion scores (0–100)
compositeScore = latencyScore × 0.30 + qualityScore × 0.70   (0–100, stored as 0–10 000 on-chain)
```

**Cumulative score (on-chain)**

```solidity
// Keeper reputation is factored in via getKeeperWeight()
weight = 1 + (jobsCompleted / 10) + (stakedAmount / MIN_KEEPER_STAKE - 1)
cumulativeScore = (oldScore × oldWeight + newScore × keeperWeight) / (oldWeight + keeperWeight)
```

**Libraries used**

- `OpenZeppelin/Ownable` — owner-only `resolveContestation`
- `OpenZeppelin/ReentrancyGuard` — guards all functions that transfer ETH: `finalizeResult`, `finalizeTestFailure`, `forfeitStake`, `resolveContestation`, `withdraw`

---

### AgentVault.sol

A minimal escrow that holds test fees and executes the fee split after finalization. Inherits `Ownable` and `ReentrancyGuard`.

`ForoRegistry` is the sole `owner`; all write functions are `onlyOwner`.

**Fee split**

| Recipient | Share |
|---|---|
| Keeper | 70 % |
| Agent Creator | 20 % |
| Protocol Treasury | 10 % |

**Key functions**

| Function | Trigger |
|---|---|
| `deposit(foroId, requester) payable` | `requestTest` in ForoRegistry |
| `distributePass(foroId, creator, keeper)` | `finalizeResult` or `resolveContestation` (keeper wins) |
| `distributeFail(foroId, requester)` | `finalizeTestFailure`, `forfeitStake`, or `resolveContestation` (contestant wins) |

Transfers use a capped gas-forwarding call (`gas: 10 000`) to prevent griefing by contracts that consume all forwarded gas.

---

### MockERC8004.sol

A fully ERC-8004 compliant agent identity token. Inherits `ERC721URIStorage`, `EIP712`, and `ECDSA` from OpenZeppelin.

```
register(agentURI, metadataEntries[])
  └─ safeMint → stores metadata under key/value pairs
     ├─ "foro:contract" → Agent Contract JSON (immutable fingerprint)
     └─ "foro:endpoint" → Agent HTTP URL
```

`setAgentWallet` requires an EIP-712 signature from the new wallet — prevents hijacking. On token transfer, `agentWallet` is automatically cleared.

---

## Off-Chain: Keeper Service

The Keeper runs as a Node.js service using **ethers.js v6** and monitors open Foros via polling (adapted for demo reliability over pure event subscriptions).

### Full Workflow (per job)

```
1. pollForJobs()
   └─ foroRegistry.getAllTestJobs() → filter status == REQUESTED

2. handleTestRequest(foroId, agentId)
   ├─ foroRegistry.getAgent(agentId)
   ├─ erc8004.getMetadata(agentId, "foro:contract")  → AgentContract JSON
   └─ erc8004.getMetadata(agentId, "foro:endpoint")  → HTTP URL

3. Commit-reveal preparation
   ├─ testCasesJSON = JSON.stringify(agentContract.testCases)
   ├─ salt          = ethers.id(`salt-${Date.now()}-${random}`)
   └─ commitHash    = keccak256(abi.encode(testCasesJSON, salt))

4. foroRegistry.claimJob(foroId, commitHash, { value: fee × 2 })

5. foroRegistry.revealTestInputs(foroId, testCasesJSON, salt)

6. executeAllTestCases(agentEndpoint, agentContract)
   └─ POST each testCase.input → collect { output, latencyMs }

7. judgeAgentOutput(ZGComputeBroker, executionResult, criteria[])
   └─ buildJudgePrompt() → 0G Compute API (verify_tee: true)
      Response headers:
        zg-res-key         → chatId (bytes32 proof stored on-chain)
        x_0g_trace.tee_verified → boolean
      ├─ if tee_verified == false → score forced to 0 on-chain
      └─ parse JSON { criterion_1: score, criterion_2: score, … }

8. compositeScore = latencyScore × 0.30 + avgQualityScore × 0.70

9. foroRegistry.submitResult(foroId, compositeScore, avgLatency, rounds, chatId)

10. Wait for contestation window (1 hour in production; skipped in demo)

11. foroRegistry.finalizeResult(foroId)
    └─ agentVault.distributePass() → 70 / 20 / 10 split
```

**Failure handling** — if the agent endpoint is unreachable or the 0G Compute call fails, the Keeper calls `submitTestFailed` then `finalizeTestFailure`. The test fee is refunded in full; the Keeper's stake is returned without penalty.

**Forfeit monitoring** (background) — scans all `COMMITTED` jobs and calls `forfeitStake` on any that exceeded the 1-hour reveal window without revealing.

### Configuration (`config.ts`)

Validated with **Zod** at startup.

| Variable | Description |
|---|---|
| `ZG_CHAIN_RPC_URL` | 0G-Galileo-Testnet RPC |
| `KEEPER_PRIVATE_KEY` | Keeper's signing wallet |
| `FORO_REGISTRY_ADDRESS` | Deployed ForoRegistry |
| `AGENT_VAULT_ADDRESS` | Deployed AgentVault |
| `ZG_COMPUTE_ENDPOINT` | 0G provider URL |
| `ZG_COMPUTE_AUTH_TOKEN` | Bearer token for 0G API |
| `ZG_COMPUTE_MODEL` | `qwen/qwen-2.5-7b-instruct` |
| `POLL_INTERVAL_MS` | Default `10000` ms |
| `AGENT_TIMEOUT_MS` | Per-request timeout, default `10000` ms |

### 0G Compute TEE Integration (`utils/0g-compute.ts`)

```
POST https://compute-network-6.integratenetwork.work/v1/proxy/chat/completions
{
  model: "qwen/qwen-2.5-7b-instruct",
  messages: [{ role: "user", content: judgePrompt }],
  verify_tee: true
}

Response:
  headers["zg-res-key"]      → chatId  (stored on-chain as bytes32 TEE proof)
  body.x_0g_trace.tee_verified → boolean (false → score = 0)
  body.x_0g_trace.provider    → enclave provider address
```

---

## Off-Chain: Mock Agent (Simulated Environment)

`packages/backend/src/mock-agent/server.ts` — a lightweight HTTP server that simulates an AI agent endpoint without external API dependencies.

```
POST /summarize  { url: string }  →  { summary: string }
GET  /health                      →  { status: "healthy", uptime }
```

Responses are loaded from `data/mock-responses.json` (keyed by URL). Artificial latency is configurable via `MOCK_AGENT_LATENCY_MS`. The Agent Contract metadata it is registered with (`data/mock-agent-contract.json`) contains two test cases for the `url-summarizer` category with criteria like *"Summary captures main topic"* and *"Summary is concise (under 100 words)"* — exactly what the LLM judge evaluates.

The combination of MockERC8004 + Mock Agent + Keeper + 0G Compute TEE allows the full verification flow to be demonstrated end-to-end on testnet without external agent dependencies.

---

## Installation & Quick Start

```bash
# Prerequisites: Node.js 18+, pnpm, Foundry

pnpm install

# Build contracts
cd packages/contracts && forge build

# Build backend
cd ../backend && pnpm build
```

### Deploy Contracts

```bash
cd packages/contracts
forge script script/Deploy.s.sol:Deploy \
  --rpc-url $ZG_CHAIN_RPC_URL \
  --broadcast
```

### Register a Mock Agent

```bash
cd packages/backend
cp .env.example .env  # fill in contract addresses + private keys

# Start the mock agent HTTP server
pnpm mock-agent        # → http://localhost:3001/summarize

# Register the agent on-chain + mint ERC-8004 token
pnpm tsx scripts/register-mock-agent.ts

# Request a test
pnpm tsx scripts/request-test.ts

# Run the full flow in one shot
pnpm tsx scripts/test-full-flow.ts
```

### Run the Keeper Service

```bash
cd packages/backend
pnpm start
```

The Keeper polls every 10 seconds, claims any `REQUESTED` job, executes the test cases, routes through 0G Compute TEE, and finalizes the result.

---

## Security

| Mechanism | Details |
|---|---|
| Commit-reveal | Keeper commits `keccak256(abi.encode(testCasesJSON, salt))` before execution; revealed hash must match |
| Economic staking | Keeper stakes 2× fee; malicious Keepers lose their stake on contestation loss |
| Contestation | Anyone may contest within 1 hour by staking 50 % of the job stake; resolved by protocol owner |
| TEE enforcement | `chatId = 0` → `teeVerified = false` → `score` forced to 0 on-chain regardless of submitted value |
| ReentrancyGuard | All ETH-moving functions are non-reentrant (OpenZeppelin) |
| Pull payments | Beneficiaries call `withdraw()`; state zeroed before transfer (CEI pattern) |

---

## Fee Economics

| Parameter | Value |
|---|---|
| Minimum test fee | 0.001 0G |
| Keeper stake | 2× test fee |
| Minimum Keeper registration stake | 0.01 0G |
| Contestation stake | 50 % of job stake |
| Reveal / contestation window | 1 hour each |

---

## Network

| Field | Value |
|---|---|
| Network name | 0G-Galileo-Testnet |
| Chain ID | 16602 |
| RPC URL | `http://178.238.236.119:6789` |
| Token symbol | 0G |

---

## Project Structure

```
packages/
├── contracts/
│   ├── src/
│   │   ├── ForoRegistry.sol        # Agent registry, test orchestration, Keeper logic
│   │   ├── AgentVault.sol          # Escrow + 70/20/10 fee distribution
│   │   ├── MockERC8004.sol         # ERC-8004 agent identity token
│   │   └── interfaces/             # IForoRegistry, IAgentVault, IERC8004
│   ├── test/
│   │   ├── ForoRegistry.t.sol
│   │   ├── AgentVault.t.sol
│   │   └── Integration.t.sol
│   └── script/Deploy.s.sol
│
├── backend/
│   ├── src/
│   │   ├── main.ts                 # Service entry point
│   │   ├── config.ts               # Zod-validated environment config
│   │   ├── keeper/
│   │   │   ├── index.ts            # Polling loop + job orchestrator
│   │   │   ├── executor.ts         # Agent HTTP calls + latency measurement
│   │   │   └── judge.ts            # LLM prompt builder + TEE response parser
│   │   ├── mock-agent/
│   │   │   └── server.ts           # Simulated agent HTTP server
│   │   └── utils/
│   │       ├── 0g-compute.ts       # 0G Compute fetch wrapper
│   │       ├── contracts.ts        # ethers.js contract instances
│   │       └── logger.ts
│   ├── data/
│   │   ├── mock-agent-contract.json  # ERC-8004 Agent Contract (url-summarizer)
│   │   └── mock-responses.json       # Pre-canned agent responses for testing
│   └── scripts/
│       ├── register-mock-agent.ts
│       ├── request-test.ts
│       └── test-full-flow.ts
│
├── frontend/                       # Next.js 14 + wagmi v2 + viem v2
│   └── src/
│
└── types/                          # Shared TypeScript types (ABI-generated)
```

---

## Resources

- [Specification](./specs/001-ai-agent-arena/spec.md)
- [Implementation Plan](./specs/001-ai-agent-arena/plan.md)
- [ERC-8004 Standard](https://eips.ethereum.org/EIPS/eip-8004)
- [0G Compute Documentation](https://docs.0g.ai/)
- [Foundry Book](https://book.getfoundry.sh/)
