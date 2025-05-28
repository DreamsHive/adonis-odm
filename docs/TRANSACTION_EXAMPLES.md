# MongoDB ODM Transaction Examples

This document demonstrates the transaction functionality implemented for the MongoDB ODM package, following AdonisJS Lucid patterns.

## Overview

The transaction system provides both **managed** and **manual** transaction support with seamless integration across:

- Database Manager (`MongoDatabaseManager`)
- Query Builder (`ModelQueryBuilder`)
- Base Models (`BaseModel`)
- Transaction Client (`MongoTransactionClient`)

## Prerequisites

- MongoDB replica set (required for transactions)
- Node.js with TypeScript support
- MongoDB driver v4.0+

## API Reference

### Managed Transactions

Managed transactions automatically handle commit/rollback operations:

```typescript
// Basic managed transaction
const result = await db.transaction(async (trx) => {
  // All operations within this callback use the same transaction
  const user = await User.create(
    {
      email: 'user@example.com',
      name: 'John Doe',
    },
    { client: trx }
  )

  const profile = await Profile.create(
    {
      userId: user._id,
      bio: 'User profile',
    },
    { client: trx }
  )

  return { user, profile }
})

// With custom transaction options
await db.transaction(
  async (trx) => {
    // Transaction operations
  },
  {
    readConcern: { level: 'majority' },
    writeConcern: { w: 'majority', j: true },
    maxCommitTimeMS: 30000,
  }
)
```

### Manual Transactions

Manual transactions provide explicit control over commit/rollback:

```typescript
// Manual transaction with explicit commit
const trx = await db.transaction()

try {
  const user = await User.create(
    {
      email: 'manual@example.com',
      name: 'Manual User',
    },
    { client: trx }
  )

  await User.query({ client: trx }).where('_id', user._id).update({ status: 'active' })

  await trx.commit()
  console.log('Transaction committed successfully')
} catch (error) {
  await trx.rollback()
  console.error('Transaction rolled back:', error)
}
```

## Model Integration

### Static Model Methods

All static model methods support transaction clients:

```typescript
// Create with transaction
const user = await User.create(
  {
    email: 'test@example.com',
    name: 'Test User',
  },
  { client: trx }
)

// Find with transaction
const user = await User.find(userId, { client: trx })
const user = await User.findOrFail(userId, { client: trx })

// Query with transaction
const users = await User.query({ client: trx }).where('status', 'active').fetch()
```

### Model Instance Methods

Model instances can be associated with transactions:

```typescript
await db.transaction(async (trx) => {
  // Create new instance
  const user = new User()
  user.email = 'instance@example.com'
  user.name = 'Instance User'
  user.useTransaction(trx)

  await user.save()

  // Load and modify existing
  const existingUser = await User.find(userId, { client: trx })
  if (existingUser) {
    existingUser.useTransaction(trx)
    existingUser.status = 'updated'
    await existingUser.save()

    // Delete with transaction
    await existingUser.delete()
  }
})
```

## Query Builder Integration

The query builder seamlessly integrates with transactions:

```typescript
await db.transaction(async (trx) => {
  // Basic queries
  const users = await User.query({ client: trx }).where('age', '>', 18).fetch()

  // Complex queries
  const activeUsers = await User.query({ client: trx })
    .where('status', 'active')
    .where('email', 'like', '%@company.com')
    .orderBy('createdAt', 'desc')
    .limit(10)
    .fetch()

  // Updates
  const updateResult = await User.query({ client: trx })
    .where('status', 'pending')
    .update({ status: 'active', updatedAt: new Date() })

  // Deletes
  const deleteResult = await User.query({ client: trx }).where('status', 'inactive').delete()

  // Get IDs only
  const userIds = await User.query({ client: trx }).where('role', 'admin').ids()
})
```

## Relationship Loading

Relationships automatically propagate transaction clients:

