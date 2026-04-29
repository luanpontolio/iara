# Tasks: Foro - Agent Verification Protocol

**Input**: Design documents from `/specs/001-ai-agent-arena/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are included following TDD approach as specified in Constitutional Considerations (90%+ coverage target for contracts, 80%+ for Keeper service).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Contracts**: `packages/contracts/src/`, `packages/contracts/test/`
- **Backend/Keeper**: `packages/backend/src/`, `packages/backend/tests/`
- **Frontend**: `packages/frontend/src/`, `packages/frontend/tests/`
- **Shared Types**: `packages/types/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Monorepo initialization and project structure

- [X] T001 Create monorepo structure (packages/contracts, packages/backend, packages/frontend, packages/types)
- [X] T002 Initialize Foundry project in packages/contracts/ with foundry.toml configuration
- [X] T003 [P] Initialize Node.js/TypeScript project in packages/backend/ with tsconfig.json (strict mode enabled)
- [X] T004 [P] Initialize Next.js 14 project in packages/frontend/ with TypeScript and TailwindCSS
- [X] T005 [P] Initialize shared types package in packages/types/ with package.json
- [X] T006 Setup pnpm workspace configuration at repository root with workspace dependencies
- [X] T007 [P] Configure ESLint and Prettier for TypeScript packages (backend, frontend, types)
- [X] T008 [P] Configure Solhint for Solidity packages (contracts)
- [X] T009 Create .env.example files for contracts, backend, and frontend with required variables

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core interfaces and infrastructure that MUST be complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Contract Interfaces

**Note**: Simplified to 3 contracts only - MockERC8004, ForoRegistry (with Keeper logic), AgentVault (simple Ownable + ReentrancyGuard, no ERC-4626)

- [X] T010 [P] Create IERC8004.sol interface in packages/contracts/src/interfaces/ (external standard reference)
- [X] T011 [P] Create IForoRegistry.sol interface in packages/contracts/src/interfaces/ with all core functions (registerAgent, requestTest, claimJob, revealTestInputs, submitResult, finalizeResult, contestResult, resolveContestation, registerKeeper, getKeeperWeight)
- [X] T012 [P] Create IAgentVault.sol interface in packages/contracts/src/interfaces/ with escrow and fee distribution functions

### Core Contracts Implementation

- [X] T013 Implement MockERC8004.sol in packages/contracts/src/ with register(), setMetadata(), getMetadata(), ownerOf(), tokenURI(), getAgentWallet() functions
- [X] T014 Write Foundry unit tests for MockERC8004 in packages/contracts/test/MockERC8004.t.sol (test metadata storage, ownership, agent wallet resolution)

### Shared Types

- [X] T015 [P] Define Agent Contract JSON schema types in packages/types/agent.ts (category, version, input/output schemas, SLA, testCases)
- [X] T016 [P] Define Keeper service types in packages/types/keeper.ts (TestJob, ExecutionResult, TEEProof)
- [X] T017 Setup ABI→TypeScript generation script in packages/types/ to generate contract types from Foundry artifacts

### Testing Infrastructure

- [X] T018 [P] Setup Foundry test utilities in packages/contracts/test/utils/ (mocks, helpers for testing commit-reveal, staking)
- [X] T019 [P] Setup Jest/Vitest in packages/backend/ with coverage configuration (target: 80%+)
- [X] T020 [P] Setup Playwright E2E testing in packages/frontend/tests/e2e/ with test configuration

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

**Simplified Architecture**: 3 contracts total (consolidates 5-contract design)
1. **MockERC8004** - Test implementation of ERC-8004 standard
2. **ForoRegistry** - Main contract with agent registration, test orchestration, Keeper management (consolidated from separate KeeperRegistry), contestation
3. **AgentVault** - Escrow and fee distribution using simple Ownable + ReentrancyGuard pattern (no ERC-4626 vault standard)

**Constitutional Verification (Quality Gates)** - ✓ ALL VERIFIED:

*Code Quality*:
- [X] TypeScript strict mode enabled in backend and frontend tsconfig.json (Principle II)
- [X] Solidity explicit types, interface-first design (Principle II)
- [X] Linting (ESLint, Solhint) and formatting (Prettier) configured (Principle I)

