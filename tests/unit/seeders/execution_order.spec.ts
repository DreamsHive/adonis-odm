import { test } from 'node:test'
import assert from 'node:assert'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { SeederManager } from '../../../src/seeders/seeder_manager.js'
import { BaseSeeder } from '../../../src/seeders/base_seeder.js'
import type { OdmConfig } from '../../../src/types/index.js'
import type { MongoDatabaseManager } from '../../../src/database_manager.js'

// Mock database manager
function createMockDatabaseManager(): MongoDatabaseManager {
  return {
    db: () => ({
      collection: () => ({
        insertMany: async () => ({ insertedCount: 1 }),
        insertOne: async () => ({ insertedId: 'test' }),
      }),
    }),
    collection: () => ({
      insertMany: async () => ({ insertedCount: 1 }),
      insertOne: async () => ({ insertedId: 'test' }),
    }),
    connection: () => ({
      db: () => ({
        admin: () => ({
          ping: async () => true,
        }),
      }),
    }),
  } as any
}

// Mock config
function createMockConfig(overrides: Partial<OdmConfig> = {}): OdmConfig {
  return {
    connection: 'mongodb',
    connections: {
      mongodb: {
        client: 'mongodb',
        connection: { url: 'mongodb://localhost:27017/test' },
      },
    },
    seeders: {
      paths: ['./tests/temp/execution-order'],
      defaultConnection: 'mongodb',
    },
    ...overrides,
  }
}

// Test directory setup
const testDir = './tests/temp/execution-order'

