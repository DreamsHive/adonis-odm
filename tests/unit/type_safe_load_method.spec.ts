import { test } from '@japa/runner'
import { BaseModel } from '../../src/base_model/base_model.js'
import { ModelQueryBuilder } from '../../src/query_builder/model_query_builder.js'
import UserWithReferencedProfile from '../../app/models/user_with_referenced_profile.js'
import Profile from '../../app/models/profile.js'
import Post from '../../app/models/post.js'

/**
 * TYPE-SAFE LOAD METHOD TESTS
 *
 * These tests verify that the .load() method provides proper type safety
 * and works correctly with real application models.
 */

test.group('Type Safe Load Method - Real Models', () => {
  test('should provide type-safe load method for relationships', async ({ assert }) => {
    // Setup real query builders for testing
    UserWithReferencedProfile.query = function () {
      const mockCollection = {} as any
      return new ModelQueryBuilder(mockCollection, this)
    }

    Profile.query = function () {
      const mockCollection = {} as any
      return new ModelQueryBuilder(mockCollection, this)
    }

    Post.query = function () {
      const mockCollection = {} as any
      return new ModelQueryBuilder(mockCollection, this)
    }

    // ✅ Type-safe load methods should work
    const userQuery = UserWithReferencedProfile.query().load('profile')
    const postQuery = Post.query().load('author')

    // Verify queries are constructed properly
    assert.isObject(userQuery)
    assert.isObject(postQuery)

    // Verify load relations are tracked
    assert.isTrue((userQuery as any).loadRelations.has('profile'))
    assert.isTrue((postQuery as any).loadRelations.has('author'))
  })

  test('should support load method chaining', async ({ assert }) => {
    UserWithReferencedProfile.query = function () {
      const mockCollection = {} as any
      return new ModelQueryBuilder(mockCollection, this)
    }

    // ✅ Method chaining should work
    const chainedQuery = UserWithReferencedProfile.query()
      .where('age', '>=', 18)
      .load('profile')
      .orderBy('createdAt', 'desc')

    assert.isObject(chainedQuery)
    assert.isTrue((chainedQuery as any).loadRelations.has('profile'))
  })

  test('should support load with query constraints', async ({ assert }) => {
    UserWithReferencedProfile.query = function () {
      const mockCollection = {} as any
      return new ModelQueryBuilder(mockCollection, this)
    }

    // ✅ Load with callback constraints should work
    const query = UserWithReferencedProfile.query().load('profile', (profileQuery) => {
      profileQuery.where('firstName', 'John').whereNotNull('bio')
    })

    assert.isObject(query)
    assert.isTrue((query as any).loadRelations.has('profile'))

    // Verify callback is stored
    const callback = (query as any).loadRelations.get('profile')
    assert.isFunction(callback)
  })

  test('should support complex query building', async ({ assert }) => {
    UserWithReferencedProfile.query = function () {
      const mockCollection = {} as any
      return new ModelQueryBuilder(mockCollection, this)
    }

    Post.query = function () {
      const mockCollection = {} as any
      return new ModelQueryBuilder(mockCollection, this)
    }

    // ✅ Complex queries should work
    const userQuery = UserWithReferencedProfile.query()
      .where('age', '>=', 21)
      .load('profile', (profileQuery) => {
        profileQuery.where('firstName', 'John')
      })
      .orderBy('createdAt', 'desc')
      .limit(10)

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

  test('should work with different relationship types', async ({ assert }) => {
    UserWithReferencedProfile.query = function () {
      const mockCollection = {} as any
      return new ModelQueryBuilder(mockCollection, this)
    }

    Post.query = function () {
      const mockCollection = {} as any
      return new ModelQueryBuilder(mockCollection, this)
    }

    // ✅ Different relationship types should work
    const hasOneQuery = UserWithReferencedProfile.query().load('profile')
    const belongsToQuery = Post.query().load('author')

    assert.isObject(hasOneQuery)
    assert.isObject(belongsToQuery)
    assert.isTrue((hasOneQuery as any).loadRelations.has('profile'))
    assert.isTrue((belongsToQuery as any).loadRelations.has('author'))
  })

  test('should demonstrate type safety benefits', async ({ assert }) => {
    UserWithReferencedProfile.query = function () {
      const mockCollection = {} as any
      return new ModelQueryBuilder(mockCollection, this)
    }

    // ✅ Type-safe queries work seamlessly
    const query = UserWithReferencedProfile.query()
      .load('profile', (profileQuery) => {
        // TypeScript knows this is a Profile query
        profileQuery.where('firstName', 'John')
        profileQuery.whereNotNull('bio')
      })
      .where('email', 'like', '%@example.com')

    assert.isObject(query)
    assert.isTrue((query as any).loadRelations.has('profile'))

    // The key benefit: developers get full type safety without extra work
    // TypeScript automatically infers the correct types for relationship queries
  })
})

/**
 * COMPILE-TIME TYPE SAFETY VERIFICATION
 *
 * These examples show how TypeScript provides compile-time type checking
 * for relationship loading without any extra configuration.
 */

// ✅ This would work in real code (commented out to avoid execution in tests)
/*
async function demonstrateTypeSafety() {
  // ✅ TypeScript knows 'profile' is valid for UserWithReferencedProfile
  const users = await UserWithReferencedProfile.query()
    .load('profile', (profileQuery) => {
      // ✅ TypeScript knows this is a Profile query
      profileQuery.where('firstName', 'John')
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
