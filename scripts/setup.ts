#!/usr/bin/env node

import { writeFileSync, existsSync, mkdirSync, readFileSync, appendFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Setup script for MongoDB ODM
 * This script helps configure the MongoDB ODM in an AdonisJS project
 */

const CONFIG_TEMPLATE = `import { OdmConfig } from '../src/types/index.js'
import env from '#start/env'

const odmConfig: OdmConfig = {
  /*
  |--------------------------------------------------------------------------
  | Default Connection
  |--------------------------------------------------------------------------
  |
  | The default connection name to use for database operations.
  |
  */
  connection: env.get('MONGO_CONNECTION', 'mongodb'),

  /*
  |--------------------------------------------------------------------------
  | ODM Connections
  |--------------------------------------------------------------------------
  |
  | Here we define all the NoSQL database connections used by your application.
  | You can define multiple connections and switch between them as needed.
  | Currently supports MongoDB, with DynamoDB support planned.
  |
  */
  connections: {
    mongodb: {
      client: 'mongodb',
      connection: {
        // Option 1: Use a full URI
        url: env.get('MONGO_URI', ''),

        // Option 2: Use individual components (if url is not provided)
        host: env.get('MONGO_HOST', 'localhost'),
        port: Number(env.get('MONGO_PORT', '27017')),
        database: env.get('MONGO_DATABASE', 'adonis_mongo'),

        // MongoDB connection options
        options: {
          maxPoolSize: Number(env.get('MONGO_MAX_POOL_SIZE', '10')),
          minPoolSize: Number(env.get('MONGO_MIN_POOL_SIZE', '0')),
          maxIdleTimeMS: Number(env.get('MONGO_MAX_IDLE_TIME_MS', '30000')),
          serverSelectionTimeoutMS: Number(env.get('MONGO_SERVER_SELECTION_TIMEOUT_MS', '5000')),
          socketTimeoutMS: Number(env.get('MONGO_SOCKET_TIMEOUT_MS', '0')),
          connectTimeoutMS: Number(env.get('MONGO_CONNECT_TIMEOUT_MS', '10000')),
        },
      },
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
}

export default odmConfig
`

const ENV_TEMPLATE = `
# MongoDB Configuration
MONGO_HOST=localhost
MONGO_PORT=27017
MONGO_DATABASE=adonis_mongo
MONGO_CONNECTION=mongodb

# Optional: Use a full URI instead of individual components
# MONGO_URI=mongodb://localhost:27017/adonis_mongo

# Connection Pool Settings
MONGO_MAX_POOL_SIZE=10
MONGO_MIN_POOL_SIZE=0
MONGO_MAX_IDLE_TIME_MS=30000
MONGO_SERVER_SELECTION_TIMEOUT_MS=5000
MONGO_SOCKET_TIMEOUT_MS=0
MONGO_CONNECT_TIMEOUT_MS=10000
`

const EXAMPLE_MODEL = `import { BaseModel } from '../src/base_model/base_model.js'
import { column } from '../src/decorators/column.js'
import { DateTime } from 'luxon'

export default class User extends BaseModel {
  @column({ isPrimary: true })
  declare _id: string

  @column()
  declare name: string

  @column()
  declare email: string

  @column()
  declare age?: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
`

function createDirectoryIfNotExists(path: string) {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true })
    console.log(`✅ Created directory: ${path}`)
  }
}

function createFileIfNotExists(path: string, content: string, description: string) {
  if (!existsSync(path)) {
    writeFileSync(path, content)
    console.log(`✅ Created ${description}: ${path}`)
  } else {
    console.log(`⚠️  ${description} already exists: ${path}`)
  }
}

function appendToFileIfNotExists(path: string, content: string, description: string) {
  if (existsSync(path)) {
    const existingContent = readFileSync(path, 'utf8')
    if (!existingContent.includes('MONGO_HOST')) {
      appendFileSync(path, content)
      console.log(`✅ Added ${description} to: ${path}`)
    } else {
      console.log(`⚠️  ${description} already exists in: ${path}`)
    }
  } else {
    writeFileSync(path, content.trim())
    console.log(`✅ Created ${description}: ${path}`)
  }
}

async function setup() {
  console.log('🚀 Setting up MongoDB ODM for AdonisJS v6')
  console.log('==========================================')

  try {
    // Create necessary directories
    createDirectoryIfNotExists('config')
    createDirectoryIfNotExists('app/models')

    // Create configuration file
    createFileIfNotExists(join('config', 'odm.ts'), CONFIG_TEMPLATE, 'ODM configuration')

    // Add environment variables
    appendToFileIfNotExists('.env', ENV_TEMPLATE, 'MongoDB environment variables')

    // Create example model
    createFileIfNotExists(join('app', 'models', 'user.ts'), EXAMPLE_MODEL, 'Example User model')

    console.log('\n🎉 Setup completed successfully!')
    console.log('\n📋 Next steps:')
    console.log('1. Install dependencies: npm install mongodb luxon')
    console.log('2. Add the MongoDB provider to your adonisrc.ts providers array:')
    console.log("   () => import('#providers/mongodb_provider')")
    console.log('3. Configure your MongoDB connection in .env file')
    console.log('4. Start using your models!')
    console.log('\n📖 Check the README.md for detailed usage instructions.')
  } catch (error) {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  }
}

// Run setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setup()
}

export { setup }
