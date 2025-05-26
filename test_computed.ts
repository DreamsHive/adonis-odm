import UserWithReferencedProfile from './app/models/user_with_referenced_profile.js'

// Test that computed properties are excluded from create method
const user = UserWithReferencedProfile.create({
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
  // Try typing here to see what properties are suggested:
  // fullName should NOT appear in suggestions (it's @computed)
  // formattedAddress should NOT appear in suggestions (it's @computed)
  // profile should NOT appear in suggestions (it's a relationship)
  // createdAt should NOT appear in suggestions (it's auto-managed)
  // updatedAt should NOT appear in suggestions (it's auto-managed)
})

// Test that computed properties are still accessible as getters
async function testComputedAccess() {
  const userInstance = new UserWithReferencedProfile({
    name: 'John Doe',
    email: 'john@example.com',
  })

  // These should work fine - computed properties are accessible
  console.log(userInstance.fullName) // Should be null since profile not loaded
  console.log(userInstance.formattedAddress) // Should be null since profile not loaded
}

console.log('Test completed - check TypeScript suggestions in the create method above')
testComputedAccess()
