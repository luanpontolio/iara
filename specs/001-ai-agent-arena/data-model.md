# Data Model: Foro - Agent Verification Protocol

**Date**: 2026-04-29  
**Phase**: 1 - Design & Contracts  
**Purpose**: Define entities, relationships, and state transitions

## Entity Definitions

### Agent (On-Chain Entity)

**Storage**: ForoRegistry contract

**Attributes**:
- `foroId` (uint256, unique): Internal ID in Foro system
- `erc8004Address` (address): ERC-8004 contract address where agent is registered
- `erc8004AgentId` (uint256): Agent ID in the ERC-8004 contract
- `contractHash` (bytes32, immutable): keccak256 of Agent Contract JSON, stored at registration
- `creatorWallet` (address): Resolved via ERC-8004 `ownerOf(erc8004AgentId)`, receives 20% of test fees
- `status` (enum): PENDING | PROBATION | VERIFIED | ELITE | FAILED
- `testCount` (uint256): Number of finalized tests
- `cumulativeScore` (uint256): Weighted average score 0-100 scaled to uint (e.g., 7500 = 75.00)
- `totalStakeSlashed` (uint256): Total stake slashed from failed tests/contestations
- `registrationTimestamp` (uint256): Block timestamp of registration

**Relationships**:
- Has one immutable Agent Contract (stored off-chain in ERC-8004 metadata)
- Has zero or more TestJobs
- Has zero or more Contestations (via TestJobs)

**State Transitions**:
```
PENDING (0 tests)
  ↓ [first test finalized]
PROBATION (1-2 tests)
  ↓ [3rd test finalized, score >= 60]
VERIFIED (3+ tests, score >= 60)
  ↓ [10th test finalized, score >= 80]
ELITE (10+ tests, score >= 80)

PENDING/PROBATION/VERIFIED/ELITE
  ↓ [3+ tests finalized, score < 40]
FAILED (3+ tests, score < 40)
```

**Validation Rules**:
- `contractHash` cannot be zero (must have valid Agent Contract)
- `erc8004Address` must be valid ERC-8004 contract (implements ownerOf, getMetadata)
- `cumulativeScore` range: 0-10000 (representing 0.00-100.00 with 2 decimal precision)
- Status transitions are deterministic based on testCount and cumulativeScore

---

### Agent Contract (Off-Chain JSON)

**Storage**: ERC-8004 metadata with key `"foro:contract"`

**Schema** (JSON):
```json
{
  "category": "url-summarizer",
  "version": "1.0.0",
  "input": {
    "type": "object",
    "required": ["url"],
    "properties": {
      "url": { "type": "string", "format": "uri" }
    }
  },
  "output": {
    "type": "object",
    "required": ["summary"],
    "properties": {
      "summary": { "type": "string", "minLength": 50, "maxLength": 500 }
    }
  },
  "sla": {
    "maxLatencyMs": 3000,
    "maxCostUSD": 0.02
  },
  "testCases": [
    {
      "id": "tc-01",
      "description": "Artigo técnico longo",
      "input": { "url": "https://vitalik.ca/general/2024/01/31/cryptoai.html" },
      "evaluation": {
        "criteria": [
          "O resumo menciona AI e blockchain como temas centrais",
          "O resumo tem no máximo 3 frases",
          "Nenhum fato inventado"
        ]
      }
    }
  ]
}
```

**Attributes**:
- `category` (string, required): Agent capability category (MVP: "url-summarizer")
- `version` (string, required): Semantic version (e.g., "1.0.0")
- `input` (JSONSchema, required): Input schema for agent endpoint
- `output` (JSONSchema, required): Expected output schema
- `sla.maxLatencyMs` (uint, required): Maximum acceptable latency in milliseconds
- `sla.maxCostUSD` (float, required): Maximum acceptable cost per execution
- `testCases` (array, required): Minimum 1, recommended 3+ test cases

**TestCase Structure**:
- `id` (string, unique per contract): Test case identifier
- `description` (string): Human-readable test purpose
- `input` (JSON, matches input schema): Input data for agent endpoint
- `evaluation.criteria` (string[], required): Array of natural language evaluation criteria

**Validation Rules**:
- Must be valid JSON parseable by Keeper
- `testCases` array length >= 1
- Each test case `id` must be unique within the contract
- `input` must match declared input schema
- `evaluation.criteria` array length >= 1

