import { DateTime } from 'luxon'
import {
  ObjectId,
  MongoClient,
  Db,
  Collection,
  Document,
  WithId,
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
}

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
  client: 'mongodb'
  connection: {
    url?: string
    host?: string
    port?: number
    database?: string
    options?: Record<string, any>
  }
  useNewUrlParser?: boolean
  useUnifiedTopology?: boolean
}

/**
 * MongoDB ODM configuration
 */
export interface MongoConfig {
  connection: string
  connections: Record<string, MongoConnectionConfig>
}

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
