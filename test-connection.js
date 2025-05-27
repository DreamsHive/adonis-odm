import { MongoClient } from 'mongodb'

async function testConnection() {
  console.log('🧪 Testing MongoDB Replica Set Connection...')

  // Test connection string (update this to match your .env)
  const uri = 'mongodb://localhost:27017/adonis_mongo?replicaSet=rs0'

  const client = new MongoClient(uri)

  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...')
    await client.connect()
    console.log('✅ Connected successfully!')

    // Test basic operation
    const db = client.db('adonis_mongo')
    const collection = db.collection('test')

    // Test transaction support
    console.log('🔄 Testing transaction support...')
    const session = client.startSession()

    try {
      await session.withTransaction(async () => {
        await collection.insertOne({ test: 'transaction', timestamp: new Date() }, { session })
        console.log('✅ Transaction test successful!')
      })
    } finally {
      await session.endSession()
    }

    // Clean up test data
    await collection.deleteMany({ test: 'transaction' })

    console.log('🎉 All tests passed! Your MongoDB replica set is ready for transactions.')
  } catch (error) {
    console.error('❌ Connection test failed:', error.message)

    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 Make sure MongoDB containers are running: docker-compose ps')
    }

    if (error.message.includes('not master')) {
      console.log('💡 Replica set might still be initializing. Wait a moment and try again.')
    }

    if (error.message.includes('Transaction numbers are only allowed on a replica set')) {
      console.log('💡 Make sure your connection string includes ?replicaSet=rs0')
    }
  } finally {
    await client.close()
  }
}

// Run the test
testConnection().catch(console.error)
