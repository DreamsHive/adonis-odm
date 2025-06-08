import { test } from 'node:test'
import assert from 'node:assert'
import { writeFile, mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { SeederManager } from '../../../src/seeders/seeder_manager.js'
import { BaseSeeder } from '../../../src/seeders/base_seeder.js'
import type { MongoDatabaseManager } from '../../../src/database_manager.js'
import type { OdmConfig } from '../../../src/types/index.js'

// Mock database manager
const createMockDatabaseManager = (): MongoDatabaseManager => {
  return {
    db: () => ({
      collection: () => ({
        insertOne: async () => ({ insertedId: 'mock-id' }),
        insertMany: async () => ({ insertedIds: ['id1', 'id2'] }),
      }),
      admin: () => ({
        ping: async () => ({ ok: 1 }),
      }),
    }),
    connection: (name?: string) => ({
      db: () => ({
        admin: () => ({
          ping: async () => ({ ok: 1 }),
        }),
      }),
    }),
    hasConnection: (name: string) =>
      name === 'mongodb' || name === 'primary' || name === 'secondary' || name === 'custom',
    connect: async () => {},
    close: async () => {},
    isConnected: () => true,
  } as any
}

// Mock configuration
const createMockConfig = (overrides: Partial<OdmConfig> = {}): OdmConfig => {
  return {
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
      paths: ['./tests/temp/seeders'],
      defaultConnection: 'mongodb',
    },
    ...overrides,
  }
}

// Test seeder classes
class TestSeeder extends BaseSeeder {
  async run(): Promise<void> {
    // Mock implementation
  }
}

class EnvironmentSeeder extends BaseSeeder {
  static environment = ['development']

  async run(): Promise<void> {
    // Mock implementation
  }
}

class FailingSeeder extends BaseSeeder {
  async run(): Promise<void> {
    throw new Error('Seeder execution failed')
  }
}

// Test directory setup
const testDir = './tests/temp'
const seedersDir = join(testDir, 'seeders')

test('SeederManager - Initialization', async (t) => {
  await t.test('should initialize with config and client', () => {
    const config = createMockConfig()
    const client = createMockDatabaseManager()
    const manager = new SeederManager(config, client)

    assert.ok(manager, 'SeederManager should be created')
    assert.deepEqual(manager.getConfig().paths, ['./tests/temp/seeders'])
    assert.strictEqual(manager.getConfig().defaultConnection, 'mongodb')
  })

  await t.test('should use default seeder configuration when not provided', () => {
    const config = createMockConfig({ seeders: undefined })
    const client = createMockDatabaseManager()
    const manager = new SeederManager(config, client)

    const seederConfig = manager.getConfig()
    assert.ok(seederConfig.paths.length > 0, 'Should have default paths')
    assert.ok(seederConfig.defaultConnection, 'Should have default connection')
  })
})

