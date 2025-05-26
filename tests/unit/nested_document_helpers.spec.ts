import { test } from '@japa/runner'
import { NestedDocumentHelpers } from '../../src/utils/nested_document_helpers.js'
import { BaseModel } from '../../src/base_model/base_model.js'
import { column } from '../../src/decorators/column.js'

// Simple test models for utility testing
class MockProfile extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare name: string

  @column()
  declare bio: string

  static getCollectionName(): string {
    return 'mock_profiles'
  }
}

class MockUser extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare name: string

  @column()
  declare profileId?: string

  declare profile?: MockProfile

  static getCollectionName(): string {
    return 'mock_users'
  }
}

test.group('NestedDocumentHelpers - Unit Tests', (group) => {
  let mockProfiles: MockProfile[]
  let mockUsers: MockUser[]

  group.setup(async () => {
    console.log('✅ Running NestedDocumentHelpers unit tests (utility functions)')

    // Note: These tests primarily test utility functions and don't require database operations
    // Setup mock data
    mockProfiles = [
      Object.assign(new MockProfile(), { _id: 'profile1', name: 'Profile 1', bio: 'Bio 1' }),
      Object.assign(new MockProfile(), { _id: 'profile2', name: 'Profile 2', bio: 'Bio 2' }),
      Object.assign(new MockProfile(), { _id: 'profile3', name: 'Profile 3', bio: 'Bio 3' }),
    ]

    mockUsers = [
      Object.assign(new MockUser(), { _id: 'user1', name: 'User 1', profileId: 'profile1' }),
      Object.assign(new MockUser(), { _id: 'user2', name: 'User 2', profileId: 'profile2' }),
      Object.assign(new MockUser(), { _id: 'user3', name: 'User 3', profileId: 'profile3' }),
      Object.assign(new MockUser(), { _id: 'user4', name: 'User 4' }), // No profile
    ]

    // Mock the query method for MockProfile
    MockProfile.query = function () {
      return {
        where: (field: string, operator: string, values: string[]) => ({
          all: () => Promise.resolve(mockProfiles.filter((p) => values.includes(p._id))),
        }),
      } as any
    }
  })

  test('should bulk load references correctly', async ({ assert }) => {
    // Test users (first 3 have profiles, last one doesn't)
    const users = mockUsers.slice(0, 4)

    // Clear any existing profile references
    users.forEach((user) => {
      user.profile = undefined
    })

    // Bulk load profiles
    await NestedDocumentHelpers.bulkLoadReferences(
      users as any,
      'profileId',
      MockProfile,
      'profile'
    )

    // Verify profiles are loaded correctly
    assert.equal(users[0].profile?._id, 'profile1')
    assert.equal(users[0].profile?.name, 'Profile 1')
    assert.equal(users[1].profile?._id, 'profile2')
    assert.equal(users[1].profile?.name, 'Profile 2')
    assert.equal(users[2].profile?._id, 'profile3')
    assert.equal(users[2].profile?.name, 'Profile 3')
    assert.isUndefined(users[3].profile) // User without profile
  })

  test('should handle empty user list in bulk load', async ({ assert }) => {
    const users: MockUser[] = []

    // Should not throw error
    await NestedDocumentHelpers.bulkLoadReferences(
      users as any,
      'profileId',
      MockProfile,
      'profile'
    )

    assert.equal(users.length, 0)
  })

  test('should handle users with no profile IDs', async ({ assert }) => {
    const users = [
      Object.assign(new MockUser(), { _id: 'user5', name: 'User 5' }),
      Object.assign(new MockUser(), { _id: 'user6', name: 'User 6' }),
    ]

    await NestedDocumentHelpers.bulkLoadReferences(
      users as any,
      'profileId',
      MockProfile,
      'profile'
    )

    // Should not have any profiles loaded
    users.forEach((user) => {
      assert.isUndefined(user.profile)
    })
  })

  test('should create with nested data - embedded approach', async ({ assert }) => {
    // Mock the create method
    ;(MockUser as any).create = async function (data: any) {
      const user = new MockUser()
      Object.assign(user, data)
      user._id = 'created_user_' + Date.now()
      return user
    }

    const user = await NestedDocumentHelpers.createWithNested(
      MockUser,
      {
        name: 'Test User',
        profile: {
          name: 'Test Profile',
          bio: 'Test Bio',
        },
      },
      {
        field: 'profile',
        isEmbedded: true,
      }
    )

    assert.equal(user.name, 'Test User')
    assert.equal((user as any).profile.name, 'Test Profile')
    assert.equal((user as any).profile.bio, 'Test Bio')
  })

  test('should create with nested data - referenced approach', async ({ assert }) => {
    // Mock the create methods
    ;(MockProfile as any).create = async function (data: any) {
      const profile = new MockProfile()
      Object.assign(profile, data)
      profile._id = 'created_profile_' + Date.now()
      return profile
    }
    ;(MockUser as any).create = async function (data: any) {
      const user = new MockUser()
      Object.assign(user, data)
      user._id = 'created_user_' + Date.now()
      return user
    }

    const user = await NestedDocumentHelpers.createWithNested(
      MockUser,
      {
        name: 'Referenced User',
        profile: {
          name: 'Referenced Profile',
          bio: 'Referenced Bio',
        },
      },
      {
        field: 'profile',
        isEmbedded: false,
        NestedModel: MockProfile,
        referenceField: 'profileId',
      }
    )

    assert.equal(user.name, 'Referenced User')
    assert.isNotEmpty(user.profileId)
    assert.equal((user as any).profile.name, 'Referenced Profile')
  })

  test('should update with nested data - embedded approach', async ({ assert }) => {
    const user = new MockUser()
    user.name = 'Original Name'
    ;(user as any).merge = function (data: any) {
      Object.assign(this, data)
      return this
    }
    ;(user as any).save = async function () {
      return this
    }
    ;(user as any).profile = {
      name: 'Original Profile',
      bio: 'Original Bio',
    }

    await NestedDocumentHelpers.updateWithNested(
      user,
      {
        name: 'Updated Name',
        profile: {
          bio: 'Updated Bio',
        },
      },
      {
        field: 'profile',
        isEmbedded: true,
      }
    )

    assert.equal(user.name, 'Updated Name')
    assert.equal((user as any).profile.name, 'Original Profile') // Should preserve
    assert.equal((user as any).profile.bio, 'Updated Bio') // Should update
  })

  test('should update with nested data - referenced approach', async ({ assert }) => {
    const user = new MockUser()
    user.name = 'Original Name'
    user.profileId = 'profile1'
    ;(user as any).merge = function (data: any) {
      Object.assign(this, data)
      return this
    }
    ;(user as any).save = async function () {
      return this
    }

    // Mock finding and updating the profile
    ;(MockProfile as any).find = async function (id: string) {
      const profile = mockProfiles.find((p) => p._id === id)
      if (profile) {
        const mockProfile = new MockProfile()
        Object.assign(mockProfile, profile)
        ;(mockProfile as any).merge = function (data: any) {
          Object.assign(this, data)
          return this
        }
        ;(mockProfile as any).save = async function () {
          return this
        }
        return mockProfile
      }
      return null
    }

    await NestedDocumentHelpers.updateWithNested(
      user,
      {
        name: 'Updated User Name',
        profile: {
          bio: 'Updated Profile Bio',
        },
      },
      {
        field: 'profile',
        isEmbedded: false,
        NestedModel: MockProfile,
        referenceField: 'profileId',
      }
    )

    assert.equal(user.name, 'Updated User Name')
    assert.equal((user as any).profile.name, 'Profile 1') // Should preserve
    assert.equal((user as any).profile.bio, 'Updated Profile Bio') // Should update
  })

  test('should aggregate nested stats for referenced documents', async ({ assert }) => {
    // Mock query methods
    MockUser.query = function () {
      return {
        count: () => Promise.resolve(4), // Total users
        where: (field: string, operator: string, value: any) => ({
          count: () => Promise.resolve(3), // Users with profiles
        }),
      } as any
    }

    MockProfile.query = function () {
      return {
        count: () => Promise.resolve(3), // Total profiles
      } as any
    }

    const stats = await NestedDocumentHelpers.aggregateNestedStats(
      MockUser,
      'profile',
      false,
      MockProfile
    )

    assert.equal(stats.totalWithNested, 3)
    assert.equal(stats.totalWithoutNested, 1)
    assert.equal(stats.totalNested, 3)
  })

  test('should handle query with nested conditions', async ({ assert }) => {
    // Mock query building
    MockUser.query = function () {
      const mockQuery = {
        where: function (field: string, operator: string, value: any) {
          return this
        },
        orderBy: function (field: string, direction: string) {
          return this
        },
        paginate: function (page: number, perPage: number) {
          return Promise.resolve({
            data: mockUsers.slice(0, 2),
            meta: {
              total: 4,
              currentPage: page,
              perPage: perPage,
              lastPage: 2,
            },
          })
        },
        all: function () {
          return Promise.resolve(mockUsers.slice(0, 2))
        },
      }
      return mockQuery as any
    }

    MockProfile.query = function () {
      return {
        where: (field: string, operator: string, value: any) => ({
          all: () => Promise.resolve(mockProfiles.slice(0, 2)),
        }),
      } as any
    }

    const result = await NestedDocumentHelpers.queryWithNestedConditions(
      MockUser,
      [
        {
          field: 'bio',
          operator: 'like',
          value: '%Bio%',
          isEmbedded: false,
          NestedModel: MockProfile,
          referenceField: 'profileId',
        },
      ],
      [
        {
          field: 'name',
          operator: 'like',
          value: '%User%',
        },
      ],
      {
        page: 1,
        perPage: 10,
        orderBy: { field: 'name', direction: 'asc' },
      }
    )

    assert.isObject(result)
    assert.property(result, 'data')
    assert.property(result, 'meta')
  })
})
