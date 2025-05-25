# MongoDB ODM for AdonisJS v6

A MongoDB Object Document Mapper (ODM) for AdonisJS v6 that provides a familiar Lucid ORM-like interface for working with MongoDB databases.

## Features

- 🎯 **Familiar API**: Similar to AdonisJS Lucid ORM for easy adoption
- 🏗️ **Decorator-based Models**: Use decorators to define your model schema
- 🔍 **Fluent Query Builder**: Chainable query methods with MongoDB-specific operations
- 📅 **Automatic Timestamps**: Auto-managed `createdAt` and `updatedAt` fields
- 🔄 **Model Lifecycle**: Track model state with `$isPersisted`, `$dirty`, etc.
- 📄 **Pagination**: Built-in pagination support
- 🔗 **Connection Management**: Multiple MongoDB connection support
- 🛡️ **Type Safety**: Full TypeScript support

## Installation

```bash
npm install mongodb luxon
```

## Configuration

### 1. Environment Variables

Add MongoDB configuration to your `.env` file:

```env
MONGO_HOST=localhost
MONGO_PORT=27017
MONGO_DATABASE=your_database_name
MONGO_URI=mongodb://localhost:27017/your_database_name
```

### 2. MongoDB Configuration

Create `config/mongodb.ts`:

```typescript
import { MongoConfig } from '../src/types/index.js'
import env from '#start/env'

const mongoConfig: MongoConfig = {
  connection: env.get('MONGO_CONNECTION', 'mongodb'),

  connections: {
    mongodb: {
      client: 'mongodb',
      connection: {
        // Option 1: Use a full URI
        url: env.get('MONGO_URI', ''),

        // Option 2: Use individual components (if url is not provided)
        host: env.get('MONGO_HOST', 'localhost'),
        port: Number(env.get('MONGO_PORT', '27017')),
        database: env.get('MONGO_DATABASE', 'adonis_mongo'),

        // MongoDB connection options
        options: {
          maxPoolSize: Number(env.get('MONGO_MAX_POOL_SIZE', '10')),
          minPoolSize: Number(env.get('MONGO_MIN_POOL_SIZE', '0')),
          maxIdleTimeMS: Number(env.get('MONGO_MAX_IDLE_TIME_MS', '30000')),
          serverSelectionTimeoutMS: Number(env.get('MONGO_SERVER_SELECTION_TIMEOUT_MS', '5000')),
          socketTimeoutMS: Number(env.get('MONGO_SOCKET_TIMEOUT_MS', '0')),
          connectTimeoutMS: Number(env.get('MONGO_CONNECT_TIMEOUT_MS', '10000')),
        },
      },
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
}

export default mongoConfig
```

### 3. Register the Provider

Add the MongoDB provider to your `adonisrc.ts`:

```typescript
export default defineConfig({
  providers: [
    // ... other providers
    () => import('#providers/mongodb_provider'),
  ],
})
```

## Usage

### Creating Models

Create a model by extending `BaseModel` and using decorators:

```typescript
import { BaseModel } from '../src/base_model/base_model.js'
import { column } from '../src/decorators/column.js'
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

// Pattern matching with like
const users = await User.query().where('name', 'like', 'John%').all()
const users = await User.query().where('email', 'like', '%@gmail.com').all()

// Sorting
const users = await User.query().orderBy('createdAt', 'desc').orderBy('name', 'asc').all()

// Limiting and skipping
const users = await User.query().limit(10).skip(20).all()

// Field selection
const users = await User.query().select(['name', 'email']).all()
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

- `query()` - Create a new query builder
- `find(id)` - Find by ID
- `findOrFail(id)` - Find by ID or throw
- `findBy(field, value)` - Find by field
- `findByOrFail(field, value)` - Find by field or throw
- `first()` - Get first record
- `firstOrFail()` - Get first record or throw
- `all()` - Get all records
- `create(attributes)` - Create new record
- `createMany(attributesArray)` - Create multiple records
- `updateOrCreate(search, update)` - Update existing or create new

#### Instance Methods

- `save()` - Save the model
- `delete()` - Delete the model
- `fill(attributes)` - Fill with attributes
- `merge(attributes)` - Merge attributes
- `toDocument()` - Convert to plain object

#### Instance Properties

- `$isPersisted` - Whether the model exists in database
- `$isLocal` - Whether the model is local only
- `$dirty` - Object containing modified attributes
- `$original` - Original values before modifications

### Query Builder

#### Query Methods

- `where(field, value)` - Add where condition
- `where(field, operator, value)` - Add where condition with operator
- `orWhere(field, value)` - Add OR where condition
- `whereNull(field)` - Where field is null
- `whereNotNull(field)` - Where field is not null
- `whereIn(field, values)` - Where field is in array
- `whereNotIn(field, values)` - Where field is not in array
- `whereBetween(field, [min, max])` - Where field is between values

#### Sorting and Limiting

- `orderBy(field, direction)` - Add sorting
- `limit(count)` - Limit results
- `skip(count)` - Skip results
- `select(fields)` - Select specific fields

#### Execution Methods

- `first()` - Get first result
- `firstOrFail()` - Get first result or throw
- `all()` - Get all results
- `fetch()` - Alias for all()
- `paginate(page, perPage)` - Get paginated results
- `count()` - Count matching documents
- `ids()` - Get array of IDs
- `delete()` - Delete matching documents

## Examples

Check the `examples/basic_usage.ts` file for a comprehensive example of how to use the MongoDB ODM.

## Testing

The ODM includes comprehensive tests. Run them with:

```bash
npm test
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Add tests for your changes
4. Ensure all tests pass
5. Submit a pull request

## License

This project is licensed under the MIT License.
