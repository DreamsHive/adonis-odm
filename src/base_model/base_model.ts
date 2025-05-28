import { ObjectId, WithId, Document } from 'mongodb'
import { ModelQueryBuilder } from '../query_builder/model_query_builder.js'
import { ModelMetadata, ModelOperationOptions } from '../types/index.js'

import {
  CamelCaseNamingStrategy,
  type NamingStrategyContract,
} from '../naming_strategy/naming_strategy.js'
import type { MongoTransactionClient } from '../transaction_client.js'

/**
 * Type for create method attributes - includes all properties except methods, relationships, and BaseModel internals
 * Following AdonisJS Lucid pattern: computed properties and all data types are included
 */
// Import the proper creation type that handles both embedded and referenced documents
import type { CreateAttributes } from '../types/embedded.js'
import { ModelRegistry } from './model_registry.js'
import { AttributeManager } from './attribute_manager.js'
import { SerializationManager } from './serialization_manager.js'
import { PersistenceManager } from './persistence_manager.js'
import { StaticQueryMethods } from './static_query_methods.js'

/**
 * Symbol to store model metadata
 */
export const MODEL_METADATA = Symbol('model_metadata')

/**
 * Base Model class for MongoDB ODM
 */
export class BaseModel {
  /**
   * Naming strategy for the model
   * Defaults to CamelCaseNamingStrategy which converts camelCase to snake_case for serialization
   */
  public static namingStrategy: NamingStrategyContract = new CamelCaseNamingStrategy()

  /**
   * Indicates if the model instance exists in the database
   */
  public $isPersisted: boolean = false

  /**
   * Indicates if the model instance is local and not persisted
   */
  public $isLocal: boolean = true

  /**
   * Tracks modified properties
   */
  public $dirty: Record<string, any> = {}

  /**
   * Original values before modifications
   */
  public $original: Record<string, any> = {}

  /**
   * MongoDB document ID
   */
  public _id?: ObjectId | string

  /**
   * Transaction client for this model instance
   */
  public $trx?: MongoTransactionClient

  /**
   * Attribute manager instance
   */
  private $attributeManager: AttributeManager

  /**
   * Serialization manager instance
   */
  private $serializationManager: SerializationManager

  /**
   * Persistence manager instance
   */
  private $persistenceManager: PersistenceManager

  constructor(attributes: Record<string, any> = {}) {
    // Initialize managers
    this.$attributeManager = new AttributeManager(this)
    this.$serializationManager = new SerializationManager(this)
    this.$persistenceManager = new PersistenceManager(this)

    this.fill(attributes)

    // For new models, mark all filled attributes as dirty so hooks can detect them
    if (!this.$isPersisted) {
      for (const [key, value] of Object.entries(attributes)) {
        const metadata = (this.constructor as typeof BaseModel).getMetadata()
        const columnOptions = metadata.columns.get(key)

        // Skip reference fields and computed properties
        if (!columnOptions?.isReference && !columnOptions?.isComputed) {
          this.$dirty[key] = value
        }
      }
    }

    this.initializeRelationshipProxies()

    // Auto-register the model class in the registry
    ModelRegistry.register(this.constructor as typeof BaseModel)
  }

  /**
   * Get model metadata
   */
  static getMetadata(): ModelMetadata {
    if (!(this as any)[MODEL_METADATA]) {
      ;(this as any)[MODEL_METADATA] = {
        columns: new Map(),
        primaryKey: '_id',
        tableName: undefined,
      }
    }
    return (this as any)[MODEL_METADATA]
  }

  /**
   * Register a model in the global registry
   */
  static register(): void {
    ModelRegistry.register(this)
  }

  /**
   * Get a model class from the registry
   */
  static getModelClass(modelName: string): typeof BaseModel | undefined {
    return ModelRegistry.get(modelName)
  }

  /**
   * Check if a model is registered
   */
  static hasModelClass(modelName: string): boolean {
    return ModelRegistry.has(modelName)
  }

  /**
   * Get all registered models
   */
  static getAllModels(): Map<string, typeof BaseModel> {
    return ModelRegistry.getAll()
  }

  /**
   * Clear the model registry (useful for testing)
   */
  static clearRegistry(): void {
    ModelRegistry.clear()
  }

  /**
   * Associate this model instance with a transaction
   */
  public useTransaction(trx: MongoTransactionClient): this {
    this.$trx = trx
    return this
  }

  /**
   * Get collection name for the model
   */
  static getCollectionName(): string {
    const metadata = this.getMetadata()
    if (metadata.tableName) {
      return metadata.tableName
    }

    // Convert class name to snake_case and pluralize
    const className = this.name
    const snakeCase = className
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '')

    // Better pluralization logic
    // Handle common patterns like "User" -> "users", "UserWithProfile" -> "users_with_profiles"
    const words = snakeCase.split('_')

    // Helper function to pluralize a word
    const pluralize = (word: string): string => {
      if (word.endsWith('y')) {
        return word.slice(0, -1) + 'ies'
      } else if (
        word.endsWith('s') ||
        word.endsWith('sh') ||
        word.endsWith('ch') ||
        word.endsWith('x') ||
        word.endsWith('z')
      ) {
        return word + 'es'
      } else {
        return word + 's'
      }
    }

    // For compound names like "UserWithReferencedProfile", pluralize both first and last words
    // This handles cases like "UserProfile" -> "users_profiles" and "UserWithReferencedProfile" -> "users_with_referenced_profiles"
    if (words.length > 1) {
      words[0] = pluralize(words[0]) // Pluralize first word (main entity)
      words[words.length - 1] = pluralize(words[words.length - 1]) // Pluralize last word
    } else {
      words[0] = pluralize(words[0]) // Single word, just pluralize it
    }

