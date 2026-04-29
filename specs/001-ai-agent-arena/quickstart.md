# Quickstart: Foro - Agent Verification Protocol

**Date**: 2026-04-29  
**Purpose**: Get Foro running locally in 5 commands  
**Time to Setup**: 15 minutes

## Prerequisites

- Node.js 18+ and pnpm
- Foundry (forge, cast, anvil)
- 0G Chain testnet access or local node
- 0G Compute SDK credentials

## One-Time Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Setup environment
cp .env.example .env
# Edit .env with your values:
#   0G_CHAIN_RPC_URL=https://evmrpc-testnet.0g.ai
#   0G_COMPUTE_PROVIDER=<your provider address>
#   DEPLOYER_PRIVATE_KEY=<your private key>
#   PROTOCOL_TREASURY=<treasury address>

# 3. Deploy contracts to 0G testnet
cd packages/contracts
forge build
forge script script/Deploy.s.sol --rpc-url $0G_CHAIN_RPC_URL --broadcast
# Save deployed addresses to .env

# 4. Start Keeper service
cd ../backend
pnpm build
pnpm start
# Keeper will listen for TestRequested events

# 5. Start frontend
cd ../frontend
pnpm dev
# Open http://localhost:3000
```

## 3-Day Implementation Guide

### Day 1: Contracts + Keeper (8 hours)

**Morning: Deploy Contracts (4 hours)**

1. Implement core contracts in `packages/contracts/src/`:
   - `MockERC8004.sol` - Test ERC-8004 implementation
   - `ForoRegistry.sol` - Core agent registration and test orchestration
   - `KeeperRegistry.sol` - Keeper staking and reputation
   - `AgentVault.sol` - Fee escrow and distribution (ERC-4626 based)
   - `BugBounty.sol` - Bug bounty management

2. Write Foundry tests in `packages/contracts/test/`:
   - Unit tests for each contract (commit-reveal, staking, scoring)
   - Integration tests for full flows (register → test → finalize)
   - Target: 90%+ coverage

3. Deploy to 0G testnet:
   ```bash
   forge script script/Deploy.s.sol --rpc-url $0G_CHAIN_RPC_URL --broadcast --verify
   ```

4. Verify deployed addresses:
   ```bash
   cast call $FORO_REGISTRY "owner()" --rpc-url $0G_CHAIN_RPC_URL
   ```

**Afternoon: Keeper Service (4 hours)**

1. Implement Keeper in `packages/backend/src/keeper/`:
   - `index.ts` - Event listener for TestRequested
   - `executor.ts` - HTTP calls to agent endpoints, latency measurement
   - `judge.ts` - 0G Compute TEE integration for LLM evaluation
   - `types.ts` - Shared types and interfaces

2. Key Keeper workflow:
   ```typescript
   // Listen for test requests
   foroRegistry.on("TestRequested", async (foroId, agentId) => {
     // 1. Read Agent Contract from ERC-8004
     const agent = await foroRegistry.getAgent(foroId);
     const contractJSON = await erc8004.getMetadata(agent.erc8004AgentId, "foro:contract");
     
     // 2. Commit hash + stake
     const salt = randomBytes(32);
     const inputsHash = keccak256(encode(["string","bytes32"], [contractJSON, salt]));
     await foroRegistry.claimJob(foroId, inputsHash, { value: testFee * 2n });
     
     // 3. Execute test cases
     for (const tc of contract.testCases) {
       const output = await fetch(agent.endpoint, { body: tc.input });
       // Measure latency
     }
     
     // 4. LLM evaluation via 0G Compute TEE
     const broker = await createZGComputeNetworkBroker(wallet);
     const chatId = await callLLMJudge(broker, testCase, output);
     
     // 5. Reveal + Submit
     await foroRegistry.revealTestInputs(foroId, contractJSON, salt);
     await foroRegistry.submitResult(foroId, score, latency, rounds, chatId);
     
     // 6. Finalize after 1 hour
     await sleep(61 * 60 * 1000);
     await foroRegistry.finalizeResult(foroId);
   });
   ```

3. Test end-to-end:
   ```bash
   # Terminal 1: Keeper
   cd packages/backend && pnpm start
   
   # Terminal 2: Test request
   cast send $FORO_REGISTRY "requestTest(uint256)" <agentId> \
     --value 0.001ether --private-key $DEPLOYER_PRIVATE_KEY
   
   # Watch Keeper logs for execution
   ```

**Deliverable**: All contracts deployed, Keeper executing test cases, chatId verifiable on 0G Chain explorer.

---

### Day 2: Frontend (8 hours)

**Tech Stack**: Next.js 14, wagmi, viem, TailwindCSS

**Routes to Implement**:

1. **`/[foroId]` - Agent Detail Page**
   - Display agent info (name, status badge, owner, ERC-8004 ID)
   - Render Agent Contract (test cases + criteria)
   - Show score, test count, latency, unique Keepers
   - Test history with chatId links to explorer
   - CTAs:
     - `[REQUEST TEST · 0.001 ETH]` for PENDING/PROBATION
     - `[USE VIA x402]` for VERIFIED/ELITE
     - `[OPEN BUG BOUNTY]` if msg.sender == owner
     - `[VIEW BOUNTY]` if bounty active

2. **`/register` - 3-Step Registration Wizard**
   - **Step 1**: Mint ERC-8004 (agentURI input)
   - **Step 2**: JSON editor for Agent Contract
     - Set `"foro:contract"` metadata
     - Set `"foro:endpoint"` metadata
   - **Step 3**: Call `registerAgent()` → confirmation with foroId

3. **`/bounty/[foroId]` - Bug Bounty Interface**
   - For creator:
     - Form: budget + criteria textarea + timelock (3 or 7 days)
     - List findings with approve/reject buttons
   - For Keeper:
     - Display bounty criteria
     - Form: submit finding (evidenceURI + hash)

4. **`/api/use/[foroId]` - x402 Proxy (API Route)**
   ```typescript
   export async function POST(req: Request) {
     const paymentHeader = req.headers.get('x-payment-authorization');
     
     if (!paymentHeader) {
       return Response.json({
         error: 'Payment Required',
         payment: {
           scheme: 'exact',
           token: BASE_USDC,
           amount: '1000000', // 1 USDC
           facilitator: 'https://facilitator.x402.io'
         }
       }, { status: 402 });
     }
     
     // Verify payment via x402 facilitator
     const verified = await verifyX402Payment(paymentHeader);
     if (!verified) return Response.json({ error: 'Invalid payment' }, { status: 402 });
     
     // Forward to agent endpoint
     return fetch(agent.endpoint, { body: req.body });
   }
   ```

**Key Components** (`packages/frontend/src/components/`):
- `AgentCard.tsx` - Display agent summary
- `TestHistory.tsx` - List of test results
- `AgentContractViewer.tsx` - Render test cases
- `StatusBadge.tsx` - Visual status indicator
- `RegisterWizard.tsx` - Multi-step registration flow

**Deliverable**: Frontend loads agents, request test works with payment, Keeper triggered by event, registration flow functional.

---

### Day 3: Demo + x402 Integration (8 hours)

**Morning: Demo Agents (2 hours)**

1. Deploy `apps/agent-good` (passes tests):
   ```json
   {
     "category": "url-summarizer",
     "testCases": [
       { "id": "tc-01", "input": { "url": "..." }, "evaluation": { "criteria": [...] } }
     ]
   }
   ```
   Expected score: ~85

2. Deploy `apps/agent-bad` (fails tests):
   - Same contract, endpoint returns garbage
   - Expected score: ~20 → FAILED → refund

**Afternoon: Live Demo Script (5 hours)**

**Demo Flow (7 minutes)**:

```
00:00  /register - Show JSON editor with Agent Contract
        Creator defines 3 test cases with criteria
        
