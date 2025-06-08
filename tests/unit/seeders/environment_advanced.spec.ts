import { test } from 'node:test'
import assert from 'node:assert'
import { BaseSeeder } from '../../../src/seeders/base_seeder.js'
import { SeederManager } from '../../../src/seeders/seeder_manager.js'
import type { MongoDatabaseManager } from '../../../src/database_manager.js'
import type { OdmConfig } from '../../../src/types/index.js'

// Mock database manager
const createMockDatabaseManager = (): MongoDatabaseManager => {
  return {
    db: () => ({
      collection: () => ({
        insertOne: async () => ({ insertedId: 'mock-id' }),
        insertMany: async () => ({ insertedIds: ['id1', 'id2'] }),
        find: () => ({ toArray: async () => [] }),
        updateOne: async () => ({ modifiedCount: 1 }),
        deleteOne: async () => ({ deletedCount: 1 }),
      }),
    }),
    collection: <T>(name: string, connectionName?: string) => ({
      insertOne: async () => ({ insertedId: 'mock-id' }),
      insertMany: async () => ({ insertedIds: ['id1', 'id2'] }),
      find: () => ({ toArray: async () => [] }),
      updateOne: async () => ({ modifiedCount: 1 }),
      deleteOne: async () => ({ deletedCount: 1 }),
    }),
    connect: async () => {},
    close: async () => {},
    connection: () => ({}) as any,
    hasConnection: () => true,
    getConnectionNames: () => ['mongodb'],
    getConnectionConfig: () => ({}) as any,
    transaction: async () => ({}) as any,
  } as any
}

// Test seeder classes for advanced environment scenarios
class MultiEnvironmentSeeder extends BaseSeeder {
  static environment = ['development', 'staging', 'production']

  async run(): Promise<void> {
    // Mock implementation
  }
}

class ProductionOnlySeeder extends BaseSeeder {
  static environment = ['production']

  async run(): Promise<void> {
    // Mock implementation
  }
}

class TestingOnlySeeder extends BaseSeeder {
  static environment = ['testing']

  async run(): Promise<void> {
    // Mock implementation
  }
}

class NoEnvironmentSeeder extends BaseSeeder {
  // No environment restriction

  async run(): Promise<void> {
    // Mock implementation
  }
}

class EmptyEnvironmentSeeder extends BaseSeeder {
  static environment: string[] = []

  async run(): Promise<void> {
    // Mock implementation
  }
}

class CustomEnvironmentSeeder extends BaseSeeder {
  static environment = ['custom-env', 'special-env']

  async run(): Promise<void> {
    // Mock implementation
  }
}

test('Advanced Environment Scenarios', async (t) => {
  await t.test('should handle multiple environment restrictions correctly', () => {
    // Test all allowed environments
    assert.strictEqual(MultiEnvironmentSeeder.shouldRun('development'), true)
    assert.strictEqual(MultiEnvironmentSeeder.shouldRun('staging'), true)
    assert.strictEqual(MultiEnvironmentSeeder.shouldRun('production'), true)

    // Test disallowed environments
    assert.strictEqual(MultiEnvironmentSeeder.shouldRun('testing'), false)
    assert.strictEqual(MultiEnvironmentSeeder.shouldRun('custom'), false)
  })

  await t.test('should handle single environment restriction', () => {
    assert.strictEqual(ProductionOnlySeeder.shouldRun('production'), true)
    assert.strictEqual(ProductionOnlySeeder.shouldRun('development'), false)
    assert.strictEqual(ProductionOnlySeeder.shouldRun('staging'), false)
    assert.strictEqual(ProductionOnlySeeder.shouldRun('testing'), false)
  })

  await t.test('should handle no environment restriction (universal)', () => {
    // Should run in all environments
    assert.strictEqual(NoEnvironmentSeeder.shouldRun('development'), true)
    assert.strictEqual(NoEnvironmentSeeder.shouldRun('testing'), true)
    assert.strictEqual(NoEnvironmentSeeder.shouldRun('staging'), true)
    assert.strictEqual(NoEnvironmentSeeder.shouldRun('production'), true)
    assert.strictEqual(NoEnvironmentSeeder.shouldRun('custom'), true)
    assert.strictEqual(NoEnvironmentSeeder.shouldRun(''), true)
  })

  await t.test('should handle empty environment array as universal', () => {
    // Empty array should mean run in all environments
    assert.strictEqual(EmptyEnvironmentSeeder.shouldRun('development'), true)
    assert.strictEqual(EmptyEnvironmentSeeder.shouldRun('testing'), true)
    assert.strictEqual(EmptyEnvironmentSeeder.shouldRun('production'), true)
    assert.strictEqual(EmptyEnvironmentSeeder.shouldRun('custom'), true)
  })

  await t.test('should handle custom environment names', () => {
    assert.strictEqual(CustomEnvironmentSeeder.shouldRun('custom-env'), true)
    assert.strictEqual(CustomEnvironmentSeeder.shouldRun('special-env'), true)
    assert.strictEqual(CustomEnvironmentSeeder.shouldRun('development'), false)
    assert.strictEqual(CustomEnvironmentSeeder.shouldRun('production'), false)
  })

  await t.test('should be case sensitive for environment names', () => {
    assert.strictEqual(ProductionOnlySeeder.shouldRun('Production'), false)
    assert.strictEqual(ProductionOnlySeeder.shouldRun('PRODUCTION'), false)
    assert.strictEqual(ProductionOnlySeeder.shouldRun('production'), true)
  })

  await t.test('should handle undefined and null environment values', () => {
    assert.strictEqual(ProductionOnlySeeder.shouldRun(undefined as any), false)
    assert.strictEqual(ProductionOnlySeeder.shouldRun(null as any), false)
    assert.strictEqual(ProductionOnlySeeder.shouldRun(''), false)
  })
})

