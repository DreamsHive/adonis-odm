# Product Requirements Document (PRD): Database Seeders for Adonis ODM

## 1. Overview

### 1.1 Purpose

This PRD outlines the requirements for implementing database seeder functionality in the Adonis ODM package. The feature will enable developers to easily populate MongoDB databases with initial or test data, following the same patterns and conventions established by AdonisJS Lucid ORM.

### 1.2 Goals

- Provide a familiar seeding experience consistent with AdonisJS Lucid patterns
- Enable easy data population for development, testing, and production environments
- Support MongoDB-specific features while maintaining Lucid-style API
- Ensure seamless integration with existing Adonis ODM architecture

### 1.3 Success Criteria

- Developers can generate seeder files using Ace commands
- Seeders can be executed individually or in batches
- Support for environment-specific seeders
- Idempotent operations support
- Custom execution order capabilities
- Integration with existing ODM models and query builders

## 2. Current State Analysis

### 2.1 Existing Infrastructure

The Adonis ODM package currently provides:

- **Base Model**: MongoDB document modeling with decorators
- **Query Builder**: Fluent API for MongoDB operations
- **Database Manager**: Connection management and transaction support
- **Commands**: `make:odm-model` for generating models
- **Provider**: MongoDB service provider integration
- **Configuration**: ODM configuration system

### 2.2 Missing Components

- Seeder base class and infrastructure
- Seeder generation commands
- Seeder execution commands
- Seeder configuration management
- Seeder file templates

## 3. Functional Requirements

### 3.1 Core Seeder Infrastructure

#### 3.1.1 BaseSeeder Class

- **Location**: `src/seeders/base_seeder.ts`
- **Purpose**: Abstract base class for all seeders
- **Features**:
  - Abstract `run()` method for seeder implementation
  - Access to database connection via `this.client`
  - Environment restriction support via static `environment` property
  - Connection name support for multi-tenant scenarios

#### 3.1.2 Seeder Manager

- **Location**: `src/seeders/seeder_manager.ts`
- **Purpose**: Manages seeder discovery, loading, and execution
- **Features**:
  - Discover seeder files from configured paths
  - Load and instantiate seeder classes
  - Execute seeders individually or in batches
  - Handle environment filtering
  - Support custom execution order

### 3.2 Command Line Interface

#### 3.2.1 Make Seeder Command

- **Command**: `node ace make:odm-seeder <name>`
- **Purpose**: Generate new seeder files
- **Features**:
  - Create seeder file in `database/seeders` directory
  - Support subdirectory creation (e.g., `main/index`)
  - Use template stub for consistent file structure
  - Follow AdonisJS naming conventions

#### 3.2.2 Run Seeders Command

- **Command**: `node ace odm:seed`
- **Purpose**: Execute database seeders
- **Features**:
  - Run all seeders by default
  - Support `--files` flag for specific seeders
  - Support `--interactive` flag for seeder selection
  - Support `--connection` flag for specific database connections
  - Environment-aware execution

### 3.3 Configuration System

#### 3.3.1 Seeder Configuration

- **Location**: `config/odm.ts` (extend existing configuration)
- **Features**:
  - Configure seeder file paths
  - Support multiple seeder directories
  - Integration with existing ODM configuration

### 3.4 File Templates

#### 3.4.1 Seeder Stub Template

- **Location**: `stubs/make/odm_seeder/main.stub`
- **Purpose**: Template for generated seeder files
- **Features**:
  - Import BaseSeeder class
  - Implement run() method
  - Include example usage with ODM models
  - TypeScript support

## 4. Technical Specifications

### 4.1 Architecture Integration

#### 4.1.1 Provider Integration

- Extend existing `MongodbProvider` to register seeder commands
- Register seeder manager in IoC container
- Ensure proper lifecycle management

#### 4.1.2 Database Integration

- Utilize existing `MongoDatabaseManager` for connections
- Support transaction-aware seeding operations
- Leverage existing ODM models and query builders

### 4.2 API Design

#### 4.2.1 BaseSeeder Interface

