# Foro Protocol - Deployment Guide

## Prerequisites

✅ All tests passing (62/62 tests)  
✅ Foundry installed  
✅ 0G Chain testnet account with native tokens  
✅ Private key ready

## Step 1: Configure Environment

Edit `packages/contracts/.env`:

```bash
cd packages/contracts
cp .env.example .env
```

**Required variables**:
```bash
# Your deployer private key (needs 0G tokens for gas)
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# Optional: Protocol treasury address (defaults to deployer if not set)
PROTOCOL_TREASURY=0xYOUR_TREASURY_ADDRESS

# 0G Chain Testnet RPC
ZG_CHAIN_RPC_URL=https://evmrpc-testnet.0g.ai
```

### Get Testnet Tokens

You need 0G testnet tokens for gas. Get them from:
- 0G Chain testnet faucet (check 0G Discord/docs)
- Minimum recommended: 0.1 0G tokens

Check your balance:
```bash
cast balance YOUR_ADDRESS --rpc-url https://evmrpc-testnet.0g.ai
```

## Step 2: Verify Configuration

Test RPC connection:
```bash
cast chain-id --rpc-url $ZG_CHAIN_RPC_URL
# Should return: 16602
```

Test your deployer account:
```bash
cast wallet address --private-key $PRIVATE_KEY
```

## Step 3: Deploy Contracts

### Option A: Simple Deployment (Recommended)

```bash
cd packages/contracts

# Deploy to testnet
forge script script/Deploy.s.sol:Deploy \
  --rpc-url $ZG_CHAIN_RPC_URL \
  --broadcast \
  --legacy
```

**Note**: Use `--legacy` flag if you encounter EIP-1559 errors on 0G Chain.

### Option B: Deployment with Verification

```bash
forge script script/Deploy.s.sol:Deploy \
  --rpc-url $ZG_CHAIN_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  --legacy
```

### Option C: Dry Run First (Test Without Broadcasting)

```bash
# Simulate deployment without sending transactions
forge script script/Deploy.s.sol:Deploy \
  --rpc-url $ZG_CHAIN_RPC_URL
```

## Step 4: Verify Deployment

After successful deployment, you'll see:

```
=== Deployment Summary ===
MockERC8004: 0x...
AgentVault: 0x...
ForoRegistry: 0x...
Protocol Treasury: 0x...
```

**Contract addresses are automatically saved to `deployments.json`**

### Check deployments.json

```bash
cat deployments.json
```

Example output:
```json
{
  "MockERC8004": "0x5615dEB798BB3E4dFa0139dFa1b3D433Cc23b72f",
  "AgentVault": "0x2e234DAe75C793f67A35089C9d99245E1C58470b",
  "ForoRegistry": "0x104fBc016F4bb334D775a19E8A6510109AC63E00",
  "protocolTreasury": "0x...",
  "minKeeperStake": 10000000000000000,
  "testFeeAmount": 1000000000000000,
  "chainId": 16602,
  "deployedAt": 1234567890
}
```

### Verify Contracts on Chain

```bash
# Check ForoRegistry code
cast code $(jq -r .ForoRegistry deployments.json) --rpc-url $ZG_CHAIN_RPC_URL

# Check AgentVault owner (should be ForoRegistry)
cast call $(jq -r .AgentVault deployments.json) "owner()(address)" --rpc-url $ZG_CHAIN_RPC_URL

# Should return ForoRegistry address
```

## Step 5: Update Backend Configuration

Copy deployed addresses to backend:

```bash
cd ../backend
cp .env.example .env
```

Edit `packages/backend/.env` with values from `deployments.json`:

```bash
# Copy from deployments.json
FORO_REGISTRY_ADDRESS=0x...  # From deployments.json
AGENT_VAULT_ADDRESS=0x...    # From deployments.json
MOCK_ERC8004_ADDRESS=0x...   # From deployments.json

# Your keeper private key (needs 0.01 0G for keeper registration)
KEEPER_PRIVATE_KEY=0x...

# 0G Chain RPC
ZG_CHAIN_RPC_URL=https://evmrpc-testnet.0g.ai

# 0G Compute Configuration
ZG_COMPUTE_PROVIDER=0x...  # Get from 0G Compute docs
```

## Step 6: Generate TypeScript Types

Generate contract types for backend/frontend integration:

```bash
cd ../types
pnpm run generate-types
```

This creates:
- `contracts.ts` - Contract ABIs and addresses
- `enums.ts` - Solidity enum types
- Updated exports in `index.ts`

## Step 7: Test Deployment

### Test Contract Interaction

```bash
cd ../contracts

# Register a test agent (as creator)
cast send $(jq -r .MockERC8004 deployments.json) \
  "register(string)(uint256)" "test-agent" \
  --private-key $PRIVATE_KEY \
  --rpc-url $ZG_CHAIN_RPC_URL \
  --legacy

# Should return transaction hash and agent ID
```

