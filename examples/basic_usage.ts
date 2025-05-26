/**
 * BASIC USAGE EXAMPLE
 *
 * This example demonstrates the basic usage of the MongoDB ODM
 * using real models from the application.
 */

import UserWithReferencedProfile from '../app/models/user_with_referenced_profile.js'
import Profile from '../app/models/profile.js'
import Post from '../app/models/post.js'

async function basicUsageExample() {
  console.log('🚀 MongoDB ODM Basic Usage Example')
  console.log('==================================\n')

  try {
    // 1. CREATE OPERATIONS
    console.log('1. Create Operations')
    console.log('-------------------')

    // Create a user
    const user = await UserWithReferencedProfile.create({
      name: 'John Doe',
      email: 'john.doe@example.com',
      age: 30,
    })

    console.log(`✅ Created user: ${user.name} (ID: ${user._id})`)

    // Create a profile for the user
    const profile = await Profile.create({
      firstName: 'John',
      lastName: 'Doe',
      bio: 'Software developer passionate about MongoDB and AdonisJS',
      phoneNumber: '+1-555-0123',
      userId: user._id,
      address: {
        street: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94105',
        country: 'USA',
      },
      socialLinks: {
        twitter: 'https://twitter.com/johndoe',
        linkedin: 'https://linkedin.com/in/johndoe',
        github: 'https://github.com/johndoe',
      },
    })

    console.log(`✅ Created profile: ${profile.fullName} (ID: ${profile._id})`)

    // Create some posts
    const post1 = await Post.create({
      title: 'Getting Started with MongoDB ODM',
      content: 'This is a comprehensive guide to using MongoDB with AdonisJS...',
      status: 'published',
      tags: ['mongodb', 'adonisjs', 'tutorial'],
      authorId: user._id,
    })

    const post2 = await Post.create({
      title: 'Advanced Query Techniques',
      content: 'Learn how to write complex queries using the MongoDB ODM...',
      status: 'draft',
      tags: ['mongodb', 'queries', 'advanced'],
      authorId: user._id,
    })

    console.log(`✅ Created posts: "${post1.title}" and "${post2.title}"`)

    // 2. READ OPERATIONS
    console.log('\n2. Read Operations')
    console.log('-----------------')

    // Find user by ID
    const foundUser = await UserWithReferencedProfile.find(user._id)
    console.log(`✅ Found user by ID: ${foundUser?.name}`)

    // Find user by email
    const userByEmail = await UserWithReferencedProfile.findBy('email', 'john.doe@example.com')
    console.log(`✅ Found user by email: ${userByEmail?.name}`)

    // Query with conditions
    const publishedPosts = await Post.query().where('status', 'published').all()
    console.log(`✅ Found ${publishedPosts.length} published posts`)

    // Query with multiple conditions
    const userPosts = await Post.query()
      .where('authorId', user._id)
      .where('status', 'published')
      .orderBy('createdAt', 'desc')
      .all()

    console.log(`✅ Found ${userPosts.length} published posts by user`)

    // 3. RELATIONSHIP LOADING
    console.log('\n3. Relationship Loading')
    console.log('-----------------------')

    // Load user with profile
    const userWithProfile = await UserWithReferencedProfile.query()
      .where('_id', user._id)
      .load('profile')
      .first()

    if (userWithProfile?.profile) {
      console.log(`✅ Loaded user with profile: ${userWithProfile.profile.fullName}`)
      console.log(`   Bio: ${userWithProfile.profile.bio}`)
      console.log(`   Address: ${userWithProfile.profile.formattedAddress}`)
    }

    // Load posts with author and profile
    const postsWithAuthors = await Post.query()
      .load('author', (authorQuery) => {
        authorQuery.load('profile')
      })
      .all()

    console.log(`✅ Loaded ${postsWithAuthors.length} posts with authors and profiles`)

    postsWithAuthors.forEach((post, index) => {
      console.log(`   ${index + 1}. ${post.title} by ${post.author?.name}`)
      if (post.author?.profile) {
        console.log(`      Author: ${post.author.profile.fullName}`)
      }
    })

    // 4. UPDATE OPERATIONS
    console.log('\n4. Update Operations')
    console.log('-------------------')

    // Update user directly
    user.age = 31
    await user.save()
    console.log(`✅ Updated user age to: ${user.age}`)

    // Update using merge
    await user.merge({ name: 'John Smith' }).save()
    console.log(`✅ Updated user name to: ${user.name}`)

    // Update profile
    if (profile) {
      profile.bio = 'Senior software developer with expertise in MongoDB and AdonisJS'
      await profile.save()
      console.log(`✅ Updated profile bio`)
    }

    // Bulk update
    const updatedCount = await Post.query()
      .where('authorId', user._id)
      .where('status', 'draft')
      .update({ status: 'published' })

    console.log(`✅ Published ${updatedCount} draft posts`)

    // 5. ADVANCED QUERIES
    console.log('\n5. Advanced Queries')
    console.log('------------------')

    // Pagination
    const paginatedUsers = await UserWithReferencedProfile.query().load('profile').paginate(1, 5)

    console.log(`✅ Paginated users: ${paginatedUsers.data.length} users on page 1`)
    console.log(`   Total: ${paginatedUsers.meta.total}, Pages: ${paginatedUsers.meta.lastPage}`)

    // Count queries
    const totalPosts = await Post.query().count()
    const publishedCount = await Post.query().where('status', 'published').count()

    console.log(`✅ Total posts: ${totalPosts}, Published: ${publishedCount}`)

    // Complex queries
    const recentPosts = await Post.query()
      .where('status', 'published')
      .where('createdAt', '>=', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) // Last 30 days
      .orderBy('createdAt', 'desc')
      .limit(10)
      .all()

    console.log(`✅ Found ${recentPosts.length} recent published posts`)

    // 6. AGGREGATION
    console.log('\n6. Aggregation')
    console.log('-------------')

    // Get all user IDs
    const userIds = await UserWithReferencedProfile.query().ids()
    console.log(`✅ Found ${userIds.length} user IDs`)

    // Get posts by status
    const draftPosts = await Post.query().where('status', 'draft').all()
    const archivedPosts = await Post.query().where('status', 'archived').all()

    console.log(
      `✅ Posts by status: ${publishedCount} published, ${draftPosts.length} draft, ${archivedPosts.length} archived`
    )

    // 7. DELETE OPERATIONS
    console.log('\n7. Delete Operations')
    console.log('-------------------')

    // Delete a specific post
    const postToDelete = await Post.query().where('status', 'draft').first()
    if (postToDelete) {
      await postToDelete.delete()
      console.log(`✅ Deleted post: "${postToDelete.title}"`)
    }

    // Bulk delete
    const deletedCount = await Post.query().where('status', 'archived').delete()

    console.log(`✅ Deleted ${deletedCount} archived posts`)

    console.log('\n🎉 Basic Usage Example Complete!')
    console.log('================================')
    console.log('✅ Created users, profiles, and posts')
    console.log('✅ Performed various read operations')
    console.log('✅ Loaded relationships efficiently')
    console.log('✅ Updated records using different methods')
    console.log('✅ Executed advanced queries and aggregations')
    console.log('✅ Cleaned up with delete operations')
  } catch (error) {
    console.error('❌ Error in basic usage example:', error)
  }
}

// Export for use in other examples
export { basicUsageExample }

// Run the example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  basicUsageExample().catch(console.error)
}
