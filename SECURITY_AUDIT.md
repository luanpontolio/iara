# Security Audit Checklist - Foro Protocol

**Version**: 1.0  
**Date**: 2026-04-30  
**Auditor**: [To be filled]

This checklist covers critical security considerations for Foro smart contracts based on Constitutional Constraints from spec.md.

## 1. Reentrancy Protection

### Fee Distribution Paths

- [ ] **AgentVault.distributePass** uses ReentrancyGuard
  - Verify Checks-Effects-Interactions pattern
  - Test with malicious recipient contracts
  - Confirm state updates before external calls

- [ ] **AgentVault.distributeFail** uses ReentrancyGuard
  - Verify refund executes safely
  - Test with malicious requester contracts
  - Confirm escrow cleared before transfer

- [ ] **ForoRegistry.finalizeResult** external calls to AgentVault
  - Verify no state changes after distributePass call
  - Test reentrancy from AgentVault callback

- [ ] **ForoRegistry.resolveContestation** handles stake slashing
  - Verify slashing before refund calls
  - Test with malicious contestant contracts

### Test Coverage

```bash
# Run reentrancy attack tests
forge test --match-test testReentrancy
```

---

## 2. Commit-Reveal Integrity

### Hash Verification

- [ ] **revealTestInputs** verifies commit hash matches
  - Test: `keccak256(testCases + salt) == commitHash`
  - Reject if hashes don't match

- [ ] **revealTestInputs** derives contractHash correctly
  - Test: `keccak256(testCases) == Agent.contractHash`
  - Prevent using different test cases than registered

- [ ] **Salt usage** prevents rainbow table attacks
  - Verify salt is properly hashed with test cases
  - Test with various salt values

### Attack Scenarios

- [ ] Front-running protection
  - Test: Cannot see test cases before commit
  - Mempool snooping should reveal only hash

- [ ] Griefing prevention
  - Test: Keeper cannot commit without stake
  - Test: Forfeit mechanism works after timeout

### Test Coverage

```bash
# Run commit-reveal security tests
forge test --match-contract CommitReveal
```

---

## 3. Stake Validation & Slashing

### Staking Requirements

- [ ] **Keeper stake** must be exactly 2x testFee
  - Test: `msg.value == TestJob.testFee * 2`
  - Reject if stake amount incorrect

- [ ] **Contest stake** must be exactly 50% of job stake
  - Test: `msg.value == TestJob.keeperStake / 2`
  - Reject if contest amount incorrect

- [ ] **Min Keeper stake** enforced on registration
  - Test: `msg.value >= MIN_KEEPER_STAKE`
  - Prevent Keeper registration with insufficient stake

### Slashing Correctness

- [ ] **Forfeit** slashes 100% to protocol
  - Test: `protocolTreasury` receives full `keeperStake`
  - User receives `testFee` refund

- [ ] **Contestation (contestant wins)** slashes correctly
  - Test: 50% to contestant, 50% to protocol
  - User receives `testFee` refund
  - Verify no rounding errors

- [ ] **Contestation (contestant loses)** penalties correct
  - Test: Contest stake goes to protocol
  - Original Keeper receives stake + fee distribution

### Edge Cases

- [ ] Multiple contestations on same job
  - Test: Cannot contest twice
  - First contestation blocks further contests

- [ ] Stake underflow/overflow
  - Test: No integer overflow in stake calculations
  - Verify SafeMath behavior (Solidity ^0.8.20 has built-in checks)

### Test Coverage

```bash
# Run staking and slashing tests
forge test --match-test testStake
forge test --match-test testSlashing
```

---

## 4. Fee Distribution Accuracy

### Distribution Formula

- [ ] **70/20/10 split** calculates correctly
  - Test: `keeperShare + creatorShare + protocolShare == testFee`
  - No rounding errors accumulate

- [ ] **Zero escrow balance** after finalization
  - Test: `AgentVault.escrowed[foroId] == 0` after distribute
  - All funds distributed or refunded

- [ ] **Creator wallet resolution** via ERC-8004
  - Test: `ERC8004.ownerOf(agentId)` returns correct address
  - Fee sent to correct recipient

### Attack Scenarios

- [ ] Rounding error exploitation
  - Test: Cannot accumulate dust in escrow
  - Verify remainder goes to protocol

- [ ] Fee distribution DoS
  - Test: Failed transfer to one party doesn't block others
  - Consider pull payment pattern if needed

### Test Coverage

```bash
# Run fee distribution tests
forge test --match-test testFeeDistribution
```

---

## 5. Immutability Constraints

### Agent Contract Hash

- [ ] **contractHash** computed correctly at registration
  - Test: `keccak256(agentContractJSON)` stored immutably
  - Cannot be changed after registration

- [ ] **Metadata changes** detected
  - Test: New metadata produces different hash
  - Previous test results invalid for new hash

### Test Results

- [ ] **TestResult** data immutable after finalization
  - Test: Cannot modify score, latency, chatId, teeProof
  - No admin functions to alter results

- [ ] **Finalized flag** prevents re-finalization
  - Test: Cannot call finalizeResult twice
  - Status persists permanently

### Test Coverage

```bash
# Run immutability tests
forge test --match-test testImmutability
```

---

## 6. Access Control

### Owner Functions

