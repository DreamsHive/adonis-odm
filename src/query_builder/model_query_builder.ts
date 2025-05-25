import { Collection, Document, FindOptions, Sort, WithId, ObjectId } from 'mongodb'
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

/**
 * Model Query Builder for MongoDB ODM
 */
export class ModelQueryBuilder<T extends Document = Document> {
  private filters: any = {}
  private sortOptions: Record<string, 1 | -1> = {}
  private limitValue?: number
  private skipValue?: number
  private selectFields?: Record<string, 0 | 1>
  private distinctField?: string
  private groupByFields: string[] = []
  private havingConditions: any = {}
  private orConditions: any[] = []

  constructor(
    private collection: Collection<T>,
    private modelConstructor: ModelConstructor
  ) {}

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
   * Execute query and return first result
   */
  async first(): Promise<WithId<T> | null> {
    const options: FindOptions<T> = {}

    if (this.selectFields) {
      options.projection = this.selectFields
    }

    if (Object.keys(this.sortOptions).length > 0) {
      options.sort = this.sortOptions as Sort
    }

    const result = await this.collection.findOne(this.getFinalFilters(), options)
    return result ? this.deserializeDocument(result) : null
  }

  /**
   * Execute query and return first result or throw exception
   */
  async firstOrFail(): Promise<WithId<T>> {
    const result = await this.first()
    if (!result) {
      throw new ModelNotFoundException(this.modelConstructor.name)
    }
    return result
  }

  /**
   * Execute query and return all results
   */
  async all(): Promise<WithId<T>[]> {
    return this.fetch()
  }

  /**
   * Execute query and return all results (alias for all)
   */
  async fetch(): Promise<WithId<T>[]> {
    // Handle distinct queries
    if (this.distinctField) {
      const distinctValues = await this.collection.distinct(
        this.distinctField,
        this.getFinalFilters()
      )
      return distinctValues.map((value) => ({ [this.distinctField!]: value }) as any)
    }

    // Handle group by queries (using aggregation)
    if (this.groupByFields.length > 0) {
      return this.executeAggregation()
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

    const cursor = this.collection.find(this.getFinalFilters(), options)
    const results = await cursor.toArray()

    return results.map((doc) => this.deserializeDocument(doc))
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
  async paginate(page: number, perPage: number): Promise<PaginatedResult<WithId<T>>> {
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
    const data = results.map((doc) => this.deserializeDocument(doc))

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

    const result = await this.collection.updateMany(this.getFinalFilters(), {
      $set: serializedData,
    })
    return result.modifiedCount || 0
  }

  /**
   * Delete documents matching the query
   */
  async delete(): Promise<number> {
    const result = await this.collection.deleteMany(this.getFinalFilters())
    return result.deletedCount || 0
  }

  /**
   * Clone the query builder
   */
  clone(): ModelQueryBuilder<T> {
    const cloned = new ModelQueryBuilder(this.collection, this.modelConstructor)
    cloned.filters = { ...this.filters }
    cloned.sortOptions = { ...this.sortOptions }
    cloned.limitValue = this.limitValue
    cloned.skipValue = this.skipValue
    cloned.selectFields = this.selectFields ? { ...this.selectFields } : undefined
    cloned.distinctField = this.distinctField
    cloned.groupByFields = [...this.groupByFields]
    cloned.havingConditions = { ...this.havingConditions }
    cloned.orConditions = [...this.orConditions]
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
}
