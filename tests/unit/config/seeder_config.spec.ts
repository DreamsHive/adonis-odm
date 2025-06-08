import { test } from 'node:test'
import assert from 'node:assert'
import { defineConfig, getSeederConfig } from '../../../src/config/odm_config.js'
import type { OdmConfig, SeederConfig } from '../../../src/types/index.js'

test('Seeder Configuration - defineConfig Integration', async (t) => {
  await t.test('should support seeder configuration in defineConfig', () => {
    const config = defineConfig({
      connection: 'mongodb',
      connections: {
        mongodb: {
          client: 'mongodb',
          connection: {
            url: 'mongodb://localhost:27017/test',
          },
        },
      },
      seeders: {
        paths: ['./database/seeders', './custom/seeders'],
        defaultConnection: 'mongodb',
      },
    })

    assert.ok(config.seeders, 'Seeders configuration should be present')
    assert.deepEqual(
      config.seeders.paths,
      ['./database/seeders', './custom/seeders'],
      'Paths should be preserved'
    )
    assert.strictEqual(
      config.seeders.defaultConnection,
      'mongodb',
      'Default connection should be preserved'
    )
  })

  await t.test('should work without seeder configuration', () => {
    const config = defineConfig({
      connection: 'mongodb',
      connections: {
        mongodb: {
          client: 'mongodb',
          connection: {
            url: 'mongodb://localhost:27017/test',
          },
        },
      },
    })

    // Should not throw an error
    assert.ok(config, 'Config should be created without seeders configuration')
    assert.strictEqual(config.seeders, undefined, 'Seeders should be undefined when not provided')
  })

  await t.test('should support partial seeder configuration', () => {
    const config = defineConfig({
      connection: 'mongodb',
      connections: {
        mongodb: {
          client: 'mongodb',
          connection: {
            url: 'mongodb://localhost:27017/test',
          },
        },
      },
      seeders: {
        paths: ['./custom/seeders'],
        // defaultConnection not specified
      },
    })

    assert.ok(config.seeders, 'Seeders configuration should be present')
    assert.deepEqual(config.seeders.paths, ['./custom/seeders'])
    assert.strictEqual(config.seeders.defaultConnection, undefined)
  })
})

test('Seeder Configuration - getSeederConfig Function', async (t) => {
  await t.test('should return default configuration when seeders not specified', () => {
    const odmConfig: OdmConfig = {
      connection: 'mongodb',
      connections: {
        mongodb: {
          client: 'mongodb',
          connection: {
            url: 'mongodb://localhost:27017/test',
          },
        },
      },
    }

    const seederConfig = getSeederConfig(odmConfig)

    assert.ok(seederConfig, 'Seeder config should be returned')
    assert.ok(Array.isArray(seederConfig.paths), 'Paths should be an array')
    assert.ok(seederConfig.paths.length > 0, 'Should have default paths')
    assert.strictEqual(
      seederConfig.defaultConnection,
      'mongodb',
      'Should use main connection as default'
    )
  })

  await t.test('should merge provided configuration with defaults', () => {
    const odmConfig: OdmConfig = {
      connection: 'mongodb',
      connections: {
        mongodb: {
          client: 'mongodb',
          connection: {
            url: 'mongodb://localhost:27017/test',
          },
        },
      },
      seeders: {
        paths: ['./custom/seeders'],
        defaultConnection: 'custom',
      },
    }

    const seederConfig = getSeederConfig(odmConfig)

    assert.deepEqual(seederConfig.paths, ['./custom/seeders'])
    assert.strictEqual(seederConfig.defaultConnection, 'custom')
  })

  await t.test('should handle empty paths array', () => {
    const odmConfig: OdmConfig = {
      connection: 'mongodb',
      connections: {
        mongodb: {
          client: 'mongodb',
          connection: {
            url: 'mongodb://localhost:27017/test',
          },
        },
      },
      seeders: {
        paths: [],
        defaultConnection: 'mongodb',
      },
    }

    const seederConfig = getSeederConfig(odmConfig)

    // Should fall back to default paths when empty array provided
    assert.ok(seederConfig.paths.length > 0, 'Should have default paths when empty array provided')
    assert.strictEqual(seederConfig.defaultConnection, 'mongodb')
  })

  await t.test('should handle multiple connection configurations', () => {
    const odmConfig: OdmConfig = {
      connection: 'primary',
      connections: {
        primary: {
          client: 'mongodb',
          connection: {
            url: 'mongodb://localhost:27017/primary',
          },
        },
        secondary: {
          client: 'mongodb',
          connection: {
            url: 'mongodb://localhost:27017/secondary',
          },
        },
      },
      seeders: {
        paths: ['./database/seeders'],
        defaultConnection: 'secondary',
      },
    }

    const seederConfig = getSeederConfig(odmConfig)

    assert.deepEqual(seederConfig.paths, ['./database/seeders'])
    assert.strictEqual(seederConfig.defaultConnection, 'secondary')
  })
})

