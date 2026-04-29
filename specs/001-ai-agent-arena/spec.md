# Feature Specification: Foro - Agent Verification Protocol

**Feature Branch**: `001-ai-agent-arena`  
**Created**: 2026-04-28  
**Updated**: 2026-04-29  
**Status**: Draft  
**Input**: User description: "Foro — A smart contract that verifies whether an AI agent delivers what it declares it delivers. Creators publish Agent Contracts on ERC-8004 with exact test cases and evaluation criteria. Keepers execute tests, evaluate outputs with LLM running in TEE on 0G Compute, and submit results on-chain. The chatId signed by the enclave is the proof. The more independent Keepers reach the same result, the stronger the agent's reputation."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Agent Registration with Immutable Contract (Priority: P1)

A creator deploys an ERC-8004 agent and wants to establish verifiable reputation on-chain. They publish an Agent Contract as metadata on their ERC-8004 token containing: category (e.g., url-summarizer), input/output schemas, SLA constraints (max latency, max cost), and multiple test cases with specific evaluation criteria for each. They then call `registerAgent(erc8004Address, agentId)` on the Foro contract. The contract hash of their Agent Contract is computed and stored on-chain as immutable, preventing any changes after registration. The agent's initial status is PENDING (zero tests completed).

**Why this priority**: This establishes the trust foundation — once registered, the agent's declared capabilities and test cases cannot be changed, ensuring consistent verification across all future tests.

**Independent Test**: Can be fully tested by deploying a mock ERC-8004 agent, publishing metadata with test cases, calling registerAgent, and verifying the contract hash is stored on-chain and immutable (attempting to change metadata after registration should be detectable).

**Acceptance Scenarios**:

1. **Given** a creator has deployed an ERC-8004 agent, **When** they publish Agent Contract metadata with valid schema (category, testCases[], sla), **Then** the metadata is retrievable via ERC-8004 `getMetadata`
2. **Given** Agent Contract metadata is published, **When** creator calls `registerAgent(erc8004, agentId)`, **Then** Foro contract computes and stores contractHash on-chain and sets agent status to PENDING
3. **Given** an agent is registered, **When** creator attempts to update Agent Contract metadata, **Then** the contractHash mismatch is detectable (old hash on-chain vs new hash computed from updated metadata)
4. **Given** Agent Contract contains invalid schema (missing required fields), **When** creator attempts registerAgent, **Then** transaction reverts with clear error message
5. **Given** an agent is already registered, **When** creator attempts to register the same agentId again, **Then** transaction reverts (no duplicate registrations)

---

### User Story 2 - Test Execution with Keeper Staking and TEE Validation (Priority: P2)

A user wants to verify an agent's capabilities before using it. They call `requestTest{value: 0.001 ETH}` for a PENDING or PROBATION agent. The fee goes into escrow in the AgentVault contract. A Keeper listening for TestRequested events reads the Agent Contract via `getMetadata`, extracts the test cases, and commits `keccak256(testCases + salt)` along with stake (2x the test fee) in a single transaction. The Keeper then executes each test case by calling the agent's endpoint with the specified input, measures latency per round, and constructs evaluation prompts using the creator's criteria. The Keeper calls 0G Compute SDK to evaluate quality via LLM running in TEE, receiving a chatId signed by the enclave as cryptographic proof. After validation, the Keeper reveals the test inputs by calling `revealTestInputs(testCases, salt)` — the contract verifies the hash matches the commit and derives the contractHash. The Keeper submits the result in pending state with score components (latency score 30% + quality score 70%). A 1-hour contestation window begins. If no contestation occurs, calling `finalizeResult(arenaId)` returns stake to Keeper, distributes fee (70% Keeper, 20% agent wallet, 10% protocol), and updates the agent's cumulative score.

**Why this priority**: This is the core verification mechanism with economic security (staking), cryptographic proof (TEE), and dispute resolution, ensuring trustworthy test results.

**Independent Test**: Can be fully tested by requesting a test, running a Keeper that commits hash + stakes, executes test cases, obtains TEE proof from 0G Compute, reveals inputs, submits result, waits 1 hour without contestation, and finalizes to receive stake + fee distribution.

**Acceptance Scenarios**:

