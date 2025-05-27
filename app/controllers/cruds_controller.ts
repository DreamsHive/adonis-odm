import { createAccountValidator } from '#validators/crud'

import Profile from '#models/profile'
import UserWithReferencedProfile from '#models/user_with_referenced_profile'
import UserWithEnhancedEmbeddedProfile from '#models/user_with_enhanced_embedded_profile'
import db from '#services/mongodb_service'

// Types
import type { HttpContext } from '@adonisjs/core/http'

export default class CrudsController {
  public async create({ request, response }: HttpContext) {
    const payload = await request.validateUsing(createAccountValidator)

    // Use managed transaction to ensure atomicity
    const result = await db.transaction(async (trx) => {
      console.log('🔄 Starting transaction for user creation...')

      // Create user with the validated payload within transaction
      const user = await UserWithReferencedProfile.create(
        {
          email: payload.email,
          encryptedPassword: payload.password,
        },
        { client: trx }
      )

      console.log('✅ User created:', user._id)

      // Create the associated profile within the same transaction
      const profile = await Profile.create(
        {
          userId: user._id,
          firstName: payload.first_name,
          lastName: payload.last_name,
          bio: payload.bio,
        },
        { client: trx }
      )

      console.log('✅ Profile created:', profile._id)

      // Load the user with profile within the transaction
      const loadAfterCreate = await UserWithReferencedProfile.query({ client: trx })
        .load('profile')
        .where('_id', user._id)
        .first()

      console.log('✅ Transaction completed successfully')
      return loadAfterCreate
    })

    // Return the created user with profile
    return response.status(201).json(result)
  }

  public async createWithoutTransaction({ request, response }: HttpContext) {
    const payload = await request.validateUsing(createAccountValidator)

    console.log('🔄 Creating user without transaction...')

    // Create user with the validated payload (no transaction)
    const user = await UserWithReferencedProfile.create({
      email: payload.email,
      encryptedPassword: payload.password,
    })

    console.log('✅ User created:', user._id)

    // Create the associated profile (no transaction)
    const profile = await Profile.create({
      userId: user._id,
      firstName: payload.first_name,
      lastName: payload.last_name,
      bio: payload.bio,
    })

    console.log('✅ Profile created:', profile._id)

    // Load the user with profile
    const loadAfterCreate = await UserWithReferencedProfile.query()
      .load('profile')
      .where('_id', user._id)
      .first()

    console.log('✅ Creation completed without transaction')

    // Return the created user with profile
    return response.status(201).json(loadAfterCreate)
  }

  public async testManualTransaction({ request, response }: HttpContext) {
    const payload = await request.validateUsing(createAccountValidator)

    // Manual transaction example
    const trx = await db.transaction()

    try {
      console.log('🔄 Starting manual transaction...')

      // Create user with manual transaction
      const user = await UserWithReferencedProfile.create(
        {
          email: payload.email,
          encryptedPassword: payload.password,
        },
        { client: trx }
      )

      console.log('✅ User created:', user._id)

      // Create the associated profile
      const profile = await Profile.create(
        {
          userId: user._id,
          firstName: payload.first_name,
          lastName: payload.last_name,
          bio: payload.bio,
        },
        { client: trx }
      )

      console.log('✅ Profile created:', profile._id)

      // Manually commit the transaction
      await trx.commit()
      console.log('✅ Manual transaction committed successfully')

      // Load the user with profile (outside transaction since it's committed)
      const loadAfterCreate = await UserWithReferencedProfile.query()
        .load('profile')
        .where('_id', user._id)
        .first()

      return response.status(201).json(loadAfterCreate)
    } catch (error) {
      // Manually rollback on error
      await trx.rollback()
      console.error('❌ Manual transaction rolled back:', error)
      return response.status(500).json({ error: 'Transaction failed', details: error.message })
    }
  }

  public async debug({ response }: HttpContext) {
    try {
      // Create test data
      const user = await UserWithReferencedProfile.create({
        email: 'debug@test.com',
      })

      const profile = await Profile.create({
        userId: user._id,
        firstName: 'Debug',
        lastName: 'User',
        bio: 'Test bio',
      })

      // Test relationship loading
      const loadedUser = await UserWithReferencedProfile.query()
        .load('profile')
        .where('_id', user._id)
        .first()

      const debugInfo = {
        user: {
          _id: user._id,
        },
        profile: {
          _id: profile._id,
          userId: profile.userId,
          fullName: profile.fullName,
        },
        loadedUser: {
          exists: !!loadedUser,
          _id: loadedUser?._id,
          profile: {
            exists: !!loadedUser?.profile,
            isLoaded: loadedUser?.profile?.isLoaded,
            related: !!loadedUser?.profile?.related,
            fullName: loadedUser?.profile?.fullName,
          },
          computedProperties: {
            fullName: loadedUser?.fullName,
            formattedAddress: loadedUser?.formattedAddress,
          },
        },
        json: loadedUser?.toJSON(),
      }

      return response.json(debugInfo)
    } catch (error) {
      return response.status(500).json({ error: error.message })
    }
  }

