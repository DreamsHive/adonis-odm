import { test } from 'node:test'
import assert from 'node:assert'
import { writeFile, mkdir, rm, access } from 'node:fs/promises'
import { join } from 'node:path'
import { MongoDatabaseManager } from '../../src/database_manager.js'
import { SeederManager } from '../../src/seeders/seeder_manager.js'
import { BaseSeeder } from '../../src/seeders/base_seeder.js'
import { defineConfig } from '../../src/config/odm_config.js'
import type { OdmConfig } from '../../src/types/index.js'

// Test configuration for integration tests
const testConfig: OdmConfig = defineConfig({
  connection: 'mongodb',
  connections: {
    mongodb: {
      client: 'mongodb',
      connection: {
        url: process.env.MONGO_URL || 'mongodb://localhost:27017/adonis_odm_test',
      },
    },
    secondary: {
      client: 'mongodb',
      connection: {
        url:
          process.env.MONGO_SECONDARY_URL || 'mongodb://localhost:27017/adonis_odm_test_secondary',
      },
    },
  },
  seeders: {
    paths: ['./tests/temp/integration/seeders'],
    defaultConnection: 'mongodb',
  },
})

// Test directories
const testDir = './tests/temp/integration'
const seedersDir = join(testDir, 'seeders')

// Helper function to check if MongoDB is available
async function isMongoAvailable(): Promise<boolean> {
  try {
    const dbManager = new MongoDatabaseManager(testConfig)
    await dbManager.connect()
    await dbManager.close()
    return true
  } catch (error) {
    console.warn('MongoDB not available for integration tests:', error.message)
    return false
  }
}

// Test setup and cleanup
test('Integration Tests Setup', async (t) => {
  await t.before(async () => {
    // Clean up any existing test directories
    await rm(testDir, { recursive: true, force: true })
    await mkdir(seedersDir, { recursive: true })
  })

  await t.after(async () => {
    // Clean up test directories
    await rm(testDir, { recursive: true, force: true })
  })

  await t.test('should have MongoDB available for integration tests', async () => {
    const mongoAvailable = await isMongoAvailable()
    if (!mongoAvailable) {
      console.log('⚠️  Skipping integration tests - MongoDB not available')
      console.log('💡 To run integration tests, start MongoDB with: docker-compose up -d')
      return
    }
    assert.ok(mongoAvailable, 'MongoDB should be available for integration tests')
  })
})

