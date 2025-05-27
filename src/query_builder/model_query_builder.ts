import { Collection, Document, FindOptions, Sort, WithId, ObjectId, ClientSession } from 'mongodb'
import { DateTime } from 'luxon'
import {
  QueryOperator,
  QueryValue,
  SortDirection,
  PaginatedResult,
  PaginationMeta,
  ModelConstructor,
} from '../types/index.js'
import { ModelNotFoundException } from '../exceptions/index.js'
import { BaseModel } from '../base_model/base_model.js'
import type {
  LoadRelationConstraint,
  EmbedRelationConstraint,
  ExtractEmbeddedModelClass,
} from '../types/relationship_inference.js'
import type { MongoTransactionClient } from '../transaction_client.js'

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
  private filters: any = {}
  private sortOptions: Record<string, 1 | -1> = {}
  private limitValue?: number
  private skipValue?: number
  private selectFields?: Record<string, 0 | 1>
  private distinctField?: string
  private groupByFields: string[] = []
  private havingConditions: any = {}
  private orConditions: any[] = []
  private loadRelations: Map<string, (query: any) => void> = new Map()
  private embedRelations: Map<string, (query: any) => void> = new Map()
  private transactionClient?: MongoTransactionClient

  constructor(
    private collection: Collection<T>,
    private modelConstructor: ModelConstructor,
    transactionClient?: MongoTransactionClient
  ) {
    if (transactionClient) {
      this.transactionClient = transactionClient
    }
  }

  /**
   * Associate this query builder with a transaction
   */
  public useTransaction(trx: MongoTransactionClient): this {
    this.transactionClient = trx
    return this
  }

  /**
   * Get the session for transaction operations
   */
  private getSession(): ClientSession | undefined {
    return this.transactionClient?.getSession()
  }

  /**
   * Get the final MongoDB filter object
   */
  private getFinalFilters(): any {
    if (this.orConditions.length === 0) {
      return this.filters
    }

    // If we have OR conditions, we need to restructure the query
    // We want: baseFilters AND (lastAndCondition OR orCondition1 OR orCondition2...)

    const filterEntries = Object.entries(this.filters)
    if (filterEntries.length === 0) {
      // Only OR conditions
      return { $or: this.orConditions }
    }

    // If we have both AND and OR conditions, we need to be smart about combining them
    // The last AND condition should be combined with OR conditions
    const baseFilters: any = {}
    let lastAndField: string | null = null
    let lastAndCondition: any = null

    // Separate the last AND condition from base filters
    for (let i = 0; i < filterEntries.length; i++) {
      const [field, condition] = filterEntries[i]
      if (i === filterEntries.length - 1) {
        // This is the last condition - it should be ORed with orConditions
        lastAndField = field
        lastAndCondition = condition
      } else {
        baseFilters[field] = condition
      }
    }

    // Create the OR array with the last AND condition and all OR conditions
    const orArray: any[] = []

    if (lastAndField && lastAndCondition) {
      orArray.push({ [lastAndField]: lastAndCondition })
    }

    orArray.push(...this.orConditions)

    // Build final query
    if (Object.keys(baseFilters).length > 0) {
      return {
        $and: [baseFilters, { $or: orArray }],
      }
    } else {
      return { $or: orArray }
    }
  }

  /**
   * Add a where condition
   */
  where(field: string, value: QueryValue): this
  where(field: string, operator: QueryOperator, value: QueryValue): this
  where(field: string, operatorOrValue: QueryOperator | QueryValue, value?: QueryValue): this {
    if (value === undefined) {
      // Simple equality check
      this.filters = {
        ...this.filters,
        [field]: this.serializeValue(operatorOrValue as QueryValue, field),
      }
    } else {
      // Operator-based condition
      const operator = operatorOrValue as QueryOperator
      const mongoOperator = this.mapOperatorToMongo(operator)

      let serializedValue = this.serializeValue(value!, field)

      // Handle 'like' operator by converting to regex pattern
      if (operator === 'like') {
        const pattern = String(value).replace(/%/g, '.*')
        serializedValue = new RegExp(pattern, 'i')
      }

      const existingFilter = this.filters[field]
      if (existingFilter && typeof existingFilter === 'object' && existingFilter !== null) {
        this.filters = {
          ...this.filters,
          [field]: { ...existingFilter, [mongoOperator]: serializedValue },
        }
      } else {
        this.filters = {
          ...this.filters,
          [field]: { [mongoOperator]: serializedValue },
        }
      }
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
      return this.where(field, operatorOrValue as QueryValue)
    }
    return this.where(field, operatorOrValue as QueryOperator, value)
  }

  /**
   * Add a where not condition
   */
  whereNot(field: string, value: QueryValue): this
  whereNot(field: string, operator: QueryOperator, value: QueryValue): this
  whereNot(field: string, operatorOrValue: QueryOperator | QueryValue, value?: QueryValue): this {
    if (value === undefined) {
      this.filters = {
        ...this.filters,
        [field]: { $ne: this.serializeValue(operatorOrValue as QueryValue, field) },
      }
    } else {
      const operator = operatorOrValue as QueryOperator
      const mongoOperator = this.mapOperatorToMongo(operator)
      let serializedValue = this.serializeValue(value!, field)

      // For whereNot, we need to negate the condition
      if (operator === 'like') {
        const pattern = String(value).replace(/%/g, '.*')
        serializedValue = { $not: new RegExp(pattern, 'i') }
      } else {
        serializedValue = { $not: { [mongoOperator]: serializedValue } }
      }

      this.filters = {
        ...this.filters,
        [field]: serializedValue,
      }
    }

    return this
  }

  /**
   * Alias for whereNot method
   */
  andWhereNot(field: string, value: QueryValue): this
  andWhereNot(field: string, operator: QueryOperator, value: QueryValue): this
  andWhereNot(
    field: string,
    operatorOrValue: QueryOperator | QueryValue,
    value?: QueryValue
  ): this {
    if (value === undefined) {
      return this.whereNot(field, operatorOrValue as QueryValue)
    }
    return this.whereNot(field, operatorOrValue as QueryOperator, value)
  }

  /**
   * Add an OR where condition
   */
  orWhere(field: string, value: QueryValue): this
  orWhere(field: string, operator: QueryOperator, value: QueryValue): this
  orWhere(field: string, operatorOrValue: QueryOperator | QueryValue, value?: QueryValue): this {
    const condition: any = {}

    if (value === undefined) {
      condition[field] = this.serializeValue(operatorOrValue as QueryValue, field)
    } else {
      const operator = operatorOrValue as QueryOperator
      const mongoOperator = this.mapOperatorToMongo(operator)
      let serializedValue = this.serializeValue(value!, field)

      if (operator === 'like') {
        const pattern = String(value).replace(/%/g, '.*')
        serializedValue = new RegExp(pattern, 'i')
      }

      condition[field] = { [mongoOperator]: serializedValue }
    }

    this.orConditions.push(condition)
    return this
  }

  /**
   * Add an OR where not condition
   */
  orWhereNot(field: string, value: QueryValue): this
  orWhereNot(field: string, operator: QueryOperator, value: QueryValue): this
  orWhereNot(field: string, operatorOrValue: QueryOperator | QueryValue, value?: QueryValue): this {
    const condition: any = {}

    if (value === undefined) {
      condition[field] = { $ne: this.serializeValue(operatorOrValue as QueryValue, field) }
    } else {
      const operator = operatorOrValue as QueryOperator
      const mongoOperator = this.mapOperatorToMongo(operator)
      let serializedValue = this.serializeValue(value!, field)

      if (operator === 'like') {
        const pattern = String(value).replace(/%/g, '.*')
        condition[field] = { $not: new RegExp(pattern, 'i') }
      } else {
        condition[field] = { $not: { [mongoOperator]: serializedValue } }
      }
    }

    this.orConditions.push(condition)
    return this
  }

  /**
   * Add a where like condition (case-sensitive)
   */
  whereLike(field: string, value: string): this {
    const pattern = value.replace(/%/g, '.*')
    this.filters = {
      ...this.filters,
      [field]: new RegExp(pattern),
    }
    return this
  }

  /**
   * Add a where ilike condition (case-insensitive)
   */
  whereILike(field: string, value: string): this {
    const pattern = value.replace(/%/g, '.*')
    this.filters = {
      ...this.filters,
      [field]: new RegExp(pattern, 'i'),
    }
    return this
  }

  /**
   * Add a where null condition
   */
  whereNull(field: string): this {
    this.filters = { ...this.filters, [field]: null }
    return this
  }

  /**
   * Add an OR where null condition
   */
  orWhereNull(field: string): this {
    const condition = { [field]: null }
    this.orConditions.push(condition)
    return this
  }

  /**
   * Add a where not null condition
   */
  whereNotNull(field: string): this {
    this.filters = { ...this.filters, [field]: { $ne: null } }
    return this
  }

  /**
   * Add an OR where not null condition
   */
  orWhereNotNull(field: string): this {
    const condition = { [field]: { $ne: null } }
    this.orConditions.push(condition)
    return this
  }

  /**
   * Add a where exists condition
   */
  whereExists(field: string): this {
    this.filters = { ...this.filters, [field]: { $exists: true } }
    return this
  }

  /**
   * Add an OR where exists condition
   */
  orWhereExists(field: string): this {
    const condition = { [field]: { $exists: true } }
    this.orConditions.push(condition)
    return this
  }

  /**
   * Add a where not exists condition
   */
  whereNotExists(field: string): this {
    this.filters = { ...this.filters, [field]: { $exists: false } }
    return this
  }

  /**
   * Add an OR where not exists condition
   */
  orWhereNotExists(field: string): this {
    const condition = { [field]: { $exists: false } }
    this.orConditions.push(condition)
    return this
  }

  /**
   * Add a where in condition
   */
  whereIn(field: string, values: QueryValue[]): this {
    this.filters = {
      ...this.filters,
      [field]: { $in: values.map((v) => this.serializeValue(v, field)) },
    }
    return this
  }

  /**
   * Add an OR where in condition
   */
  orWhereIn(field: string, values: QueryValue[]): this {
    const condition = { [field]: { $in: values.map((v) => this.serializeValue(v, field)) } }
    this.orConditions.push(condition)
    return this
  }

  /**
   * Add a where not in condition
   */
  whereNotIn(field: string, values: QueryValue[]): this {
    this.filters = {
      ...this.filters,
      [field]: { $nin: values.map((v) => this.serializeValue(v, field)) },
    }
    return this
  }

  /**
   * Add an OR where not in condition
   */
  orWhereNotIn(field: string, values: QueryValue[]): this {
    const condition = { [field]: { $nin: values.map((v) => this.serializeValue(v, field)) } }
    this.orConditions.push(condition)
    return this
  }

  /**
   * Add a where between condition
   */
  whereBetween(field: string, range: [QueryValue, QueryValue]): this {
    this.filters = {
      ...this.filters,
      [field]: {
        $gte: this.serializeValue(range[0], field),
        $lte: this.serializeValue(range[1], field),
      },
    }
    return this
  }

  /**
   * Add an OR where between condition
   */
  orWhereBetween(field: string, range: [QueryValue, QueryValue]): this {
    const condition = {
      [field]: {
        $gte: this.serializeValue(range[0], field),
        $lte: this.serializeValue(range[1], field),
      },
    }
    this.orConditions.push(condition)
    return this
  }

  /**
   * Add a where not between condition
   */
  whereNotBetween(field: string, range: [QueryValue, QueryValue]): this {
    // For NOT BETWEEN, we need to use $or at the top level
    // This means: field < min OR field > max
    const condition = {
      $or: [
        { [field]: { $lt: this.serializeValue(range[0], field) } },
        { [field]: { $gt: this.serializeValue(range[1], field) } },
      ],
    }

    // If we already have filters, we need to combine them with $and
    if (Object.keys(this.filters).length > 0) {
      this.filters = {
        $and: [this.filters, condition],
      }
    } else {
      this.filters = condition
    }
    return this
  }

  /**
   * Add an OR where not between condition
   */
  orWhereNotBetween(field: string, range: [QueryValue, QueryValue]): this {
    // For OR NOT BETWEEN, we add a complex condition to orConditions
    const condition = {
      $or: [
        { [field]: { $lt: this.serializeValue(range[0], field) } },
        { [field]: { $gt: this.serializeValue(range[1], field) } },
      ],
    }
    this.orConditions.push(condition)
    return this
  }

  /**
   * Add distinct clause
   */
  distinct(field: string): this {
    this.distinctField = field
    return this
  }

  /**
   * Add group by clause
   */
  groupBy(...fields: string[]): this {
    this.groupByFields.push(...fields)
    return this
  }

  /**
   * Add having clause (for aggregation)
   */
  having(field: string, value: QueryValue): this
  having(field: string, operator: QueryOperator, value: QueryValue): this
  having(field: string, operatorOrValue: QueryOperator | QueryValue, value?: QueryValue): this {
    if (value === undefined) {
      this.havingConditions[field] = this.serializeValue(operatorOrValue as QueryValue, field)
    } else {
      const operator = operatorOrValue as QueryOperator
      const mongoOperator = this.mapOperatorToMongo(operator)
      this.havingConditions[field] = { [mongoOperator]: this.serializeValue(value!, field) }
    }

    return this
  }

  /**
   * Add order by clause
   */
  orderBy(field: string, direction: SortDirection = 'asc'): this {
    const sortDirection = direction === 'asc' || direction === 1 ? 1 : -1
    this.sortOptions[field] = sortDirection
    return this
  }

  /**
   * Set limit
   */
  limit(count: number): this {
    this.limitValue = count
    return this
  }

  /**
   * Set skip/offset
   */
  skip(count: number): this {
    this.skipValue = count
    return this
  }

  /**
   * Alias for skip method
   */
  offset(count: number): this {
    return this.skip(count)
  }

  /**
   * Set pagination using page and perPage
   */
  forPage(page: number, perPage: number): this {
    const skip = (page - 1) * perPage
    return this.skip(skip).limit(perPage)
  }

  /**
   * Select specific fields
   */
  select(fields: string[] | Record<string, 0 | 1>): this {
    if (Array.isArray(fields)) {
      this.selectFields = {}
      fields.forEach((field) => {
        this.selectFields![field] = 1
      })
    } else {
      this.selectFields = fields
    }
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
    const { executeHooks } = await import('../base_model/hooks_executor.js')
    const modelClass = this.modelConstructor as typeof BaseModel & { new (...args: any[]): any }

    // Execute beforeFind hook (for single record queries)
    if (!(await executeHooks(this, 'beforeFind', modelClass))) {
      return null // Operation aborted by hook
    }

    // Execute beforeFetch hook
    if (!(await executeHooks(this, 'beforeFetch', modelClass))) {
      return null // Operation aborted by hook
    }

    const options: FindOptions<T> = {}

    if (this.selectFields) {
      options.projection = this.selectFields
    }

    if (Object.keys(this.sortOptions).length > 0) {
      options.sort = this.sortOptions as Sort
    }

    // Add session for transaction support
    const session = this.getSession()
    if (session) {
      options.session = session
    }

    // Use potentially modified filters from hooks
    const finalFilters = this.getFinalFilters()
    const result = await this.collection.findOne(finalFilters, options)
    if (!result) return null

    const deserializedResult = this.deserializeDocument(result)

    // Create a proper model instance
    const model = new this.modelConstructor()
    model.hydrateFromDocument(deserializedResult)
    Object.assign(model, deserializedResult)
    Object.setPrototypeOf(model, this.modelConstructor.prototype)

    // Associate model with transaction if present
    if (this.transactionClient) {
      model.useTransaction(this.transactionClient)
    }

    // Load relations if specified (eager loading like Lucid's preload)
    if (this.loadRelations.size > 0) {
      await this.loadReferencedDocuments([model])
    }

    // Process embedded relations if specified
    if (this.embedRelations.size > 0) {
      await this.processEmbeddedDocuments([model])
    }

    // Execute afterFind hook
    await executeHooks(model, 'afterFind', modelClass)

    // Execute afterFetch hook with array containing single model
    await executeHooks([model], 'afterFetch', modelClass)

    return model as TModel
  }

  /**
   * Execute query and return first result or throw exception
   */
  async firstOrFail(): Promise<TModel> {
    const result = await this.first()
    if (!result) {
      throw new ModelNotFoundException(this.modelConstructor.name)
    }
    return result
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
    const { executeHooks } = await import('../base_model/hooks_executor.js')
    const modelClass = this.modelConstructor as typeof BaseModel & { new (...args: any[]): any }

    // Execute beforeFetch hook
    if (!(await executeHooks(this, 'beforeFetch', modelClass))) {
      return [] // Operation aborted by hook
    }

    // Handle distinct queries
    if (this.distinctField) {
      const session = this.getSession()
      const distinctOptions = session ? { session } : {}
      const distinctValues = await this.collection.distinct(
        this.distinctField,
        this.getFinalFilters(),
        distinctOptions
      )
      return distinctValues.map((value) => ({
        [this.distinctField!]: value,
      })) as unknown as TModel[]
    }

    // Handle group by queries (using aggregation)
    if (this.groupByFields.length > 0) {
      const aggregationResults = await this.executeAggregation()
      return this.serializeResults(aggregationResults) as unknown as TModel[]
    }

    const options: FindOptions<T> = {}

    if (this.selectFields) {
      options.projection = this.selectFields
    }

    if (Object.keys(this.sortOptions).length > 0) {
      options.sort = this.sortOptions as Sort
    }

    if (this.limitValue !== undefined) {
      options.limit = this.limitValue
    }

    if (this.skipValue !== undefined) {
      options.skip = this.skipValue
    }

    // Add session for transaction support
    const session = this.getSession()
    if (session) {
      options.session = session
    }

    // Use potentially modified filters from hooks
    const finalFilters = this.getFinalFilters()
    const cursor = this.collection.find(finalFilters, options)
    const results = await cursor.toArray()

    const deserializedResults = results.map((doc) => this.deserializeDocument(doc))

    // Create proper model instances
    const modelInstances = deserializedResults.map((doc) => {
      const model = new this.modelConstructor()
      model.hydrateFromDocument(doc)
      Object.assign(model, doc)
      Object.setPrototypeOf(model, this.modelConstructor.prototype)
      return model
    })

    // Associate models with transaction if present
    if (this.transactionClient) {
      modelInstances.forEach((model) => {
        model.useTransaction(this.transactionClient!)
      })
    }

    // Load relations if specified (eager loading like Lucid's preload)
    if (this.loadRelations.size > 0) {
      await this.loadReferencedDocuments(modelInstances)
    }

    // Process embedded relations if specified
    if (this.embedRelations.size > 0) {
      await this.processEmbeddedDocuments(modelInstances)
    }

    // Execute afterFetch hook
    await executeHooks(modelInstances, 'afterFetch', modelClass)

    return modelInstances as unknown as TModel[]
  }

  /**
   * Execute aggregation pipeline for group by queries
   */
  private async executeAggregation(): Promise<WithId<T>[]> {
    const pipeline: any[] = []

    // Match stage (equivalent to WHERE)
    const finalFilters = this.getFinalFilters()
    if (Object.keys(finalFilters).length > 0) {
      pipeline.push({ $match: finalFilters })
    }

    // Group stage
    const groupStage: any = {
      _id: {},
    }

    // Add group by fields to _id
    this.groupByFields.forEach((field) => {
      groupStage._id[field] = `$${field}`
    })

    // Add selected fields or count
    if (this.selectFields) {
      Object.keys(this.selectFields).forEach((field) => {
        if (this.selectFields![field] === 1 && !this.groupByFields.includes(field)) {
          groupStage[field] = { $first: `$${field}` }
        }
      })
    } else {
      groupStage.count = { $sum: 1 }
    }

    pipeline.push({ $group: groupStage })

    // Having stage (equivalent to HAVING)
    if (Object.keys(this.havingConditions).length > 0) {
      pipeline.push({ $match: this.havingConditions })
    }

    // Sort stage
    if (Object.keys(this.sortOptions).length > 0) {
      pipeline.push({ $sort: this.sortOptions })
    }

    // Skip stage
    if (this.skipValue !== undefined) {
      pipeline.push({ $skip: this.skipValue })
    }

    // Limit stage
    if (this.limitValue !== undefined) {
      pipeline.push({ $limit: this.limitValue })
    }

    const results = await this.collection.aggregate(pipeline).toArray()
    return results.map((doc) => this.deserializeDocument(doc as WithId<T>))
  }

  /**
   * Execute query and return paginated results
   */
  async paginate(page: number, perPage: number): Promise<PaginatedResult<TModel>> {
    const skip = (page - 1) * perPage
    const total = await this.count()

    const options: FindOptions<T> = {
      skip,
      limit: perPage,
    }

    if (this.selectFields) {
      options.projection = this.selectFields
    }

    if (Object.keys(this.sortOptions).length > 0) {
      options.sort = this.sortOptions as Sort
    }

    const cursor = this.collection.find(this.getFinalFilters(), options)
    const results = await cursor.toArray()
    const deserializedResults = results.map((doc) => this.deserializeDocument(doc))

    // Load relations if specified (eager loading like Lucid's preload)
    if (this.loadRelations.size > 0) {
      await this.loadReferencedDocuments(deserializedResults)
    }

    const data = this.serializeResults(deserializedResults) as unknown as TModel[]

    const lastPage = Math.ceil(total / perPage)
    const baseUrl = '' // This would be configured based on the application

    const meta: PaginationMeta = {
      total,
      perPage,
      currentPage: page,
      lastPage,
      firstPage: 1,
      firstPageUrl: `${baseUrl}?page=1`,
      lastPageUrl: `${baseUrl}?page=${lastPage}`,
      nextPageUrl: page < lastPage ? `${baseUrl}?page=${page + 1}` : null,
      previousPageUrl: page > 1 ? `${baseUrl}?page=${page - 1}` : null,
    }

    return { data, meta }
  }

  /**
   * Count documents matching the query
   */
  async count(): Promise<number> {
    return this.collection.countDocuments(this.getFinalFilters())
  }

  /**
   * Get array of IDs for matching documents
   */
  async ids(): Promise<any[]> {
    const options: FindOptions<T> = {
      projection: { _id: 1 },
    }

    // Add session for transaction support
    const session = this.getSession()
    if (session) {
      options.session = session
    }

    const cursor = this.collection.find(this.getFinalFilters(), options)
    const results = await cursor.toArray()

    return results.map((doc) => doc._id)
  }

  /**
   * Update documents matching the query
   */
  async update(updateData: Record<string, any>): Promise<number> {
    // Serialize the update data
    const serializedData: any = {}
    for (const [key, value] of Object.entries(updateData)) {
      serializedData[key] = this.serializeValue(value, key)
    }

    // Add updatedAt timestamp if not explicitly provided
    if (!serializedData.updatedAt) {
      serializedData.updatedAt = new Date()
    }

    // Add session for transaction support
    const session = this.getSession()
    const options = session ? { session } : {}

    const result = await this.collection.updateMany(
      this.getFinalFilters(),
      {
        $set: serializedData,
      },
      options
    )
    return result.modifiedCount || 0
  }

  /**
   * Delete documents matching the query
   */
  async delete(): Promise<number> {
    // Add session for transaction support
    const session = this.getSession()
    const options = session ? { session } : {}

    const result = await this.collection.deleteMany(this.getFinalFilters(), options)
    return result.deletedCount || 0
  }

  /**
   * Clone the query builder
   */
  clone(): ModelQueryBuilder<T, TModel> {
    const cloned = new ModelQueryBuilder<T, TModel>(this.collection, this.modelConstructor)
    cloned.filters = { ...this.filters }
    cloned.sortOptions = { ...this.sortOptions }
    cloned.limitValue = this.limitValue
    cloned.skipValue = this.skipValue
    cloned.selectFields = this.selectFields ? { ...this.selectFields } : undefined
    cloned.distinctField = this.distinctField
    cloned.groupByFields = [...this.groupByFields]
    cloned.havingConditions = { ...this.havingConditions }
    cloned.orConditions = [...this.orConditions]
    cloned.loadRelations = new Map(this.loadRelations)
    cloned.embedRelations = new Map(this.embedRelations)
    cloned.transactionClient = this.transactionClient
    return cloned
  }

  /**
   * Map query operator to MongoDB operator
   */
  private mapOperatorToMongo(operator: QueryOperator): string {
    const operatorMap: Record<QueryOperator, string> = {
      'eq': '$eq',
      'ne': '$ne',
      'gt': '$gt',
      'gte': '$gte',
      'lt': '$lt',
      'lte': '$lte',
      'in': '$in',
      'nin': '$nin',
      'exists': '$exists',
      'regex': '$regex',
      'like': '$regex',
      '=': '$eq',
      '!=': '$ne',
      '>': '$gt',
      '>=': '$gte',
      '<': '$lt',
      '<=': '$lte',
    }

    return operatorMap[operator]
  }

  /**
   * Serialize value for MongoDB
   */
  private serializeValue(value: QueryValue, field?: string): any {
    if (value instanceof DateTime) {
      return value.toJSDate()
    }

    if (value instanceof Date) {
      return value
    }

    // Handle ObjectId conversion for _id fields
    if (field === '_id' && typeof value === 'string') {
      try {
        return new ObjectId(value)
      } catch (error) {
        // If it's not a valid ObjectId string, return as is
        return value
      }
    }

    return value
  }

  /**
   * Deserialize document from MongoDB
   */
  private deserializeDocument(doc: WithId<T>): WithId<T> {
    // This would apply any deserialize functions from column metadata
    // For now, just return the document as-is
    return doc
  }

  /**
   * Serialize a single result for API response
   */
  private serializeResult(result: WithId<T>): Record<string, unknown> {
    // Always create a proper model instance
    const model = new this.modelConstructor()
    model.hydrateFromDocument(result)

    // Copy all properties from the result to the model
    Object.assign(model, result)

    // Ensure the model has the correct prototype
    Object.setPrototypeOf(model, this.modelConstructor.prototype)

    // Now call toJSON on the properly constructed model instance
    return model.toJSON()
  }

  /**
   * Serialize multiple results for API response
   */
  private serializeResults(results: WithId<T>[]): Record<string, unknown>[] {
    return results.map((result) => this.serializeResult(result))
  }

  /**
   * Load referenced documents for the given results (eager loading like Lucid's preload)
   * This implements the same functionality as AdonisJS Lucid's preload method
   *
   * FULL IMPLEMENTATION: Prevents N+1 query problems with bulk loading
   */
  private async loadReferencedDocuments(results: WithId<T>[]): Promise<void> {
    if (results.length === 0) {
      return
    }

    // For each relationship to load
    for (const [relationName, callback] of this.loadRelations) {
      // Get the model metadata to find relationship information
      const metadata = this.modelConstructor.getMetadata()
      const relationColumn = metadata.columns.get(relationName)

      if (!relationColumn) {
        continue // Skip if column doesn't exist
      }

      // Handle embedded documents
      if (relationColumn.isEmbedded) {
        await this.loadEmbeddedDocuments(results, relationName, relationColumn, callback)
        continue
      }

      // Handle referenced documents
      if (!relationColumn.isReference) {
        continue // Skip if not a relationship
      }

      // If the model name is still "deferred", we need to trigger lazy resolution
      // by accessing the relationship property on a model instance
      if (relationColumn.model === 'deferred') {
        const tempInstance = new this.modelConstructor()
        // Access the relationship property to trigger lazy resolution
        // This triggers lazy resolution and updates relationColumn.model
        void (tempInstance as any)[relationName]
      }

      // Determine relationship type and load accordingly
      if (relationColumn.isBelongsTo) {
        await this.loadBelongsToRelationship(results, relationName, relationColumn, callback)
      } else if (relationColumn.isArray) {
        await this.loadHasManyRelationship(results, relationName, relationColumn, callback)
      } else {
        await this.loadHasOneRelationship(results, relationName, relationColumn, callback)
      }
    }
  }

  /**
   * Load BelongsTo relationships in bulk (prevents N+1 queries)
   */
  private async loadBelongsToRelationship(
    results: WithId<T>[],
    relationName: string,
    relationColumn: any,
    callback?: (query: any) => void
  ): Promise<void> {
    // 1. Collect all foreign keys from the results
    const foreignKeys = results
      .map((result) => (result as any)[relationColumn.localKey])
      .filter((key) => key !== null && key !== undefined)

    if (foreignKeys.length === 0) return

    // 2. Get the related model class
    const RelatedModel = this.getRelatedModelClass(relationColumn.model!)

    // 3. Query all related documents in a single query
    // Apply naming strategy to convert field name to database column name
    const dbFieldName = RelatedModel.namingStrategy.columnName(
      RelatedModel,
      relationColumn.foreignKey
    )

    let relatedQuery = RelatedModel.query().whereIn(dbFieldName, foreignKeys)
    if (this.transactionClient) {
      relatedQuery = relatedQuery.useTransaction(this.transactionClient)
    }

    // 4. Apply callback constraints if provided
    if (callback && typeof callback === 'function') {
      callback(relatedQuery)
    }

    const relatedDocuments = await relatedQuery.all()

    // 5. Create a map for quick lookup
    const relatedMap = new Map<string, any>()
    relatedDocuments.forEach((doc: any) => {
      const key = (doc as any)[dbFieldName]
      relatedMap.set(key?.toString(), doc)
    })

    // 6. Map related documents back to their parent models
    for (const result of results) {
      // Convert result to a proper model instance if it isn't already
      if (!((result as any) instanceof BaseModel)) {
        const model = new this.modelConstructor()
        model.hydrateFromDocument(result)
        Object.setPrototypeOf(result, model.constructor.prototype)
        Object.assign(result, model)
      }

      const foreignKey = (result as any)[relationColumn.localKey]
      if (foreignKey) {
        const relatedDoc = relatedMap.get(foreignKey.toString())
        if (relatedDoc) {
          // Access the relationship proxy to initialize it, then set the data
          const relationshipProxy = (result as any)[relationName]
          if (relationshipProxy) {
            relationshipProxy.related = relatedDoc
            // Note: isLoaded is read-only, it's managed internally by the proxy
          }
        }
      }
    }
  }

  /**
   * Load HasOne relationships in bulk (prevents N+1 queries)
   */
  private async loadHasOneRelationship(
    results: WithId<T>[],
    relationName: string,
    relationColumn: any,
    callback?: (query: any) => void
  ): Promise<void> {
    // 1. Collect all local keys from the results
    const localKeys = results
      .map((result) => (result as any)[relationColumn.localKey])
      .filter((key) => key !== null && key !== undefined)

    if (localKeys.length === 0) {
      return
    }

    // 2. Get the related model class
    const RelatedModel = this.getRelatedModelClass(relationColumn.model!)

    // 3. Query all related documents in a single query
    // Apply naming strategy to convert field name to database column name
    const dbFieldName = RelatedModel.namingStrategy.columnName(
      RelatedModel,
      relationColumn.foreignKey
    )

    let relatedQuery = RelatedModel.query().whereIn(dbFieldName, localKeys)
    if (this.transactionClient) {
      relatedQuery = relatedQuery.useTransaction(this.transactionClient)
    }

    // 4. Apply callback constraints if provided
    if (callback && typeof callback === 'function') {
      callback(relatedQuery)
    }

    const relatedDocuments = await relatedQuery.all()

    // 5. Create a map for quick lookup
    const relatedMap = new Map<string, any>()
    relatedDocuments.forEach((doc: any) => {
      const key = (doc as any)[dbFieldName]
      relatedMap.set(key?.toString(), doc)
    })

    // 6. Map related documents back to their parent models
    for (const result of results) {
      // Convert result to a proper model instance if it isn't already
      if (!((result as any) instanceof BaseModel)) {
        const model = new this.modelConstructor()
        model.hydrateFromDocument(result)
        Object.setPrototypeOf(result, model.constructor.prototype)
        Object.assign(result, model)
      }

      const localKey = (result as any)[relationColumn.localKey]

      if (localKey) {
        const relatedDoc = relatedMap.get(localKey.toString())

        if (relatedDoc) {
          // Access the relationship proxy to initialize it, then set the data
          const relationshipProxy = (result as any)[relationName]

          if (relationshipProxy) {
            relationshipProxy.related = relatedDoc
          }
        }
      }
    }
  }

  /**
   * Load HasMany relationships in bulk (prevents N+1 queries)
   */
  private async loadHasManyRelationship(
    results: WithId<T>[],
    relationName: string,
    relationColumn: any,
    callback?: (query: any) => void
  ): Promise<void> {
    // 1. Collect all local keys from the results
    const localKeys = results
      .map((result) => (result as any)[relationColumn.localKey])
      .filter((key) => key !== null && key !== undefined)

    if (localKeys.length === 0) return

    // 2. Get the related model class
    const RelatedModel = this.getRelatedModelClass(relationColumn.model!)

    // 3. Query all related documents in a single query
    // Apply naming strategy to convert field name to database column name
    const dbFieldName = RelatedModel.namingStrategy.columnName(
      RelatedModel,
      relationColumn.foreignKey
    )

    let relatedQuery = RelatedModel.query().whereIn(dbFieldName, localKeys)
    if (this.transactionClient) {
      relatedQuery = relatedQuery.useTransaction(this.transactionClient)
    }

    // 4. Apply callback constraints if provided
    if (callback && typeof callback === 'function') {
      callback(relatedQuery)
    }

    const relatedDocuments = await relatedQuery.all()

    // 5. Group related documents by foreign key
    const relatedGroups = new Map<string, any[]>()
    relatedDocuments.forEach((doc: any) => {
      const key = (doc as any)[dbFieldName]?.toString()
      if (key) {
        if (!relatedGroups.has(key)) {
          relatedGroups.set(key, [])
        }
        relatedGroups.get(key)!.push(doc)
      }
    })

    // 6. Map related documents back to their parent models
    for (const result of results) {
      // Convert result to a proper model instance if it isn't already
      if (!((result as any) instanceof BaseModel)) {
        const model = new this.modelConstructor()
        model.hydrateFromDocument(result)
        Object.setPrototypeOf(result, model.constructor.prototype)
        Object.assign(result, model)
      }

      const localKey = (result as any)[relationColumn.localKey]
      if (localKey) {
        const relatedDocs = relatedGroups.get(localKey.toString()) || []

        // Access the relationship proxy to initialize it, then set the data
        const relationshipProxy = (result as any)[relationName]
        if (relationshipProxy) {
          relationshipProxy.related = relatedDocs
          // Note: isLoaded is read-only, it's managed internally by the proxy
          // Update the array proxy
          relationshipProxy.length = 0
          relationshipProxy.push(...relatedDocs)
        }
      }
    }
  }

  /**
   * Load embedded documents with query capabilities
   * For embedded documents, we apply the callback constraints to filter the embedded data
   */
  private async loadEmbeddedDocuments(
    results: WithId<T>[],
    relationName: string,
    _relationColumn: any,
    callback?: (query: any) => void
  ): Promise<void> {
    // For embedded documents, we need to apply the callback constraints
    // to filter the embedded data if it's an array (many type)

    for (const result of results) {
      // Convert result to a proper model instance if it isn't already
      if (!((result as any) instanceof BaseModel)) {
        const model = new this.modelConstructor()
        model.hydrateFromDocument(result)
        Object.setPrototypeOf(result, model.constructor.prototype)
        Object.assign(result, model)
      }

      // Access the embedded property to ensure it's initialized
      const embeddedData = (result as any)[relationName]

      // If it's an embedded many type and has query capabilities, apply callback
      if (embeddedData && typeof embeddedData.query === 'function' && callback) {
        // Create a query builder for the embedded data
        const embeddedQuery = embeddedData.query()

        // Apply the callback constraints
        callback(embeddedQuery)

        // Execute the query to filter the embedded data
        const filteredData = embeddedQuery.get()

        // Update the embedded data with filtered results
        // Note: This doesn't modify the original data, just provides filtered access
        // In a real implementation, you might want to cache this or handle it differently
        embeddedData._filteredResults = filteredData
      }
    }
  }

  /**
   * Process embedded documents with query capabilities
   * This method applies the embed() callback constraints to filter embedded documents
   */
  private async processEmbeddedDocuments(results: WithId<T>[]): Promise<void> {
    if (results.length === 0) {
      return
    }

    // For each embedded relationship to process
    for (const [relationName, callback] of this.embedRelations) {
      // Get the model metadata to find embedded relationship information
      const metadata = this.modelConstructor.getMetadata()
      const relationColumn = metadata.columns.get(relationName)

      if (!relationColumn || !relationColumn.isEmbedded) {
        continue // Skip if not an embedded relationship
      }

      // Process each result
      for (const result of results) {
        // Convert result to a proper model instance if it isn't already
        if (!((result as any) instanceof BaseModel)) {
          const model = new this.modelConstructor()
          model.hydrateFromDocument(result)
          Object.setPrototypeOf(result, model.constructor.prototype)
          Object.assign(result, model)
        }

        // Access the embedded property to ensure it's initialized
        const embeddedData = (result as any)[relationName]

        // Apply callback constraints for embedded many types (arrays)
        if (embeddedData && typeof embeddedData.query === 'function' && callback) {
          // Create a query builder for the embedded data
          const embeddedQuery = embeddedData.query()

          // Apply the callback constraints
          callback(embeddedQuery)

          // Execute the query to get filtered results
          const filteredData = embeddedQuery.get()

          // Replace the embedded data with filtered results
          // This modifies the actual embedded array to show only filtered items
          if (Array.isArray(embeddedData)) {
            // Clear the existing array and add filtered items
            embeddedData.length = 0
            embeddedData.push(...filteredData)
          }
        }

        // For single embedded documents, we could apply validation or transformation
        // but typically single embedded documents don't need query filtering
        else if (embeddedData && relationColumn.embeddedType === 'single') {
          // For single embedded documents, we could create a temporary query builder
          // and apply the callback for validation purposes, but this is less common
          console.log(
            `⚠️ Embed callback applied to single embedded document '${relationName}' - this is unusual`
          )
        }
      }
    }
  }

  /**
   * Get the related model class by name
   * Uses the global model registry for relationship loading
   */
  private getRelatedModelClass(modelName: string): any {
    const ModelClass = BaseModel.getModelClass(modelName)
    if (!ModelClass) {
      throw new Error(
        `Model "${modelName}" not found in registry. ` +
          'Make sure the model is imported and instantiated at least once, ' +
          'or manually register it using ModelClass.register().'
      )
    }

    return ModelClass
  }
}
