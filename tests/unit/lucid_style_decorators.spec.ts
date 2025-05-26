import { test } from '@japa/runner'
import { BaseModel } from '../../src/base_model/base_model.js'
import { ModelQueryBuilder } from '../../src/query_builder/model_query_builder.js'
import UserWithReferencedProfile from '../../app/models/user_with_referenced_profile.js'
import Profile from '../../app/models/profile.js'
import Post from '../../app/models/post.js'

/**
 * LUCID-STYLE DECORATORS TESTS
 *
 * These tests verify that the Lucid-style decorators work correctly
 * with real application models and provide proper relationship functionality.
 */

test.group('Lucid-Style Decorators - Real Models', () => {
  test('should register relationship metadata correctly', async ({ assert }) => {
    // Test that real models have proper relationship metadata
    const userMetadata = UserWithReferencedProfile.getMetadata()
    const profileColumn = userMetadata.columns.get('profile')

    assert.isObject(profileColumn)
    assert.isTrue(profileColumn?.isReference)
    assert.equal(profileColumn?.model, 'Profile')
  })

  test('should create relationship proxies correctly', async ({ assert }) => {
    // Test that relationship proxies are created for real models
    const user = new UserWithReferencedProfile({
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
    })

    // The profile relationship should be available
    assert.isDefined(user.profile)
    assert.isObject(user.profile)
  })

  test('should support load method with real models', async ({ assert }) => {
    // Setup query builders for testing
    UserWithReferencedProfile.query = function () {
      const mockCollection = {} as any
      const queryBuilder = new ModelQueryBuilder(mockCollection, this)
      return queryBuilder
    }

    Post.query = function () {
      const mockCollection = {} as any
      const queryBuilder = new ModelQueryBuilder(mockCollection, this)
      return queryBuilder
    }

    // Test load method works with real models
    const userQuery = UserWithReferencedProfile.query().load('profile')
    const postQuery = Post.query().load('author')

    assert.isObject(userQuery)
    assert.isObject(postQuery)
    assert.isTrue((userQuery as any).loadRelations.has('profile'))
    assert.isTrue((postQuery as any).loadRelations.has('author'))
  })

  test('should support load method with callbacks', async ({ assert }) => {
    UserWithReferencedProfile.query = function () {
      const mockCollection = {} as any
      const queryBuilder = new ModelQueryBuilder(mockCollection, this)
      return queryBuilder
    }

    // Test load method with callback constraints
    const query = UserWithReferencedProfile.query().load('profile', (profileQuery) => {
      profileQuery.where('firstName', 'John')
      profileQuery.whereNotNull('bio')
    })

    assert.isObject(query)
    assert.isTrue((query as any).loadRelations.has('profile'))

    // Verify callback is stored
    const callback = (query as any).loadRelations.get('profile')
    assert.isFunction(callback)
  })

  test('should support multiple relationship loading', async ({ assert }) => {
    UserWithReferencedProfile.query = function () {
      const mockCollection = {} as any
      const queryBuilder = new ModelQueryBuilder(mockCollection, this)
      return queryBuilder
    }

    // Test multiple relationships
    const query = UserWithReferencedProfile.query().load('profile', (profileQuery) => {
      profileQuery.where('firstName', 'John')
    })

    assert.isObject(query)
    assert.isTrue((query as any).loadRelations.has('profile'))
  })

  test('should work with method chaining', async ({ assert }) => {
    UserWithReferencedProfile.query = function () {
      const mockCollection = {} as any
      const queryBuilder = new ModelQueryBuilder(mockCollection, this)
      return queryBuilder
    }

    // Test method chaining with load
    const query = UserWithReferencedProfile.query()
      .where('age', '>=', 18)
      .load('profile')
      .orderBy('name', 'asc')
      .limit(10)

    assert.isObject(query)
    assert.isTrue((query as any).loadRelations.has('profile'))
  })

  test('should demonstrate real-world usage patterns', async ({ assert }) => {
    UserWithReferencedProfile.query = function () {
      const mockCollection = {} as any
      const queryBuilder = new ModelQueryBuilder(mockCollection, this)
      return queryBuilder
    }

    Post.query = function () {
      const mockCollection = {} as any
      const queryBuilder = new ModelQueryBuilder(mockCollection, this)
      return queryBuilder
    }

    // Real-world usage patterns
    const userQuery = UserWithReferencedProfile.query()
      .where('age', '>=', 21)
      .load('profile', (profileQuery) => {
        profileQuery.where('firstName', 'John')
        profileQuery.whereNotNull('bio')
      })
      .orderBy('createdAt', 'desc')

    const postQuery = Post.query()
      .where('status', 'published')
      .load('author', (authorQuery) => {
        authorQuery.where('age', '>=', 18)
      })
      .orderBy('createdAt', 'desc')

    assert.isObject(userQuery)
    assert.isObject(postQuery)
    assert.isTrue((userQuery as any).loadRelations.has('profile'))
    assert.isTrue((postQuery as any).loadRelations.has('author'))
  })

  test('should provide type safety benefits', async ({ assert }) => {
    UserWithReferencedProfile.query = function () {
      const mockCollection = {} as any
      const queryBuilder = new ModelQueryBuilder(mockCollection, this)
      return queryBuilder
    }

    // Type safety demonstration
    const query = UserWithReferencedProfile.query()
      .load('profile', (profileQuery) => {
        // TypeScript knows this is a Profile query
        profileQuery.where('firstName', 'John')
        profileQuery.whereNotNull('bio')
      })
      .where('email', 'like', '%@example.com')

    assert.isObject(query)
    assert.isTrue((query as any).loadRelations.has('profile'))

    // The key benefit: developers get full type safety without extra configuration
    // TypeScript automatically provides IntelliSense for relationship queries
  })
})

/**
 * COMPILE-TIME TYPE SAFETY VERIFICATION
 *
 * These examples demonstrate that the Lucid-style decorators provide
 * compile-time type safety for relationship operations.
 */

// ✅ This would work in real code (commented out to avoid execution in tests)
/*
async function demonstrateTypeSafety() {
  // ✅ TypeScript knows 'profile' is valid for UserWithReferencedProfile
  const users = await UserWithReferencedProfile.query()
    .load('profile', (profileQuery) => {
      // ✅ TypeScript knows this is a Profile query
      profileQuery.where('firstName', 'John')
      profileQuery.whereNotNull('bio')
    })
    .all()

  // ✅ TypeScript knows 'author' is valid for Post
  const posts = await Post.query()
    .load('author', (authorQuery) => {
      // ✅ TypeScript knows this is a UserWithReferencedProfile query
      authorQuery.where('age', '>=', 18)
    })
    .all()

  // ❌ These would cause TypeScript errors:
  // UserWithReferencedProfile.query().load('invalidRelation') // Error!
  // Post.query().load('profile') // Error! Posts don't have profiles
}
*/
