#!/usr/bin/env tsx
/**
 * Finalize Foro Result Script
 *
 * Calls finalizeResult on the ForoRegistry contract for a given foroId.
 * Use this after the contestation window has passed.
 *
 * Usage: tsx scripts/finalize-foro.ts <foroId>
 *
 * Example:
 *   tsx scripts/finalize-foro.ts 42
 */

import { loadConfig } from '../src/config.js';
import { createContracts } from '../src/utils/contracts.js';
import { createZGComputeBroker } from '../src/utils/0g-compute.js';
import { KeeperService } from '../src/keeper/index.js';
import logger from '../src/utils/logger.js';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || !args[0]) {
    console.error('Missing required argument: foroId\n');
    console.error('Usage: tsx scripts/finalize-foro.ts <foroId>\n');
    console.error('Example:');
    console.error('  tsx scripts/finalize-foro.ts 42\n');
    process.exit(1);
  }

  let foroId: bigint;
  try {
    foroId = BigInt(args[0]);
  } catch {
    console.error(`Invalid foroId: "${args[0]}". Must be a non-negative integer.\n`);
    process.exit(1);
  }

  logger.info({ foroId: foroId.toString() }, 'Starting finalize-foro run');

  const config = loadConfig();
  if (!config) {
    logger.error('Configuration not loaded');
    process.exit(1);
  }

  const contracts = await createContracts(config);
  logger.info('Contracts initialized');

  const zgBroker = createZGComputeBroker({
    endpoint: config.zgComputeEndpoint || '',
    authToken: config.zgComputeAuthToken || '',
    model: config.zgComputeModel,
    enabled: config.zgComputeEnabled,
  });

  const keeper = new KeeperService(config, contracts, zgBroker);

  await keeper.finalizeJob(foroId);

  logger.info({ foroId: foroId.toString() }, 'Finalize-foro run complete');
}

main().catch((error: unknown) => {
  logger.error({ error }, 'Finalize-foro run failed');
  process.exit(1);
});
