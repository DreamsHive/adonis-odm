/**
 * SEAMLESS LUCID-STYLE TYPE SAFETY EXAMPLE
 *
 * This example demonstrates how our MongoDB ODM provides seamless type safety
 * for relationship loading, exactly like AdonisJS Lucid, without requiring
 * any type assertions or extra steps from developers.
 *
 * Key Features Demonstrated:
 * - Direct property access: user.profile.firstName
 * - Type-safe load callbacks with IntelliSense
 * - Automatic relationship inference
 * - Bulk loading to prevent N+1 queries
 */

import UserWithReferencedProfile from '../app/models/user_with_referenced_profile.js'
import Post from '../app/models/post.js'

async function demonstrateSeamlessTypeSafety() {
  console.log('🚀 Seamless Lucid-Style Type Safety Demo')
  console.log('=========================================\n')

  try {
    // 1. BASIC RELATIONSHIP LOADING - Like AdonisJS Lucid!
    console.log('1. Basic Relationship Loading')
    console.log('-----------------------------')

    const users = await UserWithReferencedProfile.query().load('profile').all()

    console.log(`✅ Loaded ${users.length} users with relationships`)

    // 2. SEAMLESS DIRECT PROPERTY ACCESS - No .related needed!
    console.log('\n2. Seamless Direct Property Access')
    console.log('----------------------------------')

    users.forEach((user, index) => {
      if (index < 3) {
        // Show first 3 users
        // Direct property access like AdonisJS Lucid!
        console.log(`User: ${user.name} (${user.email})`)

        // Access profile properties directly
        if (user.profile) {
          console.log(`  Profile: ${user.profile.firstName} ${user.profile.lastName}`)
          console.log(`  Bio: ${user.profile.bio || 'No bio'}`)
          console.log(`  Phone: ${user.profile.phoneNumber || 'No phone'}`)

          // Access computed properties
          console.log(`  Full Name: ${user.profile.fullName}`)
          console.log(`  Formatted Address: ${user.profile.formattedAddress || 'No address'}`)
        }
        console.log('')
      }
    })

    // 3. TYPE-SAFE LOAD CALLBACKS - With IntelliSense!
    console.log('3. Type-Safe Load Callbacks')
    console.log('---------------------------')

    const usersWithActiveProfiles = await UserWithReferencedProfile.query()
      .whereNotNull('email')
      .load('profile', (profileQuery) => {
        // Full IntelliSense support in callback!
        profileQuery.whereNotNull('bio')
        profileQuery.whereNotNull('firstName')
        profileQuery.orderBy('firstName', 'asc')
      })
      .all()

    console.log(`✅ Found ${usersWithActiveProfiles.length} users with detailed profiles`)

    // 4. ADVANCED PROPERTY ACCESS
    console.log('\n4. Advanced Property Access')
    console.log('---------------------------')

    usersWithActiveProfiles.forEach((user, index) => {
      if (index < 2) {
        // Show first 2 users
        console.log(`User: ${user.name}`)

        if (user.profile) {
          // Direct property access works seamlessly!
          console.log(`  Full Name: ${user.profile.fullName}`)
          console.log(`  Bio Length: ${user.profile.bio?.length || 0} characters`)

          // Access nested objects
          if (user.profile.address) {
            console.log(`  City: ${user.profile.address.city}`)
            console.log(`  Country: ${user.profile.address.country}`)
          }

          // Access social links
          if (user.profile.socialLinks) {
            const links = Object.entries(user.profile.socialLinks)
              .filter(([_, url]) => url)
              .map(([platform, _]) => platform)
            console.log(`  Social Platforms: ${links.join(', ') || 'None'}`)
          }
        }
        console.log('')
      }
    })

    // 5. POSTS RELATIONSHIP EXAMPLE
    console.log('5. Posts Relationship Example')
    console.log('-----------------------------')

    const posts = await Post.query()
      .load('author', (authorQuery) => {
        authorQuery.load('profile')
      })
      .limit(5)
      .all()

    console.log(`✅ Loaded ${posts.length} posts with authors and profiles`)

    posts.forEach((post, index) => {
      console.log(`${index + 1}. ${post.title}`)
      console.log(`   Status: ${post.status}`)
      console.log(`   Excerpt: ${post.excerpt}`)

      if (post.author) {
        console.log(`   Author: ${post.author.name}`)

        if (post.author.profile) {
          console.log(`   Author Profile: ${post.author.profile.fullName}`)
        }
      }
      console.log('')
    })

    // 6. PERFORMANCE DEMONSTRATION - Bulk Loading
    console.log('6. Performance - Bulk Loading (No N+1 Queries)')
    console.log('-----------------------------------------------')

    const startTime = Date.now()

    const manyUsers = await UserWithReferencedProfile.query().load('profile').limit(10).all()

    const endTime = Date.now()
    const loadTime = endTime - startTime

    console.log(`✅ Loaded ${manyUsers.length} users with all relationships in ${loadTime}ms`)
    console.log('   This uses bulk loading to prevent N+1 query problems!')

    // Count total relationships loaded
    let totalProfiles = 0

    manyUsers.forEach((user) => {
      if (user.profile) totalProfiles++
    })

    console.log(`   Total profiles loaded: ${totalProfiles}`)
    console.log(`   All with optimal query performance! 🚀`)

    // 7. TYPE SAFETY VERIFICATION
    console.log('\n7. Type Safety Verification')
    console.log('---------------------------')

    const user = manyUsers[0]
    if (user) {
      // These all have full TypeScript support and IntelliSense!
      console.log('✅ Direct property access with full type safety:')
      console.log(`   user.name: ${typeof user.name} = "${user.name}"`)
      console.log(`   user.email: ${typeof user.email} = "${user.email}"`)

      if (user.profile) {
        console.log(
          `   user.profile.firstName: ${typeof user.profile.firstName} = "${user.profile.firstName}"`
        )
        console.log(
          `   user.profile.fullName: ${typeof user.profile.fullName} = "${user.profile.fullName}"`
        )
      }
    }

    console.log('\n🎉 Seamless Type Safety Demo Complete!')
    console.log('=====================================')
    console.log('✅ No type assertions required')
    console.log('✅ Direct property access like AdonisJS Lucid')
    console.log('✅ Full IntelliSense support')
    console.log('✅ Bulk loading for optimal performance')
    console.log('✅ Type-safe load callbacks')
  } catch (error) {
    console.error('❌ Error in seamless type safety demo:', error)
  }
}

// Export for use in other examples
export { demonstrateSeamlessTypeSafety }

// Run the demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateSeamlessTypeSafety().catch(console.error)
}
