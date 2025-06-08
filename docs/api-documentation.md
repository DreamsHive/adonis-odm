# Adonis ODM Seeders API Documentation

This document provides comprehensive API documentation for the Adonis ODM seeder system, including all classes, interfaces, and methods.

## Table of Contents

- [BaseSeeder](#baseseeder)
- [SeederManager](#seedermanager)
- [Interfaces](#interfaces)
- [Configuration](#configuration)
- [Commands](#commands)

## BaseSeeder

The abstract base class that all seeders must extend.

### Class Definition

```typescript
abstract class BaseSeeder {
  static environment?: string[]
  static order?: number
  static dependencies?: string[]
  protected client: MongoDatabaseManager
  protected connection?: string
}
```

### Static Properties

#### `environment?: string[]`

Specifies which environments the seeder should run in. If not specified, the seeder runs in all environments.

**Example:**
```typescript
static environment = ['development', 'testing']
```

#### `order?: number`

Execution order for the seeder. Lower numbers run first. Defaults to 999 if not specified. Main seeders (`index.ts`, `main.ts`) automatically get order 0.

**Example:**
```typescript
static order = 1
```

#### `dependencies?: string[]`

Array of seeder class names that must run before this seeder. Dependencies are resolved using topological sorting.

**Example:**
```typescript
static dependencies = ['UserSeeder', 'RoleSeeder']
```

### Instance Properties

#### `client: MongoDatabaseManager`

Protected property providing access to the MongoDB database manager.

#### `connection?: string`

Optional connection name to use for this seeder. If not specified, uses the default connection.

### Constructor

```typescript
constructor(client: MongoDatabaseManager, connection?: string)
```

Creates a new seeder instance.

**Parameters:**
- `client` - The MongoDB database manager instance
- `connection` - Optional connection name to use

### Abstract Methods

#### `run(): Promise<void>`

Abstract method that must be implemented by all seeders. Contains the actual seeding logic.

**Example:**
```typescript
async run() {
  await User.createMany([
    { name: 'John Doe', email: 'john@example.com' },
    { name: 'Jane Smith', email: 'jane@example.com' },
  ])
}
```

### Protected Methods

#### `getDatabase()`

Returns the MongoDB database instance for the configured connection.

**Returns:** `Db` - MongoDB database instance

#### `getCollection<T>(name: string)`

Returns a MongoDB collection instance for the configured connection.

**Parameters:**
- `name` - Collection name

**Returns:** `Collection<T>` - MongoDB collection instance

### Static Methods

#### `shouldRun(currentEnvironment: string): boolean`

Checks if the seeder should run in the current environment.

**Parameters:**
- `currentEnvironment` - The current environment (e.g., 'development', 'production')

**Returns:** `boolean` - True if the seeder should run

#### `getSeederName(): string`

Returns the class name of the seeder for logging and identification.

**Returns:** `string` - The seeder class name

## SeederManager

Manages the discovery, loading, and execution of database seeders.

### Class Definition

```typescript
class SeederManager {
  constructor(config: OdmConfig, client: MongoDatabaseManager)
}
```

### Constructor

```typescript
constructor(config: OdmConfig, client: MongoDatabaseManager)
```

Creates a new SeederManager instance.

**Parameters:**
- `config` - ODM configuration object
- `client` - MongoDB database manager instance

### Public Methods

#### `run(options?: SeederRunOptions): Promise<SeederResult[]>`

Runs seeders based on the provided options.

**Parameters:**
- `options` - Optional configuration for seeder execution

**Returns:** `Promise<SeederResult[]>` - Array of seeder execution results

**Example:**
```typescript
const results = await seederManager.run({
  environment: 'development',
  connection: 'mongodb'
})
```

#### `runFile(filePath: string, connection?: string, environment?: string): Promise<SeederResult>`

Runs a specific seeder file.

**Parameters:**
- `filePath` - Path to the seeder file
- `connection` - Optional connection name
- `environment` - Optional environment name

**Returns:** `Promise<SeederResult>` - Seeder execution result

#### `getSeederFiles(): Promise<string[]>`

Discovers and returns all seeder files from configured paths, ordered by execution order and dependencies.

**Returns:** `Promise<string[]>` - Array of seeder file paths

#### `getAvailableConnections(): string[]`

Returns all available connection names from the configuration.

**Returns:** `string[]` - Array of connection names

#### `isValidConnection(connectionName: string): boolean`

Checks if a connection name exists in the configuration.

**Parameters:**
- `connectionName` - Connection name to validate

**Returns:** `boolean` - True if connection exists

#### `getConfig(): Required<SeederConfig>`

Returns the current seeder configuration.

**Returns:** `Required<SeederConfig>` - Seeder configuration object

## Interfaces

### SeederRunOptions

Configuration options for running seeders.

```typescript
interface SeederRunOptions {
  /** Specific files to run */
  files?: string[]
  
  /** Connection name to use */
  connection?: string
  
  /** Environment to check against */
  environment?: string
  
  /** Whether to run in interactive mode */
  interactive?: boolean
}
```

### SeederResult

Result of seeder execution.

```typescript
interface SeederResult {
  /** Seeder class name */
  name: string
  
  /** Path to the seeder file */
  filePath: string
  
  /** Whether the seeder was executed */
  executed: boolean
  
  /** Execution time in milliseconds */
  executionTime?: number
  
  /** Error if execution failed */
  error?: Error
  
  /** Reason for skipping if not executed */
  skipReason?: string
}
```

### SeederConfig

Configuration for the seeder system.

```typescript
interface SeederConfig {
  /** Paths to search for seeder files */
  paths?: string[]
  
  /** Default connection to use */
  defaultConnection?: string
}
```

### SeederMetadata

Metadata extracted from seeder classes.

```typescript
interface SeederMetadata {
  /** Execution order */
  order: number
  
  /** Array of dependency class names */
  dependencies: string[]
  
  /** Whether this is a main seeder file */
  isMainSeeder: boolean
}
```

## Configuration

### ODM Configuration

Add seeder configuration to your `config/odm.ts` file:

```typescript
import { defineConfig } from 'adonis-odm'

export default defineConfig({
  // ... other configuration
  
  seeders: {
    paths: ['./database/seeders'],
    defaultConnection: 'mongodb'
  }
})
```

### Default Configuration

If not specified, the following defaults are used:

```typescript
{
  paths: ['./database/seeders'],
  defaultConnection: 'mongodb'
}
```

## Commands

### make:odm-seeder

Creates a new seeder file.

**Syntax:**
```bash
node ace make:odm-seeder <name> [options]
```

**Options:**
- `--stub=<template>` - Template to use (main, simple, advanced)

**Examples:**
```bash
# Create basic seeder
node ace make:odm-seeder User

# Create seeder in subdirectory
node ace make:odm-seeder admin/User

# Use simple template
node ace make:odm-seeder User --stub=simple
```

### odm:seed

Runs database seeders.

**Syntax:**
```bash
node ace odm:seed [options]
```

**Options:**
- `--files=<files>` - Specific files to run
- `--connection=<name>` - Connection to use
- `--interactive` - Run in interactive mode

**Examples:**
```bash
# Run all seeders
node ace odm:seed

# Run specific files
node ace odm:seed --files="./database/seeders/user_seeder.ts"

# Use specific connection
node ace odm:seed --connection=analytics

# Interactive mode
node ace odm:seed --interactive
```

## Error Handling

### Common Errors

1. **Circular Dependencies**: Thrown when seeders have circular dependency relationships
2. **Missing Dependencies**: Thrown when a seeder depends on a non-existent seeder
3. **Invalid Connection**: Thrown when specifying a connection that doesn't exist
4. **Environment Restrictions**: Seeders are skipped (not errored) when environment doesn't match

### Error Enhancement

The SeederManager automatically enhances errors with connection context:

```typescript
// Original error: "Connection timeout"
// Enhanced error: "Error on connection 'mongodb': Connection timeout"
```

## Best Practices

1. **Use Environment Restrictions**: Always specify environments for development/test data
2. **Define Clear Dependencies**: Use the `dependencies` array for complex seeding scenarios
3. **Handle Existing Data**: Check for existing data to avoid duplicates
4. **Use Transactions**: Wrap complex operations in database transactions
5. **Provide Feedback**: Use console.log to show seeding progress
6. **Error Handling**: Implement proper try/catch blocks in seeder logic

## Examples

For comprehensive examples, see:
- [Comprehensive Seeders](../examples/comprehensive_seeders.ts)
- [Environment-Specific Seeders](./environment-specific-seeders.md)
- [Migration Guide](./migration-from-lucid-seeders.md)