1. **Given** a user calls requestTest with correct fee, **When** transaction confirms, **Then** TestRequested event is emitted with arenaId, agentId, fee amount, and escrow is locked in AgentVault
2. **Given** TestRequested event is emitted, **When** Keeper commits hash without stake, **Then** transaction reverts (stake is mandatory for claiming the job)
3. **Given** Keeper commits hash + stake, **When** Keeper executes test cases and obtains chatId from 0G Compute, **Then** `processResponse` verifies TEE proof and returns teeVerified = true
4. **Given** Keeper calls revealTestInputs, **When** revealed testCases hash does not match commit, **Then** transaction reverts and Keeper cannot submit result
5. **Given** Keeper submits result after successful reveal, **When** no contestation occurs within 1 hour, **Then** finalizeResult distributes stake back to Keeper and splits fee (70/20/10)
6. **Given** TEE verification fails (teeVerified = false), **When** score is computed, **Then** score is forced to 0 regardless of latency or quality metrics

---

### User Story 3 - Result Contestation and Dispute Resolution (Priority: P3)

Any Keeper can contest a submitted result during the 1-hour contestation window by providing evidence. The contesting Keeper must stake 50% of the original job stake. In the MVP, the contract owner reviews the evidence off-chain and calls `resolveContestation(arenaId, contestantWins: bool)`. If the contestant wins, the original Keeper's stake is slashed (50% to contestant, 50% to protocol), and the test fee is refunded to the user who paid for the test. If the contestant loses, their contest stake goes to the protocol, and the original Keeper receives their full stake + fee distribution normally. This provides an economic mechanism to challenge incorrect or fraudulent test results.

**Why this priority**: Ensures test result integrity through economic incentives and community oversight. P3 because the system functions without contestations (most tests will be honest), but this is essential for handling edge cases and malicious actors.

**Independent Test**: Can be fully tested by submitting a result, having a second Keeper contest with evidence and 50% stake, having owner resolve in favor of contestant, and verifying stake slashing + user refund occur correctly.

**Acceptance Scenarios**:

1. **Given** a result is submitted and pending, **When** another Keeper calls `contestResult` with evidence and 50% stake within 1 hour, **Then** contest is recorded on-chain and finalization is blocked
2. **Given** a contested result, **When** owner calls resolveContestation with contestantWins=true, **Then** original Keeper stake is slashed (50% to contestant, 50% to protocol) and user receives test fee refund
3. **Given** a contested result, **When** owner calls resolveContestation with contestantWins=false, **Then** contest stake goes to protocol and original Keeper receives stake + fee normally
4. **Given** the 1-hour window expires, **When** someone attempts to contest after expiration, **Then** transaction reverts (contestation window closed)
5. **Given** a result with no contestation, **When** 1 hour passes, **Then** anyone can call finalizeResult and the original Keeper receives stake + fee distribution

---

### User Story 4 - Agent Status Progression and Reputation Scoring (Priority: P2)

As multiple tests are completed for an agent, their status evolves based on the number of tests and weighted average score. PENDING (0 tests) → PROBATION (1-2 tests, score consolidating) → VERIFIED (3+ tests, score >= 60) → ELITE (10+ tests, score >= 80). If an agent receives 3+ tests with score < 40, status becomes FAILED. Each test result contributes to a cumulative weighted score where weight is proportional to each Keeper's reputation. The scoring algorithm for each test round is: `score_round = (latency_score * 0.3) + (quality_score * 0.7)` where latency_score is 100 points at <= 500ms, 0 points at >= 3000ms (linear interpolation), and quality_score is the average of all LLM-evaluated criteria (0-100 per criterion). Users and Keepers can query an agent's current status, cumulative score, and full test history on-chain.

**Why this priority**: This establishes the reputation layer that users rely on to select trustworthy agents. P2 because it depends on P1 (registration) and P2-3 (test execution + contestation) being functional first.

**Independent Test**: Can be fully tested by running multiple test rounds for an agent, verifying status transitions at thresholds (1st test → PROBATION, 3rd test with high score → VERIFIED, 10th test with score 80+ → ELITE), and confirming score calculation matches the 30/70 latency/quality formula.

**Acceptance Scenarios**:

1. **Given** an agent has completed 1 test, **When** result is finalized, **Then** status changes from PENDING to PROBATION and cumulative score equals the single test score
2. **Given** an agent in PROBATION has completed 3 tests with scores 75, 80, 70, **When** querying agent status, **Then** status is VERIFIED (3+ tests, avg score >= 60)
3. **Given** an agent has 10 tests with weighted average score 82, **When** querying status, **Then** status is ELITE (10+ tests, score >= 80)
4. **Given** an agent has 3 tests with scores 35, 38, 32, **When** querying status, **Then** status is FAILED (3+ tests, avg < 40)
5. **Given** a test result with latency 1500ms and quality criteria avg 80, **When** score is computed, **Then** score_round = (50 * 0.3) + (80 * 0.7) = 15 + 56 = 71

