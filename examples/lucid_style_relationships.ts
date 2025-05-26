import { BaseModel } from '../src/base_model/base_model.js'
import { column, hasOne, hasMany, belongsTo } from '../src/decorators/column.js'
import { DateTime } from 'luxon'
import type { HasOne, HasMany, BelongsTo } from '../src/types/relationships.js'

/**
 * Lucid-Style Relationships Example
 *
 * This example demonstrates the improved developer experience using
 * Lucid-style relationship decorators that automatically handle model
 * setup with direct property access like AdonisJS Lucid ORM.
 */

// ========================================
// Model Definitions with Lucid-Style Relationships
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
  declare age?: number

  // HasOne relationship - creates proxy for direct property access
  @hasOne(() => Profile, {
    localKey: '_id',
    foreignKey: 'userId',
  })
  declare profile: HasOne<typeof Profile>

  // HasMany relationship - creates array-like proxy for direct access
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
  declare avatar?: string

  // Foreign key field
  @column()
  declare userId: string

  // BelongsTo relationship - creates proxy for direct property access
  @belongsTo(() => User, {
    localKey: 'userId',
    foreignKey: '_id',
  })
  declare user: BelongsTo<typeof User>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim()
  }

  static getCollectionName(): string {
    return 'profiles'
  }
}

/**
 * Post model with belongsTo relationship
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

  // Foreign key field
  @column()
  declare authorId: string

  // BelongsTo relationship - creates proxy for direct property access
  @belongsTo(() => User, {
    localKey: 'authorId',
    foreignKey: '_id',
  })
  declare author: BelongsTo<typeof User>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  static getCollectionName(): string {
    return 'posts'
  }
}

/**
 * Example usage of the Lucid-style relationships
 */
async function lucidStyleRelationshipsExample() {
  console.log('🚀 Lucid-Style Relationships Example')
  console.log('====================================')

  try {
    // ========================================
    // 1. Create User with HasOne Profile
    // ========================================
    console.log('\n📝 Creating user with hasOne profile relationship...')

    const user = await User.create({
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
    })

    // Create related profile using the relationship
    const profile = await user.profile.create({
      firstName: 'John',
      lastName: 'Doe',
      bio: 'Software Developer',
      avatar: 'https://example.com/avatar.jpg',
    })

    console.log('✅ User created:', user.name)
    console.log('✅ Profile created:', profile.fullName)

    // ========================================
    // 2. Create Posts with HasMany Relationship
    // ========================================
    console.log('\n📝 Creating posts with hasMany relationship...')

    const post1 = await user.posts.create({
      title: 'Getting Started with MongoDB ODM',
      content: 'This is a comprehensive guide...',
      status: 'published',
    })

    const post2 = await user.posts.create({
      title: 'Advanced Query Techniques',
      content: 'Learn advanced querying...',
      status: 'draft',
    })

    console.log('✅ Posts created:', [post1.title, post2.title])

    // ========================================
    // 3. Eager Loading Relationships (like Lucid's preload)
    // ========================================
    console.log('\n📖 Eager loading relationships...')

    // Eager load relationships to avoid N+1 queries (like Lucid's preload)
    const usersWithData = await User.query().load('profile').load('posts').all()
    console.log('✅ Users with eager loaded data:', usersWithData.length)

    usersWithData.forEach((loadedUser) => {
      console.log('✅ Profile already loaded:', loadedUser.profile?.fullName) // Direct access!
      console.log('✅ Posts already loaded:', loadedUser.posts?.length || 0) // Direct access!
    })

    // Load with constraints (like Lucid's preload with callback)
    const usersWithPublishedPosts = await User.query()
      .load('posts', (postsQuery) => {
        postsQuery.where('status', 'published')
      })
      .all()
    console.log('✅ Users with published posts loaded:', usersWithPublishedPosts.length)

    // ========================================
    // 4. Lazy Loading Relationships (on-demand)
    // ========================================
    console.log('\n📖 Lazy loading relationships...')

    // Load user's profile
    await user.profile.load()
    console.log('✅ Profile loaded:', user.profile.fullName) // Direct property access!

    // Load user's posts
    const userPosts = await user.posts.load()
    console.log('✅ Posts loaded:', userPosts.length)

    // Load post's author (belongsTo relationship)
    await post1.author.load()
    console.log('✅ Author loaded:', post1.author.name) // Direct property access!

    // ========================================
    // 5. Query Through Relationships
    // ========================================
    console.log('\n🔍 Querying through relationships...')

    // Query user's published posts only
    const publishedPosts = await user.posts.query().where('status', 'published').all()
    console.log('✅ Published posts found:', publishedPosts.length)

    // Query profiles with specific criteria
    const activeBio = await user.profile.query().whereNotNull('bio').first()
    console.log('✅ Profile with bio found:', !!activeBio)

    // Eager load with query constraints (like Lucid's preload)
    const usersWithActivePosts = await User.query()
      .load('posts', (postsQuery) => {
        postsQuery.where('status', 'published').orderBy('createdAt', 'desc')
      })
      .all()
    console.log('✅ Users with active posts loaded:', usersWithActivePosts.length)

    // ========================================
    // 6. Relationship Operations
    // ========================================
    console.log('\n🔄 Relationship operations...')

    // Update related profile - direct property access!
    await user.profile.load() // Load the profile first
    if (user.profile.firstName) {
      // Direct property access works, but for saving we need to get the actual instance
      const profileInstance = await user.profile.load()
      if (profileInstance) {
        profileInstance.bio = 'Senior Software Developer'
        await profileInstance.save()
        console.log('✅ Profile updated via relationship')
      }
    }

    // Create multiple posts at once
    const morePosts = await user.posts.createMany([
      {
        title: 'TypeScript Best Practices',
        content: 'Learn TypeScript...',
        status: 'draft',
      },
      {
        title: 'Database Design Patterns',
        content: 'Effective database design...',
        status: 'published',
      },
    ])
    console.log('✅ Multiple posts created:', morePosts.length)

    // ========================================
    // 7. BelongsTo Operations
    // ========================================
    console.log('\n🔗 BelongsTo operations...')

    // Create a new profile and associate it with a user
    const newProfile = new Profile()
    newProfile.firstName = 'Jane'
    newProfile.lastName = 'Smith'
    newProfile.bio = 'UX Designer'

    await newProfile.user.associate(user)
    console.log('✅ Profile associated with user')

    // Dissociate (if needed)
    // await newProfile.user.dissociate()

    console.log('\n🎉 Lucid-style relationships example completed!')

    // ========================================
    // 8. Benefits Summary
    // ========================================
    console.log('\n💡 BENEFITS OF LUCID-STYLE DECORATORS')
    console.log('====================================')
    console.log('✅ Direct property access like Lucid ORM - no .related needed!')
    console.log("✅ Eager loading with .load() method (like Lucid's .preload())")
    console.log('✅ Automatic relationship proxy creation when decorators are used')
    console.log('✅ Familiar API for developers coming from Lucid ORM')
    console.log('✅ Type-safe relationship definitions')
    console.log('✅ Consistent with AdonisJS patterns and conventions')
    console.log('✅ Cleaner, more maintainable code')
    console.log('✅ Prevents N+1 query problems with eager loading')
  } catch (error) {
    console.error('❌ Error in lucid-style relationships example:', error)
  }
}

// Export the example function
export { lucidStyleRelationshipsExample, User, Profile, Post }

// Run the example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  lucidStyleRelationshipsExample()
}
