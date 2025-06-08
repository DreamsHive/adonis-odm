# Migration Guide: From Lucid Seeders to Adonis ODM Seeders

This guide helps you migrate from AdonisJS Lucid database seeders to Adonis ODM seeders for MongoDB. While the concepts are similar, there are important differences in syntax and capabilities.

## Overview of Changes

### What's Similar
- **BaseSeeder class**: Both use a base seeder class that you extend
- **run() method**: The main seeding logic goes in the `run()` method
- **Environment restrictions**: Both support environment-specific seeding
- **Command-line interface**: Similar commands for running seeders

### What's Different
- **Database operations**: MongoDB operations instead of SQL
- **Model usage**: ODM models instead of Lucid models
- **Execution order**: Enhanced dependency management and ordering
- **Configuration**: MongoDB-specific configuration options

## Basic Migration Examples

### Lucid Seeder (Before)

```typescript
// database/seeders/UserSeeder.ts
import { BaseSeeder } from '@adonisjs/lucid/database'
import User from '#models/user'

export default class UserSeeder extends BaseSeeder {
  public async run() {
    await User.createMany([
      {
        email: 'john@example.com',
        password: 'secret123',
        fullName: 'John Doe',
      },
      {
        email: 'jane@example.com',
        password: 'secret123',
        fullName: 'Jane Smith',
      },
    ])
  }
}
```

### ODM Seeder (After)

```typescript
// database/seeders/user_seeder.ts
import { BaseSeeder } from 'adonis-odm/seeders'
import User from '#models/user'

export default class UserSeeder extends BaseSeeder {
  async run() {
    await User.createMany([
      {
        email: 'john@example.com',
        password: 'secret123',
        name: 'John Doe',
        profile: {
          firstName: 'John',
          lastName: 'Doe',
        },
      },
      {
        email: 'jane@example.com',
        password: 'secret123',
        name: 'Jane Smith',
        profile: {
          firstName: 'Jane',
          lastName: 'Smith',
        },
      },
    ])
  }
}
```

## Key Differences

### 1. Import Statements

**Lucid:**
```typescript
import { BaseSeeder } from '@adonisjs/lucid/database'
```

**ODM:**
```typescript
import { BaseSeeder } from 'adonis-odm/seeders'
```

### 2. Method Visibility

**Lucid:**
```typescript
public async run() {
  // Seeding logic
}
```

**ODM:**
```typescript
async run() {
  // Seeding logic (public keyword optional)
}
```

### 3. Data Structure

**Lucid (Relational):**
```typescript
await User.createMany([
  {
    id: 1,
    email: 'user@example.com',
    roleId: 1, // Foreign key reference
  },
])

await Profile.createMany([
  {
    userId: 1, // Foreign key reference
    firstName: 'John',
    lastName: 'Doe',
  },
])
```

**ODM (Document-based):**
```typescript
await User.createMany([
  {
    _id: '507f1f77bcf86cd799439011', // MongoDB ObjectId
    email: 'user@example.com',
    roleId: '507f1f77bcf86cd799439012', // Reference to another document
    profile: {
      // Embedded document
      firstName: 'John',
      lastName: 'Doe',
    },
  },
])
```

## Advanced Migration Patterns

### Environment-Specific Seeders

**Lucid:**
```typescript
import { BaseSeeder } from '@adonisjs/lucid/database'

export default class UserSeeder extends BaseSeeder {
  public static environment = ['development', 'testing']

  public async run() {
    // Seeding logic
  }
}
```

**ODM (Same syntax):**
```typescript
import { BaseSeeder } from 'adonis-odm/seeders'

export default class UserSeeder extends BaseSeeder {
  static environment = ['development', 'testing']

  async run() {
    // Seeding logic
  }
}
```

### Relationships Migration

**Lucid (SQL Relationships):**
```typescript
// Separate tables with foreign keys
export default class PostSeeder extends BaseSeeder {
  public async run() {
    const users = await User.all()
    
    for (const user of users) {
      await Post.create({
        title: 'Sample Post',
        userId: user.id, // Foreign key
      })
    }
  }
}
```

**ODM (Document References):**
```typescript
// Referenced documents or embedded data
export default class PostSeeder extends BaseSeeder {
  async run() {
    const users = await User.all()
    
    for (const user of users) {
      await Post.create({
        title: 'Sample Post',
        authorId: user._id, // ObjectId reference
        author: {
          // Or embed author data
          name: user.name,
          email: user.email,
        },
      })
    }
  }
}
```

### Transaction Usage