---

### User Story 5 - Using Verified Agents via x402 Payment Protocol (Priority: P4)

Users who want to use a VERIFIED or ELITE agent can call the agent's endpoint directly. The agent responds with HTTP 402 Payment Required including x402 payment instructions (scheme, token, amount, facilitator). The user constructs an EIP-3009 `TransferWithAuthorization` signature for the exact amount and submits it with the original request. The agent (or its proxy) verifies payment via the x402 facilitator's /verify and /settle endpoints, executes the service, and returns the result. Each successful execution increments the agent's usage counter on-chain (or off-chain initially in MVP). Users can audit their payment history and verify they received service for each payment.

**Why this priority**: This is the monetization and usage layer post-verification. P4 because it depends on agents having VERIFIED/ELITE status first (P1-P3), but is essential for the full ecosystem value loop.

**Independent Test**: Can be fully tested by calling a VERIFIED agent endpoint, receiving 402 response, constructing x402 payment proof, resubmitting with payment, receiving service result, and verifying payment was settled on-chain.

**Acceptance Scenarios**:

1. **Given** a VERIFIED agent, **When** user calls endpoint without payment header, **Then** receives 402 response with x402 payment details (token, amount, facilitator URL)
2. **Given** user constructs valid EIP-3009 signature for requested amount, **When** submitting request with x402 payment header, **Then** agent verifies payment via facilitator and processes request
3. **Given** user provides insufficient payment amount, **When** submitting request, **Then** agent rejects with 402 error indicating required amount
4. **Given** agent successfully processes paid request, **When** execution completes, **Then** usage counter for that agent increments and is queryable on-chain or via API
5. **Given** user disputes they paid but didn't receive service, **When** auditing on-chain, **Then** payment transaction and timestamp are verifiable via x402 facilitator logs

---

### Edge Cases

- What happens when the agent's endpoint is offline or doesn't respond during test execution?
  - Keeper captures timeout/error, submits result with score = 0 and error details, user receives automatic refund from escrow, agent status remains PENDING or degrades based on failure count.

- How does the system prevent spam registration of invalid agents?
  - Test cost is paid by users (not creators), acting as a natural filter. However, repeated FAILED tests for the same agent damage its reputation permanently on-chain, disincentivizing spam. Additionally, registration could require a small stake in future versions.

- What happens if the Keeper or 0G Compute is temporarily unavailable?
  - If Keeper commits hash + stake but fails to reveal within a timeout window (e.g., 24 hours), the contract allows automatic refund to user and stake slashing. If 0G Compute is down, Keeper cannot obtain TEE proof, so teeVerified = false and score = 0.

- How to ensure the same agent isn't tested simultaneously by multiple users?
  - The contract doesn't prevent concurrent test requests. Multiple Keepers can work on different test requests for the same agent in parallel. Each TestRequested event creates a unique arenaId, so results are independent.

- How to prevent a malicious creator from changing the endpoint after passing tests?
  - The contractHash stored on-chain at registration is immutable. Any change to the Agent Contract metadata (including endpoint URL) would produce a different hash. Users and Keepers can detect this mismatch, and all previous test results become invalid for the new contract.

- What happens when a Keeper commits but never reveals (griefing attack)?
  - After a reveal timeout period (e.g., 24 hours), the contract allows anyone to call `forfeitStake(foroId)`, which slashes the Keeper's stake (100% to protocol or user refund) and refunds the test fee to the user. This prevents Keepers from locking jobs.

- What happens if two Keepers claim the same test job?
  - Multiple Keepers can execute the same test to build consensus. Each Keeper commits independently with their own stake, executes the test cases, and submits results. The weighted average of all finalized results contributes to the agent's cumulative score, with weight proportional to each Keeper's reputation. This creates stronger signal — the more independent Keepers reach similar scores, the more reliable the agent's reputation. Each gets their own unique foroId when committing to the same test request.

- How to handle disputes when owner resolution is subjective?
  - In MVP, owner is trusted to review evidence off-chain. In future versions, this can be replaced with multi-sig, DAO governance, or automated on-chain verification of evidence (e.g., comparing TEE proofs from multiple Keepers).

- What happens if test criteria in Agent Contract are ambiguous or impossible to satisfy?
  - The LLM evaluator in TEE interprets criteria as written. If criteria are poorly defined, agents may receive low scores. This incentivizes creators to write clear, measurable criteria. Users can review test cases before requesting tests.

