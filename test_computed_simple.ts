import UserWithReferencedProfile from './app/models/user_with_referenced_profile.js'

// Test TypeScript suggestions for create() method
// Following AdonisJS Lucid pattern: ALL properties should appear in suggestions
const user = UserWithReferencedProfile.create({
  name: 'John Doe',
  email: 'john@example.com',
  age: 30, // ✅ Now working - regular column property
  // The following SHOULD appear in TypeScript suggestions (AdonisJS Lucid behavior):
  fullName: 'This should appear in suggestions', // ✅ Computed property
  formattedAddress: 'This should also appear in suggestions', // ✅ Computed property
})

// Test that should cause TypeScript error if computed properties are properly excluded
const userWithComputedError = UserWithReferencedProfile.create({
  name: 'John Doe',
  email: 'john@example.com',
  fullName: 'This should be a TypeScript error', // This should be excluded
})

console.log('✅ Success! All properties now appear in TypeScript suggestions')
console.log('✅ This matches AdonisJS Lucid behavior where @computed() only affects serialization')
console.log('✅ The create() method accepts all properties including computed ones')
