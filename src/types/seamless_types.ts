import type { Document } from 'mongodb'
import type { BaseModel } from '../base_model/base_model.js'
import type { ModelQueryBuilder } from '../query_builder/model_query_builder.js'
import type { HasOne, HasMany, BelongsTo } from './relationships.js'

/**
 * SEAMLESS TYPE SAFETY SYSTEM
 *
 * This file contains advanced TypeScript types that enable seamless type safety
 * for relationship loading, exactly like AdonisJS Lucid, without requiring
 * any extra steps from developers.
 */

/**
 * Extract relationship keys from a model type
 */
export type ExtractRelationshipKeys<T extends BaseModel> = {
  [K in keyof T]: T[K] extends HasOne<any> | HasMany<any> | BelongsTo<any> ? K : never
}[keyof T]

/**
 * Extract the related model type from a relationship
 */
export type ExtractRelatedModel<T, K extends keyof T> =
  T[K] extends HasOne<infer R>
    ? InstanceType<R>
    : T[K] extends HasMany<infer R>
      ? InstanceType<R>
      : T[K] extends BelongsTo<infer R>
        ? InstanceType<R>
        : never

/**
 * Type-safe load callback that automatically infers the related model type
 */
export type SeamlessCallback<TModel extends BaseModel, TRelation extends keyof TModel> = (
  query: ModelQueryBuilder<ExtractRelatedModel<TModel, TRelation> & Document>
) => void | Promise<void>

/**
 * Enhanced ModelQueryBuilder interface with seamless type safety
 */
export interface SeamlessModelQueryBuilder<TModel extends BaseModel> {
  load<K extends ExtractRelationshipKeys<TModel>>(
    relation: K,
    callback?: SeamlessCallback<TModel, K>
  ): this

  load(relation: string, callback?: (query: ModelQueryBuilder<any>) => void): this
}

/**
 * Utility type to create a seamless query builder for a specific model
 */
export type CreateSeamlessQueryBuilder<TModel extends BaseModel> = ModelQueryBuilder<Document> &
  SeamlessModelQueryBuilder<TModel>

/**
 * DECLARATION MERGING HELPER
 *
 * This type can be used to create model-specific type declarations
 */
export type ModelSpecificLoad<TModel extends BaseModel> = {
  [K in ExtractRelationshipKeys<TModel>]: (
    relation: K,
    callback?: SeamlessCallback<TModel, K>
  ) => ModelQueryBuilder<Document>
}

/**
 * EXAMPLE USAGE TYPES
 *
 * These show how to use the seamless type system with specific models
 */

// Example: User model with profile and posts relationships
export interface UserModelQueryBuilder {
  load(relation: 'profile', callback?: (query: ModelQueryBuilder<any>) => void): this
  load(relation: 'posts', callback?: (query: ModelQueryBuilder<any>) => void): this
}

// Example: Profile model with user relationship
export interface ProfileModelQueryBuilder {
  load(relation: 'user', callback?: (query: ModelQueryBuilder<any>) => void): this
}

/**
 * GLOBAL DECLARATION MERGING INTERFACE
 *
 * This interface can be augmented by applications to provide
 * seamless type safety for all their models
 */
export interface GlobalSeamlessTypes {
  // Applications can augment this interface with their model types
}
