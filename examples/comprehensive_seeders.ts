/**
 * Comprehensive Seeder Examples
 *
 * This file demonstrates various seeder patterns and best practices
 * for the Adonis ODM seeding system.
 */

import { BaseSeeder } from 'adonis-odm/seeders'
import User from '#models/user'
import Role from '#models/role'
import Post from '#models/post'
import Comment from '#models/comment'
import Category from '#models/category'
import AnalyticsEvent from '#models/analytics_event'

// =============================================================================
// 1. BASIC SEEDER EXAMPLE
// =============================================================================

export class BasicUserSeeder extends BaseSeeder {
  async run() {
    await User.createMany([
      {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        isActive: true,
      },
      {
        name: 'Jane Smith',
        email: 'jane@example.com',
        age: 28,
        isActive: true,
      },
    ])
  }
}

// =============================================================================
// 2. ENVIRONMENT-SPECIFIC SEEDERS
// =============================================================================

export class DevelopmentUserSeeder extends BaseSeeder {
  // Only run in development and testing environments
  static environment = ['development', 'testing']

  async run() {
    await User.createMany([
      {
        name: 'Dev Admin',
        email: 'admin@dev.local',
        role: 'admin',
        isActive: true,
      },
      {
        name: 'Test User',
        email: 'test@dev.local',
        role: 'user',
        isActive: true,
      },
    ])
  }
}

export class ProductionRoleSeeder extends BaseSeeder {
  // Safe to run in production
  static environment = ['staging', 'production']

  async run() {
    // Check if roles already exist to avoid duplicates
    const existingRoles = await Role.query().limit(1)
    if (existingRoles.length > 0) {
      console.log('Roles already exist, skipping seeder')
      return
    }

    await Role.createMany([
      {
        name: 'admin',
        permissions: ['users:read', 'users:write', 'posts:read', 'posts:write'],
        description: 'Administrator with full permissions',
      },
      {
        name: 'editor',
        permissions: ['posts:read', 'posts:write'],
        description: 'Content editor',
      },
      {
        name: 'user',
        permissions: ['posts:read'],
        description: 'Regular user with read access',
      },
    ])
  }
}

// =============================================================================
// 3. EXECUTION ORDER AND DEPENDENCIES
// =============================================================================

export class RoleSeeder extends BaseSeeder {
  // Run first (lower order numbers run first)
  static order = 1

  async run() {
    await Role.createMany([
      { name: 'admin', permissions: ['*'] },
      { name: 'user', permissions: ['read'] },
    ])
  }
}

export class UserSeeder extends BaseSeeder {
  // Run after RoleSeeder
  static order = 2
  static dependencies = ['RoleSeeder']

  async run() {
    const adminRole = await Role.findBy('name', 'admin')
    const userRole = await Role.findBy('name', 'user')

    await User.createMany([
      {
        name: 'Admin User',
        email: 'admin@example.com',
        roleId: adminRole?._id,
      },
      {
        name: 'Regular User',
        email: 'user@example.com',
        roleId: userRole?._id,
      },
    ])
  }
}

export class PostSeeder extends BaseSeeder {
  static order = 3
  static dependencies = ['UserSeeder']

  async run() {
    const users = await User.all()

    for (const user of users) {
      await Post.createMany([
        {
          title: `${user.name}'s First Post`,
          content: 'This is my first blog post!',
          authorId: user._id,
          isPublished: true,
        },
        {
          title: `Draft by ${user.name}`,
          content: 'Work in progress...',
          authorId: user._id,
          isPublished: false,
        },
      ])
    }
  }
}

// =============================================================================
// 4. MAIN SEEDER (RUNS FIRST AUTOMATICALLY)
// =============================================================================

export class MainSeeder extends BaseSeeder {
  // Main seeders automatically get order = 0
  // This would be in database/seeders/index.ts or main.ts

  async run() {
    console.log('🌱 Starting database seeding...')

    // Perform any setup tasks
    await this.setupDatabase()

    console.log('✅ Database setup complete')
  }

  private async setupDatabase() {
    // Create indexes, set up initial configuration, etc.
    console.log('Setting up database indexes and configuration...')
  }
}

// =============================================================================
// 5. EMBEDDED DOCUMENTS AND COMPLEX DATA
// =============================================================================

export class UserProfileSeeder extends BaseSeeder {
  static environment = ['development']

  async run() {
    await User.createMany([
      {
        email: 'john@example.com',
        profile: {
          firstName: 'John',
          lastName: 'Doe',
          bio: 'Software Developer with 5 years experience',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john',
          socialLinks: {
            twitter: '@johndoe',
            github: 'johndoe',
            linkedin: 'john-doe',
          },
        },
        addresses: [
          {
            type: 'home',
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'USA',
          },
          {
            type: 'work',
            street: '456 Office Blvd',
            city: 'New York',
            state: 'NY',
            zipCode: '10002',
            country: 'USA',
          },
        ],
        preferences: {
          theme: 'dark',
          notifications: {
            email: true,
            push: false,
            sms: false,
          },
          privacy: {
            profileVisible: true,
            emailVisible: false,
          },
        },
      },
    ])
  }
}

// =============================================================================
// 6. RELATIONSHIP SEEDING
// =============================================================================

export class BlogSeeder extends BaseSeeder {
  static dependencies = ['UserSeeder']