test('SeederManager - File Discovery', async (t) => {
  // Setup test directory
  await t.before(async () => {
    await rm(testDir, { recursive: true, force: true })
    await mkdir(seedersDir, { recursive: true })
  })

  // Cleanup test directory
  await t.after(async () => {
    await rm(testDir, { recursive: true, force: true })
  })

  await t.test('should discover TypeScript seeder files', async () => {
    // Create test seeder files
    await writeFile(
      join(seedersDir, 'user_seeder.ts'),
      `
      import { BaseSeeder } from '../../../src/seeders/base_seeder.js'
      export default class UserSeeder extends BaseSeeder {
        async run() {}
      }
    `
    )

    await writeFile(
      join(seedersDir, 'post_seeder.ts'),
      `
      import { BaseSeeder } from '../../../src/seeders/base_seeder.js'
      export default class PostSeeder extends BaseSeeder {
        async run() {}
      }
    `
    )

    const config = createMockConfig()
    const client = createMockDatabaseManager()
    const manager = new SeederManager(config, client)

    const files = await manager.getSeederFiles()
    assert.strictEqual(files.length, 2)
    assert.ok(files.some((f) => f.includes('user_seeder.ts')))
    assert.ok(files.some((f) => f.includes('post_seeder.ts')))
  })

  await t.test('should ignore non-seeder files', async () => {
    // Create non-seeder files
    await writeFile(join(seedersDir, 'user_seeder.test.ts'), 'test file')
    await writeFile(join(seedersDir, 'user_seeder.spec.ts'), 'spec file')
    await writeFile(join(seedersDir, 'README.md'), 'readme file')
    await writeFile(join(seedersDir, 'config.d.ts'), 'type definition file')

    // Create valid main seeder files (these should be included)
    await writeFile(
      join(seedersDir, 'index.ts'),
      `
      import { BaseSeeder } from '../../../src/seeders/base_seeder.js'
      export default class IndexSeeder extends BaseSeeder {
        async run() {}
      }
    `
    )
    await writeFile(
      join(seedersDir, 'main.ts'),
      `
      import { BaseSeeder } from '../../../src/seeders/base_seeder.js'
      export default class MainSeeder extends BaseSeeder {
        async run() {}
      }
    `
    )

    const config = createMockConfig()
    const client = createMockDatabaseManager()
    const manager = new SeederManager(config, client)

    const files = await manager.getSeederFiles()

    // Should not include test, spec, or non-ts files
    assert.ok(!files.some((f) => f.includes('.test.')))
    assert.ok(!files.some((f) => f.includes('.spec.')))
    assert.ok(!files.some((f) => f.includes('.md')))
    assert.ok(!files.some((f) => f.includes('.d.ts')))

    // Should include main seeder files (index.ts, main.ts)
    assert.ok(files.some((f) => f.includes('index.ts')))
    assert.ok(files.some((f) => f.includes('main.ts')))
  })

  await t.test('should discover files in subdirectories', async () => {
    const subDir = join(seedersDir, 'admin')
    await mkdir(subDir, { recursive: true })

    await writeFile(
      join(subDir, 'admin_seeder.ts'),
      `
      import { BaseSeeder } from '../../../../src/seeders/base_seeder.js'
      export default class AdminSeeder extends BaseSeeder {
        async run() {}
      }
    `
    )

    const config = createMockConfig()
    const client = createMockDatabaseManager()
    const manager = new SeederManager(config, client)

    const files = await manager.getSeederFiles()
    assert.ok(files.some((f) => f.includes('admin/admin_seeder.ts')))
  })

  await t.test('should return empty array when no seeders found', async () => {
    // Clean directory
    await rm(seedersDir, { recursive: true, force: true })
    await mkdir(seedersDir, { recursive: true })

    const config = createMockConfig()
    const client = createMockDatabaseManager()
    const manager = new SeederManager(config, client)

    const files = await manager.getSeederFiles()
    assert.strictEqual(files.length, 0)
  })

  await t.test('should handle non-existent seeder paths gracefully', async () => {
    const config = createMockConfig({
      seeders: {
        paths: ['./non-existent-path'],
        defaultConnection: 'mongodb',
      },
    })
    const client = createMockDatabaseManager()
    const manager = new SeederManager(config, client)

    const files = await manager.getSeederFiles()
    assert.strictEqual(files.length, 0)
  })
})

test('SeederManager - Seeder Execution', async (t) => {
  await t.test('should run seeders with default options', async () => {
    const config = createMockConfig()
    const client = createMockDatabaseManager()
    const manager = new SeederManager(config, client)

    // Mock getSeederFiles to return empty array for this test
    manager.getSeederFiles = async () => []

    const results = await manager.run()
    assert.ok(Array.isArray(results))
    assert.strictEqual(results.length, 0)
  })

  await t.test('should run specific files when provided', async () => {
    const config = createMockConfig()
    const client = createMockDatabaseManager()
    const manager = new SeederManager(config, client)

    // Mock runFile method
    let runFileCallCount = 0
    const originalRunFile = manager.runFile.bind(manager)
    manager.runFile = async (filePath: string) => {
      runFileCallCount++
      return {
        name: 'TestSeeder',
        filePath,
        executed: true,
        executionTime: 100,
      }
    }

    const results = await manager.run({
      files: ['./test1.ts', './test2.ts'],
    })

    assert.strictEqual(runFileCallCount, 2)
    assert.strictEqual(results.length, 2)
    assert.ok(results.every((r) => r.executed))
  })

  await t.test('should use specified connection', async () => {
    const config = createMockConfig({
      connections: {
        mongodb: {
          client: 'mongodb',
          connection: { url: 'mongodb://localhost:27017/test' },
        },
        custom: {
          client: 'mongodb',
          connection: { url: 'mongodb://localhost:27017/custom' },
        },
      },
    })
    const client = createMockDatabaseManager()
    const manager = new SeederManager(config, client)

    let usedConnection: string | undefined
    manager.runFile = async (filePath: string, connection?: string) => {
      usedConnection = connection
      return {
        name: 'TestSeeder',
        filePath,
        executed: true,
      }
    }

    await manager.run({
      files: ['./test.ts'],
      connection: 'custom',
    })

    assert.strictEqual(usedConnection, 'custom')
  })

  await t.test('should use specified environment', async () => {
    const config = createMockConfig()
    const client = createMockDatabaseManager()
    const manager = new SeederManager(config, client)

    let usedEnvironment: string | undefined
    manager.runFile = async (filePath: string, connection?: string, environment?: string) => {
      usedEnvironment = environment
      return {
        name: 'TestSeeder',
        filePath,
        executed: true,
      }
    }

    await manager.run({
      files: ['./test.ts'],
      environment: 'testing',
    })

    assert.strictEqual(usedEnvironment, 'testing')
  })
})

