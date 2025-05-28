# Lucid-Style Decorators for MongoDB ODM

This document explains the improved developer experience using Lucid-style relationship decorators that provide seamless relationship management with direct property access.

## 🎯 Overview

The MongoDB ODM now provides decorators that mirror AdonisJS Lucid ORM's relationship decorators:

- `@hasOne()` - One-to-one relationship
- `@hasMany()` - One-to-many relationship
- `@belongsTo()` - Many-to-one relationship

These decorators provide a seamless developer experience similar to Lucid ORM with automatic relationship setup and **direct property access**.

## 🚀 Key Improvement: Direct Property Access

**The biggest improvement is that you can now access relationship properties directly, just like in AdonisJS Lucid ORM:**

```typescript
// ✅ NEW: Direct property access (like Lucid ORM)
await user.profile.load()
console.log(user.profile.fullName) // Direct access!
console.log(user.profile.bio) // No .related needed!

// ❌ OLD: Required .related property
await user.profile.load()
console.log(user.profile.related?.fullName) // Verbose
console.log(user.profile.related?.bio) // Extra .related
```

This makes the MongoDB ODM feel truly native to the AdonisJS ecosystem!

## ✅ Lucid-Style Direct Access

```typescript
import { BaseModel } from '../src/base_model/base_model.js'
import { column, hasOne } from '../src/decorators/column.js'
import type { HasOne } from '../src/types/relationships.js'
import Profile from './profile.js'

export default class User extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare name: string

  // Lucid-style decorator with direct property access
  @hasOne(() => Profile, {
    localKey: '_id',
    foreignKey: 'userId',
  })
  declare profile: HasOne<typeof Profile>

  @column()
  declare profileId?: string

  // Direct property access - no .related needed!
  get fullName() {
    return this.profile?.fullName || null
  }
}
```

## 🔧 Available Decorators

### @hasOne() - One-to-One Relationship

Defines a one-to-one relationship where the current model has one related model.

```typescript
import { hasOne } from '../src/decorators/column.js'
import type { HasOne } from '../src/types/relationships.js'

class User extends BaseModel {
  @hasOne(() => Profile, {
    localKey: '_id', // Key on this model (default: 'id')
    foreignKey: 'userId', // Key on related model (default: 'userId')
  })
  declare profile: HasOne<typeof Profile>
}
```

### @hasMany() - One-to-Many Relationship

Defines a one-to-many relationship where the current model has many related models.

```typescript
import { hasMany } from '../src/decorators/column.js'
import type { HasMany } from '../src/types/relationships.js'

class User extends BaseModel {
  @hasMany(() => Post, {
    localKey: '_id', // Key on this model (default: 'id')
    foreignKey: 'authorId', // Key on related model (default: 'userId')
  })
  declare posts: HasMany<typeof Post>
}
```

### @belongsTo() - Many-to-One Relationship

Defines a many-to-one relationship where the current model belongs to another model.

```typescript
import { belongsTo } from '../src/decorators/column.js'
import type { BelongsTo } from '../src/types/relationships.js'

class Post extends BaseModel {
  @column()
  declare authorId: string

  @belongsTo(() => User, {
    localKey: 'authorId', // Foreign key on this model (default: 'userId')
    foreignKey: '_id', // Key on related model (default: 'id')
  })
  declare author: BelongsTo<typeof User>
}
```

## 🚀 Complete Example

Here's a complete example showing all three relationship types:

