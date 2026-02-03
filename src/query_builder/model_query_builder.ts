import { Collection, Document } from 'mongodb'
import {
  QueryOperator,
  QueryValue,
  SortDirection,
  PaginatedResult,
  ModelConstructor,
} from '../types/index.js'
import { BaseModel } from '../base_model/base_model.js'
import type {
  LoadRelationConstraint,
  EmbedRelationConstraint,
} from '../types/relationship_inference.js'
import type { MongoTransactionClient } from '../transaction_client.js'
import { WhereConditionsBuilder } from './where_conditions_builder.js'
import { QueryExecutor } from './query_executor.js'
import { QueryUtilities } from './query_utilities.js'

/**
 * SEAMLESS TYPE-SAFE MODEL QUERY BUILDER - Like AdonisJS Lucid!
 *
 * This enhanced query builder provides automatic type inference for relationships
 * and seamless type safety without requiring any type assertions or extra steps.
 *
 * Key Features:
 * - Automatic relationship name inference from model definitions
 * - Type-safe load callbacks with proper IntelliSense
 * - Compile-time error checking for invalid relationship names
 * - Method chaining like AdonisJS Lucid
 * - Bulk loading to prevent N+1 query problems
 */
export class ModelQueryBuilder<
  T extends Document = Document,
  TModel extends BaseModel = BaseModel,
