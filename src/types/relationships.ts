import type { BaseModel } from '../base_model/base_model.js'
import type { ModelQueryBuilder } from '../query_builder/model_query_builder.js'

/**
 * Base relationship interface with common methods
 */
interface BaseRelationship {
  /**
   * Check if the relationship is loaded
   */
  isLoaded: boolean
}

/**
 * HasOne relationship methods
 */
interface HasOneRelationshipMethods<T extends typeof BaseModel> extends BaseRelationship {
  /**
   * Create a new related model instance
   */
  create(attributes: Record<string, any>): Promise<InstanceType<T>>

  /**
   * Save an existing related model instance
   */
  save(instance: InstanceType<T>): Promise<InstanceType<T>>

  /**
   * Delete the related model instance
   */
  delete(): Promise<boolean>

  /**
   * Load the related model instance
   */
  load(): Promise<InstanceType<T> | null>

  /**
   * Get a query builder for the related model
   */
  query(): ModelQueryBuilder<any>
}

/**
 * HasMany relationship methods
 */
interface HasManyRelationshipMethods<T extends typeof BaseModel> extends BaseRelationship {
  /**
   * Create a new related model instance
   */
  create(attributes: Record<string, any>): Promise<InstanceType<T>>

  /**
   * Create multiple related model instances
   */
  createMany(attributesArray: Record<string, any>[]): Promise<InstanceType<T>[]>

  /**
   * Save an existing related model instance
   */
  save(instance: InstanceType<T>): Promise<InstanceType<T>>

  /**
   * Save multiple existing related model instances
   */
  saveMany(instances: InstanceType<T>[]): Promise<InstanceType<T>[]>

  /**
   * Load the related model instances
   */
  load(): Promise<InstanceType<T>[]>

  /**
   * Get a query builder for the related model
   */
  query(): ModelQueryBuilder<any>
}

/**
 * BelongsTo relationship methods
 */
interface BelongsToRelationshipMethods<T extends typeof BaseModel> extends BaseRelationship {
  /**
   * Associate this model with a related model instance
   */
  associate(instance: InstanceType<T>): Promise<void>

  /**
   * Dissociate this model from the related model
   */
  dissociate(): Promise<void>

  /**
   * Load the related model instance
   */
  load(): Promise<InstanceType<T> | null>

  /**
   * Get a query builder for the related model
   */
  query(): ModelQueryBuilder<any>
}

/**
 * HasOne relationship type
 * Similar to Lucid's HasOne relationship - allows direct property access
 * This type combines the related model properties with relationship methods
 */
export type HasOne<T extends typeof BaseModel> = HasOneRelationshipMethods<T> &
  Partial<InstanceType<T>>

/**
 * HasMany relationship type
 * Similar to Lucid's HasMany relationship - acts as an array with additional methods
 * This type combines array functionality with relationship methods
 */
export type HasMany<T extends typeof BaseModel> = HasManyRelationshipMethods<T> & InstanceType<T>[]

/**
 * BelongsTo relationship type
 * Similar to Lucid's BelongsTo relationship - allows direct property access
 * This type combines the related model properties with relationship methods
 */
export type BelongsTo<T extends typeof BaseModel> = BelongsToRelationshipMethods<T> &
  Partial<InstanceType<T>>
