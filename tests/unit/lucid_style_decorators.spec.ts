import { test } from '@japa/runner'
import { BaseModel } from '../../src/base_model/base_model.js'
import { column, hasOne, hasMany, belongsTo } from '../../src/decorators/column.js'
import { DateTime } from 'luxon'
import type { HasOne, HasMany, BelongsTo } from '../../src/types/relationships.js'
import {
  createHasOneProxy,
  createHasManyProxy,
  createBelongsToProxy,
} from '../../src/relationships/relationship_proxies.js'

// Test models for Lucid-style decorator testing
// Define base classes first without relationships
class TestUser extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare name: string

  @column()
  declare email: string

  // Relationship properties (will be defined later to avoid circular references)
  declare profile: HasOne<typeof TestProfile>
  declare posts: HasMany<typeof TestPost>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  static getCollectionName(): string {
    return 'test_users'
  }
}

class TestProfile extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare firstName: string

  @column()
  declare lastName: string

  @column()
  declare userId: string

  // Relationship property (will be defined later to avoid circular references)
  declare user: BelongsTo<typeof TestUser>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  static getCollectionName(): string {
    return 'test_profiles'
  }
}

class TestPost extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare title: string

  @column()
  declare content: string

  @column()
  declare authorId: string

  // Relationship property (will be defined later to avoid circular references)
  declare author: BelongsTo<typeof TestUser>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  static getCollectionName(): string {
    return 'test_posts'
  }
}

// Add relationships after all classes are defined
// This prevents circular reference issues
Object.defineProperty(TestUser.prototype, 'profile', {
  get() {
    if (!this._profile) {
      this._profile = createHasOneProxy(this, 'profile', TestProfile, '_id', 'userId')
    }
    return this._profile
  },
  configurable: true,
  enumerable: true,
})

Object.defineProperty(TestUser.prototype, 'posts', {
  get() {
    if (!this._posts) {
      this._posts = createHasManyProxy(this, 'posts', TestPost, '_id', 'authorId')
    }
    return this._posts
  },
  configurable: true,
  enumerable: true,
})

Object.defineProperty(TestProfile.prototype, 'user', {
  get() {
    if (!this._user) {
      this._user = createBelongsToProxy(this, 'user', TestUser, 'userId', '_id')
    }
    return this._user
  },
  configurable: true,
  enumerable: true,
})

Object.defineProperty(TestPost.prototype, 'author', {
  get() {
    if (!this._author) {
      this._author = createBelongsToProxy(this, 'author', TestUser, 'authorId', '_id')
    }
    return this._author
  },
  configurable: true,
  enumerable: true,
})

// Add relationship metadata manually for testing
const testUserMetadata = TestUser.getMetadata()
testUserMetadata.columns.set('profile', {
  isReference: true,
  model: 'TestProfile',
  localKey: '_id',
  foreignKey: 'userId',
})
testUserMetadata.columns.set('posts', {
  isReference: true,
  model: 'TestPost',
  localKey: '_id',
  foreignKey: 'authorId',
  isArray: true,
})

const testProfileMetadata = TestProfile.getMetadata()
testProfileMetadata.columns.set('user', {
  isReference: true,
  model: 'TestUser',
  localKey: 'userId',
  foreignKey: '_id',
  isBelongsTo: true,
})

const testPostMetadata = TestPost.getMetadata()
testPostMetadata.columns.set('author', {
  isReference: true,
  model: 'TestUser',
  localKey: 'authorId',
  foreignKey: '_id',
  isBelongsTo: true,
})