*Testing Infrastructure*:
- [X] Foundry test framework configured with coverage (Principle IV) - 18 tests passing
- [X] Jest/Vitest configured for backend with coverage (Principle IV)
- [X] Playwright configured for E2E tests (Principle IV)

*User Experience*:
- [X] TailwindCSS configured for design system (Principle VI)
- [X] Next.js 14 configured with app router for frontend structure (Principle VI)

*Performance*:
- [X] Solidity gas optimization strategy defined (calldata, events) (Principle VIII)
- [X] Next.js 14 performance defaults (automatic image optimization, code splitting) (Principle VIII)

---

## Phase 3: User Story 1 - Agent Registration with Immutable Contract (Priority: P1) 🎯 MVP

**Goal**: Creators can register agents by linking to ERC-8004 contracts with immutable Agent Contract metadata

**Independent Test**: Deploy MockERC8004, publish Agent Contract metadata, call registerAgent, verify contractHash stored on-chain and immutable

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T021 [P] [US1] Unit test for ForoRegistry.registerAgent() in packages/contracts/test/ForoRegistry.t.sol (test contractHash computation, PENDING status, ownership validation)
- [ ] T022 [P] [US1] Unit test for duplicate registration prevention in packages/contracts/test/ForoRegistry.t.sol (test revert on duplicate agentId)
- [ ] T023 [P] [US1] Unit test for Agent Contract metadata immutability detection in packages/contracts/test/ForoRegistry.t.sol (test hash mismatch after metadata change)

### Implementation for User Story 1

- [ ] T024 [US1] Implement ForoRegistry.sol core structure in packages/contracts/src/ (Ownable, ReentrancyGuard, Agent struct, Keeper struct, mapping storage)
- [ ] T025 [US1] Implement registerAgent() function in packages/contracts/src/ForoRegistry.sol (read ERC-8004 metadata, compute contractHash, validate ownership, store Agent entity, emit AgentRegistered event)
- [ ] T026 [US1] Implement getAgent() view function in packages/contracts/src/ForoRegistry.sol (return Agent struct by foroId)
- [ ] T027 [US1] Add AgentStatus enum and status query functions in packages/contracts/src/ForoRegistry.sol (getAgentStatus, _updateStatus helper)
- [ ] T028 [US1] Add validation for Agent Contract JSON schema in packages/contracts/src/ForoRegistry.sol (require non-empty metadata, revert on invalid)
- [ ] T029 [US1] Verify all US1 unit tests pass and coverage >= 90% for registerAgent logic

**Checkpoint**: At this point, agents can be registered with immutable contract hashes, independently testable

---

## Phase 4: User Story 2 - Test Execution with Keeper Staking and TEE Validation (Priority: P2)

**Goal**: Users request tests, Keepers execute with staking and TEE proof, results finalized with fee distribution

**Independent Test**: Request test, Keeper commits+stakes, executes test cases, obtains TEE proof, reveals, submits result, finalize after 1 hour

### Tests for User Story 2

- [ ] T030 [P] [US2] Unit test for requestTest() in packages/contracts/test/ForoRegistry.t.sol (test fee escrow, TestRequested event, foroId generation)
- [ ] T031 [P] [US2] Unit test for commit-reveal mechanism in packages/contracts/test/ForoRegistry.t.sol (test claimJob with stake, revealTestInputs hash verification)
- [ ] T032 [P] [US2] Unit test for submitResult() in packages/contracts/test/ForoRegistry.t.sol (test score storage, contestation window start, teeVerified=false → score=0)
- [ ] T033 [P] [US2] Unit test for finalizeResult() in packages/contracts/test/ForoRegistry.t.sol (test stake return, fee distribution 70/20/10, cumulative score update)
- [ ] T034 [P] [US2] Unit test for AgentVault fee distribution in packages/contracts/test/AgentVault.t.sol (test distributePass split, reentrancy protection)
- [ ] T035 [P] [US2] Unit test for forfeitStake() timeout mechanism in packages/contracts/test/ForoRegistry.t.sol (test slashing after 24h without reveal)
- [ ] T036 [P] [US2] Integration test for Keeper execution flow in packages/backend/tests/integration/keeper.test.ts (mock contract events, test full workflow)

