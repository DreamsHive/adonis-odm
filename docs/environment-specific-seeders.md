# Environment-Specific Seeders

Adonis ODM provides robust support for environment-specific seeder execution, allowing you to control which seeders run in different environments (development, testing, staging, production, etc.).

## Overview

Environment-specific seeders help you:

- **Separate concerns**: Keep development data separate from production essentials
- **Maintain security**: Prevent test data from appearing in production
- **Optimize performance**: Only run necessary seeders in each environment
- **Ensure consistency**: Guarantee essential data exists in production

## Basic Usage

### Defining Environment Restrictions

Use the static `environment` property to specify which environments a seeder should run in:

```typescript
import { BaseSeeder } from 'adonis-odm/seeders'
import User from '#models/user'

export default class UserSeeder extends BaseSeeder {
  // This seeder will only run in development and testing
  static environment = ['development', 'testing']

  async run(): Promise<void> {
    await User.createMany([
      { name: 'John Doe', email: 'john@example.com' },
      { name: 'Jane Smith', email: 'jane@example.com' },
    ])
  }
}
```

### Environment Options

- **No restriction**: Omit the `environment` property to run in all environments
- **Single environment**: `static environment = ['production']`
- **Multiple environments**: `static environment = ['staging', 'production']`
- **Development only**: `static environment = ['development']`
- **Testing only**: `static environment = ['testing']`

## Environment Detection

The seeder system automatically detects the current environment using:

1. **NODE_ENV environment variable** (primary)
2. **Default to 'development'** if NODE_ENV is not set

```bash
# Set environment before running seeders
NODE_ENV=production node ace odm:seed
NODE_ENV=testing node ace odm:seed
NODE_ENV=development node ace odm:seed
```

## Common Patterns

### 1. Development and Testing Data

```typescript
import { BaseSeeder } from 'adonis-odm/seeders'
import User from '#models/user'

export default class SampleDataSeeder extends BaseSeeder {
  static environment = ['development', 'testing']

  async run(): Promise<void> {
    // Insert sample users for development
    await User.createMany([
      { name: 'Dev User', email: 'dev@local.test' },
      { name: 'Test User', email: 'test@local.test' },
    ])
  }
}
```

### 2. Production Essentials

```typescript
import { BaseSeeder } from 'adonis-odm/seeders'
import Setting from '#models/setting'

export default class ProductionSeeder extends BaseSeeder {
  static environment = ['production']

  async run(): Promise<void> {
    // Insert essential production data
    await Setting.createMany([
      { key: 'app.name', value: 'My App' },
      { key: 'app.version', value: '1.0.0' },
    ])
  }
}
```

### 3. Universal Data

```typescript
import { BaseSeeder } from 'adonis-odm/seeders'
import Role from '#models/role'

export default class RolesSeeder extends BaseSeeder {
  // No environment restriction - runs everywhere

  async run(): Promise<void> {
    // Insert roles needed in all environments
    await Role.createMany([
      { name: 'user', permissions: ['read'] },
      { name: 'admin', permissions: ['read', 'write'] },
    ])
  }
}
```

### 4. Testing Fixtures

```typescript
import { BaseSeeder } from 'adonis-odm/seeders'
import User from '#models/user'

export default class TestFixturesSeeder extends BaseSeeder {
  static environment = ['testing']

  async run(): Promise<void> {
    // Insert predictable test data
    await User.createMany([
      { _id: 'test-user-1', name: 'Test User 1' },
      { _id: 'test-user-2', name: 'Test User 2' },
    ])
  }
}
```

## Advanced Scenarios

### Conditional Logic Within Seeders

```typescript
export default class ConditionalSeeder extends BaseSeeder {
  static environment = ['development', 'staging', 'production']

  async run(): Promise<void> {
    const env = process.env.NODE_ENV || 'development'
    const collection = this.getCollection('config')

    switch (env) {
      case 'development':
        await collection.insertOne({ debug: true, logLevel: 'debug' })
        break
      case 'staging':
        await collection.insertOne({ debug: false, logLevel: 'info' })
        break
      case 'production':
        await collection.insertOne({ debug: false, logLevel: 'error' })
        break
    }
  }
}
```