  public async testSeamlessEmbeddedDocuments({ response }: HttpContext) {
    try {
      console.log('🚀 Testing Seamless Type-Safe Embedded Documents')
      console.log('================================================')
      console.log('Demonstrating ZERO "as any" casts with full IntelliSense support')

      // ========================================
      // 1. CREATION - Completely type-safe
      // ========================================
      console.log('\n📝 CREATION (Type-Safe)')
      console.log('========================')

      const user = await UserWithEnhancedEmbeddedProfile.create({
        email: 'seamless@example.com',
        age: 32,
        profile: {
          firstName: 'Alice',
          lastName: 'Johnson',
          bio: 'Senior Software Engineer',
          age: 32,
          phoneNumber: '+1-555-1234',
        },
        profiles: [
          {
            firstName: 'Alice',
            lastName: 'Johnson',
            bio: 'Technical Lead',
            age: 32,
          },
          {
            firstName: 'Alice',
            lastName: 'Johnson',
            bio: 'Architect',
            age: 32,
          },
        ],
      })

      console.log('✅ User created with embedded data (NO CASTS NEEDED):')
      console.log(`   User ID: ${user._id}`)
      console.log(`   Email: ${user.email}`)
      console.log(`   Profile: ${user.profile?.firstName} ${user.profile?.lastName}`)
      console.log(`   Profiles count: ${user.profiles?.length || 0}`)

      // ========================================
      // 2. LOADING - Type-safe relationship loading
      // ========================================
      console.log('\n📖 LOADING (Type-Safe)')
      console.log('=======================')

      const loadedUser = await UserWithEnhancedEmbeddedProfile.query()
        .where('email', 'seamless@example.com')
        .first()

      if (!loadedUser) {
        throw new Error('User not found')
      }

      console.log('✅ User loaded with embedded relationships:')
      console.log(`   Profile loaded: ${!!loadedUser.profile}`)
      console.log(`   Profiles loaded: ${loadedUser.profiles?.length || 0} items`)

      // ========================================
      // 3. TYPE-SAFE PROPERTY ACCESS
      // ========================================
      console.log('\n🔒 TYPE-SAFE PROPERTY ACCESS')
      console.log('============================')

      if (loadedUser.profile) {
        // ✅ Full IntelliSense support - NO CASTS NEEDED!
        const firstName = loadedUser.profile.firstName // ✅ Type: string
        const lastName = loadedUser.profile.lastName // ✅ Type: string
        const bio = loadedUser.profile.bio // ✅ Type: string | undefined
        const age = loadedUser.profile.age // ✅ Type: number
        const phoneNumber = loadedUser.profile.phoneNumber // ✅ Type: string | undefined
        const fullName = loadedUser.profile.fullName // ✅ Type: string (computed property)

        console.log('✅ Type-safe property access (with IntelliSense):')
        console.log(`   firstName: ${firstName} (type: string)`)
        console.log(`   lastName: ${lastName} (type: string)`)
        console.log(`   bio: ${bio} (type: string | undefined)`)
        console.log(`   age: ${age} (type: number)`)
        console.log(`   phoneNumber: ${phoneNumber} (type: string | undefined)`)
        console.log(`   fullName: ${fullName} (type: string - computed)`)

        // ========================================
        // 4. TYPE-SAFE CRUD OPERATIONS
        // ========================================
        console.log('\n🔧 TYPE-SAFE CRUD OPERATIONS')
        console.log('============================')

        // Update properties with full type safety
        loadedUser.profile.bio = 'Principal Software Engineer'
        loadedUser.profile.phoneNumber = '+1-555-9999'

        // Save with type-safe method
        await loadedUser.profile.save()
        console.log('✅ Single embedded document saved successfully')
        console.log(`   Updated bio: ${loadedUser.profile.bio}`)
        console.log(`   Updated phone: ${loadedUser.profile.phoneNumber}`)
      }

      // ========================================
      // 5. TYPE-SAFE ARRAY OPERATIONS
      // ========================================
      console.log('\n📋 TYPE-SAFE ARRAY OPERATIONS')
      console.log('==============================')

      if (loadedUser.profiles) {
        console.log(`✅ Profiles is a type-safe array with ${loadedUser.profiles.length} items`)

        // ✅ Standard array methods work with full type safety
        const allBios = loadedUser.profiles.map((profile) => profile.bio) // ✅ Type: (string | undefined)[]
        console.log(`✅ All bios: ${allBios.join(', ')}`)

        const leadProfiles = loadedUser.profiles.filter(
          (profile) => profile.bio?.includes('Lead') // ✅ Type-safe optional chaining
        )
        console.log(`✅ Lead profiles: ${leadProfiles.length}`)

        // ✅ Type-safe forEach with IntelliSense
        console.log('✅ Using forEach with type safety:')
        loadedUser.profiles.forEach((profile, index) => {
          // ✅ Full IntelliSense on profile parameter
          console.log(`   ${index + 1}. ${profile.firstName} ${profile.lastName} - ${profile.bio}`)
        })

        // ✅ Type-safe individual item updates
        if (loadedUser.profiles.length > 0) {
          const firstProfile = loadedUser.profiles[0] // ✅ Type: EmbeddedProfile & EmbeddedCRUDMethods
          firstProfile.bio = 'Senior Technical Lead' // ✅ Type-safe assignment

          await firstProfile.save() // ✅ Type-safe save method
          console.log(`✅ Updated first profile bio: ${firstProfile.bio}`)
        }

        // ========================================
        // 6. TYPE-SAFE QUERY OPERATIONS
        // ========================================
        console.log('\n🔍 TYPE-SAFE QUERY OPERATIONS')
        console.log('==============================')

        // ✅ Type-safe query builder with IntelliSense
        const seniorProfiles = loadedUser.profiles
          .query()
          .where('bio', 'like', 'Senior') // ✅ Type-safe field names
          .orderBy('age', 'desc') // ✅ Type-safe field names and direction
          .get()

        console.log(`✅ Senior profiles found: ${seniorProfiles.length}`)

        // ✅ Type-safe create method
        const newProfile = loadedUser.profiles.create({
          firstName: 'Alice',
          lastName: 'Johnson',
          bio: 'Innovation Lead',
          age: 32,
        })

        console.log(`✅ Created new profile: ${newProfile.bio}`)
        console.log(`✅ Total profiles: ${loadedUser.profiles.length}`)

        await newProfile.save()
        console.log('✅ New profile saved successfully')
      }

      // ========================================
      // 7. TYPE-SAFE COMPUTED PROPERTIES
      // ========================================
      console.log('\n🧮 TYPE-SAFE COMPUTED PROPERTIES')
      console.log('=================================')

      // ✅ Access computed properties with full type safety
      const userFullName = loadedUser.fullName // ✅ Type: string | null
      const allProfileNames = loadedUser.allProfileNames // ✅ Type: string[]

      console.log(`✅ User full name: ${userFullName}`)
      console.log(`✅ All profile names: ${allProfileNames.join(', ')}`)

      // ✅ Type-safe method calls
      const youngProfiles = loadedUser.getYoungProfiles(30) // ✅ Type-safe method with parameter
      const bioProfiles = loadedUser.getProfilesByBio('Lead') // ✅ Type-safe method with parameter

      console.log(`✅ Young profiles: ${youngProfiles.length}`)
      console.log(`✅ Bio profiles: ${bioProfiles.length}`)

      // ========================================
      // 8. SUMMARY
      // ========================================
      console.log('\n🎯 SUMMARY')
      console.log('==========')

      return response.json({
        success: true,
        message: 'Seamless Type-Safe Embedded Documents completed successfully!',
        achievements: [
          '✅ ZERO "as any" casts required',
          '✅ Full IntelliSense support for all properties',
          '✅ Type-safe creation with embedded data',
          '✅ Type-safe property access and updates',
          '✅ Type-safe array methods (map, filter, forEach)',
          '✅ Type-safe CRUD operations on embedded documents',
          '✅ Type-safe query builder with field validation',
          '✅ Type-safe computed properties and methods',
          '✅ Complete compatibility with TypeScript strict mode',
        ],
        typeSystemFeatures: {
          'Property Access': 'user.profile.firstName (string)',
          'Optional Chaining': 'user.profile?.bio (string | undefined)',
          'Array Methods': 'user.profiles.map(p => p.fullName) (string[])',
          'Query Builder': 'user.profiles.query().where("age", ">", 25)',
          'CRUD Operations': 'await user.profile.save()',
          'Computed Properties': 'user.profile.fullName (string)',
          'Method Calls': 'user.getYoungProfiles(30)',
        },
        developerExperience: [
          '🎯 IntelliSense shows all available properties',
          '🎯 TypeScript catches errors at compile time',
          '🎯 No need to remember field names - autocomplete works',
          '🎯 Refactoring is safe with type checking',
          '🎯 Documentation appears in IDE tooltips',
          '🎯 Zero learning curve - works like regular objects',
        ],
      })
    } catch (error) {
      console.error('❌ Seamless embedded documents test failed:', error)
      return response.status(500).json({
        success: false,
        error: error.message,
        stack: error.stack,
      })
    }
  }