test('Seeder Integration - End-to-End Workflow', async (t) => {
  const mongoAvailable = await isMongoAvailable()

  if (!mongoAvailable) {
    console.log('⚠️  Skipping end-to-end tests - MongoDB not available')
    return
  }

  let dbManager: MongoDatabaseManager
  let seederManager: SeederManager

  await t.before(async () => {
    dbManager = new MongoDatabaseManager(testConfig)
    await dbManager.connect()
    seederManager = new SeederManager(testConfig, dbManager)
  })

  await t.after(async () => {
    if (dbManager) {
      // Clean up test data
      try {
        const db = dbManager.db()
        await db.collection('test_users').deleteMany({})
        await db.collection('test_posts').deleteMany({})
      } catch (error) {
        // Ignore cleanup errors
      }
      await dbManager.close()
    }
  })

  await t.test('should create and execute a real seeder', async () => {
    // Create a test seeder file
    const seederContent = `
import { BaseSeeder } from '../../../src/seeders/base_seeder.js'

export default class TestUserSeeder extends BaseSeeder {
  static environment = ['development', 'testing']

  async run(): Promise<void> {
    const collection = this.getCollection('test_users')
    
    await collection.insertMany([
      {
        name: 'Integration Test User 1',
        email: 'integration1@test.com',
        createdAt: new Date(),
      },
      {
        name: 'Integration Test User 2', 
        email: 'integration2@test.com',
        createdAt: new Date(),
      },
    ])
  }
}
`

    const seederPath = join(seedersDir, 'test_user_seeder.ts')
    await writeFile(seederPath, seederContent)

    // Verify file was created
    await access(seederPath)

    // Execute the seeder
    const results = await seederManager.run({
      files: [seederPath],
      environment: 'testing',
    })

    // Verify execution results
    assert.strictEqual(results.length, 1)
    assert.strictEqual(results[0].executed, true)
    assert.strictEqual(results[0].name, 'TestUserSeeder')
    assert.ok(results[0].executionTime !== undefined)

    // Verify data was inserted into database
    const db = dbManager.db()
    const users = await db.collection('test_users').find({}).toArray()

    assert.strictEqual(users.length, 2)
    assert.strictEqual(users[0].name, 'Integration Test User 1')
    assert.strictEqual(users[1].name, 'Integration Test User 2')
  })

  await t.test('should handle seeder with environment restrictions', async () => {
    // Create a production-only seeder
    const seederContent = `
import { BaseSeeder } from '../../../src/seeders/base_seeder.js'

export default class ProductionSeeder extends BaseSeeder {
  static environment = ['production']

  async run(): Promise<void> {
    const collection = this.getCollection('test_posts')
    await collection.insertOne({
      title: 'Production Post',
      content: 'This should not run in testing',
    })
  }
}
`

    const seederPath = join(seedersDir, 'production_seeder.ts')
    await writeFile(seederPath, seederContent)

    // Execute the seeder in testing environment
    const results = await seederManager.run({
      files: [seederPath],
      environment: 'testing',
    })

    // Verify seeder was skipped
    assert.strictEqual(results.length, 1)
    assert.strictEqual(results[0].executed, false)
    assert.ok(results[0].skipReason?.includes('Environment restriction'))

    // Verify no data was inserted
    const db = dbManager.db()
    const posts = await db.collection('test_posts').find({}).toArray()
    assert.strictEqual(posts.length, 0)
  })

  await t.test('should discover and run multiple seeders', async () => {
    // Create multiple seeder files
    const seeder1Content = `
import { BaseSeeder } from '../../../src/seeders/base_seeder.js'

export default class FirstSeeder extends BaseSeeder {
  async run(): Promise<void> {
    const collection = this.getCollection('test_users')
    await collection.insertOne({
      name: 'First Seeder User',
      email: 'first@test.com',
      source: 'first_seeder',
    })
  }
}
`

    const seeder2Content = `
import { BaseSeeder } from '../../../src/seeders/base_seeder.js'

export default class SecondSeeder extends BaseSeeder {
  async run(): Promise<void> {
    const collection = this.getCollection('test_users')
    await collection.insertOne({
      name: 'Second Seeder User',
      email: 'second@test.com',
      source: 'second_seeder',
    })
  }
}
`

    await writeFile(join(seedersDir, 'first_seeder.ts'), seeder1Content)
    await writeFile(join(seedersDir, 'second_seeder.ts'), seeder2Content)

    // Run all seeders in directory
    const results = await seederManager.run()

    // Verify both seeders executed
    const executedResults = results.filter((r) => r.executed)
    assert.ok(executedResults.length >= 2, 'Should execute at least 2 seeders')

    // Verify data from both seeders
    const db = dbManager.db()
    const users = await db
      .collection('test_users')
      .find({
        source: { $in: ['first_seeder', 'second_seeder'] },
      })
      .toArray()

    assert.ok(users.length >= 2, 'Should have users from both seeders')
  })
})

test('Seeder Integration - Error Handling', async (t) => {
  const mongoAvailable = await isMongoAvailable()

  if (!mongoAvailable) {
    console.log('⚠️  Skipping error handling tests - MongoDB not available')
    return
  }

  let dbManager: MongoDatabaseManager
  let seederManager: SeederManager

  await t.before(async () => {
    dbManager = new MongoDatabaseManager(testConfig)
    await dbManager.connect()
    seederManager = new SeederManager(testConfig, dbManager)
  })

  await t.after(async () => {
    if (dbManager) {
      await dbManager.close()
    }
  })

  await t.test('should handle seeder execution errors gracefully', async () => {
    // Create a seeder that will fail
    const failingSeederContent = `
import { BaseSeeder } from '../../../src/seeders/base_seeder.js'

export default class FailingSeeder extends BaseSeeder {
  async run(): Promise<void> {
    throw new Error('Intentional seeder failure for testing')
  }
}
`

    const seederPath = join(seedersDir, 'failing_seeder.ts')
    await writeFile(seederPath, failingSeederContent)

    // Execute the failing seeder
    const results = await seederManager.run({
      files: [seederPath],
    })

    // Verify error was captured
    assert.strictEqual(results.length, 1)
    assert.strictEqual(results[0].executed, false)
    assert.ok(results[0].error)
    assert.ok(results[0].error.message.includes('Intentional seeder failure'))
  })

  await t.test('should handle invalid seeder files', async () => {
    // Create an invalid seeder file
    const invalidSeederContent = `
// This is not a valid seeder - missing export and BaseSeeder extension
class InvalidSeeder {
  async run() {
    console.log('This should not work')
  }
}
`

    const seederPath = join(seedersDir, 'invalid_seeder.ts')
    await writeFile(seederPath, invalidSeederContent)

    // Execute the invalid seeder
    const results = await seederManager.run({
      files: [seederPath],
    })

    // Verify error was captured
    assert.strictEqual(results.length, 1)
    assert.strictEqual(results[0].executed, false)
    assert.ok(results[0].error)
    assert.ok(results[0].error.message.includes('Failed to load seeder'))
  })
})
