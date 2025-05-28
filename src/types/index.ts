import { DateTime } from 'luxon'
import {
  ObjectId,
  MongoClient,
  Db,
  Collection,
  Document,
  TransactionOptions as MongoTransactionOptions,
} from 'mongodb'

/**
 * Column decorator options
 */
export interface ColumnOptions {
  isPrimary?: boolean
  serialize?: (value: any) => any
  deserialize?: (value: any) => any
  isEmbedded?: boolean
  isReference?: boolean
  isComputed?: boolean
  model?: string
  localKey?: string
  foreignKey?: string
  isArray?: boolean
  isBelongsTo?: boolean
  serializeAs?: string | null
  embeddedType?: 'single' | 'many'
  embeddedModel?: () => typeof import('../base_model/base_model.js').BaseModel
}

// Export embedded types
export type {
  EmbeddedSingle,
  EmbeddedMany,
  EmbeddedOptions,
  EmbeddedQueryBuilder,
} from './embedded.js'

/**
 * Date column decorator options
 */
export interface DateColumnOptions extends ColumnOptions {
  autoCreate?: boolean
  autoUpdate?: boolean
}

/**
 * Model metadata for storing column information
 */
export interface ModelMetadata {
  columns: Map<string, ColumnOptions>
  primaryKey?: string
  tableName?: string
  hooks?: Map<string, string[]>
}

/**
 * MongoDB connection configuration
 */
export interface MongoConnectionConfig {
  /** The client type - must be 'mongodb' */
  client: 'mongodb'

  /** Connection details */
  connection: {
    /** MongoDB connection URL (e.g., 'mongodb://localhost:27017/mydb') */
    url?: string

    /** MongoDB host (alternative to url) */
    host?: string

    /** MongoDB port (alternative to url) */
    port?: number

    /** Database name (alternative to url) */
    database?: string

    /** MongoDB username for authentication */
    username?: string

    /** MongoDB password for authentication */
    password?: string

    /** Additional MongoDB connection options */
    options?: Record<string, any>
  }

  /** Use new URL parser (deprecated, defaults to true) */
  useNewUrlParser?: boolean

  /** Use unified topology (deprecated, defaults to true) */
  useUnifiedTopology?: boolean
}

/**
 * ODM configuration for NoSQL databases
 *
 * @example
 * ```typescript
 * import { defineConfig } from 'adonis-odm'
 *
 * export default defineConfig({
 *   connection: 'mongodb',
 *   connections: {
 *     mongodb: {
 *       client: 'mongodb',
 *       connection: {
 *         url: env.get('MONGODB_URL'),
 *       },
 *     },
 *   },
 * })
 * ```
 */
export interface OdmConfig {
  /** Default connection name to use */
  connection: string

  /** Named connection configurations */
  connections: Record<string, MongoConnectionConfig>
}

/**
 * @deprecated Use OdmConfig instead. Will be removed in future versions.
 */
export interface MongoConfig extends OdmConfig {}

/**
 * Query builder filter operators
 */
export type QueryOperator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'nin'
  | 'exists'
  | 'regex'
  | 'like'
  | '='
  | '!='
  | '>'
  | '>='
  | '<'
  | '<='

/**
 * Query filter value
 */
export type QueryValue = string | number | boolean | Date | DateTime | ObjectId | any[] | RegExp

/**
 * Query filter condition
 */
export interface QueryCondition {
  field: string
  operator: QueryOperator
  value: QueryValue
}

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc' | 1 | -1

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  total: number
  perPage: number
  currentPage: number
  lastPage: number
  firstPage: number
  firstPageUrl: string
  lastPageUrl: string
  nextPageUrl: string | null
  previousPageUrl: string | null
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  data: T[]
  meta: PaginationMeta
}

/**
 * Model constructor interface
 */
export interface ModelConstructor {
  new (...args: any[]): any
  getMetadata(): ModelMetadata
  getCollectionName(): string
  getConnection(): string
}

/**
 * Transaction options for MongoDB
 */
export interface TransactionOptions extends MongoTransactionOptions {}

/**
 * Model operation options
 */
export interface ModelOperationOptions {
  client?: any // MongoTransactionClient - avoiding circular import
}

/**
 * Database manager interface
 */
export interface DatabaseManager {
  connection(name?: string): MongoClient
  db(name?: string): Db
  collection<T extends Document = Document>(name: string, connectionName?: string): Collection<T>
}