### Implementation for User Story 2

#### Test Request & Escrow

- [ ] T037 [P] [US2] Implement AgentVault.sol in packages/contracts/src/ (Ownable, ReentrancyGuard, escrow mapping, deposit, distributePass, distributeFail functions - simplified, no ERC-4626 dependency)
- [ ] T038 [US2] Implement requestTest() in packages/contracts/src/ForoRegistry.sol (validate fee amount, create TestJob, call AgentVault.deposit, emit TestRequested)
- [ ] T039 [US2] Write AgentVault unit tests in packages/contracts/test/AgentVault.t.sol (test escrow, fee splits, reentrancy protection)

#### Keeper Job Claiming with Commit-Reveal

- [ ] T040 [US2] Implement claimJob() in packages/contracts/src/ForoRegistry.sol (validate stake=2x fee, store commitHash, lock job to Keeper, emit JobClaimed)
- [ ] T041 [US2] Implement revealTestInputs() in packages/contracts/src/ForoRegistry.sol (verify keccak256(testCases+salt)==commitHash, verify testCases derive to contractHash, emit TestInputsRevealed)
- [ ] T042 [US2] Implement forfeitStake() in packages/contracts/src/ForoRegistry.sol (check timeout, slash Keeper stake, refund test fee via AgentVault.distributeFail)

#### Result Submission

- [ ] T043 [US2] Implement submitResult() in packages/contracts/src/ForoRegistry.sol (require revealed, store TestResult with score/latency/chatId/teeVerified, set contestation deadline, emit ResultSubmitted)
- [ ] T044 [US2] Implement score calculation helpers in packages/contracts/src/ForoRegistry.sol (_calculateLatencyScore, _calculateCompositeScore with 30/70 formula, force score=0 if teeVerified=false)

#### Finalization & Fee Distribution

- [ ] T045 [US2] Implement finalizeResult() in packages/contracts/src/ForoRegistry.sol (check contestation window expired, check not contested, return stake to Keeper, call AgentVault.distributePass with 70/20/10 split, update agent cumulative score, emit ResultFinalized)
- [ ] T046 [US2] Implement cumulative score update logic in packages/contracts/src/ForoRegistry.sol (_updateCumulativeScore with weighted average, _updateAgentStatus based on testCount and score thresholds)

#### Keeper Service Implementation

- [ ] T047 [P] [US2] Implement config.ts in packages/backend/src/ (load env variables for RPC URL, private key, contract addresses, 0G Compute provider)
- [ ] T048 [P] [US2] Implement logger.ts in packages/backend/src/utils/ (Winston or Pino logger with structured logging)
- [ ] T049 [US2] Implement contracts.ts in packages/backend/src/utils/ (create ethers.js contract instances from ABIs, export ForoRegistry, AgentVault, ERC8004 instances)
- [ ] T050 [US2] Implement 0g-compute.ts in packages/backend/src/utils/ (wrap @0gfoundation/0g-ts-sdk, createZGComputeNetworkBroker, getRequestHeaders, processResponse helpers)
- [ ] T051 [US2] Implement executor.ts in packages/backend/src/keeper/ (executeTestCase function: call agent endpoint with input, measure latency, handle timeout/errors)
- [ ] T052 [US2] Implement judge.ts in packages/backend/src/keeper/ (buildJudgePrompt, callLLMJudge via 0G Compute TEE, parse scores from LLM response, verify chatId)
- [ ] T053 [US2] Implement index.ts in packages/backend/src/keeper/ (listen to TestRequested events, orchestrate commit→execute→reveal→submit→finalize workflow, handle errors and retries)
- [ ] T054 [US2] Write Keeper executor unit tests in packages/backend/tests/unit/executor.test.ts (mock agent endpoints, test latency measurement, test error handling)
- [ ] T055 [US2] Write Keeper judge unit tests in packages/backend/tests/unit/judge.test.ts (mock 0G Compute SDK, test prompt building, test score parsing)

**Checkpoint**: At this point, full test execution with economic security and TEE validation is functional, independently testable

---

## Phase 5: User Story 3 - Result Contestation and Dispute Resolution (Priority: P3)

**Goal**: Keepers can contest submitted results with evidence, owner resolves disputes with stake slashing or refund

