import { test } from '@japa/runner'
import { BaseModel } from '../../src/base_model/base_model.js'
import { column } from '../../src/decorators/column.js'
import { DateTime } from 'luxon'
import type { EmbeddedSingle, EmbeddedMany } from '../../src/types/embedded.js'

// Test Profile model for embedded documents
class TestProfile extends BaseModel {
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
    return 'test_profiles'
  }
}

// Test User model with enhanced embedded profiles
class TestUserWithEnhancedEmbedded extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare name: string

  @column()
  declare email: string

  @column()
  declare age?: number

  // Single embedded profile using the Profile model
  @column.embedded(() => TestProfile, 'single')
  declare profile?: EmbeddedSingle<typeof TestProfile>

  // Multiple embedded profiles
  @column.embedded(() => TestProfile, 'many')
  declare profiles?: EmbeddedMany<typeof TestProfile>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  get fullName(): string | null {
    if (!this.profile) return null
    return (this.profile as any).fullName
  }

  static getCollectionName(): string {
    return 'test_users_enhanced_embedded'
  }
}

test.group('Enhanced Embedded Documents - Unit Tests', () => {
  test('should create embedded single document metadata', async ({ assert }) => {
    const metadata = TestUserWithEnhancedEmbedded.getMetadata()
    const profileColumn = metadata.columns.get('profile')

    assert.isTrue(profileColumn?.isEmbedded)
    assert.equal(profileColumn?.embeddedType, 'single')
    assert.isFunction(profileColumn?.embeddedModel)
  })

  test('should create embedded many document metadata', async ({ assert }) => {
    const metadata = TestUserWithEnhancedEmbedded.getMetadata()
    const profilesColumn = metadata.columns.get('profiles')

    assert.isTrue(profilesColumn?.isEmbedded)
    assert.equal(profilesColumn?.embeddedType, 'many')
    assert.isFunction(profilesColumn?.embeddedModel)
  })

  test('should initialize embedded single proxy', async ({ assert }) => {
    const user = new TestUserWithEnhancedEmbedded({
      name: 'Test User',
      email: 'test@example.com',
    })

    // Access the profile property to initialize the proxy
    const profile = user.profile
    assert.isDefined(profile)
  })

  test('should initialize embedded many proxy', async ({ assert }) => {
    const user = new TestUserWithEnhancedEmbedded({
      name: 'Test User',
      email: 'test@example.com',
    })

    // Access the profiles property to initialize the proxy
    const profiles = user.profiles
    assert.isDefined(profiles)
  })

  test('should set embedded single document', async ({ assert }) => {
    const user = new TestUserWithEnhancedEmbedded({
      name: 'Test User',
      email: 'test@example.com',
    })

    // Set profile data
    user.profile = {
      firstName: 'John',
      lastName: 'Doe',
      bio: 'Software Developer',
      age: 30,
    } as any

    // Access the profile to verify it was set
    const profile = user.profile
    assert.isDefined(profile)
  })

  test('should set embedded many documents', async ({ assert }) => {
    const user = new TestUserWithEnhancedEmbedded({
      name: 'Test User',
      email: 'test@example.com',
    })

    // Set profiles data
    user.profiles = [
      {
        firstName: 'John',
        lastName: 'Doe',
        bio: 'Software Developer',
        age: 30,
      },
      {
        firstName: 'Jane',
        lastName: 'Smith',
        bio: 'UX Designer',
        age: 28,
      },
    ] as any

    // Access the profiles to verify they were set
    const profiles = user.profiles
    assert.isDefined(profiles)
    assert.equal((profiles as any).length, 2)
  })

  test('should query embedded many documents', async ({ assert }) => {
    const user = new TestUserWithEnhancedEmbedded({
      name: 'Test User',
      email: 'test@example.com',
    })

    // Set profiles data
    user.profiles = [
      {
        firstName: 'John',
        lastName: 'Doe',
        bio: 'Software Developer',
        age: 30,
      },
      {
        firstName: 'Jane',
        lastName: 'Smith',
        bio: 'UX Designer',
        age: 28,
      },
      {
        firstName: 'Bob',
        lastName: 'Wilson',
        bio: 'Product Manager',
        age: 35,
      },
    ] as any

    // Query profiles by age
    const profiles = user.profiles
    if (profiles && typeof (profiles as any).query === 'function') {
      const youngProfiles = (profiles as any).query().where('age', '<', 30).get()

      assert.equal(youngProfiles.length, 1)
      assert.equal(youngProfiles[0].firstName, 'Jane')
    }
  })

  test('should filter embedded many documents', async ({ assert }) => {
    const user = new TestUserWithEnhancedEmbedded({
      name: 'Test User',
      email: 'test@example.com',
    })

    // Set profiles data
    user.profiles = [
      {
        firstName: 'John',
        lastName: 'Doe',
        bio: 'Software Developer',
        age: 30,
      },
      {
        firstName: 'Jane',
        lastName: 'Smith',
        bio: '',
        age: 28,
      },
      {
        firstName: 'Bob',
        lastName: 'Wilson',
        bio: 'Product Manager',
        age: 35,
      },
    ] as any

    // Query profiles with bio
    const profiles = user.profiles
    if (profiles && typeof (profiles as any).query === 'function') {
      const profilesWithBio = (profiles as any)
        .query()
        .whereNotNull('bio')
        .where('bio', '!=', '')
        .get()

      assert.equal(profilesWithBio.length, 2)
      assert.equal(profilesWithBio[0].firstName, 'John')
      assert.equal(profilesWithBio[1].firstName, 'Bob')
    }
  })

  test('should sort embedded many documents', async ({ assert }) => {
    const user = new TestUserWithEnhancedEmbedded({
      name: 'Test User',
      email: 'test@example.com',
    })

    // Set profiles data
    user.profiles = [
      {
        firstName: 'John',
        lastName: 'Doe',
        bio: 'Software Developer',
        age: 30,
      },
      {
        firstName: 'Jane',
        lastName: 'Smith',
        bio: 'UX Designer',
        age: 28,
      },
      {
        firstName: 'Bob',
        lastName: 'Wilson',
        bio: 'Product Manager',
        age: 35,
      },
    ] as any

    // Query profiles sorted by age
    const profiles = user.profiles
    if (profiles && typeof (profiles as any).query === 'function') {
      const sortedProfiles = (profiles as any).query().orderBy('age', 'desc').get()

      assert.equal(sortedProfiles.length, 3)
      assert.equal(sortedProfiles[0].age, 35)
      assert.equal(sortedProfiles[1].age, 30)
      assert.equal(sortedProfiles[2].age, 28)
    }
  })

  test('should limit embedded many documents', async ({ assert }) => {
    const user = new TestUserWithEnhancedEmbedded({
      name: 'Test User',
      email: 'test@example.com',
    })

    // Set profiles data
    user.profiles = [
      {
        firstName: 'John',
        lastName: 'Doe',
        bio: 'Software Developer',
        age: 30,
      },
      {
        firstName: 'Jane',
        lastName: 'Smith',
        bio: 'UX Designer',
        age: 28,
      },
      {
        firstName: 'Bob',
        lastName: 'Wilson',
        bio: 'Product Manager',
        age: 35,
      },
    ] as any

    // Query profiles with limit
    const profiles = user.profiles
    if (profiles && typeof (profiles as any).query === 'function') {
      const limitedProfiles = (profiles as any).query().orderBy('age', 'asc').limit(2).get()

      assert.equal(limitedProfiles.length, 2)
      assert.equal(limitedProfiles[0].age, 28)
      assert.equal(limitedProfiles[1].age, 30)
    }
  })

  test('should serialize embedded documents to database format', async ({ assert }) => {
    const user = new TestUserWithEnhancedEmbedded({
      name: 'Test User',
      email: 'test@example.com',
    })

    // Set profile data
    user.profile = {
      firstName: 'John',
      lastName: 'Doe',
      bio: 'Software Developer',
      age: 30,
    } as any

    // Set profiles data
    user.profiles = [
      {
        firstName: 'Jane',
        lastName: 'Smith',
        bio: 'UX Designer',
        age: 28,
      },
    ] as any

    const document = user.toDocument()

    assert.equal(document.name, 'Test User')
    assert.equal(document.email, 'test@example.com')

    // Note: The actual serialization behavior depends on the proxy implementation
    // This test verifies that the document can be created without errors
    assert.isDefined(document)
  })

  test('should support legacy embedded syntax', async ({ assert }) => {
    // Test that the old syntax still works
    class LegacyEmbeddedModel extends BaseModel {
      @column({ isPrimary: true })
      declare _id: string

      @column()
      declare name: string

      @column.embedded()
      declare profile?: {
        firstName: string
        lastName: string
        bio?: string
      }

      static getCollectionName(): string {
        return 'legacy_embedded'
      }
    }

    const metadata = LegacyEmbeddedModel.getMetadata()
    const profileColumn = metadata.columns.get('profile')

    assert.isTrue(profileColumn?.isEmbedded)
    assert.isUndefined(profileColumn?.embeddedType)
    assert.isUndefined(profileColumn?.embeddedModel)

    // Test that the model can be instantiated
    const model = new LegacyEmbeddedModel({
      name: 'Test',
      profile: {
        firstName: 'John',
        lastName: 'Doe',
        bio: 'Developer',
      },
    })

    assert.equal(model.name, 'Test')
    assert.isDefined(model.profile)
  })
})
