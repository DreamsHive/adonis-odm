import type { BaseModel } from '../base_model/base_model.js'
import type { ModelQueryBuilder } from '../query_builder/model_query_builder.js'
import type { Document } from 'mongodb'

/**
 * SEAMLESS TYPE SAFETY - LIKE ADONISJS LUCID!
 *
 * This module implements advanced TypeScript patterns to achieve seamless type safety
 * for relationship loading, exactly like AdonisJS Lucid, without requiring any type
 * assertions or extra steps from developers.
 *
 * Key Features:
 * - Automatic relationship key inference from model definitions
 * - Type-safe load callbacks with proper IntelliSense
 * - Seamless direct property access: user.profile.firstName
 * - Array access for HasMany: user.posts[0].title
 * - Compile-time error checking for invalid relationship names
 * - Zero developer overhead - works exactly like AdonisJS Lucid
 */

/**
 * HasOne relationship type - represents a one-to-one relationship
 * Supports seamless direct property access to the related model
 */
export type HasOne<T extends typeof BaseModel> = {
  /**
   * The related model instance (when loaded)
   */
  related?: InstanceType<T> | null

  /**
   * Load the relationship
   */
  load(): Promise<InstanceType<T> | null>

  /**
   * Create a new related model
   */
  create(attributes: Partial<InstanceType<T>>): Promise<InstanceType<T>>

  /**
   * Save a related model
   */
  save(model: InstanceType<T>): Promise<InstanceType<T>>

  /**
   * Query the relationship
   */
  query(): any

  /**
   * Check if the relationship is loaded
   */
  isLoaded: boolean
} & Partial<InstanceType<T>> // This enables direct property access!

/**
 * HasMany relationship type - represents a one-to-many relationship
 * Supports array-like access and seamless property access on array elements
 */
export type HasMany<T extends typeof BaseModel> = {
  /**
   * The related model instances (when loaded)
   */
  related?: InstanceType<T>[]

  /**
   * Load the relationship
   */
  load(): Promise<InstanceType<T>[]>

  /**
   * Create a new related model
   */
  create(attributes: Partial<InstanceType<T>>): Promise<InstanceType<T>>

  /**
   * Create multiple related models
   */
  createMany(attributes: Partial<InstanceType<T>>[]): Promise<InstanceType<T>[]>

  /**
   * Save a single related model
   */
  save(model: InstanceType<T>): Promise<InstanceType<T>>

  /**
   * Save multiple related models
   */
  saveMany(models: InstanceType<T>[]): Promise<InstanceType<T>[]>

  /**
   * Query the relationship
   */
  query(): any

  /**
   * Check if the relationship is loaded
   */
  isLoaded: boolean

  /**
   * Array length
   */
  readonly length: number

  /**
   * Array iteration methods
   */
  forEach(callback: (item: InstanceType<T>, index: number) => void): void
  map<U>(callback: (item: InstanceType<T>, index: number) => U): U[]
  filter(callback: (item: InstanceType<T>, index: number) => boolean): InstanceType<T>[]

  /**
   * Array access by index
   */
  [index: number]: InstanceType<T>
} & InstanceType<T>[] // This enables array-like access!

/**
 * BelongsTo relationship type - represents an inverse one-to-one/many relationship
 * Supports seamless direct property access to the related model
 */
export type BelongsTo<T extends typeof BaseModel> = {
  /**
   * The related model instance (when loaded)
   */
  related?: InstanceType<T> | null

  /**
   * Load the relationship
   */
  load(): Promise<InstanceType<T> | null>

  /**
   * Associate with a related model
   */
  associate(model: InstanceType<T>): Promise<InstanceType<T>>

  /**
   * Dissociate from the related model
   */
  dissociate(): Promise<void>

  /**
   * Query the relationship
   */
  query(): any

  /**
   * Check if the relationship is loaded
   */
  isLoaded: boolean
} & Partial<InstanceType<T>> // This enables direct property access!

