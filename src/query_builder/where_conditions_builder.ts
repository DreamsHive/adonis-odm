import { DateTime } from 'luxon'
import { ObjectId } from 'mongodb'
import { QueryOperator, QueryValue } from '../types/index.js'
import type { NamingStrategyContract } from '../naming_strategy/naming_strategy.js'
import type { BaseModel } from '../base_model/base_model.js'

/**
 * WhereConditionsBuilder - Handles all WHERE clause construction for MongoDB queries
 *
 * This class encapsulates all the logic for building MongoDB filter conditions,
 * including AND, OR, NOT operations, and various comparison operators.
 */
export class WhereConditionsBuilder {
  private filters: any = {}
  private orConditions: any[] = []
  private namingStrategy?: NamingStrategyContract
  private modelClass?: typeof BaseModel

  constructor(namingStrategy?: NamingStrategyContract, modelClass?: typeof BaseModel) {
    this.namingStrategy = namingStrategy
    this.modelClass = modelClass
  }

  /**
   * Get the current filters
   */
  getFilters(): any {
    return this.filters
  }

  /**
   * Get the current OR conditions
   */
  getOrConditions(): any[] {
    return this.orConditions
  }

  /**
   * Set filters (used for cloning)
   */
  setFilters(filters: any): void {
    this.filters = { ...filters }
  }

  /**
   * Set OR conditions (used for cloning)
   */
  setOrConditions(conditions: any[]): void {
    this.orConditions = [...conditions]
  }

  /**
   * Convert field name to database column name using naming strategy
   */
  private convertFieldName(field: string): string {
    // Skip conversion for MongoDB operators and special fields
    if (field.startsWith('$') || field === '_id') {
      return field
    }

    // If naming strategy is available, use it to convert the field name
    if (this.namingStrategy && this.modelClass) {
      return this.namingStrategy.columnName(this.modelClass, field)
    }

    // Fallback: return as-is if no naming strategy is provided
    return field
  }

  /**
   * Recursively convert field names in a filter object
   */
  private convertFilterFields(filter: any): any {
    if (filter === null || filter === undefined) {
      return filter
    }

    // Handle arrays (like $or conditions)
    if (Array.isArray(filter)) {
      return filter.map((item) => this.convertFilterFields(item))
    }

    // Handle objects
    if (typeof filter === 'object' && filter.constructor === Object) {
      const converted: any = {}

      for (const [key, value] of Object.entries(filter)) {
        // Convert the field name
        const dbKey = this.convertFieldName(key)

        // Recursively convert nested objects, but skip MongoDB operators
        if (key.startsWith('$')) {
          // MongoDB operator - keep as-is, but convert nested values
          converted[key] = Array.isArray(value)
            ? value.map((item) => this.convertFilterFields(item))
            : this.convertFilterFields(value)
        } else {
          // Regular field - convert key and recursively process value
          converted[dbKey] = this.convertFilterFields(value)
        }
      }

      return converted
    }

    // Primitive values - return as-is
    return filter
  }

  /**
   * Get the final MongoDB filter object
   */
  getFinalFilters(): any {
    let finalFilters: any

    if (this.orConditions.length === 0) {
      finalFilters = this.filters
    } else {
      // If we have OR conditions, we need to restructure the query
      // We want: baseFilters AND (lastAndCondition OR orCondition1 OR orCondition2...)

      const filterEntries = Object.entries(this.filters)
      if (filterEntries.length === 0) {
        // Only OR conditions
        finalFilters = { $or: this.orConditions }
      } else {
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
          finalFilters = {
            $and: [baseFilters, { $or: orArray }],
          }
        } else {
          finalFilters = { $or: orArray }
        }
      }
    }

    // Convert all field names in the final filter structure
    return this.convertFilterFields(finalFilters)
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
  orWhere(field: string, operatorOrValue: QueryOperator | QueryValue, value?: QueryValue): this {
    let condition: any

    if (value === undefined) {
      // Simple equality check
      condition = { [field]: this.serializeValue(operatorOrValue as QueryValue, field) }
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

      condition = { [field]: { [mongoOperator]: serializedValue } }
    }

    this.orConditions.push(condition)
    return this
  }

  /**
   * Add an OR where not condition
   */
  orWhereNot(field: string, operatorOrValue: QueryOperator | QueryValue, value?: QueryValue): this {
    let condition: any

    if (value === undefined) {
      condition = { [field]: { $ne: this.serializeValue(operatorOrValue as QueryValue, field) } }
    } else {
      const operator = operatorOrValue as QueryOperator
      const mongoOperator = this.mapOperatorToMongo(operator)
      let serializedValue = this.serializeValue(value!, field)

      // For orWhereNot, we need to negate the condition
      if (operator === 'like') {
        const pattern = String(value).replace(/%/g, '.*')
        serializedValue = { $not: new RegExp(pattern, 'i') }
      } else {
        serializedValue = { $not: { [mongoOperator]: serializedValue } }
      }

      condition = { [field]: serializedValue }
    }

    this.orConditions.push(condition)
    return this
  }

