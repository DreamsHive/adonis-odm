/**
 * MongoDB Database Service
 *
 * This service provides access to the MongoDB database manager,
 * similar to how AdonisJS Lucid provides the `db` service.
 *
 * Usage:
 * import db from 'adonis-odm/services/db'
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

// Import the database service directly from the package
import db from 'adonis-odm/services/db'

export default db