```typescript
import { BaseModel } from '../src/base_model/base_model.js'
import { column, hasOne, hasMany, belongsTo } from '../src/decorators/column.js'
import { DateTime } from 'luxon'
import type { HasOne, HasMany, BelongsTo } from '../src/types/relationships.js'

// User model with hasOne and hasMany relationships
class User extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare name: string

  @column()
  declare email: string

  // One-to-one: User has one Profile
  @hasOne(() => Profile, {
    localKey: '_id',
    foreignKey: 'userId',
  })
  declare profile: HasOne<typeof Profile>

  // One-to-many: User has many Posts
  @hasMany(() => Post, {
    localKey: '_id',
    foreignKey: 'authorId',
  })
  declare posts: HasMany<typeof Post>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  static getCollectionName(): string {
    return 'users'
  }
}

// Profile model with belongsTo relationship
class Profile extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare firstName: string

  @column()
  declare lastName: string

  @column()
  declare userId: string

  // Many-to-one: Profile belongs to User
  @belongsTo(() => User, {
    localKey: 'userId',
    foreignKey: '_id',
  })
  declare user: BelongsTo<typeof User>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim()
  }

  static getCollectionName(): string {
    return 'profiles'
  }
}

// Post model with belongsTo relationship
class Post extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare title: string

  @column()
  declare content: string

  @column()
  declare authorId: string

  // Many-to-one: Post belongs to User
  @belongsTo(() => User, {
    localKey: 'authorId',
    foreignKey: '_id',
  })
  declare author: BelongsTo<typeof User>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  static getCollectionName(): string {
    return 'posts'
  }
}

// All relationships have direct property access! No .related needed.
```

## 🎯 Usage Examples

### Creating Related Models

```typescript
// Create user
const user = await User.create({
  name: 'John Doe',
  email: 'john@example.com',
})

// Create related profile using the relationship
const profile = await user.profile.create({
  firstName: 'John',
  lastName: 'Doe',
  bio: 'Software Developer',
})

// Create related posts
const post1 = await user.posts.create({
  title: 'Getting Started with MongoDB ODM',
  content: 'This is a comprehensive guide...',
})

const post2 = await user.posts.create({
  title: 'Advanced Query Techniques',
  content: 'Learn advanced querying...',
})
```

### Loading Relationships

#### Eager Loading (like Lucid's preload)

```typescript
// Eager load relationships to avoid N+1 queries (like Lucid's preload)
const users = await User.query().load('profile').load('posts').all()

users.forEach((user) => {
  console.log(user.profile.fullName) // Already loaded!
  console.log(`User has ${user.posts.length} posts`) // Already loaded!
})

// Load with constraints (like Lucid's preload with callback)
const usersWithPublishedPosts = await User.query()
  .load('posts', (postsQuery) => {
    postsQuery.where('status', 'published')
  })
  .all()

// Load multiple relationships
const usersWithData = await User.query().load('profile').load('posts').all()
```

#### Lazy Loading (on-demand)

```typescript
// Lazy load individual relationships
await user.profile.load()
console.log(user.profile.fullName) // Direct property access!

// Load user's posts
const userPosts = await user.posts.load()
console.log(`User has ${userPosts.length} posts`)

// Load post's author (belongsTo relationship)
await post1.author.load()
console.log(post1.author.name) // Direct property access!
```

### Querying Through Relationships

```typescript
// Query user's published posts only
const publishedPosts = await user.posts.query().where('status', 'published').all()

// Query profiles with specific criteria
const activeProfiles = await user.profile.query().whereNotNull('bio').first()

// Eager load with query constraints (like Lucid's preload)
const usersWithActivePosts = await User.query()
  .load('posts', (postsQuery) => {
    postsQuery.where('status', 'published').orderBy('createdAt', 'desc')
  })
  .all()
```

### Relationship Operations

```typescript
// Update related profile - direct property access!
if (user.profile.firstName) {
  user.profile.bio = 'Senior Software Developer'
  await user.profile.save(user.profile)
}

// Create multiple posts at once
const morePosts = await user.posts.createMany([
  {
    title: 'TypeScript Best Practices',
    content: 'Learn TypeScript...',
  },
  {
    title: 'Database Design Patterns',
    content: 'Effective database design...',
  },
])

// Associate models (belongsTo)
const newProfile = new Profile()
newProfile.firstName = 'Jane'
newProfile.lastName = 'Smith'
await newProfile.user.associate(user)
```

## 🔧 Setup Guide

### Import the decorators

```typescript
// Import relationship decorators
import { column, hasOne, hasMany, belongsTo } from '../src/decorators/column.js'
import type { HasOne, HasMany, BelongsTo } from '../src/types/relationships.js'
```

### Use proper relationship types

