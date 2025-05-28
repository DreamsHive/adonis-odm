/*
 * adonis-odm
 *
 * (c) AdonisJS MongoDB ODM
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import app from '@adonisjs/core/services/app'
import { MongoDatabaseManager } from '../src/database_manager.js'

let db: MongoDatabaseManager

/**
 * Returns a singleton instance of the MongoDatabaseManager class from the
 * container
 */
await app.booted(async () => {
  db = await app.container.make(MongoDatabaseManager)
})

export { db as default }
