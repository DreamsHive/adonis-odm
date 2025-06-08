import { test } from 'node:test'
import assert from 'node:assert'
import { BaseSeeder } from '../../../src/seeders/base_seeder.js'
import type { MongoDatabaseManager } from '../../../src/database_manager.js'

// Mock implementation for testing
class TestSeeder extends BaseSeeder {
  async run(): Promise<void> {
    // Test implementation
  }
}

class EnvironmentRestrictedSeeder extends BaseSeeder {
  static environment = ['development', 'testing']

  async run(): Promise<void> {
    // Test implementation
  }
}

class ProductionOnlySeeder extends BaseSeeder {
  static environment = ['production']

  async run(): Promise<void> {
    // Test implementation
  }
}

// Mock database manager
const createMockDatabaseManager = (): MongoDatabaseManager => {
  return {
    db: (connection?: string) => ({
      collection: (name: string) => ({
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

test('BaseSeeder - Constructor and Properties', async (t) => {
  await t.test('should initialize with client and connection', () => {
    const mockClient = createMockDatabaseManager()
    const seeder = new TestSeeder(mockClient, 'test-connection')

    assert.strictEqual(seeder['client'], mockClient)
    assert.strictEqual(seeder['connection'], 'test-connection')
  })

  await t.test('should initialize with client and no connection', () => {
    const mockClient = createMockDatabaseManager()
    const seeder = new TestSeeder(mockClient)

    assert.strictEqual(seeder['client'], mockClient)
    assert.strictEqual(seeder['connection'], undefined)
  })

  await t.test('should provide access to database instance', () => {
    const mockClient = createMockDatabaseManager()
    const seeder = new TestSeeder(mockClient, 'test-connection')

    const db = seeder['getDatabase']()
    assert.ok(db, 'Database instance should be available')
  })
})

test('BaseSeeder - Environment Restrictions', async (t) => {
  await t.test('should run in any environment when no restrictions', () => {
    assert.strictEqual(TestSeeder.shouldRun('development'), true)
    assert.strictEqual(TestSeeder.shouldRun('production'), true)
    assert.strictEqual(TestSeeder.shouldRun('testing'), true)
    assert.strictEqual(TestSeeder.shouldRun('custom'), true)
  })

  await t.test('should respect environment restrictions', () => {
    assert.strictEqual(EnvironmentRestrictedSeeder.shouldRun('development'), true)
    assert.strictEqual(EnvironmentRestrictedSeeder.shouldRun('testing'), true)
    assert.strictEqual(EnvironmentRestrictedSeeder.shouldRun('production'), false)
    assert.strictEqual(EnvironmentRestrictedSeeder.shouldRun('staging'), false)
  })

  await t.test('should handle production-only seeders', () => {
    assert.strictEqual(ProductionOnlySeeder.shouldRun('production'), true)
    assert.strictEqual(ProductionOnlySeeder.shouldRun('development'), false)
    assert.strictEqual(ProductionOnlySeeder.shouldRun('testing'), false)
  })

  await t.test('should handle empty environment array', () => {
    class EmptyEnvironmentSeeder extends BaseSeeder {
      static environment: string[] = []
      async run(): Promise<void> {}
    }

    // According to the BaseSeeder implementation, empty array means run in all environments
    assert.strictEqual(EmptyEnvironmentSeeder.shouldRun('development'), true)
    assert.strictEqual(EmptyEnvironmentSeeder.shouldRun('production'), true)
  })
})

test('BaseSeeder - Abstract Method Enforcement', async (t) => {
  await t.test('should enforce abstract run method implementation', () => {
    // This test verifies that BaseSeeder is properly abstract
    // and requires run() method implementation

    class IncompleteSeeder extends BaseSeeder {
      // Missing run() method implementation
    }

    const mockClient = createMockDatabaseManager()
    const seeder = new IncompleteSeeder(mockClient)

    // TypeScript should catch this at compile time, but we can test runtime behavior
    assert.throws(() => {
      // @ts-expect-error - Testing runtime behavior of abstract method
      seeder.run()
    }, /not a function/)
  })

  await t.test('should allow proper implementation of run method', async () => {
    let executed = false

    class ProperSeeder extends BaseSeeder {
      async run(): Promise<void> {
        executed = true
      }
    }

    const mockClient = createMockDatabaseManager()
    const seeder = new ProperSeeder(mockClient)

    await seeder.run()
    assert.strictEqual(executed, true)
  })
})

test('BaseSeeder - Database Access', async (t) => {
  await t.test('should provide access to collections through database', () => {
    const mockClient = createMockDatabaseManager()
    const seeder = new TestSeeder(mockClient, 'test-connection')

    const db = seeder['getDatabase']()
    const collection = db.collection('test-collection')

    assert.ok(collection, 'Collection should be accessible')
    assert.ok(collection.insertOne, 'Collection methods should be available')
  })

  await t.test('should use correct connection when specified', () => {
    const mockClient = createMockDatabaseManager()
    let usedConnection: string | undefined

    // Override db method to capture connection parameter
    mockClient.db = (connection?: string) => {
      usedConnection = connection
      return {
        collection: () => ({}),
      } as any
    }

    const seeder = new TestSeeder(mockClient, 'custom-connection')
    seeder['getDatabase']()

    assert.strictEqual(usedConnection, 'custom-connection')
  })

  await t.test('should use default connection when none specified', () => {
    const mockClient = createMockDatabaseManager()
    let usedConnection: string | undefined

    // Override db method to capture connection parameter
    mockClient.db = (connection?: string) => {
      usedConnection = connection
      return {
        collection: () => ({}),
      } as any
    }

    const seeder = new TestSeeder(mockClient)
    seeder['getDatabase']()

    assert.strictEqual(usedConnection, undefined)
  })
})

test('BaseSeeder - Helper Methods', async (t) => {
  await t.test('should provide getCollection helper method', () => {
    const mockClient = createMockDatabaseManager()
    const seeder = new TestSeeder(mockClient)

    const collection = seeder['getCollection']('users')
    assert.ok(collection, 'getCollection should return a collection')
  })

  await t.test('should handle collection operations', async () => {
    const mockClient = createMockDatabaseManager()
    const seeder = new TestSeeder(mockClient)

    const collection = seeder['getCollection']('users')

    // Test basic operations
    const insertResult = await collection.insertOne({ name: 'Test User' })
    assert.ok(insertResult.insertedId, 'Insert operation should work')

    const findResult = await collection.find({}).toArray()
    assert.ok(Array.isArray(findResult), 'Find operation should work')
  })
})

test('BaseSeeder - Error Handling', async (t) => {
  await t.test('should handle database connection errors gracefully', async () => {
    const mockClient = {
      db: () => {
        throw new Error('Connection failed')
      },
    } as any

    const seeder = new TestSeeder(mockClient)

    assert.throws(() => {
      seeder['getDatabase']()
    }, /Connection failed/)
  })

  await t.test('should handle collection operation errors', async () => {
    const mockClient = {
      db: () => ({
        collection: () => ({
          insertOne: async () => {
            throw new Error('Insert failed')
          },
        }),
      }),
      collection: () => ({
        insertOne: async () => {
          throw new Error('Insert failed')
        },
      }),
    } as any

    const seeder = new TestSeeder(mockClient)
    const collection = seeder['getCollection']('users')

    await assert.rejects(collection.insertOne({ name: 'Test' }), /Insert failed/)
  })
})