    return words.join('_')
  }

  /**
   * Get connection name for the model
   */
  static getConnection(): string {
    return 'mongodb' // Default connection name
  }

  /**
   * Create a new query builder instance with type-safe relationship loading
   */
  static query<T extends BaseModel = BaseModel>(
    this: typeof BaseModel & (new (...args: any[]) => T),
    options?: ModelOperationOptions
  ): ModelQueryBuilder<Document, T> {
    return StaticQueryMethods.query(this, options)
  }

  /**
   * Find a document by its ID
   */
  static async find<T extends BaseModel = BaseModel>(
    this: typeof BaseModel & (new (...args: any[]) => T),
    id: string | ObjectId,
    options?: ModelOperationOptions
  ): Promise<T | null> {
    return StaticQueryMethods.find(this, id, options)
  }

  /**
   * Find a document by its ID or throw an exception
   */
  static async findOrFail<T extends BaseModel>(
    this: typeof BaseModel & (new (...args: any[]) => T),
    id: string | ObjectId,
    options?: ModelOperationOptions
  ): Promise<T> {
    return StaticQueryMethods.findOrFail(this, id, options)
  }

  /**
   * Find a document by a specific field
   */
  static async findBy<T extends BaseModel>(
    this: typeof BaseModel & (new (...args: any[]) => T),
    field: string,
    value: any
  ): Promise<T | null> {
    return StaticQueryMethods.findBy(this, field, value)
  }

  /**
   * Find a document by a specific field or throw an exception
   */
  static async findByOrFail<T extends BaseModel>(
    this: typeof BaseModel & (new (...args: any[]) => T),
    field: string,
    value: any
  ): Promise<T> {
    return StaticQueryMethods.findByOrFail(this, field, value)
  }

  /**
   * Get the first document
   */
  static async first<T extends BaseModel>(
    this: typeof BaseModel & (new (...args: any[]) => T)
  ): Promise<T | null> {
    return StaticQueryMethods.first(this)
  }

  /**
   * Get the first document or throw an exception
   */
  static async firstOrFail<T extends BaseModel>(
    this: typeof BaseModel & (new (...args: any[]) => T)
  ): Promise<T> {
    return StaticQueryMethods.firstOrFail(this)
  }

  /**
   * Get all documents
   */
  static async all<T extends BaseModel>(
    this: typeof BaseModel & (new (...args: any[]) => T)
  ): Promise<T[]> {
    return StaticQueryMethods.all(this)
  }

  /**
   * Create a new document
   */
  static async create<T extends BaseModel>(
    this: new (...args: any[]) => T,
    attributes: CreateAttributes<T>,
    options?: ModelOperationOptions
  ): Promise<T> {
    return StaticQueryMethods.create(this, attributes, options)
  }

  /**
   * Create multiple documents
   */
  static async createMany<T extends BaseModel>(
    this: new (...args: any[]) => T,
    attributesArray: CreateAttributes<T>[]
  ): Promise<T[]> {
    return StaticQueryMethods.createMany(this, attributesArray)
  }

  /**
   * Update or create a document
   */
  static async updateOrCreate<T extends BaseModel>(
    this: new (...args: any[]) => T,
    searchPayload: CreateAttributes<T>,
    persistencePayload: CreateAttributes<T>
  ): Promise<T> {
    return StaticQueryMethods.updateOrCreate(this, searchPayload, persistencePayload)
  }

  /**
   * Fill the model with attributes
   */
  fill(attributes: Record<string, any>): this {
    this.$attributeManager.fill(attributes)
    return this
  }

  /**
   * Merge new attributes into the model
   */
  merge(attributes: Record<string, any>): this {
    this.$attributeManager.merge(attributes)
    return this
  }

  /**
   * Save the model to the database
   */
  async save(): Promise<this> {
    await this.$persistenceManager.save()
    return this
  }

  /**
   * Delete the model from the database
   */
  async delete(): Promise<boolean> {
    return this.$persistenceManager.delete()
  }

  /**
   * Get an attribute value
   */
  getAttribute(key: string): any {
    return this.$attributeManager.getAttribute(key)
  }

  /**
   * Set an attribute value
   */
  setAttribute(key: string, value: any): void {
    this.$attributeManager.setAttribute(key, value)
  }

  /**
   * Hydrate the model from a MongoDB document
   * Handles conversion from database column names (snake_case) back to model properties (camelCase)
   */
  hydrateFromDocument(document: WithId<Document>): void {
    this.$serializationManager.hydrateFromDocument(document)
  }

  /**
   * Convert the model to a plain object for database storage
   * Following AdonisJS Lucid naming strategy (camelCase -> snake_case by default)
   */
  toDocument(): Record<string, any> {
    return this.$serializationManager.toDocument()
  }

  /**
   * Convert the model to a plain object for JSON serialization (API responses)
   * This includes computed properties and properly serializes relationships
   * Following AdonisJS Lucid naming strategy (camelCase -> snake_case by default)
   */
  toJSON(): Record<string, any> {
    return this.$serializationManager.toJSON()
  }

  /**
   * Get dirty attributes for the model
   * Returns attributes with database column names (snake_case) for database operations
   */
  public getDirtyAttributes(): Record<string, any> {
    return this.$attributeManager.getDirtyAttributes()
  }

  /**
   * Sync the original values with current values
   */
  public syncOriginal(): void {
    this.$attributeManager.syncOriginal()
  }

  /**
   * Initialize relationship proxies for Lucid-style property access
   * Note: Relationship proxies are now created directly by the decorators
   */
  private initializeRelationshipProxies(): void {
    // Relationship proxies are automatically created by the @hasOne, @hasMany, @belongsTo decorators
    // No manual initialization needed
  }
}
