import { test } from 'node:test'
import assert from 'node:assert'
import { BaseModel } from '../src/base_model/base_model.js'
import { column, beforeSave } from '../src/decorators/column.js'
import { MongoDatabaseManager } from '../src/database_manager.js'
import { defineConfig } from '../src/config/odm_config.js'

// Mock MongoDB connection for testing
const mockConfig = defineConfig({
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

test('integration: model definition and configuration work together', () => {
  class User extends BaseModel {
    static tableName = 'users'

    @column({ isPrimary: true })
    declare _id: string

    @column()
    declare name: string

    @column()
    declare email: string

    @column()
    declare encryptedPassword: string

    @beforeSave()
    static async hashPassword(user: User) {
      if (user.$dirty.encryptedPassword) {
        // Mock password hashing
        user.encryptedPassword = `hashed_${user.encryptedPassword}`
      }
    }
  }

  // Test model metadata
  const metadata = User.getMetadata()
  assert.ok(metadata, 'Model should have metadata')
  assert.ok(metadata.columns.has('_id'), 'Should have _id column')
  assert.ok(metadata.columns.has('name'), 'Should have name column')
  assert.ok(metadata.columns.has('email'), 'Should have email column')

  // Test primary key detection
  const primaryColumn = metadata.columns.get('_id')
  assert.ok(primaryColumn?.isPrimary, '_id should be marked as primary')

  // Test configuration
  assert.equal(mockConfig.connection, 'mongodb', 'Default connection should be mongodb')
  assert.ok(mockConfig.connections.mongodb, 'MongoDB connection should be defined')
})

test('integration: model instance creation and dirty tracking', () => {
  class Post extends BaseModel {
    static tableName = 'posts'

    @column({ isPrimary: true })
    declare _id: string

    @column()
    declare title: string

    @column()
    declare content: string

    @column()
    declare publishedAt: Date
  }

  // Create new instance
  const post = new Post()
  assert.ok(post.$isNew, 'New instance should be marked as new')
  assert.equal(post.$isPersisted, false, 'New instance should not be persisted')

  // Test property assignment and dirty tracking
  post.title = 'Test Post'
  post.content = 'This is a test post'

  assert.ok(post.$dirty.title, 'Title should be marked as dirty')
  assert.ok(post.$dirty.content, 'Content should be marked as dirty')
  assert.equal(Object.keys(post.$dirty).length, 2, 'Should have 2 dirty properties')
})

test('integration: hook execution with model lifecycle', async () => {
  let hookCalled = false
  let hookData: any = null

  class Product extends BaseModel {
    static tableName = 'products'

    @column({ isPrimary: true })
    declare _id: string

    @column()
    declare name: string

    @column()
    declare price: number

    @beforeSave()
    static async validatePrice(product: Product) {
      hookCalled = true
      hookData = { name: product.name, price: product.price }

      if (product.price < 0) {
        throw new Error('Price cannot be negative')
      }
    }
  }

  const product = new Product()
  product.name = 'Test Product'
  product.price = 99.99

  // Manually trigger hook for testing
  const hooks = Product.getMetadata().hooks?.get('beforeSave') || []
  assert.ok(hooks.length > 0, 'Should have beforeSave hooks')

  // Execute hook
  await (Product as any).validatePrice(product)

  assert.ok(hookCalled, 'Hook should have been called')
  assert.equal(hookData.name, 'Test Product', 'Hook should receive correct data')
  assert.equal(hookData.price, 99.99, 'Hook should receive correct price')
})

test('integration: query builder integration with models', () => {
  class Category extends BaseModel {
    static tableName = 'categories'

    @column({ isPrimary: true })
    declare _id: string

    @column()
    declare name: string

    @column()
    declare description: string
  }

  // Test query builder creation
  const query = Category.query()
  assert.ok(query, 'Should be able to create query builder')

  // Test method chaining
  const chainedQuery = query
    .where('name', 'Electronics')
    .where('description', 'like', '%gadgets%')
    .orderBy('name', 'asc')
    .limit(10)

  assert.ok(chainedQuery, 'Should support method chaining')
  assert.equal(chainedQuery, query, 'Should return same instance for chaining')
})

test('integration: database manager configuration', () => {
  // Test database manager can be created with config
  assert.doesNotThrow(() => {
    new MongoDatabaseManager(mockConfig)
  }, 'Should be able to create database manager with valid config')

  const dbManager = new MongoDatabaseManager(mockConfig)

  // Test connection name resolution
  assert.equal(
    dbManager.getDefaultConnectionName(),
    'mongodb',
    'Should return default connection name'
  )

  // Test connection config retrieval
  const connectionConfig = dbManager.getConnectionConfig('mongodb')
  assert.ok(connectionConfig, 'Should return connection config')
  assert.equal(connectionConfig.client, 'mongodb', 'Should have correct client type')
})