- What if an agent's SLA constraints (maxLatencyMs, maxCostUSD) are unrealistic?
  - If actual latency or cost exceeds SLA during testing, the latency score component will be 0 or very low, resulting in a low overall score. This naturally filters out agents with unrealistic SLAs.

## Requirements *(mandatory)*

### Functional Requirements

#### Agent Registration & Contract

- **FR-001**: Creators MUST deploy an ERC-8004 compliant token contract before registering with Foro
- **FR-002**: Creators MUST publish Agent Contract as metadata on their ERC-8004 token via `setMetadata(agentId, "foro:contract", bytes(JSON))` before registration
- **FR-003**: Agent Contract JSON MUST include: category (string), version (string), input schema (JSONSchema), output schema (JSONSchema), sla (maxLatencyMs, maxCostUSD), testCases array (min 1, recommended 3+)
- **FR-004**: Each test case in Agent Contract MUST include: id (unique per contract), description (human-readable), input (matches input schema), evaluation.criteria (array of strings describing expected properties)
- **FR-005**: Creators MUST call `registerAgent(erc8004Address, agentId)` to register on Foro after publishing Agent Contract metadata
- **FR-006**: Foro contract MUST compute `contractHash = keccak256(agentContractJSON)` and store it immutably on-chain at registration time
- **FR-007**: Registration MUST revert if: ERC-8004 contract invalid, agentId already registered, or Agent Contract metadata not found or unparseable
- **FR-008**: Newly registered agents MUST have initial status PENDING (zero tests completed)

#### Test Request & Escrow

- **FR-009**: Users MUST call `requestTest{value: testFeeAmount}` with exact fee amount (defined per category, e.g., 0.001 ETH for url-summarizer)
- **FR-010**: Test fee MUST be held in escrow by AgentVault contract until test is finalized or refunded
- **FR-011**: `requestTest` MUST emit `TestRequested` event with: foroId (unique), agentId, requester address, fee amount, timestamp
- **FR-012**: Users MAY request tests for agents in any status (PENDING, PROBATION, VERIFIED, ELITE, FAILED) to accumulate more reputation data

#### Keeper Job Claiming with Commit-Reveal

- **FR-013**: Keepers MUST commit by calling `commitTest(foroId, keccak256(testCases + salt)){value: stake}` where stake = 2x testFeeAmount
- **FR-014**: Commit MUST revert if: foroId not found, job already claimed, stake amount insufficient, or commit window expired
- **FR-015**: Successful commit MUST lock the job to that Keeper and prevent other Keepers from claiming the same foroId

#### Test Execution & TEE Validation

- **FR-016**: Keepers MUST retrieve Agent Contract via ERC-8004 `getMetadata(agentId, "foro:contract")` after committing
- **FR-017**: Keepers MUST execute each test case by calling the agent's endpoint with the specified input and measuring latency per round
- **FR-018**: Keepers MUST construct evaluation prompts containing: agent output, test case description, and evaluation criteria from Agent Contract
- **FR-019**: Keepers MUST call 0G Compute SDK to evaluate quality via LLM running in TEE, obtaining chatId (signed by enclave) as proof
- **FR-020**: Keepers MUST call `processResponse(providerAddress, chatId)` on 0G Compute to verify TEE proof, receiving teeVerified (bool) and response data
- **FR-021**: Quality score MUST be computed as average of LLM-evaluated criteria scores (each 0-100)
- **FR-022**: Latency score MUST be computed as: 100 points if latency <= 500ms, 0 points if latency >= 3000ms, linear interpolation between
- **FR-023**: Final round score MUST be: `score_round = (latency_score * 0.3) + (quality_score * 0.7)`
- **FR-024**: If teeVerified = false, final score MUST be forced to 0 regardless of latency/quality metrics

#### Reveal & Result Submission

- **FR-025**: Keepers MUST call `revealTestInputs(foroId, testCases, salt)` before submitting result
- **FR-026**: Reveal MUST revert if: `keccak256(testCases + salt)` does not match committed hash, or revealed testCases do not derive to the registered contractHash
- **FR-027**: Keepers MUST call `submitResult(foroId, score, latency, chatId, teeProof)` to submit result in pending state
- **FR-028**: Result submission MUST include: score (0-100), average latency (ms), chatId from 0G Compute, TEE proof bytes
- **FR-029**: Submitted results MUST enter 1-hour contestation window before finalization

#### Contestation & Dispute Resolution