```typescript
await db.transaction(async (trx) => {
  // Load user with relationships
  const user = await User.query({ client: trx })
    .where('_id', userId)
    .with('profile')
    .with('posts')
    .first()

  // All related models are also associated with the transaction
  if (user.profile) {
    user.profile.bio = 'Updated bio'
    await user.profile.save() // Uses the same transaction
  }
})
```

## Error Handling

### Automatic Rollback (Managed Transactions)

```typescript
try {
  await db.transaction(async (trx) => {
    const user = await User.create(
      {
        email: 'test@example.com',
      },
      { client: trx }
    )

    // This will cause the entire transaction to rollback
    throw new Error('Something went wrong')
  })
} catch (error) {
  console.log('Transaction automatically rolled back')
  // User was not created in the database
}
```

### Manual Rollback

```typescript
const trx = await db.transaction()

try {
  const user = await User.create(
    {
      email: 'test@example.com',
    },
    { client: trx }
  )

  // Check some condition
  if (someCondition) {
    await trx.rollback()
    return
  }

  await trx.commit()
} catch (error) {
  await trx.rollback()
  throw error
}
```

## Advanced Examples

### Multi-Collection Operations

```typescript
await db.transaction(async (trx) => {
  // Create user
  const user = await User.create(
    {
      email: 'multi@example.com',
      name: 'Multi User',
    },
    { client: trx }
  )

  // Create profile
  const profile = await Profile.create(
    {
      userId: user._id,
      bio: 'User profile',
    },
    { client: trx }
  )

  // Create posts
  const posts = []
  for (let i = 1; i <= 3; i++) {
    const post = await Post.create(
      {
        userId: user._id,
        title: `Post ${i}`,
        content: `Content for post ${i}`,
      },
      { client: trx }
    )
    posts.push(post)
  }

  // Update user with counts
  await User.query({ client: trx }).where('_id', user._id).update({
    profileId: profile._id,
    postCount: posts.length,
  })

  return { user, profile, posts }
})
```

### Conditional Operations

```typescript
await db.transaction(async (trx) => {
  const user = await User.find(userId, { client: trx })

  if (!user) {
    throw new Error('User not found')
  }

  // Update user
  user.lastLoginAt = new Date()
  await user.save()

  // Create login log
  await LoginLog.create(
    {
      userId: user._id,
      ipAddress: request.ip(),
      userAgent: request.header('user-agent'),
    },
    { client: trx }
  )

  // Update login count
  await User.query({ client: trx }).where('_id', user._id).increment('loginCount', 1)
})
```

### Bulk Operations

```typescript
await db.transaction(async (trx) => {
  // Bulk create users
  const userData = [
    { email: 'user1@example.com', name: 'User 1' },
    { email: 'user2@example.com', name: 'User 2' },
    { email: 'user3@example.com', name: 'User 3' },
  ]

  const users = []
  for (const data of userData) {
    const user = await User.create(data, { client: trx })
    users.push(user)
  }

  // Bulk update
  await User.query({ client: trx })
    .whereIn(
      '_id',
      users.map((u) => u._id)
    )
    .update({ status: 'bulk_created' })

  // Bulk delete old users
  await User.query({ client: trx })
    .where('createdAt', '<', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
    .delete()
})
```

## Testing Transactions

### Setup Test Database

```typescript
import { MongoClient } from 'mongodb'
import { MongoDatabaseManager } from './src/database_manager'

async function setupTestDatabase() {
  const client = new MongoClient('mongodb://localhost:27017/?replicaSet=rs0')
  await client.connect()

  const db = new MongoDatabaseManager(client, 'test_database')

  // Clear test collections
  await db.collection('users').deleteMany({})
  await db.collection('profiles').deleteMany({})
  await db.collection('posts').deleteMany({})

  return { db, client }
}
```

### Test Managed Transactions