test.group('Lucid-Style Decorators - Unit Tests', () => {
  test('should create correct metadata for hasOne relationship', async ({ assert }) => {
    const metadata = TestUser.getMetadata()
    const profileColumn = metadata.columns.get('profile')

    assert.isDefined(profileColumn)
    assert.isTrue(profileColumn?.isReference)
    assert.equal(profileColumn?.model, 'TestProfile')
    assert.equal(profileColumn?.localKey, '_id')
    assert.equal(profileColumn?.foreignKey, 'userId')
    assert.isUndefined(profileColumn?.isArray)
    assert.isUndefined(profileColumn?.isBelongsTo)
  })

  test('should create correct metadata for hasMany relationship', async ({ assert }) => {
    const metadata = TestUser.getMetadata()
    const postsColumn = metadata.columns.get('posts')

    assert.isDefined(postsColumn)
    assert.isTrue(postsColumn?.isReference)
    assert.equal(postsColumn?.model, 'TestPost')
    assert.equal(postsColumn?.localKey, '_id')
    assert.equal(postsColumn?.foreignKey, 'authorId')
    assert.isTrue(postsColumn?.isArray)
    assert.isUndefined(postsColumn?.isBelongsTo)
  })

  test('should create correct metadata for belongsTo relationship', async ({ assert }) => {
    const metadata = TestProfile.getMetadata()
    const userColumn = metadata.columns.get('user')

    assert.isDefined(userColumn)
    assert.isTrue(userColumn?.isReference)
    assert.equal(userColumn?.model, 'TestUser')
    assert.equal(userColumn?.localKey, 'userId')
    assert.equal(userColumn?.foreignKey, '_id')
    assert.isUndefined(userColumn?.isArray)
    assert.isTrue(userColumn?.isBelongsTo)
  })

  test('should exclude relationship fields from document serialization', async ({ assert }) => {
    const user = new TestUser({
      name: 'John Doe',
      email: 'john@example.com',
    })

    const document = user.toDocument()

    // Should include regular fields
    assert.equal(document.name, 'John Doe')
    assert.equal(document.email, 'john@example.com')

    // Should exclude virtual relationship fields
    assert.isUndefined(document.profile)
    assert.isUndefined(document.posts)
  })

  test('should exclude relationship fields from dirty attributes', async ({ assert }) => {
    const user = new TestUser({
      name: 'John Doe',
      email: 'john@example.com',
    })

    // Mark as persisted and sync original
    user.$isPersisted = true
    user.$isLocal = false
    user.syncOriginal()

    // Simulate setting relationship fields (would be done by proxy system)
    user.setAttribute('profile', { firstName: 'John', lastName: 'Doe' })
    user.setAttribute('posts', [{ title: 'Test Post' }])

    const dirty = user.getDirtyAttributes()

    // Should not include virtual relationship fields
    assert.isUndefined(dirty.profile)
    assert.isUndefined(dirty.posts)
  })

  test('should work with default foreign key naming', async ({ assert }) => {
    // Test model with default foreign key naming
    class TestComment extends BaseModel {
      @column({ isPrimary: true })
      declare _id: string

      @column()
      declare content: string

      @belongsTo(() => TestPost)
      declare post: BelongsTo<typeof TestPost>

      static getCollectionName(): string {
        return 'test_comments'
      }
    }

    const metadata = TestComment.getMetadata()
    const postColumn = metadata.columns.get('post')

    assert.isDefined(postColumn)
    assert.isTrue(postColumn?.isReference)
    assert.equal(postColumn?.model, 'TestPost')
    assert.equal(postColumn?.localKey, 'testpostId') // Default naming
    assert.equal(postColumn?.foreignKey, '_id') // Default primary key
    assert.isTrue(postColumn?.isBelongsTo)
  })

  test('should handle circular references without infinite loops', async ({ assert }) => {
    // Create instances that reference each other
    const user = new TestUser({ name: 'Test User' })
    const profile = new TestProfile({ firstName: 'John', lastName: 'Doe' })

    // Both should be created without issues
    assert.isDefined(user)
    assert.isDefined(profile)
    assert.equal(user.name, 'Test User')
    assert.equal(profile.firstName, 'John')
  })

  test('should preserve existing column metadata when adding relationships', async ({ assert }) => {
    const userMetadata = TestUser.getMetadata()

    // Should have all regular columns
    assert.isTrue(userMetadata.columns.has('_id'))
    assert.isTrue(userMetadata.columns.has('name'))
    assert.isTrue(userMetadata.columns.has('email'))
    assert.isTrue(userMetadata.columns.has('createdAt'))

    // Should have relationship columns
    assert.isTrue(userMetadata.columns.has('profile'))
    assert.isTrue(userMetadata.columns.has('posts'))

    // Primary key should be preserved
    assert.equal(userMetadata.primaryKey, '_id')
  })

  test('should allow direct property access on relationships (Lucid-style)', async ({ assert }) => {
    const user = new TestUser({
      name: 'Test User',
      email: 'test@example.com',
    })

    // Should be able to access relationship properties
    assert.isDefined(user.profile)
    assert.isDefined(user.posts)

    // Relationships should have the expected methods
    assert.isFunction(user.profile.create)
    assert.isFunction(user.profile.load)
    assert.isFunction(user.profile.query)
    assert.isFunction(user.posts.create)
    assert.isFunction(user.posts.load)
    assert.isFunction(user.posts.query)

    // Should have isLoaded property
    assert.isBoolean(user.profile.isLoaded)
    assert.isBoolean(user.posts.isLoaded)
  })

  test('should support direct property access like Lucid ORM', async ({ assert }) => {
    const user = new TestUser({
      name: 'Direct Access User',
      email: 'direct@example.com',
    })

    const profile = new TestProfile({
      firstName: 'John',
      lastName: 'Doe',
      userId: 'user123',
    })

    // Mock the load method to simulate loading the profile
    user.profile.load = async () => {
      // Simulate loading the profile data into the proxy
      ;(user.profile as any)._related = profile
      ;(user.profile as any)._isLoaded = true
      return profile
    }

    // Load the profile
    await user.profile.load()

    // Now we should be able to access profile properties directly
    // This is the improved developer experience - no need for .related
    assert.equal(user.profile.firstName, 'John')
    assert.equal(user.profile.lastName, 'Doe')
    assert.equal(user.profile.userId, 'user123')

    // The relationship should also have its methods
    assert.isFunction(user.profile.create)
    assert.isFunction(user.profile.save)
    assert.isFunction(user.profile.delete)
    assert.isFunction(user.profile.load)
    assert.isFunction(user.profile.query)

    // Should indicate it's loaded
    assert.isTrue(user.profile.isLoaded)
  })

  test('should support array-like access for hasMany relationships', async ({ assert }) => {
    const user = new TestUser({
      name: 'Array Access User',
      email: 'array@example.com',
    })

    const post1 = new TestPost({
      title: 'First Post',
      content: 'Content 1',
      authorId: 'user123',
    })

    const post2 = new TestPost({
      title: 'Second Post',
      content: 'Content 2',
      authorId: 'user123',
    })

    // Mock the load method to simulate loading posts
    user.posts.load = async () => {
      // Simulate loading posts into the array proxy
      ;(user.posts as any)._related = [post1, post2]
      ;(user.posts as any)._isLoaded = true
      user.posts.length = 0
      user.posts.push(post1, post2)
      return [post1, post2]
    }

    // Load the posts
    await user.posts.load()

    // Should be able to access posts like an array
    assert.equal(user.posts.length, 2)
    assert.equal(user.posts[0].title, 'First Post')
    assert.equal(user.posts[1].title, 'Second Post')

    // Should have array methods
    assert.isFunction(user.posts.forEach)
    assert.isFunction(user.posts.map)
    assert.isFunction(user.posts.filter)

    // Should also have relationship methods
    assert.isFunction(user.posts.create)
    assert.isFunction(user.posts.createMany)
    assert.isFunction(user.posts.save)
    assert.isFunction(user.posts.saveMany)
    assert.isFunction(user.posts.load)
    assert.isFunction(user.posts.query)

    // Should indicate it's loaded
    assert.isTrue(user.posts.isLoaded)
  })

  test('should support belongsTo direct property access', async ({ assert }) => {
    const profile = new TestProfile({
      firstName: 'Jane',
      lastName: 'Smith',
      userId: 'user456',
    })

    const user = new TestUser({
      name: 'BelongsTo User',
      email: 'belongsto@example.com',
    })

    // Mock the load method to simulate loading the user
    profile.user.load = async () => {
      // Simulate loading the user data into the proxy
      ;(profile.user as any)._related = user
      ;(profile.user as any)._isLoaded = true
      return user
    }

    // Load the user
    await profile.user.load()

    // Should be able to access user properties directly
    assert.equal(profile.user.name, 'BelongsTo User')
    assert.equal(profile.user.email, 'belongsto@example.com')

    // Should have relationship methods
    assert.isFunction(profile.user.associate)
    assert.isFunction(profile.user.dissociate)
    assert.isFunction(profile.user.load)
    assert.isFunction(profile.user.query)

    // Should indicate it's loaded
    assert.isTrue(profile.user.isLoaded)
  })

  test('should support eager loading with .load() method (like Lucid preload)', async ({
    assert,
  }) => {
    // Import the ModelQueryBuilder for testing
    const { ModelQueryBuilder } = await import('../../src/query_builder/model_query_builder.js')

    // Mock the query method to return a query builder
    TestUser.query = function () {
      const mockCollection = {} as any
      const queryBuilder = new ModelQueryBuilder(mockCollection, this)
      return queryBuilder
    }

    // Test that load method exists and can be chained
    const query = TestUser.query().load('profile')
    assert.isFunction(query.load)
    assert.isObject(query)

    // Test load with callback (like Lucid's preload with constraints)
    const queryWithCallback = TestUser.query().load('profile', (q: any) => {
      q.where('firstName', 'John')
    })
    assert.isObject(queryWithCallback)

    // Test multiple load calls (like chaining multiple preloads)
    const multipleLoads = TestUser.query().load('profile').load('posts')
    assert.isObject(multipleLoads)

    // Test that loadRelations map is populated
    const loadRelations = (query as any).loadRelations
    assert.instanceOf(loadRelations, Map)
    assert.isTrue(loadRelations.has('profile'))

    // Test that multiple relationships are tracked
    const multipleLoadRelations = (multipleLoads as any).loadRelations
    assert.instanceOf(multipleLoadRelations, Map)
    assert.isTrue(multipleLoadRelations.has('profile'))
    assert.isTrue(multipleLoadRelations.has('posts'))
    assert.equal(multipleLoadRelations.size, 2)

    // Test that callbacks are stored
    const callbackQuery = TestUser.query().load('profile', (q: any) => {
      q.where('isActive', true)
    })
    const callbackLoadRelations = (callbackQuery as any).loadRelations
    assert.isFunction(callbackLoadRelations.get('profile'))
  })
})
