# MakeOdmSeeder Command Usage Examples

This document demonstrates how to use the `make:odm-seeder` command to generate seeder files for your MongoDB database.

## Basic Usage

### Generate a Basic Seeder

```bash
# Generate a seeder for User model
node ace make:odm-seeder User
```

**Generated file**: `database/seeders/user_seeder.ts`

```typescript
import { BaseSeeder } from 'adonis-odm/seeders'

export default class UserSeeder extends BaseSeeder {
  // static environment = ['development', 'testing']

  async run(): Promise<void> {
    // Example: Insert sample data
    // const collection = this.getCollection('users')
    // 
    // await collection.insertMany([
    //   {
    //     name: 'Sample User',
    //     email: 'sample@example.com',
    //     createdAt: new Date(),
    //     updatedAt: new Date(),
    //   },
    //   // Add more sample data as needed
    // ])

    // TODO: Implement your seeding logic here
    console.log('UserSeeder executed successfully')
  }
}
```

## Template Options

### Simple Template

For minimal boilerplate:

```bash
node ace make:odm-seeder User --stub=simple
```

**Generated file**: `database/seeders/user_seeder.ts`

```typescript
import { BaseSeeder } from 'adonis-odm/seeders'

export default class UserSeeder extends BaseSeeder {
  async run(): Promise<void> {
    // TODO: Add your seeding logic here
    
    // Example: Insert data using collection directly
    // const collection = this.getCollection('users')
    // await collection.insertMany([
    //   { name: 'Sample 1', createdAt: new Date() },
    //   { name: 'Sample 2', createdAt: new Date() },
    // ])
  }
}
```

### Advanced Template

For comprehensive features and best practices:

```bash
node ace make:odm-seeder User --stub=advanced
```

**Generated file**: `database/seeders/user_seeder.ts`

```typescript
import { BaseSeeder } from 'adonis-odm/seeders'
import { ObjectId } from 'mongodb'

export default class UserSeeder extends BaseSeeder {
  static environment = ['development', 'testing']

  async run(): Promise<void> {
    try {
      console.log('🌱 Starting UserSeeder...')

      // Check if data already exists to avoid duplicates
      const collection = this.getCollection('users')
      const existingCount = await collection.countDocuments()

      if (existingCount > 0) {
        console.log(`⏭️  UserSeeder skipped: ${existingCount} records already exist`)
        return
      }

      // Environment-specific data
      const environment = process.env.NODE_ENV || 'development'
      const seedData = this.getSeedData(environment)

      // Batch insert for better performance
      const batchSize = 100
      const batches = this.chunkArray(seedData, batchSize)

      let totalInserted = 0
      for (const [index, batch] of batches.entries()) {
        await collection.insertMany(batch)
        totalInserted += batch.length
        
        console.log(`📦 Batch ${index + 1}/${batches.length} completed (${totalInserted}/${seedData.length} records)`)
      }

      console.log(`✅ UserSeeder completed: ${totalInserted} records inserted`)

    } catch (error) {
      console.error(`❌ UserSeeder failed:`, error)
      throw error
    }
  }

  // Additional helper methods included...
}
```

## Subdirectory Organization

### Generate Seeders in Subdirectories

```bash
# Generate seeder in admin subdirectory
node ace make:odm-seeder admin/User

# Generate seeder in main subdirectory
node ace make:odm-seeder main/DatabaseSeeder
```

**Generated files**:
- `database/seeders/admin/user_seeder.ts`
- `database/seeders/main/database_seeder.ts`

## Command Options

### Available Flags

- `--stub=<template>`: Choose template (main, simple, advanced)
  - `main` (default): Comprehensive template with examples
  - `simple`: Minimal template for basic use cases
  - `advanced`: Feature-rich template with best practices

### Help Information

```bash
# Get help for the command
node ace make:odm-seeder --help
```

## Generated Seeder Features

### Environment Restrictions

```typescript
export default class UserSeeder extends BaseSeeder {
  // Only run in development and testing environments
  static environment = ['development', 'testing']

  async run(): Promise<void> {
    // Seeding logic here
  }
}
```

### Database Access

```typescript
export default class UserSeeder extends BaseSeeder {
  async run(): Promise<void> {
    // Direct collection access
    const usersCollection = this.getCollection('users')
    
    // Database instance access
    const database = this.getDatabase()
    
    // Using ODM models (if available)
    const User = (await import('#models/user')).default
    await User.createMany([...])
  }
}
```

### Best Practices Examples

The generated seeders include examples for:

1. **Idempotent Operations**: Check for existing data before inserting
2. **Batch Processing**: Handle large datasets efficiently
3. **Environment-Specific Data**: Different data for different environments
4. **Error Handling**: Proper try-catch blocks and error reporting
5. **Progress Tracking**: Console logging for long-running operations
6. **Relationship Handling**: Examples for seeding related data
7. **Transaction Support**: Using MongoDB transactions for consistency

## Integration with Seeder Execution

Once generated, seeders can be executed using the `odm:seed` command:

```bash
# Run all seeders
node ace odm:seed

# Run specific seeder
node ace odm:seed --files="./database/seeders/user_seeder.ts"

# Run in specific environment
NODE_ENV=development node ace odm:seed
```

## File Naming Conventions

The command follows AdonisJS naming conventions:

- **Input**: `User` → **Output**: `user_seeder.ts` → **Class**: `UserSeeder`
- **Input**: `AdminUser` → **Output**: `admin_user_seeder.ts` → **Class**: `AdminUserSeeder`
- **Input**: `admin/User` → **Output**: `admin/user_seeder.ts` → **Class**: `UserSeeder`

## Error Handling

The command validates:

- **Stub template names**: Only accepts 'main', 'simple', 'advanced'
- **File path conflicts**: Warns if file already exists
- **Directory creation**: Creates subdirectories as needed

Example error for invalid stub:

```bash
node ace make:odm-seeder User --stub=invalid
# Error: Invalid stub template "invalid". Valid options: main, simple, advanced
```
