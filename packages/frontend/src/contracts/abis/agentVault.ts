export const AGENT_VAULT_ABI = [
  {
    name: 'escrowed',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'foroId', type: 'uint256' }],
    outputs: [{ name: 'amount', type: 'uint256' }],
  },
] as const;
