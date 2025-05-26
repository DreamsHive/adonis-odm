import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { ObjectId } from 'mongodb'
import UserWithReferencedProfile from '../../app/models/user_with_referenced_profile.js'
import Profile from '../../app/models/profile.js'
import Post from '../../app/models/post.js'
import { ModelQueryBuilder } from '../../src/query_builder/model_query_builder.js'

test.group('MongoDB ODM - Model Logic', () => {
  test('should create model instance with attributes', async ({ assert }) => {
    const user = new UserWithReferencedProfile({
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
    })

    assert.equal(user.name, 'John Doe')
    assert.equal(user.email, 'john@example.com')
    assert.equal(user.age, 30)
    assert.isFalse(user.$isPersisted)
    assert.isTrue(user.$isLocal)
  })

  test('should track dirty attributes', async ({ assert }) => {
    const user = new UserWithReferencedProfile({
      name: 'John Doe',
      email: 'john@example.com',
    })

    // Initially no dirty attributes
    assert.deepEqual(user.$dirty, {})

    // Change an attribute
    user.name = 'Jane Doe'
    assert.deepEqual(user.$dirty, { name: 'Jane Doe' })

    // Change another attribute
    user.age = 25
    assert.deepEqual(user.$dirty, { name: 'Jane Doe', age: 25 })
  })

  test('should apply timestamps on creation', async ({ assert }) => {
    const user = new UserWithReferencedProfile({
      name: 'John Doe',
      email: 'john@example.com',
    })

    // Simulate the timestamp application that happens during save
    const now = DateTime.now()
    user.createdAt = now
    user.updatedAt = now

    assert.equal(user.createdAt.constructor.name, 'DateTime')
    assert.equal(user.updatedAt.constructor.name, 'DateTime')
  })

  test('should serialize to document format', async ({ assert }) => {
    const user = new UserWithReferencedProfile({
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
    })

    const now = DateTime.now()
    user.createdAt = now
    user.updatedAt = now

    const document = user.toDocument()

    assert.equal(document.name, 'John Doe')
    assert.equal(document.email, 'john@example.com')
    assert.equal(document.age, 30)
    assert.instanceOf(document.createdAt, Date)
    assert.instanceOf(document.updatedAt, Date)
  })

  test('should hydrate from document', async ({ assert }) => {
    const user = new UserWithReferencedProfile()
    const now = new Date()

    user.hydrateFromDocument({
      _id: new ObjectId(),
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
      createdAt: now,
      updatedAt: now,
    })

    assert.equal(user.name, 'John Doe')
    assert.equal(user.email, 'john@example.com')
    assert.equal(user.age, 30)
    assert.equal(user.createdAt.constructor.name, 'DateTime')
    assert.equal(user.updatedAt.constructor.name, 'DateTime')
    assert.isTrue(user.$isPersisted)
    assert.isFalse(user.$isLocal)
  })

  test('should merge attributes', async ({ assert }) => {
    const user = new UserWithReferencedProfile({
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
    })

    user.merge({
      name: 'Jane Doe',
      age: 25,
    })

    assert.equal(user.name, 'Jane Doe')
    assert.equal(user.email, 'john@example.com') // unchanged
    assert.equal(user.age, 25)
  })

  test('should fill attributes', async ({ assert }) => {
    const user = new UserWithReferencedProfile()

    user.fill({
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
    })

    assert.equal(user.name, 'John Doe')
    assert.equal(user.email, 'john@example.com')
    assert.equal(user.age, 30)
  })

  test('should get and set attributes', async ({ assert }) => {
    const user = new UserWithReferencedProfile()

    user.setAttribute('name', 'John Doe')
    user.setAttribute('email', 'john@example.com')

    assert.equal(user.getAttribute('name'), 'John Doe')
    assert.equal(user.getAttribute('email'), 'john@example.com')
    assert.equal(user.name, 'John Doe')
    assert.equal(user.email, 'john@example.com')
  })

  test('should generate collection name from class name', async ({ assert }) => {
    assert.equal(UserWithReferencedProfile.getCollectionName(), 'users_with_referenced_profiles')
    assert.equal(Profile.getCollectionName(), 'profiles')
    assert.equal(Post.getCollectionName(), 'posts')
  })

  test('should get model metadata', async ({ assert }) => {
    const metadata = UserWithReferencedProfile.getMetadata()

    assert.exists(metadata.columns)
    assert.isTrue(metadata.columns.has('_id'))
    assert.isTrue(metadata.columns.has('name'))
    assert.isTrue(metadata.columns.has('email'))
    assert.isTrue(metadata.columns.has('age'))
    assert.isTrue(metadata.columns.has('createdAt'))
    assert.isTrue(metadata.columns.has('updatedAt'))

    const idColumn = metadata.columns.get('_id')
    assert.isTrue(idColumn?.isPrimary)
  })

  test('should handle profile computed properties', async ({ assert }) => {
    const profile = new Profile({
      firstName: 'John',
      lastName: 'Doe',
      bio: 'Software developer',
    })

    assert.equal(profile.fullName, 'John Doe')

    profile.address = {
      street: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94105',
      country: 'USA',
    }

    assert.isString(profile.formattedAddress)
    assert.include(profile.formattedAddress!, '123 Main St')
    assert.include(profile.formattedAddress!, 'San Francisco')
  })

  test('should handle post computed properties', async ({ assert }) => {
    const post = new Post({
      title: 'Test Post',
      content: 'This is a test post with some content that should be truncated in the excerpt.',
      status: 'published',
    })

    assert.isString(post.excerpt)
    assert.isTrue(post.excerpt.length <= 100)
    assert.isTrue(post.isPublished)

    post.status = 'draft'
    assert.isFalse(post.isPublished)
  })

  test('should sync original attributes', async ({ assert }) => {
    const user = new UserWithReferencedProfile({
      name: 'John Doe',
      email: 'john@example.com',
    })

    // Initially $original should be empty
    assert.deepEqual(user.$original, {})

    // Sync original
    user.syncOriginal()
    assert.equal(user.$original.name, 'John Doe')
    assert.equal(user.$original.email, 'john@example.com')

    // Change attribute
    user.name = 'Jane Doe'
    assert.equal(user.$original.name, 'John Doe') // Original unchanged
    assert.equal(user.name, 'Jane Doe') // Current changed
  })

  test('should get dirty attributes correctly', async ({ assert }) => {
    const user = new UserWithReferencedProfile({
      name: 'John Doe',
      email: 'john@example.com',
    })

    user.syncOriginal()

    // No changes yet
    assert.deepEqual(user.getDirtyAttributes(), {})

    // Make changes
    user.name = 'Jane Doe'
    user.age = 25

    const dirty = user.getDirtyAttributes()
    assert.equal(dirty.name, 'Jane Doe')
    assert.equal(dirty.age, 25)
    assert.isUndefined(dirty.email) // Unchanged
  })

  test('should handle date serialization', async ({ assert }) => {
    const user = new UserWithReferencedProfile({
      name: 'John Doe',
      email: 'john@example.com',
    })

    const now = DateTime.now()
    user.createdAt = now
    user.updatedAt = now

    const document = user.toDocument()

    // Dates should be serialized to JavaScript Date objects
    assert.instanceOf(document.createdAt, Date)
    assert.instanceOf(document.updatedAt, Date)
  })

  test('should handle date deserialization', async ({ assert }) => {
    const user = new UserWithReferencedProfile()
    const now = new Date()

    user.hydrateFromDocument({
      _id: new ObjectId(),
      name: 'John Doe',
      email: 'john@example.com',
      createdAt: now,
      updatedAt: now,
    })

    // Dates should be deserialized to DateTime objects
    assert.equal(user.createdAt.constructor.name, 'DateTime')
    assert.equal(user.updatedAt.constructor.name, 'DateTime')
  })

  test('should create query builder instance', async ({ assert }) => {
    // Mock collection for testing
    const mockCollection = {
      find: () => ({ toArray: () => Promise.resolve([]) }),
      findOne: () => Promise.resolve(null),
      insertOne: () => Promise.resolve({ insertedId: new ObjectId() }),
      updateOne: () => Promise.resolve({ modifiedCount: 1 }),
      deleteOne: () => Promise.resolve({ deletedCount: 1 }),
      countDocuments: () => Promise.resolve(0),
    }

    const queryBuilder = new ModelQueryBuilder(mockCollection as any, UserWithReferencedProfile)

    assert.instanceOf(queryBuilder, ModelQueryBuilder)
    assert.equal(typeof queryBuilder.where, 'function')
    assert.equal(typeof queryBuilder.orderBy, 'function')
    assert.equal(typeof queryBuilder.limit, 'function')
    assert.equal(typeof queryBuilder.all, 'function')
  })

  test('should handle model state correctly', async ({ assert }) => {
    const user = new UserWithReferencedProfile({
      name: 'John Doe',
      email: 'john@example.com',
    })

    // New model
    assert.isFalse(user.$isPersisted)
    assert.isTrue(user.$isLocal)

    // Simulate persisting
    user._id = new ObjectId().toString()
    user.$isPersisted = true
    user.$isLocal = false

    assert.isTrue(user.$isPersisted)
    assert.isFalse(user.$isLocal)
  })

  test('should handle relationship metadata', async ({ assert }) => {
    const metadata = UserWithReferencedProfile.getMetadata()

    // Check if relationship columns are registered
    assert.isTrue(metadata.columns.has('profile'))

    const profileColumn = metadata.columns.get('profile')
    assert.equal(profileColumn?.model, 'Profile')
    assert.equal(profileColumn?.localKey, '_id')
    assert.equal(profileColumn?.foreignKey, 'userId')
  })
})