**Independent Test**: Submit result, contest with evidence + 50% stake, owner resolves (contestantWins=true), verify slashing and refund

### Tests for User Story 3

- [ ] T056 [P] [US3] Unit test for contestResult() in packages/contracts/test/ForoRegistry.t.sol (test 50% stake requirement, evidence storage, finalization block)
- [ ] T057 [P] [US3] Unit test for resolveContestation() in packages/contracts/test/ForoRegistry.t.sol (test stake slashing 50/50, test refund to user when contestantWins=true)
- [ ] T058 [P] [US3] Unit test for contestation window expiry in packages/contracts/test/ForoRegistry.t.sol (test revert when contesting after 1-hour window)

### Implementation for User Story 3

- [ ] T059 [P] [US3] Define Contestation struct in packages/contracts/src/ForoRegistry.sol (foroId, contestant, contestStake, evidence URI/hash, resolved, contestantWins)
- [ ] T060 [US3] Implement contestResult() in packages/contracts/src/ForoRegistry.sol (validate within contestation window, require 50% stake, store Contestation, block finalization, emit ResultContested)
- [ ] T061 [US3] Implement resolveContestation() in packages/contracts/src/ForoRegistry.sol (owner only, if contestantWins: slash job stake 50/50 + refund fee via AgentVault.distributeFail, if contestantLoses: slash contest stake to protocol + original Keeper gets stake+fee, emit ContestationResolved)
- [ ] T062 [US3] Update finalizeResult() to check for active contestations in packages/contracts/src/ForoRegistry.sol (revert if contested and not resolved)
- [ ] T063 [US3] Verify all US3 unit tests pass and edge cases covered (late contestation, double contestation prevention)

**Checkpoint**: At this point, contestation mechanism with economic incentives is functional, independently testable

---

## Phase 6: User Story 4 - Agent Status Progression and Reputation Scoring (Priority: P2)

**Goal**: Agent status transitions based on test count and cumulative score (PENDING → PROBATION → VERIFIED → ELITE → FAILED)

**Independent Test**: Run multiple tests for an agent, verify status transitions at thresholds (1→PROBATION, 3→VERIFIED, 10→ELITE), verify score calculation

### Tests for User Story 4

- [ ] T064 [P] [US4] Unit test for status transitions in packages/contracts/test/ForoRegistry.t.sol (test PENDING→PROBATION after 1 test, PROBATION→VERIFIED after 3 tests with score>=60, VERIFIED→ELITE after 10 tests with score>=80, any→FAILED with 3+ tests score<40)
- [ ] T065 [P] [US4] Unit test for score calculation formula in packages/contracts/test/ForoRegistry.t.sol (test latency score linear interpolation 500ms-3000ms, test composite score 30/70 formula, verify example: 1500ms latency + 80 quality → score=71)
- [ ] T066 [P] [US4] Unit test for weighted average cumulative score in packages/contracts/test/ForoRegistry.t.sol (test score updates with multiple finalized results, test Keeper weight calculation)

### Implementation for User Story 4

**Note**: Keeper logic consolidated into ForoRegistry (no separate KeeperRegistry contract)

- [ ] T067 [P] [US4] Add Keeper struct to ForoRegistry.sol in packages/contracts/src/ (keeperAddress, stakedAmount, jobsCompleted, jobsContested, contestationsWon, contestationsLost, totalEarned, active)
- [ ] T068 [US4] Implement registerKeeper() in packages/contracts/src/ForoRegistry.sol (require MIN_STAKE 0.01 ETH, store Keeper, emit KeeperRegistered)
- [ ] T069 [US4] Implement getKeeperWeight() in packages/contracts/src/ForoRegistry.sol (weight = 1 + jobsCompleted/10 + stakedAmount/MIN_STAKE-1, handle edge cases)
- [ ] T070 [US4] Update _updateCumulativeScore() in packages/contracts/src/ForoRegistry.sol to use Keeper weights (weighted average formula)
- [ ] T071 [US4] Implement _updateAgentStatus() logic in packages/contracts/src/ForoRegistry.sol (check testCount and cumulativeScore, apply status transition rules, handle FAILED status)
- [ ] T072 [US4] Update finalizeResult() to record Keeper stats (jobsCompleted, totalEarned) in packages/contracts/src/ForoRegistry.sol
- [ ] T073 [US4] Write integration test for multi-round scoring in packages/contracts/test/Integration.t.sol (register agent, run 10 tests with varying scores, verify status progression)

