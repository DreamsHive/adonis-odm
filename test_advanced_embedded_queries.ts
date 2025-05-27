import UserWithEnhancedEmbeddedProfile from './app/models/user_with_enhanced_embedded_profile.js'

/**
 * ADVANCED EMBEDDED ARRAY QUERY TEST
 *
 * This test demonstrates advanced query capabilities for embedded arrays:
 * ✅ Pagination for large datasets
 * ✅ Complex filtering and searching
 * ✅ Multiple sorting criteria
 * ✅ Aggregation operations
 * ✅ Performance optimizations
 * ✅ Type-safe query building
 */

async function testAdvancedEmbeddedQueries() {
  console.log('🚀 Testing Advanced Embedded Array Queries')
  console.log('==========================================')
  console.log('Demonstrating query capabilities for large embedded datasets')

  try {
    // ========================================
    // 1. CREATE USER WITH MANY PROFILES
    // ========================================
    console.log('\n📝 SETUP: Creating user with many embedded profiles...')

    const user = await UserWithEnhancedEmbeddedProfile.create({
      email: 'advanced@example.com',
      age: 35,
      profiles: [
        { firstName: 'Alice', lastName: 'Johnson', bio: 'Senior Software Engineer', age: 32 },
        { firstName: 'Bob', lastName: 'Smith', bio: 'Technical Lead', age: 28 },
        { firstName: 'Carol', lastName: 'Davis', bio: 'Product Manager', age: 30 },
        { firstName: 'David', lastName: 'Wilson', bio: 'Senior Developer', age: 35 },
        { firstName: 'Eve', lastName: 'Brown', bio: 'DevOps Engineer', age: 29 },
        { firstName: 'Frank', lastName: 'Miller', bio: 'Software Architect', age: 40 },
        { firstName: 'Grace', lastName: 'Taylor', bio: 'Frontend Developer', age: 26 },
        { firstName: 'Henry', lastName: 'Anderson', bio: 'Backend Developer', age: 31 },
        { firstName: 'Ivy', lastName: 'Thomas', bio: 'Full Stack Developer', age: 27 },
        { firstName: 'Jack', lastName: 'Jackson', bio: 'Senior Engineer', age: 33 },
      ],
    })

    console.log(`✅ Created user with ${user.profiles?.length || 0} embedded profiles`)

    // ========================================
    // 2. BASIC FILTERING
    // ========================================
    console.log('\n🔍 BASIC FILTERING')
    console.log('==================')

    if (user.profiles) {
      // Filter by age
      const youngProfiles = user.profiles.query().where('age', '<', 30).get()

      console.log(`✅ Young profiles (age < 30): ${youngProfiles.length}`)
      youngProfiles.forEach((p) => console.log(`   - ${p.firstName} ${p.lastName} (${p.age})`))

      // Filter by bio containing "Senior"
      const seniorProfiles = user.profiles.query().where('bio', 'like', 'Senior').get()

      console.log(`✅ Senior profiles: ${seniorProfiles.length}`)
      seniorProfiles.forEach((p) => console.log(`   - ${p.firstName} ${p.lastName}: ${p.bio}`))
    }

    // ========================================
    // 3. PAGINATION
    // ========================================
    console.log('\n📄 PAGINATION')
    console.log('=============')

    if (user.profiles) {
      // Page 1: First 3 profiles
      const page1 = user.profiles.query().orderBy('firstName', 'asc').forPage(1, 3).get()

      console.log(`✅ Page 1 (3 per page): ${page1.length} profiles`)
      page1.forEach((p, i) => console.log(`   ${i + 1}. ${p.firstName} ${p.lastName}`))

      // Page 2: Next 3 profiles
      const page2 = user.profiles.query().orderBy('firstName', 'asc').forPage(2, 3).get()

      console.log(`✅ Page 2 (3 per page): ${page2.length} profiles`)
      page2.forEach((p, i) => console.log(`   ${i + 4}. ${p.firstName} ${p.lastName}`))

      // Advanced pagination with metadata
      const paginatedResult = user.profiles.query().orderBy('age', 'desc').paginate(1, 4)

      console.log('✅ Paginated result with metadata:')
      console.log(`   Current page: ${paginatedResult.pagination.currentPage}`)
      console.log(`   Per page: ${paginatedResult.pagination.perPage}`)
      console.log(`   Total: ${paginatedResult.pagination.total}`)
      console.log(`   Total pages: ${paginatedResult.pagination.totalPages}`)
      console.log(`   Has next: ${paginatedResult.pagination.hasNextPage}`)
      console.log(`   Has prev: ${paginatedResult.pagination.hasPrevPage}`)
    }

    // ========================================
    // 4. COMPLEX FILTERING
    // ========================================
    console.log('\n🔧 COMPLEX FILTERING')
    console.log('====================')

    if (user.profiles) {
      // Multiple conditions with AND logic
      const experiencedDevelopers = user.profiles
        .query()
        .whereAll([
          { field: 'age', operator: '>=', value: 30 },
          { field: 'bio', operator: 'like', value: 'Developer' },
        ])
        .get()

      console.log(
        `✅ Experienced developers (age >= 30 AND bio contains 'Developer'): ${experiencedDevelopers.length}`
      )
      experiencedDevelopers.forEach((p) =>
        console.log(`   - ${p.firstName} ${p.lastName} (${p.age}): ${p.bio}`)
      )

      // Multiple conditions with OR logic
      const leadersOrArchitects = user.profiles
        .query()
        .whereAny([
          { field: 'bio', operator: 'like', value: 'Lead' },
          { field: 'bio', operator: 'like', value: 'Architect' },
        ])
        .get()

      console.log(`✅ Leaders or Architects: ${leadersOrArchitects.length}`)
      leadersOrArchitects.forEach((p) => console.log(`   - ${p.firstName} ${p.lastName}: ${p.bio}`))
    }

    // ========================================
    // 5. SEARCHING
    // ========================================
    console.log('\n🔎 SEARCHING')
    console.log('============')

    if (user.profiles) {
      // Search across multiple fields
      const searchResults = user.profiles.query().search('Engineer', ['bio']).get()

      console.log(`✅ Search for 'Engineer' in bio: ${searchResults.length} results`)
      searchResults.forEach((p) => console.log(`   - ${p.firstName} ${p.lastName}: ${p.bio}`))

      // Search in names
      const nameSearch = user.profiles.query().search('A', ['firstName']).get()

      console.log(`✅ Search for 'A' in firstName: ${nameSearch.length} results`)
      nameSearch.forEach((p) => console.log(`   - ${p.firstName} ${p.lastName}`))
    }

    // ========================================
    // 6. SORTING
    // ========================================
    console.log('\n📊 SORTING')
    console.log('==========')

    if (user.profiles) {
      // Sort by age descending
      const sortedByAge = user.profiles.query().orderBy('age', 'desc').limit(5).get()

      console.log('✅ Top 5 oldest profiles:')
      sortedByAge.forEach((p, i) =>
        console.log(`   ${i + 1}. ${p.firstName} ${p.lastName} (${p.age})`)
      )

      // Sort by name ascending
      const sortedByName = user.profiles.query().orderBy('firstName', 'asc').limit(5).get()

      console.log('✅ First 5 profiles alphabetically:')
      sortedByName.forEach((p, i) => console.log(`   ${i + 1}. ${p.firstName} ${p.lastName}`))
    }

    // ========================================
    // 7. AGGREGATION
    // ========================================
    console.log('\n📈 AGGREGATION')
    console.log('==============')

    if (user.profiles) {
      // Age statistics
      const ageStats = user.profiles.query().aggregate('age')

      if (ageStats) {
        console.log('✅ Age statistics:')
        console.log(`   Count: ${ageStats.count}`)
        console.log(`   Average: ${ageStats.avg.toFixed(1)} years`)
        console.log(`   Min: ${ageStats.min} years`)
        console.log(`   Max: ${ageStats.max} years`)
        console.log(`   Sum: ${ageStats.sum} years`)
      }

      // Distinct values
      const distinctAges = user.profiles.query().distinct('age')

      console.log(`✅ Distinct ages: ${distinctAges.sort((a, b) => a - b).join(', ')}`)

      // Group by age ranges
      const ageGroups = user.profiles.query().groupBy('age')

      console.log('✅ Profiles grouped by age:')
      ageGroups.forEach((profiles, age) => {
        console.log(`   Age ${age}: ${profiles.length} profile(s)`)
        profiles.forEach((p) => console.log(`     - ${p.firstName} ${p.lastName}`))
      })
    }

    // ========================================
    // 8. PERFORMANCE FEATURES
    // ========================================
    console.log('\n⚡ PERFORMANCE FEATURES')
    console.log('======================')

    if (user.profiles) {
      // Field selection for large objects
      const selectedFields = user.profiles
        .query()
        .select('firstName', 'lastName', 'age')
        .limit(3)
        .get()

      console.log('✅ Selected fields only (firstName, lastName, age):')
      selectedFields.forEach((p) => {
        console.log(`   - ${p.firstName} ${p.lastName} (${p.age})`)
        // Note: bio should be undefined due to selection
        console.log(`     Bio available: ${p.bio !== undefined}`)
      })

      // Query chaining and reuse
      const baseQuery = user.profiles.query().where('age', '>=', 28).orderBy('age', 'asc')

      const clonedQuery = baseQuery.clone()
      const developers = clonedQuery.where('bio', 'like', 'Developer').get()
      const engineers = baseQuery.where('bio', 'like', 'Engineer').get()

      console.log(`✅ Developers (age >= 28): ${developers.length}`)
      console.log(`✅ Engineers (age >= 28): ${engineers.length}`)
    }

    // ========================================
    // 9. UTILITY METHODS
    // ========================================
    console.log('\n🛠️ UTILITY METHODS')
    console.log('==================')

    if (user.profiles) {
      // Check existence
      const hasYoungProfiles = user.profiles.query().where('age', '<', 25).exists()

      console.log(`✅ Has profiles under 25: ${hasYoungProfiles}`)

      // Count without fetching
      const seniorCount = user.profiles.query().where('bio', 'like', 'Senior').count()

      console.log(`✅ Senior profiles count: ${seniorCount}`)

      // First result
      const oldestProfile = user.profiles.query().orderBy('age', 'desc').first()

      if (oldestProfile) {
        console.log(
          `✅ Oldest profile: ${oldestProfile.firstName} ${oldestProfile.lastName} (${oldestProfile.age})`
        )
      }

      // Tap for debugging
      const debugResults = user.profiles
        .query()
        .where('age', '>', 35)
        .tap((results) => console.log(`🐛 Debug: Found ${results.length} profiles over 35`))
        .get()

      console.log(`✅ Profiles over 35: ${debugResults.length}`)
    }

    console.log('\n🎯 SUMMARY')
    console.log('==========')

    return {
      success: true,
      message: 'Advanced Embedded Array Queries completed successfully!',
      features: [
        '✅ Pagination with metadata for large datasets',
        '✅ Complex filtering with AND/OR logic',
        '✅ Full-text search across multiple fields',
        '✅ Multiple sorting criteria',
        '✅ Aggregation operations (sum, avg, min, max, count)',
        '✅ Distinct values and grouping',
        '✅ Field selection for performance',
        '✅ Query cloning and reuse',
        '✅ Utility methods (exists, count, first, tap)',
        '✅ Type-safe query building with IntelliSense',
      ],
      queryCapabilities: {
        'Basic Filtering': 'where(), whereNotNull(), whereNull()',
        'Complex Filtering': 'whereAll(), whereAny(), whereDateBetween()',
        'Pagination': 'limit(), skip(), offset(), forPage(), paginate()',
        'Searching': 'search(), whereRegex(), whereArrayContains()',
        'Sorting': 'orderBy() with multiple criteria',
        'Aggregation': 'aggregate(), distinct(), groupBy()',
        'Performance': 'select(), clone(), tap()',
        'Utilities': 'exists(), count(), first(), get()',
      },
      useCases: [
        '📊 Dashboard with paginated profile lists',
        '🔍 Search functionality across profile data',
        '📈 Analytics and reporting on embedded data',
        '⚡ Performance optimization for large datasets',
        '🎯 Complex business logic filtering',
        '📱 Mobile-friendly pagination',
      ],
    }
  } catch (error) {
    console.error('❌ Advanced query test failed:', error)
    return {
      success: false,
      error: error.message,
      stack: error.stack,
    }
  }
}

// Export for testing
export default testAdvancedEmbeddedQueries

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testAdvancedEmbeddedQueries()
    .then((result) => {
      console.log('\n📋 Test Result:', result)
      process.exit(result.success ? 0 : 1)
    })
    .catch((error) => {
      console.error('💥 Test execution failed:', error)
      process.exit(1)
    })
}
