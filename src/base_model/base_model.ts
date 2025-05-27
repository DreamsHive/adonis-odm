import { DateTime } from 'luxon'
import { ObjectId, WithId, Document } from 'mongodb'
import { ModelQueryBuilder } from '../query_builder/model_query_builder.js'
import { ModelMetadata, DateColumnOptions, ModelOperationOptions } from '../types/index.js'
import { ModelNotFoundException } from '../exceptions/index.js'

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

/**
 * Symbol to store model metadata
 */
export const MODEL_METADATA = Symbol('model_metadata')

/**
 * Global model registry for relationship loading
 */
class ModelRegistry {
  private static models: Map<string, typeof BaseModel> = new Map()

  static register(modelClass: typeof BaseModel): void {
    this.models.set(modelClass.name, modelClass)
  }

  static get(modelName: string): typeof BaseModel | undefined {
    return this.models.get(modelName)
  }

  static has(modelName: string): boolean {
    return this.models.has(modelName)
  }

  static clear(): void {
    this.models.clear()
  }

  static getAll(): Map<string, typeof BaseModel> {
    return new Map(this.models)
  }
}

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

  constructor(attributes: Record<string, any> = {}) {
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

    this.applyTimestamps() // Apply auto-create timestamps for new models
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
    _options?: ModelOperationOptions
  ): ModelQueryBuilder<Document, T> {
    // This would be injected by the service provider
    // For now, we'll throw an error to indicate it needs to be set up
    throw new Error('Database connection not configured. Please register the MongoDB ODM provider.')
  }

  /**
   * Find a document by its ID
   */
  static async find<T extends BaseModel = BaseModel>(
    this: typeof BaseModel & (new (...args: any[]) => T),
    id: string | ObjectId,
    options?: ModelOperationOptions
  ): Promise<T | null> {
    // Use the query builder which already has hooks integrated
    return await (this as any).query(options).where('_id', id).first()
  }

  /**
   * Find a document by its ID or throw an exception
   */
  static async findOrFail<T extends BaseModel>(
    this: typeof BaseModel & (new (...args: any[]) => T),
    id: string | ObjectId,
    options?: ModelOperationOptions
  ): Promise<T> {
    const result = await (this as any).find(id, options)
    if (!result) {
      throw new ModelNotFoundException(this.name, id)
    }
    return result
  }

  /**
   * Find a document by a specific field
   */
  static async findBy<T extends BaseModel>(
    this: typeof BaseModel & (new (...args: any[]) => T),
    field: string,
    value: any
  ): Promise<T | null> {
    // Use the query builder which already has hooks integrated
    return await (this as any).query().where(field, value).first()
  }

  /**
   * Find a document by a specific field or throw an exception
   */
  static async findByOrFail<T extends BaseModel>(
    this: typeof BaseModel & (new (...args: any[]) => T),
    field: string,
    value: any
  ): Promise<T> {
    const result = await (this as any).findBy(field, value)
    if (!result) {
      throw new ModelNotFoundException(this.name, `${field}=${value}`)
    }
    return result
  }

  /**
   * Get the first document
   */
  static async first<T extends BaseModel>(
    this: typeof BaseModel & (new (...args: any[]) => T)
  ): Promise<T | null> {
    // Use the query builder which already has hooks integrated
    return await (this as any).query().first()
  }

  /**
   * Get the first document or throw an exception
   */
  static async firstOrFail<T extends BaseModel>(
    this: typeof BaseModel & (new (...args: any[]) => T)
  ): Promise<T> {
    const result = await (this as any).first()
    if (!result) {
      throw new ModelNotFoundException(this.name)
    }
    return result
  }

  /**
   * Get all documents
   */
  static async all<T extends BaseModel>(
    this: typeof BaseModel & (new (...args: any[]) => T)
  ): Promise<T[]> {
    // Use the query builder which already has hooks integrated
    return await (this as any).query().all()
  }

  /**
   * Create a new document
   */
  static async create<T extends BaseModel>(
    this: new (...args: any[]) => T,
    attributes: CreateAttributes<T>,
    options?: ModelOperationOptions
  ): Promise<T> {
    const instance = new this(attributes)
    if (options?.client) {
      instance.useTransaction(options.client)
    }
    await instance.save()
    return instance
  }

  /**
   * Create multiple documents
   */
  static async createMany<T extends BaseModel>(
    this: new (...args: any[]) => T,
    attributesArray: CreateAttributes<T>[]
  ): Promise<T[]> {
    const instances = attributesArray.map((attributes) => new this(attributes))

    // For now, save them one by one. In a real implementation, we'd use insertMany
    for (const instance of instances) {
      await instance.save()
    }

    return instances
  }

  /**
   * Update or create a document
   */
  static async updateOrCreate<T extends BaseModel>(
    this: new (...args: any[]) => T,
    searchPayload: CreateAttributes<T>,
    persistencePayload: CreateAttributes<T>
  ): Promise<T> {
    let query = (this as any).query()

    // Add search conditions
    for (const [field, value] of Object.entries(searchPayload)) {
      query = query.where(field, value)
    }

    const result = await query.first()

    if (result) {
      // Update existing
      const instance = new this()
      instance.hydrateFromDocument(result)
      instance.merge(persistencePayload)
      await instance.save()
      return instance
    } else {
      // Create new
      return (this as any).create({ ...searchPayload, ...persistencePayload })
    }
  }

  /**
   * Fill the model with attributes
   */
  fill(attributes: Record<string, any>): this {
    for (const [key, value] of Object.entries(attributes)) {
      // Use direct assignment during fill to avoid marking as dirty
      const metadata = (this.constructor as typeof BaseModel).getMetadata()
      const columnOptions = metadata.columns.get(key)

      // Skip reference fields (virtual properties) and computed properties during fill
      if (columnOptions?.isReference || columnOptions?.isComputed) {
        continue
      }

      let processedValue = value
      if (columnOptions?.deserialize) {
        processedValue = columnOptions.deserialize(value)
      }

      // If this is a column with a property descriptor, use the private key
      if (columnOptions && !columnOptions.isReference && !columnOptions.isComputed) {
        const privateKey = `_${key}`
        ;(this as any)[privateKey] = processedValue
      } else {
        ;(this as any)[key] = processedValue
      }
    }
    return this
  }

  /**
   * Merge new attributes into the model
   */
  merge(attributes: Record<string, any>): this {
    for (const [key, value] of Object.entries(attributes)) {
      const metadata = (this.constructor as typeof BaseModel).getMetadata()
      const columnOptions = metadata.columns.get(key)

      // Skip reference fields (virtual properties) and computed properties
      if (columnOptions?.isReference || columnOptions?.isComputed) {
        continue
      }

      if (this.getAttribute(key) !== value) {
        this.setAttribute(key, value)
        // setAttribute already handles dirty tracking, but we need to ensure it's set
        if (this.$isPersisted) {
          this.$dirty[key] = value
        }
      }
    }
    return this
  }

  /**
   * Save the model to the database
   */
  async save(): Promise<this> {
    const { executeHooks } = await import('./hooks_executor.js')
    const modelClass = this.constructor as typeof BaseModel & { new (...args: any[]): any }

    // Execute beforeSave hook
    if (!(await executeHooks(this, 'beforeSave', modelClass))) {
      return this // Operation aborted by hook
    }

    const isNew = !this.$isPersisted

    if (isNew) {
      // Execute beforeCreate hook for new models
      if (!(await executeHooks(this, 'beforeCreate', modelClass))) {
        return this // Operation aborted by hook
      }
    } else {
      // Execute beforeUpdate hook for existing models
      if (!(await executeHooks(this, 'beforeUpdate', modelClass))) {
        return this // Operation aborted by hook
      }
    }

    this.applyTimestamps()

    let dbOperationSuccessful = false
    try {
      if (isNew) {
        await this.performInsert()
      } else {
        await this.performUpdate()
      }
      dbOperationSuccessful = true
    } catch (error) {
      // If DB operation failed, don't run after hooks
      throw error
    }

    if (dbOperationSuccessful) {
      this.syncOriginal()
      this.$dirty = {}
      this.$isPersisted = true
      this.$isLocal = false

      // Execute afterSave hook
      await executeHooks(this, 'afterSave', modelClass)

      if (isNew) {
        // Execute afterCreate hook for new models
        await executeHooks(this, 'afterCreate', modelClass)
      } else {
        // Execute afterUpdate hook for existing models
        await executeHooks(this, 'afterUpdate', modelClass)
      }
    }

    return this
  }

  /**
   * Delete the model from the database
   */
  async delete(): Promise<boolean> {
    if (!this.$isPersisted || !this._id) {
      return false
    }

    const { executeHooks } = await import('./hooks_executor.js')
    const modelClass = this.constructor as typeof BaseModel & { new (...args: any[]): any }

    // Execute beforeDelete hook
    if (!(await executeHooks(this, 'beforeDelete', modelClass))) {
      return false // Operation aborted by hook
    }

    const queryOptions = this.$trx ? { client: this.$trx } : undefined
    const result = await (this.constructor as typeof BaseModel as any)
      .query(queryOptions)
      .where('_id', this._id)
      .delete()

    if (result > 0) {
      this.$isPersisted = false
      this.$isLocal = true

      // Execute afterDelete hook
      await executeHooks(this, 'afterDelete', modelClass)

      return true
    }

    return false
  }

  /**
   * Get an attribute value
   */
  getAttribute(key: string): any {
    const metadata = (this.constructor as typeof BaseModel).getMetadata()
    const columnOptions = metadata.columns.get(key)

    // If this is a column with metadata (and not a reference), use the property getter
    // which will access the private key through the property descriptor
    if (columnOptions && !columnOptions.isReference) {
      return (this as any)[key]
    }

    // For properties without metadata or reference fields, access directly
    return (this as any)[key]
  }

  /**
   * Set an attribute value
   */
  setAttribute(key: string, value: any): void {
    const metadata = (this.constructor as typeof BaseModel).getMetadata()
    const columnOptions = metadata.columns.get(key)

    // Skip setting reference fields (virtual properties) and computed properties - they have getters only
    if (columnOptions?.isReference || columnOptions?.isComputed) {
      return
    }

    if (columnOptions?.deserialize) {
      value = columnOptions.deserialize(value)
    }

    // If this is a column with a property descriptor, use the private key
    if (columnOptions) {
      const privateKey = `_${key}`
      const oldValue = (this as any)[privateKey]
      ;(this as any)[privateKey] = value

      // Track dirty attributes if the model is persisted and value changed
      if (this.$isPersisted && oldValue !== value) {
        this.$dirty[key] = value
      }
    } else {
      // For properties without column metadata, check if it's a getter-only property
      const descriptor =
        Object.getOwnPropertyDescriptor(this, key) ||
        Object.getOwnPropertyDescriptor(Object.getPrototypeOf(this), key)

      if (descriptor && descriptor.get && !descriptor.set) {
        // This is a getter-only property, skip setting it
        return
      }

      // Set directly for properties without metadata
      const oldValue = (this as any)[key]
      ;(this as any)[key] = value

      // Track dirty attributes if the model is persisted and value changed
      if (this.$isPersisted && oldValue !== value) {
        this.$dirty[key] = value
      }
    }
  }

  /**
   * Hydrate the model from a MongoDB document
   * Handles conversion from database column names (snake_case) back to model properties (camelCase)
   */
  hydrateFromDocument(document: WithId<Document>): void {
    const metadata = (this.constructor as typeof BaseModel).getMetadata()
    const namingStrategy = (this.constructor as typeof BaseModel).namingStrategy

    // Create a reverse mapping from database column names to property names
    const columnToPropertyMap = new Map<string, string>()
    for (const [propertyName] of metadata.columns) {
      const columnName =
        propertyName === '_id' ? '_id' : namingStrategy.columnName(this.constructor, propertyName)
      columnToPropertyMap.set(columnName, propertyName)
    }

    for (const [dbColumnName, value] of Object.entries(document)) {
      // Skip MongoDB's auto-generated 'id' property to avoid duplication with '_id'
      if (dbColumnName === 'id') {
        continue
      }

      // Try to find the corresponding property name
      const propertyName = columnToPropertyMap.get(dbColumnName) || dbColumnName
      const columnOptions = metadata.columns.get(propertyName)

      let processedValue = value
      if (columnOptions?.deserialize) {
        processedValue = columnOptions.deserialize(value)
      }

      // Special handling for _id field - always set it directly
      if (dbColumnName === '_id') {
        this._id = processedValue
      } else if (columnOptions && !columnOptions.isReference) {
        // Special handling for embedded documents - use the property setter to initialize proxies
        if (columnOptions.isEmbedded && columnOptions.embeddedModel) {
          // Use the property setter to ensure proxy initialization
          ;(this as any)[propertyName] = processedValue
        } else if (columnOptions.isEmbedded) {
          // Even if embeddedModel is not set, try using the setter for embedded properties
          ;(this as any)[propertyName] = processedValue
        } else {
          // For regular columns, use the private key
          const privateKey = `_${propertyName}`
          ;(this as any)[privateKey] = processedValue
        }
      } else {
        // For properties without metadata, use the property name (could be camelCase or snake_case)
        ;(this as any)[propertyName] = processedValue
      }
    }

    this.$isPersisted = true
    this.$isLocal = false
    this.syncOriginal()
  }

  /**
   * Convert the model to a plain object for database storage
   * Following AdonisJS Lucid naming strategy (camelCase -> snake_case by default)
   */
  toDocument(): Record<string, any> {
    const metadata = (this.constructor as typeof BaseModel).getMetadata()
    const namingStrategy = (this.constructor as typeof BaseModel).namingStrategy
    const document: Record<string, any> = {}

    // Process all columns defined in metadata
    for (const [key] of metadata.columns) {
      const columnOptions = metadata.columns.get(key)

      // Skip reference fields (virtual properties) and computed properties - they should not be serialized to database
      if (columnOptions?.isReference || columnOptions?.isComputed) {
        continue
      }

      const value = this.getAttribute(key)

      if (value !== undefined) {
        // Use naming strategy to convert property name to database column name
        // Special handling for _id to keep it as _id (MongoDB convention)
        const columnName = key === '_id' ? '_id' : namingStrategy.columnName(this.constructor, key)

        if (columnOptions?.serialize) {
          document[columnName] = columnOptions.serialize(value)
        } else if (columnOptions?.isEmbedded && value && typeof value.toDocument === 'function') {
          // Handle embedded documents by calling their toDocument method
          document[columnName] = value.toDocument()
        } else {
          document[columnName] = value
        }
      }
    }

    // Also include any additional properties that might not be in metadata
    const allProperties = Object.getOwnPropertyNames(this).concat(Object.keys(this))
    const uniqueProperties = [...new Set(allProperties)]

    for (const key of uniqueProperties) {
      // Skip internal properties and private keys
      if (key.startsWith('$') || (key.startsWith('_') && key !== '_id')) {
        continue
      }

      // Skip if already processed
      if (document.hasOwnProperty(key)) {
        continue
      }

      const columnOptions = metadata.columns.get(key)

      // Skip reference fields (virtual properties) and computed properties - they should not be serialized to database
      if (columnOptions?.isReference || columnOptions?.isComputed) {
        continue
      }

      const value = this.getAttribute(key)
      if (value !== undefined) {
        // Use naming strategy to convert property name to database column name
        // Special handling for _id to keep it as _id (MongoDB convention)
        const columnName = key === '_id' ? '_id' : namingStrategy.columnName(this.constructor, key)

        if (columnOptions?.serialize) {
          document[columnName] = columnOptions.serialize(value)
        } else if (columnOptions?.isEmbedded && value && typeof value.toDocument === 'function') {
          // Handle embedded documents by calling their toDocument method
          document[columnName] = value.toDocument()
        } else {
          document[columnName] = value
        }
      }
    }

    // Always include _id if it exists
    if (this._id) {
      document._id = this._id
    }

    return document
  }

  /**
   * Convert the model to a plain object for JSON serialization (API responses)
   * This includes computed properties and properly serializes relationships
   * Following AdonisJS Lucid naming strategy (camelCase -> snake_case by default)
   */
  toJSON(): Record<string, any> {
    const metadata = (this.constructor as typeof BaseModel).getMetadata()
    const namingStrategy = (this.constructor as typeof BaseModel).namingStrategy
    const json: Record<string, any> = {}
    // Process all columns defined in metadata
    for (const [key] of metadata.columns) {
      const columnOptions = metadata.columns.get(key)

      // Skip reference fields that are not loaded
      if (columnOptions?.isReference) {
        const relationshipValue = this.getAttribute(key)
        if (relationshipValue && typeof relationshipValue === 'object') {
          // Check if it's a relationship proxy with loaded data
          if (relationshipValue.isLoaded) {
            const relatedData = relationshipValue.related
            if (relatedData) {
              // Handle serializeAs option - if explicitly set, use it; otherwise use naming strategy
              let serializeKey: string | null
              if (columnOptions.serializeAs !== undefined) {
                serializeKey = columnOptions.serializeAs
              } else {
                serializeKey = namingStrategy.serializedName(this.constructor, key)
              }

              if (serializeKey !== null) {
                if (Array.isArray(relatedData)) {
                  json[serializeKey] = relatedData.map((item: any) =>
                    item && typeof item.toJSON === 'function' ? item.toJSON() : item
                  )
                } else {
                  json[serializeKey] =
                    relatedData && typeof relatedData.toJSON === 'function'
                      ? relatedData.toJSON()
                      : relatedData
                }
              }
            }
          }
        }
        continue
      }

      // Include computed properties in JSON serialization
      const value = this.getAttribute(key)
      if (value !== undefined) {
        // Handle serializeAs option - if explicitly set, use it; otherwise use naming strategy
        let serializeKey: string | null
        if (columnOptions?.serializeAs !== undefined) {
          serializeKey = columnOptions.serializeAs
        } else {
          serializeKey = namingStrategy.serializedName(this.constructor, key)
        }

        if (serializeKey !== null) {
          if (columnOptions?.serialize) {
            json[serializeKey] = columnOptions.serialize(value)
          } else {
            json[serializeKey] = this.serializeValueForJSON(value, key)
          }
        }
      }
    }

    // Also include any additional properties that might not be in metadata
    const allProperties = Object.getOwnPropertyNames(this).concat(Object.keys(this))
    const uniqueProperties = [...new Set(allProperties)]

    for (const key of uniqueProperties) {
      // Skip internal properties and private keys
      if (key.startsWith('$') || (key.startsWith('_') && key !== '_id')) {
        continue
      }

      // Skip MongoDB's auto-generated 'id' property to avoid duplication with '_id'
      if (key === 'id') {
        continue
      }

      // Skip if already processed
      if (json.hasOwnProperty(key)) {
        continue
      }

      // Try to find metadata for this property
      // First try direct lookup, then try camelCase conversion
      let columnOptions = metadata.columns.get(key)

      // If not found and key is snake_case, try camelCase version
      if (!columnOptions && key.includes('_')) {
        const camelCaseKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
        columnOptions = metadata.columns.get(camelCaseKey)
      }

      // Skip reference fields (already handled above)
      if (columnOptions?.isReference) {
        continue
      }

      const value = this.getAttribute(key)
      if (value !== undefined) {
        // Handle serializeAs option - if explicitly set, use it; otherwise use naming strategy
        let serializeKey: string | null
        if (columnOptions?.serializeAs !== undefined) {
          serializeKey = columnOptions.serializeAs
        } else {
          serializeKey = namingStrategy.serializedName(this.constructor, key)
        }

        if (serializeKey !== null) {
          if (columnOptions?.serialize) {
            json[serializeKey] = columnOptions.serialize(value)
          } else {
            json[serializeKey] = this.serializeValueForJSON(value, key)
          }
        }
      }
    }

    // Always include _id if it exists (keep as _id since it's MongoDB convention)
    if (this._id) {
      json._id = this._id
    }

    // Remove any 'id' property that might have been added by MongoDB driver
    delete json.id

    return json
  }

  /**
   * Serialize a value for JSON output (API responses)
   */
  private serializeValueForJSON(value: any, key: string): any {
    const metadata = (this.constructor as typeof BaseModel).getMetadata()
    const columnOptions = metadata.columns.get(key)

    if (columnOptions?.serialize && typeof columnOptions.serialize === 'function') {
      return columnOptions.serialize(value)
    }

    // Handle DateTime serialization for JSON (ISO string format)
    if (value && typeof value === 'object' && value.constructor.name === 'DateTime') {
      return value.toISO()
    }

    // Handle Date serialization for JSON
    if (value instanceof Date) {
      return value.toISOString()
    }

    // Handle ObjectId serialization for JSON
    if (value && typeof value === 'object' && value.constructor.name === 'ObjectId') {
      return value.toString()
    }

    return value
  }

  /**
   * Apply automatic timestamps
   */
  private applyTimestamps(): void {
    const metadata = (this.constructor as typeof BaseModel).getMetadata()
    const now = DateTime.now()

    for (const [key, options] of metadata.columns) {
      const dateOptions = options as DateColumnOptions

      if (dateOptions.autoCreate && !this.$isPersisted) {
        this.setAttribute(key, now)
      }

      if (dateOptions.autoUpdate) {
        this.setAttribute(key, now)
      }
    }
  }

  /**
   * Perform database insert
   */
  protected async performInsert(): Promise<void> {
    const document = this.toDocument()

    // Remove _id if it's undefined to let MongoDB generate it
    if (!document._id) {
      delete document._id
    }

    // This would use the actual database connection
    // For now, we'll simulate the operation
    throw new Error('Database insert not implemented. Please register the MongoDB ODM provider.')
  }

  /**
   * Perform database update
   */
  protected async performUpdate(): Promise<void> {
    if (!this._id) {
      throw new Error('Cannot update model without an ID')
    }

    const updates = this.getDirtyAttributes()

    if (Object.keys(updates).length === 0) {
      return // Nothing to update
    }

    // This would use the actual database connection
    // For now, we'll simulate the operation
    throw new Error('Database update not implemented. Please register the MongoDB ODM provider.')
  }

  /**
   * Get dirty attributes for the model
   * Returns attributes with database column names (snake_case) for database operations
   */
  public getDirtyAttributes(): Record<string, any> {
    const dirty: Record<string, any> = {}
    const metadata = (this.constructor as typeof BaseModel).getMetadata()
    const namingStrategy = (this.constructor as typeof BaseModel).namingStrategy

    for (const [key, value] of Object.entries(this.$dirty)) {
      // Skip internal properties
      if (key.startsWith('$') || (key.startsWith('_') && key !== '_id')) {
        continue
      }

      const columnOptions = metadata.columns.get(key)

      // Skip reference fields (virtual properties) and computed properties from dirty attributes
      if (columnOptions?.isReference || columnOptions?.isComputed) {
        continue
      }

      // Use naming strategy to convert property name to database column name
      // Special handling for _id to keep it as _id (MongoDB convention)
      const columnName = key === '_id' ? '_id' : namingStrategy.columnName(this.constructor, key)

      // Serialize the value if needed
      if (columnOptions?.serialize && typeof columnOptions.serialize === 'function') {
        dirty[columnName] = columnOptions.serialize(value)
      } else {
        dirty[columnName] = this.serializeValue(value, key)
      }
    }

    return dirty
  }

  /**
   * Serialize a value for database storage
   */
  private serializeValue(value: any, key: string): any {
    const metadata = (this.constructor as typeof BaseModel).getMetadata()
    const columnOptions = metadata.columns.get(key)

    if (columnOptions?.serialize && typeof columnOptions.serialize === 'function') {
      return columnOptions.serialize(value)
    }

    // Handle DateTime serialization
    if (value && typeof value === 'object' && value.constructor.name === 'DateTime') {
      return value.toJSDate()
    }

    return value
  }

  /**
   * Sync the original values with current values
   */
  public syncOriginal(): void {
    this.$original = { ...this.toDocument() }
    this.$dirty = {}
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
