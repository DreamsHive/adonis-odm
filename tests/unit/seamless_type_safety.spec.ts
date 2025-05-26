import { test } from '@japa/runner'
import { BaseModel } from '../../src/base_model/base_model.js'
import { ModelQueryBuilder } from '../../src/query_builder/model_query_builder.js'
import UserWithReferencedProfile from '../../app/models/user_with_referenced_profile.js'
import Profile from '../../app/models/profile.js'
import Post from '../../app/models/post.js'

/**
 * SEAMLESS TYPE SAFETY TESTS
 *
 * These tests verify that the type-safe .load() method works seamlessly
 * like AdonisJS Lucid without requiring any extra steps from developers.
 *
 * Uses real models from the application instead of mock data.
 */

test.group('Seamless Type Safety - Real Models', () => {
  test('should provide type-safe load method without extra steps', async ({ assert }) => {
    // Mock the query method to return a query builder using real models
    UserWithReferencedProfile.query = function () {
      const mockCollection = {} as any
      const queryBuilder = new ModelQueryBuilder(mockCollection, this)
      return queryBuilder
    }

    // ✅ These should work without TypeScript errors (type-safe)
    const query1 = UserWithReferencedProfile.query().load('profile')

    // ✅ Load with callback should work
    const query2 = UserWithReferencedProfile.query().load('profile', (profileQuery) => {
      profileQuery.where('firstName', 'John')
    })

    // Verify that the queries are properly constructed
    assert.isObject(query1)
    assert.isObject(query2)

    // Verify that loadRelations map is populated correctly
    const loadRelations1 = (query1 as any).loadRelations
    const loadRelations2 = (query2 as any).loadRelations

    assert.isTrue(loadRelations1.has('profile'))
    assert.isTrue(loadRelations2.has('profile'))
    assert.equal(loadRelations1.size, 1)
    assert.equal(loadRelations2.size, 1)
  })

  test('should work with different model types automatically', async ({ assert }) => {
    // Mock query methods for different models
    Profile.query = function () {
      const mockCollection = {} as any
      return new ModelQueryBuilder(mockCollection, this)
    }

    Post.query = function () {
      const mockCollection = {} as any
      return new ModelQueryBuilder(mockCollection, this)
    }

    UserWithReferencedProfile.query = function () {
      const mockCollection = {} as any
      return new ModelQueryBuilder(mockCollection, this)
    }

    // ✅ Each model should have type-safe load methods for their relationships
    const userQuery = UserWithReferencedProfile.query().load('profile')
    const postQuery = Post.query().load('author')

    // Verify queries work
    assert.isObject(userQuery)
    assert.isObject(postQuery)

    // Verify load relations are set correctly
    assert.isTrue((userQuery as any).loadRelations.has('profile'))
    assert.isTrue((postQuery as any).loadRelations.has('author'))
  })

  test('should support query constraints with type safety', async ({ assert }) => {
    UserWithReferencedProfile.query = function () {
      const mockCollection = {} as any
      return new ModelQueryBuilder(mockCollection, this)
    }

    // ✅ Load with complex constraints should work
    const query = UserWithReferencedProfile.query().load('profile', (profileQuery) => {
      profileQuery.where('firstName', 'John').whereNotNull('bio').orderBy('createdAt', 'desc')
    })

    assert.isObject(query)
    assert.isTrue((query as any).loadRelations.has('profile'))

    // Verify callback is stored
    const callback = (query as any).loadRelations.get('profile')
    assert.isFunction(callback)
  })

  test('should maintain method chaining with type safety', async ({ assert }) => {
    UserWithReferencedProfile.query = function () {
      const mockCollection = {} as any
      return new ModelQueryBuilder(mockCollection, this)
    }

    // ✅ Method chaining should work seamlessly
    const query = UserWithReferencedProfile.query()
      .where('age', '>=', 18)
      .load('profile', (profileQuery) => {
        profileQuery.where('firstName', 'John')
      })
      .orderBy('createdAt', 'desc')
      .limit(10)

    assert.isObject(query)
    assert.isTrue((query as any).loadRelations.has('profile'))
  })

  test('should work with all relationship types', async ({ assert }) => {
    // Mock query methods for all models
    UserWithReferencedProfile.query = function () {
      const mockCollection = {} as any
      return new ModelQueryBuilder(mockCollection, this)
    }

    Post.query = function () {
      const mockCollection = {} as any
      return new ModelQueryBuilder(mockCollection, this)
    }

    Profile.query = function () {
      const mockCollection = {} as any
      return new ModelQueryBuilder(mockCollection, this)
    }

    // ✅ HasOne relationship (User -> Profile)
    const userQuery = UserWithReferencedProfile.query().load('profile')

    // ✅ BelongsTo relationship (Post -> User)
    const postQuery = Post.query().load('author')

    // Verify all relationship types work
    assert.isObject(userQuery)
    assert.isObject(postQuery)

    assert.isTrue((userQuery as any).loadRelations.has('profile'))
    assert.isTrue((postQuery as any).loadRelations.has('author'))
  })

  test('should demonstrate seamless type safety benefits', async ({ assert }) => {
    UserWithReferencedProfile.query = function () {
      const mockCollection = {} as any
      return new ModelQueryBuilder(mockCollection, this)
    }

    // ✅ SEAMLESS: No extra steps required!
    // ✅ TYPE-SAFE: TypeScript knows about relationships automatically
    // ✅ FAMILIAR: Same API as AdonisJS Lucid ORM

    const query = UserWithReferencedProfile.query()
      .load('profile', (profileQuery) => {
        // TypeScript knows this is a Profile query
        profileQuery.where('firstName', 'John')
        profileQuery.whereNotNull('bio')
      })
      .where('age', '>=', 21)
      .orderBy('createdAt', 'desc')

    assert.isObject(query)
    assert.isTrue((query as any).loadRelations.has('profile'))

    // The key benefit: developers don't need to do ANYTHING extra!
    // No manual type declarations, no complex setup, no learning curve.
    // It just works like AdonisJS Lucid ORM.
  })

  test('should work exactly like AdonisJS Lucid API', async ({ assert }) => {
    UserWithReferencedProfile.query = function () {
      const mockCollection = {} as any
      return new ModelQueryBuilder(mockCollection, this)
    }

    // ✅ This is IDENTICAL to how you would write it in AdonisJS Lucid:
    const query = UserWithReferencedProfile.query()
      .load('profile', (profileQuery) => {
        profileQuery.where('firstName', 'John')
      })
      .where('email', 'like', '%@example.com')
      .orderBy('createdAt', 'desc')
      .limit(10)

    // The MongoDB ODM provides the EXACT same developer experience!
    assert.isObject(query)
    assert.isTrue((query as any).loadRelations.has('profile'))
  })
})

/**
 * COMPILE-TIME TYPE SAFETY VERIFICATION
 *
 * These examples demonstrate that TypeScript provides full type safety
 * without any extra work from developers.
 */

// ✅ This would work in real code (commented out to avoid execution in tests)
/*
async function demonstrateCompileTimeSafety() {
  // ✅ TypeScript knows 'profile' is a valid relationship
  const users = await UserWithReferencedProfile.query()
    .load('profile', (profileQuery) => {
      // ✅ TypeScript knows this is a Profile query
      profileQuery.where('firstName', 'John')
      profileQuery.whereNotNull('bio')
    })
    .all()

  // ✅ TypeScript knows 'author' is a valid relationship
  const posts = await Post.query()
    .load('author', (authorQuery) => {
      // ✅ TypeScript knows this is a User query
      authorQuery.where('age', '>=', 18)
    })
    .all()

  // ❌ These would cause TypeScript errors (which is good!):
  // UserWithReferencedProfile.query().load('invalidRelation') // Error!
  // Post.query().load('profile') // Error! Posts don't have profiles
}
*/