/**
 * ADVANCED TYPE INFERENCE - LIKE ADONISJS LUCID!
 *
 * These utility types automatically extract relationship information from model
 * definitions, enabling seamless type-safe load callbacks without any manual work.
 */

/**
 * Extract all relationship property names from a model
 * This automatically finds all HasOne, HasMany, and BelongsTo properties
 */
export type RelationshipKeys<TModel extends BaseModel> = {
  [K in keyof TModel]: TModel[K] extends HasOne<any>
    ? K
    : TModel[K] extends HasMany<any>
      ? K
      : TModel[K] extends BelongsTo<any>
        ? K
        : never
}[keyof TModel]

/**
 * Extract the related model type from a relationship property
 * This provides the exact model type for load callback parameters
 */
export type RelatedModelType<TModel extends BaseModel, TRelation extends keyof TModel> =
  TModel[TRelation] extends HasOne<infer R>
    ? R
    : TModel[TRelation] extends HasMany<infer R>
      ? R
      : TModel[TRelation] extends BelongsTo<infer R>
        ? R
        : never

/**
 * Extract the instance type of a related model
 * This provides the exact instance type for seamless property access
 */
export type RelatedModelInstance<TModel extends BaseModel, TRelation extends keyof TModel> =
  TModel[TRelation] extends HasOne<infer R>
    ? InstanceType<R>
    : TModel[TRelation] extends HasMany<infer R>
      ? InstanceType<R>
      : TModel[TRelation] extends BelongsTo<infer R>
        ? InstanceType<R>
        : never

/**
 * RELATIONSHIP DECORATORS
 *
 * These decorators are used to define relationships on model classes
 * and provide the metadata needed for automatic type inference.
 */

/**
 * HasOne relationship decorator
 */
export function hasOne<T extends typeof BaseModel>(
  relatedModel: () => T,
  options?: {
    foreignKey?: string
    localKey?: string
  }
) {
  return function (target: any, propertyKey: string) {
    // Store relationship metadata for runtime use
    if (!target.constructor.$relationships) {
      target.constructor.$relationships = {}
    }
    target.constructor.$relationships[propertyKey] = {
      type: 'hasOne',
      relatedModel,
      options: options || {},
    }
  }
}

/**
 * HasMany relationship decorator
 */
export function hasMany<T extends typeof BaseModel>(
  relatedModel: () => T,
  options?: {
    foreignKey?: string
    localKey?: string
  }
) {
  return function (target: any, propertyKey: string) {
    // Store relationship metadata for runtime use
    if (!target.constructor.$relationships) {
      target.constructor.$relationships = {}
    }
    target.constructor.$relationships[propertyKey] = {
      type: 'hasMany',
      relatedModel,
      options: options || {},
    }
  }
}

/**
 * BelongsTo relationship decorator
 */
export function belongsTo<T extends typeof BaseModel>(
  relatedModel: () => T,
  options?: {
    foreignKey?: string
    localKey?: string
  }
) {
  return function (target: any, propertyKey: string) {
    // Store relationship metadata for runtime use
    if (!target.constructor.$relationships) {
      target.constructor.$relationships = {}
    }
    target.constructor.$relationships[propertyKey] = {
      type: 'belongsTo',
      relatedModel,
      options: options || {},
    }
  }
}

/**
 * RELATIONSHIP METADATA INTERFACE
 *
 * This interface defines the structure of relationship metadata
 * stored on model classes for runtime relationship handling.
 */
export interface RelationshipMetadata {
  type: 'hasOne' | 'hasMany' | 'belongsTo'
  relatedModel: () => typeof BaseModel
  options: {
    foreignKey?: string
    localKey?: string
  }
}

/**
 * SEAMLESS TYPE SAFETY
 *
 * Type-safe load callback for seamless relationship loading.
 * Use declaration merging to augment ModelQueryBuilder with specific relationship types.
 */
export type TypeSafeLoadCallback<T extends Document = Document> = (
  query: ModelQueryBuilder<T>
) => void | Promise<void> | ModelQueryBuilder<T> | Promise<ModelQueryBuilder<T>>
