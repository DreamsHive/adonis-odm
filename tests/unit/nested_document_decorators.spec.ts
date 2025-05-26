import { test } from '@japa/runner'
import { BaseModel } from '../../src/base_model/base_model.js'
import { column } from '../../src/decorators/column.js'
import { DateTime } from 'luxon'

// Test models for decorator testing
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

class TestReferencedModel extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare name: string

  @column.reference({ model: 'Profile', localKey: 'profileId', foreignKey: '_id' })
  declare profileRef?: string

  @column()
  declare profileId?: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  static getCollectionName(): string {
    return 'test_referenced'
  }
}

test.group('Nested Document Decorators - Unit Tests', () => {
  test('should register embedded column decorator correctly', async ({ assert }) => {
    const metadata = TestEmbeddedModel.getMetadata()
    const profileColumn = metadata.columns.get('profile')

    assert.isTrue(profileColumn?.isEmbedded)
    assert.isUndefined(profileColumn?.isReference)
  })

  test('should register reference column decorator correctly', async ({ assert }) => {
    const metadata = TestReferencedModel.getMetadata()
    const profileRefColumn = metadata.columns.get('profileRef')

    assert.isTrue(profileRefColumn?.isReference)
    assert.equal(profileRefColumn?.model, 'Profile')
    assert.equal(profileRefColumn?.localKey, 'profileId')
    assert.equal(profileRefColumn?.foreignKey, '_id')
    assert.isUndefined(profileRefColumn?.isEmbedded)
  })

  test('should create model with embedded profile data', async ({ assert }) => {
    const model = new TestEmbeddedModel({
      name: 'Test User',
      profile: {
        firstName: 'John',
        lastName: 'Doe',
        bio: 'Software developer',
      },
    })

    assert.equal(model.name, 'Test User')
    assert.equal(model.profile?.firstName, 'John')
    assert.equal(model.profile?.lastName, 'Doe')
    assert.equal(model.profile?.bio, 'Software developer')
  })

  test('should serialize embedded profile to document', async ({ assert }) => {
    const model = new TestEmbeddedModel({
      name: 'Test User',
      profile: {
        firstName: 'Jane',
        lastName: 'Smith',
      },
    })

    const document = model.toDocument()

    assert.equal(document.name, 'Test User')
    assert.isObject(document.profile)
    assert.equal(document.profile.firstName, 'Jane')
    assert.equal(document.profile.lastName, 'Smith')
  })

  test('should handle undefined embedded profile', async ({ assert }) => {
    const model = new TestEmbeddedModel({
      name: 'Test User',
    })

    assert.equal(model.name, 'Test User')
    assert.isUndefined(model.profile)

    const document = model.toDocument()
    assert.equal(document.name, 'Test User')
    assert.isUndefined(document.profile)
  })

  test('should create model with reference data', async ({ assert }) => {
    const model = new TestReferencedModel({
      name: 'Referenced User',
      profileId: 'profile_123',
    })

    assert.equal(model.name, 'Referenced User')
    assert.equal(model.profileId, 'profile_123')
  })

  test('should serialize reference model to document', async ({ assert }) => {
    const model = new TestReferencedModel({
      name: 'Referenced User',
      profileId: 'profile_456',
    })

    const document = model.toDocument()

    assert.equal(document.name, 'Referenced User')
    assert.equal(document.profileId, 'profile_456')
    assert.isUndefined(document.profileRef) // Virtual field should not be serialized
  })

  test('should handle model without reference ID', async ({ assert }) => {
    const model = new TestReferencedModel({
      name: 'No Reference User',
    })

    assert.equal(model.name, 'No Reference User')
    assert.isUndefined(model.profileId)

    const document = model.toDocument()
    assert.equal(document.name, 'No Reference User')
    assert.isUndefined(document.profileId)
  })

  test('should track dirty attributes for embedded profile', async ({ assert }) => {
    const model = new TestEmbeddedModel({
      name: 'Test User',
      profile: {
        firstName: 'Original',
        lastName: 'Name',
      },
    })

    // Sync original to clear dirty state
    ;(model as any).syncOriginal()
    model.$dirty = {}

    // Update embedded profile using merge (which properly tracks dirty attributes)
    model.merge({
      profile: {
        firstName: 'Updated',
        lastName: 'Name',
        bio: 'New bio',
      },
    })

    assert.property(model.$dirty, 'profile')
    assert.equal(model.$dirty.profile.firstName, 'Updated')
    assert.equal(model.$dirty.profile.bio, 'New bio')
  })

  test('should track dirty attributes for reference ID', async ({ assert }) => {
    const model = new TestReferencedModel({
      name: 'Test User',
      profileId: 'original_profile',
    })

    // Sync original to clear dirty state
    ;(model as any).syncOriginal()
    model.$dirty = {}

    // Update reference ID using merge (which properly tracks dirty attributes)
    model.merge({
      profileId: 'updated_profile',
    })

    assert.property(model.$dirty, 'profileId')
    assert.equal(model.$dirty.profileId, 'updated_profile')
  })

  test('should handle partial embedded profile updates', async ({ assert }) => {
    const model = new TestEmbeddedModel({
      name: 'Test User',
      profile: {
        firstName: 'John',
        lastName: 'Doe',
        bio: 'Original bio',
      },
    })

    // Update only part of the profile
    model.merge({
      profile: {
        firstName: 'John',
        lastName: 'Doe',
        bio: 'Updated bio',
      },
    })

    assert.equal(model.profile?.firstName, 'John')
    assert.equal(model.profile?.lastName, 'Doe')
    assert.equal(model.profile?.bio, 'Updated bio')
  })

  test('should validate column metadata structure', async ({ assert }) => {
    const embeddedMetadata = TestEmbeddedModel.getMetadata()
    const referencedMetadata = TestReferencedModel.getMetadata()

    // Check that metadata is properly structured
    assert.isObject(embeddedMetadata)
    assert.instanceOf(embeddedMetadata.columns, Map)
    assert.equal(embeddedMetadata.primaryKey, '_id')

    assert.isObject(referencedMetadata)
    assert.instanceOf(referencedMetadata.columns, Map)
    assert.equal(referencedMetadata.primaryKey, '_id')

    // Check that all expected columns are registered
    assert.isTrue(embeddedMetadata.columns.has('_id'))
    assert.isTrue(embeddedMetadata.columns.has('name'))
    assert.isTrue(embeddedMetadata.columns.has('profile'))
    assert.isTrue(embeddedMetadata.columns.has('createdAt'))

    assert.isTrue(referencedMetadata.columns.has('_id'))
    assert.isTrue(referencedMetadata.columns.has('name'))
    assert.isTrue(referencedMetadata.columns.has('profileRef'))
    assert.isTrue(referencedMetadata.columns.has('profileId'))
    assert.isTrue(referencedMetadata.columns.has('createdAt'))
  })
})
