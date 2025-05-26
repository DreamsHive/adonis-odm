# Type-Safe Load Callbacks

## Overview

The MongoDB ODM provides type-safe relationship loading similar to AdonisJS Lucid's `.preload()` method. While we achieve seamless direct property access like Lucid, the load callback typing requires a specific approach due to TypeScript limitations with runtime relationship metadata.

## The Challenge

TypeScript cannot infer the related model type from runtime relationship metadata stored by decorators. This means the callback parameter in `.load()` is typed as `ModelQueryBuilder<any>` rather than the specific related model type.

## Solution: Type Assertions

To achieve better type safety and IntelliSense, use type assertions in your load callbacks:

### ✅ Recommended Pattern

```typescript
import type { ModelQueryBuilder } from '../src/query_builder/model_query_builder.js'

// Type assertion for better IntelliSense and type safety
const users = await User.query()
  .load('profile', (profileQuery: ModelQueryBuilder<Profile>) => {
    profileQuery.where('isActive', true)
    profileQuery.whereNotNull('bio')
  })
  .all()
```

### ❌ Without Type Assertion

```typescript
// Works but no type safety for the callback
const users = await User.query()
  .load('profile', (profileQuery) => {
    // profileQuery is typed as ModelQueryBuilder<any>
    // No IntelliSense for Profile-specific methods
    profileQuery.where('isActive', true)
  })
  .all()
```

## Complete Examples

### HasOne Relationship

```typescript
// Load user profiles with type-safe callback
const users = await User.query()
  .load('profile', (profileQuery: ModelQueryBuilder<Profile>) => {
    profileQuery.where('isActive', true)
    profileQuery.whereNotNull('bio')
    profileQuery.where('country', 'US')
  })
  .all()

// Access loaded data directly like Lucid
users.forEach((user) => {
  console.log(user.profile.fullName) // Direct access!
  console.log(user.profile.bio) // Direct access!
})
```

### HasMany Relationship

```typescript
// Load user posts with type-safe callback
const users = await User.query()
  .load('posts', (postsQuery: ModelQueryBuilder<Post>) => {
    postsQuery.where('status', 'published')
    postsQuery.orderBy('createdAt', 'desc')
    postsQuery.limit(10)
  })
  .all()

// Access loaded data directly like Lucid
users.forEach((user) => {
  console.log(user.posts.length) // Direct access!
  console.log(user.posts[0].title) // Direct array access!
})
```

### BelongsTo Relationship

```typescript
// Load post authors with type-safe callback
const posts = await Post.query()
  .load('author', (authorQuery: ModelQueryBuilder<User>) => {
    authorQuery.where('isActive', true)
    authorQuery.whereNotNull('email')
  })
  .all()

// Access loaded data directly like Lucid
posts.forEach((post) => {
  console.log(post.author.name) // Direct access!
  console.log(post.author.email) // Direct access!
})
```

### Multiple Relationships

```typescript
// Load multiple relationships with type-safe callbacks
const users = await User.query()
  .load('profile', (profileQuery: ModelQueryBuilder<Profile>) => {
    profileQuery.where('isActive', true)
  })
  .load('posts', (postsQuery: ModelQueryBuilder<Post>) => {
    postsQuery.where('status', 'published')
    postsQuery.orderBy('createdAt', 'desc')
  })
  .all()
```

### Nested Loading

```typescript
// Load posts with their comments and comment authors
const posts = await Post.query()
  .load('comments', (commentsQuery: ModelQueryBuilder<Comment>) => {
    commentsQuery.where('isApproved', true)
    // Note: Nested loading would require additional implementation
  })
  .all()
```

## Benefits of This Approach

### ✅ Type Safety

- Full IntelliSense support for the related model
- Compile-time error checking for method calls
- Proper type checking for query conditions

### ✅ Familiar API

- Same syntax as AdonisJS Lucid's `.preload()`
- Seamless direct property access after loading
- Consistent with AdonisJS patterns

### ✅ Performance

- Bulk loading prevents N+1 query problems
- Efficient database queries
- Optimized for production use

## Advanced Usage

### Custom Query Builder Methods

If you have custom methods on your query builders, they'll be properly typed:

```typescript
// Assuming you have a custom method on PostQueryBuilder
const users = await User.query()
  .load('posts', (postsQuery: ModelQueryBuilder<Post>) => {
    postsQuery.where('status', 'published')
    // Custom methods would be available with proper typing
  })
  .all()
```

### Conditional Loading

```typescript
// Conditional relationship loading
const includeProfile = true
const query = User.query()

if (includeProfile) {
  query.load('profile', (profileQuery: ModelQueryBuilder<Profile>) => {
    profileQuery.where('isActive', true)
  })
}

const users = await query.all()
```

### Complex Constraints

```typescript
// Complex query constraints with proper typing
const users = await User.query()
  .load('posts', (postsQuery: ModelQueryBuilder<Post>) => {
    postsQuery
      .where('status', 'published')
      .where('createdAt', '>', new Date('2023-01-01'))
      .whereNotNull('featuredImage')
      .orderBy('viewCount', 'desc')
      .limit(5)
  })
  .all()
```

## Migration from Other ORMs

### From Lucid ORM

```typescript
// Lucid ORM
const users = await User.query().preload('profile', (profileQuery) => {
  profileQuery.where('isActive', true)
})

// MongoDB ODM (same API with type assertion)
const users = await User.query().load('profile', (profileQuery: ModelQueryBuilder<Profile>) => {
  profileQuery.where('isActive', true)
})
```

### From Mongoose

```typescript
// Mongoose
const users = await User.find().populate({
  path: 'profile',
  match: { isActive: true },
})

// MongoDB ODM
const users = await User.query()
  .load('profile', (profileQuery: ModelQueryBuilder<Profile>) => {
    profileQuery.where('isActive', true)
  })
  .all()
```

## Best Practices

### 1. Always Use Type Assertions

```typescript
// ✅ Good
.load('profile', (profileQuery: ModelQueryBuilder<Profile>) => {
  profileQuery.where('isActive', true)
})

// ❌ Avoid
.load('profile', (profileQuery) => {
  profileQuery.where('isActive', true)
})
```

### 2. Import Types at the Top

```typescript
import type { ModelQueryBuilder } from '../src/query_builder/model_query_builder.js'
import type { Profile, Post, User } from './models/index.js'
```

### 3. Use Descriptive Variable Names

```typescript
// ✅ Clear and descriptive
.load('posts', (postsQuery: ModelQueryBuilder<Post>) => {
  postsQuery.where('status', 'published')
})

// ❌ Generic and unclear
.load('posts', (q: ModelQueryBuilder<Post>) => {
  q.where('status', 'published')
})
```

### 4. Chain Methods for Readability

```typescript
// ✅ Readable chaining
.load('posts', (postsQuery: ModelQueryBuilder<Post>) => {
  postsQuery
    .where('status', 'published')
    .where('createdAt', '>', lastWeek)
    .orderBy('createdAt', 'desc')
    .limit(10)
})
```

## Conclusion

While TypeScript limitations prevent perfect compile-time type inference for load callbacks, the type assertion approach provides excellent type safety and developer experience. This pattern is:

- ✅ **Type-safe** - Full IntelliSense and error checking
- ✅ **Familiar** - Same API as AdonisJS Lucid
- ✅ **Performant** - Bulk loading prevents N+1 queries
- ✅ **Maintainable** - Clear and explicit typing

The MongoDB ODM successfully provides a Lucid-like experience while maintaining the benefits of MongoDB's document-based architecture.
