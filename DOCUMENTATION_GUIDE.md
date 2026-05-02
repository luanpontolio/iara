# Documentation Guide - Foro Protocol

This guide ensures all code documentation follows Constitutional Principle I: "Comments explain WHY and TRADE-OFFS, NOT WHAT (code shows what)."

## Philosophy

Code should be self-documenting through:
- Descriptive function names
- Clear variable names
- Obvious control flow

Comments should explain:
- **Why** a design decision was made
- **Trade-offs** between alternatives
- **Non-obvious** constraints or requirements
- **Security** considerations
- **Performance** optimizations

## Solidity (NatSpec)

### Good Examples

```solidity
/**
 * @notice Stake is 2x test fee to create economic security against griefing
 * @dev If stake were only 1x fee, malicious Keepers could claim jobs without intent
 *      to complete them, blocking legitimate Keepers with minimal cost. The 2x ratio
 *      ensures claiming a job costs more than the potential gain from blocking others.
 */
function commitTest(uint256 foroId, bytes32 commitHash) external payable {
    require(msg.value == testJobs[foroId].testFee * 2, "Stake must be 2x fee");
    // ...
}
```

**Why this is good**: Explains the economic reasoning behind the 2x stake requirement.

```solidity
/**
 * @notice Use calldata instead of memory to save gas on large inputs
 * @dev testCasesJSON can be several KB for agents with many test cases.
 *      calldata saves ~3000 gas per KB compared to memory copying.
 *      Trade-off: Function cannot modify testCasesJSON (but doesn't need to).
 */
function revealTestInputs(
    uint256 foroId,
    string calldata testCasesJSON,
    bytes32 salt
) external {
    // ...
}
```

**Why this is good**: Explains the gas optimization and acknowledges the trade-off.

### Bad Examples

```solidity
// BAD: Narrating what the code obviously does
function submitResult(uint256 score) external {
    // Set the score
    result.score = score;
    
    // Emit an event
    emit ResultSubmitted(score);
}
```

**Why this is bad**: Comments just repeat what the code already shows.

```solidity
// BAD: Missing the "why"
function commitTest(uint256 foroId) external payable {
    require(msg.value == testFee * 2);
    // ...
}
```

**Why this is bad**: Doesn't explain why 2x is required.

### NatSpec Tags

```solidity
/**
 * @title Contract title
 * @notice User-facing explanation (what users need to know)
 * @dev Technical details for developers (why/how/trade-offs)
 * @param paramName Explanation of parameter purpose
 * @return returnName Explanation of what is returned
 */
```

**Use @dev for**:
- Security considerations
- Gas optimizations
- Trade-offs
- Design decisions
- Edge cases
- Integration points

## TypeScript (JSDoc)

### Good Examples

```typescript
/**
 * Verify TEE signature off-chain before submission
 * 
 * Why off-chain: On-chain ECDSA verification costs ~3000 gas and requires
 * deploying the 0G Compute public key on-chain, which changes periodically.
 * Off-chain verification is free and allows Keeper to update keys dynamically
 * by reading from 0G Compute API.
 * 
 * Trade-off: Relies on Keeper honesty for signature verification. However,
 * on-chain contract still stores the full proof, allowing anyone to verify
 * later if they suspect fraud. Malicious Keepers can be slashed via contestation.
 */
async function verifyTEESignature(chatId: string, signature: string): Promise<boolean> {
    // ...
}
```

**Why this is good**: Explains the design decision with security implications and trade-offs.

```typescript
/**
 * Retry logic intentionally omitted in MVP (happy path only)
 * 
 * Why: TEE service failures on testnet are unpredictable and may require
 * hours to resolve. Implementing exponential backoff would complicate Keeper
 * logic and potentially lock jobs indefinitely. Instead, Keeper immediately
 * submits test failed result, allowing user refund and creator to retry manually.
 * 
 * Post-MVP: Consider circuit breaker pattern with configurable retry policy.
 */
async function callTEEService(prompt: string): Promise<TEEResponse> {
    const response = await fetch(...);
    if (!response.ok) {
        throw new Error('TEE_UNAVAILABLE'); // No retries
    }
    return response.json();
}
```

**Why this is good**: Documents why retries are absent (MVP scope decision) and future direction.

### Bad Examples

```typescript
// BAD: Obvious comment
async function submitResult(score: number) {
    // Submit the result to the contract
    await contract.submitResult(score);
}
```

**Why this is bad**: Function name already tells us this submits a result.

```typescript
// BAD: Missing context
const TIMEOUT = 300000; // 5 minutes
```

**Why this is bad**: Doesn't explain why 5 minutes was chosen or what happens on timeout.