test('SeederManager - Error Handling', async (t) => {
  await t.test('should handle seeder execution errors', async () => {
    const config = createMockConfig()
    const client = createMockDatabaseManager()
    const manager = new SeederManager(config, client)

    // Mock loadSeeder to return a failing seeder
    const originalLoadSeeder = manager['loadSeeder'].bind(manager)
    manager['loadSeeder'] = async () => FailingSeeder

    const result = await manager.runFile('./failing_seeder.ts')

    assert.strictEqual(result.executed, false)
    assert.ok(result.error)
    assert.ok(
      result.error.message.includes('Error on connection "mongodb": Seeder execution failed')
    )
  })

  await t.test('should handle seeder loading errors', async () => {
    const config = createMockConfig()
    const client = createMockDatabaseManager()
    const manager = new SeederManager(config, client)

    // Mock loadSeeder to throw an error
    manager['loadSeeder'] = async () => {
      throw new Error('Failed to load seeder')
    }

    const result = await manager.runFile('./non_existent_seeder.ts')

    assert.strictEqual(result.executed, false)
    assert.ok(result.error)
    assert.ok(result.error.message.includes('Failed to load seeder'))
  })

  await t.test('should handle environment restrictions', async () => {
    const config = createMockConfig()
    const client = createMockDatabaseManager()
    const manager = new SeederManager(config, client)

    // Mock loadSeeder to return environment-restricted seeder
    manager['loadSeeder'] = async () => EnvironmentSeeder

    const result = await manager.runFile('./env_seeder.ts', 'mongodb', 'production')

    assert.strictEqual(result.executed, false)
    assert.ok(result.skipReason)
    assert.ok(result.skipReason.includes('Environment restriction'))
  })
})

test('SeederManager - Connection Validation', async (t) => {
  await t.test('should validate connection names', async () => {
    const config = createMockConfig({
      connections: {
        primary: {
          client: 'mongodb',
          connection: { url: 'mongodb://localhost:27017/primary' },
        },
        secondary: {
          client: 'mongodb',
          connection: { url: 'mongodb://localhost:27017/secondary' },
        },
      },
    })
    const client = createMockDatabaseManager()
    const manager = new SeederManager(config, client)

    // Test valid connection
    assert.strictEqual(manager.isValidConnection('primary'), true)
    assert.strictEqual(manager.isValidConnection('secondary'), true)

    // Test invalid connection
    assert.strictEqual(manager.isValidConnection('invalid'), false)
  })

  await t.test('should return available connections', async () => {
    const config = createMockConfig({
      connections: {
        primary: {
          client: 'mongodb',
          connection: { url: 'mongodb://localhost:27017/primary' },
        },
        secondary: {
          client: 'mongodb',
          connection: { url: 'mongodb://localhost:27017/secondary' },
        },
      },
    })
    const client = createMockDatabaseManager()
    const manager = new SeederManager(config, client)

    const connections = manager.getAvailableConnections()
    assert.deepStrictEqual(connections.sort(), ['primary', 'secondary'])
  })

  await t.test('should throw error for invalid connection in run', async () => {
    const config = createMockConfig()
    const client = createMockDatabaseManager()
    const manager = new SeederManager(config, client)

    try {
      await manager.run({
        connection: 'invalid-connection',
      })
      assert.fail('Should have thrown an error')
    } catch (error) {
      assert.ok(error instanceof Error)
      assert.ok(error.message.includes('Invalid connection "invalid-connection"'))
    }
  })

  await t.test('should handle connection errors gracefully in runFile', async () => {
    const config = createMockConfig()
    const client = createMockDatabaseManager()
    const manager = new SeederManager(config, client)

    // Mock loadSeeder to return a test seeder
    manager['loadSeeder'] = async () => TestSeeder

    const result = await manager.runFile('./test_seeder.ts', 'invalid-connection')

    assert.strictEqual(result.executed, false)
    assert.ok(result.error)
    assert.ok(result.error.message.includes('Invalid connection'))
  })

  await t.test('should enhance connection error messages', async () => {
    const config = createMockConfig()
    const client = createMockDatabaseManager()
    const manager = new SeederManager(config, client)

    // Mock loadSeeder to return a seeder that throws a connection error
    manager['loadSeeder'] = async () => {
      return class ConnectionErrorSeeder extends TestSeeder {
        async run(): Promise<void> {
          throw new Error('Connection timeout')
        }
      }
    }

    const result = await manager.runFile('./connection_error_seeder.ts', 'mongodb')

    assert.strictEqual(result.executed, false)
    assert.ok(result.error)
    assert.ok(result.error.message.includes('Connection error on "mongodb"'))
  })
})
