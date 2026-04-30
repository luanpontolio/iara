# Research: Foro - Agent Verification Protocol

**Date**: 2026-04-29  
**Phase**: 0 - Outline & Research  
**Purpose**: Resolve all technical unknowns before design phase

## Research Areas

### 1. ERC-8004 Integration

**Decision**: Use ERC-8004 as external registry for agent metadata with Foro reading via `getMetadata()`

**Rationale**:
- ERC-8004 provides standardized agent identity with `register()`, `setMetadata()`, `getMetadata()`, `ownerOf()`
- Foro doesn't deploy ERC-8004 contracts — creators deploy their own and register with Foro
- Agent Contract JSON stored as metadata with key `"foro:contract"` (immutable after registration via contractHash)
- Agent endpoint URL stored with key `"foro:endpoint"`
- ERC-8004 `ownerOf(agentId)` determines creator wallet for 20% fee distribution

**Alternatives Considered**:
- **Store Agent Contract on-chain directly**: Rejected due to high gas costs for large JSON structures (testCases can be several KB)
- **Store only hash without ERC-8004**: Rejected because loses identity standard benefits (transferability, agent wallet resolution)

**Implementation**:
```solidity
interface IERC8004 {
    function ownerOf(uint256 agentId) external view returns (address);
    function getMetadata(uint256 agentId, string memory key) external view returns (bytes memory);
    function getAgentWallet(uint256 agentId) external view returns (address);
}

// In ForoRegistry.registerAgent()
address erc8004 = ...; 
uint256 agentId = ...;
bytes memory contractJSON = IERC8004(erc8004).getMetadata(agentId, "foro:contract");
require(contractJSON.length > 0, "Agent Contract not found");
bytes32 contractHash = keccak256(contractJSON);
// store contractHash on-chain as immutable
```

**References**:
- ERC-8004 spec: https://eips.ethereum.org/EIPS/eip-8004
- OpenZeppelin IERC721 for ownerOf pattern

---

### 2. 0G Compute SDK for TEE Integration

**Decision**: Use `@0gfoundation/0g-ts-sdk` with `createZGComputeNetworkBroker` for LLM evaluation in TEE

**Rationale**:
- 0G Compute provides TEE-secured inference with cryptographic proof (chatId signed by enclave)
- `broker.inference.getRequestHeaders()` returns signed headers proving Keeper identity
- `broker.inference.processResponse(providerAddress, chatId)` verifies TEE proof on-chain
- Response header `ZG-Res-Key` contains chatId that Keeper submits as proof

**Alternatives Considered**:
- **On-chain LLM evaluation**: Rejected due to computational limits of EVM
- **Off-chain evaluation without TEE**: Rejected because no cryptographic proof of honest evaluation

**Implementation**:
```typescript
import { createZGComputeNetworkBroker } from '@0gfoundation/0g-ts-sdk';

const broker = await createZGComputeNetworkBroker(wallet);
const { endpoint, model } = await broker.inference.getServiceMetadata(ZG_PROVIDER);
const headers = await broker.inference.getRequestHeaders(ZG_PROVIDER);

const response = await fetch(`${endpoint}/chat/completions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify({
    model,
    messages: [{ role: 'user', content: judgePrompt }]
  })
});

const chatId = response.headers.get('ZG-Res-Key') || data.id;
const teeVerified = await broker.inference.processResponse(ZG_PROVIDER, chatId);

// If teeVerified = false, score is forced to 0
```

**References**:
- 0G Compute SDK: https://docs.0g.ai/developer-hub/building-on-0g/inft/erc7857
- TEE attestation: Intel SGX / AMD SEV documentation

---

### 3. Commit-Reveal Pattern for Test Input Security

**Decision**: Two-step commit-reveal with salt to prevent front-running of test execution

**Rationale**:
- **Commit phase**: Keeper hashes `keccak256(testCases + salt)` and submits hash + stake on-chain
- **Reveal phase**: Keeper submits `testCases + salt` after execution, contract verifies hash matches
- Prevents malicious agents from seeing test inputs before execution and gaming results
- Salt ensures unique hashes even for identical test cases across multiple jobs

**Alternatives Considered**:
- **Direct test case submission**: Rejected because agent endpoints could read mempool and see test inputs before execution
- **Encrypted test cases**: Rejected due to complexity and key management challenges

**Implementation**:
```solidity
// Commit
mapping(uint256 => bytes32) public commitHashes;
function claimJob(uint256 foroId, bytes32 inputsHash) external payable {
    require(msg.value >= stake * 2, "Insufficient stake");
    commitHashes[foroId] = inputsHash;
    // ...
}

