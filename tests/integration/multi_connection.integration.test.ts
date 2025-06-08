import { test } from 'node:test'
import assert from 'node:assert'
import { writeFile, mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { MongoDatabaseManager } from '../../src/database_manager.js'
import { SeederManager } from '../../src/seeders/seeder_manager.js'
import { defineConfig } from '../../src/config/odm_config.js'
import type { OdmConfig } from '../../src/types/index.js'

// Multi-connection test configuration
const multiConnectionConfig: OdmConfig = defineConfig({
  connection: 'primary',
  connections: {
    primary: {
      client: 'mongodb',
      connection: {
        url: process.env.MONGO_URL || 'mongodb://localhost:27017/adonis_odm_test_primary',
      },
    },
    secondary: {
      client: 'mongodb',
      connection: {
        url:
          process.env.MONGO_SECONDARY_URL || 'mongodb://localhost:27017/adonis_odm_test_secondary',
      },
    },
    tenant: {
      client: 'mongodb',
      connection: {
        url: process.env.MONGO_TENANT_URL || 'mongodb://localhost:27017/adonis_odm_test_tenant',
      },
    },
  },
  seeders: {
    paths: ['./tests/temp/integration/multi-connection/seeders'],
    defaultConnection: 'primary',
  },
})

// Test directories
const testDir = './tests/temp/integration/multi-connection'
const seedersDir = join(testDir, 'seeders')

// Helper function to check if MongoDB is available
async function isMongoAvailable(): Promise<boolean> {
  try {
    const dbManager = new MongoDatabaseManager(multiConnectionConfig)
    await dbManager.connect()
    await dbManager.close()
    return true
  } catch (error) {
    console.warn('MongoDB not available for multi-connection tests:', error.message)
    return false
  }
}

test('Multi-Connection Integration Tests Setup', async (t) => {
  await t.before(async () => {
    // Clean up any existing test directories
    await rm(testDir, { recursive: true, force: true })
    await mkdir(seedersDir, { recursive: true })
  })

  await t.after(async () => {
    // Clean up test directories
    await rm(testDir, { recursive: true, force: true })
  })

  await t.test('should have MongoDB available for multi-connection tests', async () => {
    const mongoAvailable = await isMongoAvailable()
    if (!mongoAvailable) {
      console.log('⚠️  Skipping multi-connection tests - MongoDB not available')
      return
    }
    assert.ok(mongoAvailable, 'MongoDB should be available for multi-connection tests')
  })
})

test('Multi-Connection Seeder Execution', async (t) => {
  const mongoAvailable = await isMongoAvailable()

  if (!mongoAvailable) {
    console.log('⚠️  Skipping multi-connection execution tests - MongoDB not available')
    return
  }

  let dbManager: MongoDatabaseManager
  let seederManager: SeederManager

  await t.before(async () => {
    dbManager = new MongoDatabaseManager(multiConnectionConfig)
    await dbManager.connect()
    seederManager = new SeederManager(multiConnectionConfig, dbManager)
  })

  await t.after(async () => {
    if (dbManager) {
      // Clean up test data from all connections
      try {
        const primaryDb = dbManager.db('primary')
        const secondaryDb = dbManager.db('secondary')
        const tenantDb = dbManager.db('tenant')

        await primaryDb.collection('primary_users').deleteMany({})
        await secondaryDb.collection('secondary_data').deleteMany({})
        await tenantDb.collection('tenant_settings').deleteMany({})
      } catch (error) {
        // Ignore cleanup errors
      }
      await dbManager.close()
    }
  })

  await t.test('should execute seeder on default connection', async () => {
    // Create seeder that uses default connection
    const seederContent = `
import { BaseSeeder } from '../../../src/seeders/base_seeder.js'

export default class DefaultConnectionSeeder extends BaseSeeder {
  async run(): Promise<void> {
    const collection = this.getCollection('primary_users')
    
    await collection.insertMany([
      {
        name: 'Primary User 1',
        email: 'primary1@test.com',
        connection: 'primary',
        createdAt: new Date(),
      },
      {
        name: 'Primary User 2',
        email: 'primary2@test.com',
        connection: 'primary',
        createdAt: new Date(),
      },
    ])
  }
}
`

    const seederPath = join(seedersDir, 'default_connection_seeder.ts')
    await writeFile(seederPath, seederContent)

    // Execute seeder (should use default connection 'primary')
    const results = await seederManager.run({
      files: [seederPath],
    })

    // Verify execution
    assert.strictEqual(results.length, 1)
    assert.strictEqual(results[0].executed, true)

    // Verify data was inserted into primary database
    const primaryDb = dbManager.db('primary')
    const users = await primaryDb.collection('primary_users').find({}).toArray()

    assert.strictEqual(users.length, 2)
    assert.strictEqual(users[0].connection, 'primary')
  })

  await t.test('should execute seeder on specific connection', async () => {
    // Create seeder that uses specific connection
    const seederContent = `
import { BaseSeeder } from '../../../src/seeders/base_seeder.js'

export default class SecondaryConnectionSeeder extends BaseSeeder {
  async run(): Promise<void> {
    const collection = this.getCollection('secondary_data')
    
    await collection.insertMany([
      {
        type: 'analytics',
        value: 100,
        connection: 'secondary',
        createdAt: new Date(),
      },
      {
        type: 'metrics',
        value: 200,
        connection: 'secondary',
        createdAt: new Date(),
      },
    ])
  }
}
`

    const seederPath = join(seedersDir, 'secondary_connection_seeder.ts')
    await writeFile(seederPath, seederContent)

    // Execute seeder on secondary connection
    const results = await seederManager.run({
      files: [seederPath],
      connection: 'secondary',
    })

    // Verify execution
    assert.strictEqual(results.length, 1)
    assert.strictEqual(results[0].executed, true)

    // Verify data was inserted into secondary database
    const secondaryDb = dbManager.db('secondary')
    const data = await secondaryDb.collection('secondary_data').find({}).toArray()

    assert.strictEqual(data.length, 2)
    assert.strictEqual(data[0].connection, 'secondary')

    // Verify data was NOT inserted into primary database
    const primaryDb = dbManager.db('primary')
    const primaryData = await primaryDb.collection('secondary_data').find({}).toArray()
    assert.strictEqual(primaryData.length, 0)
  })

  await t.test('should handle tenant-specific seeding', async () => {
    // Create tenant-specific seeder
    const seederContent = `
import { BaseSeeder } from '../../../src/seeders/base_seeder.js'

export default class TenantSeeder extends BaseSeeder {
  async run(): Promise<void> {
    const collection = this.getCollection('tenant_settings')
    
    await collection.insertMany([
      {
        tenantId: 'tenant-001',
        setting: 'theme',
        value: 'dark',
        createdAt: new Date(),
      },
      {
        tenantId: 'tenant-001',
        setting: 'language',
        value: 'en',
        createdAt: new Date(),
      },
    ])
  }
}
`

    const seederPath = join(seedersDir, 'tenant_seeder.ts')
    await writeFile(seederPath, seederContent)

    // Execute seeder on tenant connection
    const results = await seederManager.run({
      files: [seederPath],
      connection: 'tenant',
    })

    // Verify execution
    assert.strictEqual(results.length, 1)
    assert.strictEqual(results[0].executed, true)

    // Verify data was inserted into tenant database
    const tenantDb = dbManager.db('tenant')
    const settings = await tenantDb.collection('tenant_settings').find({}).toArray()

    assert.strictEqual(settings.length, 2)
    assert.strictEqual(settings[0].tenantId, 'tenant-001')
  })

  await t.test('should handle multiple seeders across different connections', async () => {
    // Create seeders for different connections
    const primarySeederContent = `
import { BaseSeeder } from '../../../src/seeders/base_seeder.js'

export default class MultiPrimarySeeder extends BaseSeeder {
  async run(): Promise<void> {
    const collection = this.getCollection('multi_test_primary')
    await collection.insertOne({
      source: 'primary_seeder',
      timestamp: new Date(),
    })
  }
}
`

    const secondarySeederContent = `
import { BaseSeeder } from '../../../src/seeders/base_seeder.js'

export default class MultiSecondarySeeder extends BaseSeeder {
  async run(): Promise<void> {
    const collection = this.getCollection('multi_test_secondary')
    await collection.insertOne({
      source: 'secondary_seeder',
      timestamp: new Date(),
    })
  }
}
`

    await writeFile(join(seedersDir, 'multi_primary_seeder.ts'), primarySeederContent)
    await writeFile(join(seedersDir, 'multi_secondary_seeder.ts'), secondarySeederContent)

    // Execute primary seeder on primary connection
    const primaryResults = await seederManager.run({
      files: [join(seedersDir, 'multi_primary_seeder.ts')],
      connection: 'primary',
    })

    // Execute secondary seeder on secondary connection
    const secondaryResults = await seederManager.run({
      files: [join(seedersDir, 'multi_secondary_seeder.ts')],
      connection: 'secondary',
    })

    // Verify both executions
    assert.strictEqual(primaryResults.length, 1)
    assert.strictEqual(primaryResults[0].executed, true)
    assert.strictEqual(secondaryResults.length, 1)
    assert.strictEqual(secondaryResults[0].executed, true)

    // Verify data in respective databases
    const primaryDb = dbManager.db('primary')
    const secondaryDb = dbManager.db('secondary')

    const primaryData = await primaryDb.collection('multi_test_primary').find({}).toArray()
    const secondaryData = await secondaryDb.collection('multi_test_secondary').find({}).toArray()

    assert.strictEqual(primaryData.length, 1)
    assert.strictEqual(primaryData[0].source, 'primary_seeder')
    assert.strictEqual(secondaryData.length, 1)
    assert.strictEqual(secondaryData[0].source, 'secondary_seeder')
  })
})

test('Multi-Connection Error Handling', async (t) => {
  const mongoAvailable = await isMongoAvailable()

  if (!mongoAvailable) {
    console.log('⚠️  Skipping multi-connection error tests - MongoDB not available')
    return
  }

  let dbManager: MongoDatabaseManager
  let seederManager: SeederManager

  await t.before(async () => {
    dbManager = new MongoDatabaseManager(multiConnectionConfig)
    await dbManager.connect()
    seederManager = new SeederManager(multiConnectionConfig, dbManager)
  })

  await t.after(async () => {
    if (dbManager) {
      await dbManager.close()
    }
  })

  await t.test('should handle invalid connection names gracefully', async () => {
    // Create a simple seeder
    const seederContent = `
import { BaseSeeder } from '../../../src/seeders/base_seeder.js'

export default class InvalidConnectionSeeder extends BaseSeeder {
  async run(): Promise<void> {
    const collection = this.getCollection('test_data')
    await collection.insertOne({ test: true })
  }
}
`

    const seederPath = join(seedersDir, 'invalid_connection_seeder.ts')
    await writeFile(seederPath, seederContent)

    // Execute seeder with invalid connection
    const results = await seederManager.run({
      files: [seederPath],
      connection: 'non-existent-connection',
    })

    // Should handle error gracefully
    assert.strictEqual(results.length, 1)
    assert.strictEqual(results[0].executed, false)
    assert.ok(results[0].error)
    assert.ok(
      results[0].error.message.includes('connection') ||
        results[0].error.message.includes('not found')
    )
  })

  await t.test('should handle connection failures during seeding', async () => {
    // Create config with invalid connection URL
    const invalidConfig = defineConfig({
      connection: 'invalid',
      connections: {
        invalid: {
          client: 'mongodb',
          connection: {
            url: 'mongodb://invalid-host:27017/test',
          },
        },
      },
      seeders: {
        paths: [seedersDir],
        defaultConnection: 'invalid',
      },
    })

    const invalidDbManager = new MongoDatabaseManager(invalidConfig)
    const invalidSeederManager = new SeederManager(invalidConfig, invalidDbManager)

    // Create a simple seeder
    const seederContent = `
import { BaseSeeder } from '../../../src/seeders/base_seeder.js'

export default class ConnectionFailureSeeder extends BaseSeeder {
  async run(): Promise<void> {
    const collection = this.getCollection('test_data')
    await collection.insertOne({ test: true })
  }
}
`

    const seederPath = join(seedersDir, 'connection_failure_seeder.ts')
    await writeFile(seederPath, seederContent)

    // Execute seeder with invalid connection
    const results = await invalidSeederManager.run({
      files: [seederPath],
    })

    // Should handle connection failure gracefully
    assert.strictEqual(results.length, 1)
    assert.strictEqual(results[0].executed, false)
    assert.ok(results[0].error)
  })
})
