'use client';

import { useState, useCallback } from 'react';
import { useWalletClient, usePublicClient } from 'wagmi';
import { decodeEventLog, parseEther } from 'viem';
import { zgNewtonTestnet } from '@/lib/wagmi';
import { FORO_REGISTRY_ABI } from '@/contracts/abis/foroRegistry';
import { waitForReceipt } from '@/lib/utils/transactions';

export interface UseRequestTestOptions {
  foroId: bigint;
}

export interface UseRequestTestReturn {
  amount: string;
  setAmount: (v: string) => void;
  running: boolean;
  txHash: string | null;
  testJobId: bigint | null;
  error: string | null;
  handleRequestTest: () => Promise<void>;
  walletClient: ReturnType<typeof useWalletClient>['data'];
}

export function useRequestTest({ foroId }: UseRequestTestOptions): UseRequestTestReturn {
  const { data: walletClient } = useWalletClient({ chainId: zgNewtonTestnet.id });
  const publicClient = usePublicClient({ chainId: zgNewtonTestnet.id });

  const foroRegistryAddress =
    (process.env.NEXT_PUBLIC_FORO_REGISTRY_ADDRESS as `0x${string}`) ?? '0x';

  const [amount, setAmount] = useState('0.001');
  const [running, setRunning] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [testJobId, setTestJobId] = useState<bigint | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRequestTest = useCallback(async () => {
    if (!walletClient || !publicClient) return;
    setRunning(true);
    setError(null);

    try {
      const hash = await walletClient.writeContract({
        address: foroRegistryAddress,
        abi: FORO_REGISTRY_ABI,
        functionName: 'requestTest',
        args: [foroId],
        value: parseEther(amount),
      });
      const receipt = await waitForReceipt(publicClient, hash);
      setTxHash(hash);

      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: FORO_REGISTRY_ABI,
            eventName: 'TestRequested',
            data: log.data,
            topics: log.topics,
          });
          setTestJobId(decoded.args.foroId);
          break;
        } catch {
          // not a TestRequested log
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setRunning(false);
    }
  }, [walletClient, publicClient, foroId, amount, foroRegistryAddress]);

  return {
    amount,
    setAmount,
    running,
    txHash,
    testJobId,
    error,
    handleRequestTest,
    walletClient,
  };
}