// Reveal
function revealTestInputs(uint256 foroId, string memory testCasesJSON, bytes32 salt) external {
    bytes32 revealedHash = keccak256(abi.encode(testCasesJSON, salt));
    require(revealedHash == commitHashes[foroId], "Hash mismatch");
    
    // Verify testCasesJSON derives to stored contractHash
    bytes32 derivedHash = keccak256(bytes(testCasesJSON));
    // Compare with stored Agent Contract hash
    // ...
}
```

**Security Considerations**:
- Timeout for reveal (24 hours) — if Keeper never reveals, stake is slashed and user refunded
- Hash verification MUST check both: commit hash matches AND testCases derive to contractHash
- Use `abi.encode` for deterministic hash (not `abi.encodePacked` which has collision risks)

**References**:
- Commit-reveal schemes: https://github.com/OpenZeppelin/openzeppelin-contracts/discussions/3268
- Front-running prevention patterns

---

### 4. AgentVault with ERC-4626 for Fee Management

**Decision**: AgentVault extends ERC-4626 for standardized escrow and fee distribution

**Rationale**:
- ERC-4626 provides vault pattern with deposit/withdraw functions
- Test fees deposited via `deposit(foroId, requester)` at requestTest time
- Finalization triggers fee distribution: `distributePass(foroId, agentWallet, keeper, 70%)` or `distributeFail(foroId, requester)` for refund
- 70/20/10 split: 70% Keeper, 20% agent creator (via ERC-8004 `ownerOf`), 10% protocol treasury

**Alternatives Considered**:
- **Direct transfers in ForoRegistry**: Rejected to separate fee logic from registry logic (single responsibility)
- **Custom escrow without ERC-4626**: Rejected because ERC-4626 provides battle-tested vault patterns and composability

**Implementation**:
```solidity
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";