> {
  private whereBuilder: WhereConditionsBuilder
  private queryExecutor: QueryExecutor<T, TModel>
  private queryUtils: QueryUtilities
  private loadRelations: Map<string, (query: any) => void> = new Map()
  private embedRelations: Map<string, (query: any) => void> = new Map()

  constructor(
    private collection: Collection<T>,
    private modelConstructor: ModelConstructor,
    transactionClient?: MongoTransactionClient
  ) {
    const modelClass = modelConstructor as typeof BaseModel
    const namingStrategy = modelClass.namingStrategy
    this.whereBuilder = new WhereConditionsBuilder(namingStrategy, modelClass)
    this.queryExecutor = new QueryExecutor(collection, modelConstructor, transactionClient)
    this.queryUtils = new QueryUtilities()
  }

  /**
   * Associate this query builder with a transaction
   */
  public useTransaction(trx: MongoTransactionClient): this {
    this.queryExecutor = new QueryExecutor(this.collection, this.modelConstructor, trx)
    return this
  }

  /**
   * Add a where condition
   */
  where(field: string, value: QueryValue): this
  where(field: string, operator: QueryOperator, value: QueryValue): this
  where(field: string, operatorOrValue: QueryOperator | QueryValue, value?: QueryValue): this {
    if (value === undefined) {
      this.whereBuilder.where(field, operatorOrValue as QueryValue)
    } else {
      this.whereBuilder.where(field, operatorOrValue as QueryOperator, value)
    }
    return this
  }

  /**
   * Alias for where method
   */
  andWhere(field: string, value: QueryValue): this
  andWhere(field: string, operator: QueryOperator, value: QueryValue): this
  andWhere(field: string, operatorOrValue: QueryOperator | QueryValue, value?: QueryValue): this {
    if (value === undefined) {
      this.whereBuilder.andWhere(field, operatorOrValue as QueryValue)
    } else {
      this.whereBuilder.andWhere(field, operatorOrValue as QueryOperator, value)
    }
    return this
  }

  /**
   * Add a where not condition
   */
  whereNot(field: string, value: QueryValue): this
  whereNot(field: string, operator: QueryOperator, value: QueryValue): this
  whereNot(field: string, operatorOrValue: QueryOperator | QueryValue, value?: QueryValue): this {
    if (value === undefined) {
      this.whereBuilder.whereNot(field, operatorOrValue as QueryValue)
    } else {
      this.whereBuilder.whereNot(field, operatorOrValue as QueryOperator, value)
    }
    return this
  }

  /**
   * Alias for whereNot method
   */
  andWhereNot(
    field: string,
    operatorOrValue: QueryOperator | QueryValue,
    value?: QueryValue
  ): this {
    if (value === undefined) {
      this.whereBuilder.andWhereNot(field, operatorOrValue as QueryValue)
    } else {
      this.whereBuilder.andWhereNot(field, operatorOrValue as QueryOperator, value)
    }
    return this
  }

  /**
   * Add an OR where condition
   */
  orWhere(field: string, operatorOrValue: QueryOperator | QueryValue, value?: QueryValue): this {
    this.whereBuilder.orWhere(field, operatorOrValue, value)
    return this
  }

  /**
   * Add an OR where not condition
   */
  orWhereNot(field: string, operatorOrValue: QueryOperator | QueryValue, value?: QueryValue): this {
    this.whereBuilder.orWhereNot(field, operatorOrValue, value)
    return this
  }

  /**
   * Add a where like condition (case-sensitive)
   */
  whereLike(field: string, value: string): this {
    this.whereBuilder.whereLike(field, value)
    return this
  }

  /**
   * Add a where ilike condition (case-insensitive)
   */
  whereILike(field: string, value: string): this {
    this.whereBuilder.whereILike(field, value)
    return this
  }

  /**
   * Add a where null condition
   */
  whereNull(field: string): this {
    this.whereBuilder.whereNull(field)
    return this
  }

  /**
   * Add an OR where null condition
   */
  orWhereNull(field: string): this {
    this.whereBuilder.orWhereNull(field)
    return this
  }

  /**
   * Add a where not null condition
   */
  whereNotNull(field: string): this {
    this.whereBuilder.whereNotNull(field)
    return this
  }

  /**
   * Add an OR where not null condition
   */
  orWhereNotNull(field: string): this {
    this.whereBuilder.orWhereNotNull(field)
    return this
  }

  /**
   * Add a where exists condition
   */
  whereExists(field: string): this {
    this.whereBuilder.whereExists(field)
    return this
  }

  /**
   * Add an OR where exists condition
   */
  orWhereExists(field: string): this {
    this.whereBuilder.orWhereExists(field)
    return this
  }

  /**
   * Add a where not exists condition
   */
  whereNotExists(field: string): this {
    this.whereBuilder.whereNotExists(field)
    return this
  }

  /**
   * Add an OR where not exists condition
   */
  orWhereNotExists(field: string): this {
    this.whereBuilder.orWhereNotExists(field)
    return this
  }

  /**
   * Add a where in condition
   */
  whereIn(field: string, values: QueryValue[]): this {
    this.whereBuilder.whereIn(field, values)
    return this
  }

  /**
   * Add an OR where in condition
   */
  orWhereIn(field: string, values: QueryValue[]): this {
    this.whereBuilder.orWhereIn(field, values)
    return this
  }

  /**
   * Add a where not in condition
   */
  whereNotIn(field: string, values: QueryValue[]): this {
    this.whereBuilder.whereNotIn(field, values)
    return this
  }

  /**
   * Add an OR where not in condition
   */
  orWhereNotIn(field: string, values: QueryValue[]): this {
    this.whereBuilder.orWhereNotIn(field, values)
    return this
  }

  /**
   * Add a where between condition
   */
  whereBetween(field: string, range: [QueryValue, QueryValue]): this {
    this.whereBuilder.whereBetween(field, range)
    return this
  }

  /**
   * Add an OR where between condition
   */
  orWhereBetween(field: string, range: [QueryValue, QueryValue]): this {
    this.whereBuilder.orWhereBetween(field, range)
    return this
  }

  /**
   * Add a where not between condition
   */
  whereNotBetween(field: string, range: [QueryValue, QueryValue]): this {
    this.whereBuilder.whereNotBetween(field, range)
    return this
  }

  /**
   * Add an OR where not between condition
   */
  orWhereNotBetween(field: string, range: [QueryValue, QueryValue]): this {
    this.whereBuilder.orWhereNotBetween(field, range)
    return this
  }

  /**
   * Add distinct clause
   */
  distinct(field: string): this {
    this.queryUtils.distinct(field)
    return this
  }

  /**
   * Add group by clause
   */
  groupBy(...fields: string[]): this {
    this.queryUtils.groupBy(...fields)
    return this
  }

  /**
   * Add having clause (for aggregation)
   */
  having(field: string, operatorOrValue: QueryOperator | QueryValue, value?: QueryValue): this {
    this.queryUtils.having(field, operatorOrValue, value)
    return this
  }

  /**
   * Add order by clause
   */
  orderBy(field: string, direction: SortDirection = 'asc'): this {
    this.queryUtils.orderBy(field, direction)
    return this
  }

  /**
   * Set limit
   */
  limit(count: number): this {
    this.queryUtils.limit(count)
    return this
  }

  /**
   * Set skip/offset
   */
  skip(count: number): this {
    this.queryUtils.skip(count)
    return this
  }

  /**
   * Alias for skip method
   */
  offset(count: number): this {
    this.queryUtils.offset(count)
    return this
  }

  /**
   * Set pagination using page and perPage
   */
  forPage(page: number, perPage: number): this {
    this.queryUtils.forPage(page, perPage)
    return this
  }

  /**
   * Select specific fields
   */
  select(fields: string[] | Record<string, 0 | 1>): this {
    this.queryUtils.select(fields)
    return this
  }

  /**
   * TYPE-SAFE LOAD METHOD - Eager Load Referenced Relationships!
   *
   * This method provides automatic type inference for REFERENCED relationship loading.
   * The callback parameter is automatically typed based on the relationship being loaded.
   * Only supports REFERENCED relationships (HasOne, HasMany, BelongsTo).
   * Embedded relationships are excluded because they need to be "embedded" instead.
   *
   * Example usage:
   * ```typescript
   * const users = await User.query().load('profile', (profileQuery) => {
   *   profileQuery.where('isActive', true).orderBy('createdAt', 'desc')
   * })
   * ```
   *
   * @param relation - The REFERENCED relationship property name (with IntelliSense support)
   * @param callback - Optional callback to modify the relationship query
   */
  load<K extends LoadRelationConstraint<TModel>>(
    relation: K,
    callback?: (query: ModelQueryBuilder<any, BaseModel>) => void
  ): this {
    this.loadRelations.set(String(relation), callback || (() => {}))
    return this
  }

  /**
   * TYPE-SAFE EMBED METHOD - Query Embedded Documents Directly!
   *
   * This method provides automatic type inference for EMBEDDED document querying.
   * The callback parameter is automatically typed based on the embedded relationship being queried.
   * Only supports EMBEDDED relationships (EmbeddedSingle, EmbeddedMany).
   * Referenced relationships are excluded because they need to be "loaded" instead.
   *
   * Example usage:
   * ```typescript
   * const users = await UserWithEnhancedEmbeddedProfile.query().embed('profiles', (profileQuery) => {
   *   profileQuery.where('age', '>', 25).orderBy('age', 'desc').limit(5)
   * })
   * ```
   *
   * @param relation - The EMBEDDED relationship property name (with IntelliSense support)
   * @param callback - Optional callback to filter/paginate the embedded documents
   */
  embed<K extends EmbedRelationConstraint<TModel>>(
    relation: K,
    callback?: (
      query: import('../embedded/embedded_query_builder.js').EmbeddedQueryBuilder<any>
    ) => void
  ): this {
    this.embedRelations.set(String(relation), callback || (() => {}))
    return this
  }

  /**
   * Execute query and return first result
   */
  async first(): Promise<TModel | null> {
    return this.queryExecutor.first(
      this.whereBuilder.getFinalFilters(),
      this.queryUtils.getSelectFields(),
      this.queryUtils.getSortOptions(),
      this.loadRelations,
      this.embedRelations
    )
  }

  /**
   * Execute query and return first result or throw exception
   */
  async firstOrFail(): Promise<TModel> {
    return this.queryExecutor.firstOrFail(
      this.whereBuilder.getFinalFilters(),
      this.queryUtils.getSelectFields(),
      this.queryUtils.getSortOptions(),
      this.loadRelations,
      this.embedRelations
    )
  }

  /**
   * Execute query and return all results
   */
  async all(): Promise<TModel[]> {
    return this.fetch()
  }

  /**
   * Execute query and return all results (alias for all)
   */
  async fetch(): Promise<TModel[]> {
    return this.queryExecutor.fetch(
      this.whereBuilder.getFinalFilters(),
      this.queryUtils.getSelectFields(),
      this.queryUtils.getSortOptions(),
      this.queryUtils.getLimitValue(),
      this.queryUtils.getSkipValue(),
      this.queryUtils.getDistinctField(),
      this.queryUtils.getGroupByFields(),
      this.queryUtils.getHavingConditions(),
      this.loadRelations,
      this.embedRelations
    )
  }

  /**
   * Execute query and return paginated results
   */
  async paginate(page: number, perPage: number): Promise<PaginatedResult<TModel>> {
    return this.queryExecutor.paginate(
      page,
      perPage,
      this.whereBuilder.getFinalFilters(),
      this.queryUtils.getSelectFields(),
      this.queryUtils.getSortOptions(),
      this.loadRelations
    )
  }

  /**
   * Count documents matching the query
   */
  async count(): Promise<number> {
    return this.queryExecutor.count(this.whereBuilder.getFinalFilters())
  }

  /**
   * Get array of IDs for matching documents
   */
  async ids(): Promise<any[]> {
    return this.queryExecutor.ids(this.whereBuilder.getFinalFilters())
  }

  /**
   * Update documents matching the query
   */
  async update(updateData: Record<string, any>): Promise<number> {
    return this.queryExecutor.update(this.whereBuilder.getFinalFilters(), updateData)
  }

  /**
   * Delete documents matching the query
   */
  async delete(): Promise<number> {
    return this.queryExecutor.delete(this.whereBuilder.getFinalFilters())
  }

  /**
   * Clone the query builder
   */
  clone(): ModelQueryBuilder<T, TModel> {
    const cloned = new ModelQueryBuilder<T, TModel>(this.collection, this.modelConstructor)
    cloned.whereBuilder = this.whereBuilder.clone()
    cloned.queryUtils = this.queryUtils.clone()
    cloned.loadRelations = new Map(this.loadRelations)
    cloned.embedRelations = new Map(this.embedRelations)
    return cloned
  }
}
