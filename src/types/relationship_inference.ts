import type { BaseModel } from '../base_model/base_model.js'
import type { HasOne, HasMany, BelongsTo } from './relationships.js'
import type { EmbeddedSingle, EmbeddedMany } from './embedded.js'

/**
 * RELATIONSHIP TYPE INFERENCE
 *
 * This module provides advanced TypeScript types for extracting relationship
 * property names from model classes for type-safe load method calls.
 * Supports both referenced relationships and embedded documents.
 */

/**
 * Extract only REFERENCED relationship property names from a model type
 * This filters out all non-relationship properties and EXCLUDES embedded documents
 * (embedded documents don't need to be "loaded" since they're already embedded)
 */
export type RelationshipKeys<T extends BaseModel> = {
  [K in keyof T]: T[K] extends HasOne<any> | HasMany<any> | BelongsTo<any> ? K : never
}[keyof T]

/**
 * Extract only EMBEDDED relationship property names from a model type
 * This filters out all non-embedded properties and EXCLUDES referenced relationships
 * (for use with the embed method)
 */
export type EmbeddedKeys<T extends BaseModel> = {
  [K in keyof T]: T[K] extends EmbeddedSingle<any> | EmbeddedMany<any> ? K : never
}[keyof T]

/**
 * Extract ALL relationship property names from a model type
 * This includes both referenced relationships AND embedded documents
 */
export type AllRelationshipKeys<T extends BaseModel> = {
  [K in keyof T]: T[K] extends
    | HasOne<any>
    | HasMany<any>
    | BelongsTo<any>
    | EmbeddedSingle<any>
    | EmbeddedMany<any>
    ? K
    : never
}[keyof T]

/**
 * Type-safe load method constraint for REFERENCED relationships only
 * This ensures only valid REFERENCED relationship names can be passed to the load method
 * Embedded documents are excluded because they don't need to be "loaded"
 */
export type LoadRelationConstraint<TModel extends BaseModel> = RelationshipKeys<TModel>

/**
 * Type-safe embed method constraint for EMBEDDED relationships only
 * This ensures only valid EMBEDDED relationship names can be passed to the embed method
 * Referenced relationships are excluded because they need to be "loaded" instead
 */
export type EmbedRelationConstraint<TModel extends BaseModel> = EmbeddedKeys<TModel>

/**
 * Helper type to check if a model has relationships
 */
export type HasRelationships<T extends BaseModel> = RelationshipKeys<T> extends never ? false : true

/**
 * Helper type to check if a model has embedded relationships
 */
export type HasEmbeddedRelationships<T extends BaseModel> =
  EmbeddedKeys<T> extends never ? false : true

/**
 * Extract the related model type from a relationship property
 * Supports both referenced relationships and embedded documents
 */
export type ExtractRelatedModel<TModel extends BaseModel, K extends keyof TModel> =
  TModel[K] extends HasOne<infer R>
    ? InstanceType<R>
    : TModel[K] extends HasMany<infer R>
      ? InstanceType<R>
      : TModel[K] extends BelongsTo<infer R>
        ? InstanceType<R>
        : TModel[K] extends EmbeddedSingle<infer R>
          ? InstanceType<R>
          : TModel[K] extends EmbeddedMany<infer R>
            ? InstanceType<R>
            : never

/**
 * Extract the embedded model class from an embedded relationship property
 * This is used for typing the EmbeddedQueryBuilder in the embed method
 */
export type ExtractEmbeddedModelClass<TModel extends BaseModel, K extends keyof TModel> =
  TModel[K] extends EmbeddedSingle<infer R>
    ? R
    : TModel[K] extends EmbeddedMany<infer R>
      ? R
      : never

/**
 * Check if a relationship is an embedded document
 */
export type IsEmbeddedRelation<
  TModel extends BaseModel,
  K extends keyof TModel,
> = TModel[K] extends EmbeddedSingle<any> | EmbeddedMany<any> ? true : false

/**
 * Check if a relationship is a referenced document
 */
export type IsReferencedRelation<
  TModel extends BaseModel,
  K extends keyof TModel,
> = TModel[K] extends HasOne<any> | HasMany<any> | BelongsTo<any> ? true : false