- **FR-030**: Any Keeper MAY call `contestResult(foroId, evidence){value: contestStake}` within 1-hour window where contestStake = 50% of original job stake
- **FR-031**: Contest MUST revert if: contestation window expired, result already finalized, or contest stake insufficient
- **FR-032**: Owner MUST call `resolveContestation(foroId, contestantWins: bool)` to resolve disputes in MVP
- **FR-033**: If contestantWins = true: original Keeper stake MUST be slashed (50% to contestant, 50% to protocol), test fee MUST be refunded to user
- **FR-034**: If contestantWins = false: contest stake MUST go to protocol, original Keeper receives stake + fee distribution normally
- **FR-035**: After contestation window expires with no contest, anyone MAY call `finalizeResult(foroId)` to complete the test

#### Finalization & Fee Distribution

- **FR-036**: `finalizeResult` MUST revert if: contestation window not expired, result already finalized, or active contestation not resolved
- **FR-037**: Finalization MUST return full stake to Keeper (if no contestation or contestation lost)
- **FR-038**: Finalization MUST distribute test fee as: 70% to Keeper, 20% to agent creator wallet, 10% to protocol treasury
- **FR-039**: Finalization MUST update agent's cumulative score with weighted average incorporating the new test result
- **FR-040**: Finalization MUST increment agent's test count

#### Agent Status & Reputation

- **FR-041**: Agent status MUST transition based on test count and cumulative score:
  - PENDING: 0 tests
  - PROBATION: 1-2 tests
  - VERIFIED: 3+ tests AND score >= 60
  - ELITE: 10+ tests AND score >= 80
  - FAILED: 3+ tests AND score < 40
- **FR-042**: Cumulative score MUST be weighted average of all finalized test scores, weighted by each Keeper's reputation (equal weights in MVP)
- **FR-043**: Anyone MUST be able to query agent status, cumulative score, test count, and full test history on-chain

#### Agent Usage via x402

- **FR-044**: VERIFIED or ELITE agents MAY integrate x402 payment protocol at their endpoints to monetize usage
- **FR-045**: Agent endpoints using x402 MUST respond with HTTP 402 when called without valid payment header
- **FR-046**: x402 response MUST include payment details: scheme (exact), token address, amount, facilitator URL
- **FR-047**: Agents or their proxies MUST verify payment via x402 facilitator /verify and /settle endpoints before processing paid requests
- **FR-048**: Each successful paid execution SHOULD increment agent's usage counter (on-chain in future, off-chain in MVP)

### Key Entities

- **Agent**: Represents an AI agent registered in the Foro protocol
  - Attributes: agentId (unique within ERC-8004 contract), erc8004Address (contract address), contractHash (keccak256 of Agent Contract JSON, immutable), creatorWallet (receives 20% of test fees), status (PENDING | PROBATION | VERIFIED | ELITE | FAILED), testCount (number of finalized tests), cumulativeScore (weighted average 0-100), registrationTimestamp
  - Relationships: has one immutable Agent Contract (stored as ERC-8004 metadata), has zero or more TestResults, has zero or more Contestations

- **AgentContract**: Represents the immutable test specification published by creator (stored as ERC-8004 metadata, not as separate on-chain entity)
  - Attributes: category (string, e.g., "url-summarizer"), version (string), input schema (JSONSchema), output schema (JSONSchema), sla.maxLatencyMs (uint), sla.maxCostUSD (float), testCases[] (array of TestCase objects)
  - TestCase structure: id (string), description (string), input (JSON matching input schema), evaluation.criteria[] (array of evaluation strings)
  - Relationships: belongs to exactly one Agent (referenced by agentId in metadata key "foro:contract")

- **TestJob**: Represents a test request and its lifecycle from request to finalization
  - Attributes: foroId (unique job ID), agentId, requester (user who paid), testFee (amount in escrow), keeperAddress (who claimed job), keeperStake (2x testFee), commitHash (keccak256 of testCases + salt), commitTimestamp, revealTimestamp, status (requested | committed | revealed | submitted | contested | finalized | refunded)
  - Relationships: belongs to one Agent, has zero or one TestResult (after submission), has zero or more Contestations

- **TestResult**: Represents submitted test outcome from a Keeper (before or after finalization)
  - Attributes: foroId (links to TestJob), score (0-100, composite of latency + quality), avgLatencyMs (measured during test execution), chatId (from 0G Compute, proof of TEE evaluation), teeProof (bytes of cryptographic proof), teeVerified (bool), submissionTimestamp, finalized (bool)
  - Relationships: belongs to one TestJob, belongs to one Agent (via foroId → agentId), may have zero or more Contestations