**Lucid:**
```typescript
import Database from '@adonisjs/lucid/services/db'

export default class UserSeeder extends BaseSeeder {
  public async run() {
    const trx = await Database.transaction()
    
    try {
      await User.createMany([...], { client: trx })
      await Profile.createMany([...], { client: trx })
      
      await trx.commit()
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }
}
```

**ODM:**
```typescript
import db from 'adonis-odm/services/db'

export default class UserSeeder extends BaseSeeder {
  async run() {
    await db.transaction(async (trx) => {
      // All operations within this block use the transaction
      await User.createMany([...])
      await Profile.createMany([...])
      
      // Transaction automatically commits or rolls back
    })
  }
}
```

## New ODM-Specific Features

### 1. Execution Order and Dependencies

**New in ODM:**
```typescript
export default class UserSeeder extends BaseSeeder {
  static order = 2
  static dependencies = ['RoleSeeder']

  async run() {
    // This runs after RoleSeeder completes
  }
}
```

### 2. Main Seeders

**New in ODM:**
```typescript
// database/seeders/index.ts or main.ts
export default class MainSeeder extends BaseSeeder {
  // Automatically runs first (order = 0)
  
  async run() {
    console.log('🌱 Starting database seeding...')
  }
}
```

### 3. Connection-Specific Seeding

**New in ODM:**
```typescript
export default class AnalyticsSeeder extends BaseSeeder {
  connection = 'analytics' // Use different connection

  async run() {
    // Seeds data to analytics database
  }
}
```

## Command Migration

### Lucid Commands

```bash
# Create seeder
node ace make:seeder User

# Run seeders
node ace db:seed

# Run specific seeder
node ace db:seed --files="./database/seeders/UserSeeder.ts"
```

### ODM Commands

```bash
# Create seeder
node ace make:odm-seeder User

# Run seeders
node ace odm:seed

# Run specific seeder
node ace odm:seed --files="./database/seeders/user_seeder.ts"

# Interactive mode (new)
node ace odm:seed --interactive

# Connection-specific (new)
node ace odm:seed --connection=analytics
```

## Migration Checklist

### 1. Update Imports
- [ ] Change `@adonisjs/lucid/database` to `adonis-odm/seeders`
- [ ] Update model imports if needed

### 2. Update Seeder Structure
- [ ] Remove `public` keywords (optional in ODM)
- [ ] Update data structures for MongoDB documents
- [ ] Convert foreign keys to ObjectId references

### 3. Handle Relationships
- [ ] Convert SQL joins to MongoDB references or embedded documents
- [ ] Update relationship seeding patterns

### 4. Update Commands
- [ ] Change `make:seeder` to `make:odm-seeder`
- [ ] Change `db:seed` to `odm:seed`

### 5. Leverage New Features
- [ ] Add execution order with `static order`
- [ ] Define dependencies with `static dependencies`
- [ ] Consider main seeders for setup logic

### 6. Test Migration
- [ ] Run seeders in development environment
- [ ] Verify data structure in MongoDB
- [ ] Test environment restrictions
- [ ] Validate execution order

## Common Migration Issues

### 1. Auto-incrementing IDs

**Lucid Issue:**
```typescript
// This won't work in MongoDB
await User.create({ id: 1 })
```

**ODM Solution:**
```typescript
// Use ObjectIds or custom IDs
await User.create({ _id: '507f1f77bcf86cd799439011' })
// Or let MongoDB generate the ID automatically
await User.create({ name: 'John' })
```

### 2. SQL-specific Operations

**Lucid Issue:**
```typescript
// SQL-specific operations won't work
await Database.rawQuery('SELECT * FROM users WHERE created_at > ?', [date])
```

**ODM Solution:**
```typescript
// Use MongoDB query methods
await User.query().where('createdAt', '>', date)
```

### 3. Foreign Key Constraints

**Lucid Issue:**
```typescript
// Foreign key constraints don't exist in MongoDB
await User.create({ roleId: 999 }) // Would fail in SQL if role doesn't exist
```

**ODM Solution:**
```typescript
// Manually validate references if needed
const role = await Role.find(roleId)
if (!role) {
  throw new Error('Role not found')
}
await User.create({ roleId: role._id })
```

## Best Practices for Migration

1. **Start Small**: Migrate one seeder at a time
2. **Test Thoroughly**: Verify data integrity after migration
3. **Use Embedded Documents**: Take advantage of MongoDB's document structure
4. **Plan Dependencies**: Use the new dependency system for complex seeding
5. **Environment Safety**: Maintain environment restrictions for safety
6. **Document Changes**: Keep track of structural changes for your team

For more detailed examples and advanced patterns, see the [comprehensive seeder examples](../examples/comprehensive_seeders.ts) and [environment-specific documentation](./environment-specific-seeders.md).
