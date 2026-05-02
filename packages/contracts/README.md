# Foro Contracts

Smart contracts for the Foro agent verification protocol, built with **Foundry** and **OpenZeppelin Contracts v5**.

## Contracts

### ForoRegistry.sol

Main registry and orchestrator. Inherits `Ownable` + `ReentrancyGuard`.

**Core data structures**

```solidity
struct Agent {
    uint256 foroId;
    address erc8004Address;
    uint256 erc8004AgentId;
    bytes32 contractHash;      // keccak256 of Agent Contract JSON — immutable fingerprint
    address creatorWallet;
    AgentStatus status;        // PENDING → PROBATION → VERIFIED | ELITE | FAILED
    uint256 testCount;
    uint256 cumulativeScore;   // 0–10 000 (basis points representing 0.00–100.00)
    uint256 registrationTimestamp;
}

struct TestJob {
    uint256 foroId;
    uint256 agentId;
    address requester;
    uint256 testFee;
    address keeperAddress;
    uint256 keeperStake;
    bytes32 commitHash;
    uint256 commitTimestamp;
    uint256 revealTimestamp;
    JobStatus status;
    uint256 contestationDeadline;
}

struct TestResult {
    uint256 foroId;
    uint256 score;
    uint256 avgLatencyMs;
    uint256 rounds;
    bytes32 chatId;            // zg-res-key from 0G Compute — on-chain TEE proof
    bool teeVerified;          // false forces score = 0
    uint256 submissionTimestamp;
    bool finalized;
}

struct Keeper {
    address keeperAddress;
    uint256 stakedAmount;
    uint256 jobsCompleted;
    uint256 jobsContested;
    uint256 contestationsWon;
    uint256 contestationsLost;
    uint256 totalEarned;
    bool active;
    uint256 registrationTimestamp;
}
```

**Job state machine**

```
REQUESTED → COMMITTED → REVEALED → SUBMITTED ──► FINALIZED
                │                      │
           forfeitStake()         contestResult()
                │                      │
            REFUNDED              CONTESTED ──► FINALIZED
                                              └─► REFUNDED
         REVEALED → FAILED → FINALIZED
```

**Constants**

| Name | Value |
|---|---|
| `MIN_TEST_FEE` | 0.001 ether |
| `REVEAL_TIMEOUT` | 1 hour |
| `CONTESTATION_WINDOW` | 1 hour |
| `MIN_KEEPER_STAKE` | 0.01 ether |

---

### AgentVault.sol

Minimal escrow for test fees. Inherits `Ownable` + `ReentrancyGuard`.  
`ForoRegistry` is the sole authorized caller (`onlyOwner`).

Fee split on `distributePass`:

```
70%  →  Keeper
20%  →  Agent Creator
10%  →  Protocol Treasury
```

---

### MockERC8004.sol

ERC-8004 compliant agent identity token. Inherits `ERC721URIStorage`, `EIP712`, `ECDSA`.

Metadata is stored as `bytes` under string keys:

| Key | Value |
|---|---|
| `foro:contract` | Agent Contract JSON (test cases, SLA, I/O schema) |
| `foro:endpoint` | Agent HTTP URL |
| `agentWallet` | Reserved — managed by EIP-712 signed `setAgentWallet` |

---

## Usage

```bash
# Build
forge build

# Run all tests
forge test

# Gas report
forge test --gas-report

# Coverage
forge coverage

# Deploy to 0G-Galileo-Testnet (chain 16602)
forge script script/Deploy.s.sol:Deploy \
  --rpc-url $ZG_CHAIN_RPC_URL \
  --broadcast
```

## Dependencies

- [OpenZeppelin Contracts v5](https://github.com/OpenZeppelin/openzeppelin-contracts) — `Ownable`, `ReentrancyGuard`, `ERC721URIStorage`, `EIP712`, `ECDSA`
- [forge-std](https://github.com/foundry-rs/forge-std) — test utilities
