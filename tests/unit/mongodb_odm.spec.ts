import { test } from '@japa/runner'
import { BaseModel } from '../../src/base_model/base_model.js'
import { column } from '../../src/decorators/column.js'
import { DateTime } from 'luxon'
import { MongoDatabaseManager } from '../../src/database_manager.js'
import { MongoConfig } from '../../src/types/index.js'
import { ModelQueryBuilder } from '../../src/query_builder/model_query_builder.js'
import { ObjectId } from 'mongodb'

// Test model
class TestUser extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare name: string

  @column()
  declare email: string

  @column()
  declare age?: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  static getCollectionName(): string {
    return 'test_users'
  }
}

test.group('MongoDB ODM - Unit Tests', (group) => {
  let manager: MongoDatabaseManager

  group.setup(async () => {
    // Mock configuration for unit testing
    const config: MongoConfig = {
      connection: 'mongodb',
      connections: {
        mongodb: {
          client: 'mongodb',
          connection: {
            host: 'localhost',
            port: 27017,
            database: 'test_adonis_mongo',
          },
          useNewUrlParser: true,
          useUnifiedTopology: true,
        },
      },
    }

    manager = new MongoDatabaseManager(config)

    // Extend TestUser with database functionality (similar to what the provider does)
    TestUser.query = function () {
      const collectionName = this.getCollectionName()
      const connectionName = this.getConnection()
      const collection = manager.collection(collectionName, connectionName)
      return new ModelQueryBuilder(collection, this)
    }

    // Mock database operations for unit testing
    TestUser.prototype['performInsert'] = async function () {
      this._id = 'mock_id_' + Date.now()
    }

    TestUser.prototype['performUpdate'] = async function () {
      // Mock update operation
    }
  })

  test('should create model metadata from decorators', async ({ assert }) => {
    const metadata = TestUser.getMetadata()

    assert.isTrue(metadata.columns.has('_id'))
    assert.isTrue(metadata.columns.has('name'))
    assert.isTrue(metadata.columns.has('email'))
    assert.isTrue(metadata.columns.has('age'))
    assert.isTrue(metadata.columns.has('createdAt'))
    assert.isTrue(metadata.columns.has('updatedAt'))

    assert.equal(metadata.primaryKey, '_id')
  })

  test('should generate correct collection name', async ({ assert }) => {
    assert.equal(TestUser.getCollectionName(), 'test_users')
  })

  test('should create model instance with attributes', async ({ assert }) => {
    const user = new TestUser({
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
    })

    assert.equal(user.name, 'John Doe')
    assert.equal(user.email, 'john@example.com')
    assert.equal(user.age, 30)
    assert.isTrue(user.$isLocal)
    assert.isFalse(user.$isPersisted)
  })

  test('should handle date serialization and deserialization', async ({ assert }) => {
    const now = DateTime.now()
    const user = new TestUser()

    // Test setting DateTime
    user.setAttribute('createdAt', now)
    assert.equal(user.createdAt.constructor.name, 'DateTime')

    // Test serialization
    const document = user.toDocument()
    assert.equal(document.createdAt.constructor.name, 'Date')
  })

  test('should track dirty attributes', async ({ assert }) => {
    const user = new TestUser({
      name: 'John Doe',
      email: 'john@example.com',
    })

    // Access private method through any casting
    ;(user as any).syncOriginal()
    user.$dirty = {}

    // Modify an attribute
    user.merge({ name: 'Jane Doe' })

    assert.deepEqual(user.$dirty, { name: 'Jane Doe' })
  })

  test('should apply auto timestamps', async ({ assert }) => {
    const user = new TestUser({
      name: 'John Doe',
      email: 'john@example.com',
    })

    // Simulate save operation by calling private method
    ;(user as any).applyTimestamps()

    assert.equal(user.createdAt.constructor.name, 'DateTime')
    assert.equal(user.updatedAt.constructor.name, 'DateTime')
  })

  test('should convert to document format', async ({ assert }) => {
    const user = new TestUser({
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
    })

    const document = user.toDocument()

    assert.equal(document.name, 'John Doe')
    assert.equal(document.email, 'john@example.com')
    assert.equal(document.age, 30)
  })

  test('should handle model save operation', async ({ assert }) => {
    const user = new TestUser({
      name: 'John Doe',
      email: 'john@example.com',
    })

    await user.save()

    assert.isTrue(user.$isPersisted)
    assert.isFalse(user.$isLocal)
    assert.isNotEmpty(user._id)
    assert.deepEqual(user.$dirty, {})
  })

  test('should support query operators', async ({ assert }) => {
    // Test that mathematical operators are supported
    const operators = ['=', '!=', '>', '>=', '<', '<=', 'eq', 'ne', 'gt', 'gte', 'lt', 'lte']

    operators.forEach((operator) => {
      assert.doesNotThrow(() => {
        // This would normally create a query, but we're just testing type compatibility
        const queryBuilder = new ModelQueryBuilder({} as any, TestUser)
        ;(queryBuilder as any).mapOperatorToMongo(operator as any)
      })
    })
  })

  test('should handle query building', async ({ assert }) => {
    const mockCollection = {
      find: () => ({ toArray: () => Promise.resolve([]) }),
      findOne: () => Promise.resolve(null),
      countDocuments: () => Promise.resolve(0),
    } as any

    const queryBuilder = new ModelQueryBuilder(mockCollection, TestUser)

    // Test method chaining
    const result = queryBuilder
      .where('age', '>=', 18)
      .where('name', 'John')
      .orderBy('createdAt', 'desc')
      .limit(10)

    assert.instanceOf(result, ModelQueryBuilder)
  })
})

