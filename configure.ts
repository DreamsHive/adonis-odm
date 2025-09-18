/**
 * Configure script for AdonisJS MongoDB ODM
 *
 * This script is executed when users run:
 * node ace configure adonis-odm
 */

import { getDirname } from '@adonisjs/core/helpers'
import type Configure from '@adonisjs/core/commands/configure'

// Get the stubs directory path
const stubsRoot = getDirname(import.meta.url) + '/stubs'

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
   * Update environment variables
   */
  await codemods.defineEnvVariables({
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
  })

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
