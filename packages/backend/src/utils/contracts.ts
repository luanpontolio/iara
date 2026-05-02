import { ethers } from 'ethers';
import { Config } from '../config.js';
import logger from './logger.js';

// Import ABIs from contract artifacts
// Note: In production, these would be generated from Foundry artifacts
const FORO_REGISTRY_ABI = [
  // Events
  'event AgentRegistered(uint256 indexed foroId, address indexed erc8004Address, uint256 erc8004AgentId, bytes32 contractHash, address creatorWallet)',
  'event TestRequested(uint256 indexed foroId, uint256 indexed agentId, address requester, uint256 fee, uint256 timestamp)',
  'event JobClaimed(uint256 indexed foroId, address indexed keeper, bytes32 commitHash, uint256 stake)',
  'event TestInputsRevealed(uint256 indexed foroId, bytes32 salt)',
  'event ResultSubmitted(uint256 indexed foroId, uint256 score, uint256 avgLatencyMs, bytes32 chatId, bool teeVerified)',
  'event ResultFinalized(uint256 indexed foroId, uint256 indexed agentId, uint256 newScore, uint8 newStatus)',
  'event ResultContested(uint256 indexed foroId, address indexed contestant, uint256 contestStake, string evidenceURI)',
  'event ContestationResolved(uint256 indexed foroId, bool contestantWins)',
  'event TestFailed(uint256 indexed foroId, uint8 failureReason, string errorDetails)',
  'event TestFailureFinalized(uint256 indexed foroId, address indexed requester, uint256 refundAmount)',
  'event KeeperRegistered(address indexed keeperAddress, uint256 stakedAmount, uint256 timestamp)',
  
  // Core Functions
  'function registerAgent(address erc8004Address, uint256 erc8004AgentId) external returns (uint256 foroId)',
  'function requestTest(uint256 agentId) external payable returns (uint256 foroId)',
  'function claimJob(uint256 foroId, bytes32 inputsHash) external payable',
  'function revealTestInputs(uint256 foroId, string calldata testCasesJSON, bytes32 salt) external',
  'function submitResult(uint256 foroId, uint256 score, uint256 latency, uint256 rounds, bytes32 chatId) external',
  'function finalizeResult(uint256 foroId) external',
  'function contestResult(uint256 foroId, string calldata evidenceURI, bytes32 evidenceHash) external payable',
  'function resolveContestation(uint256 foroId, bool contestantWins) external',
  'function forfeitStake(uint256 foroId) external',
  'function submitTestFailed(uint256 foroId, uint8 failureReason, string calldata errorDetails) external',
  'function finalizeTestFailure(uint256 foroId) external',
  'function registerKeeper() external payable',
  
  // View Functions
  'function getAgent(uint256 foroId) external view returns (tuple(uint256 foroId, address erc8004Address, uint256 erc8004AgentId, bytes32 contractHash, address creatorWallet, uint8 status, uint256 testCount, uint256 cumulativeScore, uint256 registrationTimestamp))',
  'function getTestJob(uint256 foroId) external view returns (tuple(uint256 foroId, uint256 agentId, address requester, uint256 testFee, address keeperAddress, uint256 keeperStake, bytes32 commitHash, uint256 commitTimestamp, uint256 revealTimestamp, uint8 status, uint256 contestationDeadline))',
  'function getAllTestJobs() external view returns (tuple(uint256 foroId, uint256 agentId, address requester, uint256 testFee, address keeperAddress, uint256 keeperStake, bytes32 commitHash, uint256 commitTimestamp, uint256 revealTimestamp, uint8 status, uint256 contestationDeadline)[] jobs)',
  'function getTestResult(uint256 foroId) external view returns (tuple(uint256 foroId, uint256 score, uint256 latencyScore, uint256 qualityScore, uint256 avgLatencyMs, uint256 rounds, bytes32 chatId, bytes teeProof, bool teeVerified, uint256 submissionTimestamp, bool finalized))',
  'function getKeeper(address keeper) external view returns (tuple(address keeperAddress, uint256 stakedAmount, uint256 jobsCompleted, uint256 jobsContested, uint256 contestationsWon, uint256 contestationsLost, uint256 totalEarned, bool active, uint256 registrationTimestamp))',
  'function getKeeperWeight(address keeper) external view returns (uint256 weight)',
  'function getLeaderboard(string calldata category) external view returns (uint256[] memory foroIds)',
];

const ERC8004_ABI = [
  'function getMetadata(uint256 agentId, string calldata key) external view returns (bytes memory)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function tokenURI(uint256 agentId) external view returns (string memory)',
  'function getAgentWallet(uint256 agentId) external view returns (address)',
];

const AGENT_VAULT_ABI = [
  // Events
  'event FeeDeposited(uint256 indexed foroId, address indexed requester, uint256 amount)',
  'event FeeDistributed(uint256 indexed foroId, address keeper, address creator, address protocol, uint256 keeperShare, uint256 creatorShare, uint256 protocolShare)',
  'event FeeRefunded(uint256 indexed foroId, address indexed requester, uint256 amount)',
  'event BountyDeposited(uint256 indexed bountyId, address indexed creator, uint256 amount)',
  'event BountyReleased(uint256 indexed bountyId, address indexed recipient, uint256 amount)',
  'event BountyReturned(uint256 indexed bountyId, address indexed creator, uint256 amount)',
  
  // Functions
  'function deposit(uint256 foroId, address requester) external payable',
  'function distributePass(uint256 foroId, address agentWallet, address keeper) external',
  'function distributeFail(uint256 foroId, address requester) external',
  'function depositBounty(uint256 bountyId) external payable',
  'function releaseBounty(uint256 bountyId, address recipient) external',
  'function returnBounty(uint256 bountyId, address creator) external',
  
  // View Functions
  'function escrowed(uint256 foroId) external view returns (uint256 amount)',
  'function bountyEscrowed(uint256 bountyId) external view returns (uint256 amount)',
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