test.group('MongoDB ODM - Integration Tests', (group) => {
  let manager: MongoDatabaseManager
  let isDockerAvailable = false

  group.setup(async () => {
    // Docker MongoDB configuration
    const config: MongoConfig = {
      connection: 'mongodb',
      connections: {
        mongodb: {
          client: 'mongodb',
          connection: {
            url: 'mongodb://adonis_user:adonis_password@localhost:27017/adonis_mongo',
            host: 'localhost',
            port: 27017,
            database: 'adonis_mongo',
            options: {
              maxPoolSize: 10,
              serverSelectionTimeoutMS: 5000,
              connectTimeoutMS: 10000,
            },
          },
          useNewUrlParser: true,
          useUnifiedTopology: true,
        },
      },
    }

    manager = new MongoDatabaseManager(config)

    // Test if Docker MongoDB is available
    try {
      await manager.connect()
      isDockerAvailable = true
      console.log('✅ Docker MongoDB is available for integration tests')

      // Extend TestUser with real database functionality
      TestUser.query = function () {
        const collectionName = this.getCollectionName()
        const connectionName = this.getConnection()
        const collection = manager.collection(collectionName, connectionName)
        return new ModelQueryBuilder(collection, this)
      }

      // Real database operations
      TestUser.prototype['performInsert'] = async function () {
        const collection = manager.collection(TestUser.getCollectionName())
        const document = this.toDocument()
        const result = await collection.insertOne(document)
        this._id = result.insertedId.toString()
      }

      TestUser.prototype['performUpdate'] = async function () {
        const collection = manager.collection(TestUser.getCollectionName())
        const document = this.toDocument()
        const { _id: docId, ...updateDoc } = document
        await collection.updateOne({ _id: new ObjectId(docId) }, { $set: updateDoc })
      }
      ;(TestUser.prototype as any)['performDelete'] = async function () {
        const collection = manager.collection(TestUser.getCollectionName())
        await collection.deleteOne({ _id: new ObjectId(this._id) })
      }

      // Clean up test collection before tests
      const collection = manager.collection('test_users')
      await collection.deleteMany({})
    } catch (error) {
      console.log('⚠️  Docker MongoDB not available, skipping integration tests')
      console.log('   Start MongoDB with: npm run docker:up')
      isDockerAvailable = false
    }
  })

  group.teardown(async () => {
    if (isDockerAvailable) {
      // Clean up test data
      try {
        const collection = manager.collection('test_users')
        await collection.deleteMany({})
        await manager.close()
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  })

  test('should connect to Docker MongoDB', async ({ assert }) => {
    if (!isDockerAvailable) {
      assert.plan(0)
      return
    }

    const db = manager.db()
    assert.isNotNull(db)
    assert.equal(db.databaseName, 'adonis_mongo')
  })

  test('should create and save a real user', async ({ assert }) => {
    if (!isDockerAvailable) {
      assert.plan(0)
      return
    }

    const user = new TestUser({
      name: 'Integration Test User',
      email: `test-${Date.now()}@example.com`,
      age: 25,
    })

    assert.isTrue(user.$isLocal)
    assert.isFalse(user.$isPersisted)

    await user.save()

    assert.isFalse(user.$isLocal)
    assert.isTrue(user.$isPersisted)
    assert.isNotEmpty(user._id)
    assert.equal(user.createdAt.constructor.name, 'DateTime')
    assert.equal(user.updatedAt.constructor.name, 'DateTime')
  })

  test('should query real data from MongoDB', async ({ assert }) => {
    if (!isDockerAvailable) {
      assert.plan(0)
      return
    }

    // Create test data
    const user1 = new TestUser({
      name: 'Query Test User 1',
      email: `query1-${Date.now()}@example.com`,
      age: 30,
    })
    await user1.save()

    const user2 = new TestUser({
      name: 'Query Test User 2',
      email: `query2-${Date.now()}@example.com`,
      age: 25,
    })
    await user2.save()

    // Test queries
    const allUsers = await TestUser.query().all()
    assert.isAtLeast(allUsers.length, 2)

    const adults = await TestUser.query().where('age', '>=', 25).all()
    assert.isAtLeast(adults.length, 2)

    const specificUser = await TestUser.query().where('name', 'Query Test User 1').first()
    assert.isNotNull(specificUser)
    assert.equal(specificUser?.name, 'Query Test User 1')

    // Test count
    const count = await TestUser.query().count()
    assert.isAtLeast(count, 2)
  })

  test('should handle pagination with real data', async ({ assert }) => {
    if (!isDockerAvailable) {
      assert.plan(0)
      return
    }

    // Create multiple test users
    const users = []
    for (let i = 1; i <= 5; i++) {
      const user = new TestUser({
        name: `Pagination User ${i}`,
        email: `pagination${i}-${Date.now()}@example.com`,
        age: 20 + i,
      })
      await user.save()
      users.push(user)
    }

    // Test pagination
    const page1 = await TestUser.query().orderBy('age', 'asc').paginate(1, 2)
    assert.equal(page1.data.length, 2)
    assert.isAtLeast(page1.meta.total, 5)
    assert.equal(page1.meta.currentPage, 1)
    assert.equal(page1.meta.perPage, 2)

    const page2 = await TestUser.query().orderBy('age', 'asc').paginate(2, 2)
    assert.equal(page2.data.length, 2)
    assert.equal(page2.meta.currentPage, 2)
  })

  test('should update existing records', async ({ assert }) => {
    if (!isDockerAvailable) {
      assert.plan(0)
      return
    }

    // Create a user
    const user = new TestUser({
      name: 'Update Test User',
      email: `update-${Date.now()}@example.com`,
      age: 30,
    })
    await user.save()

    const originalUpdatedAt = user.updatedAt

    // Wait a bit to ensure timestamp difference
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Update the user
    user.merge({ age: 31, name: 'Updated Test User' })
    await user.save()

    assert.equal(user.age, 31)
    assert.equal(user.name, 'Updated Test User')
    assert.isTrue(user.updatedAt > originalUpdatedAt)
  })

  test('should delete records', async ({ assert }) => {
    if (!isDockerAvailable) {
      assert.plan(0)
      return
    }

    // Create a user
    const user = new TestUser({
      name: 'Delete Test User',
      email: `delete-${Date.now()}@example.com`,
      age: 30,
    })
    await user.save()

    const userId = user._id
    assert.isNotEmpty(userId)

    // Delete the user
    await user.delete()

    // Verify it's deleted
    const deletedUser = await TestUser.query().where('_id', userId).first()
    assert.isNull(deletedUser)
  })

  test('should handle complex queries', async ({ assert }) => {
    if (!isDockerAvailable) {
      assert.plan(0)
      return
    }

    // Create test data with different ages
    const testUsers = [
      { name: 'Young User', age: 18 },
      { name: 'Adult User', age: 30 },
      { name: 'Senior User', age: 65 },
    ]

    for (const userData of testUsers) {
      const user = new TestUser({
        ...userData,
        email: `${userData.name.toLowerCase().replace(' ', '')}-${Date.now()}@example.com`,
      })
      await user.save()
    }

    // Test between query
    const middleAged = await TestUser.query().whereBetween('age', [25, 40]).all()
    assert.isAtLeast(middleAged.length, 1)

    // Test in query
    const specificAges = await TestUser.query().whereIn('age', [18, 65]).all()
    assert.isAtLeast(specificAges.length, 2)

    // Test not null query
    const usersWithAge = await TestUser.query().whereNotNull('age').all()
    assert.isAtLeast(usersWithAge.length, 3)
  })

  test('should support Lucid-style create patterns', async ({ assert }) => {
    if (!isDockerAvailable) {
      assert.plan(0)
      return
    }

    // Pattern 1: Using .create() static method (no need for new)
    const user1 = await TestUser.create({
      name: 'Create Pattern User',
      email: `create-pattern-${Date.now()}@example.com`,
      age: 28,
    })

    assert.isTrue(user1.$isPersisted)
    assert.isFalse(user1.$isLocal)
    assert.equal(user1.name, 'Create Pattern User')
    assert.equal(user1.age, 28)
    assert.isNotEmpty(user1._id)

    // Pattern 2: Using new + .save()
    const user2 = new TestUser()
    user2.name = 'New Save Pattern User'
    user2.email = `new-save-pattern-${Date.now()}@example.com`
    user2.age = 32

    assert.isTrue(user2.$isLocal)
    assert.isFalse(user2.$isPersisted)

    await user2.save()

    assert.isFalse(user2.$isLocal)
    assert.isTrue(user2.$isPersisted)
    assert.equal(user2.name, 'New Save Pattern User')
    assert.equal(user2.age, 32)
    assert.isNotEmpty(user2._id)
  })

  test('should support Lucid-style update patterns', async ({ assert }) => {
    if (!isDockerAvailable) {
      assert.plan(0)
      return
    }

    // Create a user first
    const user = await TestUser.create({
      name: 'Update Pattern User',
      email: `update-pattern-${Date.now()}@example.com`,
      age: 25,
    })

    const originalUpdatedAt = user.updatedAt
    const userId = user._id

    // Wait a bit to ensure timestamp difference
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Pattern 1: Direct property assignment + save
    user.name = 'Updated Name Direct'
    user.age = 26
    await user.save()

    assert.equal(user.name, 'Updated Name Direct')
    assert.equal(user.age, 26)
    assert.isTrue(user.updatedAt > originalUpdatedAt)

    // Pattern 2: Using .merge() + .save() (method chaining)
    const secondUpdatedAt = user.updatedAt
    await new Promise((resolve) => setTimeout(resolve, 100))

    await user.merge({ name: 'Updated Name Merge', age: 27 }).save()

    assert.equal(user.name, 'Updated Name Merge')
    assert.equal(user.age, 27)
    assert.isTrue(user.updatedAt > secondUpdatedAt)

    // Pattern 3: Using query builder .update() (bulk update)
    const updateCount = await TestUser.query()
      .where('_id', userId)
      .update({ name: 'Updated Name Query', age: 28 })

    assert.equal(updateCount, 1)

    // Verify the update by fetching the user again
    const updatedUser = await TestUser.find(userId)
    assert.isNotNull(updatedUser)
    assert.equal(updatedUser!.name, 'Updated Name Query')
    assert.equal(updatedUser!.age, 28)
  })

  test('should support Lucid-style delete patterns', async ({ assert }) => {
    if (!isDockerAvailable) {
      assert.plan(0)
      return
    }

    // Create test users
    const user1 = await TestUser.create({
      name: 'Delete Pattern User 1',
      email: `delete-pattern-1-${Date.now()}@example.com`,
      age: 30,
    })

    const user2 = await TestUser.create({
      name: 'Delete Pattern User 2',
      email: `delete-pattern-2-${Date.now()}@example.com`,
      age: 35,
    })

    const user3 = await TestUser.create({
      name: 'Delete Pattern User 3',
      email: `delete-pattern-3-${Date.now()}@example.com`,
      age: 40,
    })

    // Pattern 1: Instance delete
    const user1Id = user1._id
    const deleteResult = await user1.delete()

    assert.isTrue(deleteResult)
    assert.isFalse(user1.$isPersisted)
    assert.isTrue(user1.$isLocal)

    // Verify user1 is deleted
    const deletedUser = await TestUser.find(user1Id)
    assert.isNull(deletedUser)

    // Pattern 2: Query builder bulk delete
    const deleteCount = await TestUser.query().where('age', '>=', 35).delete()

    assert.isAtLeast(deleteCount, 2) // Should delete user2 and user3

    // Verify users are deleted
    const remainingUser2 = await TestUser.find(user2._id)
    const remainingUser3 = await TestUser.find(user3._id)
    assert.isNull(remainingUser2)
    assert.isNull(remainingUser3)
  })

  test('should support bulk operations', async ({ assert }) => {
    if (!isDockerAvailable) {
      assert.plan(0)
      return
    }

    // Test createMany
    const users = await TestUser.createMany([
      {
        name: 'Bulk User 1',
        email: `bulk-1-${Date.now()}@example.com`,
        age: 20,
      },
      {
        name: 'Bulk User 2',
        email: `bulk-2-${Date.now()}@example.com`,
        age: 25,
      },
      {
        name: 'Bulk User 3',
        email: `bulk-3-${Date.now()}@example.com`,
        age: 30,
      },
    ])

    assert.equal(users.length, 3)
    users.forEach((user) => {
      assert.isTrue(user.$isPersisted)
      assert.isFalse(user.$isLocal)
      assert.isNotEmpty(user._id)
    })

    // Test bulk update
    const updateCount = await TestUser.query()
      .where('age', '>=', 20)
      .where('name', 'like', 'Bulk User%')
      .update({ age: 99 })

    assert.isAtLeast(updateCount, 3)

    // Test bulk delete
    const deleteCount = await TestUser.query().where('age', 99).delete()

    assert.isAtLeast(deleteCount, 3)
  })

  test('should support updateOrCreate pattern', async ({ assert }) => {
    if (!isDockerAvailable) {
      assert.plan(0)
      return
    }

    const email = `update-or-create-${Date.now()}@example.com`

    // First call should create
    const user1 = await TestUser.updateOrCreate(
      { email },
      { name: 'Update Or Create User', age: 25 }
    )

    assert.isTrue(user1.$isPersisted)
    assert.equal(user1.name, 'Update Or Create User')
    assert.equal(user1.email, email)
    assert.equal(user1.age, 25)

    // Second call should update
    const user2 = await TestUser.updateOrCreate({ email }, { name: 'Updated User', age: 30 })

    assert.equal(user1._id, user2._id) // Same user
    assert.equal(user2.name, 'Updated User')
    assert.equal(user2.age, 30)

    // Verify only one user exists with this email
    const users = await TestUser.query().where('email', email).all()
    assert.equal(users.length, 1)
  })

  test('should support like operator for pattern matching', async ({ assert }) => {
    if (!isDockerAvailable) {
      assert.plan(0)
      return
    }

    // Create test users with different name patterns
    await TestUser.create({
      name: 'John Doe',
      email: `john-${Date.now()}@example.com`,
      age: 30,
    })

    await TestUser.create({
      name: 'Jane Doe',
      email: `jane-${Date.now()}@example.com`,
      age: 25,
    })

    await TestUser.create({
      name: 'Bob Smith',
      email: `bob-${Date.now()}@example.com`,
      age: 35,
    })

    // Test 'like' operator with % wildcard
    const doeUsers = await TestUser.query().where('name', 'like', '%Doe%').all()
    assert.isAtLeast(doeUsers.length, 2)

    const johnUsers = await TestUser.query().where('name', 'like', 'John%').all()
    assert.isAtLeast(johnUsers.length, 1)

    const smithUsers = await TestUser.query().where('name', 'like', '%Smith').all()
    assert.isAtLeast(smithUsers.length, 1)
  })
})
