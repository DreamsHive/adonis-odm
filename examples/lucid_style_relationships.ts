/**
 * LUCID-STYLE RELATIONSHIPS EXAMPLE
 *
 * This example demonstrates how our MongoDB ODM provides Lucid-style
 * relationship handling with type safety and efficient loading.
 *
 * Key Features Demonstrated:
 * - HasOne relationships (User -> Profile)
 * - BelongsTo relationships (Post -> User)
 * - Eager loading with .load()
 * - Nested relationship loading
 * - Type-safe relationship access
 */

import UserWithReferencedProfile from '../app/models/user_with_referenced_profile.js'
import Profile from '../app/models/profile.js'
import Post from '../app/models/post.js'

async function lucidStyleRelationshipsExample() {
  console.log('🔗 Lucid-Style Relationships Example')
  console.log('====================================\n')

  try {
    // 1. CREATE DATA WITH RELATIONSHIPS
    console.log('1. Creating Users, Profiles, and Posts')
    console.log('--------------------------------------')

    // Create users
    const author1 = await UserWithReferencedProfile.create({
      name: 'Alice Johnson',
      email: 'alice@example.com',
      age: 28,
    })

    const author2 = await UserWithReferencedProfile.create({
      name: 'Bob Smith',
      email: 'bob@example.com',
      age: 32,
    })

    console.log(`✅ Created authors: ${author1.name} and ${author2.name}`)

    // Create profiles for users
    const profile1 = await Profile.create({
      firstName: 'Alice',
      lastName: 'Johnson',
      bio: 'Full-stack developer with expertise in Node.js and MongoDB',
      phoneNumber: '+1-555-0101',
      userId: author1._id,
      address: {
        street: '123 Tech Street',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94105',
        country: 'USA',
      },
      socialLinks: {
        twitter: 'https://twitter.com/alicejohnson',
        linkedin: 'https://linkedin.com/in/alicejohnson',
        github: 'https://github.com/alicejohnson',
      },
    })

    const profile2 = await Profile.create({
      firstName: 'Bob',
      lastName: 'Smith',
      bio: 'Backend engineer specializing in database optimization',
      phoneNumber: '+1-555-0102',
      userId: author2._id,
      address: {
        street: '456 Code Avenue',
        city: 'Seattle',
        state: 'WA',
        zipCode: '98101',
        country: 'USA',
      },
      socialLinks: {
        linkedin: 'https://linkedin.com/in/bobsmith',
        github: 'https://github.com/bobsmith',
      },
    })

    console.log(`✅ Created profiles for ${profile1.fullName} and ${profile2.fullName}`)

    // Create posts
    const posts = await Post.createMany([
      {
        title: 'Introduction to MongoDB with AdonisJS',
        content: 'Learn how to integrate MongoDB with AdonisJS for modern web applications...',
        status: 'published',
        tags: ['mongodb', 'adonisjs', 'tutorial'],
        authorId: author1._id,
      },
      {
        title: 'Advanced Query Optimization Techniques',
        content: 'Discover advanced techniques for optimizing MongoDB queries...',
        status: 'published',
        tags: ['mongodb', 'optimization', 'performance'],
        authorId: author2._id,
      },
      {
        title: 'Building Scalable APIs with Node.js',
        content: 'Best practices for building scalable and maintainable APIs...',
        status: 'draft',
        tags: ['nodejs', 'api', 'scalability'],
        authorId: author1._id,
      },
      {
        title: 'Database Design Patterns',
        content: 'Common patterns and anti-patterns in database design...',
        status: 'published',
        tags: ['database', 'design', 'patterns'],
        authorId: author2._id,
      },
    ])

    console.log(`✅ Created ${posts.length} posts`)

    // 2. HASONE RELATIONSHIP LOADING
    console.log('\n2. HasOne Relationship Loading (User -> Profile)')
    console.log('-----------------------------------------------')

    // Load user with profile
    const userWithProfile = await UserWithReferencedProfile.query()
      .where('_id', author1._id)
      .load('profile')
      .first()

    if (userWithProfile?.profile) {
      console.log(`✅ Loaded user: ${userWithProfile.name}`)
      console.log(`   Profile: ${userWithProfile.profile.fullName}`)
      console.log(`   Bio: ${userWithProfile.profile.bio}`)
      console.log(`   Address: ${userWithProfile.profile.formattedAddress}`)
      console.log(
        `   Social Links: ${Object.keys(userWithProfile.profile.socialLinks || {}).join(', ')}`
      )
    }

    // Load multiple users with profiles
    const usersWithProfiles = await UserWithReferencedProfile.query()
      .load('profile')
      .orderBy('name', 'asc')
      .all()

    console.log(`\n✅ Loaded ${usersWithProfiles.length} users with profiles:`)
    usersWithProfiles.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.name} (${user.email})`)
      if (user.profile) {
        console.log(`      Profile: ${user.profile.fullName} - ${user.profile.bio}`)
      }
    })

    // 3. BELONGSTO RELATIONSHIP LOADING
    console.log('\n3. BelongsTo Relationship Loading (Post -> User)')
    console.log('-----------------------------------------------')

    // Load posts with authors
    const postsWithAuthors = await Post.query()
      .where('status', 'published')
      .load('author')
      .orderBy('createdAt', 'desc')
      .all()

    console.log(`✅ Loaded ${postsWithAuthors.length} published posts with authors:`)
    postsWithAuthors.forEach((post, index) => {
      console.log(`   ${index + 1}. "${post.title}"`)
      console.log(`      Author: ${post.author?.name} (${post.author?.email})`)
      console.log(`      Tags: ${post.tags?.join(', ')}`)
      console.log(`      Status: ${post.status}`)
    })

    // 4. NESTED RELATIONSHIP LOADING
    console.log('\n4. Nested Relationship Loading (Post -> User -> Profile)')
    console.log('-------------------------------------------------------')

    // Load posts with authors and their profiles
    const postsWithFullAuthors = await Post.query()
      .load('author', (authorQuery) => {
        authorQuery.load('profile')
      })
      .orderBy('title', 'asc')
      .all()

    console.log(`✅ Loaded ${postsWithFullAuthors.length} posts with full author information:`)
    postsWithFullAuthors.forEach((post, index) => {
      console.log(`   ${index + 1}. "${post.title}" (${post.status})`)
      if (post.author) {
        console.log(`      Author: ${post.author.name}`)
        if (post.author.profile) {
          console.log(`      Full Name: ${post.author.profile.fullName}`)
          console.log(`      Bio: ${post.author.profile.bio}`)
          console.log(
            `      Location: ${post.author.profile.address?.city}, ${post.author.profile.address?.state}`
          )
        }
      }
      console.log('')
    })

    // 5. CONDITIONAL RELATIONSHIP LOADING
    console.log('5. Conditional Relationship Loading')
    console.log('-----------------------------------')

    // Load users with profiles that have specific criteria
    const usersWithDetailedProfiles = await UserWithReferencedProfile.query()
      .load('profile', (profileQuery) => {
        profileQuery.whereNotNull('bio')
        profileQuery.whereNotNull('socialLinks')
      })
      .all()

    console.log(`✅ Loaded ${usersWithDetailedProfiles.length} users with detailed profiles:`)
    usersWithDetailedProfiles.forEach((user, index) => {
      if (user.profile) {
        console.log(`   ${index + 1}. ${user.profile.fullName}`)
        console.log(`      Bio: ${user.profile.bio}`)
        const socialCount = Object.keys(user.profile.socialLinks || {}).length
        console.log(`      Social Links: ${socialCount} platforms`)
      }
    })

    // 6. RELATIONSHIP QUERIES WITH FILTERS
    console.log('\n6. Relationship Queries with Filters')
    console.log('------------------------------------')

    // Find posts by specific authors
    const alicePosts = await Post.query()
      .where('authorId', author1._id)
      .load('author', (authorQuery) => {
        authorQuery.load('profile')
      })
      .orderBy('status', 'desc')
      .all()

    console.log(`✅ Found ${alicePosts.length} posts by ${author1.name}:`)
    alicePosts.forEach((post, index) => {
      console.log(`   ${index + 1}. "${post.title}" (${post.status})`)
      console.log(`      Tags: ${post.tags?.join(', ')}`)
    })

    // Find published posts with author profiles
    const publishedPostsWithProfiles = await Post.query()
      .where('status', 'published')
      .load('author', (authorQuery) => {
        authorQuery.load('profile', (profileQuery) => {
          profileQuery.whereNotNull('socialLinks')
        })
      })
      .all()

    console.log(
      `\n✅ Found ${publishedPostsWithProfiles.length} published posts with social authors:`
    )
    publishedPostsWithProfiles.forEach((post, index) => {
      if (post.author?.profile?.socialLinks) {
        console.log(`   ${index + 1}. "${post.title}"`)
        console.log(`      Author: ${post.author.profile.fullName}`)
        const platforms = Object.keys(post.author.profile.socialLinks)
        console.log(`      Social: ${platforms.join(', ')}`)
      }
    })

    // 7. PERFORMANCE DEMONSTRATION
    console.log('\n7. Performance Demonstration')
    console.log('----------------------------')

    // Efficient bulk loading vs N+1 queries
    console.time('Bulk Loading')
    const efficientPosts = await Post.query()
      .load('author', (authorQuery) => {
        authorQuery.load('profile')
      })
      .all()
    console.timeEnd('Bulk Loading')

    console.log(`✅ Efficiently loaded ${efficientPosts.length} posts with full author data`)
    console.log('   This prevents N+1 query problems by loading all relationships in bulk')

    // 8. RELATIONSHIP STATISTICS
    console.log('\n8. Relationship Statistics')
    console.log('--------------------------')

    const totalUsers = await UserWithReferencedProfile.query().count()
    const allUsersWithProfiles = await UserWithReferencedProfile.query().load('profile').all()
    const profileCount = allUsersWithProfiles.filter((u) => u.profile).length

    const totalPosts = await Post.query().count()
    const publishedPosts = await Post.query().where('status', 'published').count()

    console.log(`✅ Relationship Statistics:`)
    console.log(`   Total Users: ${totalUsers}`)
    console.log(`   Users with Profiles: ${profileCount}/${totalUsers}`)
    console.log(`   Total Posts: ${totalPosts}`)
    console.log(`   Published Posts: ${publishedPosts}/${totalPosts}`)

    console.log('\n🎉 Lucid-Style Relationships Example Complete!')
    console.log('==============================================')
    console.log('✅ Demonstrated HasOne relationships (User -> Profile)')
    console.log('✅ Demonstrated BelongsTo relationships (Post -> User)')
    console.log('✅ Showed efficient eager loading with .load()')
    console.log('✅ Demonstrated nested relationship loading')
    console.log('✅ Showed conditional and filtered relationship loading')
    console.log('✅ Highlighted performance benefits of bulk loading')
  } catch (error) {
    console.error('❌ Error in relationships example:', error)
  }
}

// Export for use in other examples
export { lucidStyleRelationshipsExample }

// Run the example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  lucidStyleRelationshipsExample().catch(console.error)
}