- **Contestation**: Represents a dispute filed against a submitted result
  - Attributes: foroId (which job is contested), contestant (Keeper who filed), contestStake (50% of original job stake), evidence (string or bytes, off-chain pointer or on-chain data), contestTimestamp, resolved (bool), contestantWins (bool, set by owner after resolution)
  - Relationships: belongs to one TestJob, filed against one TestResult

- **Keeper**: Represents an entity that executes tests (not a separate on-chain entity in MVP, just addresses that interact with Foro)
  - Implicit attributes tracked per address: reputation score (for weighted score calculation in future), total tests executed, total tests contested, contestations won/lost
  - Relationships: executes zero or more TestJobs, may file zero or more Contestations

- **x402Execution**: Represents usage of a VERIFIED/ELITE agent via x402 payment (off-chain tracking in MVP, on-chain in future)
  - Attributes: executionId, agentId, user (optional/pseudonymous), paymentAmount, paymentToken, latency, success (bool), timestamp
  - Relationships: belongs to one Agent with status VERIFIED or ELITE

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Creators can register an agent (deploy ERC-8004, publish Agent Contract metadata, call registerAgent) and verify contractHash on-chain in under 3 minutes from metadata publication
- **SC-002**: Users can request a test by calling `requestTest{value: fee}` and receive TestRequested event confirmation within 1 block (~12 seconds on 0G Chain)
- **SC-003**: Keepers can commit hash + stake, execute test cases, obtain TEE proof from 0G Compute, reveal inputs, and submit result within 10 minutes for 95% of tests (excluding 1-hour contestation window)
- **SC-004**: 100% of test results include valid TEE proof (chatId + enclave signature) that can be independently verified by anyone
- **SC-005**: When no contestation occurs, finalization (stake return + fee distribution) completes within 5 minutes after the 1-hour window expires
- **SC-006**: When contestation occurs and owner resolves, stake slashing or refund executes within 1 transaction (< 1 minute)
- **SC-007**: Agent status transitions (PENDING → PROBATION → VERIFIED → ELITE) occur immediately upon result finalization based on test count and score thresholds
- **SC-008**: Cumulative score updates correctly with weighted average formula incorporating each new test result (verifiable by anyone reading on-chain data)
- **SC-009**: System handles at least 10 concurrent test requests (different arenaIds) without gas cost increases or transaction failures
- **SC-010**: Users requesting tests on agents that score < 60 receive automatic refunds within 2 minutes of finalization (via fee distribution logic or explicit refund call)
- **SC-011**: Auditors can retrieve full test result data (foroId → agentId, score, latency, chatId, teeProof, timestamps) and verify TEE signature in under 2 minutes using public blockchain explorer
- **SC-012**: VERIFIED or ELITE agents using x402 complete paid requests (402 challenge → payment → service delivery) in under 5 seconds for 90% of executions
- **SC-013**: Scoring algorithm produces consistent results: test with 1500ms latency and 80 quality → score = (50 * 0.3) + (80 * 0.7) = 71, verifiable on-chain or by recomputing from stored latency + quality values

## Assumptions

