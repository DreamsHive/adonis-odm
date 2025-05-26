import type { Document } from 'mongodb'
import type { BaseModel } from '../base_model/base_model.js'
import type { ModelQueryBuilder } from '../query_builder/model_query_builder.js'
import type { HasOne, HasMany, BelongsTo, TypeSafeLoadCallback } from './relationships.js'

/**
 * ENHANCED TYPE SAFETY FOR MODEL QUERY BUILDERS
 *
 * This module provides enhanced type definitions that enable seamless type safety
 * for relationship loading, exactly like AdonisJS Lucid.
 */

/**
 * Extract relationship property names from a model instance type
 */
export type ExtractRelationshipKeys<T extends BaseModel> = {
  [K in keyof T]: T[K] extends HasOne<any> | HasMany<any> | BelongsTo<any> ? K : never
}[keyof T]

/**
 * Enhanced ModelQueryBuilder interface with model-specific relationship type safety
 */
export interface TypeSafeModelQueryBuilder<TModel extends BaseModel>
  extends ModelQueryBuilder<Document> {
  /**
   * Type-safe load method with automatic relationship name inference
   */
  load<K extends ExtractRelationshipKeys<TModel>>(
    relation: K,
    callback?: TypeSafeLoadCallback
  ): this

  /**
   * Fallback for string-based loading (for dynamic scenarios)
   */
  load(relation: string, callback?: TypeSafeLoadCallback): this
}

/**
 * Helper type to create a type-safe query builder for a specific model
 */
export type QueryBuilderFor<TModel extends BaseModel> = TypeSafeModelQueryBuilder<TModel>

/**
 * Declaration merging helper - use this in model files to enhance type safety
 */
export interface ModelQueryBuilderEnhancement<TModel extends BaseModel> {
  load<K extends ExtractRelationshipKeys<TModel>>(
    relation: K,
    callback?: TypeSafeLoadCallback
  ): this
}
