import { test } from 'node:test'
import assert from 'node:assert'
import { writeFile, mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { BaseSeeder } from '../src/seeders/base_seeder.js'
import { SeederManager } from '../src/seeders/seeder_manager.js'
import { MongoDatabaseManager } from '../src/database_manager.js'
import { defineConfig, getSeederConfig } from '../src/config/odm_config.js'
import type { OdmConfig, SeederConfig } from '../src/types/index.js'

// Mock configuration for testing
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

// Test seeder implementation
class TestSeeder extends BaseSeeder {
  static environment = ['testing']
  public executed = false

  async run(): Promise<void> {
    this.executed = true
    // Simulate some seeding work
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}

// Test seeder without environment restrictions
class UnrestrictedSeeder extends BaseSeeder {
  public executed = false

  async run(): Promise<void> {
    this.executed = true
  }
}

test('BaseSeeder - should create seeder instance with database manager', () => {
  const manager = new MongoDatabaseManager(mockConfig)
  const seeder = new TestSeeder(manager)

  assert.ok(seeder instanceof BaseSeeder, 'Seeder should be instance of BaseSeeder')
  assert.ok(seeder instanceof TestSeeder, 'Seeder should be instance of TestSeeder')
})

test('BaseSeeder - should create seeder instance with connection name', () => {
  const manager = new MongoDatabaseManager(mockConfig)
  const seeder = new TestSeeder(manager, 'custom-connection')

  assert.ok(seeder instanceof BaseSeeder, 'Seeder should be instance of BaseSeeder')
  assert.equal(
    (seeder as any).connection,
    'custom-connection',
    'Connection should be set correctly'
  )
})

test('BaseSeeder - should have abstract run method that must be implemented', async () => {
  const manager = new MongoDatabaseManager(mockConfig)
  const seeder = new TestSeeder(manager)

  await seeder.run()
  assert.equal(seeder.executed, true, 'Run method should be executed')
})

test('BaseSeeder - should check environment restrictions correctly', () => {
  // Seeder with environment restrictions
  assert.equal(TestSeeder.shouldRun('testing'), true, 'Should run in testing environment')
  assert.equal(
    TestSeeder.shouldRun('production'),
    false,
    'Should not run in production environment'
  )
  assert.equal(
    TestSeeder.shouldRun('development'),
    false,
    'Should not run in development environment'
  )

  // Seeder without environment restrictions
  assert.equal(
    UnrestrictedSeeder.shouldRun('testing'),
    true,
    'Unrestricted seeder should run in testing'
  )
  assert.equal(
    UnrestrictedSeeder.shouldRun('production'),
    true,
    'Unrestricted seeder should run in production'
  )
  assert.equal(
    UnrestrictedSeeder.shouldRun('development'),
    true,
    'Unrestricted seeder should run in development'
  )
})

test('BaseSeeder - should return correct seeder name', () => {
  assert.equal(TestSeeder.getSeederName(), 'TestSeeder', 'Should return correct seeder name')
  assert.equal(
    UnrestrictedSeeder.getSeederName(),
    'UnrestrictedSeeder',
    'Should return correct seeder name'
  )
})

test('BaseSeeder - should provide access to database manager', () => {
  const manager = new MongoDatabaseManager(mockConfig)
  const seeder = new TestSeeder(manager)

  assert.equal((seeder as any).client, manager, 'Should provide access to database manager')
})

test('BaseSeeder - should handle empty environment array as unrestricted', () => {
  class EmptyEnvironmentSeeder extends BaseSeeder {
    static environment: string[] = []

    async run(): Promise<void> {
      // Implementation
    }
  }

  assert.equal(
    EmptyEnvironmentSeeder.shouldRun('testing'),
    true,
    'Should run in testing with empty environment'
  )
  assert.equal(
    EmptyEnvironmentSeeder.shouldRun('production'),
    true,
    'Should run in production with empty environment'
  )
  assert.equal(
    EmptyEnvironmentSeeder.shouldRun('development'),
    true,
    'Should run in development with empty environment'
  )
})

test('BaseSeeder - should handle multiple environments correctly', () => {
  class MultiEnvironmentSeeder extends BaseSeeder {
    static environment = ['development', 'testing']

    async run(): Promise<void> {
      // Implementation
    }
  }

  assert.equal(
    MultiEnvironmentSeeder.shouldRun('testing'),
    true,
    'Should run in testing environment'
  )
  assert.equal(
    MultiEnvironmentSeeder.shouldRun('development'),
    true,
    'Should run in development environment'
  )
  assert.equal(
    MultiEnvironmentSeeder.shouldRun('production'),
    false,
    'Should not run in production environment'
  )
  assert.equal(
    MultiEnvironmentSeeder.shouldRun('staging'),
    false,
    'Should not run in staging environment'
  )
})

// Configuration Tests
test('ODM Configuration - should support seeder configuration in defineConfig', () => {
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
  assert.equal(
    config.seeders.defaultConnection,
    'mongodb',
    'Default connection should be preserved'
  )
})

test('ODM Configuration - should work without seeder configuration', () => {
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

  assert.equal(config.seeders, undefined, 'Seeders configuration should be optional')
})

test('getSeederConfig - should return defaults when no seeder config provided', () => {
  const config: OdmConfig = {
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

  const seederConfig = getSeederConfig(config)

  assert.deepEqual(seederConfig.paths, ['./database/seeders'], 'Should use default paths')
  assert.equal(seederConfig.defaultConnection, 'mongodb', 'Should use main connection as default')
})

test('getSeederConfig - should merge with defaults when partial config provided', () => {
  const config: OdmConfig = {
    connection: 'primary',
    connections: {
      primary: {
        client: 'mongodb',
        connection: {
          url: 'mongodb://localhost:27017/test',
        },
      },
    },
    seeders: {
      paths: ['./custom/seeders'],
    },
  }

  const seederConfig = getSeederConfig(config)

  assert.deepEqual(seederConfig.paths, ['./custom/seeders'], 'Should use provided paths')
  assert.equal(
    seederConfig.defaultConnection,
    'primary',
    'Should use main connection as default when not specified'
  )
})

test('getSeederConfig - should use provided configuration when complete', () => {
  const config: OdmConfig = {
    connection: 'mongodb',
    connections: {
      mongodb: {
        client: 'mongodb',
        connection: {
          url: 'mongodb://localhost:27017/test',
        },
      },
      analytics: {
        client: 'mongodb',
        connection: {
          url: 'mongodb://localhost:27017/analytics',
        },
      },
    },
    seeders: {
      paths: ['./database/seeders', './analytics/seeders'],
      defaultConnection: 'analytics',
    },
  }

  const seederConfig = getSeederConfig(config)

  assert.deepEqual(
    seederConfig.paths,
    ['./database/seeders', './analytics/seeders'],
    'Should use provided paths'
  )
  assert.equal(
    seederConfig.defaultConnection,
    'analytics',
    'Should use provided default connection'
  )
})

test('getSeederConfig - should handle empty paths array', () => {
  const config: OdmConfig = {
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
    },
  }

  const seederConfig = getSeederConfig(config)

  assert.deepEqual(
    seederConfig.paths,
    ['./database/seeders'],
    'Should use default paths when empty array provided'
  )
  assert.equal(seederConfig.defaultConnection, 'mongodb', 'Should use main connection as default')
})

// SeederManager Tests
test('SeederManager - should create instance with config and client', () => {
  const manager = new MongoDatabaseManager(mockConfig)
  const seederManager = new SeederManager(mockConfig, manager)

  assert.ok(seederManager instanceof SeederManager, 'Should create SeederManager instance')
  assert.deepEqual(
    seederManager.getConfig(),
    {
      paths: ['./database/seeders'],
      defaultConnection: 'mongodb',
    },
    'Should have correct default configuration'
  )
})

test('SeederManager - should handle custom seeder configuration', () => {
  const customConfig: OdmConfig = {
    connection: 'primary',
    connections: {
      primary: {
        client: 'mongodb',
        connection: {
          url: 'mongodb://localhost:27017/test',
        },
      },
    },
    seeders: {
      paths: ['./custom/seeders', './shared/seeders'],
      defaultConnection: 'primary',
    },
  }

  const manager = new MongoDatabaseManager(customConfig)
  const seederManager = new SeederManager(customConfig, manager)

  assert.deepEqual(
    seederManager.getConfig(),
    {
      paths: ['./custom/seeders', './shared/seeders'],
      defaultConnection: 'primary',
    },
    'Should use custom seeder configuration'
  )
})

test('SeederManager - should validate seeder file patterns', async () => {
  const manager = new MongoDatabaseManager(mockConfig)
  const seederManager = new SeederManager(mockConfig, manager)

  // Access private method for testing
  const isSeederFile = (seederManager as any).isSeederFile.bind(seederManager)

  // Valid seeder files
  assert.equal(isSeederFile('user_seeder.ts'), true, 'Should accept .ts files')
  assert.equal(isSeederFile('user_seeder.js'), true, 'Should accept .js files')
  assert.equal(isSeederFile('user_seeder.mts'), true, 'Should accept .mts files')
  assert.equal(isSeederFile('user_seeder.mjs'), true, 'Should accept .mjs files')

  // Invalid seeder files
  assert.equal(isSeederFile('user_seeder.test.ts'), false, 'Should reject test files')
  assert.equal(isSeederFile('user_seeder.spec.js'), false, 'Should reject spec files')
  assert.equal(isSeederFile('user_seeder.d.ts'), false, 'Should reject declaration files')
  assert.equal(isSeederFile('index.ts'), false, 'Should reject index files')
  assert.equal(isSeederFile('readme.txt'), false, 'Should reject non-JS/TS files')
})

test('SeederManager - should extract seeder names correctly', () => {
  const manager = new MongoDatabaseManager(mockConfig)
  const seederManager = new SeederManager(mockConfig, manager)

  // Access private method for testing
  const getSeederNameFromPath = (seederManager as any).getSeederNameFromPath.bind(seederManager)

  assert.equal(
    getSeederNameFromPath('user_seeder.ts'),
    'UserSeeder',
    'Should convert snake_case to PascalCase'
  )
  assert.equal(
    getSeederNameFromPath('user-seeder.js'),
    'UserSeeder',
    'Should convert kebab-case to PascalCase'
  )
  assert.equal(
    getSeederNameFromPath('UserSeeder.ts'),
    'Userseeder',
    'Should handle existing PascalCase'
  )
  assert.equal(
    getSeederNameFromPath('/path/to/user_seeder.ts'),
    'UserSeeder',
    'Should handle full paths'
  )
})

// Create a temporary test directory and files for integration tests
const testDir = join(process.cwd(), 'test-seeders-temp')

test('SeederManager - should discover seeder files in directory', async () => {
  const manager = new MongoDatabaseManager(mockConfig)

  // Create test config with temporary directory
  const testConfig: OdmConfig = {
    ...mockConfig,
    seeders: {
      paths: [testDir],
    },
  }

  const seederManager = new SeederManager(testConfig, manager)

  try {
    // Create test directory and files
    await mkdir(testDir, { recursive: true })
    await mkdir(join(testDir, 'subdirectory'), { recursive: true })

    // Create valid seeder files
    await writeFile(
      join(testDir, 'user_seeder.ts'),
      `
      import { BaseSeeder } from '../src/seeders/base_seeder.js'
      export default class UserSeeder extends BaseSeeder {
        async run() {
          // Test seeder
        }
      }
    `
    )

    await writeFile(
      join(testDir, 'subdirectory', 'admin_seeder.js'),
      `
      const { BaseSeeder } = require('../src/seeders/base_seeder.js')
      class AdminSeeder extends BaseSeeder {
        async run() {
          // Test seeder
        }
      }
      module.exports = AdminSeeder
    `
    )

    // Create files that should be ignored
    await writeFile(join(testDir, 'user_seeder.test.ts'), 'test file')
    await writeFile(join(testDir, 'readme.txt'), 'readme file')
    await writeFile(join(testDir, 'index.ts'), 'index file')

    // Test file discovery
    const files = await seederManager.getSeederFiles()

    assert.equal(files.length, 2, `Should find exactly 2 seeder files, found: ${files.length}`)
    assert.ok(
      files.some((f) => f.includes('user_seeder.ts')),
      'Should find user_seeder.ts'
    )
    assert.ok(
      files.some((f) => f.includes('admin_seeder.js')),
      'Should find admin_seeder.js in subdirectory'
    )

    // Verify test files are excluded (check filename, not full path)
    const testFiles = files.filter((f) => {
      const fileName = f.split('/').pop() || ''
      return fileName.includes('.test.') || fileName.includes('.spec.')
    })
    assert.equal(
      testFiles.length,
      0,
      `Should not include test files. Found: ${testFiles.join(', ')}`
    )

    // Verify readme files are excluded
    const readmeFiles = files.filter((f) => {
      const fileName = f.split('/').pop() || ''
      return fileName.includes('readme')
    })
    assert.equal(
      readmeFiles.length,
      0,
      `Should not include readme files. Found: ${readmeFiles.join(', ')}`
    )
  } finally {
    // Cleanup
    try {
      await rm(testDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  }
})

test('SeederManager - should handle non-existent seeder directories gracefully', async () => {
  const manager = new MongoDatabaseManager(mockConfig)

  const testConfig: OdmConfig = {
    ...mockConfig,
    seeders: {
      paths: ['./non-existent-directory', './another-missing-dir'],
    },
  }

  const seederManager = new SeederManager(testConfig, manager)

  // Should not throw error for missing directories
  const files = await seederManager.getSeederFiles()
  assert.equal(files.length, 0, 'Should return empty array for non-existent directories')
})

// Provider Integration Tests
test('MongoDB Provider - should register SeederManager in container', async () => {
  // Mock ApplicationService for testing
  const mockContainer = {
    bindings: new Map(),
    bind: function (key: string | Function, factory: Function) {
      this.bindings.set(key, factory)
    },
    singleton: function (key: string, factory: Function) {
      this.bindings.set(key, factory)
    },
    make: function (key: string) {
      const factory = this.bindings.get(key)
      return factory ? factory() : null
    },
  }

  const mockApp = {
    container: mockContainer,
    config: {
      get: () => mockConfig,
    },
  }

  // Import and test provider
  const { default: MongodbProvider } = await import('../providers/mongodb_provider.js')
  const provider = new MongodbProvider(mockApp as any)

  // Register services
  provider.register()

  // Verify SeederManager is registered
  assert.ok(mockContainer.bindings.has('odm.seeder'), 'Should register odm.seeder binding')
  assert.ok(
    mockContainer.bindings.has('mongodb.manager'),
    'Should register mongodb.manager binding'
  )
  assert.ok(mockContainer.bindings.has('mongodb'), 'Should register mongodb binding')

  // Verify SeederManager can be resolved
  const seederManager = mockContainer.make('odm.seeder')
  assert.ok(seederManager, 'Should be able to resolve SeederManager from container')
  assert.equal(
    seederManager.constructor.name,
    'SeederManager',
    'Should resolve correct SeederManager instance'
  )
})
