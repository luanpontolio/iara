export const FORO_REGISTRY_ABI = [
  {
    name: 'registerAgent',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'erc8004Address', type: 'address' },
      { name: 'erc8004AgentId', type: 'uint256' },
    ],
    outputs: [{ name: 'foroId', type: 'uint256' }],
  },
  {
    name: 'requestTest',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [{ name: 'foroId', type: 'uint256' }],
  },
  {
    name: 'AgentRegistered',
    type: 'event',
    inputs: [
      { name: 'foroId', type: 'uint256', indexed: true },
      { name: 'erc8004Address', type: 'address', indexed: true },
      { name: 'erc8004AgentId', type: 'uint256', indexed: false },
      { name: 'contractHash', type: 'bytes32', indexed: false },
      { name: 'creatorWallet', type: 'address', indexed: false },
    ],
  },
  {
    name: 'TestRequested',
    type: 'event',
    inputs: [
      { name: 'foroId', type: 'uint256', indexed: true },
      { name: 'agentId', type: 'uint256', indexed: true },
      { name: 'requester', type: 'address', indexed: false },
      { name: 'fee', type: 'uint256', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
] as const;