- [ ] **resolveContestation** only callable by owner
  - Test: Non-owner call reverts
  - Verify Ownable modifier

- [ ] **AgentVault ownership** transferred correctly
  - Test: Only ForoRegistry can call distributePass/Fail
  - Deploy script transfers ownership

### Permission Checks

- [ ] **revealTestInputs** only by job Keeper
  - Test: Non-Keeper call reverts
  - Verify `msg.sender == TestJob.keeperAddress`

- [ ] **submitResult** only after reveal
  - Test: Cannot submit before revealTestInputs
  - Verify status == REVEALED

- [ ] **finalizeResult** only after contestation window
  - Test: Cannot finalize during 1-hour window
  - Verify `block.timestamp > contestationDeadline`

### Test Coverage

```bash
# Run access control tests
forge test --match-test testAccessControl
```

---

## 7. External Dependencies

### 0G Compute Integration

- [ ] **TEE proof format validation**
  - Test: Proof bytes length >= 64
  - chatId non-empty
  - Note: Cryptographic verification done off-chain

- [ ] **teeVerified=false** forces score to 0
  - Test: Score override works correctly
  - Prevents invalid results from affecting reputation

- [ ] **Keeper verification** before submission
  - Code review: Keeper verifies signature off-chain
  - Documentation clear about verification steps

### ERC-8004 Integration

- [ ] **Metadata retrieval failure** reverts
  - Test: Registration fails if metadata not found
  - Clear error message

- [ ] **Invalid ERC-8004 contract** handled
  - Test: Contract without getMetadata reverts
  - Validate interface before registration

- [ ] **JSON parsing** errors handled gracefully
  - Note: JSON parsing done off-chain by Keeper
  - Invalid JSON prevents reveal hash match

### Test Coverage

```bash
# Run external dependency tests
forge test --match-test testERC8004
forge test --match-test testTEE
```

---

## 8. Gas Optimization Security

### DoS Prevention

- [ ] **No unbounded loops**
  - Audit: All loops have fixed or limited iterations
  - getTestHistory uses pagination

- [ ] **Calldata usage** for large inputs
  - Verify: `revealTestInputs` uses `calldata` not `memory`
  - Gas savings validated

- [ ] **Event emission** for off-chain indexing
  - Verify: No on-chain array storage of test history
  - Events used for historical data

### Gas Limits

- [ ] **requestTest** gas cost < 100k
  - Measure: `forge test --gas-report`
  - Meets spec requirement

- [ ] **finalizeResult** gas cost < 300k
  - Measure: `forge test --gas-report`
  - Includes 3 transfers + score update

### Test Coverage

```bash
# Run gas benchmarks
forge snapshot
forge test --gas-report
```

---

## 9. State Machine Integrity

### Status Transitions

- [ ] **Agent status** follows state machine
  - Test: Cannot skip states (e.g., PENDING → ELITE)
  - Transitions only on finalization

- [ ] **TestJob status** follows lifecycle
  - Test: REQUESTED → COMMITTED → REVEALED → SUBMITTED → FINALIZED
  - Cannot reverse states

- [ ] **Invalid transitions** revert
  - Test: Cannot finalize before submission
  - Cannot reveal before commit

### Edge Cases

- [ ] **Concurrent status updates**
  - Test: Multiple tests finalized in same block
  - Cumulative score calculates correctly

- [ ] **Status degradation**
  - Test: ELITE → FAILED if subsequent tests fail
  - Score correctly weighted

### Test Coverage

```bash
# Run state machine tests
forge test --match-test testStatus
```

---

## 10. Contestation Window

### Timing Verification

- [ ] **1-hour window** enforced
  - Test: Cannot contest after `block.timestamp > deadline`
  - Cannot finalize during window

- [ ] **Block timestamp manipulation** considered
  - Note: 1-hour window >> 15 second block time
  - Miner manipulation impact minimal

### Multiple Contestants

- [ ] **First contestation** wins
  - Test: Cannot contest after first contestation
  - Second contestant call reverts

- [ ] **Contestation resolution** unblocks finalization
  - Test: After resolution, finalization proceeds
  - Correct party receives funds

### Test Coverage

```bash
# Run contestation tests
forge test --match-test testContest
```

---

## Audit Execution

### Run All Security Tests

```bash
cd packages/contracts

# Full test suite
forge test

# Security-focused tests
forge test --match-test testReentrancy
forge test --match-test testCommitReveal
forge test --match-test testStake
forge test --match-test testFeeDistribution
forge test --match-test testAccessControl

# Gas report
forge test --gas-report

# Coverage report
forge coverage
```

### Manual Code Review

- [ ] Review all external calls for reentrancy
- [ ] Verify all math operations for overflow/underflow
- [ ] Check state variable visibility (private/public/internal)
- [ ] Validate event emissions for all state changes
- [ ] Confirm error messages are descriptive

### Documentation Review

- [ ] NatSpec comments for all public functions
- [ ] Security considerations documented
- [ ] Known limitations listed
- [ ] Upgrade strategy documented (if using proxy)

---

## Sign-off

**Auditor Name**: ___________________________  
**Signature**: ___________________________  
**Date**: ___________________________

**Audit Result**: [ ] PASS  [ ] CONDITIONAL PASS  [ ] FAIL

**Critical Issues Found**: ___________________________

**Recommendations**: ___________________________