contract AgentVault is ERC4626, Ownable, ReentrancyGuard {
    mapping(uint256 => uint256) public escrowed; // foroId => amount
    
    function deposit(uint256 foroId, address requester) external payable {
        escrowed[foroId] = msg.value;
        // ...
    }
    
    function distributePass(
        uint256 foroId,
        address agentWallet,
        address keeper,
        uint256 keeperPct
    ) external onlyOwner nonReentrant {
        uint256 amount = escrowed[foroId];
        require(amount > 0, "No escrowed funds");
        
        uint256 keeperShare = (amount * 70) / 100;
        uint256 creatorShare = (amount * 20) / 100;
        uint256 protocolShare = amount - keeperShare - creatorShare;
        
        // Use transfer or call{value: ...} with reentrancy protection
        payable(keeper).transfer(keeperShare);
        payable(agentWallet).transfer(creatorShare);
        payable(protocolTreasury).transfer(protocolShare);
        
        escrowed[foroId] = 0;
    }
    
    function distributeFail(uint256 foroId, address requester) external onlyOwner nonReentrant {
        uint256 amount = escrowed[foroId];
        payable(requester).transfer(amount);
        escrowed[foroId] = 0;
    }
}
```

**Security Considerations**:
- **Reentrancy protection**: Use OpenZeppelin `ReentrancyGuard` or checks-effects-interactions pattern
- **Rounding errors**: Ensure `keeperShare + creatorShare + protocolShare = amount` exactly (use remainder for protocol)
- **Access control**: Only ForoRegistry can trigger distribution (via `onlyOwner` or dedicated role)

**References**:
- ERC-4626: https://eips.ethereum.org/EIPS/eip-4626
- OpenZeppelin ERC4626 implementation

---

### 5. x402 Payment Protocol Integration

**Decision**: Frontend proxy (`/api/use/[foroId]`) implements x402 server responding with HTTP 402 + payment challenge

**Rationale**:
- x402 enables programmatic payment via HTTP 402 status code + payment instructions
- Agent endpoints (or proxies) return 402 with EIP-3009 `TransferWithAuthorization` challenge
- User signs payment authorization, resubmits with header, facilitator verifies via `/verify` and `/settle`
- MVP uses Base USDC (x402) or Tempo USDC.e (MPP) depending on facilitator

**Alternatives Considered**:
- **Direct agent endpoint x402**: Rejected for MVP because agent creators may not implement x402 themselves
- **Smart contract payment gating**: Rejected because x402 is off-chain and more flexible for micropayments

**Implementation**:
```typescript
// /api/use/[foroId]/route.ts
export async function POST(req: Request, { params }: { params: { foroId: string } }) {
  const { foroId } = params;
  const agent = await getAgent(foroId);
  
  // Check x402 payment header
  const paymentHeader = req.headers.get('x-payment-authorization');
  
  if (!paymentHeader) {
    // Return 402 with payment instructions
    return new Response(JSON.stringify({
      error: 'Payment Required',
      payment: {
        scheme: 'exact',
        token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base USDC
        amount: '1000000', // 1 USDC
        facilitator: 'https://facilitator.x402.io'
      }
    }), {
      status: 402,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Verify payment via facilitator
  const verified = await verifyX402Payment(paymentHeader);
  if (!verified) {
    return new Response('Payment verification failed', { status: 402 });
  }
  
  // Forward request to actual agent endpoint
  const agentResponse = await fetch(agent.endpoint, {
    method: 'POST',
    body: req.body,
    headers: { 'Content-Type': 'application/json' }
  });
  
  return agentResponse;
}
```

**References**:
- x402 spec: https://x402.gitbook.io/x402
- EIP-3009 TransferWithAuthorization: https://eips.ethereum.org/EIPS/eip-3009
- KeeperHub x402 integration: https://docs.keeperhub.com/workflows/marketplace

---

### 6. Gas Optimization Strategies

**Decision**: Use `calldata` for large inputs, events for indexing, batch operations, avoid storage writes in loops

**Rationale**:
- **calldata vs memory**: `calldata` is cheaper for function parameters that aren't modified (e.g., `revealTestInputs(string calldata testCasesJSON)`)
- **Events for indexing**: Emit events (TestRequested, ResultSubmitted, ResultFinalized) for off-chain indexing instead of storing arrays on-chain
- **Batch operations**: Future optimization: allow multiple test submissions in single tx
- **Storage writes**: Minimize SSTORE ops (most expensive), use local variables and write once

**Implementation Patterns**:
```solidity
// Use calldata for large inputs
function revealTestInputs(
    uint256 foroId,
    string calldata testCasesJSON, // calldata not memory
    bytes32 salt
) external {
    // ...
}

// Emit events instead of storing arrays
event TestRequested(uint256 indexed foroId, uint256 indexed agentId, address requester, uint256 fee, uint256 timestamp);

// Use local variables to minimize storage writes
function finalizeResult(uint256 foroId) external {
    TestJob memory job = jobs[foroId]; // Read once
    // Compute locally
    uint256 newScore = computeWeightedScore(job);
    // Write once
    agents[job.agentId].cumulativeScore = newScore;
}

// Avoid unbounded loops
// BAD:
for (uint i = 0; i < testResults.length; i++) { ... }

// GOOD: Use fixed-size iterations or off-chain computation
```

**Gas Estimates** (0G Chain EVM, assuming low base fee):
- `requestTest`: ~80k gas (storage write for escrow + event)
- `claimJob`: ~120k gas (stake transfer + storage write + event)
- `submitResult`: ~180k gas (result storage + event + score computation)
- `finalizeResult`: ~280k gas (3 transfers + score update + status update + event)

**References**:
- Solidity gas optimization: https://github.com/iskdrews/awesome-solidity-gas-optimization
- OpenZeppelin best practices: https://docs.openzeppelin.com/contracts/4.x/

---

## Summary of Decisions

| Area | Decision | Key Benefit |
|------|----------|-------------|
| ERC-8004 | External registry, read via getMetadata | Agent identity standard, transferability |
| 0G Compute | SDK with TEE proof (chatId + signature) | Cryptographic proof of honest evaluation |
| Commit-Reveal | Two-step with salt, 24h timeout | Front-running prevention, security |
| AgentVault | ERC-4626 vault with 70/20/10 split | Standardized escrow, battle-tested patterns |
| x402 | Frontend proxy with 402 + payment challenge | Programmatic payments, off-chain flexibility |
| Gas Optimization | calldata, events, minimize storage writes | <300k gas for finalization, low fees |

All research areas resolved. Ready for Phase 1 design (data model + contracts).
