'use client';

import { useState, useCallback } from 'react';
import { useWalletClient, usePublicClient } from 'wagmi';
import { decodeEventLog, stringToHex } from 'viem';
import { zgNewtonTestnet } from '@/lib/wagmi';
import { ERC8004_ABI } from '@/contracts/abis/erc8004';
import { FORO_REGISTRY_ABI } from '@/contracts/abis/foroRegistry';
import { waitForReceipt } from '@/lib/utils/transactions';

export type TxStepStatus = 'idle' | 'pending' | 'done' | 'error';

export interface TxStep {
  label: string;
  status: TxStepStatus;
  txHash?: string;
}

const INITIAL_STEPS: TxStep[] = [
  { label: 'Mint ERC-8004 token', status: 'idle' },
  { label: 'Set contract metadata', status: 'idle' },
  { label: 'Set endpoint metadata', status: 'idle' },
  { label: 'Register on ForoRegistry', status: 'idle' },
];

export interface UseAgentRegisterOptions {
  onSuccess: (foroId: bigint) => void;
}

export interface UseAgentRegisterReturn {
  erc8004Address: string;
  setErc8004Address: (v: string) => void;
  endpointUrl: string;
  setEndpointUrl: (v: string) => void;
  contractJson: string;
  setContractJson: (v: string) => void;
  steps: TxStep[];
  running: boolean;
  error: string | null;
  anyTxStarted: boolean;
  handleRegister: () => Promise<void>;
  walletClient: ReturnType<typeof useWalletClient>['data'];
}

export function useAgentRegister({ onSuccess }: UseAgentRegisterOptions): UseAgentRegisterReturn {
  const { data: walletClient } = useWalletClient({ chainId: zgNewtonTestnet.id });
  const publicClient = usePublicClient({ chainId: zgNewtonTestnet.id });

  const defaultErc8004 = process.env.NEXT_PUBLIC_MOCK_ERC8004_ADDRESS ?? '';
  const foroRegistryAddress =
    (process.env.NEXT_PUBLIC_FORO_REGISTRY_ADDRESS as `0x${string}`) ?? '0x';

  const [erc8004Address, setErc8004Address] = useState(defaultErc8004);
  const [endpointUrl, setEndpointUrl] = useState('');
  const [contractJson, setContractJson] = useState('');
  const [steps, setSteps] = useState<TxStep[]>(INITIAL_STEPS);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setStepStatus = useCallback(
    (index: number, status: TxStepStatus, txHash?: string) => {
      setSteps(prev =>
        prev.map((s, i) => {
          if (i !== index) return s;
          const next: TxStep = { label: s.label, status };
          const resolvedHash = txHash ?? s.txHash;
          if (resolvedHash !== undefined) next.txHash = resolvedHash;
          return next;
        })
      );
    },
    []
  );

  const handleRegister = useCallback(async () => {
    if (!walletClient || !publicClient) return;
    setRunning(true);
    setError(null);
    setSteps(INITIAL_STEPS);

    const erc8004Addr = erc8004Address.trim() as `0x${string}`;
    const account = walletClient.account;

    const getNextNonce = () =>
      publicClient.getTransactionCount({ address: account.address, blockTag: 'pending' });

    try {
      setStepStatus(0, 'pending');
      const mintHash = await walletClient.writeContract({
        address: erc8004Addr,
        abi: ERC8004_ABI,
        functionName: 'register',
        args: [],
        nonce: await getNextNonce(),
      });
      const mintReceipt = await waitForReceipt(publicClient, mintHash);
      setStepStatus(0, 'done', mintHash);

      let agentId: bigint | undefined;
      for (const log of mintReceipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: ERC8004_ABI,
            eventName: 'Transfer',
            data: log.data,
            topics: log.topics,
          });
          agentId = decoded.args.tokenId;
          break;
        } catch {
          // not a Transfer log
        }
      }
      if (agentId === undefined) throw new Error('Could not parse token ID from mint receipt');

      setStepStatus(1, 'pending');
      const contractHash = await walletClient.writeContract({
        address: erc8004Addr,
        abi: ERC8004_ABI,
        functionName: 'setMetadata',
        args: [agentId, 'foro:contract', stringToHex(contractJson.trim())],
        nonce: await getNextNonce(),
      });
      await waitForReceipt(publicClient, contractHash);
      setStepStatus(1, 'done', contractHash);

      setStepStatus(2, 'pending');
      const endpointHash = await walletClient.writeContract({
        address: erc8004Addr,
        abi: ERC8004_ABI,
        functionName: 'setMetadata',
        args: [agentId, 'foro:endpoint', stringToHex(endpointUrl.trim())],
        nonce: await getNextNonce(),
      });
      await waitForReceipt(publicClient, endpointHash);
      setStepStatus(2, 'done', endpointHash);

      setStepStatus(3, 'pending');
      const registerHash = await walletClient.writeContract({
        address: foroRegistryAddress,
        abi: FORO_REGISTRY_ABI,
        functionName: 'registerAgent',
        args: [erc8004Addr, agentId],
        nonce: await getNextNonce(),
      });
      const registerReceipt = await waitForReceipt(publicClient, registerHash);
      setStepStatus(3, 'done', registerHash);

      let foroId: bigint | undefined;
      for (const log of registerReceipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: FORO_REGISTRY_ABI,
            eventName: 'AgentRegistered',
            data: log.data,
            topics: log.topics,
          });
          foroId = decoded.args.foroId;
          break;
        } catch {
          // not an AgentRegistered log
        }
      }
      if (foroId === undefined) throw new Error('Could not parse foroId from registration receipt');

      onSuccess(foroId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setSteps(prev =>
        prev.map(s => {
          if (s.status !== 'pending') return s;
          const next: TxStep = { label: s.label, status: 'error' };
          if (s.txHash !== undefined) next.txHash = s.txHash;
          return next;
        })
      );
    } finally {
      setRunning(false);
    }
  }, [
    walletClient,
    publicClient,
    erc8004Address,
    endpointUrl,
    contractJson,
    foroRegistryAddress,
    setStepStatus,
    onSuccess,
  ]);

  return {
    erc8004Address,
    setErc8004Address,
    endpointUrl,
    setEndpointUrl,
    contractJson,
    setContractJson,
    steps,
    running,
    error,
    anyTxStarted: steps.some(s => s.status !== 'idle'),
    handleRegister,
    walletClient,
  };
}
