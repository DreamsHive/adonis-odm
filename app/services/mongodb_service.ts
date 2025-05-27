import app from '@adonisjs/core/services/app'
import { MongoDatabaseManager } from '../../src/database_manager.js'

/**
 * MongoDB Database Service
 *
 * This service provides access to the MongoDB database manager,
 * similar to how AdonisJS Lucid provides the `db` service.
 *
 * Usage:
 * import db from '#services/mongodb_service'
 *
 * // Managed transaction
 * const result = await db.transaction(async (trx) => {
 *   // Your operations here
 * })
 *
 * // Manual transaction
 * const trx = await db.transaction()
 * try {
 *   // Your operations here
 *   await trx.commit()
 * } catch (error) {
 *   await trx.rollback()
 * }
 */

let dbManager: MongoDatabaseManager

try {
  dbManager = await app.container.make('mongodb')
} catch (error) {
  throw new Error(
    'MongoDB service not available. Make sure the MongoDB provider is registered in adonisrc.ts'
  )
}

export default dbManager
