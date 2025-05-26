import UserWithReferencedProfile from '../app/models/user_with_referenced_profile.js'
import Profile from '../app/models/profile.js'
import { NestedDocumentHelpers } from '../src/utils/nested_document_helpers.js'

/**
 * Efficient Nested Operations Example
 *
 * This example demonstrates how to efficiently handle nested documents
 * to avoid performance issues like N+1 queries when dealing with large datasets.
 */

async function efficientNestedOperationsExample() {
  try {
    console.log('🚀 Efficient Nested Operations Example')
    console.log('======================================')

    // ========================================
    // SETUP: Create sample data
    // ========================================
    console.log('\n📝 Setting up sample data...')

    // Create multiple users with profiles
    const sampleUsers = []
    for (let i = 1; i <= 20; i++) {
      const user = await UserWithReferencedProfile.create({
        name: `User ${i}`,
        email: `user${i}@example.com`,
        age: 20 + (i % 30),
      })

      await user.createProfile({
        firstName: `First${i}`,
        lastName: `Last${i}`,
        bio: i % 3 === 0 ? 'Software Engineer' : i % 3 === 1 ? 'Designer' : 'Product Manager',
        phoneNumber: `+1-555-${String(i).padStart(4, '0')}`,
        address: {
          street: `${i * 100} Main St`,
          city: i % 2 === 0 ? 'San Francisco' : 'New York',
          state: i % 2 === 0 ? 'CA' : 'NY',
          zipCode: String(10000 + i),
          country: 'USA',
        },
      })

      sampleUsers.push(user)
    }
    console.log(`✅ Created ${sampleUsers.length} users with profiles`)

    // ========================================
    // PROBLEM: N+1 Query Issue
    // ========================================
    console.log('\n❌ DEMONSTRATING N+1 QUERY PROBLEM')
    console.log('==================================')

    console.log('\n🐌 Loading users and profiles individually (N+1 queries):')
    const startN1 = Date.now()

    // This creates N+1 queries: 1 query for users + N queries for profiles
    const usersIndividual = await UserWithReferencedProfile.query().limit(10).all()
    for (const user of usersIndividual) {
      await user.loadProfile() // Each call makes a separate database query
    }

    const n1Time = Date.now() - startN1
    console.log(`   ⏱️  Loaded ${usersIndividual.length} users with profiles in ${n1Time}ms`)
    console.log(
      `   📊 Database queries: ${usersIndividual.length + 1} (1 for users + ${usersIndividual.length} for profiles)`
    )

    // ========================================
    // SOLUTION: Bulk Loading
    // ========================================
    console.log('\n✅ SOLUTION: BULK LOADING')
    console.log('=========================')

    console.log('\n🚀 Loading users and profiles with bulk loading:')
    const startBulk = Date.now()

    // Load users first
    const usersBulk = await UserWithReferencedProfile.query().limit(10).all()

    // Bulk load all profiles in a single query
    await NestedDocumentHelpers.bulkLoadReferences(
      usersBulk as any,
      'profileId',
      Profile,
      'profile'
    )

    const bulkTime = Date.now() - startBulk
    console.log(`   ⏱️  Loaded ${usersBulk.length} users with profiles in ${bulkTime}ms`)
    console.log(`   📊 Database queries: 2 (1 for users + 1 for all profiles)`)
    console.log(`   🎯 Performance improvement: ${Math.round((n1Time / bulkTime) * 100)}% faster`)

    // ========================================
    // EFFICIENT PAGINATION
    // ========================================
    console.log('\n📄 EFFICIENT PAGINATION WITH REFERENCES')
    console.log('=======================================')

    console.log('\n📊 Paginating users with profiles (page 1):')
    const startPagination = Date.now()

    const paginatedResult = await NestedDocumentHelpers.paginateWithReferences(
      UserWithReferencedProfile,
      1, // page
      5, // perPage
      'profileId',
      Profile,
      'profile'
    )

    const paginationTime = Date.now() - startPagination
    console.log(
      `   ⏱️  Loaded page 1 (${paginatedResult.data.length} users) in ${paginationTime}ms`
    )
    console.log(`   📊 Total users: ${paginatedResult.meta.total}`)
    console.log(`   📊 Pages: ${paginatedResult.meta.lastPage}`)
    console.log('   ✅ Only profiles for current page loaded, not all data')

    // ========================================
    // EFFICIENT CREATION
    // ========================================
    console.log('\n📝 EFFICIENT CREATION WITH NESTED DATA')
    console.log('=====================================')

    console.log('\n🚀 Creating user with profile using helper:')
    const startCreation = Date.now()

    const newUser = await NestedDocumentHelpers.createWithNested(
      UserWithReferencedProfile,
      {
        name: 'Efficient User',
        email: 'efficient@example.com',
        age: 29,
        profile: {
          firstName: 'Efficient',
          lastName: 'User',
          bio: 'Created efficiently with helper function',
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

    const creationTime = Date.now() - startCreation
    console.log(`   ⏱️  Created user with profile in ${creationTime}ms`)
    console.log(`   ✅ Profile automatically created and linked`)
    console.log(`   📊 User ID: ${newUser._id}`)
    console.log(`   📊 Profile ID: ${(newUser as any).profile._id}`)

    // ========================================
    // EFFICIENT UPDATES
    // ========================================
    console.log('\n✏️ EFFICIENT UPDATES WITH NESTED DATA')
    console.log('====================================')

    console.log('\n🔄 Updating user and profile together:')
    const startUpdate = Date.now()

    await NestedDocumentHelpers.updateWithNested(
      newUser,
      {
        age: 30,
        profile: {
          bio: 'Updated efficiently with helper function',
          socialLinks: {
            twitter: '@efficientuser',
            github: 'github.com/efficientuser',
          },
        },
      },
      {
        field: 'profile',
        isEmbedded: false,
        NestedModel: Profile,
        referenceField: 'profileId',
      }
    )

    const updateTime = Date.now() - startUpdate
    console.log(`   ⏱️  Updated user and profile in ${updateTime}ms`)
    console.log('   ✅ Both user and profile updated in single operation')

    // ========================================
    // EFFICIENT QUERYING
    // ========================================
    console.log('\n🔍 EFFICIENT QUERYING WITH NESTED CONDITIONS')
    console.log('===========================================')

    console.log('\n📊 Finding engineers in California:')
    const startQuery = Date.now()

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
        {
          field: 'address.state',
          operator: '=',
          value: 'CA',
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

    const queryTime = Date.now() - startQuery
    console.log(`   ⏱️  Found engineers in CA in ${queryTime}ms`)
    console.log(`   📊 Results: ${(engineers as any).data?.length || engineers.length}`)
    console.log('   ✅ Efficient querying across referenced documents')

    // ========================================
    // STATISTICS
    // ========================================
    console.log('\n📈 NESTED DOCUMENT STATISTICS')
    console.log('=============================')

    const stats = await NestedDocumentHelpers.aggregateNestedStats(
      UserWithReferencedProfile,
      'profile',
      false,
      Profile
    )

    console.log('\n📊 Database statistics:')
    console.log(`   👥 Total users: ${stats.totalWithNested + stats.totalWithoutNested}`)
    console.log(`   ✅ Users with profiles: ${stats.totalWithNested}`)
    console.log(`   ❌ Users without profiles: ${stats.totalWithoutNested}`)
    console.log(`   📄 Total profiles: ${stats.totalNested}`)

    // ========================================
    // PERFORMANCE TIPS
    // ========================================
    console.log('\n💡 PERFORMANCE TIPS')
    console.log('==================')
    console.log('🚀 For better performance with nested documents:')
    console.log('   1. Use bulk loading to avoid N+1 queries')
    console.log('   2. Paginate efficiently - only load what you need')
    console.log('   3. Use helper functions for consistent operations')
    console.log('   4. Consider embedded vs referenced based on usage patterns')
    console.log('   5. Index frequently queried nested fields')
    console.log('   6. Use projection to load only required fields')

    console.log('\n🎉 Efficient nested operations example completed!')
  } catch (error) {
    console.error('❌ Error in efficient nested operations example:', error.message)
  }
}

// Export the example function
export { efficientNestedOperationsExample }

// Run the example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  efficientNestedOperationsExample()
}