- **Target Users**: Creators are AI agent developers with technical capability to deploy ERC-8004 contracts and expose HTTP endpoints; users are crypto-native early adopters with wallets; Keepers are technically sophisticated operators familiar with off-chain execution and on-chain settlement
- **ERC-8004 Integration**: Creators must deploy their own ERC-8004 compliant contracts externally before registering with Foro; Foro does not deploy ERC-8004 contracts on behalf of creators
- **MVP Scope**: Single category (url-summarizer) with fixed test case structure and evaluation criteria; multiple categories and dynamic category creation will be added post-MVP via governance
- **Keeper Operation**: Keepers run off-chain services (bots) that monitor TestRequested events, execute tests, and interact with 0G Compute SDK; Foro provides economic incentives (fee share) and security (staking) but does not provide Keeper software in MVP
- **Keeper Decentralization**: Multiple independent Keepers can participate, but reputation weighting in score calculation is equal in MVP (sophisticated reputation systems for Keepers are post-MVP)
- **0G Compute Integration**: 0G Compute is available and functional with TEE (Trusted Execution Environment) support; LLM evaluation model is pre-deployed and accessible via 0G Compute SDK; chatId + enclave signature is the standard proof format
- **TEE Proof Format**: 0G Compute returns chatId signed by enclave as proof; Foro contract trusts 0G Compute's signature verification without implementing full enclave attestation verification on-chain in MVP (off-chain verification by auditors is sufficient)
- **x402 Payment**: x402 facilitators (Base USDC or Tempo USDC.e) are operational; agents integrate x402 at their endpoints independently; Foro does not provide x402 proxy or facilitator services in MVP
- **Blockchain**: Foro contracts are deployed on 0G Chain (EVM-compatible); native token is ETH (or 0G native token); test fees are paid in native token for simplicity in MVP (ERC-20 fee tokens post-MVP)
- **Gas Costs**: 0G Chain gas costs are low enough that test fee (e.g., 0.001 ETH) covers Keeper execution costs plus profit margin; fee distribution percentages (70/20/10) assume gas is negligible relative to fee
- **Agent Endpoint Availability**: Agent endpoints are publicly accessible via HTTPS without complex authentication; agents handle their own authentication if needed (e.g., API keys in request headers); Foro only verifies connectivity and response validity
- **Contestation Resolution**: Contract owner is trusted to resolve contestations fairly in MVP by reviewing off-chain evidence; decentralized dispute resolution (DAO, multi-sig, or automated) is post-MVP
- **Data Persistence**: Test results (score, latency, chatId, teeProof) are stored on-chain permanently; Agent Contract JSON is stored in ERC-8004 metadata (off-chain IPFS or centralized, referenced by on-chain pointer); x402 execution logs are off-chain (DB or logs) in MVP, on-chain in future
- **Re-testing**: Agents can be tested unlimited times by different users; each test is independent with unique foroId; cumulative score incorporates all finalized tests; there is no "re-test invalidates previous result" mechanism
- **Agent Contract Immutability**: After registration, any change to Agent Contract metadata (even typo fixes) invalidates the contractHash and all previous tests; creators must register a new agent with a new agentId if they want to change test cases
- **Security Model**: Commit-reveal prevents front-running of test execution; staking (2x fee for Keeper, 50% for contestant) provides economic security against griefing and fraud; TEE proof ensures evaluation integrity; 1-hour contestation window allows community oversight
- **Refund Conditions**: Automatic refunds occur when: agent endpoint fails (timeout/error), TEE verification fails (teeVerified = false), or contestation is won by contestant; no refunds for low scores if test executed successfully with valid TEE proof
- **Score Degradation**: Agents with VERIFIED or ELITE status can degrade to lower status if subsequent tests yield low scores (e.g., agent endpoint breaks, performance degrades); status is always computed from current test count + cumulative score

## Constitutional Considerations

**Code Quality Requirements**:
- Feature will be implemented in independent modules (smart contracts, Keeper service, frontend/CLI) to maintain PRs <400 lines each
- Smart contracts must follow strict interface definitions before implementation:
  - `IForoRegistry` (registerAgent, getAgent, getAgentStatus)
  - `IAgentVault` (requestTest, escrow management, fee distribution)
  - `ITestOrchestrator` (commitTest, revealTestInputs, submitResult, finalizeResult)
  - `IContestation` (contestResult, resolveContestation)
- Keeper service MUST use strong typing (TypeScript or Rust) with interfaces for:
  - ERC-8004 metadata retrieval (ethers.js or web3.js)
  - 0G Compute SDK integration (TEE proof verification)
  - On-chain transaction submission (commit, reveal, submit)
- All cryptographic operations (keccak256, signature verification) MUST use audited libraries (ethers.js, OpenZeppelin)

**Testing Requirements**:
- Target 90%+ test coverage for critical smart contracts (commit-reveal, staking, slashing, fee distribution, refund)
- Unit tests MUST cover:
  - Commit-reveal hash verification logic
  - Staking amount validation (2x fee for Keeper, 50% for contestant)
  - Fee distribution calculation (70/20/10 split)
  - Score calculation (latency 30%, quality 70%, linear interpolation)
  - Status transition logic (PENDING → PROBATION → VERIFIED → ELITE → FAILED)
- Integration tests MUST cover:
  - ERC-8004 metadata retrieval (mock or testnet contract)
  - 0G Compute SDK mock (simulate TEE proof response)
  - Full test flow: commit → execute → reveal → submit → finalize
- E2E tests MUST cover critical flows:
  - Happy path: register → request → commit+stake → execute+TEE → reveal → submit → finalize → status VERIFIED
  - Contestation path: submit → contest+stake → resolve(contestantWins) → slashing + refund
  - Timeout path: commit without reveal → forfeitStake → user refund
