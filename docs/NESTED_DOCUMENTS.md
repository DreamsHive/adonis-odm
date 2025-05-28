# Nested Documents in AdonisJS MongoDB ODM

This guide explains how to handle nested documents (like `user` with `profile`) in your AdonisJS MongoDB ODM application. There are two main approaches: **Embedded Documents** and **Referenced Documents**.

## Table of Contents

- [Overview](#overview)
- [Embedded Documents](#embedded-documents)
- [Referenced Documents](#referenced-documents)
- [Performance Considerations](#performance-considerations)
- [Utility Helpers](#utility-helpers)
- [Best Practices](#best-practices)
- [Examples](#examples)

## Overview

When you have related data like a `user` with a `profile`, you can handle it in two ways:

1. **Embedded Documents**: Store profile data directly within the user document
2. **Referenced Documents**: Store profile as a separate document and reference it

## Embedded Documents

### When to Use

- Profile data is always loaded with user
- Profile data is relatively small (< 16MB MongoDB document limit)
- You need atomic updates
- You frequently query by profile fields

### Model Definition

```typescript
import { BaseModel } from '@adonisjs/mongodb-odm'
import { column } from '@adonisjs/mongodb-odm/decorators'

export default class UserWithEmbeddedProfile extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare name: string

  @column()
  declare email: string

  @column.embedded()
  declare profile?: {
    firstName: string
    lastName: string
    bio?: string
    avatar?: string
    phoneNumber?: string
    address?: {
      street: string
      city: string
      state: string
      zipCode: string
      country: string
    }
    socialLinks?: {
      twitter?: string
      linkedin?: string
      github?: string
      website?: string
    }
  }

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Helper methods
  get fullName(): string | null {
    if (!this.profile) return null
    return `${this.profile.firstName} ${this.profile.lastName}`.trim()
  }

  updateProfile(profileData: Partial<NonNullable<typeof this.profile>>): void {
    if (!this.profile) {
      this.profile = {} as NonNullable<typeof this.profile>
    }

    Object.assign(this.profile, profileData)
    this.setAttribute('profile', this.profile)
  }
}
```

### CRUD Operations

```typescript
// Create user with embedded profile
const user = await UserWithEmbeddedProfile.create({
  name: 'John Doe',
  email: 'john@example.com',
  profile: {
    firstName: 'John',
    lastName: 'Doe',
    bio: 'Software developer',
    address: {
      street: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94105',
      country: 'USA',
    },
  },
})

// Update embedded profile
user.updateProfile({
  bio: 'Senior Software Developer',
  phoneNumber: '+1-555-0123',
})
await user.save()

// Query by embedded fields
const usersInCA = await UserWithEmbeddedProfile.query().where('profile.address.state', 'CA').all()

const developers = await UserWithEmbeddedProfile.query()
  .where('profile.bio', 'like', '%developer%')
  .all()
```

## Referenced Documents

### When to Use

- Profile data is large or complex
- Profile data is optional/loaded on-demand
- You need to query profiles independently
- Multiple entities might reference the same profile
- You want to avoid document size limits

### Model Definitions

```typescript
// Profile model (separate collection)
export default class Profile extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare firstName: string

  @column()
  declare lastName: string

  @column()
  declare bio?: string

  @column()
  declare avatar?: string

  @column()
  declare phoneNumber?: string

  @column()
  declare address?: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }

  @column()
  declare socialLinks?: {
    twitter?: string
    linkedin?: string
    github?: string
    website?: string
  }

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim()
  }
}

// User model with profile reference
export default class UserWithReferencedProfile extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare name: string

  @column()
  declare email: string

  @column()
  declare profileId?: ObjectId | string

  // Virtual property for loaded profile
  declare profile?: Profile

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Profile management methods
  async loadProfile(): Promise<Profile | null> {
    if (!this.profileId) return null

    const profile = await Profile.find(this.profileId)
    this.profile = profile || undefined
    return profile
  }

  async createProfile(profileData: Partial<Profile>): Promise<Profile> {
    const profile = await Profile.create(profileData)
    this.profileId = profile._id
    await this.save()
    this.profile = profile
    return profile
  }

  async updateProfile(profileData: Partial<Profile>): Promise<Profile | null> {
    if (!this.profileId) return null

    const profile = await Profile.find(this.profileId)
    if (!profile) return null

    profile.merge(profileData)
    await profile.save()
    this.profile = profile
    return profile
  }

  async deleteProfile(): Promise<boolean> {
    if (!this.profileId) return false

    const profile = await Profile.find(this.profileId)
    if (!profile) return false

    const deleted = await profile.delete()
    if (deleted) {
      this.profileId = undefined
      await this.save()
      this.profile = undefined
    }

    return deleted
  }

  get fullName(): string | null {
    return this.profile?.fullName || null
  }
}
```

### CRUD Operations

```typescript
// Create user and profile separately
const user = await UserWithReferencedProfile.create({
  name: 'Jane Smith',
  email: 'jane@example.com',
})

const profile = await user.createProfile({
  firstName: 'Jane',
  lastName: 'Smith',
  bio: 'UX Designer',
  phoneNumber: '+1-555-0456',
})

// Load profile when needed
await user.loadProfile()
console.log(user.fullName) // "Jane Smith"

// Update profile
await user.updateProfile({
  bio: 'Senior UX Designer',
  socialLinks: {
    twitter: '@janesmith',
  },
})

// Query with references (requires separate queries)
const techProfiles = await Profile.query().where('bio', 'like', '%engineer%').all()

const techProfileIds = techProfiles.map((p) => p._id)

const techUsers = await UserWithReferencedProfile.query()
  .where('profileId', 'in', techProfileIds)
  .all()
```

## Performance Considerations

### N+1 Query Problem

When loading many users with profiles, avoid the N+1 query problem:

```typescript
// ❌ Bad: N+1 queries (1 for users + N for profiles)
const users = await UserWithReferencedProfile.query().limit(100).all()
for (const user of users) {
  await user.loadProfile() // Separate query for each user
}

// ✅ Good: Use bulk loading (2 queries total)
const users = await UserWithReferencedProfile.query().limit(100).all()
await NestedDocumentHelpers.bulkLoadReferences(users, 'profileId', Profile, 'profile')
```

### Pagination with References

```typescript
// Efficient pagination that only loads profiles for current page
const paginatedResult = await NestedDocumentHelpers.paginateWithReferences(
  UserWithReferencedProfile,
  1, // page
  20, // perPage
  'profileId',
  Profile,
  'profile'
)
```

## Utility Helpers

The `NestedDocumentHelpers` class provides utilities for efficient operations:

### Bulk Loading References

```typescript
import { NestedDocumentHelpers } from '@adonisjs/mongodb-odm/helpers'

// Load profiles for multiple users in a single query
await NestedDocumentHelpers.bulkLoadReferences(users, 'profileId', Profile, 'profile')
```

### Creating with Nested Data

```typescript
// Embedded approach
const userEmbedded = await NestedDocumentHelpers.createWithNested(
  UserWithEmbeddedProfile,
  {
    name: 'John Doe',
    email: 'john@example.com',
    profile: {
      firstName: 'John',
      lastName: 'Doe',
      bio: 'Developer',
    },
  },
  {
    field: 'profile',
    isEmbedded: true,
  }
)

// Referenced approach
const userReferenced = await NestedDocumentHelpers.createWithNested(
  UserWithReferencedProfile,
  {
    name: 'Jane Smith',
    email: 'jane@example.com',
    profile: {
      firstName: 'Jane',
      lastName: 'Smith',
      bio: 'Designer',
    },
  },
  {
    field: 'profile',
    isEmbedded: false,
    NestedModel: Profile,
    referenceField: 'profileId',
  }
)
```

### Updating with Nested Data

```typescript
// Update both user and profile data together
await NestedDocumentHelpers.updateWithNested(
  user,
  {
    age: 30,
    profile: {
      bio: 'Updated bio',
      phoneNumber: '+1-555-9999',
    },
  },
  {
    field: 'profile',
    isEmbedded: false,
    NestedModel: Profile,
    referenceField: 'profileId',
  }
)
```

### Querying with Nested Conditions

```typescript
// Find users based on profile criteria
const engineers = await NestedDocumentHelpers.queryWithNestedConditions(
  UserWithReferencedProfile,
  [
    {
      field: 'bio',
      operator: 'like',
      value: '%Engineer%',
      isEmbedded: false,
      NestedModel: Profile,
      referenceField: 'profileId',
    },
  ],
  [
    {
      field: 'age',
      operator: '>=',
      value: 25,
    },
  ],
  {
    page: 1,
    perPage: 10,
    orderBy: { field: 'name', direction: 'asc' },
  }
)
```

## Best Practices

### Choose the Right Approach

| Use Embedded When                       | Use Referenced When                             |
| --------------------------------------- | ----------------------------------------------- |
| Data is always loaded together          | Data is loaded on-demand                        |
| Data is relatively small                | Data is large or complex                        |
| You need atomic updates                 | You need independent updates                    |
| You frequently query by nested fields   | You need to query nested data independently     |
| Relationship is 1:1 and tightly coupled | Relationship might be 1:many or loosely coupled |

### Performance Tips

1. **Use bulk loading** to avoid N+1 queries
2. **Paginate efficiently** - only load what you need
3. **Index frequently queried nested fields**
4. **Use projection** to load only required fields
5. **Consider document size limits** (16MB in MongoDB)

### Data Modeling Guidelines

1. **Embedded documents** are great for:

   - User profiles
   - Product specifications
   - Order line items
   - Configuration settings

2. **Referenced documents** are better for:
   - User posts/articles
   - Product reviews
   - Order history
   - Large media files

### Error Handling

```typescript
// Always handle missing references gracefully
async loadUserWithProfile(userId: string) {
  const user = await UserWithReferencedProfile.find(userId)
  if (!user) {
    throw new Error('User not found')
  }

  const profile = await user.loadProfile()
  if (!profile) {
    // Handle missing profile gracefully
    console.warn(`User ${userId} has no profile`)
  }

  return { user, profile }
}
```

## Examples

See the `examples/` directory for complete working examples:

- `examples/nested_documents_usage.ts` - Comprehensive examples of both approaches
- `examples/efficient_nested_operations.ts` - Performance optimization examples

## Testing

The nested document functionality is thoroughly tested:

- `tests/unit/nested_document_decorators.spec.ts` - Tests for decorators
- `tests/unit/nested_document_helpers.spec.ts` - Tests for utility helpers

Run tests with:

```bash
npm test
```

## Migration from Other ORMs

If you're migrating from other ORMs:

### From Mongoose

- Embedded documents work similarly to Mongoose subdocuments
- Referenced documents replace Mongoose `populate()`
- Use `NestedDocumentHelpers.bulkLoadReferences()` instead of `populate()`

### From Lucid (SQL)

- Embedded documents replace some `hasOne` relationships
- Referenced documents are similar to `belongsTo` relationships
- Use bulk loading instead of `preload()`

## Conclusion

Nested documents in MongoDB provide flexible ways to model related data. Choose embedded documents for tightly coupled, small data that's always loaded together. Choose referenced documents for larger, optional, or independently queryable data. Use the provided utility helpers to maintain good performance as your application scales.
