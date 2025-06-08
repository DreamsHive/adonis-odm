/**
 * Environment-Specific Seeder Examples
 *
 * This file demonstrates various patterns for using environment restrictions
 * in database seeders with the Adonis ODM package.
 */

import { BaseSeeder } from '../../src/seeders/base_seeder.js'

/**
 * Development and Testing Only Seeder
 *
 * This seeder will only run in development and testing environments.
 * Perfect for sample data that shouldn't exist in production.
 */
export class DevelopmentDataSeeder extends BaseSeeder {
  static environment = ['development', 'testing']

  async run(): Promise<void> {
    const usersCollection = this.getCollection('users')

    // Insert sample users for development
    await usersCollection.insertMany([
      {
        name: 'John Developer',
        email: 'john@dev.local',
        role: 'developer',
        isActive: true,
        createdAt: new Date(),
      },
      {
        name: 'Jane Tester',
        email: 'jane@test.local',
        role: 'tester',
        isActive: true,
        createdAt: new Date(),
      },
      {
        name: 'Admin User',
        email: 'admin@dev.local',
        role: 'admin',
        isActive: true,
        createdAt: new Date(),
      },
    ])

    // Insert sample posts
    const postsCollection = this.getCollection('posts')
    await postsCollection.insertMany([
      {
        title: 'Welcome to Development',
        content: 'This is a sample post for development environment.',
        authorEmail: 'john@dev.local',
        status: 'published',
        createdAt: new Date(),
      },
      {
        title: 'Testing Guidelines',
        content: 'This post contains testing guidelines and best practices.',
        authorEmail: 'jane@test.local',
        status: 'draft',
        createdAt: new Date(),
      },
    ])
  }
}

/**
 * Production Only Seeder
 *
 * This seeder will only run in production environment.
 * Used for essential production data that must exist.
 */
export class ProductionEssentialsSeeder extends BaseSeeder {
  static environment = ['production']

  async run(): Promise<void> {
    const settingsCollection = this.getCollection('settings')

    // Insert essential production settings
    await settingsCollection.insertMany([
      {
        key: 'app.name',
        value: 'Production App',
        category: 'application',
        isPublic: true,
        createdAt: new Date(),
      },
      {
        key: 'app.environment',
        value: 'production',
        category: 'application',
        isPublic: false,
        createdAt: new Date(),
      },
      {
        key: 'security.session_timeout',
        value: '3600',
        category: 'security',
        isPublic: false,
        createdAt: new Date(),
      },
    ])

    // Insert default admin user for production
    const usersCollection = this.getCollection('users')
    await usersCollection.insertOne({
      name: 'System Administrator',
      email: 'admin@company.com',
      role: 'super_admin',
      isActive: true,
      mustChangePassword: true,
      createdAt: new Date(),
    })
  }
}

/**
 * Testing Only Seeder
 *
 * This seeder will only run in testing environment.
 * Perfect for test fixtures and controlled test data.
 */
export class TestFixturesSeeder extends BaseSeeder {
  static environment = ['testing']

  async run(): Promise<void> {
    const usersCollection = this.getCollection('users')

    // Insert predictable test users
    await usersCollection.insertMany([
      {
        _id: 'test-user-1',
        name: 'Test User One',
        email: 'test1@example.com',
        role: 'user',
        isActive: true,
        createdAt: new Date('2024-01-01T00:00:00Z'),
      },
      {
        _id: 'test-user-2',
        name: 'Test User Two',
        email: 'test2@example.com',
        role: 'moderator',
        isActive: false,
        createdAt: new Date('2024-01-02T00:00:00Z'),
      },
      {
        _id: 'test-admin',
        name: 'Test Admin',
        email: 'admin@example.com',
        role: 'admin',
        isActive: true,
        createdAt: new Date('2024-01-01T00:00:00Z'),
      },
    ])

    // Insert test categories with predictable IDs
    const categoriesCollection = this.getCollection('categories')
    await categoriesCollection.insertMany([
      {
        _id: 'cat-1',
        name: 'Technology',
        slug: 'technology',
        isActive: true,
      },
      {
        _id: 'cat-2',
        name: 'Science',
        slug: 'science',
        isActive: true,
      },
    ])
  }
}

