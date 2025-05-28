# MongoDB ODM for AdonisJS v6

[![CI](https://github.com/DreamsHive/adonis-odm/workflows/CI/badge.svg)](https://github.com/DreamsHive/adonis-odm/actions/workflows/ci.yml)
[![Security](https://github.com/DreamsHive/adonis-odm/workflows/Security/badge.svg)](https://github.com/DreamsHive/adonis-odm/actions/workflows/security.yml)
[![Release](https://github.com/DreamsHive/adonis-odm/workflows/Release/badge.svg)](https://github.com/DreamsHive/adonis-odm/actions/workflows/release.yml)
[![Documentation](https://github.com/DreamsHive/adonis-odm/workflows/Documentation/badge.svg)](https://github.com/DreamsHive/adonis-odm/actions/workflows/docs.yml)
[![npm version](https://badge.fury.io/js/adonis-odm.svg)](https://www.npmjs.com/package/adonis-odm)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A MongoDB Object Document Mapper (ODM) for AdonisJS v6 that provides a familiar Lucid ORM-like interface for working with MongoDB databases.

## Features

- 🎯 **Familiar API**: Similar to AdonisJS Lucid ORM for easy adoption
- 🏗️ **Decorator-based Models**: Use decorators to define your model schema
- 🔍 **Fluent Query Builder**: Chainable query methods with MongoDB-specific operations
- 📅 **Automatic Timestamps**: Auto-managed `createdAt` and `updatedAt` fields
- 🔄 **Model Lifecycle**: Track model state with `$isPersisted`, `$dirty`, etc.
- 📄 **Pagination**: Built-in pagination support
- 🔗 **Connection Management**: Multiple MongoDB connection support
- 🛡️ **Type Safety**: Full TypeScript support with IntelliSense
- 💾 **Database Transactions**: Full ACID transaction support with managed and manual modes
- 📦 **Embedded Documents**: Type-safe embedded document support with full CRUD operations
- 🔗 **Relationships**: Type-safe referenced and embedded relationships with query builders

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

The following environment variables are used by the MongoDB configuration:

```env
MONGO_HOST=localhost
MONGO_PORT=27017
MONGO_DATABASE=your_database_name
MONGO_URI=mongodb://localhost:27017/your_database_name

# Optional connection pool settings
MONGO_MAX_POOL_SIZE=10
MONGO_MIN_POOL_SIZE=0
MONGO_MAX_IDLE_TIME_MS=30000
MONGO_SERVER_SELECTION_TIMEOUT_MS=5000
MONGO_SOCKET_TIMEOUT_MS=0
MONGO_CONNECT_TIMEOUT_MS=10000
```

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

### Database Operations

```bash
# Test database connection (coming soon)
node ace mongodb:status

# Show database information (coming soon)
node ace mongodb:info
```

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

  // Computed properties
  get fullName(): string | null {
    return this.profile?.fullName || null
  }

  get allProfileNames(): string[] {
    return this.profiles?.map((p) => p.fullName) || []
  }

  // Helper methods
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

For traditional referenced relationships, use the `.load()` method:

```typescript
// Load referenced relationships
const users = await User.query().load('profile').where('isActive', true).all()

// Load with filtering callback
const users = await User.query()
  .load('profile', (profileQuery) => {
    profileQuery.where('isPublic', true).orderBy('updatedAt', 'desc')
  })
  .all()
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

#### Custom Serialization

```typescript
@column({
  serialize: (value) => value.toUpperCase(),
  deserialize: (value) => value.toLowerCase(),
})
declare name: string
```

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

## Examples

The MongoDB ODM provides comprehensive functionality as demonstrated in the CRUD controller at `app/controllers/cruds_controller.ts`. This controller showcases all the key features including:

- Type-safe embedded document operations
- Advanced query building with the `.embed()` method
- CRUD operations on both single and array embedded documents
- Transaction support
- Relationship loading and filtering

## Contributing

1. Fork the repository
2. Create your feature branch
3. Add tests for your changes
4. Ensure all tests pass
5. Submit a pull request

## License

This project is licensed under the MIT License.