**Checkpoint**: At this point, reputation system with status progression is functional, independently testable

---

## Phase 7: User Story 5 - Using Verified Agents via x402 Payment Protocol (Priority: P4)

**Goal**: Users can call VERIFIED/ELITE agents via x402 payment proxy, frontend handles 402 challenges and payment verification

**Independent Test**: Call VERIFIED agent endpoint, receive 402 response, construct x402 payment, resubmit with payment, verify service delivered

### Tests for User Story 5

- [ ] T074 [P] [US5] E2E test for x402 payment flow in packages/frontend/tests/e2e/x402.spec.ts (test 402 response, payment construction, service delivery)
- [ ] T075 [P] [US5] Unit test for x402 payment verification in packages/frontend/tests/api/ (mock facilitator responses, test verify/settle logic)

### Implementation for User Story 5

#### Frontend Core Components

- [ ] T076 [P] [US5] Implement contracts.ts in packages/frontend/src/lib/ (wagmi/viem config, contract ABIs, chain configuration for 0G Chain)
- [ ] T077 [P] [US5] Implement utils.ts in packages/frontend/src/lib/ (formatAddress, formatScore, formatLatency, status badge utilities)
- [ ] T078 [P] [US5] Implement useContract.ts hook in packages/frontend/src/hooks/ (useForoRegistry, useAgentVault with wagmi)
- [ ] T079 [P] [US5] Implement useAgent.ts hook in packages/frontend/src/hooks/ (fetch agent data, test history, watch for events)
- [ ] T080 [P] [US5] Implement useWallet.ts hook in packages/frontend/src/hooks/ (wallet connection, transaction handling, error states)

#### Frontend UI Components

- [ ] T081 [P] [US5] Implement StatusBadge.tsx in packages/frontend/src/components/ (display agent status with colors: PENDING, PROBATION, VERIFIED, ELITE, FAILED)
- [ ] T082 [P] [US5] Implement AgentCard.tsx in packages/frontend/src/components/ (display agent summary: name, status, score, test count, creator)
- [ ] T083 [P] [US5] Implement TestHistory.tsx in packages/frontend/src/components/ (display test results with chatId links to 0G Chain explorer, scores, timestamps)
- [ ] T084 [P] [US5] Implement AgentContractViewer.tsx in packages/frontend/src/components/ (render test cases and evaluation criteria from Agent Contract JSON)
- [ ] T085 [P] [US5] Implement RegisterWizard.tsx in packages/frontend/src/components/ (3-step wizard: mint ERC-8004, edit Agent Contract JSON, call registerAgent)

#### Frontend Pages

- [ ] T086 [US5] Implement app/[foroId]/page.tsx in packages/frontend/src/app/[foroId]/ (agent detail view: header, Agent Contract, score, test history, CTAs for REQUEST TEST / USE VIA x402)
- [ ] T087 [US5] Implement app/register/page.tsx in packages/frontend/src/app/register/ (registration wizard with 3 steps, form validation, transaction handling)
- [ ] T088 [US5] Implement app/layout.tsx in packages/frontend/src/app/ (root layout with wallet connection, navigation, ToastContainer for notifications)

#### x402 API Proxy

- [ ] T089 [US5] Implement app/api/use/[foroId]/route.ts in packages/frontend/src/app/api/use/[foroId]/ (POST handler: check payment header, return 402 with x402 challenge if missing, verify payment via facilitator /verify and /settle, forward to agent endpoint, return response)
- [ ] T090 [US5] Add x402 facilitator integration in packages/frontend/src/lib/ (verifyX402Payment helper, construct payment instructions for Base USDC or Tempo USDC.e)

**Checkpoint**: At this point, frontend is functional with agent discovery, testing, and x402 usage, independently testable

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Deployment, integration testing, documentation, and production readiness

