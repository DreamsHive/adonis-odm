import { DateTime } from 'luxon'
import { ObjectId, WithId, Document } from 'mongodb'
import { MODEL_METADATA } from '../decorators/column.js'
import { ModelQueryBuilder } from '../query_builder/model_query_builder.js'
import { ModelMetadata, DateColumnOptions } from '../types/index.js'
import { ModelNotFoundException } from '../exceptions/index.js'

/**
 * Base Model class for MongoDB ODM
 */
export class BaseModel {
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

  constructor(attributes: Record<string, any> = {}) {
    this.fill(attributes)
    this.syncOriginal()
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

    // Simple pluralization (add 's')
    return snakeCase + 's'
  }

  /**
   * Get connection name for the model
   */
  static getConnection(): string {
    return 'mongodb' // Default connection name
  }

  /**
   * Create a new query builder instance
   */
  static query(): ModelQueryBuilder<Document> {
    // This would be injected by the service provider
    // For now, we'll throw an error to indicate it needs to be set up
    throw new Error('Database connection not configured. Please register the MongoDB ODM provider.')
  }

  /**
   * Find a document by its ID
   */
  static async find<T extends BaseModel = BaseModel>(
    this: typeof BaseModel & (new (...args: any[]) => T),
    id: string | ObjectId
  ): Promise<T | null> {
    const result = await (this as any).query().where('_id', id).first()
    if (!result) return null

    const instance = new this()
    instance.hydrateFromDocument(result)
    return instance
  }

  /**
   * Find a document by its ID or throw an exception
   */
  static async findOrFail<T extends BaseModel>(
    this: typeof BaseModel & (new (...args: any[]) => T),
    id: string | ObjectId
  ): Promise<T> {
    const result = await (this as any).find(id)
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
    const result = await (this as any).query().where(field, value).first()
    if (!result) return null

    const instance = new this()
    instance.hydrateFromDocument(result)
    return instance
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
    const result = await (this as any).query().first()
    if (!result) return null

    const instance = new this()
    instance.hydrateFromDocument(result)
    return instance
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
    const results = await (this as any).query().all()
    return results.map((doc: any) => {
      const instance = new this()
      instance.hydrateFromDocument(doc)
      return instance
    })
  }

  /**
   * Create a new document
   */
  static async create<T extends BaseModel>(
    this: typeof BaseModel & (new (...args: any[]) => T),
    attributes: Record<string, any>
  ): Promise<T> {
    const instance = new this(attributes)
    await instance.save()
    return instance
  }

  /**
   * Create multiple documents
   */
  static async createMany<T extends BaseModel>(
    this: typeof BaseModel & (new (...args: any[]) => T),
    attributesArray: Record<string, any>[]
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
    this: typeof BaseModel & (new (...args: any[]) => T),
    searchPayload: Record<string, any>,
    persistencePayload: Record<string, any>
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
      this.setAttribute(key, value)
    }
    return this
  }

  /**
   * Merge new attributes into the model
   */
  merge(attributes: Record<string, any>): this {
    for (const [key, value] of Object.entries(attributes)) {
      if (this.getAttribute(key) !== value) {
        this.setAttribute(key, value)
        this.$dirty[key] = value
      }
    }
    return this
  }

  /**
   * Save the model to the database
   */
  async save(): Promise<this> {
    this.applyTimestamps()

    if (this.$isPersisted) {
      // Update existing document
      await this.performUpdate()
    } else {
      // Insert new document
      await this.performInsert()
    }

    this.syncOriginal()
    this.$dirty = {}
    this.$isPersisted = true
    this.$isLocal = false

    return this
  }

  /**
   * Delete the model from the database
   */
  async delete(): Promise<boolean> {
    if (!this.$isPersisted || !this._id) {
      return false
    }

    const result = await (this.constructor as typeof BaseModel as any)
      .query()
      .where('_id', this._id)
      .delete()

    if (result > 0) {
      this.$isPersisted = false
      this.$isLocal = true
      return true
    }

    return false
  }

  /**
   * Get an attribute value
   */
  getAttribute(key: string): any {
    return (this as any)[key]
  }

  /**
   * Set an attribute value
   */
  setAttribute(key: string, value: any): void {
    const metadata = (this.constructor as typeof BaseModel).getMetadata()
    const columnOptions = metadata.columns.get(key)

    if (columnOptions?.deserialize) {
      value = columnOptions.deserialize(value)
    }

    ;(this as any)[key] = value
  }

  /**
   * Hydrate the model from a MongoDB document
   */
  hydrateFromDocument(document: WithId<Document>): void {
    const metadata = (this.constructor as typeof BaseModel).getMetadata()

    for (const [key, value] of Object.entries(document)) {
      const columnOptions = metadata.columns.get(key)

      if (columnOptions?.deserialize) {
        this.setAttribute(key, columnOptions.deserialize(value))
      } else {
        this.setAttribute(key, value)
      }
    }

    this.$isPersisted = true
    this.$isLocal = false
    this.syncOriginal()
  }

  /**
   * Convert the model to a plain object for database storage
   */
  toDocument(): Record<string, any> {
    const metadata = (this.constructor as typeof BaseModel).getMetadata()
    const document: Record<string, any> = {}

    for (const [key] of metadata.columns) {
      const value = this.getAttribute(key)
      const columnOptions = metadata.columns.get(key)

      if (value !== undefined) {
        if (columnOptions?.serialize) {
          document[key] = columnOptions.serialize(value)
        } else {
          document[key] = value
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
  private async performInsert(): Promise<void> {
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
  private async performUpdate(): Promise<void> {
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
   * Get dirty attributes for update
   */
  private getDirtyAttributes(): Record<string, any> {
    const metadata = (this.constructor as typeof BaseModel).getMetadata()
    const updates: Record<string, any> = {}

    for (const key of Object.keys(this.$dirty)) {
      const value = this.getAttribute(key)
      const columnOptions = metadata.columns.get(key)

      if (columnOptions?.serialize) {
        updates[key] = columnOptions.serialize(value)
      } else {
        updates[key] = value
      }
    }

    return updates
  }

  /**
   * Sync original values
   */
  private syncOriginal(): void {
    const metadata = (this.constructor as typeof BaseModel).getMetadata()
    this.$original = {}

    for (const [key] of metadata.columns) {
      this.$original[key] = this.getAttribute(key)
    }
  }
}
