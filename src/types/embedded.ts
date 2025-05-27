import type { BaseModel } from '../base_model/base_model.js'

/**
 * SEAMLESS EMBEDDED DOCUMENT TYPES
 *
 * These types provide complete type safety and IntelliSense support
 * without requiring any 'as any' casts or extra developer steps.
 */

/**
 * Extract the instance type from a model class
 */
type ModelInstance<T extends typeof BaseModel> = InstanceType<T>

/**
 * Enhanced CRUD methods for embedded documents
 */
interface EmbeddedCRUDMethods<T extends typeof BaseModel> {
  /**
   * Save the embedded document (updates the parent document)
   */
  save(): Promise<ModelInstance<T>>

  /**
   * Delete the embedded document (removes it from parent and saves)
   */
  delete(): Promise<boolean>

  /**
   * Refresh the embedded document (reloads parent and gets fresh data)
   */
  refresh(): Promise<ModelInstance<T>>

  /**
   * Fill the embedded document with new data
   */
  fill(data: Partial<ModelInstance<T>>): ModelInstance<T>
}

/**
 * Type for single embedded document with full type safety
 *
 * This type provides:
 * - Complete IntelliSense for all model properties
 * - Type-safe access to computed properties and methods
 * - CRUD operations that work seamlessly
 * - No 'as any' casts required
 */
export type EmbeddedSingle<T extends typeof BaseModel> =
  | (ModelInstance<T> & EmbeddedCRUDMethods<T>)
  | null

/**
 * Enhanced array methods for embedded document collections
 */
interface EmbeddedArrayMethods<T extends typeof BaseModel> {
  /**
   * Query the embedded documents with type-safe filtering
   */
  query(): import('../embedded/embedded_query_builder.js').EmbeddedQueryBuilder<T>

  /**
   * Create a new embedded document with full type safety
   */
  create(attributes: EmbeddedCreationData<T>): ModelInstance<T> & EmbeddedCRUDMethods<T>

  /**
   * Create multiple embedded documents
   */
  createMany(
    attributes: EmbeddedCreationData<T>[]
  ): Array<ModelInstance<T> & EmbeddedCRUDMethods<T>>

  /**
   * Remove an embedded document
   */
  remove(item: ModelInstance<T>): boolean

  /**
   * Remove embedded documents by condition
   */
  removeWhere(callback: (item: ModelInstance<T>) => boolean): number
}

/**
 * Type for multiple embedded documents with full type safety
 *
 * This type provides:
 * - All standard JavaScript array methods (map, filter, forEach, etc.)
 * - Type-safe access to individual items
 * - CRUD operations for the collection
 * - Query capabilities with type safety
 * - No 'as any' casts required
 */
export type EmbeddedMany<T extends typeof BaseModel> = Array<
  ModelInstance<T> & EmbeddedCRUDMethods<T>
> &
  EmbeddedArrayMethods<T>

/**
 * Re-export the EmbeddedQueryBuilder class for type definitions
 */
export type { EmbeddedQueryBuilder } from '../embedded/embedded_query_builder.js'

/**
 * Embedded document configuration options
 */
export interface EmbeddedOptions {
  /**
   * The embedded model class
   */
  model: () => typeof BaseModel

  /**
   * Type of embedding: 'single' or 'many'
   */
  type: 'single' | 'many'

  /**
   * Custom serialization function
   */
  serialize?: (value: any) => any

  /**
   * Custom deserialization function
   */
  deserialize?: (value: any) => any
}

/**
 * Type for embedded query callbacks
 */
export type EmbeddedQueryCallback<TModel extends BaseModel, K extends keyof TModel> =
  TModel[K] extends EmbeddedMany<infer R>
    ? (
        query: import('../embedded/embedded_query_builder.js').EmbeddedQueryBuilder<R>
      ) => void | import('../embedded/embedded_query_builder.js').EmbeddedQueryBuilder<R>
    : TModel[K] extends EmbeddedSingle<any>
      ? never // Single embedded documents don't support query callbacks
      : never

/**
 * Extract the embedded model type
 */
export type ExtractEmbeddedModel<T> =
  T extends EmbeddedSingle<infer R> ? R : T extends EmbeddedMany<infer R> ? R : never

/**
 * Base type for embedded document creation data
 * This is permissive for creation but strict for access
 */
export type EmbeddedCreationData<T extends typeof BaseModel> = Partial<
  Omit<
    ModelInstance<T>,
    // Exclude BaseModel internals
    | '$isPersisted'
    | '$isLocal'
    | '$dirty'
    | '$original'
    | '$trx'
    | 'useTransaction'
    | 'fill'
    | 'merge'
    | 'save'
    | 'delete'
    | 'getAttribute'
    | 'setAttribute'
    | 'hydrateFromDocument'
    | 'toDocument'
    | 'toJSON'
    | 'getDirtyAttributes'
    | 'syncOriginal'
    // Exclude computed properties and methods
    | {
        [K in keyof ModelInstance<T>]: ModelInstance<T>[K] extends (...args: any[]) => any
          ? K
          : never
      }[keyof ModelInstance<T>]
  >
>

/**
 * Type for creating a single embedded document
 */
export type EmbeddedSingleCreation<T extends typeof BaseModel> = EmbeddedCreationData<T>

/**
 * Type for creating multiple embedded documents
 */
export type EmbeddedManyCreation<T extends typeof BaseModel> = EmbeddedCreationData<T>[]

/**
 * Helper type to extract creation attributes for embedded documents
 * This provides proper type safety while being permissive for creation
 */
export type EmbeddedCreationAttributes<T extends typeof BaseModel> = {
  [K in keyof InstanceType<T> as K extends keyof BaseModel
    ? never
    : K extends '_id' | 'createdAt' | 'updatedAt'
      ? never
      : K extends `$${string}`
        ? never
        : InstanceType<T>[K] extends (...args: any[]) => any
          ? never
          : K]?: InstanceType<T>[K]
}

/**
 * Standard creation attributes for models with embedded document support
 * This type automatically handles both embedded and referenced documents
 */
export type CreateAttributes<T extends BaseModel> = {
  [K in keyof T as T[K] extends (...args: any[]) => any
    ? never
    : K extends keyof BaseModel
      ? never
      : K extends '_id'
        ? never
        : T[K] extends { load: (...args: any[]) => any }
          ? never
          : K]?: T[K] extends EmbeddedSingle<infer R> | undefined
    ? EmbeddedCreationAttributes<R> | null
    : T[K] extends EmbeddedMany<infer R> | undefined
      ? EmbeddedCreationAttributes<R>[]
      : T[K] extends EmbeddedSingle<infer R>
        ? EmbeddedCreationAttributes<R> | null
        : T[K] extends EmbeddedMany<infer R>
          ? EmbeddedCreationAttributes<R>[]
          : T[K]
}
