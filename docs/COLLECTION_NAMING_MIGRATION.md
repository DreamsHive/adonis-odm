# Collection Naming Migration Guide

This guide helps you migrate from the old `getCollectionName()` method pattern to the new Lucid-style static `collection` property.

## Overview

The ODM now supports the AdonisJS Lucid pattern for collection naming using a static `collection` property. This provides a cleaner, more declarative approach to defining custom collection names.

## Migration Steps

### Before (Old Pattern)

```typescript
export default class User extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare name: string

  static getCollectionName(): string {
    return 'custom_users'
  }
}
```

### After (New Lucid Pattern)

```typescript
export default class User extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare name: string

  // Lucid pattern: Use static collection property
  static collection = 'custom_users'
}
```

## Automatic Migration Script

You can use this simple find-and-replace pattern to migrate your models:

### Find Pattern
```typescript
static getCollectionName(): string {
  return 'collection_name'
}
```

### Replace With
```typescript
static collection = 'collection_name'
```

## Benefits of the New Pattern

1. **Cleaner Syntax**: No method boilerplate required
2. **Lucid Compatibility**: Follows AdonisJS Lucid conventions
3. **Better Performance**: No method call overhead
4. **Type Safety**: Static property is easier to analyze

## Backward Compatibility

The old `getCollectionName()` method pattern is still fully supported. You can migrate at your own pace:

```typescript
// Both patterns work simultaneously
export default class User extends BaseModel {
  // New pattern (takes precedence)
  static collection = 'users'
  
  // Old pattern (still works but not used when collection property exists)
  static getCollectionName(): string {
    return 'legacy_users'
  }
}
```

## Collection Naming Priority

The ODM determines collection names in this order:

1. **Static collection property** (highest priority)
2. **Metadata tableName** (for decorator-based naming)
3. **Auto-generated from class name** (default)

## Auto-Generated Collection Names

If you don't specify a custom collection name, the ODM automatically generates one from your class name:

```typescript
class User extends BaseModel {}
// Auto-generates: 'users'

class AdminUser extends BaseModel {}
// Auto-generates: 'admin_users'

class APIKey extends BaseModel {}
// Auto-generates: 'a_p_i_keys'

class UserWithProfile extends BaseModel {}
// Auto-generates: 'user_with_profiles'
```

## Best Practices

1. **Use the static collection property** for new models
2. **Migrate existing models gradually** during regular maintenance
3. **Keep collection names descriptive** and follow your naming conventions
4. **Use snake_case** for collection names to match MongoDB conventions

## Example Migration

Here's a complete example of migrating a model:

```typescript
// Before
export default class BlogPost extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare title: string

  @column()
  declare content: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  static getCollectionName(): string {
    return 'blog_posts'
  }
}

// After
export default class BlogPost extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare title: string

  @column()
  declare content: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  // Lucid pattern: cleaner and more declarative
  static collection = 'blog_posts'
}
```

## No Breaking Changes

This migration is completely optional and non-breaking:

- Existing code continues to work unchanged
- No database changes required
- No runtime behavior changes
- Gradual migration is supported

The new pattern is simply a more elegant way to achieve the same result.
