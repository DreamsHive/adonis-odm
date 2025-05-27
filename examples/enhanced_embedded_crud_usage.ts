import { BaseModel } from '../src/base_model/base_model.js'
import { column } from '../src/decorators/column.js'
import { DateTime } from 'luxon'
import type { EmbeddedSingle, EmbeddedMany } from '../src/types/embedded.js'

/**
 * Enhanced Embedded Documents CRUD Usage Example
 *
 * This example demonstrates the new CRUD capabilities for embedded documents
 * that work exactly like referenced documents but store data as embedded.
 */

// Profile model that will be embedded
class Profile extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare firstName: string

  @column()
  declare lastName: string

  @column()
  declare bio?: string

  @column()
  declare age: number

  @column()
  declare avatar?: string

  @column()
  declare phoneNumber?: string

  @column()
  declare address?: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`
  }

  static getCollectionName(): string {
    return 'profiles'
  }
}

// User model with enhanced embedded profiles
class UserWithEmbeddedProfile extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare name: string

  @column()
  declare email: string

  @column()
  declare age?: number

  // Single embedded profile using the Profile model
  @column.embedded(() => Profile, 'single')
  declare profile?: EmbeddedSingle<typeof Profile>

  // Multiple embedded profiles
  @column.embedded(() => Profile, 'many')
  declare profiles?: EmbeddedMany<typeof Profile>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  static getCollectionName(): string {
    return 'users_with_embedded_profile'
  }
}

async function demonstrateEmbeddedCRUD() {
  console.log('🚀 Enhanced Embedded Documents CRUD Example')
  console.log('===========================================')

  try {
    // ========================================
    // 1. CREATE - Direct embedded data creation
    // ========================================
    console.log('\n📝 CREATE OPERATIONS')
    console.log('===================')

    // Create user with embedded profile data directly
    const user = await UserWithEmbeddedProfile.create({
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
      profile: {
        firstName: 'John',
        lastName: 'Doe',
        bio: 'Full-stack developer',
        age: 30,
        phoneNumber: '+1-555-0123',
      } as any, // Temporary cast until we fix the type system
      profiles: [
        {
          firstName: 'John',
          lastName: 'Doe',
          bio: 'Developer Profile',
          age: 30,
        },
        {
          firstName: 'John',
          lastName: 'Doe',
          bio: 'Manager Profile',
          age: 30,
        },
      ] as any, // Temporary cast until we fix the type system
    })

    console.log('✅ Created user with embedded data:')
    console.log(`   User ID: ${user._id}`)
    console.log(`   Profile: ${user.profile?.fullName}`)
    console.log(`   Profiles count: ${user.profiles?.length || 0}`)

    // ========================================
    // 2. READ - Load and access embedded data
    // ========================================
    console.log('\n📖 READ OPERATIONS')
    console.log('==================')

    // Load user with embedded data
    const users = await UserWithEmbeddedProfile.query()
      .embed('profile', () => {})
      .all()

    users.forEach((loadedUser) => {
      console.log(`✅ User: ${loadedUser.name}`)
      console.log(`   Profile: ${loadedUser.profile?.fullName}`)
      console.log(`   Bio: ${loadedUser.profile?.bio}`)
    })

    // Load with query constraints on embedded data
    const usersWithProfiles = await UserWithEmbeddedProfile.query()
      .embed('profiles', (profileQuery) => {
        profileQuery.where('bio', 'like', 'Developer')
        profileQuery.limit(5)
      })
      .all()

    console.log(`✅ Found ${usersWithProfiles.length} users with developer profiles`)

    // ========================================
    // 3. UPDATE - Modify embedded documents
    // ========================================
    console.log('\n✏️ UPDATE OPERATIONS')
    console.log('====================')

    // Load a user and update embedded profile
    const userToUpdate = await UserWithEmbeddedProfile.query()
      .where('_id', user._id)
      .embed('profile', () => {})
      .first()

    if (userToUpdate?.profile) {
      // Update embedded profile properties
      userToUpdate.profile.bio = 'Senior Full-stack Developer'
      userToUpdate.profile.phoneNumber = '+1-555-9999'

      // Save the embedded document (this saves the parent document)
      await userToUpdate.profile.save()

      console.log('✅ Updated embedded profile:')
      console.log(`   New bio: ${userToUpdate.profile.bio}`)
      console.log(`   New phone: ${userToUpdate.profile.phoneNumber}`)
    }

    // Update embedded array item
    const userWithProfiles = await UserWithEmbeddedProfile.query()
      .where('_id', user._id)
      .embed('profiles', () => {})
      .first()

    if (userWithProfiles?.profiles && userWithProfiles.profiles.length > 0) {
      const firstProfile = userWithProfiles.profiles[0]
      firstProfile.bio = 'Updated Developer Profile'

      // Save the embedded document
      await firstProfile.save()

      console.log('✅ Updated embedded array item:')
      console.log(`   Updated bio: ${firstProfile.bio}`)
    }

    // ========================================
    // 4. DELETE - Remove embedded documents
    // ========================================
    console.log('\n🗑️ DELETE OPERATIONS')
    console.log('====================')

    // Delete embedded profile
    const userWithProfile = await UserWithEmbeddedProfile.query()
      .where('_id', user._id)
      .embed('profile', () => {})
      .first()

    if (userWithProfile?.profile) {
      console.log('✅ Deleting embedded profile...')
      await userWithProfile.profile.delete()

      // Verify deletion
      const updatedUser = await UserWithEmbeddedProfile.find(user._id)
      console.log(`   Profile after deletion: ${updatedUser?.profile || 'null'}`)
    }

    // Delete embedded array item
    const userWithMultipleProfiles = await UserWithEmbeddedProfile.query()
      .where('_id', user._id)
      .embed('profiles', () => {})
      .first()

    if (userWithMultipleProfiles?.profiles && userWithMultipleProfiles.profiles.length > 0) {
      const profileToDelete = userWithMultipleProfiles.profiles[0]
      console.log('✅ Deleting embedded array item...')
      await profileToDelete.delete()

      // Verify deletion
      const updatedUser = await UserWithEmbeddedProfile.find(user._id)
      console.log(`   Profiles count after deletion: ${updatedUser?.profiles?.length || 0}`)
    }

    // ========================================
    // 5. ADVANCED OPERATIONS
    // ========================================
    console.log('\n🔧 ADVANCED OPERATIONS')
    console.log('======================')

    // Create new embedded documents
    const newUser = await UserWithEmbeddedProfile.create({
      name: 'Jane Smith',
      email: 'jane@example.com',
      age: 28,
    })

    // Create embedded profile using create method
    if (newUser.profiles) {
      const newProfile = newUser.profiles.create({
        firstName: 'Jane',
        lastName: 'Smith',
        bio: 'UX Designer',
        age: 28,
      })

      console.log('✅ Created new embedded profile:')
      console.log(`   Profile: ${newProfile.fullName}`)
    }

    // Query embedded documents
    const userForQuery = await UserWithEmbeddedProfile.query()
      .where('_id', newUser._id)
      .embed('profiles', () => {})
      .first()

    if (userForQuery?.profiles) {
      // Query embedded array
      const designerProfiles = userForQuery.profiles.query().where('bio', 'like', 'Designer').get()

      console.log(`✅ Found ${designerProfiles.length} designer profiles`)

      // Use array methods
      userForQuery.profiles.forEach((profile, index: number) => {
        console.log(`   ${index + 1}. ${profile.fullName} - ${profile.bio}`)
      })
    }

    // Refresh embedded document
    if (userForQuery?.profiles && userForQuery.profiles.length > 0) {
      const profileToRefresh = userForQuery.profiles[0]
      await profileToRefresh.refresh()
      console.log('✅ Refreshed embedded document')
    }

    // Fill embedded document with new data
    if (userForQuery?.profiles && userForQuery.profiles.length > 0) {
      const profileToFill = userForQuery.profiles[0]
      profileToFill.fill({
        bio: 'Senior UX Designer',
        phoneNumber: '+1-555-7777',
      })
      await profileToFill.save()
      console.log('✅ Filled and saved embedded document')
    }

    // ========================================
    // 6. COMPARISON WITH REFERENCED DOCUMENTS
    // ========================================
    console.log('\n🔄 COMPARISON WITH REFERENCED DOCUMENTS')
    console.log('=======================================')

    console.log('✅ Embedded documents now work exactly like referenced documents:')
    console.log('')
    console.log('   // Create with embedded data')
    console.log('   const user = await User.create({')
    console.log('     name: "John",')
    console.log('     profile: { firstName: "John", lastName: "Doe" },')
    console.log('     profiles: [{ firstName: "John", lastName: "Doe" }]')
    console.log('   })')
    console.log('')
    console.log('   // Load embedded data')
    console.log('   const users = await User.query().load("profile").all()')
    console.log('')
    console.log('   // Update embedded document')
    console.log('   user.profile.bio = "Updated bio"')
    console.log('   await user.profile.save()')
    console.log('')
    console.log('   // Delete embedded document')
    console.log('   await user.profile.delete()')
    console.log('')
    console.log('   // Query embedded array')
    console.log('   const filtered = user.profiles.query().where("age", ">", 25).get()')

    console.log('\n🎉 Enhanced embedded CRUD operations example completed!')
  } catch (error) {
    console.error('❌ Error in embedded CRUD example:', error)
  }
}

// Export for use in other files
export { Profile, UserWithEmbeddedProfile, demonstrateEmbeddedCRUD }

// Run the example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateEmbeddedCRUD()
}
