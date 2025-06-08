import type { Document } from 'mongodb'
import type { MongoDatabaseManager } from '../database_manager.js'

/**
 * Abstract base class for all database seeders
 *
 * This class provides the foundation for creating database seeders that can populate
 * MongoDB collections with initial or test data. All seeders must extend this class
 * and implement the abstract `run()` method.
 *
 * @example
 * ```typescript
 * import { BaseSeeder } from 'adonis-odm/seeders'
 * import User from '#models/user'
 *
 * export default class UserSeeder extends BaseSeeder {
 *   static environment = ['development', 'testing']
 *
 *   async run() {
 *     await User.createMany([
 *       { name: 'John Doe', email: 'john@example.com' },
 *       { name: 'Jane Smith', email: 'jane@example.com' },
 *     ])
 *   }
 * }
 * ```
 */
export abstract class BaseSeeder {
  /**
   * Environment restrictions for the seeder
   *
   * If specified, the seeder will only run in the listed environments.
   * If not specified, the seeder will run in all environments.
   *
   * @example
   * ```typescript
   * static environment = ['development', 'testing']
   * ```
   */
  static environment?: string[]

  /**
   * Execution order for the seeder
   *
   * Seeders with lower order values run first. If not specified, defaults to 999.
   * Main seeders (index.ts or main.ts) are automatically given order 0.
   *
   * @example
   * ```typescript
   * static order = 1
   * ```
   */
  static order?: number

  /**
   * Dependencies for the seeder
   *
   * Array of seeder class names that must run before this seeder.
   * Dependencies are resolved using topological sorting.
   *
   * @example
   * ```typescript
   * static dependencies = ['UserSeeder', 'RoleSeeder']
   * ```
   */
  static dependencies?: string[]

  /**
   * Database manager instance providing access to MongoDB connections
   */
  protected client: MongoDatabaseManager

  /**
   * Optional connection name to use for this seeder
   *
   * If not specified, the default connection will be used.
   * Useful for multi-tenant scenarios where different seeders
   * need to target different databases.
   */
  protected connection?: string

  /**
   * Create a new seeder instance
   *
   * @param client - The MongoDB database manager instance
   * @param connection - Optional connection name to use
   */
  constructor(client: MongoDatabaseManager, connection?: string) {
    this.client = client
    this.connection = connection
  }

  /**
   * Abstract method that must be implemented by all seeders
   *
   * This method contains the actual seeding logic and will be called
   * when the seeder is executed. It should populate the database with
   * the required data.
   *
   * @throws {Error} If the seeder implementation fails
   */
  abstract run(): Promise<void>

  /**
   * Get the database instance for the configured connection
   *
   * @returns The MongoDB database instance
   */
  protected getDatabase() {
    return this.client.db(this.connection)
  }

  /**
   * Get a collection instance for the configured connection
   *
   * @param name - The collection name
   * @returns The MongoDB collection instance
   */
  protected getCollection<T extends Document = Document>(name: string) {
    return this.client.collection<T>(name, this.connection)
  }

  /**
   * Check if the seeder should run in the current environment
   *
   * @param currentEnvironment - The current environment (e.g., 'development', 'production')
   * @returns True if the seeder should run, false otherwise
   */
  static shouldRun(currentEnvironment: string): boolean {
    // If no environment restrictions are specified, run in all environments
    if (!this.environment || this.environment.length === 0) {
      return true
    }

    // Check if current environment is in the allowed list
    return this.environment.includes(currentEnvironment)
  }

  /**
   * Get the seeder class name for logging and identification
   *
   * @returns The class name of the seeder
   */
  static getSeederName(): string {
    return this.name
  }
}