```typescript
export abstract class BaseSeeder {
  static environment?: string[]
  protected client: MongoDatabaseManager
  protected connection?: string

  constructor(client: MongoDatabaseManager, connection?: string)
  abstract run(): Promise<void>
}
```

#### 4.2.2 Seeder Manager Interface

```typescript
export class SeederManager {
  constructor(config: OdmConfig, client: MongoDatabaseManager)

  async run(options?: SeederRunOptions): Promise<void>
  async runFile(filePath: string, connection?: string): Promise<void>
  async getSeederFiles(): Promise<string[]>
}
```

### 4.3 File Structure

```
src/
├── seeders/
│   ├── base_seeder.ts
│   ├── seeder_manager.ts
│   └── index.ts
commands/
├── make_odm_seeder.ts
└── odm_seed.ts
stubs/
└── make/
    └── odm_seeder/
        └── main.stub
```

## 5. Implementation Plan

### 5.1 Phase 1: Core Infrastructure

1. Implement `BaseSeeder` class
2. Create `SeederManager` class
3. Extend ODM configuration for seeders
4. Update provider to register seeder services

### 5.2 Phase 2: Command Implementation

1. Implement `make:odm-seeder` command
2. Implement `odm:seed` command
3. Create seeder stub template
4. Update command registration

### 5.3 Phase 3: Advanced Features

1. Environment-specific seeder support
2. Custom execution order (main seeder pattern)
3. Interactive seeder selection
4. Connection-specific seeding

### 5.4 Phase 4: Documentation and Testing

1. Update README with seeder documentation
2. Create comprehensive examples
3. Write unit and integration tests
4. Update TypeScript definitions

## 6. User Experience

### 6.1 Developer Workflow

#### 6.1.1 Creating a Seeder

```bash
# Generate a new seeder
node ace make:odm-seeder User

# Generate seeder in subdirectory
node ace make:odm-seeder main/index
```

#### 6.1.2 Writing Seeder Logic

```typescript
import { BaseSeeder } from 'adonis-odm/seeders'
import User from '#models/user'

export default class UserSeeder extends BaseSeeder {
  async run() {
    await User.createMany([
      { name: 'John Doe', email: 'john@example.com' },
      { name: 'Jane Smith', email: 'jane@example.com' },
    ])
  }
}
```

#### 6.1.3 Running Seeders

```bash
# Run all seeders
node ace odm:seed

# Run specific seeder
node ace odm:seed --files "./database/seeders/user_seeder.ts"

# Interactive mode
node ace odm:seed --interactive

# Specific connection
node ace odm:seed --connection=tenant-1
```

## 7. Compatibility and Migration

### 7.1 Backward Compatibility

- No breaking changes to existing ODM functionality
- Additive feature that extends current capabilities
- Optional feature that doesn't affect existing users

### 7.2 Migration from Lucid

- Similar API patterns for easy migration
- Compatible command structure
- Familiar configuration approach

## 8. Success Metrics

### 8.1 Functional Metrics

- All seeder commands work as specified
- Seeders execute successfully with ODM models
- Environment filtering works correctly
- Connection-specific seeding functions properly

### 8.2 Developer Experience Metrics

- Consistent API with Lucid patterns
- Clear documentation and examples
- Minimal learning curve for existing AdonisJS developers
- Comprehensive error handling and messaging

## 9. Detailed Implementation Specifications

### 9.1 Command Specifications

#### 9.1.1 Make ODM Seeder Command

```typescript
// commands/make_odm_seeder.ts
export default class MakeOdmSeeder extends BaseCommand {
  static commandName = 'make:odm-seeder'
  static description = 'Make a new ODM seeder'

  @args.string({ description: 'Name of the seeder class' })
  declare name: string

  async run(): Promise<void> {
    const codemods = await this.createCodemods()
    await codemods.makeUsingStub(stubsRoot, 'make/odm_seeder/main.stub', {
      flags: this.parsed.flags,
      entity: this.app.generators.createEntity(this.name),
    })
  }
}
```

#### 9.1.2 ODM Seed Command

