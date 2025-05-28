/**
 * AdonisJS MongoDB ODM Package
 *
 * A comprehensive MongoDB ODM for AdonisJS with Lucid-style API,
 * type-safe relationships, embedded documents, and transaction support.
 */

import 'reflect-metadata'

// Configure function for package setup
export { configure } from '../configure.js'

// Core Model and Query Builder
export { BaseModel } from './base_model/base_model.js'
export { ModelQueryBuilder } from './query_builder/model_query_builder.js'

// Database Manager and Transaction Client
export { MongoDatabaseManager } from './database_manager.js'
export type { MongoTransactionClient } from './transaction_client.js'
export { ConcreteMongoTransactionClient } from './transaction_client.js'

// Configuration
export { defineConfig } from './config/odm_config.js'

// Decorators
export { column, computed, hasOne, hasMany, belongsTo } from './decorators/column.js'
export {
  beforeSave,
  afterSave,
  beforeCreate,
  afterCreate,
  beforeUpdate,
  afterUpdate,
  beforeDelete,
  afterDelete,
  beforeFind,
  afterFind,
  beforeFetch,
  afterFetch,
} from './decorators/hooks.js'

// Embedded Documents
export { EmbeddedModelInstance } from './embedded/embedded_model_instance.js'
export { EmbeddedQueryBuilder } from './embedded/embedded_query_builder.js'
export { EmbeddedSingleProxy, EmbeddedManyProxy } from './embedded/embedded_proxies.js'

// Relationship Proxies
export {
  createHasOneProxy,
  createHasManyProxy,
  createBelongsToProxy,
  createRelationshipProxy,
} from './relationships/relationship_proxies.js'

// Naming Strategy
export {
  type NamingStrategyContract,
  CamelCaseNamingStrategy,
  SnakeCaseNamingStrategy,
} from './naming_strategy/naming_strategy.js'

// Utilities
export { NestedDocumentHelpers } from './utils/nested_document_helpers.js'

// Types and Interfaces
export type {
  ColumnOptions,
  DateColumnOptions,
  ModelMetadata,
  MongoConnectionConfig,
  MongoConfig,
  QueryOperator,
  QueryValue,
  QueryCondition,
  SortDirection,
  PaginationMeta,
  PaginatedResult,
  ModelConstructor,
  TransactionOptions,
  ModelOperationOptions,
  DatabaseManager,
} from './types/index.js'

export type {
  EmbeddedSingle,
  EmbeddedMany,
  EmbeddedOptions,
  EmbeddedCreationAttributes,
  CreateAttributes,
} from './types/embedded.js'

export type {
  LoadRelationConstraint,
  EmbedRelationConstraint,
} from './types/relationship_inference.js'

// Exceptions
export {
  MongoOdmException,
  ModelNotFoundException,
  ConnectionException,
  ConfigurationException,
  DatabaseOperationException,
  ValidationException,
  TransactionException,
  HookExecutionException,
  RelationshipException,
} from './exceptions/index.js'
