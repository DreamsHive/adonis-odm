import { BaseModel } from '../src/base_model/base_model.js'
import { column } from '../src/decorators/column.js'
import { DateTime } from 'luxon'
import type { EmbeddedSingle, EmbeddedMany } from '../src/types/embedded.js'

/**
 * Enhanced Embedded Documents Usage Example
 *
 * This example demonstrates the new enhanced embedded document functionality
 * that allows using defined model classes instead of inline type definitions.
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

  @column()
  declare socialLinks?: {
    twitter?: string
    linkedin?: string
    github?: string
    website?: string
  }

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`
  }

  get formattedAddress(): string | null {
    if (!this.address) return null
    const { street, city, state, zipCode, country } = this.address
    return `${street}, ${city}, ${state} ${zipCode}, ${country}`
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

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  get fullName(): string | null {
    if (!this.profile) return null
    return (this.profile as any).fullName
  }

  static getCollectionName(): string {
    return 'users_with_embedded_profile'
  }
}

// User model with multiple embedded profiles
class UserWithMultipleProfiles extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare name: string

  @column()
  declare email: string

  @column()
  declare age?: number

  // Multiple embedded profiles using the Profile model
  @column.embedded(() => Profile, 'many')
  declare profiles?: EmbeddedMany<typeof Profile>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  get allProfileNames(): string[] {
    if (!this.profiles) return []
    return (this.profiles as any).map((profile: any) => profile.fullName)
  }

  static getCollectionName(): string {
    return 'users_with_multiple_profiles'
  }
}

async function demonstrateEnhancedEmbeddedDocuments() {
  console.log('🚀 Enhanced Embedded Documents Usage Example')
  console.log('===========================================')

  try {
    // ========================================
    // 1. Single Embedded Document
    // ========================================
    console.log('\n📄 SINGLE EMBEDDED DOCUMENT')
    console.log('===========================')

    // Create user with single embedded profile
    const user = new UserWithEmbeddedProfile({
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
    })

    // Set embedded profile data
    user.profile = {
      firstName: 'John',
      lastName: 'Doe',
      bio: 'Full-stack developer with 5+ years experience',
      age: 30,
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
    } as any

    console.log('✅ Created user with embedded profile:')
    console.log(`   Name: ${user.name}`)
    console.log(`   Full Name: ${user.fullName}`)
    console.log(`   Profile Bio: ${(user.profile as any)?.bio}`)

    // ========================================
    // 2. Multiple Embedded Documents
    // ========================================
    console.log('\n📄 MULTIPLE EMBEDDED DOCUMENTS')
    console.log('==============================')

    // Create user with multiple embedded profiles
    const multiUser = new UserWithMultipleProfiles({
      name: 'Jane Smith',
      email: 'jane@example.com',
      age: 28,
    })

    // Set multiple embedded profiles
    multiUser.profiles = [
      {
        firstName: 'Jane',
        lastName: 'Smith',
        bio: 'UX Designer',
        age: 28,
        phoneNumber: '+1-555-0456',
      },
      {
        firstName: 'Jane',
        lastName: 'Smith',
        bio: 'Frontend Developer',
        age: 28,
        phoneNumber: '+1-555-0456',
      },
      {
        firstName: 'Jane',
        lastName: 'Smith',
        bio: 'Product Manager',
        age: 28,
        phoneNumber: '+1-555-0456',
      },
    ] as any

    console.log('✅ Created user with multiple embedded profiles:')
    console.log(`   Name: ${multiUser.name}`)
    console.log(`   Profile Count: ${(multiUser.profiles as any)?.length || 0}`)
    console.log(`   All Profile Names: ${multiUser.allProfileNames.join(', ')}`)

    // ========================================
    // 3. Querying Embedded Documents
    // ========================================
    console.log('\n🔍 QUERYING EMBEDDED DOCUMENTS')
    console.log('==============================')

    // Query embedded profiles
    const profiles = multiUser.profiles
    if (profiles && typeof (profiles as any).query === 'function') {
      // Filter profiles by bio content
      const devProfiles = (profiles as any).query().where('bio', 'like', 'Developer').get()

      console.log('✅ Developer profiles:')
      devProfiles.forEach((profile: any, index: number) => {
        console.log(`   ${index + 1}. ${profile.fullName} - ${profile.bio}`)
      })

      // Get profiles sorted by bio
      const sortedProfiles = (profiles as any).query().orderBy('bio', 'asc').get()

      console.log('✅ Profiles sorted by bio:')
      sortedProfiles.forEach((profile: any, index: number) => {
        console.log(`   ${index + 1}. ${profile.fullName} - ${profile.bio}`)
      })

      // Get first profile only
      const firstProfile = (profiles as any).query().orderBy('bio', 'asc').first()

      console.log('✅ First profile:')
      console.log(`   ${firstProfile?.fullName} - ${firstProfile?.bio}`)

      // Count profiles with specific criteria
      const managerCount = (profiles as any).query().where('bio', 'like', 'Manager').count()

      console.log(`✅ Manager profiles count: ${managerCount}`)
    }

    // ========================================
    // 4. Load Method with Embedded Documents
    // ========================================
    console.log('\n🔄 LOAD METHOD WITH EMBEDDED DOCUMENTS')
    console.log('=====================================')

    console.log('✅ Enhanced load method now supports embedded documents:')
    console.log('   await UserWithMultipleProfiles.query().load("profiles").all()')
    console.log('   await UserWithMultipleProfiles.query().load("profiles", (profileQuery) => {')
    console.log('     profileQuery.where("bio", "like", "Developer")')
    console.log('     profileQuery.limit(5)')
    console.log('   }).all()')

    // ========================================
    // 5. Comparison with Legacy Syntax
    // ========================================
    console.log('\n🔄 COMPARISON WITH LEGACY SYNTAX')
    console.log('================================')

    console.log('✅ Legacy syntax (still supported):')
    console.log('   @column.embedded()')
    console.log('   declare profile?: {')
    console.log('     firstName: string')
    console.log('     lastName: string')
    console.log('     bio?: string')
    console.log('   }')

    console.log('\n✅ New enhanced syntax:')
    console.log('   @column.embedded(() => Profile, "single")')
    console.log('   declare profile?: EmbeddedSingle<typeof Profile>')
    console.log('')
    console.log('   @column.embedded(() => Profile, "many")')
    console.log('   declare profiles?: EmbeddedMany<typeof Profile>')

    // ========================================
    // 6. Benefits Summary
    // ========================================
    console.log('\n💡 BENEFITS OF ENHANCED EMBEDDED DOCUMENTS')
    console.log('==========================================')
    console.log('✅ Type safety - Use defined model classes instead of inline types')
    console.log(
      '✅ Code reuse - Share model definitions between embedded and referenced approaches'
    )
    console.log(
      '✅ Query capabilities - Query embedded arrays with filtering, sorting, and limiting'
    )
    console.log('✅ Method access - Access model methods and getters on embedded documents')
    console.log('✅ Backward compatibility - Legacy syntax continues to work')
    console.log('✅ Load method support - Use .load() method with embedded documents')
    console.log('✅ IntelliSense support - Full IDE support for embedded document properties')

    console.log('\n🎉 Enhanced embedded documents example completed!')
  } catch (error) {
    console.error('❌ Error in enhanced embedded documents example:', error)
  }
}

// Export for use in other files
export {
  Profile,
  UserWithEmbeddedProfile,
  UserWithMultipleProfiles,
  demonstrateEnhancedEmbeddedDocuments,
}

// Run the example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateEnhancedEmbeddedDocuments()
}