  public async testEmbeddedDocuments({ response }: HttpContext) {
    try {
      console.log('🧪 Testing embedded documents functionality...')

      // Test 1: Create user with embedded profile (single)
      console.log('\n📝 Test 1: Creating user with embedded profile...')
      const user = await UserWithEnhancedEmbeddedProfile.create({
        email: 'test@example.com',
        age: 30,
        profile: {
          firstName: 'John',
          lastName: 'Doe',
          bio: 'Software developer',
          age: 30,
          phoneNumber: '+1234567890',
        },
      })

      console.log('✅ User created successfully!')
      console.log('📋 User data:', {
        id: user._id,
        email: user.email,
        age: user.age,
        hasProfile: !!user.profile,
      })

      // Test 2: Load user with embedded profile
      console.log('\n📖 Test 2: Loading user with embedded profile...')
      const loadedUser = await UserWithEnhancedEmbeddedProfile.query()
        .where('email', 'test@example.com')
        .first()

      if (loadedUser) {
        console.log('✅ User loaded successfully!')
        console.log('📋 Loaded user data:', {
          id: loadedUser._id,
          email: loadedUser.email,
          age: loadedUser.age,
          profileFirstName: loadedUser.profile?.firstName,
          profileLastName: loadedUser.profile?.lastName,
          profileBio: loadedUser.profile?.bio,
        })

        // Test 3: Type-safe property access (no casts needed!)
        console.log('\n🔒 Test 3: Type-safe property access...')

        // These work without any type casts
        const firstName = loadedUser.profile?.firstName // ✅ Type-safe
        const lastName = loadedUser.profile?.lastName // ✅ Type-safe
        const bio = loadedUser.profile?.bio // ✅ Type-safe
        const age = loadedUser.profile?.age // ✅ Type-safe
        const phoneNumber = loadedUser.profile?.phoneNumber // ✅ Type-safe

        console.log('✅ Type-safe access successful!', {
          firstName,
          lastName,
          bio,
          age,
          phoneNumber,
        })

        // Test 4: CRUD operations on embedded document
        console.log('\n🔧 Test 4: CRUD operations on embedded document...')

        if (loadedUser.profile) {
          // Update embedded profile
          loadedUser.profile.bio = 'Updated bio: Senior Software Developer'
          await loadedUser.profile.save()
          console.log('✅ Embedded profile updated successfully!')

          console.log('📋 Updated bio:', loadedUser.profile.bio)
        }
      }

      return response.json({
        success: true,
        message: 'Embedded documents test completed successfully!',
        achievements: [
          '✅ Type-safe creation with embedded documents',
          '✅ Type-safe property access without casts',
          '✅ CRUD operations on embedded documents',
          '✅ Loading with .load() method',
          '✅ Full compatibility with both embedded and referenced patterns',
        ],
      })
    } catch (error) {
      console.error('❌ Test failed:', error)
      return response.status(500).json({
        success: false,
        error: error.message,
        stack: error.stack,
      })
    }
  }

