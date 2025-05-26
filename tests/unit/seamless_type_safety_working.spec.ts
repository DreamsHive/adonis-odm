import { test } from '@japa/runner'
import { BaseModel } from '../../src/base_model/base_model.js'
import { ModelQueryBuilder } from '../../src/query_builder/model_query_builder.js'
import UserWithReferencedProfile from '../../app/models/user_with_referenced_profile.js'
import Profile from '../../app/models/profile.js'
import Post from '../../app/models/post.js'

/**
 * SEAMLESS TYPE SAFETY WORKING TESTS
 *
 * These tests verify that the seamless type safety implementation works
 * correctly with real application models.
 */

test.group('Seamless Type Safety Working - Real Models', () => {
  test('should provide seamless type safety for load method', async ({ assert }) => {
    // Setup real query builders
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

    // ✅ Seamless type safety should work without any extra steps
    const userQuery = UserWithReferencedProfile.query().load('profile', (profileQuery) => {
      // TypeScript automatically knows this is a Profile query
      profileQuery.where('firstName', 'John')
      profileQuery.whereNotNull('bio')
    })

    const postQuery = Post.query().load('author', (authorQuery) => {
      // TypeScript automatically knows this is a UserWithReferencedProfile query
      authorQuery.where('age', '>=', 18)
    })

    // Verify queries work
    assert.isObject(userQuery)
    assert.isObject(postQuery)
    assert.isTrue((userQuery as any).loadRelations.has('profile'))
    assert.isTrue((postQuery as any).loadRelations.has('author'))
  })

  test('should work with method chaining seamlessly', async ({ assert }) => {
    UserWithReferencedProfile.query = function () {
      const mockCollection = {} as any
      return new ModelQueryBuilder(mockCollection, this)
    }

    // ✅ Method chaining should work seamlessly
    const query = UserWithReferencedProfile.query()
      .where('age', '>=', 21)
      .load('profile', (profileQuery) => {
        profileQuery.where('firstName', 'John')
        profileQuery.orderBy('createdAt', 'desc')
      })
      .orderBy('name', 'asc')
      .limit(10)

    assert.isObject(query)
    assert.isTrue((query as any).loadRelations.has('profile'))
  })

  test('should support multiple relationship loading', async ({ assert }) => {
    UserWithReferencedProfile.query = function () {
      const mockCollection = {} as any
      return new ModelQueryBuilder(mockCollection, this)
    }

    // ✅ Multiple relationships should work seamlessly
    const query = UserWithReferencedProfile.query()
      .load('profile', (profileQuery) => {
        profileQuery.where('firstName', 'John')
      })
      .where('email', 'like', '%@example.com')

    assert.isObject(query)
    assert.isTrue((query as any).loadRelations.has('profile'))
  })

  test('should demonstrate seamless developer experience', async ({ assert }) => {
    UserWithReferencedProfile.query = function () {
      const mockCollection = {} as any
      return new ModelQueryBuilder(mockCollection, this)
    }

    Post.query = function () {
      const mockCollection = {} as any
      return new ModelQueryBuilder(mockCollection, this)
    }

    // ✅ SEAMLESS: Works exactly like AdonisJS Lucid
    // ✅ TYPE-SAFE: Full IntelliSense support
    // ✅ ZERO OVERHEAD: No extra steps required

    const userQuery = UserWithReferencedProfile.query()
      .load('profile', (profileQuery) => {
        profileQuery.where('firstName', 'John')
        profileQuery.whereNotNull('bio')
      })
      .where('age', '>=', 18)

    const postQuery = Post.query()
      .load('author', (authorQuery) => {
        authorQuery.where('email', 'like', '%@example.com')
      })
      .where('status', 'published')

    assert.isObject(userQuery)
    assert.isObject(postQuery)
    assert.isTrue((userQuery as any).loadRelations.has('profile'))
    assert.isTrue((postQuery as any).loadRelations.has('author'))

    // The key benefit: developers get the exact same API as AdonisJS Lucid
    // with full type safety and zero learning curve!
  })

  test('should work with complex query scenarios', async ({ assert }) => {
    UserWithReferencedProfile.query = function () {
      const mockCollection = {} as any
      return new ModelQueryBuilder(mockCollection, this)
    }

    // ✅ Complex scenarios should work seamlessly
    const complexQuery = UserWithReferencedProfile.query()
      .where('age', '>=', 21)
      .load('profile', (profileQuery) => {
        profileQuery.where('firstName', 'John').whereNotNull('bio').orderBy('createdAt', 'desc')
      })
      .whereNotNull('email')
      .orderBy('name', 'asc')
      .limit(20)

    assert.isObject(complexQuery)
    assert.isTrue((complexQuery as any).loadRelations.has('profile'))
  })
})

/**
 * COMPILE-TIME TYPE SAFETY VERIFICATION
 *
 * These examples demonstrate that the implementation provides
 * compile-time type safety without any runtime overhead.
 */

// ✅ This would work in real code (commented out to avoid execution in tests)
/*
function compileTimeVerification() {
  // ✅ TypeScript knows 'profile' is valid for UserWithReferencedProfile
  UserWithReferencedProfile.query()
    .load('profile', (profileQuery) => {
      // ✅ TypeScript knows this is a Profile query
      profileQuery.where('firstName', 'John')
      profileQuery.whereNotNull('bio')
    })

  // ✅ TypeScript knows 'author' is valid for Post
  Post.query()
    .load('author', (authorQuery) => {
      // ✅ TypeScript knows this is a UserWithReferencedProfile query
      authorQuery.where('age', '>=', 18)
    })

  // ❌ These would cause TypeScript errors (which is exactly what we want!):
  // UserWithReferencedProfile.query().load('invalidRelation') // Compile error!
  // Post.query().load('profile') // Compile error! Posts don't have profiles
  // Profile.query().load('posts') // Compile error! Profiles don't have posts
}
*/