### Start Keeper Service (Optional)

```bash
cd ../backend
pnpm install
pnpm start
```

Keeper will:
1. Register as keeper (0.01 0G stake)
2. Listen for TestRequested events
3. Execute tests when users request them

## Troubleshooting

### Issue: "insufficient funds for gas"

**Solution**: Get more 0G testnet tokens from faucet

```bash
# Check balance
cast balance YOUR_ADDRESS --rpc-url $ZG_CHAIN_RPC_URL
```

### Issue: "nonce too low"

**Solution**: Reset nonce

```bash
# Get current nonce
cast nonce YOUR_ADDRESS --rpc-url $ZG_CHAIN_RPC_URL

# Use explicit nonce in next transaction
forge script script/Deploy.s.sol:Deploy \
  --rpc-url $ZG_CHAIN_RPC_URL \
  --broadcast \
  --legacy \
  --with-gas-price 1000000000
```

### Issue: "replacement transaction underpriced"

**Solution**: Wait a few minutes or increase gas price

```bash
--with-gas-price 2000000000  # 2 gwei
```

### Issue: "execution reverted"

**Solution**: Check deployment logs for specific error

```bash
# Run dry-run to see error
forge script script/Deploy.s.sol:Deploy --rpc-url $ZG_CHAIN_RPC_URL
```

### Issue: RPC connection timeout

**Solution**: Try alternative RPC endpoints

```bash
# Try different 0G Chain RPC
ZG_CHAIN_RPC_URL=http://178.238.236.119:6789  # Alternative RPC
```

## Deployment Checklist

Before deploying to production:

- [ ] All tests passing (`forge test`)
- [ ] Gas optimization validated (`forge snapshot`)
- [ ] Security audit completed (see `SECURITY_AUDIT.md`)
- [ ] Environment variables configured
- [ ] Deployer has sufficient 0G tokens (recommended: 0.1 0G)
- [ ] Protocol treasury address set (if different from deployer)
- [ ] Backup private keys securely
- [ ] RPC endpoint verified and stable

After deployment:

- [ ] Contract addresses saved in `deployments.json`
- [ ] Backend `.env` updated with contract addresses
- [ ] TypeScript types generated (`pnpm run generate-types`)
- [ ] Test interaction confirmed (register agent, request test)
- [ ] Keeper service tested on testnet
- [ ] Contract ownership verified (AgentVault owned by ForoRegistry)
- [ ] Document deployed addresses in team wiki/docs

## Production Deployment

For mainnet deployment:

1. **Multi-sig Treasury**: Use Gnosis Safe for protocol treasury
2. **Timelock**: Deploy TimelockController for upgrade governance
3. **Professional Audit**: Complete security audit before mainnet
4. **Staged Rollout**: Deploy to testnet → limited beta → full mainnet
5. **Monitoring**: Set up alerts for contract events and errors
6. **Insurance**: Consider smart contract insurance (Nexus Mutual, etc.)

## Network Information

### 0G Chain Testnet (0G-Galileo-Testnet)

- **Chain ID**: 16602
- **RPC URL**: https://evmrpc-testnet.0g.ai
- **Alternative RPC**: http://178.238.236.119:6789
- **Native Token**: 0G
- **Block Time**: ~12 seconds
- **Gas Price**: Variable (typically low)

### Deployed Contract Addresses

After deployment, update this section:

```
MockERC8004: [To be filled after deployment]
AgentVault: [To be filled after deployment]
ForoRegistry: [To be filled after deployment]
Deployment Date: [Date]
Deployer: [Address]
```

## Gas Costs (Estimated)

Based on gas benchmark results:

| Operation | Gas Used | Cost @ 1 gwei |
|-----------|----------|---------------|
| Deploy MockERC8004 | ~2.3M | 0.0023 0G |
| Deploy AgentVault | ~680K | 0.00068 0G |
| Deploy ForoRegistry | ~3.5M | 0.0035 0G |
| **Total Deployment** | **~6.5M** | **~0.0065 0G** |
| registerAgent | <100K | 0.0001 0G |
| requestTest | <100K | 0.0001 0G |
| claimJob | <150K | 0.00015 0G |
| submitResult | <200K | 0.0002 0G |
| finalizeResult | <300K | 0.0003 0G |

**Recommended deployer balance**: 0.1 0G (includes buffer)

## Support

- **GitHub Issues**: https://github.com/your-org/foro/issues
- **Documentation**: See `README.md`, `SECURITY_AUDIT.md`
- **Discord**: [Your Discord invite]

---

**Deployment completed?** 

Next steps:
1. Test agent registration
2. Start Keeper service
3. Monitor events
4. Document deployment addresses