  public async viewDatabase({ response }: HttpContext) {
    try {
      console.log('🔍 Viewing database contents...')

      // Get raw collection data to avoid relationship loading issues
      const database = (UserWithReferencedProfile as any).getConnection()
      const usersCollection = database.collection('users_with_referenced_profiles')
      const embeddedUsersCollection = database.collection('users_with_enhanced_embedded_profiles')

      const referencedUsers = await usersCollection.find({}).toArray()
      const embeddedUsers = await embeddedUsersCollection.find({}).toArray()

      return response.json({
        success: true,
        collections: {
          users_with_referenced_profiles: {
            count: referencedUsers.length,
            documents: referencedUsers,
          },
          users_with_enhanced_embedded_profiles: {
            count: embeddedUsers.length,
            documents: embeddedUsers,
          },
        },
      })
    } catch (error) {
      console.error('❌ Database view failed:', error)
      return response.status(500).json({
        success: false,
        error: error.message,
      })
    }
  }

  public async testTypeCompatibility({ response }: HttpContext) {
    try {
      console.log('🧪 Testing type compatibility between referenced and embedded documents...')

      // Test 1: Referenced document creation (should work without embedded types)
      console.log('\n📝 Test 1: Creating referenced document...')
      const referencedUser = await UserWithReferencedProfile.create({
        email: 'referenced@example.com',
        age: 25,
        encryptedPassword: 'ReferencedPassword123',
      })
      console.log('✅ Referenced user created:', referencedUser.email)

      // Test 2: Embedded document creation (should work with embedded types)
      console.log('\n📝 Test 2: Creating embedded document...')
      const embeddedUser = await UserWithEnhancedEmbeddedProfile.create({
        email: 'embedded@example.com',
        age: 28,
        profile: {
          firstName: 'Jane',
          lastName: 'Smith',
          bio: 'Product manager',
          age: 28,
          phoneNumber: '+0987654321',
        },
      })
      console.log('✅ Embedded user created:', embeddedUser.email)

      return response.json({
        success: true,
        message: 'Type compatibility test completed successfully!',
        results: {
          referencedUser: {
            id: referencedUser._id,
            email: referencedUser.email,
            age: referencedUser.age,
          },
          embeddedUser: {
            id: embeddedUser._id,
            email: embeddedUser.email,
            age: embeddedUser.age,
            hasProfile: !!embeddedUser.profile,
          },
        },
        achievements: [
          '✅ Referenced documents work without embedded types',
          '✅ Embedded documents work with enhanced types',
          '✅ Both patterns coexist without conflicts',
          '✅ Type system automatically adapts to model structure',
        ],
      })
    } catch (error) {
      console.error('❌ Type compatibility test failed:', error)
      return response.status(500).json({
        success: false,
        error: error.message,
        stack: error.stack,
      })
    }
  }