test('SeederManager Environment Integration', async (t) => {
  const mockConfig: OdmConfig = {
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
      paths: ['./test/seeders'],
      defaultConnection: 'mongodb',
    },
  }

  await t.test('should respect environment restrictions in SeederManager', async () => {
    const client = createMockDatabaseManager()
    const manager = new SeederManager(mockConfig, client)

    // Mock the loadSeeder method to return our test seeder
    const originalLoadSeeder = manager['loadSeeder'].bind(manager)
    manager['loadSeeder'] = async () => ProductionOnlySeeder

    // Test with production environment
    const productionResult = await manager.runFile('./test_seeder.ts', 'mongodb', 'production')
    assert.strictEqual(productionResult.executed, true)
    assert.strictEqual(productionResult.skipReason, undefined)

    // Test with development environment
    const developmentResult = await manager.runFile('./test_seeder.ts', 'mongodb', 'development')
    assert.strictEqual(developmentResult.executed, false)
    assert.ok(developmentResult.skipReason?.includes('Environment restriction'))
    assert.ok(developmentResult.skipReason?.includes('production'))
    assert.ok(developmentResult.skipReason?.includes('development'))
  })

  await t.test('should use default environment when not specified', async () => {
    const client = createMockDatabaseManager()
    const manager = new SeederManager(mockConfig, client)

    // Mock the loadSeeder method
    manager['loadSeeder'] = async () => NoEnvironmentSeeder

    // Test without specifying environment (should default to NODE_ENV or 'development')
    const originalNodeEnv = process.env.NODE_ENV
    delete process.env.NODE_ENV

    const result = await manager.runFile('./test_seeder.ts', 'mongodb')
    assert.strictEqual(result.executed, true)

    // Restore NODE_ENV
    if (originalNodeEnv) {
      process.env.NODE_ENV = originalNodeEnv
    }
  })

  await t.test('should use NODE_ENV when environment not specified', async () => {
    const client = createMockDatabaseManager()
    const manager = new SeederManager(mockConfig, client)

    // Mock the loadSeeder method
    manager['loadSeeder'] = async () => TestingOnlySeeder

    // Set NODE_ENV to testing
    const originalNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'testing'

    const result = await manager.runFile('./test_seeder.ts', 'mongodb')
    assert.strictEqual(result.executed, true)

    // Test with different NODE_ENV
    process.env.NODE_ENV = 'production'
    const result2 = await manager.runFile('./test_seeder.ts', 'mongodb')
    assert.strictEqual(result2.executed, false)

    // Restore NODE_ENV
    if (originalNodeEnv) {
      process.env.NODE_ENV = originalNodeEnv
    } else {
      delete process.env.NODE_ENV
    }
  })

  await t.test('should handle environment parameter override', async () => {
    const client = createMockDatabaseManager()
    const manager = new SeederManager(mockConfig, client)

    // Mock the loadSeeder method
    manager['loadSeeder'] = async () => ProductionOnlySeeder

    // Set NODE_ENV to development but override with production parameter
    const originalNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    const result = await manager.runFile('./test_seeder.ts', 'mongodb', 'production')
    assert.strictEqual(result.executed, true)

    // Restore NODE_ENV
    if (originalNodeEnv) {
      process.env.NODE_ENV = originalNodeEnv
    } else {
      delete process.env.NODE_ENV
    }
  })
})