- [ ] T091 [P] Create Deploy.s.sol script in packages/contracts/script/ (deploy MockERC8004, ForoRegistry, AgentVault in correct order, save addresses to JSON)
- [ ] T092 [P] Update .env.example files with deployed contract addresses and 0G Chain RPC URLs
- [ ] T093 [P] Generate contract ABIs and TypeScript types in packages/types/ from Foundry artifacts using typechain or similar
- [ ] T094 Write comprehensive integration test in packages/contracts/test/Integration.t.sol (test complete flow: register → requestTest → claim → execute → reveal → submit → finalize → status update → x402 usage)
- [ ] T095 Deploy contracts to 0G Chain testnet using forge script, verify on explorer
- [ ] T096 [P] Test Keeper service on testnet (listen to events, execute real test, verify chatId on 0G Chain explorer)
- [ ] T097 [P] Test frontend on testnet (register demo agents, request tests, verify results, use via x402)
- [ ] T098 [P] Write README.md with quickstart instructions (5-command setup from quickstart.md)
- [ ] T099 [P] Add inline code documentation (NatSpec for Solidity, JSDoc for TypeScript) following Constitutional Principle I (readability)
- [ ] T100 Run security audit checklist (reentrancy protection, access control, commit-reveal security, stake slashing correctness)
- [ ] T101 Run gas optimization pass (verify calldata usage, event indexing, no unbounded loops)
- [ ] T102 Validate test coverage meets constitutional requirements (90%+ contracts, 80%+ backend, E2E for critical flows)
- [ ] T103 [P] Create demo agents (agent-good with passing tests, agent-bad with failing tests) as documented in quickstart.md
- [ ] T104 Run full 7-minute demo script from quickstart.md (register → test → contest → x402)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-7)**: All depend on Foundational phase completion
  - US1 (P1): Can start after Foundational - No dependencies on other stories
  - US2 (P2): Can start after Foundational - Depends on US1 (ForoRegistry core)
  - US3 (P3): Depends on US2 (needs result submission to contest)
  - US4 (P2): Depends on US2 (needs finalization to update scores)
  - US5 (P4): Depends on US1, US2, US4 (needs VERIFIED agents to use via x402)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### Critical Path (for MVP - US1 + US2 only)

1. Phase 1: Setup (T001-T009)
2. Phase 2: Foundational (T010-T020)
3. Phase 3: US1 (T021-T029) - Agent Registration
4. Phase 4: US2 (T030-T055) - Test Execution
5. Phase 6: Partial Polish (T091-T095, T098) - Deploy + Docs

### Parallel Opportunities

- **Setup Phase**: T003, T004, T005, T007, T008 can run in parallel
- **Foundational Phase**: T010, T011, T012 (interfaces) can run in parallel, T015, T016, T017 (types) can run in parallel, T018, T019, T020 (test infra) can run in parallel
- **US1 Tests**: T021, T022, T023 can run in parallel
- **US2 Tests**: T030-T036 can run in parallel
- **US2 Implementation**: T037, T047, T048 can run in parallel (contracts, backend config, logger)
- **US2 Keeper Service**: T051, T052, T054, T055 can run in parallel (after T049, T050)
- **US3 Tests**: T056, T057, T058 can run in parallel
- **US3 Implementation**: T059, T060 can start in parallel
- **US4 Tests**: T064, T065, T066 can run in parallel
- **US4 Implementation**: T067, T068 can start in parallel
- **US5 Frontend Components**: T076-T085 can run in parallel (hooks, components)
- **US5 Pages**: T086, T087 can run in parallel (after T076-T085)
- **Polish**: T091, T092, T093, T098, T099, T103 can run in parallel

---

## Parallel Example: User Story 2 (Test Execution)

