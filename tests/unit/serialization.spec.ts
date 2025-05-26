import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { ObjectId } from 'mongodb'
import UserWithReferencedProfile from '../../app/models/user_with_referenced_profile.js'
import Profile from '../../app/models/profile.js'

test.group('Model Serialization', () => {
  test('should serialize model instance with toJSON', async ({ assert }) => {
    const user = new UserWithReferencedProfile({
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
    })

    const now = DateTime.now()
    user.createdAt = now
    user.updatedAt = now
    user._id = new ObjectId().toString()

    const json = user.toJSON()

    assert.equal(json.name, 'John Doe')
    assert.equal(json.email, 'john@example.com')
    assert.equal(json.age, 30)
    assert.equal(typeof json._id, 'string')
    assert.equal(typeof json.createdAt, 'string') // Should be ISO string
    assert.equal(typeof json.updatedAt, 'string') // Should be ISO string

    // Computed properties should be included
    assert.property(json, 'fullName')
    assert.property(json, 'formattedAddress')
  })

  test('should serialize profile model with toJSON', async ({ assert }) => {
    const profile = new Profile({
      firstName: 'John',
      lastName: 'Doe',
      bio: 'Software Developer',
      userId: new ObjectId().toString(),
    })

    const now = DateTime.now()
    profile.createdAt = now
    profile.updatedAt = now
    profile._id = new ObjectId().toString()

    const json = profile.toJSON()

    assert.equal(json.firstName, 'John')
    assert.equal(json.lastName, 'Doe')
    assert.equal(json.bio, 'Software Developer')
    assert.equal(typeof json.userId, 'string')
    assert.equal(typeof json._id, 'string')
    assert.equal(typeof json.createdAt, 'string') // Should be ISO string
    assert.equal(typeof json.updatedAt, 'string') // Should be ISO string
  })

  test('should handle ObjectId serialization', async ({ assert }) => {
    const user = new UserWithReferencedProfile({
      name: 'John Doe',
      email: 'john@example.com',
    })

    const objectId = new ObjectId()
    user._id = objectId.toString()

    const json = user.toJSON()

    assert.equal(json._id, objectId.toString())
    assert.equal(typeof json._id, 'string')
  })

  test('should handle DateTime serialization', async ({ assert }) => {
    const user = new UserWithReferencedProfile({
      name: 'John Doe',
      email: 'john@example.com',
    })

    const now = DateTime.now()
    user.createdAt = now
    user.updatedAt = now

    const json = user.toJSON()

    assert.equal(json.createdAt, now.toISO())
    assert.equal(json.updatedAt, now.toISO())
    assert.equal(typeof json.createdAt, 'string')
    assert.equal(typeof json.updatedAt, 'string')
  })

  test('should exclude internal properties from serialization', async ({ assert }) => {
    const user = new UserWithReferencedProfile({
      name: 'John Doe',
      email: 'john@example.com',
    })

    const json = user.toJSON()

    // Internal properties should not be included
    assert.notProperty(json, '$isPersisted')
    assert.notProperty(json, '$isLocal')
    assert.notProperty(json, '$dirty')
    assert.notProperty(json, '$original')

    // Private keys should not be included
    assert.notProperty(json, '_name')
    assert.notProperty(json, '_email')
    assert.notProperty(json, '_age')
  })
})