  /**
   * Add a LIKE condition (case-sensitive)
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
   * Add an ILIKE condition (case-insensitive)
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
   * Add a NULL condition
   */
  whereNull(field: string): this {
    this.filters = { ...this.filters, [field]: null }
    return this
  }

  /**
   * Add an OR NULL condition
   */
  orWhereNull(field: string): this {
    this.orConditions.push({ [field]: null })
    return this
  }

  /**
   * Add a NOT NULL condition
   */
  whereNotNull(field: string): this {
    this.filters = { ...this.filters, [field]: { $ne: null } }
    return this
  }

  /**
   * Add an OR NOT NULL condition
   */
  orWhereNotNull(field: string): this {
    this.orConditions.push({ [field]: { $ne: null } })
    return this
  }

  /**
   * Add an EXISTS condition
   */
  whereExists(field: string): this {
    this.filters = { ...this.filters, [field]: { $exists: true } }
    return this
  }

  /**
   * Add an OR EXISTS condition
   */
  orWhereExists(field: string): this {
    this.orConditions.push({ [field]: { $exists: true } })
    return this
  }

  /**
   * Add a NOT EXISTS condition
   */
  whereNotExists(field: string): this {
    this.filters = { ...this.filters, [field]: { $exists: false } }
    return this
  }

  /**
   * Add an OR NOT EXISTS condition
   */
  orWhereNotExists(field: string): this {
    this.orConditions.push({ [field]: { $exists: false } })
    return this
  }

  /**
   * Add an IN condition
   */
  whereIn(field: string, values: QueryValue[]): this {
    const serializedValues = values.map((value) => this.serializeValue(value, field))
    this.filters = {
      ...this.filters,
      [field]: { $in: serializedValues },
    }
    return this
  }

  /**
   * Add an OR IN condition
   */
  orWhereIn(field: string, values: QueryValue[]): this {
    const serializedValues = values.map((value) => this.serializeValue(value, field))
    this.orConditions.push({ [field]: { $in: serializedValues } })
    return this
  }

  /**
   * Add a NOT IN condition
   */
  whereNotIn(field: string, values: QueryValue[]): this {
    const serializedValues = values.map((value) => this.serializeValue(value, field))
    this.filters = {
      ...this.filters,
      [field]: { $nin: serializedValues },
    }
    return this
  }

  /**
   * Add an OR NOT IN condition
   */
  orWhereNotIn(field: string, values: QueryValue[]): this {
    const serializedValues = values.map((value) => this.serializeValue(value, field))
    this.orConditions.push({ [field]: { $nin: serializedValues } })
    return this
  }

  /**
   * Add a BETWEEN condition
   */
  whereBetween(field: string, range: [QueryValue, QueryValue]): this {
    const [min, max] = range
    this.filters = {
      ...this.filters,
      [field]: {
        $gte: this.serializeValue(min, field),
        $lte: this.serializeValue(max, field),
      },
    }
    return this
  }

  /**
   * Add an OR BETWEEN condition
   */
  orWhereBetween(field: string, range: [QueryValue, QueryValue]): this {
    const [min, max] = range
    this.orConditions.push({
      [field]: {
        $gte: this.serializeValue(min, field),
        $lte: this.serializeValue(max, field),
      },
    })
    return this
  }

  /**
   * Add a NOT BETWEEN condition
   */
  whereNotBetween(field: string, range: [QueryValue, QueryValue]): this {
    const [min, max] = range
    this.filters = {
      ...this.filters,
      [field]: {
        $not: {
          $gte: this.serializeValue(min, field),
          $lte: this.serializeValue(max, field),
        },
      },
    }
    return this
  }

  /**
   * Add an OR NOT BETWEEN condition
   */
  orWhereNotBetween(field: string, range: [QueryValue, QueryValue]): this {
    const [min, max] = range
    this.orConditions.push({
      [field]: {
        $not: {
          $gte: this.serializeValue(min, field),
          $lte: this.serializeValue(max, field),
        },
      },
    })
    return this
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
   * Clone the where conditions builder
   */
  clone(): WhereConditionsBuilder {
    const cloned = new WhereConditionsBuilder(this.namingStrategy, this.modelClass)
    cloned.setFilters(this.filters)
    cloned.setOrConditions(this.orConditions)
    return cloned
  }
}
