import { test } from '@japa/runner'
import UserWithReferencedProfile from '#models/user_with_referenced_profile'

test.group('Computed Properties', () => {
  test('computed properties should be excluded from create method type', ({ assert }) => {
    // This test verifies that TypeScript properly excludes computed properties
    // from the create method parameter type

    // This should compile without errors - only database columns are allowed
    const validAttributes = {
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
    }

    // Create a user instance to test computed properties
    const user = new UserWithReferencedProfile(validAttributes)

    // Verify that computed properties are accessible as getters
    assert.isNull(user.fullName) // Should be null since profile is not loaded
    assert.isNull(user.formattedAddress) // Should be null since profile is not loaded

    // Verify that computed properties are marked correctly in metadata
    const metadata = UserWithReferencedProfile.getMetadata()
    const fullNameColumn = metadata.columns.get('fullName')
    const formattedAddressColumn = metadata.columns.get('formattedAddress')

    assert.isTrue(fullNameColumn?.isComputed)
    assert.isTrue(formattedAddressColumn?.isComputed)
  })

  test('computed properties should not be included in toDocument', ({ assert }) => {
    const user = new UserWithReferencedProfile({
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
    })

    const document = user.toDocument()

    // Computed properties should not be in the document
    assert.isUndefined(document.fullName)
    assert.isUndefined(document.formattedAddress)

    // Regular columns should be in the document
    assert.equal(document.name, 'John Doe')
    assert.equal(document.email, 'john@example.com')
    assert.equal(document.age, 30)
  })

  test('computed properties should not be settable via setAttribute', ({ assert }) => {
    const user = new UserWithReferencedProfile({
      name: 'John Doe',
      email: 'john@example.com',
    })

    // Attempting to set computed properties should be ignored
    user.setAttribute('fullName', 'Should be ignored')
    user.setAttribute('formattedAddress', 'Should be ignored')

    // The values should remain as computed (null in this case since profile is not loaded)
    assert.isNull(user.fullName)
    assert.isNull(user.formattedAddress)
  })

  test('computed properties should not be included in dirty attributes', ({ assert }) => {
    const user = new UserWithReferencedProfile({
      name: 'John Doe',
      email: 'john@example.com',
    })

    // Mark as persisted to enable dirty tracking
    user.$isPersisted = true

    // Try to set computed properties (should be ignored)
    user.setAttribute('fullName', 'Should be ignored')
    user.setAttribute('formattedAddress', 'Should be ignored')

    // Set a regular property
    user.setAttribute('name', 'Jane Doe')

    const dirtyAttributes = user.getDirtyAttributes()

    // Only the regular property should be dirty
    assert.equal(dirtyAttributes.name, 'Jane Doe')
    assert.isUndefined(dirtyAttributes.fullName)
    assert.isUndefined(dirtyAttributes.formattedAddress)
  })
})
