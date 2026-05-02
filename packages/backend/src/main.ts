/**
 * Keeper Service Entry Point
 */

import { loadConfig } from './config.js';
import { createContracts } from './utils/contracts.js';
import { createZGComputeBroker } from './utils/0g-compute.js';
import { KeeperService } from './keeper/index.js';
import logger from './utils/logger.js';

async function main() {
  try {
    logger.info('Starting Keeper service...');

    // Load configuration
    const config = loadConfig();
    if (!config) {
      logger.error('Configuration not loaded');
      process.exit(1);
    }

    logger.info('Configuration loaded');

    // Initialize contracts
    const contracts = await createContracts(config);
    logger.info('Contracts initialized');

    // Initialize 0G Compute broker (simplified - no initialization needed)
    const zgBroker = createZGComputeBroker({
      endpoint: config.zgComputeEndpoint || '',
      authToken: config.zgComputeAuthToken || '',
      model: config.zgComputeModel,
      enabled: config.zgComputeEnabled,
    });
    logger.info('0G Compute broker created');

    // Start keeper service
    logger.info('Starting keeper service...', { config });
    const keeper = new KeeperService(config, contracts, zgBroker);
    keeper.start();
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      keeper.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      keeper.stop();
      process.exit(0);
    });

  } catch (error) {
    logger.fatal({ error }, 'Failed to start Keeper service');
    process.exit(1);
  }
}

main().catch((_error: unknown) => {
  logger.error('Failed to start Keeper service');
  process.exit(1);
});
