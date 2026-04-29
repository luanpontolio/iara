# Implementation Plan: Foro - Agent Verification Protocol

**Branch**: `001-ai-agent-arena` | **Date**: 2026-04-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-ai-agent-arena/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Foro is a smart contract system that verifies AI agent capabilities through economic staking, TEE-based evaluation, and on-chain reputation. Creators publish immutable Agent Contracts on ERC-8004 with test cases and evaluation criteria. Keepers execute tests by staking 2x the test fee, evaluating outputs via LLM running in 0G Compute TEE, and submitting cryptographically-proven results on-chain. Multiple Keepers can test the same agent to build consensus. Agent reputation (PENDING → PROBATION → VERIFIED → ELITE → FAILED) is determined by cumulative scores weighted by Keeper reputation. The system includes contestation mechanisms, fee distribution (70% Keeper, 20% agent creator, 10% protocol), and integration with x402 payment protocol for monetizing verified agents.

## Technical Context

**Language/Version**: 
- Solidity ^0.8.20 (smart contracts)
- TypeScript 5.x (Keeper service & backend)
- React 18 / Next.js 14 (frontend)

**Primary Dependencies**: 
- **Contracts**: Foundry, OpenZeppelin Contracts (Ownable, ReentrancyGuard, ERC-4626 for AgentVault)
- **Backend/Keeper**: Node.js, ethers.js v6, @0gfoundation/0g-ts-sdk (TEE integration)
- **Frontend**: Next.js 14, wagmi v2, viem v2 (wallet connection), TailwindCSS

**Storage**: 
- On-chain: Agent metadata (contractHash, status, scores, test results)
- Off-chain: ERC-8004 metadata (IPFS or centralized storage), x402 execution logs (DB or logs)

**Testing**: 
- **Contracts**: Foundry (forge test) with 90%+ coverage target
- **Backend/Keeper**: Jest or Vitest for unit/integration tests
- **Frontend**: React Testing Library + Playwright for E2E
- **Integration**: Testnet deployment + full flow testing

**Target Platform**: 
- **Blockchain**: 0G Chain (EVM-compatible L1/L2)
- **Keeper**: Node.js server (Linux/Docker)
- **Frontend**: Web (desktop-first, mobile-responsive out of scope for MVP)

**Project Type**: Monorepo with 3 packages - web3 DApp (contracts + keeper service + frontend)

**Performance Goals**: 
- Contract operations: requestTest <100k gas, commitTest <150k gas, submitResult <200k gas, finalizeResult <300k gas
- Keeper execution: Full test cycle (claim → execute → submit) in <5 minutes for 95% of tests
- Frontend: Page load <3s, TTI <5s, agent status query <1s

**Constraints**: 
- Immutability: Agent Contract hash and test results are permanent once finalized
- Economic security: Staking (2x fee for Keeper, 50% for contestants) prevents griefing
- TEE dependency: 0G Compute availability required for valid test results (teeVerified = false → score = 0)
- Contestation window: 1 hour delay before finalization enables community oversight

**Scale/Scope**: 
- MVP: Single category (url-summarizer), 10 concurrent tests supported
- Post-MVP: Multiple categories, decentralized contestation resolution, Keeper reputation system
- Expected agents: 10-100 in MVP, frontend optimized for <100 agents in leaderboard

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with [OpenBox Constitution](../../.specify/memory/constitution.md):

**Code Quality**:
- [x] **I. Code Readability**: Design uses descriptive names (ForoRegistry, AgentVault, TestOrchestrator), contract functions <50 lines, interface-first design
- [x] **II. Type Safety**: TypeScript strict mode enabled, Solidity explicit types, shared types package for ABI→TypeScript generation, interfaces defined before implementation
- [x] **III. Code Review**: Feature split into 6 modules (MockERC8004, ForoRegistry, KeeperRegistry, BugBounty, AgentVault, Keeper service), each <400 lines per PR

**Testing Standards**:
- [x] **IV. Test Coverage**: 90%+ for contracts (Foundry tests), 80%+ for Keeper service (Jest), E2E via testnet deployment
- [x] **V. Test-First Mindset**: Each acceptance scenario from spec.md maps to test case, commit-reveal logic tested before implementation, reentrancy tests for all fee distribution paths

**User Experience**:
- [x] **VI. UX Consistency**: Frontend uses TailwindCSS component library, consistent terminology (Agent, Test, Keeper, Score), status badges uniform across views
- [x] **VII. User Feedback**: Loading states for all async ops (registering agent, requesting test, countdown timers for contestation window), transaction links to 0G Chain explorer, actionable error messages ("Insufficient stake: need 0.002 ETH")