```bash
# Launch all US2 tests together:
Task T030: "Unit test for requestTest() in packages/contracts/test/ForoRegistry.t.sol"
Task T031: "Unit test for commit-reveal mechanism in packages/contracts/test/ForoRegistry.t.sol"
Task T032: "Unit test for submitResult() in packages/contracts/test/ForoRegistry.t.sol"
Task T033: "Unit test for finalizeResult() in packages/contracts/test/ForoRegistry.t.sol"
Task T034: "Unit test for AgentVault fee distribution in packages/contracts/test/AgentVault.t.sol"
Task T035: "Unit test for forfeitStake() timeout mechanism in packages/contracts/test/ForoRegistry.t.sol"
Task T036: "Integration test for Keeper execution flow in packages/backend/tests/integration/keeper.test.ts"

# Launch contracts and backend config together:
Task T037: "Implement AgentVault.sol in packages/contracts/src/"
Task T047: "Implement config.ts in packages/backend/src/"
Task T048: "Implement logger.ts in packages/backend/src/utils/"

# Launch Keeper service modules together (after utils are ready):
Task T051: "Implement executor.ts in packages/backend/src/keeper/"
Task T052: "Implement judge.ts in packages/backend/src/keeper/"
Task T054: "Write Keeper executor unit tests in packages/backend/tests/unit/executor.test.ts"
Task T055: "Write Keeper judge unit tests in packages/backend/tests/unit/judge.test.ts"
```

---

## Implementation Strategy

### MVP First (US1 + US2 Only - Agent Registration + Test Execution)

1. Complete Phase 1: Setup (T001-T009)
2. Complete Phase 2: Foundational (T010-T022) - CRITICAL
3. Complete Phase 3: US1 (T023-T031) - Agent Registration
4. Complete Phase 4: US2 (T032-T057) - Test Execution with Keeper
5. **STOP and VALIDATE**: Test US1 + US2 independently on testnet
6. Partial Phase 9: Deploy + Docs (T097-T101, T104)
7. Demo MVP

**MVP Scope**: Creators register agents, users request tests, Keepers execute with TEE validation and fee distribution. This is the core value proposition.

### Incremental Delivery

1. **Foundation (Phases 1-2)** → Interfaces and infra ready (3 contracts: MockERC8004, ForoRegistry, AgentVault)
2. **MVP (Phases 1-2-3-4)** → Registration + Test Execution → Deploy/Demo ✅
3. **Add Contestation (Phase 5)** → Community oversight → Deploy/Demo
4. **Add Reputation (Phase 4)** → Status progression (already in ForoRegistry) → Deploy/Demo
5. **Add x402 (Phase 5)** → Monetization layer → Deploy/Demo

Each increment adds value without breaking previous functionality.

### Parallel Team Strategy

With 3 developers:

1. **Together**: Complete Setup (Phase 1) + Foundational (Phase 2)
2. **Once Foundational is done**:
   - Developer A: Phase 3 (US1 - Registration) + Phase 4 Contracts (US2 contract logic)
   - Developer B: Phase 4 Backend (US2 Keeper service)
   - Developer C: Phase 7 Frontend (US5 UI components, can work with mocks)
3. **Integration**: All developers collaborate on Phase 9 (testing, deployment, demo)

---

## Notes

- [P] tasks = different files or packages, can run in parallel
- [Story] label maps task to specific user story (US1-US5) for traceability
- Each user story should be independently completable and testable
- Tests written FIRST (TDD) - ensure tests FAIL before implementing
- Commit after each task or logical group of tasks
- Stop at checkpoints to validate story independently before moving to next priority
- **Constitutional Compliance**: All tasks follow Principles I-X (readability, type safety, code review, test coverage, UX consistency, feedback, performance, spec-first, task-driven)
- **Gas Optimization**: Use calldata, events for indexing, minimize storage writes (Principle VIII)
- **Security**: Reentrancy protection (OpenZeppelin ReentrancyGuard), commit-reveal integrity, stake validation (Critical constraints from spec)

---

## Task Count Summary

- **Total Tasks**: 110
- **Phase 1 (Setup)**: 9 tasks
- **Phase 2 (Foundational)**: 13 tasks (BLOCKS all stories)
- **Phase 3 (US1)**: 9 tasks
- **Phase 4 (US2)**: 26 tasks
- **Phase 5 (US3)**: 8 tasks
- **Phase 6 (US4)**: 11 tasks
- **Phase 7 (US5)**: 16 tasks
- **Phase 8 (Bug Bounty - Optional)**: 4 tasks
- **Phase 9 (Polish)**: 14 tasks

**MVP Scope** (US1 + US2): 22 tasks + 9 setup + 13 foundational + 7 polish = **51 tasks**

**Parallel Opportunities Identified**: 35+ tasks marked with [P] can run in parallel, reducing wall-clock time by ~40% with adequate team size
