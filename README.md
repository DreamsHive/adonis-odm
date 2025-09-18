# MongoDB ODM for AdonisJS v6

[![CI](https://github.com/DreamsHive/adonis-odm/workflows/CI/badge.svg)](https://github.com/DreamsHive/adonis-odm/actions/workflows/ci.yml)
[![Security](https://github.com/DreamsHive/adonis-odm/workflows/Security/badge.svg)](https://github.com/DreamsHive/adonis-odm/actions/workflows/security.yml)
[![Release](https://github.com/DreamsHive/adonis-odm/workflows/Release/badge.svg)](https://github.com/DreamsHive/adonis-odm/actions/workflows/release.yml)
[![Documentation](https://github.com/DreamsHive/adonis-odm/workflows/Documentation/badge.svg)](https://github.com/DreamsHive/adonis-odm/actions/workflows/docs.yml)
[![npm version](https://badge.fury.io/js/adonis-odm.svg)](https://www.npmjs.com/package/adonis-odm)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive MongoDB Object Document Mapper (ODM) for AdonisJS v6 that provides a familiar Lucid ORM-like interface for working with MongoDB databases. Built with TypeScript for maximum type safety and developer experience.

## ✨ Features

### Core Features

- 🎯 **Familiar API**: 100% Lucid ORM-compatible interface for easy adoption
- 🏗️ **Decorator-based Models**: Use decorators to define your model schema and relationships
- 🔍 **Fluent Query Builder**: Chainable query methods with MongoDB-specific operations
- 📅 **Automatic Timestamps**: Auto-managed `createdAt` and `updatedAt` fields
- 🔄 **Model Lifecycle**: Track model state with `$isPersisted`, `$dirty`, etc.
- 📄 **Pagination**: Built-in pagination support with metadata
- 🔗 **Connection Management**: Multiple MongoDB connection support
- 🛡️ **Type Safety**: Full TypeScript support with IntelliSense and compile-time checking

### Advanced Features

- 💾 **Database Transactions**: Full ACID transaction support with managed and manual modes
- 📦 **Embedded Documents**: Type-safe embedded document support with full CRUD operations
- 🔗 **Relationships**: Type-safe referenced relationships (@hasOne, @hasMany, @belongsTo)
- 🪝 **Lifecycle Hooks**: Comprehensive hook system (beforeSave, afterSave, beforeCreate, etc.)
- 🔍 **Advanced Querying**: Complex filtering, aggregation, and embedded document querying
- 🌱 **Database Seeders**: Comprehensive seeding system with environment control, execution ordering, and dependency management
- ⚡ **Performance**: Bulk operations, connection pooling, and optimized queries
- 🛠️ **CLI Tools**: Ace commands for model generation, seeders, and database operations
- 🧪 **Testing Support**: Built-in testing utilities and Docker integration

## Installation

Install the package from the npm registry as follows:

```bash
npm i adonis-odm
```

```bash
yarn add adonis-odm
```

```bash
pnpm add adonis-odm
```

Next, configure the package by running the following ace command:

```bash
node ace configure adonis-odm
```

The configure command will:

1. Register the MongoDB provider inside the `adonisrc.ts` file
2. Create the `config/odm.ts` configuration file
3. Add environment variables to your `.env` file
4. Set up validation rules for environment variables

## Configuration

The configuration for the ODM is stored inside the `config/odm.ts` file. You can define one or more NoSQL database connections inside this file. Currently supports MongoDB, with DynamoDB support planned.

```typescript
import env from '#start/env'
import { defineConfig } from 'adonis-odm'

const odmConfig = defineConfig({
  connection: 'mongodb',

  connections: {
    mongodb: {
      client: 'mongodb',
      connection: {
        // Option 1: Use a full URI
        url: env.get('MONGO_URI'),

        // Option 2: Use individual components (if url is not provided)
        host: env.get('MONGO_HOST', 'localhost'),
        port: env.get('MONGO_PORT', 27017),
        database: env.get('MONGO_DATABASE'),

        // MongoDB connection options
        options: {
          maxPoolSize: env.get('MONGO_MAX_POOL_SIZE', 10),
          minPoolSize: env.get('MONGO_MIN_POOL_SIZE', 0),
          maxIdleTimeMS: env.get('MONGO_MAX_IDLE_TIME_MS', 30000),
          serverSelectionTimeoutMS: env.get('MONGO_SERVER_SELECTION_TIMEOUT_MS', 5000),
          socketTimeoutMS: env.get('MONGO_SOCKET_TIMEOUT_MS', 0),
          connectTimeoutMS: env.get('MONGO_CONNECT_TIMEOUT_MS', 10000),
        },
      },
    },
  },
})

export default odmConfig
```

### Environment Variables

The following environment variables are available for MongoDB configuration (all are optional):

```env
# Connection Settings (Option 1: Use URI)
MONGO_URI=mongodb://localhost:27017/your_database_name

# Connection Settings (Option 2: Use individual components)
MONGO_HOST=localhost
MONGO_PORT=27017
MONGO_DATABASE=your_database_name

# Authentication (optional)
MONGO_USERNAME=your_username
MONGO_PASSWORD=your_password

# Connection Pool Settings (optional)
MONGO_MAX_POOL_SIZE=10
MONGO_MIN_POOL_SIZE=0
MONGO_MAX_IDLE_TIME_MS=30000
MONGO_SERVER_SELECTION_TIMEOUT_MS=5000
MONGO_SOCKET_TIMEOUT_MS=0
MONGO_CONNECT_TIMEOUT_MS=10000
```

**Note**: All MongoDB connection variables are optional. You can use either `MONGO_URI` for a complete connection string, or individual components (`MONGO_HOST`, `MONGO_PORT`, etc.). The URI takes precedence if both are provided.

### Environment Variable Flexibility

As of version 0.2.1+, all MongoDB environment variables are optional, giving you complete flexibility in how you configure your database connection:

- **URI Only**: Use just `MONGO_URI` for simple setups
- **Components Only**: Use individual variables like `MONGO_HOST`, `MONGO_PORT`, etc.
- **Mixed**: Combine both approaches (URI takes precedence)
- **Minimal**: Provide only the variables you need

If you're upgrading from an earlier version and experiencing validation errors, see the [Migration Guide](./docs/MIGRATION_ENV_VARIABLES.md).

### Multiple Connections

You can define multiple NoSQL database connections inside the `config/odm.ts` file and switch between them as needed:

```typescript
const odmConfig = defineConfig({
  connection: 'primary',

  connections: {
    primary: {
      client: 'mongodb',
      connection: {
        url: env.get('MONGO_PRIMARY_URI'),
      },
    },

    analytics: {
      client: 'mongodb',
      connection: {
        url: env.get('MONGO_ANALYTICS_URI'),
      },
    },
  },
})
```

**Note**: Database transactions require MongoDB 4.0+ and a replica set or sharded cluster configuration. Transactions are not supported on standalone MongoDB instances.

## Commands

The package provides several ace commands to help you work with MongoDB ODM:

### Configuration

```bash
# Configure the package (run this after installation)
node ace configure adonis-odm
```

### Model Generation

```bash
# Create a new ODM model
node ace make:odm-model User
```

### Database Seeders

```bash
# Create a new seeder
node ace make:odm-seeder User

# Create seeder in subdirectory
node ace make:odm-seeder admin/User

# Run all seeders
node ace odm:seed

# Run specific seeder files
node ace odm:seed --files="./database/seeders/user_seeder.ts"

# Run seeders interactively
node ace odm:seed --interactive

# Run seeders for specific connection
node ace odm:seed --connection=analytics
```

### Database Operations

```bash
# Test database connection (coming soon)
node ace mongodb:status

# Show database information (coming soon)
node ace mongodb:info
```

## Database Seeders

Adonis ODM provides a comprehensive seeding system to populate your MongoDB database with initial or test data. The seeder system follows familiar AdonisJS Lucid patterns while providing MongoDB-specific features and advanced execution control.

### Quick Start

#### Creating a Seeder

Generate a new seeder using the ace command:

```bash
# Create a basic seeder
node ace make:odm-seeder User

# Create seeder in subdirectory
node ace make:odm-seeder admin/User

# Use different templates
node ace make:odm-seeder User --stub=simple
node ace make:odm-seeder User --stub=advanced
```

This creates a seeder file in `database/seeders/user_seeder.ts`:

```typescript
import { BaseSeeder } from 'adonis-odm/seeders'
import User from '#models/user'

export default class UserSeeder extends BaseSeeder {
  async run() {
    // Insert seed data
    await User.createMany([
      {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
      },
      {
        name: 'Jane Smith',
        email: 'jane@example.com',
        age: 28,
      },
    ])
  }
}
```

#### Running Seeders

```bash
# Run all seeders
node ace odm:seed

# Run specific seeder files
node ace odm:seed --files="./database/seeders/user_seeder.ts"

# Run seeders interactively (choose which ones to run)
node ace odm:seed --interactive

# Run seeders for specific connection
node ace odm:seed --connection=analytics
```

### Advanced Features

#### Environment-Specific Seeders

Control which environments your seeders run in:

```typescript
import { BaseSeeder } from 'adonis-odm/seeders'
import User from '#models/user'

export default class UserSeeder extends BaseSeeder {
  // Only run in development and testing
  static environment = ['development', 'testing']

  async run() {
    await User.createMany([{ name: 'Test User', email: 'test@example.com' }])
  }
}
```

#### Custom Execution Order

Control the order in which seeders execute using static properties:

```typescript
import { BaseSeeder } from 'adonis-odm/seeders'
import Role from '#models/role'

export default class RoleSeeder extends BaseSeeder {
  // Lower numbers run first
  static order = 1

  async run() {
    await Role.createMany([
      { name: 'admin', permissions: ['*'] },
      { name: 'user', permissions: ['read'] },
    ])
  }
}
```

#### Seeder Dependencies

Define dependencies between seeders to ensure proper execution order:

```typescript
import { BaseSeeder } from 'adonis-odm/seeders'
import User from '#models/user'

export default class UserSeeder extends BaseSeeder {
  static order = 2
  static dependencies = ['RoleSeeder'] // Must run after RoleSeeder

  async run() {
    const adminRole = await Role.findBy('name', 'admin')

    await User.createMany([
      {
        name: 'Admin User',
        email: 'admin@example.com',
        roleId: adminRole._id,
      },
    ])
  }
}
```

#### Main Seeders

Create main seeder files (`index.ts` or `main.ts`) that automatically run first:

```typescript
// database/seeders/index.ts
import { BaseSeeder } from 'adonis-odm/seeders'

export default class MainSeeder extends BaseSeeder {
  // Main seeders automatically get order = 0

  async run() {
    // Run essential setup logic
    console.log('🌱 Starting database seeding...')
  }
}
```

### Working with Different Data Types

#### Embedded Documents

Seed models with embedded documents:

```typescript
import { BaseSeeder } from 'adonis-odm/seeders'
import User from '#models/user'

export default class UserSeeder extends BaseSeeder {
  async run() {
    await User.createMany([
      {
        email: 'john@example.com',
        profile: {
          firstName: 'John',
          lastName: 'Doe',
          bio: 'Software Developer',
          age: 30,
        },
        addresses: [
          {
            type: 'home',
            street: '123 Main St',
            city: 'New York',
            zipCode: '10001',
          },
          {
            type: 'work',
            street: '456 Office Blvd',
            city: 'New York',
            zipCode: '10002',
          },
        ],
      },
    ])
  }
}
```

#### Referenced Relationships

Seed models with relationships:

```typescript
import { BaseSeeder } from 'adonis-odm/seeders'
import User from '#models/user'
import Post from '#models/post'

export default class PostSeeder extends BaseSeeder {
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
          title: `${user.name}'s Draft`,
          content: 'Work in progress...',
          authorId: user._id,
          isPublished: false,
        },
      ])
    }
  }
}
```

### Connection-Specific Seeding

Use different database connections for different seeders:

```typescript
import { BaseSeeder } from 'adonis-odm/seeders'
import AnalyticsEvent from '#models/analytics_event'

export default class AnalyticsSeeder extends BaseSeeder {
  // Specify connection in the seeder
  connection = 'analytics'

  async run() {
    await AnalyticsEvent.createMany([
      {
        event: 'user_signup',
        userId: 'user123',
        timestamp: new Date(),
        metadata: { source: 'web' },
      },
    ])
  }
}
```

Or specify connection when running:

```bash
# Run all seeders on analytics connection
node ace odm:seed --connection=analytics
```

### Error Handling and Validation

Seeders include comprehensive error handling:

```typescript
import { BaseSeeder } from 'adonis-odm/seeders'
import User from '#models/user'

export default class UserSeeder extends BaseSeeder {
  async run() {
    try {
      // Check if data already exists
      const existingUsers = await User.query().limit(1)
      if (existingUsers.length > 0) {
        console.log('Users already exist, skipping seeder')
        return
      }

      await User.createMany([{ name: 'John Doe', email: 'john@example.com' }])

      console.log('✅ Users seeded successfully')
    } catch (error) {
      console.error('❌ Error seeding users:', error.message)
      throw error // Re-throw to mark seeder as failed
    }
  }
}
```

### Best Practices

1. **Use Environment Restrictions**: Prevent test data from appearing in production
2. **Define Clear Dependencies**: Use `static dependencies` for complex seeding scenarios
3. **Check for Existing Data**: Avoid duplicate data by checking before inserting
4. **Use Transactions**: Wrap complex seeding logic in database transactions
5. **Provide Feedback**: Use console.log to show seeding progress
6. **Handle Errors Gracefully**: Implement proper error handling and cleanup

For more detailed examples and advanced usage patterns, see the [seeder documentation](docs/environment-specific-seeders.md) and [examples](examples/seeder_usage.ts).

## Usage

### Database Service

Import the database service to perform transactions and direct database operations:

```typescript
import db from 'adonis-odm/services/db'

// Managed transaction (recommended)
const result = await db.transaction(async (trx) => {
  // Your operations here
  return { success: true }
})

// Manual transaction
const trx = await db.transaction()
try {
  // Your operations here
  await trx.commit()
} catch (error) {
  await trx.rollback()
}

// Direct database access
const mongoClient = db.connection()
const database = db.db()
const collection = db.collection('users')
```

### Creating Models

Create a model by extending `BaseModel` and using decorators:

```typescript
import { BaseModel, column } from 'adonis-odm'
import { DateTime } from 'luxon'

export default class User extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare name: string

  @column()
  declare email: string

  @column()
  declare age?: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
```

### Embedded Documents

The ODM provides full support for embedded documents with type safety and CRUD operations.

#### Defining Embedded Documents

```typescript
import { BaseModel, column } from 'adonis-odm'
import { DateTime } from 'luxon'

// Embedded document model
export default class Profile extends BaseModel {
  @column()
  declare firstName: string

  @column()
  declare lastName: string

  @column()
  declare bio?: string

  @column()
  declare age: number

  @column()
  declare phoneNumber?: string

  // Computed property
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`
  }
}

// Import embedded types
import { EmbeddedSingle, EmbeddedMany } from 'adonis-odm'

// Main model with embedded documents
export default class User extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare email: string

  @column()
  declare age: number

  // Single embedded document
  @column.embedded(() => Profile, 'single')
  declare profile?: EmbeddedSingle<typeof Profile>

  // Array of embedded documents
  @column.embedded(() => Profile, 'many')
  declare profiles?: EmbeddedMany<typeof Profile>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Computed properties (using @computed decorator for serialization)
  @computed()
  get fullName(): string | null {
    return this.profile?.fullName || null
  }

  @computed()
  get allProfileNames(): string[] {
    return this.profiles?.map((p) => p.fullName) || []
  }

  // Helper methods (regular methods, not computed properties)
  getYoungProfiles(maxAge: number): InstanceType<typeof Profile>[] {
    return this.profiles?.filter((p) => p.age < maxAge) || []
  }

  getProfilesByBio(bioKeyword: string): InstanceType<typeof Profile>[] {
    return this.profiles?.filter((p) => p.bio?.includes(bioKeyword)) || []
  }
}
```

#### Creating Records with Embedded Documents

```typescript
// Create user with embedded profile (single)
const user = await User.create({
  email: 'john@example.com',
  age: 30,
  profile: {
    firstName: 'John',
    lastName: 'Doe',
    bio: 'Software developer',
    age: 30,
    phoneNumber: '+1234567890',
  },
})

// Create user with multiple embedded profiles
const user = await User.create({
  email: 'jane@example.com',
  age: 28,
  profiles: [
    {
      firstName: 'Jane',
      lastName: 'Smith',
      bio: 'Technical Lead',
      age: 28,
    },
    {
      firstName: 'Jane',
      lastName: 'Smith',
      bio: 'Architect',
      age: 28,
    },
  ],
})
```

#### Type-Safe Property Access

```typescript
const user = await User.findOrFail('507f1f77bcf86cd799439011')

// ✅ Full IntelliSense support - NO CASTS NEEDED!
if (user.profile) {
  const firstName = user.profile.firstName // ✅ Type: string
  const lastName = user.profile.lastName // ✅ Type: string
  const bio = user.profile.bio // ✅ Type: string | undefined
  const age = user.profile.age // ✅ Type: number
  const fullName = user.profile.fullName // ✅ Type: string (computed property)
}

// Array operations with full type safety
if (user.profiles) {
  // ✅ Standard array methods work with full type safety
  const allBios = user.profiles.map((profile) => profile.bio) // ✅ Type: (string | undefined)[]

  const leadProfiles = user.profiles.filter(
    (profile) => profile.bio?.includes('Lead') // ✅ Type-safe optional chaining
  )

  // ✅ Type-safe forEach with IntelliSense
  user.profiles.forEach((profile, index) => {
    // ✅ Full IntelliSense on profile parameter
    console.log(`${index + 1}. ${profile.firstName} ${profile.lastName} - ${profile.bio}`)
  })
}
```

#### CRUD Operations on Embedded Documents

```typescript
const user = await User.findOrFail('507f1f77bcf86cd799439011')

// Single embedded document operations
if (user.profile) {
  // Update properties
  user.profile.bio = 'Senior Software Engineer'
  user.profile.phoneNumber = '+1-555-9999'

  // Save the embedded document
  await user.profile.save()
}

// Array embedded document operations
if (user.profiles) {
  // Update individual items
  const firstProfile = user.profiles[0]
  firstProfile.bio = 'Senior Technical Lead'
  await firstProfile.save()

  // Create new embedded document
  const newProfile = user.profiles.create({
    firstName: 'John',
    lastName: 'Doe',
    bio: 'Innovation Lead',
    age: 32,
  })
  await newProfile.save()

  // Delete embedded document
  await firstProfile.delete()
}
```

#### Querying Embedded Documents

The ODM provides a powerful query builder for embedded documents with full type safety:

```typescript
const user = await User.findOrFail('507f1f77bcf86cd799439011')

if (user.profiles) {
  // Type-safe query builder with IntelliSense
  const seniorProfiles = user.profiles
    .query()
    .where('bio', 'like', 'Senior') // ✅ Type-safe field names
    .where('age', '>=', 30) // ✅ Type-safe operators
    .orderBy('age', 'desc') // ✅ Type-safe sorting
    .get()

  // Complex filtering
  const experiencedDevelopers = user.profiles
    .query()
    .whereAll([
      { field: 'age', operator: '>=', value: 30 },
      { field: 'bio', operator: 'like', value: 'Developer' },
    ])
    .get()

  // Pagination for large datasets
  const paginatedResult = user.profiles.query().orderBy('age', 'desc').paginate(1, 5) // page 1, 5 per page

  console.log(paginatedResult.data) // Array of profiles
  console.log(paginatedResult.pagination) // Pagination metadata

  // Search across multiple fields
  const searchResults = user.profiles.query().search('Engineer', ['bio', 'firstName']).get()

  // Aggregation operations
  const ageStats = user.profiles.query().aggregate('age')
  console.log(ageStats) // { count, sum, avg, min, max }

  // Distinct values
  const uniqueAges = user.profiles.query().distinct('age')

  // Grouping
  const ageGroups = user.profiles.query().groupBy('age')
}
```

#### Loading Embedded Documents with Filtering

Use the `.embed()` method to load embedded documents with type-safe filtering:

```typescript
// Load all embedded documents
const users = await User.query().embed('profiles').where('email', 'like', '%@company.com').all()

// Load with filtering callback - Full IntelliSense support!
const users = await User.query()
  .embed('profiles', (profileQuery) => {
    profileQuery
      .where('age', '>', 25) // ✅ Type-safe field names
      .where('bio', 'like', 'Engineer') // ✅ Type-safe operators
      .orderBy('age', 'desc') // ✅ Type-safe sorting
      .limit(5) // ✅ Pagination support
  })
  .where('email', 'like', '%@company.com')
  .all()

// Complex embedded filtering
const users = await User.query()
  .embed('profiles', (profileQuery) => {
    profileQuery
      .whereIn('age', [25, 30, 35])
      .whereNotNull('bio')
      .whereLike('bio', '%Lead%')
      .orderBy('firstName', 'asc')
  })
  .all()
```

### Referenced Relationships

The ODM provides full support for traditional referenced relationships with type-safe decorators and automatic loading.

#### Defining Referenced Relationships

```typescript
import { BaseModel, column, hasOne, hasMany, belongsTo } from 'adonis-odm'
import type { HasOne, HasMany, BelongsTo } from 'adonis-odm'

// User model with relationships
export default class User extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare name: string

  @column()
  declare email: string

  // One-to-one relationship
  @hasOne(() => Profile)
  declare profile: HasOne<typeof Profile>

  // One-to-many relationship
  @hasMany(() => Post)
  declare posts: HasMany<typeof Post>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}

// Profile model with belongs-to relationship
export default class Profile extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare firstName: string

  @column()
  declare lastName: string

  @column()
  declare userId: string

  // Many-to-one relationship
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}

// Post model
export default class Post extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare title: string

  @column()
  declare content: string

  @column()
  declare authorId: string

  // Many-to-one relationship
  @belongsTo(() => User, { foreignKey: 'authorId' })
  declare author: BelongsTo<typeof User>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
```

#### Loading Referenced Relationships

Use the `.load()` method for type-safe relationship loading:

```typescript
// Load single relationship
const users = await User.query().load('profile').where('isActive', true).all()

// Load multiple relationships
const users = await User.query().load('profile').load('posts').all()

// Load with filtering callback - Full IntelliSense support!
const users = await User.query()
  .load('profile', (profileQuery) => {
    profileQuery.where('isPublic', true).orderBy('updatedAt', 'desc')
  })
  .load('posts', (postQuery) => {
    postQuery.where('isPublished', true).orderBy('createdAt', 'desc').limit(5)
  })
  .all()

// Nested relationship loading
const users = await User.query()
  .load('posts', (postQuery) => {
    postQuery.load('comments').where('isPublished', true)
  })
  .all()
```

#### Working with Loaded Relationships

```typescript
const user = await User.query().load('profile').load('posts').firstOrFail()

// ✅ Type-safe access with IntelliSense
if (user.profile) {
  console.log(user.profile.firstName) // ✅ Type: string
  console.log(user.profile.lastName) // ✅ Type: string
}

// ✅ Array relationships with full type safety
if (user.posts) {
  user.posts.forEach((post) => {
    console.log(post.title) // ✅ Type: string
    console.log(post.content) // ✅ Type: string
  })

  // ✅ Standard array methods work
  const publishedPosts = user.posts.filter((post) => post.isPublished)
  const postTitles = user.posts.map((post) => post.title)
}
```

#### Relationship Operations

```typescript
// Create related models
const user = await User.create({ name: 'John', email: 'john@example.com' })

// Create related profile
const profile = await Profile.create({
  firstName: 'John',
  lastName: 'Doe',
  userId: user._id,
})

// Create related posts
const posts = await Post.createMany([
  { title: 'First Post', content: 'Content 1', authorId: user._id },
  { title: 'Second Post', content: 'Content 2', authorId: user._id },
])

// Associate existing models (for belongsTo relationships)
const existingUser = await User.findOrFail('507f1f77bcf86cd799439011')
const newProfile = new Profile()
newProfile.firstName = 'Jane'
newProfile.lastName = 'Smith'
await newProfile.user.associate(existingUser)
```

### Basic CRUD Operations

#### Creating Records

AdonisJS Lucid provides two ways to create records:

**Method 1: Using `.create()` (Recommended)**

```typescript
// Create a single user (no need for 'new')
const user = await User.create({
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
})

// Create multiple users
const users = await User.createMany([
  { name: 'Jane Smith', email: 'jane@example.com', age: 25 },
  { name: 'Bob Johnson', email: 'bob@example.com', age: 35 },
])
```

**Method 2: Using `new` + `.save()`**

```typescript
const user = new User()

// Assign properties
user.name = 'John Doe'
user.email = 'john@example.com'
user.age = 30

// Insert to the database
await user.save()
```

**Create or Update**

```typescript
const user = await User.updateOrCreate(
  { email: 'john@example.com' },
  { name: 'John Doe Updated', age: 32 }
)
```

#### Reading Records

```typescript
// Find by ID
const user = await User.find('507f1f77bcf86cd799439011')
const userOrFail = await User.findOrFail('507f1f77bcf86cd799439011')

// Find by field
const user = await User.findBy('email', 'john@example.com')
const userOrFail = await User.findByOrFail('email', 'john@example.com')

// Get first record
const user = await User.first()
const userOrFail = await User.firstOrFail()

// Get all records
const users = await User.all()
```

#### Updating Records

AdonisJS Lucid provides three ways to update records:

**Method 1: Direct property assignment + save**

```typescript
const user = await User.findOrFail('507f1f77bcf86cd799439011')

user.name = 'Updated Name'
user.age = 31

await user.save()
```

**Method 2: Using `.merge()` + `.save()` (Method chaining)**

```typescript
const user = await User.findOrFail('507f1f77bcf86cd799439011')

await user.merge({ name: 'Updated Name', age: 31 }).save()
```

**Method 3: Using query builder `.update()` (Bulk update)**

```typescript
// Update multiple records at once
await User.query().where('age', '>=', 18).update({ status: 'adult' })
```

#### Deleting Records

AdonisJS Lucid provides two ways to delete records:

**Method 1: Instance delete**

```typescript
const user = await User.findOrFail('507f1f77bcf86cd799439011')
await user.delete()
```

**Method 2: Query builder bulk delete**

```typescript
// Delete multiple records at once
await User.query().where('isVerified', false).delete()
```

### Query Builder

The query builder provides a fluent interface for building complex queries:

#### Basic Queries

```typescript
// Simple where clause
const adults = await User.query().where('age', '>=', 18).all()

// Multiple conditions
const users = await User.query().where('age', '>=', 18).where('email', 'like', '%@gmail.com').all()

// OR conditions
const users = await User.query().where('age', '>=', 18).orWhere('email', 'admin@example.com').all()
```

#### Query Operators

The ODM supports both MongoDB operators and mathematical symbols:

```typescript
// Mathematical symbols (more intuitive)
User.query().where('age', '>=', 18)
User.query().where('score', '>', 100)
User.query().where('status', '!=', 'inactive')

// MongoDB operators
User.query().where('age', 'gte', 18)
User.query().where('score', 'gt', 100)
User.query().where('status', 'ne', 'inactive')
```

Supported operators:

- `=`, `eq` - Equal
- `!=`, `ne` - Not equal
- `>`, `gt` - Greater than
- `>=`, `gte` - Greater than or equal
- `<`, `lt` - Less than
- `<=`, `lte` - Less than or equal
- `in` - In array
- `nin` - Not in array
- `exists` - Field exists
- `regex` - Regular expression
- `like` - Pattern matching with % wildcards

#### Advanced Queries

```typescript
// Null checks
const users = await User.query().whereNull('deletedAt').all()
const users = await User.query().whereNotNull('emailVerifiedAt').all()

// In/Not in arrays
const users = await User.query().whereIn('status', ['active', 'pending']).all()
const users = await User.query().whereNotIn('role', ['admin', 'moderator']).all()

// Between values
const users = await User.query().whereBetween('age', [18, 65]).all()
const users = await User.query().whereNotBetween('age', [13, 17]).all()

// Pattern matching with like
const users = await User.query().where('name', 'like', 'John%').all()
const users = await User.query().whereLike('name', 'John%').all() // Case-sensitive
const users = await User.query().whereILike('name', 'john%').all() // Case-insensitive

// Field existence
const users = await User.query().whereExists('profilePicture').all()
const users = await User.query().whereNotExists('deletedAt').all()

// Negation queries
const users = await User.query().whereNot('status', 'banned').all()
const users = await User.query().whereNot('age', '<', 18).all()

// Complex OR conditions
const users = await User.query()
  .where('role', 'admin')
  .orWhere('permissions', 'like', '%manage%')
  .orWhereIn('department', ['IT', 'Security'])
  .orWhereNotNull('specialAccess')
  .all()

// Alias methods for clarity
const users = await User.query()
  .where('age', '>=', 18)
  .andWhere('status', 'active') // Same as .where()
  .andWhereNot('role', 'guest') // Same as .whereNot()
  .all()

// Sorting
const users = await User.query().orderBy('createdAt', 'desc').orderBy('name', 'asc').all()

// Limiting and pagination
const users = await User.query().limit(10).skip(20).all()
const users = await User.query().offset(20).limit(10).all() // offset is alias for skip
const users = await User.query().forPage(3, 10).all() // page 3, 10 per page

// Field selection
const users = await User.query().select(['name', 'email']).all()

// Distinct values
const uniqueRoles = await User.query().distinct('role').all()

// Grouping and aggregation
const departmentStats = await User.query().groupBy('department').having('count', '>=', 5).all()

// Query cloning
const baseQuery = User.query().where('status', 'active')
const adminQuery = baseQuery.clone().where('role', 'admin')
const userQuery = baseQuery.clone().where('role', 'user')
```

#### Pagination

```typescript
const paginatedUsers = await User.query().orderBy('createdAt', 'desc').paginate(1, 10) // page 1, 10 per page

console.log(paginatedUsers.data) // Array of users
console.log(paginatedUsers.meta) // Pagination metadata
```

#### Aggregation

```typescript
// Count records
const userCount = await User.query().where('age', '>=', 18).count()

// Get IDs only
const userIds = await User.query().where('status', 'active').ids()

// Delete multiple records
const deletedCount = await User.query().where('status', 'inactive').delete()

// Update multiple records
const updatedCount = await User.query().where('age', '>=', 18).update({ status: 'adult' })
```

### Column Decorators

The ODM provides several decorators for defining model properties and their behavior.

#### Basic Column

```typescript
@column()
declare name: string

@column({ isPrimary: true })
declare _id: string
```

#### Embedded Columns

```typescript
// Single embedded document
@column.embedded(() => Profile, 'single')
declare profile?: EmbeddedSingle<typeof Profile>

// Array of embedded documents
@column.embedded(() => Profile, 'many')
declare profiles?: EmbeddedMany<typeof Profile>
```

#### Date Columns

```typescript
// Auto-create timestamp (set only on creation)
@column.dateTime({ autoCreate: true })
declare createdAt: DateTime

// Auto-update timestamp (set on creation and updates)
@column.dateTime({ autoCreate: true, autoUpdate: true })
declare updatedAt: DateTime

// Custom date column
@column.date()
declare birthDate: DateTime
```

#### Decimal Columns

For precise decimal arithmetic and financial data, use the `@column.decimal()` decorator to properly handle MongoDB's Decimal128 type:

```typescript
@column.decimal()
declare price: number

@column.decimal()
declare earnings: number

@column.decimal()
declare taxAmount: number
```

**Why use `@column.decimal()`?**

Without the decimal decorator, MongoDB decimal values are serialized as objects like `{ "$numberDecimal": "100.99" }` instead of proper numbers. The decimal decorator:

- Stores values as MongoDB Decimal128 for precision
- Deserializes to JavaScript numbers for calculations
- Serializes to proper numbers in JSON responses
- Handles both `Decimal128` and `{ $numberDecimal: "..." }` formats from MongoDB

#### Custom Serialization

```typescript
@column({
  serialize: (value) => value.toUpperCase(),
  deserialize: (value) => value.toLowerCase(),
})
declare name: string
```

#### Computed Properties

Computed properties are getter-only properties that are calculated from other model attributes. They are included in JSON serialization but excluded from database operations.

```typescript
import { BaseModel, column, computed } from 'adonis-odm'
import { DateTime } from 'luxon'

export default class User extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare firstName: string

  @column()
  declare lastName: string

  @column()
  declare email: string

  @column()
  declare salary: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  // Basic computed property
  @computed()
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`
  }

  // Computed property with custom serialization name
  @computed({ serializeAs: 'display_name' })
  get displayName(): string {
    return `${this.firstName} ${this.lastName}`.toUpperCase()
  }

  // Computed property that won't be serialized
  @computed({ serializeAs: null })
  get internalCalculation(): number {
    return this.salary * 0.1 // This won't appear in JSON output
  }

  // Complex computed property
  @computed()
  get profileSummary(): string {
    const yearsActive = DateTime.now().diff(this.createdAt, 'years').years
    return `${this.fullName} (${Math.floor(yearsActive)} years active)`
  }

  // Computed property based on relationships
  @computed()
  get hasProfile(): boolean {
    return this.profile !== undefined && this.profile !== null
  }
}
```

#### Using Computed Properties

```typescript
const user = await User.create({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  salary: 50000,
})

// Access computed properties directly
console.log(user.fullName) // "John Doe"
console.log(user.displayName) // "JOHN DOE"
console.log(user.profileSummary) // "John Doe (0 years active)"

// Computed properties are included in JSON serialization
const json = user.toJSON()
console.log(json)
// Output:
// {
//   _id: "...",
//   first_name: "John",
//   last_name: "Doe",
//   email: "john@example.com",
//   salary: 50000,
//   created_at: "2024-01-01T00:00:00.000Z",
//   updated_at: "2024-01-01T00:00:00.000Z",
//   full_name: "John Doe",
//   display_name: "JOHN DOE",
//   profile_summary: "John Doe (0 years active)",
//   has_profile: false
//   // Note: internal_calculation is not included (serializeAs: null)
// }

// Computed properties are NOT included in database operations
await user.save() // Only saves actual column data, not computed properties
```

#### Computed Properties with Relationships

```typescript
export default class User extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare name: string

  @hasOne(() => Profile)
  declare profile: HasOne<typeof Profile>

  @hasMany(() => Post)
  declare posts: HasMany<typeof Post>

  // Computed property from loaded relationship
  @computed()
  get fullName(): string {
    return this.profile?.fullName ?? this.name
  }

  // Computed property with relationship data
  @computed()
  get postCount(): number {
    return this.posts?.length ?? 0
  }

  // Complex computed property
  @computed()
  get userStats(): object {
    return {
      name: this.name,
      hasProfile: !!this.profile,
      totalPosts: this.postCount,
      joinedDate: this.createdAt.toFormat('yyyy-MM-dd'),
    }
  }
}

// Usage with loaded relationships
const user = await User.query().load('profile').load('posts').firstOrFail()

console.log(user.fullName) // Uses profile data if available
console.log(user.postCount) // Returns actual post count
console.log(user.userStats) // Complex computed object
```

#### When to Use @computed() vs Regular Getters

**Use `@computed()` decorator when:**

- You want the property included in JSON serialization
- You need custom serialization names (`serializeAs`)
- You want to exclude from serialization (`serializeAs: null`)
- The property represents computed data that should be part of the model's public API

**Use regular getters when:**

- You want simple helper methods that don't need serialization
- The getter is for internal use only
- You're working with embedded documents where serialization is handled differently

```typescript
export default class User extends BaseModel {
  @column()
  declare firstName: string

  @column()
  declare lastName: string

  // ✅ Use @computed() for serialized properties
  @computed()
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`
  }

  // ✅ Use regular getter for internal helpers
  get initials(): string {
    return `${this.firstName[0]}${this.lastName[0]}`
  }

  // ✅ Use @computed() with custom serialization
  @computed({ serializeAs: 'display_name' })
  get displayName(): string {
    return this.fullName.toUpperCase()
  }

  // ✅ Use @computed() to exclude from serialization
  @computed({ serializeAs: null })
  get internalId(): string {
    return `internal_${this._id}`
  }
}
```

#### Computed Properties Best Practices

1. **Keep computations lightweight** - Avoid heavy calculations in getters
2. **Use appropriate return types** - TypeScript will infer types automatically
3. **Handle null/undefined cases** - Always check for loaded relationships
4. **Use meaningful names** - Make computed property names descriptive
5. **Consider serialization** - Use `serializeAs` to control JSON output
6. **Avoid side effects** - Computed properties should be pure functions
7. **Choose the right pattern** - Use `@computed()` for serialized properties, regular getters for helpers

### Model Lifecycle

Models track their state automatically:

```typescript
const user = new User({ name: 'John' })

console.log(user.$isLocal) // true
console.log(user.$isPersisted) // false

await user.save()

console.log(user.$isLocal) // false
console.log(user.$isPersisted) // true

user.name = 'Jane'
console.log(user.$dirty) // { name: 'Jane' }
```

### Lifecycle Hooks

The ODM provides a comprehensive hook system that allows you to execute custom logic at various points in the model lifecycle. Hooks are defined using decorators and are executed automatically.

#### Available Hooks

```typescript
import {
  BaseModel,
  column,
  beforeSave,
  afterSave,
  beforeCreate,
  afterCreate,
  beforeUpdate,
  afterUpdate,
  beforeDelete,
  afterDelete,
  beforeFind,
  afterFind,
  beforeFetch,
  afterFetch,
} from 'adonis-odm'

export default class User extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare name: string

  @column()
  declare email: string

  @column()
  declare password: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Hooks that run before/after save operations (create and update)
  @beforeSave()
  static async hashPassword(user: User) {
    if (user.$dirty.password) {
      user.password = await hash(user.password)
    }
  }

  @afterSave()
  static async logSave(user: User) {
    console.log(`User ${user.name} was saved`)
  }

  // Hooks that run before/after create operations
  @beforeCreate()
  static async validateEmail(user: User) {
    const existingUser = await User.findBy('email', user.email)
    if (existingUser) {
      throw new Error('Email already exists')
    }
  }

  @afterCreate()
  static async sendWelcomeEmail(user: User) {
    // Send welcome email logic
    console.log(`Welcome email sent to ${user.email}`)
  }

  // Hooks that run before/after update operations
  @beforeUpdate()
  static async validateUpdate(user: User) {
    if (user.$dirty.email) {
      // Validate email change
      console.log('Email is being changed')
    }
  }

  @afterUpdate()
  static async logUpdate(user: User) {
    console.log(`User ${user.name} was updated`)
  }

  // Hooks that run before/after delete operations
  @beforeDelete()
  static async checkDependencies(user: User) {
    const posts = await Post.query().where('authorId', user._id).count()
    if (posts > 0) {
      throw new Error('Cannot delete user with existing posts')
    }
  }

  @afterDelete()
  static async cleanup(user: User) {
    // Cleanup related data
    console.log(`Cleanup completed for user ${user.name}`)
  }

  // Hooks that run before/after find operations
  @beforeFind()
  static async logFind(query: ModelQueryBuilder<any, User>) {
    console.log('Finding user...')
  }

  @afterFind()
  static async logFoundUser(user: User | null) {
    if (user) {
      console.log(`Found user: ${user.name}`)
    }
  }

  // Hooks that run before/after fetch operations (multiple records)
  @beforeFetch()
  static async logFetch(query: ModelQueryBuilder<any, User>) {
    console.log('Fetching users...')
  }

  @afterFetch()
  static async logFetchedUsers(users: User[]) {
    console.log(`Fetched ${users.length} users`)
  }
}
```

#### Hook Execution Order

Hooks are executed in the following order:

**For Create Operations:**

1. `beforeSave`
2. `beforeCreate`
3. Database operation
4. `afterCreate`
5. `afterSave`

**For Update Operations:**

1. `beforeSave`
2. `beforeUpdate`
3. Database operation
4. `afterUpdate`
5. `afterSave`

**For Delete Operations:**

1. `beforeDelete`
2. Database operation
3. `afterDelete`

**For Find Operations:**

1. `beforeFind`
2. Database operation
3. `afterFind`

**For Fetch Operations:**

1. `beforeFetch`
2. Database operation
3. `afterFetch`

#### Aborting Operations

Before hooks can abort operations by returning `false`:

```typescript
export default class User extends BaseModel {
  @beforeSave()
  static async validateUser(user: User) {
    if (!user.email.includes('@')) {
      console.log('Invalid email format')
      return false // Aborts the save operation
    }
  }

  @beforeDelete()
  static async preventAdminDeletion(user: User) {
    if (user.role === 'admin') {
      console.log('Cannot delete admin user')
      return false // Aborts the delete operation
    }
  }
}
```

#### Hook Best Practices

1. **Keep hooks lightweight** - Avoid heavy computations in hooks
2. **Use async/await** - Hooks support asynchronous operations
3. **Handle errors gracefully** - Use try/catch blocks for error handling
4. **Return false to abort** - Use return false in before hooks to prevent operations
5. **Use appropriate hook types** - Choose the right hook for your use case

### Database Transactions

The MongoDB ODM provides full ACID transaction support, similar to AdonisJS Lucid ORM. Transactions ensure that multiple database operations are executed atomically - either all operations succeed, or all are rolled back.

#### Managed Transactions (Recommended)

Managed transactions automatically handle commit and rollback operations:

```typescript
import db from 'adonis-odm/services/db'

// Managed transaction with automatic commit/rollback
const newUser = await db.transaction(async (trx) => {
  // Create user within transaction
  const user = await User.create(
    {
      name: 'John Doe',
      email: 'john@example.com',
    },
    { client: trx }
  )

  // Create related profile within same transaction
  const profile = await Profile.create(
    {
      userId: user._id,
      firstName: 'John',
      lastName: 'Doe',
    },
    { client: trx }
  )

  // If any operation fails, entire transaction is rolled back
  // If all operations succeed, transaction is automatically committed
  return user
})

console.log('Transaction completed successfully:', newUser.toJSON())
```

#### Manual Transactions

For more control, you can manually manage transaction lifecycle:

```typescript
// Manual transaction with explicit commit/rollback
const trx = await db.transaction()

try {
  // Create user within transaction
  const user = await User.create(
    {
      name: 'Jane Smith',
      email: 'jane@example.com',
    },
    { client: trx }
  )

  // Update user within transaction
  await User.query({ client: trx }).where('_id', user._id).update({ age: 30 })

  // Manually commit the transaction
  await trx.commit()
  console.log('Transaction committed successfully')
} catch (error) {
  // Manually rollback on error
  await trx.rollback()
  console.error('Transaction rolled back:', error)
}
```

#### Model Instance Transactions

You can associate model instances with transactions:

```typescript
await db.transaction(async (trx) => {
  const user = new User()
  user.name = 'Bob Johnson'
  user.email = 'bob@example.com'

  // Associate model with transaction
  user.useTransaction(trx)
  await user.save()

  // Update the same instance
  user.age = 35
  await user.save() // Uses the same transaction
})
```

#### Query Builder with Transactions

All query builder operations support transactions:

```typescript
const trx = await db.transaction()

try {
  // Query with transaction
  const users = await User.query({ client: trx }).where('isActive', true).all()

  // Update multiple records
  const updateCount = await User.query({ client: trx })
    .where('age', '>=', 18)
    .update({ status: 'adult' })

  // Delete records
  const deleteCount = await User.query({ client: trx }).where('isVerified', false).delete()

  await trx.commit()
} catch (error) {
  await trx.rollback()
  throw error
}
```

#### Transaction Options

You can pass MongoDB-specific transaction options:

```typescript
// With transaction options
const result = await db.transaction(
  async (trx) => {
    // Your operations here
    return await User.create({ name: 'Test' }, { client: trx })
  },
  {
    readConcern: { level: 'majority' },
    writeConcern: { w: 'majority' },
    readPreference: 'primary',
  }
)

// Manual transaction with options
const trx = await db.transaction({
  readConcern: { level: 'majority' },
  writeConcern: { w: 'majority' },
})
```

#### Error Handling and Rollback

Transactions automatically rollback on errors:

```typescript
try {
  await db.transaction(async (trx) => {
    await User.create({ name: 'Test User' }, { client: trx })

    // This will cause the entire transaction to rollback
    throw new Error('Something went wrong')
  })
} catch (error) {
  console.log('Transaction was automatically rolled back')
  // The user creation above was not persisted
}
```

#### Best Practices

1. **Use managed transactions** when possible for automatic error handling
2. **Keep transactions short** to minimize lock time
3. **Handle errors appropriately** and always rollback on failure
4. **Use transactions for related operations** that must succeed or fail together
5. **Pass transaction client** to all operations that should be part of the transaction

### Connection Management

You can work with multiple MongoDB connections:

```typescript
// In your model
export default class User extends BaseModel {
  static getConnection(): string {
    return 'secondary' // Use a different connection
  }
}

// Using different connections in queries
const primaryUsers = await User.query().all() // Uses default connection
const analyticsUsers = await User.query({ connection: 'analytics' }).all() // Uses analytics connection

// Direct database access with specific connections
const primaryDb = db.connection('primary')
const analyticsDb = db.connection('analytics')
```

### Error Handling

The ODM provides comprehensive error handling with custom exception types for different scenarios.

#### Exception Types

```typescript
import {
  MongoOdmException,
  ModelNotFoundException,
  ConnectionException,
  DatabaseOperationException,
  ValidationException,
  TransactionException,
} from 'adonis-odm'

// Base exception for all ODM errors
try {
  // ODM operations
} catch (error) {
  if (error instanceof MongoOdmException) {
    console.log('ODM Error:', error.message)
  }
}

// Model not found exception
try {
  const user = await User.findOrFail('invalid-id')
} catch (error) {
  if (error instanceof ModelNotFoundException) {
    console.log('User not found:', error.message)
    // Error message: "User with identifier "invalid-id" not found"
  }
}

// Connection exception
try {
  await db.connect()
} catch (error) {
  if (error instanceof ConnectionException) {
    console.log('Connection failed:', error.message)
    // Error message: "Failed to connect to MongoDB connection "primary": ..."
  }
}

// Database operation exception
try {
  await User.query().where('invalid.field', 'value').all()
} catch (error) {
  if (error instanceof DatabaseOperationException) {
    console.log('Database operation failed:', error.message)
    // Error message: "Database operation "find" failed: ..."
  }
}

// Validation exception
try {
  const user = new User()
  user.email = 'invalid-email'
  await user.save()
} catch (error) {
  if (error instanceof ValidationException) {
    console.log('Validation failed:', error.message)
    // Error message: "Validation failed for field "email" with value "invalid-email": must be a valid email"
  }
}

// Transaction exception
try {
  await db.transaction(async (trx) => {
    // Transaction operations that fail
    throw new Error('Something went wrong')
  })
} catch (error) {
  if (error instanceof TransactionException) {
    console.log('Transaction failed:', error.message)
    // Error message: "Transaction operation "commit" failed: ..."
  }
}
```

#### Error Handling Best Practices

```typescript
// 1. Use specific exception types for targeted error handling
export default class UserController {
  async show({ params, response }: HttpContext) {
    try {
      const user = await User.findOrFail(params.id)
      return user
    } catch (error) {
      if (error instanceof ModelNotFoundException) {
        return response.status(404).json({ error: 'User not found' })
      }
      throw error // Re-throw other errors
    }
  }

  async store({ request, response }: HttpContext) {
    try {
      const userData = request.only(['name', 'email'])
      const user = await User.create(userData)
      return response.status(201).json(user)
    } catch (error) {
      if (error instanceof ValidationException) {
        return response.status(422).json({ error: error.message })
      }
      if (error instanceof DatabaseOperationException) {
        return response.status(500).json({ error: 'Database error occurred' })
      }
      throw error
    }
  }
}

// 2. Use global exception handler for consistent error responses
export default class HttpExceptionHandler extends ExceptionHandler {
  async handle(error: unknown, ctx: HttpContext) {
    if (error instanceof ModelNotFoundException) {
      return ctx.response.status(404).json({
        error: 'Resource not found',
        message: error.message,
      })
    }

    if (error instanceof ValidationException) {
      return ctx.response.status(422).json({
        error: 'Validation failed',
        message: error.message,
      })
    }

    if (error instanceof ConnectionException) {
      return ctx.response.status(503).json({
        error: 'Service unavailable',
        message: 'Database connection failed',
      })
    }

    return super.handle(error, ctx)
  }
}

// 3. Graceful error handling in transactions
async function transferData() {
  try {
    await db.transaction(async (trx) => {
      const user = await User.create({ name: 'John' }, { client: trx })
      const profile = await Profile.create({ userId: user._id }, { client: trx })

      // If any operation fails, transaction is automatically rolled back
      return { user, profile }
    })
  } catch (error) {
    if (error instanceof TransactionException) {
      console.log('Transaction failed and was rolled back')
    }
    // Handle other errors
  }
}
```

## Performance & Advanced Features

### Bulk Operations

The ODM supports efficient bulk operations for better performance:

```typescript
// Bulk create
const users = await User.createMany([
  { name: 'User 1', email: 'user1@example.com' },
  { name: 'User 2', email: 'user2@example.com' },
  { name: 'User 3', email: 'user3@example.com' },
])

// Bulk update
const updateCount = await User.query().where('isActive', false).update({ status: 'inactive' })

// Bulk delete
const deleteCount = await User.query()
  .where('lastLoginAt', '<', DateTime.now().minus({ months: 6 }))
  .delete()

// Bulk upsert (update or create)
const results = await User.updateOrCreateMany(
  'email', // Key field
  [
    { email: 'user1@example.com', name: 'Updated User 1' },
    { email: 'user4@example.com', name: 'New User 4' },
  ]
)
```

### Connection Pooling

MongoDB connection pooling is automatically configured for optimal performance:

```typescript
// Configure connection pool in config/odm.ts
const odmConfig = defineConfig({
  connections: {
    mongodb: {
      client: 'mongodb',
      connection: {
        url: env.get('MONGO_URI'),
        options: {
          maxPoolSize: 20, // Maximum connections in pool
          minPoolSize: 5, // Minimum connections in pool
          maxIdleTimeMS: 30000, // Close connections after 30s idle
          serverSelectionTimeoutMS: 5000, // Timeout for server selection
          socketTimeoutMS: 0, // No socket timeout
          connectTimeoutMS: 10000, // 10s connection timeout
        },
      },
    },
  },
})
```

### Query Optimization

```typescript
// Use indexes for better query performance
const users = await User.query()
  .where('email', 'john@example.com') // Ensure email field is indexed
  .where('isActive', true) // Compound index on email + isActive
  .first()

// Limit fields to reduce data transfer
const users = await User.query()
  .select(['name', 'email']) // Only fetch required fields
  .where('isActive', true)
  .all()

// Use pagination for large datasets
const paginatedUsers = await User.query()
  .where('isActive', true)
  .orderBy('createdAt', 'desc')
  .paginate(1, 50) // Page 1, 50 records per page

// Efficient counting
const activeUserCount = await User.query().where('isActive', true).count() // More efficient than fetching all records
```

### Relationship Loading Optimization

```typescript
// Eager load relationships to prevent N+1 queries
const users = await User.query()
  .load('profile')
  .load('posts', (postQuery) => {
    postQuery.limit(5).orderBy('createdAt', 'desc')
  })
  .where('isActive', true)
  .all()

// Bulk load relationships for multiple models
const userIds = ['id1', 'id2', 'id3']
const users = await User.query().whereIn('_id', userIds).load('profile').all()
```

### Embedded Document Performance

```typescript
// Efficient embedded document queries
const users = await User.query()
  .embed('profiles', (profileQuery) => {
    profileQuery.where('age', '>', 25).orderBy('age', 'desc').limit(3) // Limit embedded results
  })
  .where('isActive', true)
  .all()

// Aggregation on embedded documents
const userStats = await User.query()
  .where('profiles.age', '>', 18)
  .aggregate([
    { $unwind: '$profiles' },
    { $group: { _id: null, avgAge: { $avg: '$profiles.age' } } },
  ])
```

### Caching Strategies

```typescript
// Model-level caching (implement in your application)
class CachedUser extends User {
  static async findCached(id: string): Promise<User | null> {
    const cacheKey = `user:${id}`
    let user = await cache.get(cacheKey)

    if (!user) {
      user = await this.find(id)
      if (user) {
        await cache.set(cacheKey, user, { ttl: 300 }) // 5 minutes
      }
    }

    return user
  }
}

// Query result caching
const cacheKey = 'active-users'
let activeUsers = await cache.get(cacheKey)

if (!activeUsers) {
  activeUsers = await User.query().where('isActive', true).all()
  await cache.set(cacheKey, activeUsers, { ttl: 60 }) // 1 minute
}
```

### Advanced Query Patterns

```typescript
// Complex aggregation pipelines
const userStats = await User.aggregate([
  { $match: { isActive: true } },
  {
    $group: {
      _id: '$department',
      count: { $sum: 1 },
      avgAge: { $avg: '$age' },
      maxSalary: { $max: '$salary' },
    },
  },
  { $sort: { count: -1 } },
])

// Geospatial queries (if using location data)
const nearbyUsers = await User.query()
  .where('location', 'near', {
    geometry: { type: 'Point', coordinates: [longitude, latitude] },
    maxDistance: 1000, // meters
  })
  .all()

// Text search
const searchResults = await User.query()
  .where('$text', { $search: 'john developer' })
  .orderBy({ score: { $meta: 'textScore' } })
  .all()

// Complex filtering with $expr
const users = await User.query()
  .where('$expr', {
    $gt: [{ $size: '$posts' }, 10], // Users with more than 10 posts
  })
  .all()
```

### Memory Management

```typescript
// Use streams for large datasets
const userStream = User.query().where('isActive', true).stream()

userStream.on('data', (user) => {
  // Process each user individually
  processUser(user)
})

userStream.on('end', () => {
  console.log('Finished processing all users')
})

// Cursor-based pagination for large datasets
let cursor = null
const batchSize = 1000

do {
  const query = User.query().limit(batchSize)
  if (cursor) {
    query.where('_id', '>', cursor)
  }

  const users = await query.orderBy('_id').all()

  if (users.length > 0) {
    cursor = users[users.length - 1]._id
    await processBatch(users)
  }

  if (users.length < batchSize) {
    break // No more data
  }
} while (true)
```

## API Reference

### BaseModel

#### Static Methods

- `query(options?)` - Create a new query builder
- `find(id, options?)` - Find by ID
- `findOrFail(id, options?)` - Find by ID or throw
- `findBy(field, value)` - Find by field
- `findByOrFail(field, value)` - Find by field or throw
- `first()` - Get first record
- `firstOrFail()` - Get first record or throw
- `all()` - Get all records
- `create(attributes, options?)` - Create new record
- `createMany(attributesArray)` - Create multiple records
- `updateOrCreate(search, update)` - Update existing or create new

#### Instance Methods

- `save()` - Save the model
- `delete()` - Delete the model
- `fill(attributes)` - Fill with attributes
- `merge(attributes)` - Merge attributes
- `toDocument()` - Convert to plain object
- `useTransaction(trx)` - Associate model with transaction

#### Instance Properties

- `$isPersisted` - Whether the model exists in database
- `$isLocal` - Whether the model is local only
- `$dirty` - Object containing modified attributes
- `$original` - Original values before modifications
- `$trx` - Associated transaction client (if any)

### Column Decorators

#### @column(options?)

Define a regular database column.

**Options:**

- `isPrimary?: boolean` - Mark as primary key
- `serialize?: (value: any) => any` - Custom serialization function
- `deserialize?: (value: any) => any` - Custom deserialization function
- `serializeAs?: string | null` - Custom JSON key name

#### @column.dateTime(options?)

Define a DateTime column with automatic timestamp handling.

**Options:**

- `autoCreate?: boolean` - Set timestamp on creation
- `autoUpdate?: boolean` - Update timestamp on save
- `serialize?: (value: DateTime) => any` - Custom serialization
- `deserialize?: (value: any) => DateTime` - Custom deserialization

#### @column.date(options?)

Define a Date column.

#### @column.embedded(model, type, options?)

Define an embedded document column.

**Parameters:**

- `model: () => BaseModel` - Model class for the embedded document
- `type: 'single' | 'many'` - Single document or array of documents
- `options?: ColumnOptions` - Additional column options

#### @computed(options?)

Define a computed property (getter-only).

**Options:**

- `serializeAs?: string | null` - Custom JSON key name (null to exclude from serialization)

### Relationship Decorators

#### @hasOne(model, options?)

Define a one-to-one relationship.

**Parameters:**

- `model: () => BaseModel` - Related model class
- `options?: { localKey?: string, foreignKey?: string }` - Key configuration

#### @hasMany(model, options?)

Define a one-to-many relationship.

**Parameters:**

- `model: () => BaseModel` - Related model class
- `options?: { localKey?: string, foreignKey?: string }` - Key configuration

#### @belongsTo(model, options?)

Define a many-to-one relationship.

**Parameters:**

- `model: () => BaseModel` - Related model class
- `options?: { localKey?: string, foreignKey?: string }` - Key configuration

### Hook Decorators

#### Lifecycle Hooks

- `@beforeSave()` - Before create or update
- `@afterSave()` - After create or update
- `@beforeCreate()` - Before create only
- `@afterCreate()` - After create only
- `@beforeUpdate()` - Before update only
- `@afterUpdate()` - After update only
- `@beforeDelete()` - Before delete
- `@afterDelete()` - After delete
- `@beforeFind()` - Before find operations
- `@afterFind()` - After find operations
- `@beforeFetch()` - Before fetch operations
- `@afterFetch()` - After fetch operations

### Query Builder

#### Basic Query Methods

- `where(field, value)` - Add where condition
- `where(field, operator, value)` - Add where condition with operator
- `andWhere(field, value)` - Alias for where method
- `whereNot(field, value)` - Add where not condition
- `whereNot(field, operator, value)` - Add where not condition with operator
- `andWhereNot(field, value)` - Alias for whereNot method

#### OR Query Methods

- `orWhere(field, value)` - Add OR where condition
- `orWhere(field, operator, value)` - Add OR where condition with operator
- `orWhereNot(field, value)` - Add OR where not condition
- `orWhereNot(field, operator, value)` - Add OR where not condition with operator

#### Pattern Matching

- `whereLike(field, pattern)` - Case-sensitive pattern matching
- `whereILike(field, pattern)` - Case-insensitive pattern matching

#### Null Checks

- `whereNull(field)` - Where field is null
- `whereNotNull(field)` - Where field is not null
- `orWhereNull(field)` - OR where field is null
- `orWhereNotNull(field)` - OR where field is not null

#### Field Existence

- `whereExists(field)` - Where field exists
- `whereNotExists(field)` - Where field does not exist
- `orWhereExists(field)` - OR where field exists
- `orWhereNotExists(field)` - OR where field does not exist

#### Array Operations

- `whereIn(field, values)` - Where field is in array
- `whereNotIn(field, values)` - Where field is not in array
- `orWhereIn(field, values)` - OR where field is in array
- `orWhereNotIn(field, values)` - OR where field is not in array

#### Range Operations

- `whereBetween(field, [min, max])` - Where field is between values
- `whereNotBetween(field, [min, max])` - Where field is not between values
- `orWhereBetween(field, [min, max])` - OR where field is between values
- `orWhereNotBetween(field, [min, max])` - OR where field is not between values

#### Aggregation and Grouping

- `distinct(field)` - Get distinct values for field
- `groupBy(...fields)` - Group results by fields
- `having(field, value)` - Add having condition for grouped results
- `having(field, operator, value)` - Add having condition with operator

#### Sorting and Limiting

- `orderBy(field, direction)` - Add sorting
- `limit(count)` - Limit results
- `skip(count)` - Skip results
- `offset(count)` - Alias for skip method
- `forPage(page, perPage)` - Set pagination using page and perPage
- `select(fields)` - Select specific fields

#### Relationship Loading

- `load(relationName, callback?)` - Load referenced relationships with optional filtering
- `embed(relationName, callback?)` - Load embedded documents with optional filtering

#### Transaction Methods

- `useTransaction(trx)` - Associate query builder with transaction

#### Utility Methods

- `clone()` - Clone the query builder instance

#### Execution Methods

- `first()` - Get first result
- `firstOrFail()` - Get first result or throw
- `all()` - Get all results
- `fetch()` - Alias for all()
- `paginate(page, perPage)` - Get paginated results
- `count()` - Count matching documents
- `ids()` - Get array of IDs
- `update(data)` - Update matching documents
- `delete()` - Delete matching documents

### EmbeddedQueryBuilder

The `EmbeddedQueryBuilder` provides comprehensive querying capabilities for embedded documents with full type safety:

#### Basic Query Methods

- `where(field, value)` - Add where condition
- `where(field, operator, value)` - Add where condition with operator
- `andWhere(field, value)` - Alias for where method
- `whereNot(field, value)` - Add where not condition
- `orWhere(field, value)` - Add OR where condition
- `orWhereNot(field, value)` - Add OR where not condition

#### Pattern Matching

- `whereLike(field, pattern)` - Case-sensitive pattern matching
- `whereILike(field, pattern)` - Case-insensitive pattern matching

#### Array Operations

- `whereIn(field, values)` - Where field is in array
- `whereNotIn(field, values)` - Where field is not in array
- `orWhereIn(field, values)` - OR where field is in array
- `orWhereNotIn(field, values)` - OR where field is not in array

#### Range Operations

- `whereBetween(field, [min, max])` - Where field is between values
- `whereNotBetween(field, [min, max])` - Where field is not between values
- `orWhereBetween(field, [min, max])` - OR where field is between values
- `orWhereNotBetween(field, [min, max])` - OR where field is not between values

#### Null and Existence Checks

- `whereNull(field)` - Where field is null
- `whereNotNull(field)` - Where field is not null
- `whereExists(field)` - Where field exists
- `whereNotExists(field)` - Where field does not exist

#### Advanced Filtering

- `whereAll(conditions)` - Add multiple AND conditions
- `whereAny(conditions)` - Add multiple OR conditions
- `whereDateBetween(field, startDate, endDate)` - Filter by date range
- `whereArrayContains(field, value)` - Filter by array contains value
- `whereRegex(field, pattern, flags?)` - Filter by regex pattern

#### Sorting and Limiting

- `orderBy(field, direction)` - Add sorting
- `limit(count)` - Limit results
- `skip(count)` - Skip results
- `offset(count)` - Alias for skip method
- `forPage(page, perPage)` - Set pagination using page and perPage

#### Search and Selection

- `search(term, fields?)` - Search across multiple fields
- `select(...fields)` - Select specific fields

#### Execution Methods

- `get()` - Get all filtered results
- `first()` - Get first result
- `count()` - Count matching documents
- `exists()` - Check if any results exist
- `paginate(page, perPage)` - Get paginated results with metadata

#### Aggregation Methods

- `distinct(field)` - Get distinct values for field
- `groupBy(field)` - Group results by field value
- `aggregate(field)` - Get aggregated statistics (sum, avg, min, max, count)

#### Utility Methods

- `tap(callback)` - Execute callback on results
- `clone()` - Clone the query builder instance

### Database Manager

#### Transaction Methods

- `transaction(callback, options?)` - Execute managed transaction
- `transaction(options?)` - Create manual transaction

#### Connection Methods

- `connection(name?)` - Get MongoDB client connection
- `db(name?)` - Get database instance
- `collection(name, connectionName?)` - Get collection instance
- `connect()` - Connect to all configured MongoDB instances
- `close()` - Close all connections

### Transaction Client

#### Transaction Control

- `commit()` - Commit the transaction
- `rollback()` - Rollback/abort the transaction

#### Database Access

- `collection(name)` - Get collection instance within transaction
- `query(modelConstructor)` - Create query builder within transaction
- `getSession()` - Get underlying MongoDB ClientSession

## CLI Commands

The MongoDB ODM provides Ace commands for generating models and managing your database.

### Generate Models

Generate a new ODM model:

```bash
node ace make:odm-model User
```

This creates a new model file in `app/models/` with the basic structure:

```typescript
import { BaseModel, column } from 'adonis-odm'
import { DateTime } from 'luxon'

export default class User extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  static getCollectionName(): string {
    return 'users'
  }
}
```

**Available Commands:**

- `make:odm-model <ModelName>` - Generate a new ODM model class

## Testing

The MongoDB ODM provides comprehensive testing support with both unit tests and integration tests.

### Running Tests

```bash
# Run all tests
npm test

# Run integration tests with real MongoDB
npm run test:integration

# Run all tests (unit + integration)
npm run test:all

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Docker Testing

For integration tests, the package includes Docker support:

```bash
# Start MongoDB with Docker and run tests
npm run test:docker

# Keep containers running after tests (useful for debugging)
npm run test:docker:keep
```

### Writing Tests for Your Models

```typescript
import { test } from 'node:test'
import assert from 'node:assert'
import { User, Profile } from '#models'
import db from 'adonis-odm/services/db'

test.describe('User Model', () => {
  test.beforeEach(async () => {
    // Clean up database before each test
    await User.query().delete()
    await Profile.query().delete()
  })

  test('should create a user with embedded profile', async () => {
    const user = await User.create({
      name: 'John Doe',
      email: 'john@example.com',
      profile: {
        firstName: 'John',
        lastName: 'Doe',
        age: 30,
      },
    })

    assert.strictEqual(user.name, 'John Doe')
    assert.strictEqual(user.profile?.firstName, 'John')
    assert.ok(user.$isPersisted)
  })

  test('should load relationships', async () => {
    const user = await User.create({
      name: 'Jane Smith',
      email: 'jane@example.com',
    })

    const profile = await Profile.create({
      firstName: 'Jane',
      lastName: 'Smith',
      userId: user._id,
    })

    const userWithProfile = await User.query().load('profile').findOrFail(user._id)

    assert.ok(userWithProfile.profile)
    assert.strictEqual(userWithProfile.profile.firstName, 'Jane')
  })

  test('should handle transactions', async () => {
    const result = await db.transaction(async (trx) => {
      const user = await User.create(
        {
          name: 'Transaction User',
          email: 'transaction@example.com',
        },
        { client: trx }
      )

      const profile = await Profile.create(
        {
          firstName: 'Transaction',
          lastName: 'User',
          userId: user._id,
        },
        { client: trx }
      )

      return { user, profile }
    })

    assert.strictEqual(result.user.name, 'Transaction User')
    assert.strictEqual(result.profile.firstName, 'Transaction')
  })

  test('should execute hooks', async () => {
    let hookExecuted = false

    // Temporarily add a hook for testing
    const originalHooks = User.getMetadata().hooks
    User.getMetadata().hooks = new Map([['afterCreate', ['testHook']]])

    // Add the hook method
    ;(User as any).testHook = () => {
      hookExecuted = true
    }

    await User.create({
      name: 'Hook Test',
      email: 'hook@example.com',
    })

    assert.ok(hookExecuted)

    // Restore original hooks
    User.getMetadata().hooks = originalHooks
  })

  test('should handle embedded document queries', async () => {
    const user = await User.create({
      name: 'Embedded Test',
      email: 'embedded@example.com',
      profiles: [
        { firstName: 'John', lastName: 'Doe', age: 30 },
        { firstName: 'Jane', lastName: 'Smith', age: 25 },
      ],
    })

    const userWithFilteredProfiles = await User.query()
      .embed('profiles', (profileQuery) => {
        profileQuery.where('age', '>', 28)
      })
      .findOrFail(user._id)

    assert.strictEqual(userWithFilteredProfiles.profiles?.length, 1)
    assert.strictEqual(userWithFilteredProfiles.profiles?.[0].firstName, 'John')
  })
})
```

### Test Utilities

For testing, you can use the standard MongoDB ODM features:

```typescript
import db from 'adonis-odm/services/db'
import { User, Profile } from '#models'

// Clean all collections manually
await User.query().delete()
await Profile.query().delete()

// Or clean specific collections
await db.collection('users').deleteMany({})
await db.collection('profiles').deleteMany({})

// Create test data
const testUsers = await User.createMany([
  { name: 'Test User 1', email: 'test1@example.com' },
  { name: 'Test User 2', email: 'test2@example.com' },
])

// Create test transaction
const result = await db.transaction(async (trx) => {
  // Your test operations within transaction
  const user = await User.create({ name: 'Test' }, { client: trx })
  return user
})
```

### Testing Best Practices

1. **Clean database between tests** - Ensure test isolation
2. **Use transactions for test data** - Easy cleanup and rollback
3. **Test both success and error cases** - Include exception handling
4. **Mock external dependencies** - Focus on ODM functionality
5. **Use descriptive test names** - Make tests self-documenting

## Examples

The MongoDB ODM provides comprehensive functionality as demonstrated in the examples directory:

### Example Files

- **`examples/app/controllers/cruds_controller.ts`** - Complete CRUD operations showcase
- **`examples/app/models/`** - Various model examples with different relationship types
- **`examples/simple_db_usage.ts`** - Basic usage patterns
- **`examples/config/odm.ts`** - Configuration examples

### Key Features Demonstrated

- Type-safe embedded document operations
- Advanced query building with the `.embed()` method
- CRUD operations on both single and array embedded documents
- Transaction support with error handling
- Relationship loading and filtering with type safety
- Lifecycle hooks implementation
- Error handling patterns

## Contributing

We welcome contributions to the MongoDB ODM! Here's how you can help:

### Development Setup

1. **Fork and Clone**

   ```bash
   git clone https://github.com/your-username/adonis-odm.git
   cd adonis-odm
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Set Up Development Environment**

   ```bash
   # Copy environment variables
   cp .env.example .env

   # Start MongoDB with Docker (for testing)
   docker-compose up -d mongodb
   ```

4. **Run Tests**

   ```bash
   # Run all tests
   npm test

   # Run tests with coverage
   npm run test:coverage

   # Run integration tests
   npm run test:integration
   ```

### Development Workflow

1. **Create a Feature Branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**

   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed

3. **Run Quality Checks**

   ```bash
   # Lint code
   npm run lint

   # Format code
   npm run format

   # Type check
   npm run typecheck

   # Run all tests
   npm run test:all
   ```

4. **Build the Package**

   ```bash
   npm run compile
   ```

5. **Submit a Pull Request**
   - Provide a clear description of your changes
   - Include tests for new features
   - Ensure all CI checks pass

### Code Style Guidelines

- **TypeScript**: Use strict TypeScript with proper type annotations
- **ESLint**: Follow the configured ESLint rules
- **Prettier**: Use Prettier for code formatting
- **Naming**: Use descriptive names for variables, functions, and classes
- **Comments**: Add JSDoc comments for public APIs

### Testing Guidelines

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test real database operations
- **Coverage**: Maintain high test coverage (>90%)
- **Test Structure**: Use descriptive test names and organize tests logically

### Documentation Guidelines

- **README**: Keep the main README comprehensive and up-to-date
- **JSDoc**: Document all public APIs with JSDoc comments
- **Examples**: Provide practical examples for new features
- **Changelog**: Update the changelog for all changes

### Reporting Issues

When reporting issues, please include:

1. **Environment Information**

   - Node.js version
   - MongoDB version
   - AdonisJS version
   - Package version

2. **Reproduction Steps**

   - Minimal code example
   - Expected behavior
   - Actual behavior

3. **Error Messages**
   - Full error stack traces
   - Relevant log output

### Feature Requests

For feature requests, please:

1. **Check Existing Issues** - Avoid duplicates
2. **Provide Use Cases** - Explain why the feature is needed
3. **Consider Implementation** - Suggest how it might work
4. **Discuss First** - Open an issue before starting work

### Release Process

1. **Version Bumping**

   ```bash
   # Patch release (bug fixes)
   npm run release:patch

   # Minor release (new features)
   npm run release:minor

   # Major release (breaking changes)
   npm run release:major
   ```

2. **Publishing**
   ```bash
   # Build and publish
   npm run compile
   npm publish
   ```

### Project Structure

```
adonis-odm/
├── src/                    # Source code
│   ├── base_model/        # BaseModel implementation
│   ├── decorators/        # Column and hook decorators
│   ├── query_builder/     # Query builder implementation
│   ├── relationships/     # Relationship handling
│   ├── embedded/          # Embedded document support
│   ├── exceptions/        # Custom exceptions
│   └── types/             # TypeScript type definitions
├── providers/             # AdonisJS service providers
├── commands/              # Ace commands
├── services/              # Database services
├── stubs/                 # Code generation templates
├── examples/              # Usage examples
├── tests/                 # Test files
├── docs/                  # Documentation
└── scripts/               # Build and utility scripts
```

### Getting Help

- **GitHub Issues**: For bugs and feature requests
- **Discussions**: For questions and community support
- **Documentation**: Check the comprehensive docs in `/docs`
- **Examples**: See practical examples in `/examples`

## License

This project is licensed under the MIT License. See the [LICENSE.md](LICENSE.md) file for details.

## Acknowledgments

- **AdonisJS Team** - For the excellent framework and Lucid ORM inspiration
- **MongoDB Team** - For the robust MongoDB Node.js driver
- **Contributors** - Thank you to all contributors who help improve this project

## Changelog

See [CHANGELOG.md](docs/CHANGELOG.md) for a detailed history of changes.

## Support

If you find this project helpful, please consider:

- ⭐ Starring the repository
- 🐛 Reporting bugs and issues
- 💡 Suggesting new features
- 🤝 Contributing code or documentation
- 📢 Sharing with the community