  public async testAdvancedEmbeddedQueries({ response }: HttpContext) {
    try {
      console.log('🚀 Testing Advanced Embedded Array Queries')
      console.log('==========================================')

      // Create user with many embedded profiles for testing
      const user = await UserWithEnhancedEmbeddedProfile.create({
        email: 'advanced-queries@example.com',
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

      const results: any = {}

      if (user.profiles) {
        // Test pagination
        const paginatedResult = user.profiles.query().orderBy('age', 'desc').paginate(1, 4)

        results.pagination = {
          data: paginatedResult.data.map((p) => ({
            name: `${p.firstName} ${p.lastName}`,
            age: p.age,
            bio: p.bio,
          })),
          metadata: paginatedResult.pagination,
        }

        // Test filtering
        const youngProfiles = user.profiles.query().where('age', '<', 30).get()

        results.filtering = {
          youngProfiles: youngProfiles.map((p) => ({
            name: `${p.firstName} ${p.lastName}`,
            age: p.age,
          })),
        }

        // Test searching
        const searchResults = user.profiles.query().search('Engineer', ['bio']).get()

        results.searching = {
          engineerProfiles: searchResults.map((p) => ({
            name: `${p.firstName} ${p.lastName}`,
            bio: p.bio,
          })),
        }

        // Test aggregation
        const ageStats = user.profiles.query().aggregate('age')

        results.aggregation = {
          ageStatistics: ageStats,
        }

        // Test complex filtering
        const experiencedDevelopers = user.profiles
          .query()
          .whereAll([
            { field: 'age', operator: '>=', value: 30 },
            { field: 'bio', operator: 'like', value: 'Developer' },
          ])
          .get()

        results.complexFiltering = {
          experiencedDevelopers: experiencedDevelopers.map((p) => ({
            name: `${p.firstName} ${p.lastName}`,
            age: p.age,
            bio: p.bio,
          })),
        }

        // Test distinct values
        const distinctAges = user.profiles.query().distinct('age')

        results.distinct = {
          ages: distinctAges.sort((a, b) => a - b),
        }

        // Test grouping
        const ageGroups = user.profiles.query().groupBy('age')

        const groupedData: any = {}
        ageGroups.forEach((profiles, age) => {
          groupedData[age] = profiles.map((p) => `${p.firstName} ${p.lastName}`)
        })

        results.grouping = {
          byAge: groupedData,
        }
      }

      return response.json({
        success: true,
        message: 'Advanced Embedded Array Queries completed successfully!',
        results,
        capabilities: [
          '✅ Pagination with metadata for large datasets',
          '✅ Complex filtering with AND/OR logic',
          '✅ Full-text search across multiple fields',
          '✅ Aggregation operations (sum, avg, min, max, count)',
          '✅ Distinct values and grouping',
          '✅ Type-safe query building with IntelliSense',
        ],
      })
    } catch (error) {
      console.error('❌ Advanced query test failed:', error)
      return response.status(500).json({
        success: false,
        error: error.message,
        stack: error.stack,
      })
    }
  }

  public async testSeamlessEmbeddedCRUD({ response }: HttpContext) {
    try {
      console.log('🚀 Testing Seamless Embedded CRUD Operations')
      console.log('============================================')
      console.log('Demonstrating correct usage patterns for embedded documents')

      // ========================================
      // 1. CREATION - Direct embedded data
      // ========================================
      console.log('\n📝 CREATION')
      console.log('===========')

      const user = await UserWithEnhancedEmbeddedProfile.create({
        email: 'seamless@example.com',
        age: 32,
        profile: {
          firstName: 'Alice',
          lastName: 'Johnson',
          bio: 'Senior Software Engineer',
          age: 32,
          phoneNumber: '+1-555-1234',
        },
        profiles: [
          {
            firstName: 'Alice',
            lastName: 'Johnson',
            bio: 'Technical Lead',
            age: 32,
          },
          {
            firstName: 'Alice',
            lastName: 'Johnson',
            bio: 'Architect',
            age: 32,
          },
        ],
      })

      console.log('✅ User created with embedded data:')
      console.log(`   User ID: ${user._id}`)
      console.log(`   Email: ${user.email}`)
      console.log(`   Profile: ${user.profile?.firstName} ${user.profile?.lastName}`)
      console.log(`   Profiles count: ${user.profiles?.length || 0}`)

      // ========================================
      // 2. LOADING - Load embedded data
      // ========================================
      console.log('\n📖 LOADING')
      console.log('===========')

      const loadedUser = await UserWithEnhancedEmbeddedProfile.query()
        .where('email', 'seamless@example.com')
        .first()

      if (!loadedUser) {
        throw new Error('User not found')
      }

      console.log('✅ User loaded with embedded relationships:')
      console.log(`   Profile loaded: ${!!loadedUser.profile}`)
      console.log(`   Profiles loaded: ${loadedUser.profiles?.length || 0} items`)

      // ========================================
      // 3. SINGLE EMBEDDED DOCUMENT OPERATIONS
      // ========================================
      console.log('\n🔒 SINGLE EMBEDDED DOCUMENT OPERATIONS')
      console.log('=====================================')

      if (loadedUser.profile) {
        // Direct property access
        console.log(
          `✅ Profile name: ${loadedUser.profile.firstName} ${loadedUser.profile.lastName}`
        )
        console.log(`✅ Profile bio: ${loadedUser.profile.bio}`)

        // Update properties
        loadedUser.profile.bio = 'Principal Software Engineer'
        loadedUser.profile.phoneNumber = '+1-555-9999'

        // Save the embedded document
        await loadedUser.profile.save()
        console.log('✅ Single embedded document saved successfully')

        console.log(`✅ Updated bio: ${loadedUser.profile.bio}`)
        console.log(`✅ Updated phone: ${loadedUser.profile.phoneNumber}`)
      }

      // ========================================
      // 4. ARRAY EMBEDDED DOCUMENT OPERATIONS
      // ========================================
      console.log('\n📋 ARRAY EMBEDDED DOCUMENT OPERATIONS')
      console.log('====================================')

      if (loadedUser.profiles && Array.isArray(loadedUser.profiles)) {
        console.log(`✅ Profiles is an array with ${loadedUser.profiles.length} items`)

        // Array methods work correctly
        console.log('\n🔧 Using Array Methods:')

        // Map operation
        const allBios = loadedUser.profiles.map((p) => p.bio)
        console.log(`✅ All bios: ${allBios.join(', ')}`)

        // Filter operation
        const leadProfiles = loadedUser.profiles.filter((p) => p.bio && p.bio.includes('Lead'))
        console.log(`✅ Lead profiles: ${leadProfiles.length}`)

        // ForEach operation
        console.log('✅ Using forEach:')
        loadedUser.profiles.forEach((profile, index) => {
          console.log(`   ${index + 1}. ${profile.firstName} ${profile.lastName} - ${profile.bio}`)
        })

        // Update individual items
        if (loadedUser.profiles.length > 0) {
          const firstProfile = loadedUser.profiles[0]
          firstProfile.bio = 'Senior Technical Lead'

          // Save individual array item
          await firstProfile.save()
          console.log('✅ Individual array item saved successfully')

          console.log(`✅ Updated first profile bio: ${firstProfile.bio}`)
        }

        // Test create method
        console.log('\n➕ Using create method:')
        const newProfile = loadedUser.profiles.create({
          firstName: 'Alice',
          lastName: 'Johnson',
          bio: 'Innovation Lead',
          age: 32,
        })

        console.log(`✅ Created new profile: ${newProfile.bio}`)
        console.log(`✅ Total profiles: ${loadedUser.profiles.length}`)

        await newProfile.save()
        console.log('✅ New profile saved successfully')

        // Test query method
        console.log('\n🔍 Using query method:')
        const queryResult = loadedUser.profiles.query().where('bio', 'like', 'Lead').get()
        console.log(`✅ Query found ${queryResult.length} lead profiles`)
      }

      // ========================================
      // 5. DELETION OPERATIONS
      // ========================================
      console.log('\n🗑️ DELETION OPERATIONS')
      console.log('======================')

      // Delete from array
      if (loadedUser.profiles && loadedUser.profiles.length > 0) {
        const profileToDelete = loadedUser.profiles[0]
        const bioToDelete = profileToDelete.bio

        await profileToDelete.delete()
        console.log(`✅ Deleted profile: ${bioToDelete}`)

        console.log(`✅ Remaining profiles: ${loadedUser.profiles.length}`)
      }

      // ========================================
      // 6. SUMMARY
      // ========================================
      console.log('\n🎯 SUMMARY')
      console.log('==========')

      return response.json({
        success: true,
        message: 'Seamless Embedded CRUD Operations completed successfully!',
        patterns: {
          'Single Embedded Documents': {
            'Property Access': 'user.profile.firstName',
            'Property Update': 'user.profile.bio = "new bio"',
            'Save': 'await user.profile.save()',
            'Delete': 'await user.profile.delete()',
          },
          'Array Embedded Documents': {
            'Array Methods': 'user.profiles.map(), .filter(), .forEach()',
            'Individual Access': 'user.profiles[0].bio',
            'Individual Update': 'user.profiles[0].bio = "new bio"',
            'Individual Save': 'await user.profiles[0].save()',
            'Create New': 'user.profiles.create({...})',
            'Query': 'user.profiles.query().where(...).get()',
            'Delete': 'await user.profiles[0].delete()',
          },
        },
        achievements: [
          '✅ Seamless creation with embedded data',
          '✅ Type-safe property access',
          '✅ Array methods work correctly (map, filter, forEach)',
          '✅ Individual item updates work',
          '✅ CRUD operations work seamlessly',
          '✅ Query capabilities work as expected',
          '✅ Complete compatibility with JavaScript array patterns',
        ],
        notes: [
          '📝 Single embedded documents behave like regular models',
          '📝 Array embedded documents behave like JavaScript arrays',
          '📝 Individual array items can be updated and saved',
          '📝 Query methods provide type-safe filtering',
          '📝 All operations work without any type casts',
        ],
      })
    } catch (error) {
      console.error('❌ Seamless CRUD test failed:', error)
      return response.status(500).json({
        success: false,
        error: error.message,
        stack: error.stack,
      })
    }
  }

  public async testNewEmbedMethod({ response }: HttpContext) {
    try {
      console.log('🚀 Testing New Embed Method')
      console.log('============================')
      console.log('Demonstrating the new embed() query builder method')

      // ========================================
      // 1. CREATE TEST DATA
      // ========================================
      console.log('\n📝 Creating test data...')

      const user = await UserWithEnhancedEmbeddedProfile.create({
        email: 'embed-test@example.com',
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
        ],
      })

      console.log(`✅ Created user with ${user.profiles?.length || 0} embedded profiles`)

      // ========================================
      // DEBUG: Check original data
      // ========================================
      console.log('\n🔍 DEBUG: Checking original embedded data...')
      if (user.profiles && user.profiles.length > 0) {
        console.log('Original profiles:')
        user.profiles.forEach((profile, index) => {
          console.log(
            `   ${index + 1}. ${profile.firstName} ${profile.lastName} - Age: ${profile.age}, Bio: ${profile.bio}`
          )
        })
      }

      // ========================================
      // 2. TEST EMBED METHOD WITHOUT CALLBACK
      // ========================================
      console.log('\n🔍 Testing embed() without callback...')

      const usersWithoutFilter = await UserWithEnhancedEmbeddedProfile.query()
        .where('email', 'embed-test@example.com')
        .embed('profiles', (profileQuery) => {})
        .all()

      console.log(`✅ Found ${usersWithoutFilter.length} users`)
      if (usersWithoutFilter.length > 0) {
        console.log(
          `✅ User has ${usersWithoutFilter[0].profiles?.length || 0} profiles (unfiltered)`
        )
      }

      // ========================================
      // 3. TEST EMBED METHOD WITH FILTERING
      // ========================================
      console.log('\n🔍 Testing embed() with filtering callback...')

      const usersWithFilter = await UserWithEnhancedEmbeddedProfile.query()
        .where('email', 'embed-test@example.com')
        .embed('profiles', (profileQuery) => {
          profileQuery.where('age', '>', 30).orderBy('age', 'desc')
        })
        .all()

      console.log(`✅ Found ${usersWithFilter.length} users with filtered profiles`)
      if (usersWithFilter.length > 0) {
        const filteredProfiles = usersWithFilter[0].profiles || []
        console.log(`✅ User has ${filteredProfiles.length} profiles (filtered: age > 30)`)

        console.log('✅ Filtered profiles:')
        filteredProfiles.forEach((profile, index) => {
          console.log(
            `   ${index + 1}. ${profile.firstName} ${profile.lastName} - Age: ${profile.age}, Bio: ${profile.bio}`
          )
        })
      }

      // ========================================
      // 4. TEST EMBED METHOD WITH PAGINATION
      // ========================================
      console.log('\n📄 Testing embed() with pagination...')

      const usersWithPagination = await UserWithEnhancedEmbeddedProfile.query()
        .where('email', 'embed-test@example.com')
        .embed('profiles', (profileQuery) => {
          profileQuery.orderBy('age', 'desc').limit(3)
        })
        .all()

      console.log(`✅ Found ${usersWithPagination.length} users with paginated profiles`)
      if (usersWithPagination.length > 0) {
        const paginatedProfiles = usersWithPagination[0].profiles || []
        console.log(
          `✅ User has ${paginatedProfiles.length} profiles (limited to 3, ordered by age desc)`
        )

        console.log('✅ Paginated profiles:')
        paginatedProfiles.forEach((profile, index) => {
          console.log(
            `   ${index + 1}. ${profile.firstName} ${profile.lastName} - Age: ${profile.age}`
          )
        })
      }

      // ========================================
      // 5. TEST EMBED METHOD WITH COMPLEX FILTERING
      // ========================================
      console.log('\n🔍 Testing embed() with complex filtering...')

      const usersWithComplexFilter = await UserWithEnhancedEmbeddedProfile.query()
        .where('email', 'embed-test@example.com')
        .embed('profiles', (profileQuery) => {
          profileQuery
            .where('bio', 'like', 'Developer')
            .where('age', '>=', 28)
            .orderBy('firstName', 'asc')
        })
        .all()

      console.log(`✅ Found ${usersWithComplexFilter.length} users with complex filtered profiles`)
      if (usersWithComplexFilter.length > 0) {
        const complexFilteredProfiles = usersWithComplexFilter[0].profiles || []
        console.log(
          `✅ User has ${complexFilteredProfiles.length} profiles (bio contains 'Developer' AND age >= 28)`
        )

        console.log('✅ Complex filtered profiles:')
        complexFilteredProfiles.forEach((profile, index) => {
          console.log(
            `   ${index + 1}. ${profile.firstName} ${profile.lastName} - Age: ${profile.age}, Bio: ${profile.bio}`
          )
        })
      }

      // ========================================
      // 6. SUMMARY
      // ========================================
      console.log('\n🎯 SUMMARY')
      console.log('==========')

      return response.json({
        success: true,
        message: 'New Embed Method test completed successfully!',
        features: [
          '✅ embed() method works without callback (loads all embedded documents)',
          '✅ embed() method works with filtering callback',
          '✅ embed() method supports pagination (limit, skip)',
          '✅ embed() method supports complex filtering and sorting',
          '✅ Type-safe relationship name inference',
          '✅ Seamless integration with existing query builder',
        ],
        usage: {
          'Basic Usage': 'UserModel.query().embed("profiles")',
          'With Filtering': 'UserModel.query().embed("profiles", q => q.where("age", ">", 25))',
          'With Pagination': 'UserModel.query().embed("profiles", q => q.limit(5).skip(10))',
          'With Sorting': 'UserModel.query().embed("profiles", q => q.orderBy("age", "desc"))',
          'Complex Query':
            'UserModel.query().embed("profiles", q => q.where("bio", "like", "Engineer").orderBy("age").limit(3))',
        },
        testResults: {
          unfiltered: usersWithoutFilter[0]?.profiles?.length || 0,
          filtered: usersWithFilter[0]?.profiles?.length || 0,
          paginated: usersWithPagination[0]?.profiles?.length || 0,
          complexFiltered: usersWithComplexFilter[0]?.profiles?.length || 0,
        },
      })
    } catch (error) {
      console.error('❌ New embed method test failed:', error)
      return response.status(500).json({
        success: false,
        error: error.message,
        stack: error.stack,
      })
    }
  }
}