01:00  registerAgent() - contractHash on-chain
        
01:30  User pays requestTest (0.001 ETH)
        
01:45  3 Keepers in terminal:
        - Read Agent Contract via ERC-8004
        - claim + stake (2x fee) on-chain
        - Execute with inputs from creator
        - LLM judge in TEE
        
02:30  3 scores arrive on-chain
        
02:45  Contest window passes → finalizeResult
        Stakes returned, fees distributed
        
03:00  3 rounds → VERIFIED
        
03:15  chatId on 0G Chain explorer
        
03:30  Use via x402 (POST /api/use/[foroId])
        
03:45  Open Bug Bounty (0.05 ETH, 3 days)
        
04:00  Keeper submits finding (evidence: agent hallucinates)
        
04:20  Creator approves → budget released
        
04:40  agent-bad → FAILED → refund to user
        
05:00  /[foroId] shows:
        - Agent Contract
        - Test history
        - chatIds verified on-chain
```

**Deliverable**: x402 functional, 2 demo agents deployed, bug bounty executed live, chatId verifiable on 0G Chain explorer, README with 5-command setup.

---

## Testing Checklist

**Unit Tests**:
- [x] Commit-reveal hash verification
- [x] Staking amount validation (2x fee, 50% contest)
- [x] Fee distribution (70/20/10 split, no rounding errors)
- [x] Score calculation (latency 30%, quality 70%)
- [x] Status transitions (PENDING → VERIFIED → ELITE)

**Integration Tests**:
- [x] ERC-8004 metadata retrieval (mock contract)
- [x] 0G Compute TEE proof verification (mock SDK)
- [x] Full flow: commit → execute → reveal → submit → finalize

**E2E Tests**:
- [x] Happy path: register → test → VERIFIED
- [x] Contestation: submit → contest → resolve(contestantWins) → slashing
- [x] Timeout: commit without reveal → forfeitStake → refund
- [x] Bug bounty: open → submit finding → approve → payment

**Security Tests**:
- [x] Reentrancy protection (fee distribution, refund)
- [x] Front-running resistance (commit-reveal)
- [x] Double-claim prevention (job lock)

---

## Out of Scope (MVP)

- Leaderboard global (only per-category)
- Multiple categories simultaneous
- Governance of OKRs
- Decentralized contestation resolution
- Meta-agent that proposes categories
- Mobile responsive (desktop-first)
- Multiple bounty winners
- Arbitration of rejected findings

---

## Production Deployment

**Testnet** (0G Chain Testnet):
```bash
forge script script/Deploy.s.sol \
  --rpc-url https://evmrpc-testnet.0g.ai \
  --broadcast --verify
