import { Collection, Document, FindOptions, Sort, WithId } from 'mongodb'
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

  constructor(
    private collection: Collection<T>,
    private modelConstructor: ModelConstructor
  ) {}

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
        [field]: this.serializeValue(operatorOrValue as QueryValue),
      }
    } else {
      // Operator-based condition
      const operator = operatorOrValue as QueryOperator
      const mongoOperator = this.mapOperatorToMongo(operator)

      let serializedValue = this.serializeValue(value!)

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
   * Add an OR where condition
   */
  orWhere(field: string, value: QueryValue): this
  orWhere(field: string, operator: QueryOperator, value: QueryValue): this
  orWhere(field: string, operatorOrValue: QueryOperator | QueryValue, value?: QueryValue): this {
    const condition: any = {}

    if (value === undefined) {
      condition[field] = this.serializeValue(operatorOrValue as QueryValue)
    } else {
      const operator = operatorOrValue as QueryOperator
      const mongoOperator = this.mapOperatorToMongo(operator)
      condition[field] = { [mongoOperator]: this.serializeValue(value!) }
    }

    if (!this.filters.$or) {
      this.filters.$or = []
    }

    this.filters.$or.push(condition)
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
   * Add a where not null condition
   */
  whereNotNull(field: string): this {
    this.filters = { ...this.filters, [field]: { $ne: null } }
    return this
  }

  /**
   * Add a where in condition
   */
  whereIn(field: string, values: QueryValue[]): this {
    this.filters = { ...this.filters, [field]: { $in: values.map((v) => this.serializeValue(v)) } }
    return this
  }

  /**
   * Add a where not in condition
   */
  whereNotIn(field: string, values: QueryValue[]): this {
    this.filters = { ...this.filters, [field]: { $nin: values.map((v) => this.serializeValue(v)) } }
    return this
  }

  /**
   * Add a where between condition
   */
  whereBetween(field: string, range: [QueryValue, QueryValue]): this {
    this.filters = {
      ...this.filters,
      [field]: {
        $gte: this.serializeValue(range[0]),
        $lte: this.serializeValue(range[1]),
      },
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

    const result = await this.collection.findOne(this.filters, options)
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

    const cursor = this.collection.find(this.filters, options)
    const results = await cursor.toArray()

    return results.map((doc) => this.deserializeDocument(doc))
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

    const cursor = this.collection.find(this.filters, options)
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
    return this.collection.countDocuments(this.filters)
  }

  /**
   * Get array of IDs for matching documents
   */
  async ids(): Promise<any[]> {
    const options: FindOptions<T> = {
      projection: { _id: 1 },
    }

    const cursor = this.collection.find(this.filters, options)
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
      serializedData[key] = this.serializeValue(value)
    }

    // Add updatedAt timestamp if not explicitly provided
    if (!serializedData.updatedAt) {
      serializedData.updatedAt = new Date()
    }

    const result = await this.collection.updateMany(this.filters, { $set: serializedData })
    return result.modifiedCount || 0
  }

  /**
   * Delete documents matching the query
   */
  async delete(): Promise<number> {
    const result = await this.collection.deleteMany(this.filters)
    return result.deletedCount || 0
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
  private serializeValue(value: QueryValue): any {
    if (value instanceof DateTime) {
      return value.toJSDate()
    }

    if (value instanceof Date) {
      return value
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
