import { createConfig, http, injected, cookieStorage, createStorage } from 'wagmi';
import { defineChain } from 'viem';

export const zgNewtonTestnet = defineChain({
  id: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 16602),
  name: process.env.NEXT_PUBLIC_CHAIN_NAME ?? '0G Newton Testnet',
  nativeCurrency: { name: 'A0GI', symbol: 'A0GI', decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_RPC_URL ?? 'https://evmrpc-testnet.0g.ai'],
    },
  },
  blockExplorers: {
    default: {
      name: '0G Explorer',
      url: process.env.NEXT_PUBLIC_CHAIN_EXPLORER ?? 'https://explorer.0g.ai/testnet/blockchain',
    },
  },
  testnet: true,
});

export const wagmiConfig = createConfig({
  chains: [zgNewtonTestnet],
  connectors: [injected()],
  transports: {
    [zgNewtonTestnet.id]: http(),
  },
  ssr: true,
  storage: createStorage({ storage: cookieStorage }),
});
