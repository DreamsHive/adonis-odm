import UserWithReferencedProfile from './app/models/user_with_referenced_profile.js'

// Test the type safety - this should only allow actual database columns
async function testCreateMethod() {
  // This should work - these are actual database columns
  const user1 = await UserWithReferencedProfile.create({
    name: 'John Doe',
    email: 'john@example.com',
    age: 30,
  })

  // This should NOT work - profile is a relationship property
  // Uncomment the line below to test - it should show a TypeScript error
  // const user2 = await UserWithReferencedProfile.create({
  //   name: 'Jane Doe',
  //   email: 'jane@example.com',
  //   profile: {} // This should be excluded by the type system
  // })

  // This should work - createdAt is now allowed as it's a real database column
  const user3 = await UserWithReferencedProfile.create({
    name: 'Bob Smith',
    email: 'bob@example.com',
    // createdAt: new Date() // This is now allowed since it's a real database column
  })

  // This should NOT work - fullName is a computed getter (detected dynamically)
  // Uncomment the line below to test - it should show a TypeScript error
  // const user4 = await UserWithReferencedProfile.create({
  //   name: 'Alice Johnson',
  //   email: 'alice@example.com',
  //   fullName: 'Alice Johnson' // This should be excluded by the dynamic getter detection
  // })

  console.log('Type test completed successfully!')
}

export { testCreateMethod }