  async run() {
    // Create categories
    const categories = await Category.createMany([
      { name: 'Technology', slug: 'technology' },
      { name: 'Programming', slug: 'programming' },
      { name: 'Web Development', slug: 'web-development' },
    ])

    // Get users
    const users = await User.all()

    // Create posts with categories
    const posts = []
    for (const user of users) {
      const userPosts = await Post.createMany([
        {
          title: 'Getting Started with MongoDB',
          content: 'MongoDB is a powerful NoSQL database...',
          authorId: user._id,
          categoryId: categories[0]._id,
          tags: ['mongodb', 'database', 'nosql'],
          isPublished: true,
          publishedAt: new Date(),
        },
        {
          title: 'Advanced TypeScript Patterns',
          content: 'TypeScript provides powerful type system features...',
          authorId: user._id,
          categoryId: categories[1]._id,
          tags: ['typescript', 'programming', 'patterns'],
          isPublished: true,
          publishedAt: new Date(),
        },
      ])
      posts.push(...userPosts)
    }

    // Create comments
    for (const post of posts) {
      const commentAuthors = users.filter((u) => u._id !== post.authorId)

      await Comment.createMany([
        {
          content: 'Great article! Very informative.',
          authorId: commentAuthors[0]?._id,
          postId: post._id,
          isApproved: true,
        },
        {
          content: 'Thanks for sharing this knowledge.',
          authorId: commentAuthors[1]?._id,
          postId: post._id,
          isApproved: true,
        },
      ])
    }
  }
}

// =============================================================================
// 7. ERROR HANDLING AND VALIDATION
// =============================================================================

export class SafeUserSeeder extends BaseSeeder {
  async run() {
    try {
      // Check if data already exists
      const existingUsers = await User.query().limit(1)
      if (existingUsers.length > 0) {
        console.log('Users already exist, skipping seeder')
        return
      }

      // Validate environment
      if (process.env.NODE_ENV === 'production') {
        const requiredEnvVars = ['ADMIN_EMAIL', 'ADMIN_PASSWORD']
        const missing = requiredEnvVars.filter((key) => !process.env[key])

        if (missing.length > 0) {
          throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
        }
      }

      // Create users with validation
      const users = await User.createMany([
        {
          name: 'Admin User',
          email: process.env.ADMIN_EMAIL || 'admin@example.com',
          password: process.env.ADMIN_PASSWORD || 'password123',
          role: 'admin',
        },
      ])

      console.log(`✅ Successfully created ${users.length} users`)
    } catch (error) {
      console.error('❌ Error in SafeUserSeeder:', error.message)
      throw error // Re-throw to mark seeder as failed
    }
  }
}

// =============================================================================
// 8. CONNECTION-SPECIFIC SEEDING
// =============================================================================

export class AnalyticsSeeder extends BaseSeeder {
  // Use a different database connection
  connection = 'analytics'

  async run() {
    // This will use the 'analytics' connection instead of default
    await AnalyticsEvent.createMany([
      {
        event: 'user_signup',
        userId: 'user123',
        timestamp: new Date(),
        metadata: {
          source: 'web',
          campaign: 'summer2024',
        },
      },
      {
        event: 'page_view',
        userId: 'user123',
        timestamp: new Date(),
        metadata: {
          page: '/dashboard',
          referrer: '/login',
        },
      },
    ])
  }
}

// =============================================================================
// 9. BULK OPERATIONS AND PERFORMANCE
// =============================================================================

export class LargeDataSeeder extends BaseSeeder {
  static environment = ['development']

  async run() {
    console.log('Creating large dataset...')

    // Create users in batches for better performance
    const batchSize = 1000
    const totalUsers = 10000

    for (let i = 0; i < totalUsers; i += batchSize) {
      const batch = []

      for (let j = 0; j < batchSize && i + j < totalUsers; j++) {
        const userIndex = i + j + 1
        batch.push({
          name: `User ${userIndex}`,
          email: `user${userIndex}@example.com`,
          age: Math.floor(Math.random() * 50) + 18,
          isActive: Math.random() > 0.1, // 90% active
        })
      }

      await User.createMany(batch)
      console.log(`Created users ${i + 1} to ${Math.min(i + batchSize, totalUsers)}`)
    }

    console.log(`✅ Successfully created ${totalUsers} users`)
  }
}

// =============================================================================
// 10. TESTING FIXTURES
// =============================================================================

export class TestFixturesSeeder extends BaseSeeder {
  static environment = ['testing']

  async run() {
    // Create predictable test data with fixed IDs
    await User.createMany([
      {
        _id: '507f1f77bcf86cd799439011',
        name: 'Test User 1',
        email: 'test1@example.com',
        isActive: true,
        createdAt: new Date('2024-01-01T00:00:00Z'),
      },
      {
        _id: '507f1f77bcf86cd799439012',
        name: 'Test User 2',
        email: 'test2@example.com',
        isActive: false,
        createdAt: new Date('2024-01-02T00:00:00Z'),
      },
    ])

    await Post.createMany([
      {
        _id: '507f1f77bcf86cd799439021',
        title: 'Test Post 1',
        content: 'Test content 1',
        authorId: '507f1f77bcf86cd799439011',
        isPublished: true,
      },
      {
        _id: '507f1f77bcf86cd799439022',
        title: 'Test Post 2',
        content: 'Test content 2',
        authorId: '507f1f77bcf86cd799439012',
        isPublished: false,
      },
    ])
  }
}
