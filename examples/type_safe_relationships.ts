import { BaseModel } from '../src/base_model/base_model.js'
import { column, hasOne, hasMany, belongsTo } from '../src/decorators/column.js'
import { DateTime } from 'luxon'
import type { HasOne, HasMany, BelongsTo } from '../src/types/relationships.js'

/**
 * Seamless Type-Safe Relationships Example
 *
 * This example demonstrates the seamless type-safe .load() method that works
 * exactly like AdonisJS Lucid's .preload() method with automatic TypeScript support.
 *
 * Key Features:
 * - Seamless type safety - no explicit type annotations needed
 * - Automatic type inference for callback parameters
 * - Type-safe relationship keys (only valid relationship names are accepted)
 * - Support for nested relationships
 * - Method chaining like Lucid ORM
 * - Full IntelliSense support without any extra steps
 */

// ========================================
// Model Definitions with Type-Safe Relationships
// ========================================

/**
 * User model with hasOne and hasMany relationships
 */
class User extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare name: string

  @column()
  declare email: string

  @column()
  declare isActive: boolean

  // HasOne relationship - type-safe property access
  @hasOne(() => Profile, {
    localKey: '_id',
    foreignKey: 'userId',
  })
  declare profile: HasOne<typeof Profile>

  // HasMany relationship - type-safe array access
  @hasMany(() => Post, {
    localKey: '_id',
    foreignKey: 'authorId',
  })
  declare posts: HasMany<typeof Post>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  static getCollectionName(): string {
    return 'users'
  }
}

/**
 * Profile model with belongsTo relationship
 */
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
  declare country: string

  @column()
  declare isActive: boolean

  @column()
  declare userId: string

  // BelongsTo relationship - type-safe property access
  @belongsTo(() => User, {
    localKey: 'userId',
    foreignKey: '_id',
  })
  declare user: BelongsTo<typeof User>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim()
  }

  static getCollectionName(): string {
    return 'profiles'
  }
}

/**
 * Post model with belongsTo and hasMany relationships
 */
class Post extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare title: string

  @column()
  declare content: string

  @column()
  declare status: 'draft' | 'published' | 'archived'

  @column()
  declare authorId: string

  // BelongsTo relationship
  @belongsTo(() => User, {
    localKey: 'authorId',
    foreignKey: '_id',
  })
  declare author: BelongsTo<typeof User>

  // HasMany relationship
  @hasMany(() => Comment, {
    localKey: '_id',
    foreignKey: 'postId',
  })
  declare comments: HasMany<typeof Comment>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  static getCollectionName(): string {
    return 'posts'
  }
}

/**
 * Comment model with belongsTo relationships
 */
class Comment extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare content: string

  @column()
  declare isApproved: boolean

  @column()
  declare postId: string

  @column()
  declare authorId: string

  // BelongsTo relationships
  @belongsTo(() => Post, {
    localKey: 'postId',
    foreignKey: '_id',
  })
  declare post: BelongsTo<typeof Post>

  @belongsTo(() => User, {
    localKey: 'authorId',
    foreignKey: '_id',
  })
  declare author: BelongsTo<typeof User>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  static getCollectionName(): string {
    return 'comments'
  }
}

/**
 * Example usage of the seamless type-safe .load() method
 */