test('Environment Error Handling', async (t) => {
  await t.test('should provide clear skip reasons for environment restrictions', async () => {
    const mockConfig: OdmConfig = {
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

    const client = createMockDatabaseManager()
    const manager = new SeederManager(mockConfig, client)

    // Mock the loadSeeder method
    manager['loadSeeder'] = async () => MultiEnvironmentSeeder

    const result = await manager.runFile('./test_seeder.ts', 'mongodb', 'testing')

    assert.strictEqual(result.executed, false)
    assert.ok(result.skipReason)
    assert.ok(result.skipReason.includes('Environment restriction'))
    assert.ok(result.skipReason.includes('development, staging, production'))
    assert.ok(result.skipReason.includes('current: testing'))
  })

  await t.test('should handle seeders with undefined environment gracefully', () => {
    class UndefinedEnvironmentSeeder extends BaseSeeder {
      static environment = undefined

      async run(): Promise<void> {
        // Mock implementation
      }
    }

    // Should run in all environments when environment is undefined
    assert.strictEqual(UndefinedEnvironmentSeeder.shouldRun('development'), true)
    assert.strictEqual(UndefinedEnvironmentSeeder.shouldRun('production'), true)
    assert.strictEqual(UndefinedEnvironmentSeeder.shouldRun('testing'), true)
  })

  await t.test('should handle seeders with null environment gracefully', () => {
    class NullEnvironmentSeeder extends BaseSeeder {
      static environment = null as any

      async run(): Promise<void> {
        // Mock implementation
      }
    }

    // Should run in all environments when environment is null
    assert.strictEqual(NullEnvironmentSeeder.shouldRun('development'), true)
    assert.strictEqual(NullEnvironmentSeeder.shouldRun('production'), true)
    assert.strictEqual(NullEnvironmentSeeder.shouldRun('testing'), true)
  })
})

test('Environment Validation Edge Cases', async (t) => {
  await t.test('should handle whitespace in environment names', () => {
    class WhitespaceEnvironmentSeeder extends BaseSeeder {
      static environment = [' production ', 'development']

      async run(): Promise<void> {
        // Mock implementation
      }
    }

    // Should not match due to whitespace
    assert.strictEqual(WhitespaceEnvironmentSeeder.shouldRun('production'), false)
    assert.strictEqual(WhitespaceEnvironmentSeeder.shouldRun(' production '), true)
    assert.strictEqual(WhitespaceEnvironmentSeeder.shouldRun('development'), true)
  })

  await t.test('should handle duplicate environment names', () => {
    class DuplicateEnvironmentSeeder extends BaseSeeder {
      static environment = ['production', 'production', 'development']

      async run(): Promise<void> {
        // Mock implementation
      }
    }

    // Should still work correctly with duplicates
    assert.strictEqual(DuplicateEnvironmentSeeder.shouldRun('production'), true)
    assert.strictEqual(DuplicateEnvironmentSeeder.shouldRun('development'), true)
    assert.strictEqual(DuplicateEnvironmentSeeder.shouldRun('testing'), false)
  })

  await t.test('should handle very long environment names', () => {
    const longEnvName =
      'very-long-environment-name-that-might-be-used-in-some-complex-deployment-scenarios'

    class LongEnvironmentSeeder extends BaseSeeder {
      static environment = [longEnvName]

      async run(): Promise<void> {
        // Mock implementation
      }
    }

    assert.strictEqual(LongEnvironmentSeeder.shouldRun(longEnvName), true)
    assert.strictEqual(LongEnvironmentSeeder.shouldRun('production'), false)
  })
})
