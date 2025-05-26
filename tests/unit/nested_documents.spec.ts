import { test } from '@japa/runner'
import { BaseModel } from '../../src/base_model/base_model.js'
import { column } from '../../src/decorators/column.js'
import { DateTime } from 'luxon'
import { MongoDatabaseManager } from '../../src/database_manager.js'
import { MongoConfig } from '../../src/types/index.js'
import { ModelQueryBuilder } from '../../src/query_builder/model_query_builder.js'
import { NestedDocumentHelpers } from '../../src/utils/nested_document_helpers.js'
import { ObjectId } from 'mongodb'

// Test Profile model
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

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim()
  }

  get formattedAddress(): string | null {
    if (!this.address) return null

    const { street, city, state, zipCode, country } = this.address
    return `${street}, ${city}, ${state} ${zipCode}, ${country}`
  }

  static getCollectionName(): string {
    return 'test_profiles'
  }
}

// Test User model with embedded profile
class TestUserWithEmbeddedProfile extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare name: string

  @column()
  declare email: string

  @column()
  declare age?: number

  @column.embedded()
  declare profile?: {
    firstName: string
    lastName: string
    bio?: string
    avatar?: string
    phoneNumber?: string
    address?: {
      street: string
      city: string
      state: string
      zipCode: string
      country: string
    }
    socialLinks?: {
      twitter?: string
      linkedin?: string
      github?: string
      website?: string
    }
  }

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  get fullName(): string | null {
    if (!this.profile) return null
    return `${this.profile.firstName} ${this.profile.lastName}`.trim()
  }

  updateProfile(profileData: Partial<NonNullable<typeof this.profile>>): void {
    if (!this.profile) {
      this.profile = {} as NonNullable<typeof this.profile>
    }

    Object.assign(this.profile, profileData)
    this.setAttribute('profile', this.profile)
  }

  get formattedAddress(): string | null {
    if (!this.profile?.address) return null

    const { street, city, state, zipCode, country } = this.profile.address
    return `${street}, ${city}, ${state} ${zipCode}, ${country}`
  }

  static getCollectionName(): string {
    return 'test_users_embedded'
  }
}

// Test User model with referenced profile
class TestUserWithReferencedProfile extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare name: string

  @column()
  declare email: string

  @column()
  declare age?: number

  @column()
  declare profileId?: ObjectId | string

  declare profile?: TestProfile

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  async loadProfile(): Promise<TestProfile | null> {
    if (!this.profileId) return null

    const profile = await TestProfile.find(this.profileId)
    this.profile = profile || undefined
    return profile
  }

  async createProfile(profileData: Partial<TestProfile>): Promise<TestProfile> {
    const profile = await TestProfile.create(profileData)
    this.profileId = profile._id
    await this.save()
    this.profile = profile
    return profile
  }

  async updateProfile(profileData: Partial<TestProfile>): Promise<TestProfile | null> {
    if (!this.profileId) return null

    const profile = await TestProfile.find(this.profileId)
    if (!profile) return null

    profile.merge(profileData)
    await profile.save()
    this.profile = profile
    return profile
  }

  async deleteProfile(): Promise<boolean> {
    if (!this.profileId) return false

    const profile = await TestProfile.find(this.profileId)
    if (!profile) return false

    const deleted = await profile.delete()
    if (deleted) {
      this.profileId = undefined
      await this.save()
      this.profile = undefined
    }

    return deleted
  }

  get fullName(): string | null {
    return this.profile?.fullName || null
  }

  get formattedAddress(): string | null {
    return this.profile?.formattedAddress || null
  }

  static getCollectionName(): string {
    return 'test_users_referenced'
  }
}