```typescript
// commands/odm_seed.ts
export default class OdmSeed extends BaseCommand {
  static commandName = 'odm:seed'
  static description = 'Execute database seeders'

  @flags.array({ description: 'Seeder files to run' })
  declare files: string[]

  @flags.boolean({ description: 'Run in interactive mode' })
  declare interactive: boolean

  @flags.string({ description: 'Database connection to use' })
  declare connection: string

  async run(): Promise<void> {
    const seederManager = await this.app.container.make('odm.seeder')

    if (this.interactive) {
      await this.runInteractive(seederManager)
    } else if (this.files?.length) {
      await this.runSpecificFiles(seederManager)
    } else {
      await this.runAllSeeders(seederManager)
    }
  }
}
```

### 9.2 Configuration Extensions

#### 9.2.1 ODM Configuration Schema

```typescript
// Extend existing OdmConfig interface
export interface OdmConfig {
  connection: string
  connections: Record<string, MongoConnectionConfig>

  // New seeder configuration
  seeders?: {
    paths?: string[]
    defaultConnection?: string
  }
}
```

#### 9.2.2 Default Seeder Configuration

```typescript
// config/odm.ts extension
const odmConfig = defineConfig({
  connection: 'mongodb',
  connections: {
    // ... existing connections
  },

  // Seeder configuration
  seeders: {
    paths: ['./database/seeders'],
    defaultConnection: 'mongodb',
  },
})
```

### 9.3 Error Handling and Validation

#### 9.3.1 Seeder Validation

- Validate seeder files extend BaseSeeder
- Check for required run() method implementation
- Validate environment configurations
- Ensure proper TypeScript compilation

#### 9.3.2 Runtime Error Handling

- Graceful handling of seeder execution failures
- Detailed error messages with file context
- Connection failure recovery
- Transaction rollback on errors

### 9.4 Testing Strategy

#### 9.4.1 Unit Tests

- BaseSeeder class functionality
- SeederManager operations
- Command argument parsing
- Configuration validation

#### 9.4.2 Integration Tests

- End-to-end seeder execution
- Database connection handling
- Environment filtering
- File discovery and loading

#### 9.4.3 Example Test Structure

```typescript
// tests/seeders/base_seeder.spec.ts
test.group('BaseSeeder', () => {
  test('should execute run method', async ({ assert }) => {
    const seeder = new TestSeeder(mockClient)
    await seeder.run()
    assert.isTrue(seeder.executed)
  })

  test('should respect environment restrictions', async ({ assert }) => {
    // Test environment filtering logic
  })
})
```

## 10. Documentation Requirements

### 10.1 README Updates

- Add seeder section to main README
- Include quick start guide
- Provide common use cases
- Link to detailed documentation

### 10.2 API Documentation

- Complete TypeScript definitions
- JSDoc comments for all public methods
- Usage examples for each feature
- Migration guide from Lucid seeders

### 10.3 Example Implementations

```typescript
// Example: User seeder with relationships
export default class UserSeeder extends BaseSeeder {
  static environment = ['development', 'testing']

  async run() {
    // Create users with embedded profiles
    await User.createMany([
      {
        email: 'admin@example.com',
        profile: {
          firstName: 'Admin',
          lastName: 'User',
          role: 'administrator',
        },
      },
    ])
  }
}

// Example: Idempotent country seeder
export default class CountrySeeder extends BaseSeeder {
  async run() {
    await Country.updateOrCreateMany('code', [
      { code: 'US', name: 'United States' },
      { code: 'CA', name: 'Canada' },
      { code: 'MX', name: 'Mexico' },
    ])
  }
}
```

## 11. Future Considerations

### 11.1 Potential Enhancements

- Seeder rollback functionality
- Seeder dependency management
- Performance optimizations for large datasets
- Integration with model factories
- Seeder versioning and tracking

### 11.2 MongoDB-Specific Features

- Support for MongoDB-specific operations (aggregation pipelines)
- Bulk operations optimization
- Index creation during seeding
- GridFS file seeding support

### 11.3 Advanced Features

- Seeder progress tracking and reporting
- Parallel seeder execution
- Conditional seeding based on existing data
- Integration with CI/CD pipelines
- Seeder performance metrics and optimization
