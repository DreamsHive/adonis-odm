/**
 * Configure script for AdonisJS MongoDB ODM
 *
 * This script is executed when users run:
 * node ace configure adonis-odm
 */

import { getDirname } from '@adonisjs/core/helpers'
import type Configure from '@adonisjs/core/commands/configure'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// Get the stubs directory path
const stubsRoot = getDirname(import.meta.url) + '/stubs'

/**
 * Read existing environment variables from .env file
 */
function getExistingEnvVariables(projectRoot: string): Record<string, string> {
  const envPath = join(projectRoot, '.env')
  const existingVars: Record<string, string> = {}

  if (existsSync(envPath)) {
    try {
      const envContent = readFileSync(envPath, 'utf8')
      const lines = envContent.split('\n')

      for (const line of lines) {
        const trimmedLine = line.trim()
        // Skip empty lines and comments
        if (!trimmedLine || trimmedLine.startsWith('#')) {
          continue
        }

        // Parse KEY=VALUE format
        const equalIndex = trimmedLine.indexOf('=')
        if (equalIndex > 0) {
          const key = trimmedLine.substring(0, equalIndex).trim()
          const value = trimmedLine.substring(equalIndex + 1).trim()
          existingVars[key] = value
        }
      }
    } catch (error) {
      // If we can't read the file, just continue with empty existing vars
      console.warn('Warning: Could not read existing .env file:', error)
    }
  }

  return existingVars
}

/**
 * Filter out environment variables that already exist
 */
function filterNewEnvVariables(
  newVars: Record<string, string>,
  existingVars: Record<string, string>
): Record<string, string> {
  const filteredVars: Record<string, string> = {}

  for (const [key, value] of Object.entries(newVars)) {
    if (!(key in existingVars)) {
      filteredVars[key] = value
    }
  }

  return filteredVars
}

export async function configure(command: Configure) {
  const codemods = await command.createCodemods()

  /**
   * Register the MongoDB provider
   */
  await codemods.updateRcFile((rcFile) => {
    rcFile.addProvider('adonis-odm/providers/mongodb_provider')
  })

  /**
   * Register commands
   */
  await codemods.updateRcFile((rcFile) => {
    rcFile.addCommand('adonis-odm/commands')
  })

  /**
   * Create configuration file
   */
  await codemods.makeUsingStub(stubsRoot, 'config/odm.stub', {
    connectionName: 'mongodb',
  })

  /**
   * Update environment variables (only add new ones, preserve existing)
   */
  const projectRoot = command.app.appRoot.toString()
  const existingEnvVars = getExistingEnvVariables(projectRoot)

  // Define the environment variables we want to add
  const mongoEnvVars = {
    MONGO_HOST: 'localhost',
    MONGO_PORT: '27017',
    MONGO_DATABASE: 'your_database_name',
    MONGO_URI: 'mongodb://localhost:27017/your_database_name',
    MONGO_USERNAME: '',
    MONGO_PASSWORD: '',
    MONGO_MAX_POOL_SIZE: '10',
    MONGO_MIN_POOL_SIZE: '0',
    MONGO_MAX_IDLE_TIME_MS: '30000',
    MONGO_SERVER_SELECTION_TIMEOUT_MS: '5000',
    MONGO_SOCKET_TIMEOUT_MS: '0',
    MONGO_CONNECT_TIMEOUT_MS: '10000',
  }

  // Filter out variables that already exist
  const newEnvVars = filterNewEnvVariables(mongoEnvVars, existingEnvVars)

  // Only add environment variables if there are new ones to add
  if (Object.keys(newEnvVars).length > 0) {
    await codemods.defineEnvVariables(newEnvVars)
    console.log('✅ Added new MongoDB environment variables to .env file')
    console.log('📝 New variables added:', Object.keys(newEnvVars).join(', '))
  } else {
    console.log('ℹ️  All MongoDB environment variables already exist in .env file')
  }

  // Show which variables were preserved
  const preservedVars = Object.keys(mongoEnvVars).filter((key) => key in existingEnvVars)
  if (preservedVars.length > 0) {
    console.log('🔒 Preserved existing variables:', preservedVars.join(', '))
  }

  /**
   * Update .env.example file
   */
  await codemods.defineEnvValidations({
    leadingComment: 'Variables for configuring MongoDB ODM',
    variables: {
      MONGO_HOST: 'Env.schema.string.optional()',
      MONGO_PORT: 'Env.schema.number.optional()',
      MONGO_DATABASE: 'Env.schema.string.optional()',
      MONGO_URI: 'Env.schema.string.optional()',
      MONGO_USERNAME: 'Env.schema.string.optional()',
      MONGO_PASSWORD: 'Env.schema.string.optional()',
      MONGO_MAX_POOL_SIZE: 'Env.schema.number.optional()',
      MONGO_MIN_POOL_SIZE: 'Env.schema.number.optional()',
      MONGO_MAX_IDLE_TIME_MS: 'Env.schema.number.optional()',
      MONGO_SERVER_SELECTION_TIMEOUT_MS: 'Env.schema.number.optional()',
      MONGO_SOCKET_TIMEOUT_MS: 'Env.schema.number.optional()',
      MONGO_CONNECT_TIMEOUT_MS: 'Env.schema.number.optional()',
    },
  })

  console.log('✅ AdonisJS MongoDB ODM configured successfully!')
  console.log('')
  console.log('Next steps:')
  console.log('1. Update your .env file with your MongoDB connection details')
  console.log('2. Start your MongoDB server (or use MongoDB Atlas)')
  console.log('3. Create your first model using: node ace make:model User')
  console.log('')
  console.log('Example model:')
  console.log(`
import { BaseModel, column } from 'adonis-odm'
import { DateTime } from 'luxon'

export default class User extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare name: string

  @column()
  declare email: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}`)
  console.log('')
  console.log('📖 Read the documentation: https://adonis-odm.dreamshive.io/')
}