/**
 * Multi-Environment Seeder
 *
 * This seeder runs in multiple specific environments.
 * Useful for data that's needed in staging and production but not development.
 */
export class StagingAndProductionSeeder extends BaseSeeder {
  static environment = ['staging', 'production']

  async run(): Promise<void> {
    const configCollection = this.getCollection('configurations')

    // Insert configurations needed for staging and production
    await configCollection.insertMany([
      {
        key: 'email.provider',
        value: 'sendgrid',
        environment: process.env.NODE_ENV,
        createdAt: new Date(),
      },
      {
        key: 'storage.provider',
        value: 's3',
        environment: process.env.NODE_ENV,
        createdAt: new Date(),
      },
      {
        key: 'cache.provider',
        value: 'redis',
        environment: process.env.NODE_ENV,
        createdAt: new Date(),
      },
    ])
  }
}

/**
 * Universal Seeder (No Environment Restrictions)
 *
 * This seeder will run in ALL environments.
 * Use for essential data that must exist everywhere.
 */
export class UniversalDataSeeder extends BaseSeeder {
  // No environment property = runs in all environments

  async run(): Promise<void> {
    const rolesCollection = this.getCollection('roles')

    // Insert essential roles that must exist in all environments
    await rolesCollection.insertMany([
      {
        name: 'user',
        displayName: 'User',
        permissions: ['read:own_profile', 'update:own_profile'],
        isDefault: true,
        createdAt: new Date(),
      },
      {
        name: 'moderator',
        displayName: 'Moderator',
        permissions: [
          'read:own_profile',
          'update:own_profile',
          'read:posts',
          'update:posts',
          'delete:posts',
        ],
        isDefault: false,
        createdAt: new Date(),
      },
      {
        name: 'admin',
        displayName: 'Administrator',
        permissions: ['*'], // All permissions
        isDefault: false,
        createdAt: new Date(),
      },
    ])

    // Insert system-wide settings
    const systemCollection = this.getCollection('system')
    await systemCollection.insertOne({
      version: '1.0.0',
      initialized: true,
      initializedAt: new Date(),
    })
  }
}

/**
 * Conditional Environment Seeder
 *
 * This seeder demonstrates how to implement custom environment logic
 * beyond the basic environment array restriction.
 */
export class ConditionalSeeder extends BaseSeeder {
  static environment = ['development', 'staging', 'production']

  async run(): Promise<void> {
    const currentEnv = process.env.NODE_ENV || 'development'
    const dataCollection = this.getCollection('environment_data')

    // Different data based on environment
    switch (currentEnv) {
      case 'development':
        await dataCollection.insertMany([
          { type: 'sample', value: 'dev-data-1', env: currentEnv },
          { type: 'sample', value: 'dev-data-2', env: currentEnv },
        ])
        break

      case 'staging':
        await dataCollection.insertMany([
          { type: 'staging', value: 'staging-data-1', env: currentEnv },
          { type: 'staging', value: 'staging-data-2', env: currentEnv },
        ])
        break

      case 'production':
        await dataCollection.insertOne({
          type: 'production',
          value: 'production-essential-data',
          env: currentEnv,
          critical: true,
        })
        break

      default:
        // Custom environment handling
        await dataCollection.insertOne({
          type: 'unknown',
          value: `data-for-${currentEnv}`,
          env: currentEnv,
        })
    }
  }
}

/**
 * Environment Validation Seeder
 *
 * This seeder demonstrates how to implement additional environment
 * validation beyond the basic shouldRun check.
 */
export class EnvironmentValidationSeeder extends BaseSeeder {
  static environment = ['production']

  async run(): Promise<void> {
    // Additional environment validation
    const requiredEnvVars = ['DATABASE_URL', 'SECRET_KEY', 'EMAIL_API_KEY']
    const missingVars = requiredEnvVars.filter((varName) => !process.env[varName])

    if (missingVars.length > 0) {
      throw new Error(
        `Missing required environment variables for production: ${missingVars.join(', ')}`
      )
    }

    // Proceed with seeding only if all validations pass
    const configCollection = this.getCollection('production_config')
    await configCollection.insertOne({
      environment: 'production',
      validatedAt: new Date(),
      requiredVarsPresent: requiredEnvVars,
    })
  }
}