```typescript
async function testManagedTransaction() {
  const { db, client } = await setupTestDatabase()

  const result = await db.transaction(async (trx) => {
    const user = await User.create(
      {
        email: 'test@example.com',
        name: 'Test User',
      },
      { client: trx }
    )

    const profile = await Profile.create(
      {
        userId: user._id,
        bio: 'Test profile',
      },
      { client: trx }
    )

    return { user, profile }
  })

  // Verify data was committed
  const savedUser = await User.find(result.user._id)
  const savedProfile = await Profile.find(result.profile._id)

  console.assert(savedUser !== null, 'User should be saved')
  console.assert(savedProfile !== null, 'Profile should be saved')

  await client.close()
}
```

### Test Rollback

```typescript
async function testRollback() {
  const { db, client } = await setupTestDatabase()

  const userCountBefore = await User.query().count()

  try {
    await db.transaction(async (trx) => {
      await User.create(
        {
          email: 'rollback@example.com',
          name: 'Rollback User',
        },
        { client: trx }
      )

      // Force rollback
      throw new Error('Test rollback')
    })
  } catch (error) {
    // Expected error
  }

  const userCountAfter = await User.query().count()

  console.assert(
    userCountBefore === userCountAfter,
    'User count should be unchanged after rollback'
  )

  await client.close()
}
```

## Performance Considerations

### Transaction Scope

Keep transactions as short as possible:

```typescript
// ❌ Bad: Long-running transaction
await db.transaction(async (trx) => {
  const users = await User.query({ client: trx }).fetch()

  for (const user of users) {
    // Expensive operation
    await processUserData(user)
    await user.save()
  }
})

// ✅ Good: Minimal transaction scope
const users = await User.query().fetch()

for (const user of users) {
  await processUserData(user)

  await db.transaction(async (trx) => {
    user.useTransaction(trx)
    await user.save()
  })
}
```

### Batch Operations

Use batch operations when possible:

```typescript
// ✅ Efficient batch operations
await db.transaction(async (trx) => {
  const updates = [
    { _id: id1, status: 'active' },
    { _id: id2, status: 'inactive' },
    { _id: id3, status: 'pending' },
  ]

  for (const update of updates) {
    await User.query({ client: trx }).where('_id', update._id).update({ status: update.status })
  }
})
```

## Troubleshooting

### Common Issues

1. **"Transaction numbers are only allowed on a replica set member or mongos"**

   - Ensure MongoDB is running as a replica set
   - Use connection string with `?replicaSet=rs0`

2. **"Cannot start transaction on session with existing transaction"**

   - Ensure previous transactions are properly committed or rolled back
   - Don't nest transactions

3. **"Transaction has been aborted"**
   - Handle transaction conflicts with retry logic
   - Keep transactions short to reduce conflicts

### Debug Logging

Enable debug logging to trace transaction operations:

```typescript
// Add debug logging to transaction operations
await db.transaction(async (trx) => {
  console.log('🎯 Transaction started')

  const user = await User.create(userData, { client: trx })
  console.log('✅ User created:', user._id)

  const profile = await Profile.create(profileData, { client: trx })
  console.log('✅ Profile created:', profile._id)

  console.log('🎉 Transaction completing')
  return { user, profile }
})
```

## Migration from Non-Transactional Code

### Before (Without Transactions)

```typescript
// Risky: No atomicity
const user = await User.create({
  email: 'user@example.com',
  name: 'User Name',
})

const profile = await Profile.create({
  userId: user._id,
  bio: 'User bio',
})

// If this fails, user exists but profile doesn't
await User.query().where('_id', user._id).update({ profileId: profile._id })
```

### After (With Transactions)

```typescript
// Safe: Atomic operations
const result = await db.transaction(async (trx) => {
  const user = await User.create(
    {
      email: 'user@example.com',
      name: 'User Name',
    },
    { client: trx }
  )

  const profile = await Profile.create(
    {
      userId: user._id,
      bio: 'User bio',
    },
    { client: trx }
  )

  await User.query({ client: trx }).where('_id', user._id).update({ profileId: profile._id })

  return { user, profile }
})
```

This transaction system provides robust, AdonisJS Lucid-compatible transaction support for MongoDB operations with automatic session management, error handling, and seamless integration across the entire ODM.
