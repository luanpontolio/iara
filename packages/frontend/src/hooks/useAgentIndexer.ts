'use client';

/**
 * useAgentIndexer
 *
 * A frontend-only indexer that continuously polls for AgentRegistered events
 * from ForoRegistry using paginated getLogs (2000-block chunks) to stay within
 * RPC node limits.
 *
 * On each poll tick it:
 *   1. Fetches logs from lastBlock+1 → latest in 2000-block pages
 *   2. For each new foroId, calls ERC-8004 getMetadata('foro:contract') to
 *      resolve the agent name from its on-chain JSON
 *   3. Appends newly discovered agents to state
 *
 * The hook is designed to be consumed by useAgentList as the dynamic source of
 * { foroId, name } pairs, replacing the static REGISTERED_AGENTS constant.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { hexToString } from 'viem';
import { usePublicClient } from 'wagmi';
import { ERC8004_ABI } from '@/contracts/abis/erc8004';
import { FORO_REGISTRY_ABI } from '@/contracts/abis/foroRegistry';
import { zgNewtonTestnet } from '@/lib/wagmi';

const FORO_REGISTRY_ADDRESS = (
  process.env.NEXT_PUBLIC_FORO_REGISTRY_ADDRESS ?? '0x'
) as `0x${string}`;

// Statically-indexed so TypeScript preserves the literal ABI entry type,
// which lets viem infer typed `args` on the resulting logs.
const AGENT_REGISTERED_EVENT = FORO_REGISTRY_ABI[3];

// Safe chunk size that stays within most RPC node log-query limits.
const CHUNK_SIZE = 2000n;

// How often to poll for new blocks (ms). Matches 0G Newton ~12 s block time.
const POLL_INTERVAL = 12_000;

// Starting block — seeded at the ForoRegistry deploy block so the first scan
// only covers blocks from deployment onwards.
const DEPLOY_BLOCK = 31011609n;

export interface IndexedAgent {
  foroId: bigint;
  name: string;
}

export interface UseAgentIndexerReturn {
  agents: IndexedAgent[];
  isIndexing: boolean;
}

export function useAgentIndexer(): UseAgentIndexerReturn {
  const publicClient = usePublicClient({ chainId: zgNewtonTestnet.id });

  const [agents, setAgents] = useState<IndexedAgent[]>([]);
  const [isIndexing, setIsIndexing] = useState(false);

  // Use a ref so the interval callback always sees the latest value without
  // needing to be re-created (avoids stale-closure and unnecessary re-renders).
  const lastBlockRef = useRef<bigint>(DEPLOY_BLOCK);
  // Mirror of agents in a ref for dedup checks inside the async callback.
  const agentsRef = useRef<IndexedAgent[]>([]);
  // Prevents two concurrent ticks from running simultaneously, which would
  // cause each to build knownIds from the same snapshot and add duplicates.
  const isRunningRef = useRef(false);
  // After the first complete scan we no longer show the loading indicator so
  // subsequent background polls don't cause a visible flicker in the UI.
  const initialLoadDoneRef = useRef(false);

  const runTick = useCallback(async () => {
    if (!publicClient || isRunningRef.current) return;
    isRunningRef.current = true;

    let latest: bigint;
    try {
      latest = await publicClient.getBlockNumber();
    } catch {
      isRunningRef.current = false;
      return;
    }

    if (latest <= lastBlockRef.current) {
      isRunningRef.current = false;
      return;
    }

    // Only show the loading indicator on the very first scan so background
    // polling ticks don't cause the UI to flicker every 12 seconds.
    if (!initialLoadDoneRef.current) {
      setIsIndexing(true);
    }

    const knownIds = new Set(agentsRef.current.map(a => a.foroId));
    const newAgents: IndexedAgent[] = [];

    try {
      for (
        let from = lastBlockRef.current + 1n;
        from <= latest;
        from += CHUNK_SIZE
      ) {
        const toBlock =
          from + CHUNK_SIZE - 1n < latest ? from + CHUNK_SIZE - 1n : latest;

        let logs: Awaited<ReturnType<typeof publicClient.getLogs>>;
        try {
          logs = await publicClient.getLogs({
            address: FORO_REGISTRY_ADDRESS,
            event: AGENT_REGISTERED_EVENT,
            fromBlock: from,
            toBlock,
          });
        } catch {
          // If a chunk fails (e.g. rate limit), skip it and move on — the next
          // tick will retry from the same lastBlock since we only advance it
          // after a fully successful scan.
          continue;
        }

        for (const log of logs) {
          const args = (log as { args: unknown }).args as {
            foroId?: bigint;
            erc8004Address?: `0x${string}`;
            erc8004AgentId?: bigint;
          };

          if (
            args.foroId === undefined ||
            args.erc8004Address === undefined ||
            args.erc8004AgentId === undefined
          ) {
            continue;
          }

          if (knownIds.has(args.foroId)) continue;
          knownIds.add(args.foroId);

          let name = `agent_${args.foroId}`;
          try {
            const rawBytes = await publicClient.readContract({
              address: args.erc8004Address,
              abi: ERC8004_ABI,
              functionName: 'getMetadata',
              args: [args.erc8004AgentId, 'foro:contract'],
            });
            const json = JSON.parse(
              hexToString(rawBytes),
            ) as { name?: string };
            if (json.name) name = json.name;
          } catch {
            // Metadata fetch failed — keep the fallback name.
          }

          newAgents.push({ foroId: args.foroId, name });
        }
      }

      // Only advance the cursor after a complete scan so a partial failure
      // causes a full retry on the next tick.
      lastBlockRef.current = latest;
      initialLoadDoneRef.current = true;

      if (newAgents.length > 0) {
        agentsRef.current = [...agentsRef.current, ...newAgents];
        setAgents(agentsRef.current);
      }
    } finally {
      isRunningRef.current = false;
      // After the first tick this is already false — React bails out of
      // same-value state updates so this causes no extra re-render.
      setIsIndexing(false);
    }
  }, [publicClient]);

  useEffect(() => {
    // Run immediately on mount, then on each interval.
    void runTick();
    const id = setInterval(() => void runTick(), POLL_INTERVAL);
    return () => clearInterval(id);
  }, [runTick]);

  return { agents, isIndexing };
}
