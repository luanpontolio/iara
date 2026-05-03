#!/usr/bin/env tsx
/**
 * Single Foro Keeper Script
 *
 * Executes the full keeper workflow for a single test job identified by foroId,
 * without starting the polling loop.
 *
 * Usage: tsx scripts/run-foro.ts <foroId>
 *
 * Example:
 *   tsx scripts/run-foro.ts 42
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
    console.error('Usage: tsx scripts/run-foro.ts <foroId>\n');
    console.error('Example:');
    console.error('  tsx scripts/run-foro.ts 42\n');
    process.exit(1);
  }

  let foroId: bigint;
  try {
    foroId = BigInt(args[0]);
  } catch {
    console.error(`Invalid foroId: "${args[0]}". Must be a non-negative integer.\n`);
    process.exit(1);
  }

  logger.info({ foroId: foroId.toString() }, 'Starting single-foro keeper run');

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
  logger.info('0G Compute broker created');

  const keeper = new KeeperService(config, contracts, zgBroker);

  await keeper.runSingleJob(foroId);

  logger.info({ foroId: foroId.toString() }, 'Single-foro keeper run complete');
}

main().catch((error: unknown) => {
  logger.error({ error }, 'Single-foro keeper run failed');
  process.exit(1);
});
