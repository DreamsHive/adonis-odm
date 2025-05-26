import type { BaseModel } from '../base_model/base_model.js'
import type { HasOne, HasMany, BelongsTo } from './relationships.js'

/**
 * RELATIONSHIP TYPE INFERENCE
 *
 * This module provides advanced TypeScript types for extracting relationship
 * property names from model classes for type-safe load method calls.
 */

/**
 * Extract only relationship property names from a model type
 * This filters out all non-relationship properties
 */
export type RelationshipKeys<T extends BaseModel> = {
  [K in keyof T]: T[K] extends HasOne<any> | HasMany<any> | BelongsTo<any> ? K : never
}[keyof T]

/**
 * Type-safe load method constraint
 * This ensures only valid relationship names can be passed to the load method
 */
export type LoadRelationConstraint<TModel extends BaseModel> =
  RelationshipKeys<TModel> extends never
    ? string // Fallback to string if no relationships detected
    : RelationshipKeys<TModel>

/**
 * Helper type to check if a model has relationships
 */
export type HasRelationships<T extends BaseModel> = RelationshipKeys<T> extends never ? false : true

/**
 * Extract the related model type from a relationship property
 */
export type ExtractRelatedModel<TModel extends BaseModel, K extends keyof TModel> =
  TModel[K] extends HasOne<infer R>
    ? InstanceType<R>
    : TModel[K] extends HasMany<infer R>
      ? InstanceType<R>
      : TModel[K] extends BelongsTo<infer R>
        ? InstanceType<R>
        : never