test('SeederManager - Execution Order', async (t) => {
  // Setup test directory
  await t.before(async () => {
    await rm(testDir, { recursive: true, force: true })
    await mkdir(testDir, { recursive: true })
  })

  // Cleanup test directory
  await t.after(async () => {
    await rm(testDir, { recursive: true, force: true })
  })

  // Clean up between each test
  await t.beforeEach(async () => {
    await rm(testDir, { recursive: true, force: true })
    await mkdir(testDir, { recursive: true })
  })

  await t.test('should execute seeders in order based on static order property', async () => {
    // Create seeders with different order values
    const seeder1Content = `
      import { BaseSeeder } from '../../../src/seeders/base_seeder.js'
      export default class ThirdSeeder extends BaseSeeder {
        static order = 3
        async run() {}
      }
    `

    const seeder2Content = `
      import { BaseSeeder } from '../../../src/seeders/base_seeder.js'
      export default class FirstSeeder extends BaseSeeder {
        static order = 1
        async run() {}
      }
    `

    const seeder3Content = `
      import { BaseSeeder } from '../../../src/seeders/base_seeder.js'
      export default class SecondSeeder extends BaseSeeder {
        static order = 2
        async run() {}
      }
    `

    await writeFile(join(testDir, 'third_seeder.ts'), seeder1Content)
    await writeFile(join(testDir, 'first_seeder.ts'), seeder2Content)
    await writeFile(join(testDir, 'second_seeder.ts'), seeder3Content)

    const config = createMockConfig()
    const client = createMockDatabaseManager()
    const manager = new SeederManager(config, client)

    const files = await manager.getSeederFiles()

    // Should be ordered by order property: 1, 2, 3
    assert.ok(files[0].includes('first_seeder.ts'))
    assert.ok(files[1].includes('second_seeder.ts'))
    assert.ok(files[2].includes('third_seeder.ts'))
  })

  await t.test('should prioritize main seeders (index.ts, main.ts) with order 0', async () => {
    const indexContent = `
      import { BaseSeeder } from '../../../src/seeders/base_seeder.js'
      export default class IndexSeeder extends BaseSeeder {
        async run() {}
      }
    `

    const mainContent = `
      import { BaseSeeder } from '../../../src/seeders/base_seeder.js'
      export default class MainSeeder extends BaseSeeder {
        async run() {}
      }
    `

    const regularContent = `
      import { BaseSeeder } from '../../../src/seeders/base_seeder.js'
      export default class RegularSeeder extends BaseSeeder {
        static order = 1
        async run() {}
      }
    `

    await writeFile(join(testDir, 'index.ts'), indexContent)
    await writeFile(join(testDir, 'main.ts'), mainContent)
    await writeFile(join(testDir, 'regular_seeder.ts'), regularContent)

    const config = createMockConfig()
    const client = createMockDatabaseManager()
    const manager = new SeederManager(config, client)

    const files = await manager.getSeederFiles()

    // Main seeders should come first (order 0), then regular seeder (order 1)
    const mainSeederFiles = files.filter((f) => f.includes('index.ts') || f.includes('main.ts'))
    const regularSeederIndex = files.findIndex((f) => f.includes('regular_seeder.ts'))

    assert.strictEqual(mainSeederFiles.length, 2)
    assert.ok(regularSeederIndex >= 2, 'Regular seeder should come after main seeders')
  })

  await t.test('should handle dependencies correctly', async () => {
    const userSeederContent = `
      import { BaseSeeder } from '../../../src/seeders/base_seeder.js'
      export default class UserSeeder extends BaseSeeder {
        static order = 1
        async run() {}
      }
    `

    const roleSeederContent = `
      import { BaseSeeder } from '../../../src/seeders/base_seeder.js'
      export default class RoleSeeder extends BaseSeeder {
        static order = 1
        async run() {}
      }
    `

    const userRoleSeederContent = `
      import { BaseSeeder } from '../../../src/seeders/base_seeder.js'
      export default class UserRoleSeeder extends BaseSeeder {
        static order = 2
        static dependencies = ['UserSeeder', 'RoleSeeder']
        async run() {}
      }
    `

    await writeFile(join(testDir, 'user_seeder.ts'), userSeederContent)
    await writeFile(join(testDir, 'role_seeder.ts'), roleSeederContent)
    await writeFile(join(testDir, 'user_role_seeder.ts'), userRoleSeederContent)

    const config = createMockConfig()
    const client = createMockDatabaseManager()
    const manager = new SeederManager(config, client)

    const files = await manager.getSeederFiles()

    // UserSeeder and RoleSeeder should come before UserRoleSeeder
    const userIndex = files.findIndex((f) => f.includes('user_seeder.ts'))
    const roleIndex = files.findIndex((f) => f.includes('role_seeder.ts'))
    const userRoleIndex = files.findIndex((f) => f.includes('user_role_seeder.ts'))

    assert.ok(userIndex < userRoleIndex, 'UserSeeder should come before UserRoleSeeder')
    assert.ok(roleIndex < userRoleIndex, 'RoleSeeder should come before UserRoleSeeder')
  })

  await t.test('should detect circular dependencies', async () => {
    const seeder1Content = `
      import { BaseSeeder } from '../../../src/seeders/base_seeder.js'
      export default class CircularSeeder1 extends BaseSeeder {
        static dependencies = ['CircularSeeder2']
        async run() {}
      }
    `

    const seeder2Content = `
      import { BaseSeeder } from '../../../src/seeders/base_seeder.js'
      export default class CircularSeeder2 extends BaseSeeder {
        static dependencies = ['CircularSeeder1']
        async run() {}
      }
    `

    await writeFile(join(testDir, 'circular_seeder1.ts'), seeder1Content)
    await writeFile(join(testDir, 'circular_seeder2.ts'), seeder2Content)

    const config = createMockConfig()
    const client = createMockDatabaseManager()
    const manager = new SeederManager(config, client)

    await assert.rejects(
      async () => await manager.getSeederFiles(),
      /Circular dependency detected/,
      'Should detect circular dependencies'
    )
  })

  await t.test('should handle missing dependencies', async () => {
    const seederContent = `
      import { BaseSeeder } from '../../../src/seeders/base_seeder.js'
      export default class MissingDepSeeder extends BaseSeeder {
        static dependencies = ['NonExistentSeeder']
        async run() {}
      }
    `

    await writeFile(join(testDir, 'missing_dep_seeder.ts'), seederContent)

    const config = createMockConfig()
    const client = createMockDatabaseManager()
    const manager = new SeederManager(config, client)

    await assert.rejects(
      async () => await manager.getSeederFiles(),
      /depends on "NonExistentSeeder" which was not found/,
      'Should detect missing dependencies'
    )
  })

  await t.test('should use default order 999 for seeders without order property', async () => {
    const defaultSeederContent = `
      import { BaseSeeder } from '../../../src/seeders/base_seeder.js'
      export default class DefaultSeeder extends BaseSeeder {
        async run() {}
      }
    `

    const orderedSeederContent = `
      import { BaseSeeder } from '../../../src/seeders/base_seeder.js'
      export default class OrderedSeeder extends BaseSeeder {
        static order = 1
        async run() {}
      }
    `

    await writeFile(join(testDir, 'default_seeder.ts'), defaultSeederContent)
    await writeFile(join(testDir, 'ordered_seeder.ts'), orderedSeederContent)

    const config = createMockConfig()
    const client = createMockDatabaseManager()
    const manager = new SeederManager(config, client)

    const files = await manager.getSeederFiles()

    // Ordered seeder (order 1) should come before default seeder (order 999)
    const orderedIndex = files.findIndex((f) => f.includes('ordered_seeder.ts'))
    const defaultIndex = files.findIndex((f) => f.includes('default_seeder.ts'))

    assert.ok(orderedIndex < defaultIndex, 'Ordered seeder should come before default seeder')
  })

  await t.test('should handle complex dependency chains', async () => {
    const baseSeederContent = `
      import { BaseSeeder } from '../../../src/seeders/base_seeder.js'
      export default class BaseSeeder1 extends BaseSeeder {
        static order = 1
        async run() {}
      }
    `

    const middleSeederContent = `
      import { BaseSeeder } from '../../../src/seeders/base_seeder.js'
      export default class MiddleSeeder extends BaseSeeder {
        static order = 2
        static dependencies = ['BaseSeeder1']
        async run() {}
      }
    `

    const topSeederContent = `
      import { BaseSeeder } from '../../../src/seeders/base_seeder.js'
      export default class TopSeeder extends BaseSeeder {
        static order = 3
        static dependencies = ['MiddleSeeder']
        async run() {}
      }
    `

    await writeFile(join(testDir, 'base_seeder1.ts'), baseSeederContent)
    await writeFile(join(testDir, 'middle_seeder.ts'), middleSeederContent)
    await writeFile(join(testDir, 'top_seeder.ts'), topSeederContent)

    const config = createMockConfig()
    const client = createMockDatabaseManager()
    const manager = new SeederManager(config, client)

    const files = await manager.getSeederFiles()

    // Should be ordered: BaseSeeder1 -> MiddleSeeder -> TopSeeder
    const baseIndex = files.findIndex((f) => f.includes('base_seeder1.ts'))
    const middleIndex = files.findIndex((f) => f.includes('middle_seeder.ts'))
    const topIndex = files.findIndex((f) => f.includes('top_seeder.ts'))

    assert.ok(baseIndex < middleIndex, 'BaseSeeder1 should come before MiddleSeeder')
    assert.ok(middleIndex < topIndex, 'MiddleSeeder should come before TopSeeder')
  })

  await t.test('should handle seeders with same order but different dependencies', async () => {
    const independentSeederContent = `
      import { BaseSeeder } from '../../../src/seeders/base_seeder.js'
      export default class IndependentSeeder extends BaseSeeder {
        static order = 5
        async run() {}
      }
    `

    const dependentSeederContent = `
      import { BaseSeeder } from '../../../src/seeders/base_seeder.js'
      export default class DependentSeeder extends BaseSeeder {
        static order = 5
        static dependencies = ['IndependentSeeder']
        async run() {}
      }
    `

    await writeFile(join(testDir, 'independent_seeder.ts'), independentSeederContent)
    await writeFile(join(testDir, 'dependent_seeder.ts'), dependentSeederContent)

    const config = createMockConfig()
    const client = createMockDatabaseManager()
    const manager = new SeederManager(config, client)

    const files = await manager.getSeederFiles()

    // Verify the correct order by checking file names directly
    assert.strictEqual(files.length, 2, 'Should have exactly 2 files')

    const firstFileName = files[0].split('/').pop()
    const secondFileName = files[1].split('/').pop()

    assert.strictEqual(
      firstFileName,
      'independent_seeder.ts',
      `First file should be independent_seeder.ts, got ${firstFileName}`
    )
    assert.strictEqual(
      secondFileName,
      'dependent_seeder.ts',
      `Second file should be dependent_seeder.ts, got ${secondFileName}`
    )
  })

  await t.test('should gracefully handle seeders that fail to load', async () => {
    const validSeederContent = `
      import { BaseSeeder } from '../../../src/seeders/base_seeder.js'
      export default class ValidSeeder extends BaseSeeder {
        static order = 1
        async run() {}
      }
    `

    const invalidSeederContent = `
      // This is not a valid seeder - syntax error
      import { BaseSeeder } from '../../../src/seeders/base_seeder.js'
      export default class InvalidSeeder extends BaseSeeder {
        static order = 2
        async run() {
          // Missing closing brace
    `

    await writeFile(join(testDir, 'valid_seeder.ts'), validSeederContent)
    await writeFile(join(testDir, 'invalid_seeder.ts'), invalidSeederContent)

    const config = createMockConfig()
    const client = createMockDatabaseManager()
    const manager = new SeederManager(config, client)

    // Should not throw error, but should include both files with defaults for invalid one
    const files = await manager.getSeederFiles()

    assert.ok(
      files.some((f) => f.includes('valid_seeder.ts')),
      'Should include valid seeder'
    )
    assert.ok(
      files.some((f) => f.includes('invalid_seeder.ts')),
      'Should include invalid seeder with defaults'
    )

    // Valid seeder (order 1) should come before invalid seeder (default order 999)
    const validIndex = files.findIndex((f) => f.includes('valid_seeder.ts'))
    const invalidIndex = files.findIndex((f) => f.includes('invalid_seeder.ts'))

    assert.ok(validIndex < invalidIndex, 'Valid seeder should come before invalid seeder')
  })
})
