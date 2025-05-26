import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { ObjectId } from 'mongodb'
import { BaseModel } from '../../src/base_model/base_model.js'
import { column, hasOne, computed } from '../../src/decorators/column.js'
import type { HasOne } from '../../src/types/relationships.js'

// Simple test models
class TestProfile extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare firstName: string

  @column()
  declare lastName: string

  @column()
  declare userId: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  get fullName() {
    return `${this.firstName} ${this.lastName}`
  }

  static getCollectionName(): string {
    return 'test_profiles'
  }
}

class TestUser extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare name: string

  @column()
  declare email: string

  @hasOne(() => TestProfile, {
    localKey: '_id',
    foreignKey: 'userId',
  })
  declare profile: any

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @computed()
  get fullName() {
    console.log('=== DEBUG: fullName getter called ===')
    console.log('this.profile:', this.profile)
    console.log('this.profile?.isLoaded:', this.profile?.isLoaded)
    console.log('this.profile?.related:', this.profile?.related)
    console.log('this.profile?.fullName:', this.profile?.fullName)
    return this.profile?.fullName ?? ''
  }

  @computed()
  get formattedAddress() {
    console.log('=== DEBUG: formattedAddress getter called ===')
    return this.profile?.formattedAddress ?? ''
  }

  static getCollectionName(): string {
    return 'test_users'
  }
}

test.group('Debug Serialization', () => {
  test('should debug relationship loading and serialization', async ({ assert }) => {
    console.log('\n=== DEBUG: Starting comprehensive test ===')

    // Create a user
    const user = await TestUser.create({
      name: 'Debug User',
      email: 'debug@example.com',
    })

    console.log('\n=== DEBUG: User created ===')
    console.log('user._id:', user._id)
    console.log('user.name:', user.name)

    // Create a profile
    const profile = await TestProfile.create({
      userId: user._id,
      firstName: 'Debug',
      lastName: 'User',
    })

    console.log('\n=== DEBUG: Profile created ===')
    console.log('profile._id:', profile._id)
    console.log('profile.userId:', profile.userId)
    console.log('profile.fullName:', profile.fullName)

    // Load user with profile
    console.log('\n=== DEBUG: Loading user with profile ===')
    const loadedUser = await TestUser.query().load('profile').where('_id', user._id).first()

    console.log('\n=== DEBUG: User loaded ===')
    console.log('loadedUser:', loadedUser)
    console.log('loadedUser?._id:', loadedUser?._id)
    console.log('loadedUser?.profile:', loadedUser?.profile)
    console.log('loadedUser?.profile?.isLoaded:', loadedUser?.profile?.isLoaded)
    console.log('loadedUser?.profile?.related:', loadedUser?.profile?.related)

    // Test toJSON
    console.log('\n=== DEBUG: Testing toJSON ===')
    const json = loadedUser?.toJSON()
    console.log('JSON result:', JSON.stringify(json, null, 2))

    // Check for duplicate ID
    console.log('\n=== DEBUG: Checking for duplicate ID ===')
    const hasId = json && 'id' in json
    const hasUnderscoredId = json && '_id' in json
    console.log('Has id:', hasId)
    console.log('Has _id:', hasUnderscoredId)
    console.log('id value:', json?.id)
    console.log('_id value:', json?._id)

    // Check computed properties
    console.log('\n=== DEBUG: Checking computed properties ===')
    console.log('full_name in JSON:', json?.full_name)
    console.log('formatted_address in JSON:', json?.formatted_address)

    assert.isTrue(true)
  })

  test('should debug ObjectId handling', async ({ assert }) => {
    const objectId = new ObjectId()
    const user = new TestUser({
      _id: objectId,
      name: 'Test User',
      email: 'test@example.com',
    })

    console.log('\n=== DEBUG: ObjectId handling ===')
    console.log('Original ObjectId:', objectId)
    console.log('user._id type:', typeof user._id)
    console.log('user._id value:', user._id)

    const json = user.toJSON()
    console.log('JSON _id type:', typeof json._id)
    console.log('JSON _id value:', json._id)

    assert.isTrue(true)
  })
})