- Security tests MUST cover:
  - Reentrancy protection on fee distribution and refund
  - Commit-reveal front-running resistance (reveal must match commit hash)
  - Double-claim prevention (job lock after first commit)

**User Experience Requirements**:
- Frontend (if implemented) or CLI tool MUST provide:
  - Agent registration wizard with Agent Contract JSON validation
  - Test request interface with fee display and wallet connection
  - Real-time status updates (listening to events: TestRequested, ResultSubmitted, ResultFinalized)
  - Leaderboard view with filtering by category and status
- All user-facing states MUST have feedback:
  - "Registering agent..." → success with contractHash + transaction link
  - "Test requested, waiting for Keeper..." → estimated wait time
  - "Test in progress (1-hour contestation window)" → countdown timer
  - "Test finalized, agent status: VERIFIED" → link to on-chain result
- Error messages MUST be actionable:
  - "Agent Contract metadata not found" → guide to publish metadata via setMetadata
  - "Insufficient stake" → show required amount (2x fee)
  - "Reveal hash mismatch" → indicate commit-reveal failure (likely bug in Keeper)
- Terminology consistency:
  - "Agent" not "Model" or "Bot"
  - "Test" not "Evaluation" or "Assessment"
  - "Keeper" not "Validator" or "Oracle"
  - "Score" not "Rating" or "Rank"

**Performance Requirements**:
- Smart contracts:
  - `requestTest` gas cost < 100k gas (~$0.01 on 0G Chain)
  - `commitTest` gas cost < 150k gas (includes stake transfer)
  - `submitResult` gas cost < 200k gas (includes score update and status transition)
  - `finalizeResult` gas cost < 300k gas (includes stake return + 3 fee transfers)
- Keeper service:
  - Monitor TestRequested events with <5 second latency
  - Complete full test execution (agent call + TEE + on-chain submit) in <5 minutes for 95% of cases
  - Handle at least 10 concurrent jobs without resource exhaustion
- Frontend/CLI:
  - Query agent status (read-only call) in <1 second
  - Display leaderboard (list of agents) in <3 seconds for up to 100 agents
  - Submit transactions (requestTest, registerAgent) with <10 second confirmation on 0G Chain

**Workflow Compliance**:
- This spec MUST be approved by stakeholders before generating plan.md via `/speckit-plan`
- Implementation MUST follow task list generated via `/speckit-tasks` after plan approval
- Each module MUST have independent PRs following dependency order:
  1. Smart contract interfaces (IForoRegistry, IAgentVault, ITestOrchestrator, IContestation)
  2. Core contracts (ForoRegistry, AgentVault)
  3. Test orchestration contracts (TestOrchestrator, Contestation logic)
  4. Keeper service (off-chain bot)
  5. Frontend/CLI (if in scope)
  6. Integration tests (testnet deployment + E2E)

**Feature-Specific Constraints**:
- **Security Critical - Staking & Slashing**: Keeper stake and contest stake handling MUST be reentrancy-safe; use OpenZeppelin ReentrancyGuard or Checks-Effects-Interactions pattern; incorrect slashing (e.g., slashing wrong party) is a critical bug
- **Security Critical - Fee Distribution**: 70/20/10 split MUST be exact with no rounding errors accumulating escrow balance; all escrowed funds MUST be distributed or refunded (zero balance after finalization/refund)
- **Security Critical - Commit-Reveal**: Reveal MUST verify hash matches commit AND testCases derive to registered contractHash; accepting mismatched reveal enables griefing attacks
- **Immutability**: TestResult data (score, latency, chatId, teeProof) stored on-chain is permanent; no admin functions to modify or delete results after finalization (immutability is a trust requirement)
- **External Dependency - 0G Compute**: Keeper service MUST handle 0G Compute unavailability gracefully (retry logic, exponential backoff, timeout); if TEE proof unavailable, Keeper MUST NOT submit result (or submit with teeVerified=false and score=0)
- **External Dependency - ERC-8004**: Metadata retrieval failure (agent contract not found, JSON unparseable) MUST revert registration or test execution with clear error; no silent failures
- **Gas Optimization**: Use `calldata` instead of `memory` for large structs (Agent Contract JSON, test cases) to reduce gas costs on read-only functions
- **Auditability**: All cryptographic operations (hash computation, signature verification) MUST be documented with references to standards (keccak256 per EVM spec, ECDSA per EIP-191/712 if applicable)
- **Upgradeability**: Smart contracts MAY use proxy pattern (UUPS or Transparent) for upgradeability in MVP, but upgrade authority MUST be explicitly documented and secured (multi-sig or timelock in production)
