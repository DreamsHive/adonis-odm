import { test } from '@japa/runner'
import { BaseModel } from '../../src/base_model/base_model.js'
import { column, hasOne } from '../../src/decorators/column.js'
import { DateTime } from 'luxon'
import { ObjectId } from 'mongodb'
import type { HasOne } from '../../src/types/relationships.js'
import { MongoDatabaseManager } from '../../src/database_manager.js'
import { MongoConfig } from '../../src/types/index.js'
import { ModelQueryBuilder } from '../../src/query_builder/model_query_builder.js'

// Test models for nested document testing
class TestEmbeddedModel extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare name: string

  @column.embedded()
  declare profile?: {
    firstName: string
    lastName: string
    bio?: string
  }

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  static getCollectionName(): string {
    return 'test_embedded'
  }
}

class Profile extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare firstName: string

  @column()
  declare lastName: string

  @column()
  declare bio?: string

  @column()
  declare userId?: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  static getCollectionName(): string {
    return 'test_profiles'
  }
}

class TestReferencedModel extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare name: string

  // Using new Lucid-style hasOne decorator - auto-registers models
  @hasOne(() => Profile, {
    localKey: '_id',
    foreignKey: 'userId',
  })
  declare profile: HasOne<typeof Profile>

  @column()
  declare profileId?: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  static getCollectionName(): string {
    return 'test_referenced'
  }
}

test.group('Nested Document Decorators - Unit Tests', (group) => {
  let manager: MongoDatabaseManager
  let isDockerAvailable = false

  group.setup(async () => {
    // Real MongoDB configuration for decorator testing
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
      console.log('✅ Docker MongoDB is available for decorator tests')

      // Setup real database operations for test models
      const setupRealModel = (ModelClass: any) => {
        ModelClass.query = function () {
          const collectionName = this.getCollectionName()
          const connectionName = this.getConnection()
          const collection = manager.collection(collectionName, connectionName)
          return new ModelQueryBuilder(collection, this)
        }

        ModelClass.prototype['performInsert'] = async function () {
          const collection = manager.collection(ModelClass.getCollectionName())
          const document = this.toDocument()
          const result = await collection.insertOne(document)
          this._id = result.insertedId.toString()
        }

        ModelClass.prototype['performUpdate'] = async function () {
          const collection = manager.collection(ModelClass.getCollectionName())
          const updates = this.getDirtyAttributes()

          if (Object.keys(updates).length > 0) {
            await collection.updateOne({ _id: new ObjectId(this._id) }, { $set: updates })
          }
        }
      }

      setupRealModel(TestEmbeddedModel)
      setupRealModel(TestReferencedModel)
      setupRealModel(Profile)

      // Clean up test collections
      await manager.collection('test_embedded').deleteMany({})
      await manager.collection('test_referenced').deleteMany({})
      await manager.collection('test_profiles').deleteMany({})
    } catch (error) {
      console.log(
        '⚠️  Docker MongoDB not available, decorator tests will run without database operations'
      )
      isDockerAvailable = false
    }
  })

  group.teardown(async () => {
    if (isDockerAvailable) {
      try {
        await manager.collection('test_embedded').deleteMany({})
        await manager.collection('test_referenced').deleteMany({})
        await manager.collection('test_profiles').deleteMany({})
        await manager.close()
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  })
  test('should create embedded document metadata', async ({ assert }) => {
    const metadata = TestEmbeddedModel.getMetadata()

    assert.isTrue(metadata.columns.has('profile'))
    const profileColumn = metadata.columns.get('profile')
    assert.isTrue(profileColumn?.isEmbedded)
  })

  test('should create reference document metadata with auto-registration', async ({ assert }) => {
    const metadata = TestReferencedModel.getMetadata()

    assert.isTrue(metadata.columns.has('profile'))
    const profileColumn = metadata.columns.get('profile')
    assert.isTrue(profileColumn?.isReference)
    assert.equal(profileColumn?.model, 'Profile')
    assert.equal(profileColumn?.localKey, '_id')
    assert.equal(profileColumn?.foreignKey, 'userId')
  })

  test('should exclude reference fields from document serialization', async ({ assert }) => {
    const model = new TestReferencedModel({
      name: 'Test User',
      profileId: 'profile123',
    })

    const document = model.toDocument()

    // Should include regular fields and foreign key
    assert.equal(document.name, 'Test User')
    assert.equal(document.profileId, 'profile123')

    // Should exclude virtual reference field
    assert.isUndefined(document.profile)
  })

  test('should exclude reference fields from dirty attributes', async ({ assert }) => {
    const model = new TestReferencedModel({
      name: 'Test User',
    })

    // Simulate setting a reference field (this would be done by the proxy system)
    model.setAttribute('profile', { firstName: 'John', lastName: 'Doe' })

    const dirty = model.getDirtyAttributes()

    // Should not include the virtual reference field in dirty attributes
    assert.isUndefined(dirty.profile)
  })

  test('should handle embedded document serialization', async ({ assert }) => {
    const model = new TestEmbeddedModel({
      name: 'Test User',
      profile: {
        firstName: 'John',
        lastName: 'Doe',
        bio: 'Software Developer',
      },
    })

    const document = model.toDocument()

    // Should include embedded document
    assert.equal(document.name, 'Test User')
    assert.isDefined(document.profile)
    assert.equal(document.profile.firstName, 'John')
    assert.equal(document.profile.lastName, 'Doe')
    assert.equal(document.profile.bio, 'Software Developer')
  })

  test('should track embedded document changes in dirty attributes', async ({ assert }) => {
    const model = new TestEmbeddedModel({
      name: 'Test User',
      profile: {
        firstName: 'John',
        lastName: 'Doe',
      },
    })

    // Mark as persisted to test dirty tracking
    model.$isPersisted = true
    model.$isLocal = false
    model.syncOriginal()

    // Update embedded document
    model.profile = {
      firstName: 'Jane',
      lastName: 'Smith',
      bio: 'UX Designer',
    }

    const dirty = model.getDirtyAttributes()

    // Should include the embedded document in dirty attributes
    assert.isDefined(dirty.profile)
    assert.equal(dirty.profile.firstName, 'Jane')
    assert.equal(dirty.profile.lastName, 'Smith')
    assert.equal(dirty.profile.bio, 'UX Designer')
  })
})
