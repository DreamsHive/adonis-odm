import { MongoConfig } from '../src/types/index.js'
import env from '#start/env'

const mongoConfig: MongoConfig = {
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
  | MongoDB Connections
  |--------------------------------------------------------------------------
  |
  | Here we define all the MongoDB connections used by your application.
  | You can define multiple connections and switch between them as needed.
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

export default mongoConfig
