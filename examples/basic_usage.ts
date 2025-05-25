import User from '../app/models/user.js'

/**
 * Basic MongoDB ODM Usage Example
 *
 * This example demonstrates how to use the MongoDB ODM with AdonisJS v6.
 * Make sure to configure your MongoDB connection in config/mongodb.ts
 * and set the appropriate environment variables.
 */

async function basicUsageExample() {
  try {
    console.log('🚀 MongoDB ODM Basic Usage Example')
    console.log('=====================================')

    // Create a new user
    console.log('\n📝 Creating a new user...')
    const user = await User.create({
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
    })
    console.log('✅ User created:', user.toDocument())

    // Find the user by ID
    console.log('\n🔍 Finding user by ID...')
    const foundUser = await User.find(user._id!)
    console.log('✅ User found:', foundUser?.toDocument())

    // Find user by email
    console.log('\n🔍 Finding user by email...')
    const userByEmail = await User.findBy('email', 'john@example.com')
    console.log('✅ User found by email:', userByEmail?.toDocument())

    // Update the user
    console.log('\n✏️ Updating user...')
    if (foundUser) {
      foundUser.merge({ age: 31 })
      await foundUser.save()
      console.log('✅ User updated:', foundUser.toDocument())
    }

    // Query with conditions
    console.log('\n🔍 Querying users with conditions...')
    const adults = await User.query().where('age', '>=', 18).orderBy('name', 'asc').all()
    console.log('✅ Adult users found:', adults.length)

    // Pagination example
    console.log('\n📄 Pagination example...')
    const paginatedUsers = await User.query().orderBy('createdAt', 'desc').paginate(1, 10)
    console.log('✅ Paginated users:', {
      total: paginatedUsers.meta.total,
      currentPage: paginatedUsers.meta.currentPage,
      perPage: paginatedUsers.meta.perPage,
      users: paginatedUsers.data.length,
    })

    // Create multiple users
    console.log('\n📝 Creating multiple users...')
    const users = await User.createMany([
      { name: 'Jane Smith', email: 'jane@example.com', age: 25 },
      { name: 'Bob Johnson', email: 'bob@example.com', age: 35 },
      { name: 'Alice Brown', email: 'alice@example.com', age: 28 },
    ])
    console.log('✅ Multiple users created:', users.length)

    // Update or create
    console.log('\n🔄 Update or create example...')
    const updatedOrCreated = await User.updateOrCreate(
      { email: 'john@example.com' },
      { name: 'John Doe Updated', age: 32 }
    )
    console.log('✅ User updated or created:', updatedOrCreated.toDocument())

    // Count users
    console.log('\n🔢 Counting users...')
    const userCount = await User.query().count()
    console.log('✅ Total users:', userCount)

    // Delete a user
    console.log('\n🗑️ Deleting a user...')
    if (foundUser) {
      const deleted = await foundUser.delete()
      console.log('✅ User deleted:', deleted)
    }

    console.log('\n🎉 Example completed successfully!')
  } catch (error) {
    console.error('❌ Error in example:', error.message)

    if (error.message.includes('Database connection not configured')) {
      console.log('\n💡 To fix this error:')
      console.log('1. Make sure MongoDB is running')
      console.log('2. Configure your MongoDB connection in config/mongodb.ts')
      console.log('3. Set environment variables (MONGO_HOST, MONGO_PORT, etc.)')
      console.log('4. Register the MongoDB provider in your AdonisJS app')
    }
  }
}

// Export the example function
export { basicUsageExample }

// Run the example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  basicUsageExample()
}