```

**Mainnet** (0G Chain):
```bash
# Use multi-sig for deployer
# Deploy with proxy for upgradeability
# Set protocol treasury to DAO
forge script script/Deploy.s.sol \
  --rpc-url https://evmrpc.0g.ai \
  --broadcast --verify --legacy
```

**Post-Deployment**:
1. Verify contracts on 0G Chain explorer
2. Register initial Keepers (stake 0.01+ ETH each)
3. Deploy demo agents (agent-good, agent-bad)
4. Run 3 test rounds per demo agent
5. Monitor Keeper execution for 24 hours
6. Announce public launch

---

## Common Issues

**Problem**: Keeper not claiming jobs  
**Solution**: Check RPC connection, ensure Keeper has sufficient ETH for gas

**Problem**: TEE verification fails  
**Solution**: Verify 0G Compute provider address, check SDK credentials

**Problem**: Test result contestation  
**Solution**: Owner must call `resolveContestation()` manually in MVP

**Problem**: Agent endpoint timeout  
**Solution**: Increase timeout in Keeper config (default 5s)

---

## Resources

- ERC-8004 Spec: https://eips.ethereum.org/EIPS/eip-8004
- 0G Compute SDK: https://docs.0g.ai/developer-hub/building-on-0g/inft/erc7857
- x402 Protocol: https://x402.gitbook.io/x402
- Foundry Book: https://book.getfoundry.sh
- Wagmi Docs: https://wagmi.sh

---

## Next Steps

After MVP launch:
1. Implement multiple categories (via governance)
2. Add Keeper reputation system (weight calculation)
3. Decentralize contestation resolution (DAO voting or automated)
4. Enable x402 execution tracking on-chain
5. Add mobile-responsive UI
6. Support ERC-20 fee tokens (not just native ETH)