**Performance**:
- [x] **VIII. Performance Standards**: Gas-optimized contracts (calldata over memory, events for indexing), Keeper monitors events with <5s latency, frontend queries <1s for read-only calls, leaderboard loads in <3s for 100 agents

**Workflow**:
- [x] **IX. Specification-First**: This plan is based on approved `spec.md` with 5 prioritized user stories (P1-P4), all functional requirements (FR-001 to FR-048) documented
- [x] **X. Task-Driven Execution**: `/speckit-tasks` will generate dependency-ordered tasks: interfaces → contracts → tests → Keeper → frontend → integration

**Violations**: None. All principles satisfied without requiring exceptions.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
packages/
├── contracts/                    # Foundry smart contracts (3 contracts total)
│   ├── src/
│   │   ├── interfaces/
│   │   │   ├── IForoRegistry.sol      # Main registry (includes Keeper logic)
│   │   │   ├── IAgentVault.sol        # Escrow and fee distribution
│   │   │   └── IERC8004.sol           # External standard reference
│   │   ├── ForoRegistry.sol           # Agent registration, test orchestration, Keeper management
│   │   ├── AgentVault.sol             # Simple escrow (no ERC-4626)
│   │   └── MockERC8004.sol            # Test implementation
│   ├── test/
│   │   ├── ForoRegistry.t.sol         # Tests for main registry and Keeper logic
│   │   ├── AgentVault.t.sol           # Tests for escrow and distribution
│   │   ├── MockERC8004.t.sol          # Tests for ERC-8004 mock
│   │   └── Integration.t.sol          # Full flow tests
│   ├── script/
│   │   └── Deploy.s.sol
│   └── foundry.toml
│
├── backend/                      # Node.js Keeper service
│   ├── src/
│   │   ├── keeper/
│   │   │   ├── index.ts         # Main event listener
│   │   │   ├── executor.ts      # Test execution logic
│   │   │   ├── judge.ts         # 0G Compute TEE integration
│   │   │   └── types.ts         # Shared types
│   │   ├── utils/
│   │   │   ├── contracts.ts     # Contract ABIs and instances
│   │   │   ├── 0g-compute.ts    # 0G SDK wrapper
│   │   │   └── logger.ts
│   │   └── config.ts
│   ├── tests/
│   │   ├── unit/
│   │   │   ├── executor.test.ts
│   │   │   └── judge.test.ts
│   │   └── integration/
│   │       └── keeper.test.ts
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                     # Next.js web app
│   ├── src/
│   │   ├── app/
│   │   │   ├── [foroId]/
│   │   │   │   └── page.tsx     # Agent detail view
│   │   │   ├── register/
│   │   │   │   └── page.tsx     # 3-step registration
│   │   │   ├── api/
│   │   │   │   └── use/
│   │   │   │       └── [foroId]/
│   │   │   │           └── route.ts  # x402 proxy
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── AgentCard.tsx
│   │   │   ├── TestHistory.tsx
│   │   │   ├── AgentContractViewer.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   └── RegisterWizard.tsx
│   │   ├── hooks/
│   │   │   ├── useContract.ts
│   │   │   ├── useAgent.ts
│   │   │   └── useWallet.ts
│   │   └── lib/
│   │       ├── contracts.ts     # wagmi/viem config
│   │       └── utils.ts
│   ├── tests/
│   │   └── e2e/
│   │       └── register.spec.ts
│   ├── package.json
│   └── next.config.js
│
└── types/                        # Shared TypeScript types
    ├── contracts.ts             # Generated from ABIs
    ├── agent.ts                 # Agent Contract schema
    └── keeper.ts                # Keeper service types
```

**Structure Decision**: Monorepo with 4 packages following the web3 DApp pattern:
1. **contracts**: Foundry for Solidity development and testing with interface-first design (3 contracts: MockERC8004, ForoRegistry with Keeper logic, AgentVault)
2. **backend**: Node.js Keeper service that monitors blockchain events, executes off-chain logic (agent endpoint calls, TEE evaluation), and submits results on-chain
3. **frontend**: Next.js app for creators (register agents) and users (request tests, view agents, pay via x402)
4. **types**: Shared types package for contract ABIs → TypeScript generation, ensuring type safety across backend and frontend

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. All constitutional principles are satisfied within the planned architecture:
- Monorepo with 4 packages is justified by clear separation of concerns (blockchain, off-chain compute, user interface, shared types)
- Simplified to 3 smart contracts (MockERC8004, ForoRegistry, AgentVault) by consolidating Keeper logic into ForoRegistry and removing BugBounty from MVP scope
- Interface-first design enforces type safety and readability
- Economic staking and TEE proof mechanisms are inherent to the feature requirements, not architectural complexity
- Commit-reveal pattern is security-critical, not added complexity
