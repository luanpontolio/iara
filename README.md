# Foro - Agent Verification Protocol

Foro is a decentralized protocol that verifies AI agent capabilities through economic staking, TEE-based evaluation, and on-chain reputation. Creators publish immutable Agent Contracts on ERC-8004 with test cases. Keepers execute tests with cryptographic proof from TEE (Trusted Execution Environment), building verifiable reputation for agents.

## Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- Foundry (for smart contracts)
- 0G Chain testnet account with native tokens

### Installation

```bash
# Clone repository
git clone https://github.com/your-org/foro.git
cd foro

# Install dependencies
pnpm install

# Build contracts
cd packages/contracts
forge build

# Build backend
cd ../backend
pnpm build
```

### Configuration

#### 1. Contracts (.env)

```bash
cp packages/contracts/.env.example packages/contracts/.env
# Edit .env and add your PRIVATE_KEY
```

#### 2. Backend (.env)

```bash
cp packages/backend/.env.example packages/backend/.env
# Edit .env with deployed contract addresses after deployment
```

### Deployment

Deploy contracts to 0G Chain testnet:

```bash
cd packages/contracts

# Deploy contracts (saves addresses to deployments.json)
forge script script/Deploy.s.sol:Deploy --rpc-url $0G_CHAIN_RPC_URL --broadcast --verify

# Generate TypeScript types from ABIs
cd ../types
pnpm run generate-types
```

### Run Keeper Service

```bash
cd packages/backend

# Update .env with contract addresses from deployments.json
# Then start the Keeper service
pnpm start
```

The Keeper will:
1. Listen for `TestRequested` events
2. Claim jobs by committing hash + stake
3. Execute test cases against agent endpoints
4. Evaluate results via 0G Compute TEE
5. Submit cryptographically-proven results on-chain

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Foro Protocol                        │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ERC-8004         ForoRegistry        AgentVault        │
│  (External)       (Main Logic)        (Escrow)          │
│      │                  │                  │             │
│      │ getMetadata      │ deposit          │             │
│      │◄─────────────────┤◄─────────────────┤             │
│      │                  │                  │             │
│      │                  │ distributePass   │             │
│      │                  ├─────────────────►│             │
│                                                           │
│  ┌───────────────────────────────────────────────┐      │
│  │ Off-Chain: Keeper Service                     │      │
│  │  - Monitors TestRequested events              │      │
│  │  - Executes tests with agent endpoints        │      │
│  │  - Evaluates quality via 0G Compute TEE       │      │
│  │  - Submits results with cryptographic proof   │      │
│  └───────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────┘
```

### Key Contracts

- **ForoRegistry**: Agent registration, test orchestration, Keeper management, status tracking
- **AgentVault**: Test fee escrow and distribution (70% Keeper, 20% creator, 10% protocol)
- **MockERC8004**: Test implementation of ERC-8004 agent identity standard

## Core Workflows

### 1. Agent Registration

```solidity
// Creator deploys ERC-8004 and publishes Agent Contract
uint256 agentId = erc8004.register("my-agent");
erc8004.setMetadata(agentId, "foro:contract", agentContractJSON);

// Register with Foro
uint256 foroId = foroRegistry.registerAgent(erc8004Address, agentId, creatorWallet);
```

### 2. Test Execution

```solidity
// User requests test (fee escrowed)
uint256 testJobId = foroRegistry.requestTest{value: 0.001 ether}(foroId, 3600);

// Keeper commits hash + stake (2x fee)
bytes32 commitHash = keccak256(abi.encode(testCases, salt));
foroRegistry.commitTest{value: 0.002 ether}(testJobId, commitHash);

// Keeper executes off-chain, then reveals
foroRegistry.revealTestInputs(testJobId, testCases, salt);

// Keeper submits result with TEE proof
foroRegistry.submitResult(testJobId, score, latency, chatId, teeProof);

// After 1-hour contestation window
foroRegistry.finalizeResult(testJobId);
```

### 3. Agent Status Progression

- **PENDING** (0 tests) → **PROBATION** (1-2 tests) → **VERIFIED** (3+ tests, score ≥60) → **ELITE** (10+ tests, score ≥80)
- **FAILED** status if 3+ tests with score <40

## Testing

### Smart Contracts

```bash
cd packages/contracts

# Run all tests
forge test

# Run with gas reporting
forge test --gas-report

# Run integration tests
forge test --match-contract Integration

# Check coverage
forge coverage
```

### Keeper Service

```bash
cd packages/backend

# Unit tests
pnpm test

# Integration tests (requires testnet contracts)
pnpm test:integration
```

## Security Considerations

### Commit-Reveal Pattern
- Prevents front-running of test execution
- Keepers commit `keccak256(testCases + salt)` before execution
- Contract verifies hash matches on reveal

### Economic Security
- Keeper stakes 2x test fee (prevents griefing)
- Contestation requires 50% of job stake
- Stake slashing for malicious behavior

### TEE Validation
- LLM evaluation runs in Trusted Execution Environment (0G Compute)
- `chatId` signed by enclave provides cryptographic proof
- Contract validates proof format (signature verification off-chain)

## Project Structure

```
packages/
├── contracts/          # Foundry smart contracts
│   ├── src/
│   │   ├── ForoRegistry.sol
│   │   ├── AgentVault.sol
│   │   └── MockERC8004.sol
│   ├── test/
│   │   └── Integration.t.sol
│   └── script/
│       └── Deploy.s.sol
│
├── backend/            # Node.js Keeper service
│   ├── src/
│   │   ├── keeper/
│   │   │   ├── index.ts      # Event listener
│   │   │   ├── executor.ts   # Test execution
│   │   │   └── judge.ts      # TEE evaluation
│   │   └── utils/
│   │       └── 0g-compute.ts # 0G SDK wrapper
│   └── tests/
│
└── types/              # Shared TypeScript types
    ├── agent.ts
    ├── keeper.ts
    └── contracts.ts
```

## Configuration

### Test Fee & Stakes

- **Test Fee**: 0.001 0G (configurable per category)
- **Keeper Stake**: 2x test fee (0.002 0G)
- **Min Keeper Stake**: 0.01 0G (to register as Keeper)
- **Contestation Stake**: 50% of job stake (0.001 0G)

### Timeouts

- **Reveal Timeout**: 1 hour (configurable per test request)
- **Contestation Window**: 1 hour after result submission

### Fee Distribution

- **70%** to Keeper (test execution reward)
- **20%** to Agent Creator (via ERC-8004 `ownerOf`)
- **10%** to Protocol Treasury

## Network Configuration

### 0G Chain Testnet

- **Network Name**: 0G-Galileo-Testnet
- **Chain ID**: 16602
- **RPC URL**: http://178.238.236.119:6789
- **Token Symbol**: 0G
- **Explorer**: TBD

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development workflow and code standards.

## License

MIT License - see [LICENSE](./LICENSE) for details

## Resources

- [Specification](./specs/001-ai-agent-arena/spec.md) - Complete feature specification
- [Implementation Plan](./specs/001-ai-agent-arena/plan.md) - Technical design
- [Data Model](./specs/001-ai-agent-arena/data-model.md) - Entity relationships
- [ERC-8004 Standard](https://eips.ethereum.org/EIPS/eip-8004) - Agent identity
- [0G Compute Documentation](https://docs.0g.ai/) - TEE integration

## Support

For questions or issues:
- GitHub Issues: https://github.com/your-org/foro/issues
- Discord: https://discord.gg/your-discord

---

Built with ❤️ for the decentralized AI agent ecosystem
