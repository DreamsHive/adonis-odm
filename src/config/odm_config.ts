/**
 * ODM Configuration Helper
 */

import type { OdmConfig, SeederConfig } from '../types/index.js'

/**
 * Define ODM configuration
 */
export function defineConfig(config: OdmConfig): OdmConfig {
  return config
}

/**
 * Get seeder configuration with defaults
 *
 * @param config - The ODM configuration object
 * @returns Seeder configuration with defaults applied
 */
export function getSeederConfig(config: OdmConfig): Required<SeederConfig> {
  const defaultSeederConfig: Required<SeederConfig> = {
    paths: ['./database/seeders'],
    defaultConnection: config.connection,
  }

  if (!config.seeders) {
    return defaultSeederConfig
  }

  return {
    paths:
      config.seeders.paths && config.seeders.paths.length > 0
        ? config.seeders.paths
        : defaultSeederConfig.paths,
    defaultConnection: config.seeders.defaultConnection || defaultSeederConfig.defaultConnection,
  }
}
