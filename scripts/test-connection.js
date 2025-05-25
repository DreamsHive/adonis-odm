#!/usr/bin/env node

import { MongoClient } from 'mongodb'

// MongoDB connection configuration for Docker setup
const config = {
  uri: 'mongodb://adonis_user:adonis_password@localhost:27017/adonis_mongo',
  options: {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
  },
}

async function testConnection() {
  console.log('🔍 Testing MongoDB connection...')
  console.log(`📡 URI: ${config.uri.replace(/\/\/.*@/, '//***:***@')}`)

  const client = new MongoClient(config.uri, config.options)

  try {
    // Connect to MongoDB
    console.log('⏳ Connecting to MongoDB...')
    await client.connect()
    console.log('✅ Connected to MongoDB successfully!')

    // Test database access
    const db = client.db('adonis_mongo')
    console.log(`📊 Connected to database: ${db.databaseName}`)

    // List collections
    const collections = await db.listCollections().toArray()
    console.log(`📁 Found ${collections.length} collections:`)
    collections.forEach((col) => console.log(`   - ${col.name}`))

    // Test data access
    const usersCollection = db.collection('users')
    const userCount = await usersCollection.countDocuments()
    console.log(`👥 Users collection has ${userCount} documents`)

    if (userCount > 0) {
      const sampleUser = await usersCollection.findOne()
      console.log('📄 Sample user document:')
      console.log(JSON.stringify(sampleUser, null, 2))
    }

    // Test write operation
    console.log('✏️  Testing write operation...')
    const testDoc = {
      name: 'Test User',
      email: `test-${Date.now()}@example.com`,
      createdAt: new Date(),
      testDocument: true,
    }

    const insertResult = await usersCollection.insertOne(testDoc)
    console.log(`✅ Inserted test document with ID: ${insertResult.insertedId}`)

    // Clean up test document
    await usersCollection.deleteOne({ _id: insertResult.insertedId })
    console.log('🧹 Cleaned up test document')

    console.log('\n🎉 All tests passed! MongoDB is ready for use.')
  } catch (error) {
    console.error('❌ Connection test failed:')
    console.error(error.message)

    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Troubleshooting tips:')
      console.log('1. Make sure Docker is running')
      console.log('2. Start MongoDB with: docker-compose up -d')
      console.log('3. Check container status: docker-compose ps')
    } else if (error.code === 18) {
      console.log('\n💡 Authentication failed. Check:')
      console.log('1. Username and password are correct')
      console.log('2. Database name matches the configuration')
      console.log('3. User has proper permissions')
    }

    process.exit(1)
  } finally {
    await client.close()
    console.log('🔌 Connection closed')
  }
}

// Run the test
testConnection().catch(console.error)
