// MongoDB initialization script for AdonisJS MongoDB ODM
// This script runs when the MongoDB container starts for the first time

// Switch to the adonis_mongo database
db = db.getSiblingDB('adonis_mongo')

// Create a user for the application
db.createUser({
  user: 'adonis_user',
  pwd: 'adonis_password',
  roles: [
    {
      role: 'readWrite',
      db: 'adonis_mongo',
    },
  ],
})

// Create some initial collections with indexes
db.createCollection('users')
db.createCollection('posts')
db.createCollection('categories')

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ createdAt: 1 })
db.users.createIndex({ updatedAt: 1 })

db.posts.createIndex({ title: 1 })
db.posts.createIndex({ userId: 1 })
db.posts.createIndex({ createdAt: 1 })

db.categories.createIndex({ name: 1 }, { unique: true })

// Insert some sample data for testing
db.users.insertMany([
  {
    name: 'John Doe',
    email: 'john@example.com',
    age: 30,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Jane Smith',
    email: 'jane@example.com',
    age: 25,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Bob Johnson',
    email: 'bob@example.com',
    age: 35,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
])

db.categories.insertMany([
  {
    name: 'Technology',
    description: 'Tech-related posts',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Lifestyle',
    description: 'Lifestyle and personal posts',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
])

print('✅ MongoDB initialization completed successfully!')
print('📊 Database: adonis_mongo')
print('👤 Application user: adonis_user')
print('🔗 Connection string: mongodb://adonis_user:adonis_password@localhost:27017/adonis_mongo')
