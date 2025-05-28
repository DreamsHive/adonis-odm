/**
 * Simple example showing how to import and use the database service
 * following the same pattern as AdonisJS Lucid
 */

// Import the database service directly from the package
import db from 'adonis-odm/services/db'

// Example usage
async function exampleUsage() {
  try {
    console.log('🚀 Testing MongoDB ODM Database Service')

    // Managed transaction (recommended)
    const result = await db.transaction(async (trx) => {
      console.log('✅ Transaction started successfully')

      // You can use the transaction client here
      // const collection = trx.collection('users')
      // const queryBuilder = trx.query(UserModel)

      return { success: true, message: 'Transaction completed' }
    })

    console.log('✅ Transaction result:', result)

    // Manual transaction
    const trx = await db.transaction()
    try {
      console.log('✅ Manual transaction started')

      // Your operations here

      await trx.commit()
      console.log('✅ Manual transaction committed')
    } catch (error) {
      await trx.rollback()
      console.error('❌ Manual transaction rolled back:', error)
    }

    // Direct database access
    const mongoClient = db.connection()
    const database = db.db()
    const collection = db.collection('users')

    console.log('✅ Direct database access successful')
    console.log('- MongoDB Client:', !!mongoClient)
    console.log('- Database instance:', !!database)
    console.log('- Collection instance:', !!collection)
  } catch (error) {
    console.error('❌ Database service error:', error.message)
  }
}

// Export for use in other files
export { exampleUsage }

// If running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  exampleUsage()
}
