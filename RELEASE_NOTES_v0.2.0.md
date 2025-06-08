# Adonis ODM v0.2.0 Release Notes

## 🌱 Major Feature: Database Seeders

This release introduces a comprehensive database seeding system for Adonis ODM, providing powerful tools to populate your MongoDB database with initial or test data.

### ✨ New Features

#### Database Seeders System
- **BaseSeeder Class**: Abstract base class for all database seeders
- **SeederManager**: Manages discovery, loading, and execution of seeders
- **Environment-Specific Seeding**: Control which seeders run in different environments
- **Custom Execution Order**: Define execution order with `static order` property
- **Seeder Dependencies**: Declare dependencies between seeders with `static dependencies`
- **Main Seeders**: Automatic detection and prioritization of `index.ts` and `main.ts` files
- **Connection-Specific Seeding**: Run seeders on specific database connections
- **Comprehensive Error Handling**: Graceful handling of loading errors and validation

#### New Commands
- **`make:odm-seeder`**: Generate new seeder files with multiple templates
- **`odm:seed`**: Run database seeders with various options

#### Package Exports
- **`adonis-odm/seeders`**: Dedicated export for seeder functionality
- Backward compatible exports from main package

### 🚀 Key Capabilities

#### Environment-Specific Seeders
```typescript
export default class UserSeeder extends BaseSeeder {
  static environment = ['development', 'testing']
  
  async run() {
    await User.createMany([...])
  }
}
```

#### Custom Execution Order
```typescript
export default class RoleSeeder extends BaseSeeder {
  static order = 1
  static dependencies = ['ConfigSeeder']
  
  async run() {
    await Role.createMany([...])
  }
}
```

#### Main Seeders
```typescript
// database/seeders/index.ts - Automatically runs first
export default class MainSeeder extends BaseSeeder {
  async run() {
    console.log('🌱 Starting database seeding...')
  }
}
```

#### Connection-Specific Seeding
```typescript
export default class AnalyticsSeeder extends BaseSeeder {
  connection = 'analytics'
  
  async run() {
    await AnalyticsEvent.createMany([...])
  }
}
```

### 📚 Documentation

#### Comprehensive Documentation Added
- **Updated README.md**: Complete Database Seeders section with examples
- **API Documentation**: Full API reference for all seeder classes and interfaces
- **Migration Guide**: Guide for migrating from AdonisJS Lucid seeders
- **Environment-Specific Guide**: Detailed patterns for environment-specific seeding
- **Comprehensive Examples**: 10+ seeder patterns and use cases

#### Command Usage
```bash
# Create seeders
node ace make:odm-seeder User
node ace make:odm-seeder admin/User --stub=advanced

# Run seeders
node ace odm:seed
node ace odm:seed --files="./database/seeders/user_seeder.ts"
node ace odm:seed --interactive
node ace odm:seed --connection=analytics
```

### 🔧 Technical Implementation

#### Advanced Features
- **Global Topological Sort**: Proper dependency resolution across all order levels
- **Circular Dependency Detection**: Robust validation to prevent infinite loops
- **Missing Dependency Validation**: Clear error messages for invalid dependencies
- **Loading Error Handling**: Graceful handling of syntax errors vs validation errors
- **File Discovery**: Recursive discovery of seeder files with pattern matching

#### Package Structure
- **Modular Architecture**: Clean separation of concerns
- **TypeScript Support**: Full type safety and IntelliSense support
- **ESM/CJS Compatibility**: Works with both module systems
- **Stub Templates**: Multiple seeder templates (main, simple, advanced)

### 🧪 Testing

#### Comprehensive Test Suite
- **35+ Unit Tests**: Complete coverage of seeder functionality
- **Integration Tests**: Real-world seeding scenarios
- **Error Handling Tests**: Edge cases and error conditions
- **Execution Order Tests**: Complex dependency scenarios
- **Environment Tests**: Environment-specific behavior validation

### 📦 Package Updates

#### New Exports
```json
{
  "exports": {
    "./seeders": {
      "types": "./build/src/seeders/index.d.ts",
      "import": "./build/src/seeders/index.js",
      "require": "./build/src/seeders/index.cjs"
    }
  }
}
```

#### Keywords Added
- Added "seeders" to package keywords for better discoverability

### 🔄 Backward Compatibility

- **No Breaking Changes**: All existing functionality preserved
- **Seamless Integration**: Seeders integrate with existing ODM features
- **Optional Usage**: Seeder functionality is opt-in

### 🎯 Use Cases

#### Perfect For
- **Initial Data Setup**: Populate essential application data
- **Development Data**: Create realistic development datasets
- **Testing Fixtures**: Generate predictable test data
- **Environment-Specific Data**: Different data for different environments
- **Complex Relationships**: Seed related data with proper dependencies

#### Example Scenarios
- User roles and permissions setup
- Sample blog posts and comments
- Product catalogs and categories
- Analytics events and metrics
- Configuration and settings data

### 🚀 Getting Started

1. **Install/Update**: `npm install adonis-odm@^0.2.0`
2. **Create Seeder**: `node ace make:odm-seeder User`
3. **Run Seeders**: `node ace odm:seed`
4. **Read Documentation**: Check the updated README.md

### 📈 What's Next

This seeder system provides a solid foundation for database population in Adonis ODM applications. Future enhancements may include:
- Seeder rollback functionality
- Data factory integration
- Performance optimizations for large datasets
- Additional seeder templates

---

**Full Changelog**: See [CHANGELOG.md](CHANGELOG.md) for detailed changes.
**Documentation**: See [README.md](README.md) for complete usage guide.
**Migration Guide**: See [docs/migration-from-lucid-seeders.md](docs/migration-from-lucid-seeders.md) for Lucid users.