```typescript
// Use proper relationship types
declare
profile: HasOne<typeof Profile>
declare
posts: HasMany<typeof Post>
declare
author: BelongsTo<typeof User>
```

## 🎉 Benefits

### ✅ Direct Property Access (Like Lucid ORM)

- **No more `.related` property needed** - access relationship properties directly
- `user.profile.fullName` instead of `user.profile.related?.fullName`
- `user.posts[0].title` instead of `user.posts.related?.[0].title`
- Identical developer experience to AdonisJS Lucid ORM

### ✅ Eager Loading (Like Lucid's Preload)

- **`.load()` method works exactly like Lucid's `.preload()`** - prevents N+1 query problems
- `User.query().load('profile').load('posts').all()` - chain multiple relationships
- `User.query().load('posts', query => query.where('status', 'published'))` - load with constraints
- Efficient bulk loading of relationships for multiple records

### ✅ Automatic Relationship Setup

- Decorators handle relationship proxies automatically
- Reduces boilerplate code and potential errors
- Clean, declarative relationship definitions

### ✅ Familiar API

- Consistent with AdonisJS Lucid ORM patterns
- Easy migration for developers familiar with Lucid
- Same decorator names and similar options

### ✅ Type Safety

- Full TypeScript support with proper relationship types
- IntelliSense support for relationship methods
- Compile-time type checking

### ✅ Better Developer Experience

- Cleaner, more maintainable code
- Follows AdonisJS conventions
- Reduced cognitive load

### ✅ Relationship-Specific Features

- Different types provide appropriate methods
- `HasOne` and `BelongsTo` for single relationships
- `HasMany` for collections with bulk operations
- Proper method signatures for each relationship type

## 🔧 Advanced Configuration

### Default Key Naming

The decorators use intelligent defaults for key naming:

```typescript
// For hasOne and hasMany
@hasOne(() => Profile)  // Uses: localKey: 'id', foreignKey: 'userId'

// For belongsTo
@belongsTo(() => User)  // Uses: localKey: 'userId', foreignKey: 'id'
```

### Custom Key Names

You can override the default key names:

```typescript
@hasOne(() => Profile, {
  localKey: 'uuid',           // Use UUID instead of id
  foreignKey: 'userUuid'      // Custom foreign key name
})
declare profile: HasOne<typeof Profile>

@belongsTo(() => User, {
  localKey: 'createdBy',      // Custom local key
  foreignKey: 'employeeId'    // Custom foreign key
})
declare creator: BelongsTo<typeof User>
```

### Circular References

The decorators handle circular references gracefully:

```typescript
// User references Profile
class User extends BaseModel {
  @hasOne(() => Profile)
  declare profile: HasOne<typeof Profile>
}

// Profile references User
class Profile extends BaseModel {
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}

// Both models are registered without infinite loops
```

## 🧪 Testing

The new decorators are thoroughly tested:

```bash
# Run tests for Lucid-style decorators
npm test tests/unit/lucid_style_decorators.spec.ts

# Run all tests
npm test
```

## 🔮 Future Enhancements

Planned improvements for the relationship system:

1. **Eager Loading**: `User.query().with('profile').all()`
2. **Relationship Constraints**: `User.query().whereHas('posts', query => query.where('status', 'published'))`
3. **Nested Relationships**: `User.query().with('posts.comments').all()`
4. **Relationship Aggregates**: `User.query().withCount('posts').all()`

## 📚 Related Documentation

- [Nested Documents Guide](./NESTED_DOCUMENTS.md)
- [Reference Proxy System](./REFERENCE_PROXY_SYSTEM.md)

- [Relationship Types](./src/types/relationships.ts)

## 🎯 Conclusion

The new Lucid-style decorators provide a significant improvement to the developer experience by:

- **Eliminating manual setup** - No more manual reference configuration
- **Providing familiar patterns** - Same decorators as Lucid ORM
- **Ensuring type safety** - Full TypeScript support with proper types
- **Reducing boilerplate** - Cleaner, more maintainable code

The MongoDB ODM now feels truly native to the AdonisJS ecosystem! 🚀
