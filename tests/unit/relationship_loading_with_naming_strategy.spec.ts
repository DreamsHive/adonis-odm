import { test } from '@japa/runner'
import { BaseModel } from '../../src/base_model/base_model.js'
import { column, hasOne, belongsTo, computed } from '../../src/decorators/column.js'
import { DateTime } from 'luxon'
import { ObjectId } from 'mongodb'
import type { HasOne, BelongsTo } from '../../src/types/relationships.js'
import { CamelCaseNamingStrategy } from '../../src/naming_strategy/naming_strategy.js'

// Test models
class TestProfile extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare firstName: string

  @column()
  declare lastName: string

  @column()
  declare bio?: string

  @column()
  declare userId: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => TestUser, {
    localKey: 'userId',
    foreignKey: '_id',
  })
  declare user: BelongsTo<typeof TestUser>

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`
  }

  static getCollectionName(): string {
    return 'test_profiles'
  }
}

class TestUser extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare name: string

  @column()
  declare email: string

  @hasOne(() => TestProfile, {
    localKey: '_id',
    foreignKey: 'userId',
  })
  declare profile: HasOne<typeof TestProfile>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @computed()
  get fullName(): string {
    return this.profile?.fullName ?? ''
  }

  @computed()
  get formattedAddress(): string {
    return '' // Simplified for testing
  }

  static getCollectionName(): string {
    return 'test_users'
  }
}

test.group('Relationship Loading with Naming Strategy', () => {
  test('should apply naming strategy correctly for relationship loading', async ({ assert }) => {
    // Test that the naming strategy converts camelCase to snake_case for database queries
    const namingStrategy = new CamelCaseNamingStrategy()

    // Test field name conversion
    assert.equal(namingStrategy.columnName(TestProfile, 'userId'), 'user_id')
    assert.equal(namingStrategy.columnName(TestProfile, 'firstName'), 'first_name')
    assert.equal(namingStrategy.columnName(TestProfile, 'lastName'), 'last_name')

    // Test serialization name conversion
    assert.equal(namingStrategy.serializedName(TestProfile, 'userId'), 'user_id')
    assert.equal(namingStrategy.serializedName(TestProfile, 'firstName'), 'first_name')
    assert.equal(namingStrategy.serializedName(TestProfile, 'lastName'), 'last_name')
  })

  test('should serialize model with snake_case field names', async ({ assert }) => {
    const user = new TestUser({
      name: 'John Doe',
      email: 'john@example.com',
    })

    const profile = new TestProfile({
      firstName: 'John',
      lastName: 'Doe',
      bio: 'Test bio',
      userId: 'user123',
    })

    // Test toDocument (for database storage)
    const userDoc = user.toDocument()
    assert.equal(userDoc.name, 'John Doe')
    assert.equal(userDoc.email, 'john@example.com')
    assert.equal(userDoc.created_at, userDoc.created_at) // Should have snake_case timestamp

    const profileDoc = profile.toDocument()
    assert.equal(profileDoc.first_name, 'John')
    assert.equal(profileDoc.last_name, 'Doe')
    assert.equal(profileDoc.bio, 'Test bio')
    assert.equal(profileDoc.user_id, 'user123')

    // Test toJSON (for API responses)
    const userJson = user.toJSON()
    assert.equal(userJson.name, 'John Doe')
    assert.equal(userJson.email, 'john@example.com')
    assert.equal(userJson.created_at, userJson.created_at) // Should have snake_case timestamp

    const profileJson = profile.toJSON()
    assert.equal(profileJson.first_name, 'John')
    assert.equal(profileJson.last_name, 'Doe')
    assert.equal(profileJson.bio, 'Test bio')
    assert.equal(profileJson.user_id, 'user123')
  })

  test('should hydrate model from snake_case database document', async ({ assert }) => {
    const dbDocument = {
      _id: new ObjectId(),
      first_name: 'Jane',
      last_name: 'Smith',
      bio: 'Test bio',
      user_id: 'user456',
      created_at: new Date(),
    }

    const profile = new TestProfile()
    profile.hydrateFromDocument(dbDocument)

    // Should convert snake_case back to camelCase properties
    assert.equal(profile.firstName, 'Jane')
    assert.equal(profile.lastName, 'Smith')
    assert.equal(profile.bio, 'Test bio')
    assert.equal(profile.userId, 'user456')
    assert.ok(profile._id) // Just check that _id exists
    assert.equal(profile.fullName, 'Jane Smith')
  })

  test('should not include duplicate id fields in JSON', async ({ assert }) => {
    const user = new TestUser({
      _id: 'user123',
      name: 'John Doe',
      email: 'john@example.com',
    })

    const json = user.toJSON()

    // Should only have _id, not both id and _id
    assert.property(json, '_id')
    assert.notProperty(json, 'id')
    assert.equal(json._id, 'user123')
  })

  test('should include computed properties in JSON serialization', async ({ assert }) => {
    const user = new TestUser({
      name: 'John Doe',
      email: 'john@example.com',
    })

    const json = user.toJSON()

    // Should include computed properties with snake_case names
    assert.property(json, 'full_name')
    assert.property(json, 'formatted_address')
    assert.equal(json.full_name, '') // Empty since no profile loaded
    assert.equal(json.formatted_address, '')
  })

  test('should exclude computed properties from database document', async ({ assert }) => {
    const user = new TestUser({
      name: 'John Doe',
      email: 'john@example.com',
    })

    const doc = user.toDocument()

    // Should NOT include computed properties in database document
    assert.notProperty(doc, 'full_name')
    assert.notProperty(doc, 'formatted_address')
    assert.notProperty(doc, 'fullName')
    assert.notProperty(doc, 'formattedAddress')
  })

  test('should handle serializeAs option correctly', async ({ assert }) => {
    // Create a test model with serializeAs option
    class TestModelWithSerializeAs extends BaseModel {
      @column({ isPrimary: true })
      declare _id: string

      @column({ serializeAs: 'custom_name' })
      declare firstName: string

      @column({ serializeAs: null }) // Should be hidden
      declare password: string

      @column()
      declare email: string

      static getCollectionName(): string {
        return 'test_serialize_as'
      }
    }

    const model = new TestModelWithSerializeAs({
      firstName: 'John',
      password: 'secret123',
      email: 'john@example.com',
    })

    const json = model.toJSON()

    // Should use custom serialize name
    assert.property(json, 'custom_name')
    assert.equal(json.custom_name, 'John')

    // Should hide field with serializeAs: null
    assert.notProperty(json, 'password')

    // Should use naming strategy for regular fields
    assert.property(json, 'email')
    assert.equal(json.email, 'john@example.com')
  })
})
