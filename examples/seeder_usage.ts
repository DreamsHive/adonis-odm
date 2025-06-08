/**
 * Example: Using SeederManager through AdonisJS IoC Container
 *
 * This example demonstrates how to use the SeederManager that has been
 * registered in the IoC container by the MongoDB provider.
 */

import type { ApplicationService } from '@adonisjs/core/types'
import { SeederManager } from '../src/seeders/seeder_manager.js'

/**
 * Example service that uses SeederManager through dependency injection
 */
export class DatabaseSeederService {
  constructor(private seederManager: SeederManager) {}

  /**
   * Run all seeders for the current environment
   */
  async seedDatabase() {
    console.log('🌱 Starting database seeding...')

    const results = await this.seederManager.run({
      environment: process.env.NODE_ENV || 'development',
    })

    for (const result of results) {
      if (result.executed) {
        console.log(`✅ ${result.name} executed in ${result.executionTime}ms`)
      } else if (result.error) {
        console.log(`❌ ${result.name} failed: ${result.error.message}`)
      } else {
        console.log(`⏭️  ${result.name} skipped: ${result.skipReason}`)
      }
    }

    const executed = results.filter((r) => r.executed).length
    const failed = results.filter((r) => r.error).length
    const skipped = results.filter((r) => !r.executed && !r.error).length

    console.log(
      `\n📊 Seeding completed: ${executed} executed, ${failed} failed, ${skipped} skipped`
    )
  }

  /**
   * Run specific seeder files
   */
  async seedSpecificFiles(files: string[]) {
    console.log(`🎯 Running specific seeders: ${files.join(', ')}`)

    const results = await this.seederManager.run({
      files,
      environment: process.env.NODE_ENV || 'development',
    })

    return results
  }

  /**
   * Get available seeder files
   */
  async getAvailableSeeders() {
    const files = await this.seederManager.getSeederFiles()
    console.log(`📁 Found ${files.length} seeder files:`)
    files.forEach((file) => console.log(`  - ${file}`))
    return files
  }
}

/**
 * Example: Resolving SeederManager from IoC container
 */
export function createSeederService(app: ApplicationService): DatabaseSeederService {
  // Resolve SeederManager from the container
  const seederManager = app.container.make('odm.seeder')

  // Create and return the service
  return new DatabaseSeederService(seederManager)
}

/**
 * Example: Direct usage in a controller or service
 */
export async function exampleUsage(app: ApplicationService) {
  try {
    // Method 1: Resolve directly from container
    const seederManager = app.container.make('odm.seeder') as SeederManager

    // Method 2: Use through a service
    const seederService = createSeederService(app)

    // Get available seeders
    await seederService.getAvailableSeeders()

    // Run all seeders
    await seederService.seedDatabase()

    // Run specific seeders
    await seederService.seedSpecificFiles(['./database/seeders/user_seeder.ts'])
  } catch (error) {
    console.error('❌ Seeding failed:', error)
  }
}

/**
 * Example: Using in an AdonisJS command
 */
export class SeedCommand {
  static commandName = 'db:seed'
  static description = 'Run database seeders'

  constructor(private app: ApplicationService) {}

  async run() {
    const seederManager = this.app.container.make('odm.seeder') as SeederManager

    const results = await seederManager.run({
      environment: process.env.NODE_ENV || 'development',
    })

    // Process results...
    console.log(`Executed ${results.filter((r) => r.executed).length} seeders`)
  }
}

/**
 * Example: Using with specific connection
 */
export async function seedTenantDatabase(app: ApplicationService, tenantConnection: string) {
  const seederManager = app.container.make('odm.seeder') as SeederManager

  const results = await seederManager.run({
    connection: tenantConnection,
    environment: 'production',
  })

  return results
}
