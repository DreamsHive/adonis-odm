# ODM Seeder Stub Templates

This directory contains stub templates for generating ODM seeder files using the `make:odm-seeder` command.

## Available Templates

### 1. `main.stub` (Default)
The default template that provides a comprehensive starting point for most seeding scenarios.

**Features:**
- Detailed documentation and examples
- Environment restriction examples
- Multiple seeding pattern examples (direct collection access and ODM models)
- Helpful comments and TODO markers
- Best practices guidance

**Usage:**
```bash
node ace make:odm-seeder User
```

### 2. `simple.stub`
A minimal template for basic seeding needs with minimal boilerplate.

**Features:**
- Minimal code structure
- Basic example comments
- Quick setup for simple use cases

**Usage:**
```bash
node ace make:odm-seeder User --stub=simple
```

### 3. `advanced.stub`
A comprehensive template demonstrating advanced seeding patterns and best practices.

**Features:**
- Environment-specific data generation
- Batch processing for large datasets
- Duplicate checking and idempotent operations
- Progress tracking and logging
- Error handling patterns
- Relationship seeding examples
- Transaction usage examples
- Performance optimization techniques

**Usage:**
```bash
node ace make:odm-seeder User --stub=advanced
```

## Template Variables

All templates use the following variables that are automatically populated:

- `{{ seederName }}` - PascalCase class name (e.g., `UserSeeder`)
- `{{ seederFileName }}` - File name (e.g., `user_seeder`)
- `{{ entity.name }}` - Original entity name provided to the command
- `{{ entity.path }}` - Subdirectory path if specified

## Generated File Structure

Seeders are generated in the following location:
- **Default**: `database/seeders/`
- **With subdirectory**: `database/seeders/{subdirectory}/`
- **Custom path**: Uses `app.seedersPath()` if configured

## Examples

### Basic Seeder Generation
```bash
# Generates: database/seeders/user_seeder.ts
node ace make:odm-seeder User

# Generates: database/seeders/admin/user_seeder.ts  
node ace make:odm-seeder admin/User
```

### Using Different Templates
```bash
# Use simple template
node ace make:odm-seeder User --stub=simple

# Use advanced template
node ace make:odm-seeder User --stub=advanced
```

## Template Customization

You can create custom stub templates by:

1. Creating a new `.stub` file in this directory
2. Following the existing template variable patterns
3. Using the `--stub=filename` flag when generating

### Custom Template Example
```handlebars
{{#var seederName = generators.modelName(entity.name)}}
{{#var seederFileName = generators.modelFileName(entity.name)}}
{{{
  exports({
    to: app.seedersPath ? app.seedersPath(entity.path, seederFileName) : `database/seeders/${entity.path ? entity.path + '/' : ''}${seederFileName}.ts`
  })
}}}
import { BaseSeeder } from 'adonis-odm/seeders'

export default class {{ seederName }} extends BaseSeeder {
  async run(): Promise<void> {
    // Your custom template logic here
  }
}
```

## Best Practices

1. **Environment Restrictions**: Use `static environment = ['development', 'testing']` to prevent accidental production seeding
2. **Idempotent Operations**: Check for existing data before inserting to avoid duplicates
3. **Batch Processing**: Use batch inserts for large datasets to improve performance
4. **Error Handling**: Wrap seeding logic in try-catch blocks for better error reporting
5. **Progress Tracking**: Log progress for long-running seeders
6. **Relationships**: Handle related data carefully, ensuring proper order of operations

## Integration with Commands

These templates are used by the `make:odm-seeder` command and integrate with:
- AdonisJS code generation system
- Entity name processing
- Path resolution
- File output configuration

For more information on using the generated seeders, see the main ODM documentation.
