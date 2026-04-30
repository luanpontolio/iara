import { ethers } from 'ethers';
import { Config } from '../config.js';
import logger from './logger.js';

// Import ABIs from contract artifacts
// Note: In production, these would be generated from Foundry artifacts
const FORO_REGISTRY_ABI = [
  'event TestRequested(uint256 indexed foroId, uint256 indexed agentId, address requester, uint256 fee, uint256 timestamp)',
  'event JobClaimed(uint256 indexed foroId, address indexed keeper, bytes32 commitHash, uint256 stake)',
  'event TestInputsRevealed(uint256 indexed foroId, bytes32 salt)',
  'event ResultSubmitted(uint256 indexed foroId, uint256 score, uint256 avgLatencyMs, bytes32 chatId, bool teeVerified)',
  'event ResultFinalized(uint256 indexed foroId, uint256 indexed agentId, uint256 newScore, uint8 newStatus)',
  'function claimJob(uint256 foroId, bytes32 inputsHash) external payable',
  'function revealTestInputs(uint256 foroId, string calldata testCasesJSON, bytes32 salt) external',
  'function submitResult(uint256 foroId, uint256 score, uint256 latency, uint256 rounds, bytes32 chatId) external',
  'function finalizeResult(uint256 foroId) external',
  'function getTestJob(uint256 foroId) external view returns (tuple(uint256 foroId, uint256 agentId, address requester, uint256 testFee, address keeperAddress, uint256 keeperStake, bytes32 commitHash, uint256 commitTimestamp, uint256 revealTimestamp, uint8 status, uint256 contestationDeadline))',
  'function getAgent(uint256 foroId) external view returns (tuple(uint256 foroId, address erc8004Address, uint256 erc8004AgentId, bytes32 contractHash, address creatorWallet, uint8 status, uint256 testCount, uint256 cumulativeScore, uint256 registrationTimestamp))',
];

const ERC8004_ABI = [
  'function getMetadata(uint256 agentId, string memory key) external view returns (bytes memory)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
];

const AGENT_VAULT_ABI = [
  'function escrowed(uint256 foroId) external view returns (uint256 amount)',
  'function protocolTreasury() external view returns (address treasury)',
];

export interface Contracts {
  provider: ethers.Provider;
  signer: ethers.Signer;
  foroRegistry: ethers.Contract;
  agentVault: ethers.Contract;
}

export async function createContracts(config: Config): Promise<Contracts> {
  logger.info({ rpcUrl: config.rpcUrl }, 'Connecting to blockchain');
  
  const provider = new ethers.JsonRpcProvider(config.rpcUrl, {
    chainId: config.chainId,
    name: '0G Chain',
  });
  
  const signer = new ethers.Wallet(config.privateKey, provider);
  logger.info({ address: await signer.getAddress() }, 'Keeper wallet loaded');
  
  const foroRegistry = new ethers.Contract(
    config.foroRegistryAddress,
    FORO_REGISTRY_ABI,
    signer
  );
  
  const agentVault = new ethers.Contract(
    config.agentVaultAddress,
    AGENT_VAULT_ABI,
    signer
  );
  
  // Verify contracts
  const registryCode = await provider.getCode(config.foroRegistryAddress);
  if (registryCode === '0x') {
    throw new Error('ForoRegistry not deployed at specified address');
  }
  
  logger.info(
    {
      foroRegistry: config.foroRegistryAddress,
      agentVault: config.agentVaultAddress,
    },
    'Contracts loaded'
  );
  
  return {
    provider,
    signer,
    foroRegistry,
    agentVault,
  };
}

export function createERC8004Contract(
  address: string,
  provider: ethers.Provider
): ethers.Contract {
  return new ethers.Contract(address, ERC8004_ABI, provider);
}