test.group('Nested Documents - Unit Tests', (group) => {
  let manager: MongoDatabaseManager
  let mockProfiles: Map<string, any> = new Map()
  let mockUsers: Map<string, any> = new Map()
  let idCounter = 1

  group.setup(async () => {
    const config: MongoConfig = {
      connection: 'mongodb',
      connections: {
        mongodb: {
          client: 'mongodb',
          connection: {
            host: 'localhost',
            port: 27017,
            database: 'test_adonis_mongo_nested',
          },
          useNewUrlParser: true,
          useUnifiedTopology: true,
        },
      },
    }

    manager = new MongoDatabaseManager(config)

    // Setup mock database operations for all models
    const setupMockModel = (ModelClass: any, mockStore: Map<string, any>) => {
      ModelClass.query = function () {
        const collectionName = this.getCollectionName()
        const connectionName = this.getConnection()
        const collection = manager.collection(collectionName, connectionName)
        return new ModelQueryBuilder(collection, this)
      }

      ModelClass.prototype['performInsert'] = async function () {
        const id = 'mock_id_' + idCounter++
        this._id = id
        mockStore.set(id, this.toDocument())
      }

      ModelClass.prototype['performUpdate'] = async function () {
        if (this._id) {
          mockStore.set(this._id, this.toDocument())
        }
      }

      ModelClass.find = async function (id: string) {
        const data = mockStore.get(id)
        if (!data) return null

        const instance = new this()
        instance.hydrateFromDocument({ _id: id, ...data })
        return instance
      }

      ModelClass.create = async function (attributes: any) {
        const instance = new this(attributes)
        await instance.save()
        return instance
      }

      ModelClass.prototype.delete = async function () {
        if (this._id) {
          mockStore.delete(this._id)
          return true
        }
        return false
      }
    }

    setupMockModel(TestProfile, mockProfiles)
    setupMockModel(TestUserWithEmbeddedProfile, mockUsers)
    setupMockModel(TestUserWithReferencedProfile, mockUsers)
  })

  group.each.setup(() => {
    // Clear mock data before each test
    mockProfiles.clear()
    mockUsers.clear()
    idCounter = 1
  })

  // Column Decorators Tests
  test('should support embedded column decorator', async ({ assert }) => {
    const metadata = TestUserWithEmbeddedProfile.getMetadata()
    const profileColumn = metadata.columns.get('profile')

    assert.isTrue(profileColumn?.isEmbedded)
  })

  test('should support reference column decorator', async ({ assert }) => {
    // Test that reference decorator would work (we don't use it in our test models but the functionality exists)
    const testDecorator = column.reference({ model: 'Profile' })
    assert.isFunction(testDecorator)
  })

  // Embedded Documents Tests
  test('should create user with embedded profile', async ({ assert }) => {
    const user = await TestUserWithEmbeddedProfile.create({
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
      profile: {
        firstName: 'John',
        lastName: 'Doe',
        bio: 'Software developer',
        phoneNumber: '+1-555-0123',
        address: {
          street: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94105',
          country: 'USA',
        },
      },
    })

    assert.equal(user.name, 'John Doe')
    assert.equal(user.profile?.firstName, 'John')
    assert.equal(user.profile?.lastName, 'Doe')
    assert.equal(user.fullName, 'John Doe')
    assert.equal(user.formattedAddress, '123 Main St, San Francisco, CA 94105, USA')
    assert.isNotEmpty(user._id)
  })

  test('should update embedded profile', async ({ assert }) => {
    const user = await TestUserWithEmbeddedProfile.create({
      name: 'Jane Smith',
      email: 'jane@example.com',
      profile: {
        firstName: 'Jane',
        lastName: 'Smith',
        bio: 'Designer',
      },
    })

    user.updateProfile({
      bio: 'Senior Designer',
      phoneNumber: '+1-555-0456',
      socialLinks: {
        twitter: '@janesmith',
        linkedin: 'linkedin.com/in/janesmith',
      },
    })

    await user.save()

    assert.equal(user.profile?.bio, 'Senior Designer')
    assert.equal(user.profile?.phoneNumber, '+1-555-0456')
    assert.equal(user.profile?.socialLinks?.twitter, '@janesmith')
  })

  test('should handle partial embedded profile data', async ({ assert }) => {
    const user = await TestUserWithEmbeddedProfile.create({
      name: 'Bob Wilson',
      email: 'bob@example.com',
      profile: {
        firstName: 'Bob',
        lastName: 'Wilson',
      },
    })

    assert.equal(user.fullName, 'Bob Wilson')
    assert.isUndefined(user.profile?.bio)
    assert.isNull(user.formattedAddress)
  })

  test('should serialize embedded profile to document', async ({ assert }) => {
    const user = new TestUserWithEmbeddedProfile({
      name: 'Test User',
      email: 'test@example.com',
      profile: {
        firstName: 'Test',
        lastName: 'User',
        bio: 'Test bio',
      },
    })

    const document = user.toDocument()

    assert.equal(document.name, 'Test User')
    assert.equal(document.profile.firstName, 'Test')
    assert.equal(document.profile.lastName, 'User')
    assert.equal(document.profile.bio, 'Test bio')
  })

  // Referenced Documents Tests
  test('should create user and profile separately', async ({ assert }) => {
    const user = await TestUserWithReferencedProfile.create({
      name: 'Alice Johnson',
      email: 'alice@example.com',
      age: 28,
    })

    const profile = await user.createProfile({
      firstName: 'Alice',
      lastName: 'Johnson',
      bio: 'Product Manager',
      phoneNumber: '+1-555-0789',
    })

    assert.equal(user.name, 'Alice Johnson')
    assert.equal(profile.firstName, 'Alice')
    assert.equal(user.profileId, profile._id)
    assert.equal(user.profile, profile)
  })

  test('should load referenced profile', async ({ assert }) => {
    const user = await TestUserWithReferencedProfile.create({
      name: 'Charlie Brown',
      email: 'charlie@example.com',
    })

    await user.createProfile({
      firstName: 'Charlie',
      lastName: 'Brown',
      bio: 'Engineer',
    })

    // Clear the loaded profile to test loading
    user.profile = undefined

    const loadedProfile = await user.loadProfile()

    assert.isNotNull(loadedProfile)
    assert.equal(loadedProfile?.firstName, 'Charlie')
    assert.isDefined(user.profile)
    assert.equal(user.profile!.firstName, 'Charlie')
    assert.equal(user.fullName, 'Charlie Brown')
  })

  test('should update referenced profile', async ({ assert }) => {
    const user = await TestUserWithReferencedProfile.create({
      name: 'Diana Prince',
      email: 'diana@example.com',
    })

    await user.createProfile({
      firstName: 'Diana',
      lastName: 'Prince',
      bio: 'Hero',
    })

    const updatedProfile = await user.updateProfile({
      bio: 'Superhero',
      socialLinks: {
        twitter: '@wonderwoman',
      },
    })

    assert.equal(updatedProfile?.bio, 'Superhero')
    assert.equal(updatedProfile?.socialLinks?.twitter, '@wonderwoman')
    assert.equal(user.profile?.bio, 'Superhero')
  })

  test('should delete referenced profile', async ({ assert }) => {
    const user = await TestUserWithReferencedProfile.create({
      name: 'Bruce Wayne',
      email: 'bruce@example.com',
    })

    await user.createProfile({
      firstName: 'Bruce',
      lastName: 'Wayne',
      bio: 'Billionaire',
    })

    const deleted = await user.deleteProfile()

    assert.isTrue(deleted)
    assert.isUndefined(user.profileId)
    assert.isUndefined(user.profile)
  })

  test('should handle missing profile gracefully', async ({ assert }) => {
    const user = await TestUserWithReferencedProfile.create({
      name: 'No Profile User',
      email: 'noprofile@example.com',
    })

    const profile = await user.loadProfile()
    const updatedProfile = await user.updateProfile({ bio: 'New bio' })
    const deleted = await user.deleteProfile()

    assert.isNull(profile)
    assert.isNull(updatedProfile)
    assert.isFalse(deleted)
    assert.isNull(user.fullName)
    assert.isNull(user.formattedAddress)
  })

  // Profile Model Tests
  test('should create profile with all fields', async ({ assert }) => {
    const profile = await TestProfile.create({
      firstName: 'John',
      lastName: 'Doe',
      bio: 'Full stack developer',
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
        website: 'https://johndoe.dev',
      },
    })

    assert.equal(profile.firstName, 'John')
    assert.equal(profile.lastName, 'Doe')
    assert.equal(profile.fullName, 'John Doe')
    assert.equal(profile.formattedAddress, '123 Main St, San Francisco, CA 94105, USA')
    assert.equal(profile.socialLinks?.twitter, '@johndoe')
  })

  test('should handle profile without address', async ({ assert }) => {
    const profile = await TestProfile.create({
      firstName: 'Jane',
      lastName: 'Smith',
      bio: 'Designer',
    })

    assert.equal(profile.fullName, 'Jane Smith')
    assert.isNull(profile.formattedAddress)
  })

  // Utility Helpers Tests
  test('should bulk load references', async ({ assert }) => {
    // Create users with profiles
    const users: TestUserWithReferencedProfile[] = []
    const profiles: TestProfile[] = []

    for (let i = 1; i <= 3; i++) {
      const user = await TestUserWithReferencedProfile.create({
        name: `User ${i}`,
        email: `user${i}@example.com`,
      })

      const profile = await user.createProfile({
        firstName: `First${i}`,
        lastName: `Last${i}`,
        bio: `Bio ${i}`,
      })

      profiles.push(profile)

      // Clear loaded profile to test bulk loading
      user.profile = undefined
      users.push(user)
    }

    // Mock TestProfile.query for bulk loading
    const originalQuery = TestProfile.query
    TestProfile.query = function () {
      return {
        where: (field: string, operator: string, values: string[]) => ({
          all: () => Promise.resolve(profiles.filter((p) => values.includes(p._id))),
        }),
      } as any
    }

    try {
      // Bulk load profiles
      await NestedDocumentHelpers.bulkLoadReferences(
        users as any,
        'profileId',
        TestProfile,
        'profile'
      )

      // Verify all profiles are loaded
      users.forEach((user, index) => {
        assert.isDefined(user.profile)
        assert.equal(user.profile?.firstName, `First${index + 1}`)
        assert.equal(user.fullName, `First${index + 1} Last${index + 1}`)
      })
    } finally {
      // Restore original query method
      TestProfile.query = originalQuery
    }
  })

  test('should handle empty reference list in bulk load', async ({ assert }) => {
    const users: TestUserWithReferencedProfile[] = []

    // Should not throw error with empty array
    await NestedDocumentHelpers.bulkLoadReferences(
      users as any,
      'profileId',
      TestProfile,
      'profile'
    )

    assert.equal(users.length, 0)
  })

  test('should handle users without profiles in bulk load', async ({ assert }) => {
    const users = []
    for (let i = 1; i <= 2; i++) {
      const user = await TestUserWithReferencedProfile.create({
        name: `User ${i}`,
        email: `user${i}@example.com`,
      })
      users.push(user)
    }

    // Bulk load profiles (should handle missing profileIds gracefully)
    await NestedDocumentHelpers.bulkLoadReferences(
      users as any,
      'profileId',
      TestProfile,
      'profile'
    )

    // Verify no profiles are loaded (since none exist)
    users.forEach((user) => {
      assert.isUndefined(user.profile)
    })
  })

  test('should create with nested data - embedded approach', async ({ assert }) => {
    const user = await NestedDocumentHelpers.createWithNested(
      TestUserWithEmbeddedProfile,
      {
        name: 'Nested User',
        email: 'nested@example.com',
        profile: {
          firstName: 'Nested',
          lastName: 'User',
          bio: 'Created with helper',
        },
      },
      {
        field: 'profile',
        isEmbedded: true,
      }
    )

    assert.equal(user.name, 'Nested User')
    assert.equal(user.profile?.firstName, 'Nested')
    assert.equal(user.fullName, 'Nested User')
  })

  test('should create with nested data - referenced approach', async ({ assert }) => {
    const user = await NestedDocumentHelpers.createWithNested(
      TestUserWithReferencedProfile,
      {
        name: 'Referenced User',
        email: 'referenced@example.com',
        profile: {
          firstName: 'Referenced',
          lastName: 'User',
          bio: 'Created with helper',
        },
      },
      {
        field: 'profile',
        isEmbedded: false,
        NestedModel: TestProfile,
        referenceField: 'profileId',
      }
    )

    assert.equal(user.name, 'Referenced User')
    assert.isNotEmpty(user.profileId)
    assert.equal(user.profile?.firstName, 'Referenced')
    assert.equal(user.fullName, 'Referenced User')
  })

  test('should update with nested data - embedded approach', async ({ assert }) => {
    const user = await TestUserWithEmbeddedProfile.create({
      name: 'Update Test',
      email: 'update@example.com',
      profile: {
        firstName: 'Update',
        lastName: 'Test',
        bio: 'Original bio',
      },
    })

    await NestedDocumentHelpers.updateWithNested(
      user,
      {
        age: 25,
        profile: {
          bio: 'Updated bio',
          phoneNumber: '+1-555-9999',
        },
      },
      {
        field: 'profile',
        isEmbedded: true,
      }
    )

    assert.equal(user.age, 25)
    assert.equal(user.profile?.bio, 'Updated bio')
    assert.equal(user.profile?.phoneNumber, '+1-555-9999')
    assert.equal(user.profile?.firstName, 'Update') // Should preserve existing data
  })

  test('should update with nested data - referenced approach', async ({ assert }) => {
    const user = await TestUserWithReferencedProfile.create({
      name: 'Update Ref Test',
      email: 'updateref@example.com',
    })

    await user.createProfile({
      firstName: 'Update',
      lastName: 'Ref',
      bio: 'Original bio',
    })

    await NestedDocumentHelpers.updateWithNested(
      user,
      {
        age: 30,
        profile: {
          bio: 'Updated bio via helper',
          phoneNumber: '+1-555-8888',
        },
      },
      {
        field: 'profile',
        isEmbedded: false,
        NestedModel: TestProfile,
        referenceField: 'profileId',
      }
    )

    assert.equal(user.age, 30)
    assert.equal(user.profile?.bio, 'Updated bio via helper')
    assert.equal(user.profile?.phoneNumber, '+1-555-8888')
    assert.equal(user.profile?.firstName, 'Update') // Should preserve existing data
  })

  test('should aggregate nested stats for referenced documents', async ({ assert }) => {
    // Create some test data
    const user1 = await TestUserWithReferencedProfile.create({
      name: 'Stats User 1',
      email: 'stats1@example.com',
    })
    await user1.createProfile({
      firstName: 'Stats',
      lastName: 'User1',
      bio: 'Stats test',
    })

    const user2 = await TestUserWithReferencedProfile.create({
      name: 'Stats User 2',
      email: 'stats2@example.com',
    })
    // User 2 has no profile

    // Mock the count methods for testing
    TestUserWithReferencedProfile.query = function () {
      return {
        count: () => Promise.resolve(2), // 2 total users
        where: (field: string, operator: string, value: any) => ({
          count: () => Promise.resolve(1), // 1 user with profile
        }),
      } as any
    }

    TestProfile.query = function () {
      return {
        count: () => Promise.resolve(1), // 1 total profile
      } as any
    }

    const stats = await NestedDocumentHelpers.aggregateNestedStats(
      TestUserWithReferencedProfile,
      'profile',
      false,
      TestProfile
    )

    assert.equal(stats.totalWithNested, 1)
    assert.equal(stats.totalWithoutNested, 1)
    assert.equal(stats.totalNested, 1)
  })

  // Edge Cases Tests
  test('should handle null/undefined values in embedded profile', async ({ assert }) => {
    const user = await TestUserWithEmbeddedProfile.create({
      name: 'Null Test',
      email: 'null@example.com',
      profile: undefined,
    })

    assert.isUndefined(user.profile)
    assert.isNull(user.fullName)
    assert.isNull(user.formattedAddress)

    // Should be able to add profile later
    user.updateProfile({
      firstName: 'Added',
      lastName: 'Later',
    })

    assert.equal(user.fullName, 'Added Later')
  })

  test('should handle invalid profile ID in referenced model', async ({ assert }) => {
    const user = await TestUserWithReferencedProfile.create({
      name: 'Invalid ID Test',
      email: 'invalid@example.com',
    })

    user.profileId = 'non_existent_id'

    const profile = await user.loadProfile()
    assert.isNull(profile)
    assert.isUndefined(user.profile)
  })

  test('should handle empty address in profile', async ({ assert }) => {
    const profile = await TestProfile.create({
      firstName: 'No',
      lastName: 'Address',
      bio: 'No address provided',
    })

    assert.equal(profile.fullName, 'No Address')
    assert.isNull(profile.formattedAddress)
  })

  test('should handle partial address in profile', async ({ assert }) => {
    const user = await TestUserWithEmbeddedProfile.create({
      name: 'Partial Address',
      email: 'partial@example.com',
      profile: {
        firstName: 'Partial',
        lastName: 'Address',
        address: {
          street: '123 Main St',
          city: 'Somewhere',
          state: '',
          zipCode: '',
          country: 'USA',
        },
      },
    })

    assert.equal(user.formattedAddress, '123 Main St, Somewhere,  , USA')
  })
})