**Immutability**:
- Once registered, changing Agent Contract metadata creates new `contractHash`
- All previous test results become invalid for new hash (creator must register new agent with new foroId)

---

### TestJob (On-Chain Entity)

**Storage**: ForoRegistry contract

**Attributes**:
- `foroId` (uint256, unique): Job identifier, also serves as lookup key
- `agentId` (uint256): Foreign key to Agent
- `requester` (address): User who paid test fee
- `testFee` (uint256): Amount escrowed in AgentVault (e.g., 0.001 ETH)
- `keeperAddress` (address): Keeper who claimed job (zero address if unclaimed)
- `keeperStake` (uint256): Stake amount deposited by Keeper (2x testFee)
- `commitHash` (bytes32): keccak256(testCases + salt) committed by Keeper
- `commitTimestamp` (uint256): Block timestamp of commit
- `revealTimestamp` (uint256): Block timestamp of reveal (zero if not revealed)
- `status` (enum): REQUESTED | COMMITTED | REVEALED | SUBMITTED | CONTESTED | FINALIZED | REFUNDED
- `contestationDeadline` (uint256): Block timestamp when contestation window closes (submissionTimestamp + 1 hour)

**Relationships**:
- Belongs to one Agent (via agentId)
- Has zero or one TestResult (created at SUBMITTED status)
- Has zero or more Contestations

**State Transitions**:
```
REQUESTED (user calls requestTest)
  ↓ [Keeper calls claimJob with stake]
COMMITTED (commit hash + stake locked)
  ↓ [Keeper calls revealTestInputs]
REVEALED (test inputs verified)
  ↓ [Keeper calls submitResult]
SUBMITTED (result in pending, contestation window starts)
  ↓ [Keeper calls contestResult] OR [1 hour passes]
CONTESTED (dispute active) OR → FINALIZED (no contest)
  ↓ [Owner resolves: contestantWins OR contestantLoses]
FINALIZED (stake returned, fees distributed)

COMMITTED → REFUNDED (if Keeper never reveals after timeout)
CONTESTED → REFUNDED (if contestant wins)
```

**Validation Rules**:
- `testFee` must match category minimum (e.g., 0.001 ETH for url-summarizer)
- `keeperStake` must be exactly 2x `testFee`
- `commitHash` must be non-zero after commit
- `revealTimestamp` must be > `commitTimestamp` and < commitTimestamp + 24 hours
- Status transitions must follow state machine order

---

### TestResult (On-Chain Entity)

**Storage**: ForoRegistry contract

**Attributes**:
- `foroId` (uint256, primary key): Links to TestJob
- `score` (uint256): Final composite score 0-100 (scaled to 0-10000)
- `latencyScore` (uint256): Latency component score 0-100
- `qualityScore` (uint256): Quality component score 0-100 (avg of criteria scores)
- `avgLatencyMs` (uint256): Average latency across all test cases in milliseconds
- `rounds` (uint256): Number of test cases executed (teeVerified = false → rounds = 0)
- `chatId` (bytes32): 0G Compute chatId (first 32 bytes), proof of TEE evaluation
- `teeProof` (bytes): Full TEE proof bytes (enclave signature, may be truncated for gas)
- `teeVerified` (bool): Whether TEE proof was verified by 0G Compute
- `submissionTimestamp` (uint256): Block timestamp of result submission
- `finalized` (bool): Whether result has been finalized (contestation resolved or window expired)

**Relationships**:
- Belongs to one TestJob (one-to-one via foroId)
- Belongs to one Agent (via TestJob.agentId)
- May have zero or more Contestations

**Score Calculation**:
```
latencyScore = 100 if avgLatencyMs <= 500
              0 if avgLatencyMs >= 3000
              linear interpolation between [500ms, 3000ms]

qualityScore = average of all LLM-evaluated criteria scores (each 0-100)

score = (latencyScore * 0.3) + (qualityScore * 0.7)

if teeVerified = false:
    score = 0 (forced)
```

**Validation Rules**:
- `score`, `latencyScore`, `qualityScore` range: 0-10000 (2 decimal precision)
- `rounds` must be > 0 if teeVerified = true
- `chatId` must be non-zero if teeVerified = true
- Cannot be modified after `finalized = true`

