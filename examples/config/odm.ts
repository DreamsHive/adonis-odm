import { OdmConfig } from '../src/types/index.js'
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
        url: env.get(
          'MONGO_URI',
          // Default to test database URI if in test environment
          env.get('NODE_ENV') === 'test'
            ? 'mongodb://adonis_user:adonis_password@localhost:27017/adonis_mongo'
            : ''
        ),

        // Option 2: Use individual components (if url is not provided)
        host: env.get('MONGO_HOST', 'localhost'),
        port: env.get('MONGO_PORT', 27017),
        database: env.get('MONGO_DATABASE', 'adonis_mongo'),
        username: env.get('MONGO_USERNAME'),
        password: env.get('MONGO_PASSWORD'),

        // MongoDB connection options
        options: {
          maxPoolSize: env.get('MONGO_MAX_POOL_SIZE', 10),
          minPoolSize: env.get('MONGO_MIN_POOL_SIZE', 0),
          maxIdleTimeMS: env.get('MONGO_MAX_IDLE_TIME_MS', 30000),
          serverSelectionTimeoutMS: env.get('MONGO_SERVER_SELECTION_TIMEOUT_MS', 5000),
          socketTimeoutMS: env.get('MONGO_SOCKET_TIMEOUT_MS', 0),
          connectTimeoutMS: env.get('MONGO_CONNECT_TIMEOUT_MS', 10000),
        },
      },
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
}

export default odmConfig