test('Seeder Configuration - Validation and Edge Cases', async (t) => {
  await t.test('should handle null/undefined seeder configuration gracefully', () => {
    const odmConfig: OdmConfig = {
      connection: 'mongodb',
      connections: {
        mongodb: {
          client: 'mongodb',
          connection: {
            url: 'mongodb://localhost:27017/test',
          },
        },
      },
      seeders: null as any,
    }

    const seederConfig = getSeederConfig(odmConfig)

    assert.ok(seederConfig, 'Should return valid config even with null seeders')
    assert.ok(seederConfig.paths.length > 0, 'Should have default paths')
    assert.ok(seederConfig.defaultConnection, 'Should have default connection')
  })

  await t.test('should validate required properties exist', () => {
    const seederConfig: Required<SeederConfig> = {
      paths: ['./database/seeders'],
      defaultConnection: 'mongodb',
    }

    assert.ok(Array.isArray(seederConfig.paths), 'Paths should be an array')
    assert.ok(
      typeof seederConfig.defaultConnection === 'string',
      'Default connection should be a string'
    )
  })

  await t.test('should handle complex path configurations', () => {
    const odmConfig: OdmConfig = {
      connection: 'mongodb',
      connections: {
        mongodb: {
          client: 'mongodb',
          connection: {
            url: 'mongodb://localhost:27017/test',
          },
        },
      },
      seeders: {
        paths: [
          './database/seeders',
          './modules/user/seeders',
          './modules/admin/seeders',
          '../shared/seeders',
        ],
        defaultConnection: 'mongodb',
      },
    }

    const seederConfig = getSeederConfig(odmConfig)

    assert.strictEqual(seederConfig.paths.length, 4)
    assert.ok(seederConfig.paths.includes('./database/seeders'))
    assert.ok(seederConfig.paths.includes('./modules/user/seeders'))
    assert.ok(seederConfig.paths.includes('./modules/admin/seeders'))
    assert.ok(seederConfig.paths.includes('../shared/seeders'))
  })

  await t.test('should preserve path order', () => {
    const paths = [
      './database/seeders/core',
      './database/seeders/modules',
      './database/seeders/admin',
    ]

    const odmConfig: OdmConfig = {
      connection: 'mongodb',
      connections: {
        mongodb: {
          client: 'mongodb',
          connection: {
            url: 'mongodb://localhost:27017/test',
          },
        },
      },
      seeders: {
        paths,
        defaultConnection: 'mongodb',
      },
    }

    const seederConfig = getSeederConfig(odmConfig)

    assert.deepEqual(seederConfig.paths, paths, 'Path order should be preserved')
  })
})

test('Seeder Configuration - Type Safety', async (t) => {
  await t.test('should enforce correct types for seeder configuration', () => {
    // This test verifies TypeScript type safety at runtime
    const validConfig: SeederConfig = {
      paths: ['./database/seeders'],
      defaultConnection: 'mongodb',
    }

    assert.ok(Array.isArray(validConfig.paths))
    assert.ok(typeof validConfig.defaultConnection === 'string')
  })

  await t.test('should handle optional properties correctly', () => {
    // Test with minimal configuration
    const minimalConfig: SeederConfig = {
      paths: ['./seeders'],
    }

    assert.ok(Array.isArray(minimalConfig.paths))
    assert.strictEqual(minimalConfig.defaultConnection, undefined)

    // Test with full configuration
    const fullConfig: SeederConfig = {
      paths: ['./database/seeders', './modules/seeders'],
      defaultConnection: 'primary',
    }

    assert.ok(Array.isArray(fullConfig.paths))
    assert.strictEqual(fullConfig.defaultConnection, 'primary')
  })

  await t.test('should work with Required<SeederConfig> type', () => {
    const odmConfig: OdmConfig = {
      connection: 'mongodb',
      connections: {
        mongodb: {
          client: 'mongodb',
          connection: {
            url: 'mongodb://localhost:27017/test',
          },
        },
      },
    }

    const seederConfig: Required<SeederConfig> = getSeederConfig(odmConfig)

    // Required type should ensure all properties are present
    assert.ok(seederConfig.paths)
    assert.ok(seederConfig.defaultConnection)
    assert.ok(typeof seederConfig.defaultConnection === 'string')
    assert.ok(Array.isArray(seederConfig.paths))
  })
})

test('Seeder Configuration - Integration with ODM Config', async (t) => {
  await t.test('should integrate seamlessly with ODM configuration', () => {
    const fullOdmConfig = defineConfig({
      connection: 'mongodb',
      connections: {
        mongodb: {
          client: 'mongodb',
          connection: {
            url: 'mongodb://localhost:27017/app',
            options: {
              useNewUrlParser: true,
              useUnifiedTopology: true,
            },
          },
        },
        tenant: {
          client: 'mongodb',
          connection: {
            url: 'mongodb://localhost:27017/tenant',
          },
        },
      },
      seeders: {
        paths: ['./database/seeders', './tenant/seeders'],
        defaultConnection: 'tenant',
      },
    })

    const seederConfig = getSeederConfig(fullOdmConfig)

    assert.deepEqual(seederConfig.paths, ['./database/seeders', './tenant/seeders'])
    assert.strictEqual(seederConfig.defaultConnection, 'tenant')
  })

  await t.test('should work with minimal ODM configuration', () => {
    const minimalOdmConfig: OdmConfig = {
      connection: 'mongodb',
      connections: {
        mongodb: {
          client: 'mongodb',
          connection: {
            url: 'mongodb://localhost:27017/simple',
          },
        },
      },
    }

    const seederConfig = getSeederConfig(minimalOdmConfig)

    assert.ok(seederConfig.paths.length > 0)
    assert.strictEqual(seederConfig.defaultConnection, 'mongodb')
  })
})
