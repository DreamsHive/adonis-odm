/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  APP_KEY: Env.schema.string(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),

  // MongoDB configuration
  MONGO_CONNECTION: Env.schema.string.optional(),
  MONGO_URI: Env.schema.string.optional(),
  MONGO_HOST: Env.schema.string.optional(),
  MONGO_PORT: Env.schema.number.optional(),
  MONGO_DATABASE: Env.schema.string.optional(),
  MONGO_USERNAME: Env.schema.string.optional(),
  MONGO_PASSWORD: Env.schema.string.optional(),
  MONGO_MAX_POOL_SIZE: Env.schema.number.optional(),
  MONGO_MIN_POOL_SIZE: Env.schema.number.optional(),
  MONGO_MAX_IDLE_TIME_MS: Env.schema.number.optional(),
  MONGO_SERVER_SELECTION_TIMEOUT_MS: Env.schema.number.optional(),
  MONGO_SOCKET_TIMEOUT_MS: Env.schema.number.optional(),
  MONGO_CONNECT_TIMEOUT_MS: Env.schema.number.optional(),
})