async function typeSafeRelationshipsExample() {
  console.log('🚀 Seamless Type-Safe Relationships Example')
  console.log('===========================================')

  try {
    // ========================================
    // 1. Basic Seamless Loading (like Lucid's preload)
    // ========================================
    console.log('\n📝 Basic seamless loading...')

    // ✅ Seamless: Only valid relationship names are accepted
    const usersWithProfile = await User.query().load('profile').all()
    const usersWithPosts = await User.query().load('posts').all()

    // ✅ Seamless: Multiple relationships can be chained
    const usersWithData = await User.query().load('profile').load('posts').all()

    console.log('✅ Basic seamless loading completed')

    // ========================================
    // 2. Seamless Loading with Query Constraints
    // ========================================
    console.log('\n🔍 Seamless loading with constraints...')

    // ✅ Seamless: Callback receives automatically typed query builder
    const usersWithActiveProfiles = await User.query()
      .load('profile', (profileQuery) => {
        profileQuery.where('isActive', true)
        profileQuery.whereNotNull('bio')
      })
      .all()

    // ✅ Seamless: Complex constraints on relationships
    const usersWithPublishedPosts = await User.query()
      .load('posts', (postsQuery) => {
        postsQuery.where('status', 'published')
        postsQuery.orderBy('createdAt', 'desc')
      })
      .all()

    // Load posts with approved comments
    const postsWithApprovedComments = await Post.query()
      .load('comments', (commentsQuery) => {
        commentsQuery.where('isApproved', true)
        commentsQuery.orderBy('createdAt', 'asc')
      })
      .all()

    console.log('✅ Seamless loading with constraints completed')

    // ========================================
    // 3. Nested Seamless Loading (like Lucid's nested preload)
    // ========================================
    console.log('\n🔗 Nested seamless loading...')

    // ✅ Seamless: Deeply nested relationships
    const usersWithNestedData = await User.query()
      .load('posts', (postsQuery) => {
        postsQuery.where('status', 'published').load('comments', (commentsQuery) => {
          commentsQuery.where('isApproved', true).load('author') // Load comment authors
        })
      })
      .all()

    console.log('✅ Nested seamless loading completed')

    // ========================================
    // 4. Real-World Usage Patterns
    // ========================================
    console.log('\n🌍 Real-world usage patterns...')

    // ✅ Load users with their profiles, filtering by country
    const usersFromUS = await User.query()
      .where('isActive', true)
      .load('profile', (profileQuery) => {
        profileQuery.where('country', 'US')
      })
      .all()

    // ✅ Load posts with authors and their profiles
    const postsWithAuthors = await Post.query()
      .where('status', 'published')
      .load('author', (authorQuery) => {
        authorQuery.load('profile')
      })
      .all()

    // ✅ Load posts with approved comments and comment authors
    const postsWithComments = await Post.query()
      .load('comments', (commentsQuery) => {
        commentsQuery.where('isApproved', true).load('author', (authorQuery) => {
          authorQuery.load('profile')
        })
      })
      .all()

    console.log('✅ Real-world usage patterns completed')

    // ========================================
    // 5. Advanced Seamless Patterns
    // ========================================
    console.log('\n🚀 Advanced seamless patterns...')

    // ✅ Complex filtering with multiple relationships
    const complexQuery = await User.query()
      .where('isActive', true)
      .load('profile', (profileQuery) => {
        profileQuery.whereNotNull('bio').where('country', 'US')
      })
      .load('posts', (postsQuery) => {
        postsQuery
          .where('status', 'published')
          .where('createdAt', '>', new Date('2023-01-01'))
          .orderBy('createdAt', 'desc')
          .limit(10)
          .load('comments', (commentsQuery) => {
            commentsQuery.where('isApproved', true).orderBy('createdAt', 'asc')
          })
      })
      .all()

    console.log('✅ Advanced seamless patterns completed')

    // ========================================
    // 6. Benefits Summary
    // ========================================
    console.log('\n💡 SEAMLESS TYPE-SAFE LOAD METHOD BENEFITS')
    console.log('==========================================')
    console.log('✅ Zero extra steps - No type annotations required')
    console.log('✅ Automatic type inference - Callback parameters are automatically typed')
    console.log('✅ IntelliSense support - IDE autocompletes relationship names and methods')
    console.log(
      '✅ Compile-time type checking - Invalid relationship names cause TypeScript errors'
    )
    console.log('✅ Seamless callbacks - Query builder is automatically typed in callbacks')
    console.log('✅ Nested relationship support - Deep nesting with full type safety')
    console.log('✅ Method chaining - Multiple .load() calls can be chained')
    console.log('✅ Identical API to Lucid - Same syntax as AdonisJS Lucid .preload()')
    console.log('✅ Prevents N+1 queries - Bulk loading prevents performance issues')
    console.log('✅ Runtime safety - Type errors are caught at compile time')

    // ========================================
    // 7. TypeScript Examples (Compile-time Safety)
    // ========================================
    console.log('\n🔒 TypeScript Compile-Time Safety Examples')
    console.log('==========================================')

    // ✅ These work (valid relationship names):
    // User.query().load('profile')     // ✅ Valid - profileQuery automatically typed
    // User.query().load('posts')       // ✅ Valid - postsQuery automatically typed
    // Post.query().load('author')      // ✅ Valid - authorQuery automatically typed
    // Post.query().load('comments')    // ✅ Valid - commentsQuery automatically typed

    // ❌ These would cause TypeScript errors (invalid relationship names):
    // User.query().load('invalidName')    // ❌ TypeScript error
    // User.query().load('nonExistent')    // ❌ TypeScript error
    // Post.query().load('wrongField')     // ❌ TypeScript error

    console.log('✅ All examples demonstrate seamless compile-time type safety!')

    console.log('\n🎉 Seamless type-safe relationships example completed!')

    console.log('✅ Users with active profiles:', usersWithActiveProfiles.length)
    console.log('✅ Users with published posts:', usersWithPublishedPosts.length)
    console.log('✅ Posts with approved comments:', postsWithApprovedComments.length)
  } catch (error) {
    console.error('❌ Error in type-safe relationships example:', error)
  }
}

// Export the example function and models
export { typeSafeRelationshipsExample, User, Profile, Post, Comment }

// Run the example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  typeSafeRelationshipsExample()
}