**Better:**
```typescript
/**
 * Agent endpoint timeout set to 5 minutes (300s)
 * 
 * Why 5 minutes: Allows time for:
 * - Agent to fetch external data (e.g., scrape URL)
 * - LLM inference (typical <30s, but spikes during high load)
 * - Network latency on testnet (can be 10-30s)
 * 
 * Trade-off: Longer timeout keeps Keeper waiting, but prevents premature failures.
 * Too short (e.g., 30s) would cause false negatives for slow but functional agents.
 */
const AGENT_TIMEOUT_MS = 300_000;
```

## Function Headers

### When to Add Comments

**DO comment:**
- Public/external functions (user-facing)
- Complex algorithms
- Security-critical logic
- Gas optimizations
- Integration points with external contracts
- Non-obvious workarounds

**DON'T comment:**
- Simple getters/setters
- Obvious one-liners
- Functions with self-explanatory names and parameters

### Examples

```solidity
// DON'T comment this (obvious)
function getAgentStatus(uint256 foroId) external view returns (AgentStatus) {
    return agents[foroId].status;
}

// DO comment this (security-critical)
/**
 * @notice Finalization blocked during 1-hour contestation window to allow community oversight
 * @dev Window starts at result submission timestamp. If miners manipulate timestamps,
 *      impact is limited to ~15s (block time) vs 3600s (contestation window), so risk is minimal.
 *      Alternative considered: Use block number instead of timestamp, but this is less intuitive
 *      for users and makes cross-chain deployment harder (different block times).
 */
function finalizeResult(uint256 foroId) external {
    require(block.timestamp > results[foroId].submissionTimestamp + 1 hours, "Contestation window active");
    // ...
}
```

## Documenting Design Decisions

Use multi-line comments for architectural explanations:

```solidity
/*
 * AgentVault Ownership Transfer
 * 
 * Why: ForoRegistry needs permission to call distributePass/Fail on AgentVault.
 * Using Ownable pattern instead of custom role because:
 * 1. Only one caller (ForoRegistry) needs access
 * 2. Ownership transfer is one-time operation in deployment script
 * 3. OpenZeppelin Ownable is well-audited
 * 
 * Alternative considered: OpenZeppelin AccessControl with DISTRIBUTOR_ROLE.
 * Rejected because it adds gas cost for role checks and complexity for single caller.
 * 
 * Future: If multiple contracts need vault access, migrate to AccessControl.
 */
agentVault.transferOwnership(address(foroRegistry));
```

## Documenting Trade-Offs

```typescript
/**
 * Poll events every 10 seconds instead of WebSocket
 * 
 * Why: 0G Chain testnet WebSocket support is unstable (disconnects every ~5 minutes).
 * Polling is more reliable for MVP, though adds 5-10s latency to job claiming.
 * 
 * Trade-off: Keeper may lose jobs to faster Keepers if multiple compete.
 * Acceptable for testnet; production should use WebSocket with reconnection logic.
 */
const POLL_INTERVAL_MS = 10_000;
```

## Security Considerations

Always document security-sensitive code:

```solidity
/**
 * @dev SECURITY: Checks-Effects-Interactions pattern strictly followed
 *      State updates MUST occur before external calls to prevent reentrancy.
 *      Order: 1) Update escrow, 2) Update result status, 3) Transfer funds
 */
function finalizeResult(uint256 foroId) external nonReentrant {
    escrowed[foroId] = 0; // Effect
    results[foroId].finalized = true; // Effect
    
    payable(keeper).transfer(keeperShare); // Interaction
}
```

## Configuration Constants

```solidity
// BAD
uint256 public constant MIN_STAKE = 0.01 ether;

// GOOD
/**
 * @notice Minimum Keeper stake set to 0.01 ETH to prevent spam registrations
 * @dev Lower values (e.g., 0.001 ETH) would allow attackers to register hundreds
 *      of fake Keepers cheaply, potentially DoS-ing the Keeper selection process.
 *      Higher values (e.g., 0.1 ETH) would exclude legitimate small operators.
 *      0.01 ETH balances accessibility with anti-spam protection (~$20 at $2000/ETH).
 */
uint256 public constant MIN_KEEPER_STAKE = 0.01 ether;
```

## Checklist for Code Reviews

When reviewing PRs, check:

- [ ] Comments explain WHY, not WHAT
- [ ] Trade-offs are documented
- [ ] Security considerations noted
- [ ] Gas optimizations justified
- [ ] No obvious/redundant comments
- [ ] Complex logic has explanatory comments
- [ ] Integration points documented

## Examples from Foro Codebase

See these files for good documentation examples:
- `packages/contracts/src/ForoRegistry.sol` - NatSpec with security notes
- `packages/backend/src/keeper/judge.ts` - JSDoc explaining TEE integration
- `packages/contracts/script/Deploy.s.sol` - Deployment sequence rationale

---

**Remember**: The best comment explains why the code exists, not what it does. If you can't explain the "why," consider whether the code is necessary.