---

### Contestation (On-Chain Entity)

**Storage**: ForoRegistry contract

**Attributes**:
- `contestationId` (uint256, unique): Auto-incremented ID
- `foroId` (uint256): Foreign key to TestJob being contested
- `contestant` (address): Keeper who filed contestation
- `contestStake` (uint256): 50% of original job stake
- `evidence` (string or bytes): IPFS hash or on-chain pointer to evidence
- `evidenceHash` (bytes32): keccak256 of evidence for integrity
- `contestTimestamp` (uint256): Block timestamp of contestation
- `resolved` (bool): Whether owner has resolved the dispute
- `contestantWins` (bool): Resolution outcome (true = contestant wins, false = original Keeper wins)

**Relationships**:
- Belongs to one TestJob (via foroId)
- Filed against one TestResult (via foroId)

**State Transitions**:
```
[TestResult SUBMITTED]
  ↓ [Keeper calls contestResult within 1 hour]
FILED (contestation active, finalization blocked)
  ↓ [Owner calls resolveContestation]
RESOLVED (contestantWins = true OR false)
```

**Validation Rules**:
- `contestStake` must be exactly 50% of TestJob.keeperStake
- `contestTimestamp` must be < TestJob.contestationDeadline (within 1-hour window)
- Cannot contest after finalization
- Cannot contest the same foroId twice by the same contestant

**Resolution Outcomes**:
- **contestantWins = true**: Original Keeper stake slashed (50% to contestant, 50% to protocol), test fee refunded to requester
- **contestantWins = false**: Contest stake goes to protocol, original Keeper receives stake + fee distribution normally

---

### Keeper (Implicit Entity)

**Storage**: KeeperRegistry contract

**Attributes**:
- `keeperAddress` (address, primary key): Keeper's wallet address
- `erc8004Address` (address): Keeper's own ERC-8004 agent (category: "foro-keeper")
- `erc8004AgentId` (uint256): AgentId in ERC-8004 contract
- `stakedAmount` (uint256): Total stake locked in KeeperRegistry (minimum 0.01 ETH)
- `jobsCompleted` (uint256): Total number of finalized jobs
- `jobsContested` (uint256): Total number of jobs contested against this Keeper
- `contestationsWon` (uint256): Number of times Keeper won contestation defense
- `contestationsLost` (uint256): Number of times Keeper lost contestation
- `totalEarned` (uint256): Cumulative fees earned from finalized jobs
- `registrationTimestamp` (uint256): Block timestamp of Keeper registration

**Relationships**:
- Executes zero or more TestJobs
- May file zero or more Contestations
- Has one ERC-8004 agent with category "foro-keeper"

**Keeper Weight Calculation** (for weighted score):
```solidity
function getKeeperWeight(address keeper) public view returns (uint256) {
    uint256 baseWeight = 1;
    uint256 experienceBonus = jobsCompleted / 10;
    uint256 stakeBonus = (stakedAmount / MIN_STAKE) - 1;
    
    return baseWeight + experienceBonus + stakeBonus;
}
```

**Validation Rules**:
- `stakedAmount` must be >= 0.01 ETH (MIN_STAKE) to execute tests
- If `stakedAmount` < MIN_STAKE after slashing, Keeper is deactivated until re-staking
- `erc8004Address` must implement ERC-8004 and metadata `"category"` must equal `"foro-keeper"`

---

## Relationships Diagram

```
ERC-8004 (External)
    ↓ (owns)
Agent ────────────┐
    ↓ (has many)  │
TestJob ──────────┤
    ↓ (has one)   │
TestResult        │ (references)
    ↑             │
    │ (contests)  │
Contestation ─────┘
    ↑ (files)
Keeper
    ↓ (registers as)
ERC-8004 (category: "foro-keeper")
```

---

## Storage Optimization

**On-Chain** (expensive):
- Agent: status, testCount, cumulativeScore, contractHash (32 bytes)
- TestJob: minimal fields (foroId, agentId, requester, keeper, stakes, hashes, status)
- TestResult: scores (uint256), chatId (bytes32), teeVerified (bool)
- Contestation: resolution outcome only

**Off-Chain** (cheap, indexed via events):
- Agent Contract JSON (stored in ERC-8004 metadata)
- Full test case inputs/outputs (Keeper logs or IPFS)
- Evidence URIs for contestations and findings
- Historical metrics (leaderboard rankings, time-series scores)

