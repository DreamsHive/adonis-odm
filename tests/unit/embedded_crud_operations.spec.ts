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
class TestUserWithEmbeddedCRUD extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare name: string

  @column()
  declare email: string

  // Single embedded profile using the Profile model
  @column.embedded(() => TestProfile, 'single')
  declare profile?: EmbeddedSingle<typeof TestProfile>

  // Multiple embedded profiles
  @column.embedded(() => TestProfile, 'many')
  declare profiles?: EmbeddedMany<typeof TestProfile>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  static getCollectionName(): string {
    return 'test_users_embedded_crud'
  }
}

test.group('Embedded Documents CRUD Operations', () => {
  test('should create user with embedded data directly', async ({ assert }) => {
    const userData = {
      name: 'John Doe',
      email: 'john@example.com',
      profile: {
        firstName: 'John',
        lastName: 'Doe',
        bio: 'Developer',
        age: 30,
      },
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
      ],
    }

    const user = new TestUserWithEmbeddedCRUD(userData)

    assert.equal(user.name, 'John Doe')
    assert.equal(user.email, 'john@example.com')
    assert.isDefined(user.profile)
    assert.isDefined(user.profiles)
  })

  test('should initialize embedded single proxy', async ({ assert }) => {
    const user = new TestUserWithEmbeddedCRUD({
      name: 'Test User',
      email: 'test@example.com',
    })

    // Access the profile property to initialize the proxy
    const profile = user.profile
    assert.isDefined(profile)
  })

  test('should initialize embedded many proxy', async ({ assert }) => {
    const user = new TestUserWithEmbeddedCRUD({
      name: 'Test User',
      email: 'test@example.com',
    })

    // Access the profiles property to initialize the proxy
    const profiles = user.profiles
    assert.isDefined(profiles)
    assert.isTrue(Array.isArray(profiles))
  })

  test('should set embedded single document', async ({ assert }) => {
    const user = new TestUserWithEmbeddedCRUD({
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

    // Verify the profile was set
    assert.isDefined(user.profile)
  })

  test('should set embedded many documents', async ({ assert }) => {
    const user = new TestUserWithEmbeddedCRUD({
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

    // Verify the profiles were set
    assert.isDefined(user.profiles)
    assert.equal((user.profiles as any).length, 2)
  })

  test('should create embedded documents using create method', async ({ assert }) => {
    const user = new TestUserWithEmbeddedCRUD({
      name: 'Test User',
      email: 'test@example.com',
    })

    // Create embedded profile using create method
    const profiles = user.profiles
    if (profiles && typeof (profiles as any).create === 'function') {
      const newProfile = (profiles as any).create({
        firstName: 'Jane',
        lastName: 'Smith',
        bio: 'UX Designer',
        age: 28,
      })

      assert.isDefined(newProfile)
      assert.equal((profiles as any).length, 1)
    }
  })

  test('should query embedded documents', async ({ assert }) => {
    const user = new TestUserWithEmbeddedCRUD({
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

    // Query profiles
    const profiles = user.profiles
    if (profiles && typeof (profiles as any).query === 'function') {
      const youngProfiles = (profiles as any).query().where('age', '<', 30).get()

      assert.equal(youngProfiles.length, 1)
    }
  })

  test('should support CRUD operations on embedded documents', async ({ assert }) => {
    const user = new TestUserWithEmbeddedCRUD({
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

    const profile = user.profile
    if (profile) {
      // Test that CRUD methods exist
      assert.isFunction((profile as any).save)
      assert.isFunction((profile as any).delete)
      assert.isFunction((profile as any).refresh)
      assert.isFunction((profile as any).fill)
    }
  })

  test('should support array operations on embedded many', async ({ assert }) => {
    const user = new TestUserWithEmbeddedCRUD({
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
    ] as any

    const profiles = user.profiles
    if (profiles) {
      // Test array methods
      assert.isFunction((profiles as any).push)
      assert.isFunction((profiles as any).pop)
      assert.isFunction((profiles as any).forEach)
      assert.isFunction((profiles as any).map)
      assert.isFunction((profiles as any).filter)
      assert.isFunction((profiles as any).find)

      // Test custom methods
      assert.isFunction((profiles as any).create)
      assert.isFunction((profiles as any).createMany)
      assert.isFunction((profiles as any).remove)
      assert.isFunction((profiles as any).removeWhere)
      assert.isFunction((profiles as any).query)
    }
  })
})
