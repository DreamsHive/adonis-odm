/**
 * NESTED DOCUMENTS USAGE EXAMPLE
 *
 * This example demonstrates how to work with nested documents
 * using the UserWithEmbeddedProfile model which embeds profile
 * data directly within the user document.
 *
 * Key Features Demonstrated:
 * - Embedded document creation and updates
 * - Nested field queries and operations
 * - Type-safe nested document access
 * - Efficient single-document operations
 */

import UserWithEmbeddedProfile from '../app/models/user_with_embedded_profile.js'

async function nestedDocumentsUsageExample() {
  console.log('📄 Nested Documents Usage Example')
  console.log('==================================\n')

  try {
    // 1. CREATE USERS WITH EMBEDDED PROFILES
    console.log('1. Creating Users with Embedded Profiles')
    console.log('----------------------------------------')

    // Create user with embedded profile data
    const user1 = await UserWithEmbeddedProfile.create({
      name: 'Sarah Wilson',
      email: 'sarah@example.com',
      age: 29,
      profile: {
        firstName: 'Sarah',
        lastName: 'Wilson',
        bio: 'Frontend developer passionate about React and TypeScript',
        phoneNumber: '+1-555-0201',
        address: {
          street: '789 React Street',
          city: 'Austin',
          state: 'TX',
          zipCode: '73301',
          country: 'USA',
        },
        socialLinks: {
          twitter: 'https://twitter.com/sarahwilson',
          linkedin: 'https://linkedin.com/in/sarahwilson',
          github: 'https://github.com/sarahwilson',
          website: 'https://sarahwilson.dev',
        },
      },
    })

    const user2 = await UserWithEmbeddedProfile.create({
      name: 'Mike Chen',
      email: 'mike@example.com',
      age: 34,
      profile: {
        firstName: 'Mike',
        lastName: 'Chen',
        bio: 'DevOps engineer with expertise in Kubernetes and AWS',
        phoneNumber: '+1-555-0202',
        address: {
          street: '456 Cloud Avenue',
          city: 'Portland',
          state: 'OR',
          zipCode: '97201',
          country: 'USA',
        },
        socialLinks: {
          linkedin: 'https://linkedin.com/in/mikechen',
          github: 'https://github.com/mikechen',
        },
      },
    })

    console.log(`✅ Created user: ${user1.name}`)
    console.log(`   Profile: ${user1.profile?.firstName} ${user1.profile?.lastName}`)
    console.log(`   Bio: ${user1.profile?.bio}`)
    console.log(`   Phone: ${user1.profile?.phoneNumber}`)

    console.log(`\n✅ Created user: ${user2.name}`)
    console.log(`   Profile: ${user2.profile?.firstName} ${user2.profile?.lastName}`)
    console.log(`   Bio: ${user2.profile?.bio}`)
    console.log(`   Phone: ${user2.profile?.phoneNumber}`)

    // 2. NESTED FIELD QUERIES
    console.log('\n2. Nested Field Queries')
    console.log('-----------------------')

    // Query by nested profile fields
    const frontendDevs = await UserWithEmbeddedProfile.query()
      .where('profile.bio', 'like', '%Frontend%')
      .all()

    console.log(`✅ Found ${frontendDevs.length} frontend developers:`)
    frontendDevs.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.name} - ${user.profile?.bio}`)
    })

    // Query by nested address
    const texasUsers = await UserWithEmbeddedProfile.query()
      .where('profile.address.state', 'TX')
      .all()

    console.log(`\n✅ Found ${texasUsers.length} users in Texas:`)
    texasUsers.forEach((user, index) => {
      console.log(
        `   ${index + 1}. ${user.name} - ${user.profile?.address?.city}, ${user.profile?.address?.state}`
      )
    })

    // Query by nested phone number
    const usersWithPhone = await UserWithEmbeddedProfile.query()
      .whereNotNull('profile.phoneNumber')
      .all()

    console.log(`\n✅ Found ${usersWithPhone.length} users with phone numbers:`)
    usersWithPhone.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.name} - ${user.profile?.phoneNumber}`)
    })

    // Query by nested social links
    const usersWithWebsite = await UserWithEmbeddedProfile.query()
      .whereNotNull('profile.socialLinks.website')
      .all()

    console.log(`\n✅ Found ${usersWithWebsite.length} users with personal websites:`)
    usersWithWebsite.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.name} - ${user.profile?.socialLinks?.website}`)
    })

    // 3. NESTED DOCUMENT UPDATES
    console.log('\n3. Nested Document Updates')
    console.log('--------------------------')

    // Update nested profile bio
    user1.profile!.bio = 'Senior Frontend Developer specializing in React, TypeScript, and Next.js'
    await user1.save()
    console.log(`✅ Updated ${user1.name}'s bio`)

    // Update nested address
    user2.profile!.address!.city = 'Seattle'
    user2.profile!.address!.zipCode = '98101'
    await user2.save()
    console.log(`✅ Updated ${user2.name}'s address to Seattle`)

    // Update nested phone number
    user1.profile!.phoneNumber = '+1-555-0299'
    await user1.save()
    console.log(`✅ Updated ${user1.name}'s phone number`)

    // Add new social link
    if (!user2.profile!.socialLinks) {
      user2.profile!.socialLinks = {}
    }
    user2.profile!.socialLinks!.twitter = 'https://twitter.com/mikechen'
    await user2.save()
    console.log(`✅ Added Twitter link for ${user2.name}`)

    // 4. COMPLEX NESTED QUERIES
    console.log('\n4. Complex Nested Queries')
    console.log('-------------------------')

    // Query users with specific social links
    const twitterUsers = await UserWithEmbeddedProfile.query()
      .whereNotNull('profile.socialLinks.twitter')
      .all()

    console.log(`✅ Found ${twitterUsers.length} users with Twitter:`)
    twitterUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.name} - ${user.profile?.socialLinks?.twitter}`)
    })

    // Query users with multiple social links
    const multiSocialUsers = await UserWithEmbeddedProfile.query()
      .whereNotNull('profile.socialLinks.linkedin')
      .whereNotNull('profile.socialLinks.github')
      .all()

    console.log(`\n✅ Found ${multiSocialUsers.length} users with LinkedIn and GitHub:`)
    multiSocialUsers.forEach((user, index) => {
      const social = user.profile?.socialLinks
      console.log(
        `   ${index + 1}. ${user.name} - LinkedIn: ${social?.linkedin}, GitHub: ${social?.github}`
      )
    })

    // Query by age range and bio content
    const youngDevs = await UserWithEmbeddedProfile.query()
      .where('age', '<', 30)
      .where('profile.bio', 'like', '%developer%')
      .all()

    console.log(`\n✅ Found ${youngDevs.length} young developers:`)
    youngDevs.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.name} (${user.age}) - ${user.profile?.bio}`)
    })

    // 5. NESTED DOCUMENT AGGREGATION
    console.log('\n5. Nested Document Aggregation')
    console.log('------------------------------')

    // Get all users and analyze their data
    const allUsers = await UserWithEmbeddedProfile.query().all()

    // Analyze states
    const stateStats = allUsers.reduce(
      (stats, user) => {
        const state = user.profile?.address?.state || 'unknown'
        stats[state] = (stats[state] || 0) + 1
        return stats
      },
      {} as Record<string, number>
    )

    console.log(`✅ Users by state:`)
    Object.entries(stateStats).forEach(([state, count]) => {
      console.log(`   ${state}: ${count} users`)
    })

    // Analyze social link usage
    const socialStats = allUsers.reduce(
      (stats, user) => {
        const social = user.profile?.socialLinks
        if (social?.twitter) stats.twitter = (stats.twitter || 0) + 1
        if (social?.linkedin) stats.linkedin = (stats.linkedin || 0) + 1
        if (social?.github) stats.github = (stats.github || 0) + 1
        if (social?.website) stats.website = (stats.website || 0) + 1
        return stats
      },
      {} as Record<string, number>
    )

    console.log(`\n✅ Social link usage:`)
    Object.entries(socialStats).forEach(([platform, count]) => {
      console.log(`   ${platform}: ${count} users`)
    })

    // Analyze bio keywords
    const bioKeywords = allUsers.reduce(
      (keywords, user) => {
        const bio = user.profile?.bio?.toLowerCase() || ''
        if (bio.includes('frontend')) keywords.frontend = (keywords.frontend || 0) + 1
        if (bio.includes('backend')) keywords.backend = (keywords.backend || 0) + 1
        if (bio.includes('devops')) keywords.devops = (keywords.devops || 0) + 1
        if (bio.includes('developer')) keywords.developer = (keywords.developer || 0) + 1
        if (bio.includes('engineer')) keywords.engineer = (keywords.engineer || 0) + 1
        return keywords
      },
      {} as Record<string, number>
    )

    console.log(`\n✅ Bio keywords:`)
    Object.entries(bioKeywords).forEach(([keyword, count]) => {
      console.log(`   ${keyword}: ${count} users`)
    })

    // 6. PARTIAL NESTED UPDATES
    console.log('\n6. Partial Nested Updates')
    console.log('-------------------------')

    // Update only specific nested fields using updateProfile method
    user1.updateProfile({
      bio: 'Lead Frontend Developer and React Expert',
      avatar: 'https://example.com/sarah-avatar.jpg',
    })
    await user1.save()

    console.log(`✅ Updated ${user1.name}'s bio and avatar`)

    // Verify the update
    const updatedUser = await UserWithEmbeddedProfile.find(user1._id)
    console.log(`   New bio: ${updatedUser?.profile?.bio}`)
    console.log(`   New avatar: ${updatedUser?.profile?.avatar}`)

    // 7. NESTED DOCUMENT BENEFITS
    console.log('\n7. Nested Document Benefits')
    console.log('---------------------------')

    console.log(`✅ Benefits of embedded profiles:`)
    console.log(`   • Single document read/write operations`)
    console.log(`   • Atomic updates for user and profile data`)
    console.log(`   • No need for joins or separate queries`)
    console.log(`   • Consistent data (no orphaned profiles)`)
    console.log(`   • Better performance for read-heavy workloads`)

    console.log(`\n✅ Use cases for embedded documents:`)
    console.log(`   • User profiles and preferences`)
    console.log(`   • Product details and specifications`)
    console.log(`   • Order items and line details`)
    console.log(`   • Blog posts with metadata`)
    console.log(`   • Any 1:1 or 1:few relationships`)

    console.log('\n🎉 Nested Documents Usage Example Complete!')
    console.log('===========================================')
    console.log('✅ Created users with complex embedded profiles')
    console.log('✅ Demonstrated nested field queries')
    console.log('✅ Showed nested document updates')
    console.log('✅ Performed complex nested queries')
    console.log('✅ Analyzed nested document data')
    console.log('✅ Highlighted benefits of embedded documents')
  } catch (error) {
    console.error('❌ Error in nested documents example:', error)
  }
}

// Export for use in other examples
export { nestedDocumentsUsageExample }

// Run the example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  nestedDocumentsUsageExample().catch(console.error)
}
