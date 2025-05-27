// Initialize MongoDB Replica Set for Transactions
print('🚀 Initializing MongoDB Replica Set...')

try {
  // Initialize the replica set
  const config = {
    _id: 'rs0',
    members: [
      {
        _id: 0,
        host: 'mongodb-primary:27017',
        priority: 2,
      },
      {
        _id: 1,
        host: 'mongodb-secondary:27017',
        priority: 1,
      },
      {
        _id: 2,
        host: 'mongodb-arbiter:27017',
        arbiterOnly: true,
      },
    ],
  }

  const result = rs.initiate(config)
  print('✅ Replica set initialization result:', JSON.stringify(result))

  // Wait for the replica set to be ready
  print('⏳ Waiting for replica set to be ready...')

  let attempts = 0
  const maxAttempts = 30

  while (attempts < maxAttempts) {
    try {
      const status = rs.status()
      if (status.ok === 1) {
        print('✅ Replica set is ready!')
        print('📊 Replica set status:', JSON.stringify(status, null, 2))
        break
      }
    } catch (e) {
      print('⏳ Waiting for replica set... attempt', attempts + 1)
    }

    sleep(2000) // Wait 2 seconds
    attempts++
  }

  if (attempts >= maxAttempts) {
    print('❌ Replica set initialization timed out')
  } else {
    print('🎉 MongoDB Replica Set initialized successfully!')
    print('💡 You can now use transactions in your MongoDB ODM')
  }
} catch (error) {
  print('❌ Error initializing replica set:', error)
}