**Events for Indexing**:
```solidity
event AgentRegistered(uint256 indexed foroId, address indexed erc8004, uint256 erc8004AgentId, bytes32 contractHash);
event TestRequested(uint256 indexed foroId, uint256 indexed agentId, address requester, uint256 fee, uint256 timestamp);
event JobClaimed(uint256 indexed foroId, address indexed keeper, bytes32 commitHash, uint256 stake);
event TestInputsRevealed(uint256 indexed foroId, string testCasesJSON, bytes32 salt);
event ResultSubmitted(uint256 indexed foroId, uint256 score, uint256 avgLatencyMs, bytes32 chatId, bool teeVerified);
event ResultContested(uint256 indexed foroId, address indexed contestant, uint256 contestStake, string evidenceURI);
event ResultFinalized(uint256 indexed foroId, uint256 agentId, uint256 newScore, AgentStatus newStatus);
```

---

## Data Access Patterns

### Creator Workflow:
1. Deploy ERC-8004 contract → `register(agentURI)` → get agentId
2. Publish Agent Contract JSON → `setMetadata(agentId, "foro:contract", JSON bytes)`
3. Register with Foro → `ForoRegistry.registerAgent(erc8004, agentId)`
4. Query agent status → `ForoRegistry.getAgent(foroId)` → status, testCount, cumulativeScore

### User Workflow:
1. Browse agents → query events `AgentRegistered` + filter by status
2. Request test → `ForoRegistry.requestTest{value: 0.001 ETH}(foroId)`
3. Wait for result → listen to `ResultFinalized` event
4. Use agent if VERIFIED → call agent endpoint with x402 payment

### Keeper Workflow:
1. Register as Keeper → `KeeperRegistry.registerKeeper(erc8004, agentId){value: 0.01 ETH}`
2. Listen for tests → subscribe to `TestRequested` events
3. Claim job → `ForoRegistry.claimJob{value: stake}(foroId, inputsHash)`
4. Execute off-chain → call agent endpoint, evaluate via 0G Compute
5. Reveal + Submit → `ForoRegistry.revealTestInputs(...)` → `ForoRegistry.submitResult(...)`
6. Finalize after 1 hour → `ForoRegistry.finalizeResult(foroId)` → receive stake + fee

### Auditor Workflow:
1. Query test result → `ForoRegistry.getTestResult(foroId)` → chatId, teeProof, score
2. Verify TEE proof → validate chatId signature against 0G Compute public key
3. Inspect chatId on 0G Chain explorer → confirm inference trace

---

## Data Integrity Constraints

1. **Agent Registration**:
   - contractHash MUST be keccak256 of valid Agent Contract JSON
   - creatorWallet MUST equal ERC-8004 ownerOf(erc8004AgentId)

2. **Commit-Reveal**:
   - revealedHash MUST equal commitHash
   - testCases in reveal MUST derive to stored contractHash

3. **Fee Distribution**:
   - Sum of keeper + creator + protocol shares MUST equal escrowed amount
   - No rounding errors accumulate in AgentVault

4. **Score Calculation**:
   - If teeVerified = false, score MUST be 0
   - cumulativeScore = weighted average of all finalized test scores

5. **Status Transitions**:
   - Status MUST follow state machine rules strictly
   - Status changes only on finalization, not on submission

6. **Stake Slashing**:
   - Slashed amounts MUST match documented percentages (50/50 or 100%)
   - Slashing cannot cause negative balances

---

## Migration & Versioning

**Contract Upgrades**:
- Use UUPS or Transparent Proxy pattern for upgradeable contracts
- Upgrade authority: Multi-sig (3-of-5) or timelock (48 hours)
- Critical functions (finalization, slashing) frozen during upgrade

**Data Migration**:
- If schema changes (e.g., add new status), migrate via read-only proxy
- Historical data remains immutable (events + old storage)
- New agents use new schema, old agents continue with old schema

**Version Compatibility**:
- Agent Contract version field enables backward compatibility
- Keeper software MUST support all Agent Contract versions in production
- Frontend displays version and warns if agent uses deprecated schema

---

This data model serves as the source of truth for Phase 2 task generation and implementation.