### Environment Validation

```typescript
export default class ValidatedSeeder extends BaseSeeder {
  static environment = ['production']

  async run(): Promise<void> {
    // Validate required environment variables
    const required = ['DATABASE_URL', 'SECRET_KEY']
    const missing = required.filter((key) => !process.env[key])

    if (missing.length > 0) {
      throw new Error(`Missing required env vars: ${missing.join(', ')}`)
    }

    // Proceed with seeding
    await this.getCollection('config').insertOne({
      validated: true,
      timestamp: new Date(),
    })
  }
}
```

## Command Usage

### Running All Seeders

```bash
# Runs all seeders that match the current environment
node ace odm:seed
```

### Environment-Specific Execution

```bash
# Run seeders in development environment
NODE_ENV=development node ace odm:seed

# Run seeders in production environment
NODE_ENV=production node ace odm:seed

# Run seeders in testing environment
NODE_ENV=testing node ace odm:seed
```

### Specific Files with Environment Check

```bash
# Run specific seeder (still respects environment restrictions)
node ace odm:seed --files="./database/seeders/user_seeder.ts"
```

## Seeder Execution Results

When seeders are skipped due to environment restrictions, you'll see clear feedback:

```
Starting ODM seeder execution...
Environment: production

✓ ProductionSeeder (150ms)
⚠ DevelopmentSeeder: Environment restriction: seeder only runs in [development, testing], current: production
✓ UniversalSeeder (75ms)

Summary: 2 executed, 1 skipped, 0 failed
```

## Best Practices

### 1. **Clear Naming Conventions**

- Use descriptive names that indicate environment purpose
- Examples: `ProductionEssentialsSeeder`, `DevelopmentSampleDataSeeder`, `TestFixturesSeeder`

### 2. **Logical Environment Grouping**

- Development + Testing: Sample data, test users
- Staging + Production: Real configurations, essential data
- Testing only: Predictable fixtures with known IDs
- Production only: Critical system data

### 3. **Environment Variable Validation**

```typescript
// Validate environment before seeding
if (process.env.NODE_ENV === 'production' && !process.env.SECRET_KEY) {
  throw new Error('SECRET_KEY required in production')
}
```

### 4. **Idempotent Seeders**

```typescript
// Check if data already exists
const existingUser = await collection.findOne({ email: 'admin@example.com' })
if (!existingUser) {
  await collection.insertOne({ email: 'admin@example.com', role: 'admin' })
}
```

### 5. **Documentation**

- Document which seeders run in which environments
- Explain the purpose of environment-specific data
- Provide setup instructions for each environment

## Troubleshooting

### Seeder Not Running

1. **Check environment restriction**: Verify the `static environment` array includes your current environment
2. **Check NODE_ENV**: Ensure `NODE_ENV` is set correctly
3. **Check seeder file**: Verify the seeder extends `BaseSeeder` and has proper export

### Environment Detection Issues

```typescript
// Debug current environment
console.log('Current environment:', process.env.NODE_ENV || 'development')
console.log('Seeder environments:', YourSeeder.environment)
console.log('Should run:', YourSeeder.shouldRun(process.env.NODE_ENV || 'development'))
```

### Common Mistakes

- **Forgetting to set NODE_ENV**: Defaults to 'development'
- **Typos in environment names**: 'prod' vs 'production'
- **Case sensitivity**: 'Development' vs 'development'
- **Empty environment array**: `[]` means run in all environments

## Integration with Testing

### Test Environment Setup

```typescript
// In your test setup
process.env.NODE_ENV = 'testing'

// Run test-specific seeders
await seederManager.run({
  environment: 'testing',
  files: ['./database/seeders/test_fixtures_seeder.ts'],
})
```

### Cleaning Up Test Data

```typescript
export default class TestCleanupSeeder extends BaseSeeder {
  static environment = ['testing']

  async run(): Promise<void> {
    // Clean up test collections
    await this.getCollection('users').deleteMany({})
    await this.getCollection('posts').deleteMany({})
  }
}
```

This environment-specific functionality ensures your seeders run safely and appropriately across different deployment environments, maintaining data integrity and security.
