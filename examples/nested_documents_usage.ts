import UserWithEmbeddedProfile from '../app/models/user_with_embedded_profile.js'
import UserWithReferencedProfile from '../app/models/user_with_referenced_profile.js'
import Profile from '../app/models/profile.js'

/**
 * Nested Documents Usage Example
 *
 * This example demonstrates different approaches to handle nested documents
 * in MongoDB ODM with AdonisJS v6.
 */

async function nestedDocumentsExample() {
  try {
    console.log('🚀 MongoDB ODM Nested Documents Example')
    console.log('==========================================')

    // ========================================
    // APPROACH 1: EMBEDDED DOCUMENTS
    // ========================================
    console.log('\n📦 APPROACH 1: EMBEDDED DOCUMENTS')
    console.log('==================================')

    // Create user with embedded profile
    console.log('\n📝 Creating user with embedded profile...')
    const userWithEmbedded = await UserWithEmbeddedProfile.create({
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
      profile: {
        firstName: 'John',
        lastName: 'Doe',
        bio: 'Software developer passionate about MongoDB and AdonisJS',
        avatar: 'https://example.com/avatar.jpg',
        phoneNumber: '+1-555-0123',
        address: {
          street: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94105',
          country: 'USA',
        },
        socialLinks: {
          twitter: '@johndoe',
          linkedin: 'linkedin.com/in/johndoe',
          github: 'github.com/johndoe',
        },
      },
    })
    console.log('✅ User with embedded profile created:', {
      id: userWithEmbedded._id,
      name: userWithEmbedded.name,
      fullName: userWithEmbedded.fullName,
      address: userWithEmbedded.formattedAddress,
    })

    // Update embedded profile
    console.log('\n✏️ Updating embedded profile...')
    userWithEmbedded.updateProfile({
      bio: 'Senior Software Developer with 5+ years experience',
      socialLinks: {
        ...userWithEmbedded.profile?.socialLinks,
        website: 'https://johndoe.dev',
      },
    })
    await userWithEmbedded.save()
    console.log('✅ Embedded profile updated')

    // Query users with specific profile data
    console.log('\n🔍 Querying users by embedded profile data...')
    const usersInCA = await UserWithEmbeddedProfile.query()
      .where('profile.address.state', 'CA')
      .all()
    console.log('✅ Users in CA found:', usersInCA.length)

    // ========================================
    // APPROACH 2: REFERENCED DOCUMENTS
    // ========================================
    console.log('\n🔗 APPROACH 2: REFERENCED DOCUMENTS')
    console.log('===================================')

    // Create user with referenced profile
    console.log('\n📝 Creating user with referenced profile...')
    const userWithRef = await UserWithReferencedProfile.create({
      name: 'Jane Smith',
      email: 'jane@example.com',
      age: 28,
    })

    // Create and associate profile
    const profile = await userWithRef.createProfile({
      firstName: 'Jane',
      lastName: 'Smith',
      bio: 'UX Designer and Frontend Developer',
      avatar: 'https://example.com/jane-avatar.jpg',
      phoneNumber: '+1-555-0456',
      address: {
        street: '456 Oak Ave',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
      },
      socialLinks: {
        twitter: '@janesmith',
        linkedin: 'linkedin.com/in/janesmith',
        github: 'github.com/janesmith',
      },
    })
    console.log('✅ User with referenced profile created:', {
      userId: userWithRef._id,
      profileId: profile._id,
      name: userWithRef.name,
    })

    // Load profile when needed
    console.log('\n📖 Loading referenced profile...')
    await userWithRef.loadProfile()
    console.log('✅ Profile loaded:', {
      fullName: userWithRef.fullName,
      address: userWithRef.formattedAddress,
    })

    // Update referenced profile
    console.log('\n✏️ Updating referenced profile...')
    await userWithRef.updateProfile({
      bio: 'Senior UX Designer specializing in mobile applications',
      socialLinks: {
        ...userWithRef.profile?.socialLinks,
        website: 'https://janesmith.design',
      },
    })
    console.log('✅ Referenced profile updated')

    // ========================================
    // PERFORMANCE COMPARISON
    // ========================================
    console.log('\n⚡ PERFORMANCE COMPARISON')
    console.log('========================')

    // Simulate loading 100 users with embedded profiles
    console.log('\n📊 Loading users with embedded profiles (simulated)...')
    const startEmbedded = Date.now()
    const embeddedUsers = await UserWithEmbeddedProfile.query()
      .limit(10) // Simulate loading subset
      .all()
    const embeddedTime = Date.now() - startEmbedded
    console.log(
      `✅ Loaded ${embeddedUsers.length} users with embedded profiles in ${embeddedTime}ms`
    )
    console.log('   - All profile data loaded in single query')
    console.log('   - No additional database calls needed')

    // Simulate loading 100 users with referenced profiles (without loading profiles)
    console.log('\n📊 Loading users with referenced profiles (without profiles)...')
    const startRef = Date.now()
    const referencedUsers = await UserWithReferencedProfile.query()
      .limit(10) // Simulate loading subset
      .all()
    const refTime = Date.now() - startRef
    console.log(`✅ Loaded ${referencedUsers.length} users without profiles in ${refTime}ms`)
    console.log('   - Only user data loaded, profiles not fetched')
    console.log('   - Profiles can be loaded on-demand')

    // Load profiles for specific users only
    console.log('\n📊 Loading profiles for specific users only...')
    const startSpecific = Date.now()
    for (const user of referencedUsers.slice(0, 3)) {
      // Load profiles for first 3 users
      await user.loadProfile()
    }
    const specificTime = Date.now() - startSpecific
    console.log(`✅ Loaded profiles for 3 users in ${specificTime}ms`)
    console.log('   - Selective loading based on need')

    // ========================================
    // CRUD OPERATIONS EXAMPLES
    // ========================================
    console.log('\n🔧 CRUD OPERATIONS EXAMPLES')
    console.log('===========================')

    // Embedded approach CRUD
    console.log('\n📝 Embedded Profile CRUD:')

    // Create with nested data
    const newEmbeddedUser = await UserWithEmbeddedProfile.create({
      name: 'Bob Wilson',
      email: 'bob@example.com',
      age: 35,
      profile: {
        firstName: 'Bob',
        lastName: 'Wilson',
        bio: 'DevOps Engineer',
      },
    })
    console.log('   ✅ Created user with partial profile data')

    // Update nested data
    newEmbeddedUser.updateProfile({
      phoneNumber: '+1-555-0789',
      address: {
        street: '789 Pine St',
        city: 'Seattle',
        state: 'WA',
        zipCode: '98101',
        country: 'USA',
      },
    })
    await newEmbeddedUser.save()
    console.log('   ✅ Updated embedded profile with additional data')

    // Referenced approach CRUD
    console.log('\n📝 Referenced Profile CRUD:')

    // Create user first, then profile
    const newRefUser = await UserWithReferencedProfile.create({
      name: 'Alice Johnson',
      email: 'alice@example.com',
      age: 32,
    })
    console.log('   ✅ Created user without profile')

    // Add profile later
    await newRefUser.createProfile({
      firstName: 'Alice',
      lastName: 'Johnson',
      bio: 'Product Manager',
    })
    console.log('   ✅ Added profile to existing user')

    // Update profile separately
    await newRefUser.updateProfile({
      phoneNumber: '+1-555-0321',
      bio: 'Senior Product Manager with focus on user experience',
    })
    console.log('   ✅ Updated profile independently')

    // ========================================
    // QUERYING STRATEGIES
    // ========================================
    console.log('\n🔍 QUERYING STRATEGIES')
    console.log('======================')

    // Embedded documents - direct field access
    console.log('\n📊 Querying embedded documents:')
    const developersInCA = await UserWithEmbeddedProfile.query()
      .where('profile.address.state', 'CA')
      .where('profile.bio', 'like', '%developer%')
      .all()
    console.log(`   ✅ Found ${developersInCA.length} developers in CA`)

    // Referenced documents - need joins or separate queries
    console.log('\n📊 Querying referenced documents:')

    // First, find profiles matching criteria
    const techProfiles = await Profile.query()
      .where('bio', 'like', '%engineer%')
      .orWhere('bio', 'like', '%developer%')
      .all()

    const techProfileIds = techProfiles.map((p) => p._id)

    // Then find users with those profile IDs
    const techUsers = await UserWithReferencedProfile.query()
      .where('profileId', 'in', techProfileIds)
      .all()

    console.log(`   ✅ Found ${techUsers.length} tech users through profile lookup`)

    console.log('\n🎉 Nested documents example completed successfully!')

    // ========================================
    // RECOMMENDATIONS
    // ========================================
    console.log('\n💡 RECOMMENDATIONS')
    console.log('==================')
    console.log('📦 Use EMBEDDED documents when:')
    console.log('   - Profile data is always loaded with user')
    console.log('   - Profile data is relatively small')
    console.log('   - You need atomic updates')
    console.log('   - You frequently query by profile fields')

    console.log('\n🔗 Use REFERENCED documents when:')
    console.log('   - Profile data is large or complex')
    console.log('   - Profile data is optional/loaded on-demand')
    console.log('   - You need to query profiles independently')
    console.log('   - Multiple entities might reference the same profile')
  } catch (error) {
    console.error('❌ Error in nested documents example:', error.message)
  }
}

// Export the example function
export { nestedDocumentsExample }

// Run the example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  nestedDocumentsExample()
}
