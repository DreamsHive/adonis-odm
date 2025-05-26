import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { ObjectId } from 'mongodb'
import { BaseModel } from '../../src/base_model/base_model.js'
import { column, computed } from '../../src/decorators/column.js'
import {
  CamelCaseNamingStrategy,
  SnakeCaseNamingStrategy,
  StringHelper,
} from '../../src/naming_strategy/naming_strategy.js'

// Test model with camelCase properties
class TestUser extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare firstName: string

  @column()
  declare lastName: string

  @column()
  declare emailAddress: string

  @column()
  declare phoneNumber?: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @computed()
  get fullName() {
    return `${this.firstName} ${this.lastName}`
  }

  @computed()
  get displayName() {
    return this.fullName || this.emailAddress
  }
}

// Test model with explicit serializeAs options
class TestUserWithSerializeAs extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column({ serializeAs: 'custom_first_name' })
  declare firstName: string

  @column({ serializeAs: null }) // Should be hidden
  declare password: string

  @column()
  declare emailAddress: string

  @computed({ serializeAs: 'display_name' })
  get fullName() {
    return `${this.firstName}`
  }
}

test.group('Naming Strategy', () => {
  test('StringHelper should convert camelCase to snake_case correctly', async ({ assert }) => {
    assert.equal(StringHelper.snakeCase('firstName'), 'first_name')
    assert.equal(StringHelper.snakeCase('emailAddress'), 'email_address')
    assert.equal(StringHelper.snakeCase('phoneNumber'), 'phone_number')
    assert.equal(StringHelper.snakeCase('createdAt'), 'created_at')
    assert.equal(StringHelper.snakeCase('updatedAt'), 'updated_at')
    assert.equal(StringHelper.snakeCase('fullName'), 'full_name')
    assert.equal(StringHelper.snakeCase('displayName'), 'display_name')

    // Edge cases
    assert.equal(StringHelper.snakeCase('id'), 'id')
    assert.equal(StringHelper.snakeCase('_id'), '_id')
    assert.equal(StringHelper.snakeCase('name'), 'name')
    assert.equal(StringHelper.snakeCase('XMLHttpRequest'), 'xmlhttp_request')
  })

  test('StringHelper should convert snake_case to camelCase correctly', async ({ assert }) => {
    assert.equal(StringHelper.camelCase('first_name'), 'firstName')
    assert.equal(StringHelper.camelCase('email_address'), 'emailAddress')
    assert.equal(StringHelper.camelCase('phone_number'), 'phoneNumber')
    assert.equal(StringHelper.camelCase('created_at'), 'createdAt')
    assert.equal(StringHelper.camelCase('updated_at'), 'updatedAt')

    // Edge cases
    assert.equal(StringHelper.camelCase('id'), 'id')
    assert.equal(StringHelper.camelCase('name'), 'name')
  })

  test('CamelCaseNamingStrategy should convert property names to snake_case for serialization', async ({
    assert,
  }) => {
    const strategy = new CamelCaseNamingStrategy()

    assert.equal(strategy.serializedName(TestUser, 'firstName'), 'first_name')
    assert.equal(strategy.serializedName(TestUser, 'lastName'), 'last_name')
    assert.equal(strategy.serializedName(TestUser, 'emailAddress'), 'email_address')
    assert.equal(strategy.serializedName(TestUser, 'phoneNumber'), 'phone_number')
    assert.equal(strategy.serializedName(TestUser, 'createdAt'), 'created_at')
    assert.equal(strategy.serializedName(TestUser, 'updatedAt'), 'updated_at')
    assert.equal(strategy.serializedName(TestUser, 'fullName'), 'full_name')
    assert.equal(strategy.serializedName(TestUser, 'displayName'), 'display_name')
  })

  test('BaseModel should use CamelCaseNamingStrategy by default', async ({ assert }) => {
    const user = new TestUser({
      firstName: 'John',
      lastName: 'Doe',
      emailAddress: 'john.doe@example.com',
      phoneNumber: '+1234567890',
    })

    const json = user.toJSON()

    // Properties should be serialized in snake_case
    assert.equal(json.first_name, 'John')
    assert.equal(json.last_name, 'Doe')
    assert.equal(json.email_address, 'john.doe@example.com')
    assert.equal(json.phone_number, '+1234567890')
    assert.property(json, 'created_at')
    assert.property(json, 'updated_at')

    // Computed properties should also be serialized in snake_case
    assert.equal(json.full_name, 'John Doe')
    assert.equal(json.display_name, 'John Doe')

    // _id should remain as _id (MongoDB convention)
    assert.property(json, '_id')

    // Original camelCase properties should not exist in JSON
    assert.notProperty(json, 'firstName')
    assert.notProperty(json, 'lastName')
    assert.notProperty(json, 'emailAddress')
    assert.notProperty(json, 'phoneNumber')
    assert.notProperty(json, 'createdAt')
    assert.notProperty(json, 'updatedAt')
    assert.notProperty(json, 'fullName')
    assert.notProperty(json, 'displayName')
  })

  test('serializeAs option should override naming strategy', async ({ assert }) => {
    const user = new TestUserWithSerializeAs({
      firstName: 'John',
      password: 'secret123',
      emailAddress: 'john@example.com',
    })

    const json = user.toJSON()

    // Custom serializeAs should be used
    assert.equal(json.custom_first_name, 'John')
    assert.equal(json.display_name, 'John')

    // Default naming strategy should be used for emailAddress
    assert.equal(json.email_address, 'john@example.com')

    // serializeAs: null should hide the property
    assert.notProperty(json, 'password')

    // Original property names should not exist
    assert.notProperty(json, 'firstName')
    assert.notProperty(json, 'emailAddress')
    assert.notProperty(json, 'fullName')
  })

  test('should be able to change naming strategy globally', async ({ assert }) => {
    // Save original strategy
    const originalStrategy = BaseModel.namingStrategy

    try {
      // Change to SnakeCaseNamingStrategy
      BaseModel.namingStrategy = new SnakeCaseNamingStrategy()

      const user = new TestUser({
        firstName: 'Jane',
        lastName: 'Smith',
        emailAddress: 'jane.smith@example.com',
      })

      const json = user.toJSON()

      // Should still use snake_case (same result in this case)
      assert.equal(json.first_name, 'Jane')
      assert.equal(json.last_name, 'Smith')
      assert.equal(json.email_address, 'jane.smith@example.com')
      assert.equal(json.full_name, 'Jane Smith')
    } finally {
      // Restore original strategy
      BaseModel.namingStrategy = originalStrategy
    }
  })

  test('should be able to set naming strategy per model', async ({ assert }) => {
    // Create a custom model with its own naming strategy
    class CustomUser extends BaseModel {
      static namingStrategy = new SnakeCaseNamingStrategy()

      @column({ isPrimary: true })
      declare _id: string

      @column()
      declare firstName: string

      @column()
      declare emailAddress: string
    }

    const user = new CustomUser({
      firstName: 'Custom',
      emailAddress: 'custom@example.com',
    })

    const json = user.toJSON()

    // Should use the model's specific naming strategy
    assert.equal(json.first_name, 'Custom')
    assert.equal(json.email_address, 'custom@example.com')
  })

  test('should handle DateTime serialization with naming strategy', async ({ assert }) => {
    const user = new TestUser({
      firstName: 'DateTime',
      lastName: 'Test',
      emailAddress: 'datetime@example.com',
    })

    const now = DateTime.now()
    user.createdAt = now
    user.updatedAt = now

    const json = user.toJSON()

    // DateTime should be serialized to ISO string
    assert.equal(typeof json.created_at, 'string')
    assert.equal(typeof json.updated_at, 'string')
    assert.equal(json.created_at, now.toISO())
    assert.equal(json.updated_at, now.toISO())
  })

  test('should handle undefined and null values correctly', async ({ assert }) => {
    const user = new TestUser({
      firstName: 'Test',
      lastName: 'User',
      emailAddress: 'test@example.com',
      phoneNumber: undefined, // Optional field
    })

    const json = user.toJSON()

    assert.equal(json.first_name, 'Test')
    assert.equal(json.last_name, 'User')
    assert.equal(json.email_address, 'test@example.com')

    // undefined values should not be included in JSON
    assert.notProperty(json, 'phone_number')
  })

  test('naming strategy should work with pagination meta keys', async ({ assert }) => {
    const strategy = new CamelCaseNamingStrategy()
    const metaKeys = strategy.paginationMetaKeys()

    assert.deepEqual(metaKeys, {
      total: 'total',
      perPage: 'per_page',
      currentPage: 'current_page',
      lastPage: 'last_page',
      firstPage: 'first_page',
      firstPageUrl: 'first_page_url',
      lastPageUrl: 'last_page_url',
      nextPageUrl: 'next_page_url',
      previousPageUrl: 'previous_page_url',
    })
  })

  test('toDocument should use naming strategy for database column names', async ({ assert }) => {
    const user = new TestUser({
      firstName: 'John',
      lastName: 'Doe',
      emailAddress: 'john.doe@example.com',
      phoneNumber: '+1234567890',
    })

    const document = user.toDocument()

    // Properties should be stored with snake_case column names in database
    assert.equal(document.first_name, 'John')
    assert.equal(document.last_name, 'Doe')
    assert.equal(document.email_address, 'john.doe@example.com')
    assert.equal(document.phone_number, '+1234567890')
    assert.property(document, 'created_at')
    assert.property(document, 'updated_at')

    // _id should remain as _id (MongoDB convention)
    assert.property(document, '_id')

    // Original camelCase properties should not exist in document
    assert.notProperty(document, 'firstName')
    assert.notProperty(document, 'lastName')
    assert.notProperty(document, 'emailAddress')
    assert.notProperty(document, 'phoneNumber')
    assert.notProperty(document, 'createdAt')
    assert.notProperty(document, 'updatedAt')

    // Computed properties should not be in database document
    assert.notProperty(document, 'full_name')
    assert.notProperty(document, 'fullName')
    assert.notProperty(document, 'display_name')
    assert.notProperty(document, 'displayName')
  })

  test('hydrateFromDocument should convert database column names back to model properties', async ({
    assert,
  }) => {
    // Simulate a document from database with snake_case column names
    const dbDocument = {
      _id: new ObjectId(),
      first_name: 'Jane',
      last_name: 'Smith',
      email_address: 'jane.smith@example.com',
      phone_number: '+9876543210',
      created_at: new Date(),
      updated_at: new Date(),
    }

    const user = new TestUser()
    user.hydrateFromDocument(dbDocument as any)

    // Properties should be accessible via camelCase
    assert.equal(user.firstName, 'Jane')
    assert.equal(user.lastName, 'Smith')
    assert.equal(user.emailAddress, 'jane.smith@example.com')
    assert.equal(user.phoneNumber, '+9876543210')
    assert.equal(user._id, dbDocument._id)
    assert.isTrue(user.createdAt instanceof DateTime)
    assert.isTrue(user.updatedAt instanceof DateTime)

    // Computed properties should work
    assert.equal(user.fullName, 'Jane Smith')
    assert.equal(user.displayName, 'Jane Smith')

    // Model should be marked as persisted
    assert.isTrue(user.$isPersisted)
    assert.isFalse(user.$isLocal)
  })

  test('getDirtyAttributes should return database column names', async ({ assert }) => {
    const user = new TestUser({
      firstName: 'Original',
      lastName: 'User',
      emailAddress: 'original@example.com',
    })

    // Mark as persisted to enable dirty tracking
    user.$isPersisted = true
    user.$dirty = {}

    // Modify some properties
    user.firstName = 'Modified'
    user.emailAddress = 'modified@example.com'

    const dirtyAttributes = user.getDirtyAttributes()

    // Should return snake_case column names for database operations
    assert.equal(dirtyAttributes.first_name, 'Modified')
    assert.equal(dirtyAttributes.email_address, 'modified@example.com')

    // Should not include unchanged properties
    assert.notProperty(dirtyAttributes, 'last_name')
    assert.notProperty(dirtyAttributes, 'lastName')

    // Should not include camelCase property names
    assert.notProperty(dirtyAttributes, 'firstName')
    assert.notProperty(dirtyAttributes, 'emailAddress')
  })
})
