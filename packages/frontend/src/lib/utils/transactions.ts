import type { PublicClient } from 'viem';

/**
 * The 0G testnet RPC is load-balanced: different nodes may not have indexed a
 * transaction yet, so `eth_getTransactionReceipt` returns null even after the
 * tx is on-chain. viem's built-in `waitForTransactionReceipt` treats a null
 * response as "not found" and eventually times out.
 *
 * This helper polls `getTransactionReceipt` directly, treating null as "not
 * ready yet" (rather than an error) and retrying until the receipt appears or
 * the attempt limit is reached.
 */
export async function waitForReceipt(publicClient: PublicClient, hash: `0x${string}`) {
  const MAX_ATTEMPTS = 60;
  const INTERVAL_MS = 3_000;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const receipt = await publicClient.getTransactionReceipt({ hash });
      if (receipt) return receipt;
    } catch {
      // Node returned an error — likely hasn't indexed the tx yet; keep polling.
    }
    await new Promise(resolve => setTimeout(resolve, INTERVAL_MS));
  }

  throw new Error(
    `Transaction receipt for ${hash} not found after ${MAX_ATTEMPTS} attempts (${(MAX_ATTEMPTS * INTERVAL_MS) / 1000}s).`,
  );
}
