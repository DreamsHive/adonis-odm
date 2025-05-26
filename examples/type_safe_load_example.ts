import { BaseModel } from '../src/base_model/base_model.js'
import { column, hasOne, hasMany, belongsTo } from '../src/decorators/column.js'
import { DateTime } from 'luxon'
import type {
  HasOne,
  HasMany,
  BelongsTo,
  TypeSafeLoadCallback,
} from '../src/types/relationships.js'

/**
 * Type-Safe Load Method Example
 *
 * This example demonstrates the enhanced type-safe .load() method that works
 * exactly like AdonisJS Lucid's .preload() method with full TypeScript support.
 *
 * Key Features:
 * - Automatic relationship name inference
 * - IntelliSense support for relationship names
 * - Type-safe callback parameters
 * - Compile-time error checking
 * - Method chaining like Lucid ORM
 */

// ========================================
// Model Definitions with Type-Safe Relationships
// ========================================

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
  declare userId: string

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

  @belongsTo(() => User, {
    localKey: 'authorId',
    foreignKey: '_id',
  })
  declare author: BelongsTo<typeof User>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  static getCollectionName(): string {
    return 'posts'
  }
}

class User extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare name: string

  @column()
  declare email: string

  @column()
  declare isActive: boolean

  // HasOne relationship
  @hasOne(() => Profile, {
    localKey: '_id',
    foreignKey: 'userId',
  })
  declare profile: HasOne<typeof Profile>

  // HasMany relationship
  @hasMany(() => Post, {
    localKey: '_id',
    foreignKey: 'authorId',
  })
  declare posts: HasMany<typeof Post>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  static getCollectionName(): string {
    return 'users'
  }
}

/**
 * Example usage of the type-safe .load() method
 */
async function demonstrateTypeSafeLoad() {
  console.log('🔒 Type-Safe Load Method Example')
  console.log('===============================')

  try {
    // ========================================
    // 1. Basic Type-Safe Loading
    // ========================================
    console.log('\n📝 Basic type-safe loading...')

    // ✅ Type-safe: Only valid relationship names are accepted
    const usersWithProfile = await User.query().load('profile').all()
    const usersWithPosts = await User.query().load('posts').all()

    // ✅ Type-safe: Multiple relationships can be chained
    const usersWithData = await User.query().load('profile').load('posts').all()

    console.log('✅ Basic type-safe loading completed')
    console.log(`✅ Users with profile: ${usersWithProfile.length}`)
    console.log(`✅ Users with posts: ${usersWithPosts.length}`)
    console.log(`✅ Users with both: ${usersWithData.length}`)

    // ========================================
    // 2. Type-Safe Loading with Query Constraints
    // ========================================
    console.log('\n🔍 Type-safe loading with constraints...')

    // ✅ Type-safe: Callback receives properly typed query builder
    const usersWithActiveProfiles = await User.query()
      .load('profile', (profileQuery) => {
        profileQuery.whereNotNull('bio')
      })
      .all()

    // ✅ Type-safe: Complex constraints on relationships
    const usersWithPublishedPosts = await User.query()
      .load('posts', (postsQuery) => {
        postsQuery.where('status', 'published').orderBy('createdAt', 'desc').limit(5)
      })
      .all()

    console.log('✅ Type-safe loading with constraints completed')
    console.log(`✅ Users with active profiles: ${usersWithActiveProfiles.length}`)
    console.log(`✅ Users with published posts: ${usersWithPublishedPosts.length}`)

    // ========================================
    // 3. Real-World Usage Patterns
    // ========================================
    console.log('\n🌍 Real-world usage patterns...')

    // ✅ Load users with their profiles, filtering by activity
    const activeUsers = await User.query()
      .where('isActive', true)
      .load('profile', (profileQuery) => {
        profileQuery.whereNotNull('bio')
      })
      .all()

    // ✅ Load posts with authors and their profiles
    const postsWithAuthors = await Post.query()
      .where('status', 'published')
      .load('author', (authorQuery: any) => {
        authorQuery.load('profile')
      })
      .all()

    console.log('✅ Real-world usage patterns completed')
    console.log(`✅ Active users: ${activeUsers.length}`)
    console.log(`✅ Posts with authors: ${postsWithAuthors.length}`)

    // ========================================
    // 4. Benefits Summary
    // ========================================
    console.log('\n💡 TYPE-SAFE LOAD METHOD BENEFITS')
    console.log('=================================')
    console.log('✅ IntelliSense support - IDE autocompletes relationship names')
    console.log(
      '✅ Compile-time type checking - Invalid relationship names cause TypeScript errors'
    )
    console.log('✅ Type-safe callbacks - Query builder is properly typed in callbacks')
    console.log('✅ Method chaining - Multiple .load() calls can be chained')
    console.log('✅ Identical API to Lucid - Same syntax as AdonisJS Lucid .preload()')
    console.log('✅ Prevents N+1 queries - Bulk loading prevents performance issues')

    console.log('\n🎉 Type-safe load method example completed!')
  } catch (error) {
    console.error('❌ Error in type-safe load example:', error)
  }
}

// ========================================
// Extended Type Safety for Multiple Models
// ========================================

declare module '../src/query_builder/model_query_builder.js' {
  interface ModelQueryBuilder<T> {
    // Profile model relationships
    load(relation: 'user', callback?: TypeSafeLoadCallback<any>): this

    // Post model relationships
    load(relation: 'author', callback?: TypeSafeLoadCallback<any>): this
  }
}

/**
 * Demonstrate type safety across multiple model types
 */
async function demonstrateMultiModelTypeSupport() {
  console.log('\n🔄 Multi-Model Type Support')
  console.log('===========================')

  try {
    // ✅ Type-safe for Profile model
    const profilesWithUsers = await Profile.query().load('user').all()

    // ✅ Type-safe for Post model
    const postsWithAuthors = await Post.query().load('author').all()

    // ✅ Type-safe for User model (as shown above)
    const usersWithProfiles = await User.query().load('profile').all()

    console.log('✅ Multi-model type support working correctly')
    console.log(`✅ Profiles with users: ${profilesWithUsers.length}`)
    console.log(`✅ Posts with authors: ${postsWithAuthors.length}`)
    console.log(`✅ Users with profiles: ${usersWithProfiles.length}`)

    // ========================================
    // TypeScript Compile-Time Safety Examples
    // ========================================
    console.log('\n🔒 TypeScript Compile-Time Safety')
    console.log('=================================')

    // ✅ These work (valid relationship names):
    // User.query().load('profile')     // ✅ Valid
    // User.query().load('posts')       // ✅ Valid
    // Profile.query().load('user')     // ✅ Valid
    // Post.query().load('author')      // ✅ Valid

    // ❌ These would cause TypeScript errors (invalid relationship names):
    // User.query().load('invalidName')    // ❌ TypeScript error
    // Profile.query().load('nonExistent') // ❌ TypeScript error
    // Post.query().load('wrongField')     // ❌ TypeScript error

    console.log('✅ All examples demonstrate compile-time type safety!')
  } catch (error) {
    console.error('❌ Error in multi-model type support:', error)
  }
}

// Export the example functions
export { demonstrateTypeSafeLoad, demonstrateMultiModelTypeSupport, User, Profile, Post }

// Run the example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateTypeSafeLoad().then(() => demonstrateMultiModelTypeSupport())
}
