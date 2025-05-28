import { QueryOperator, QueryValue } from '../types/index.js'

/**
 * Where Conditions Builder
 *
 * Handles all where condition logic for the ModelQueryBuilder
 */
export class WhereConditionsBuilder {
  private filters: any = {}
  private orConditions: any[] = []

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
    this.filters = filters
  }

  /**
   * Set OR conditions (used for cloning)
   */
  setOrConditions(orConditions: any[]): void {
    this.orConditions = orConditions
  }

  /**
   * Get the final MongoDB filter object
   */
  getFinalFilters(): any {
    if (this.orConditions.length === 0) {
      return this.filters
    }

    const filterEntries = Object.entries(this.filters)
    if (filterEntries.length === 0) {
      return { $or: this.orConditions }
    }

    const baseFilters: any = {}
    let lastAndField: string | null = null
    let lastAndCondition: any = null

    for (let i = 0; i < filterEntries.length; i++) {
      const [field, condition] = filterEntries[i]
      if (i === filterEntries.length - 1) {
        lastAndField = field
        lastAndCondition = condition
      } else {
        baseFilters[field] = condition
      }
    }

    const orArray: any[] = []

    if (lastAndField && lastAndCondition) {
      orArray.push({ [lastAndField]: lastAndCondition })
    }

    orArray.push(...this.orConditions)

    if (Object.keys(baseFilters).length > 0) {
      return {
        $and: [baseFilters, { $or: orArray }],
      }
    } else {
      return { $or: orArray }
    }
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

    return operatorMap[operator] || '$eq'
  }

  /**
   * Serialize value for MongoDB
   */
  private serializeValue(value: QueryValue, _field?: string): any {
    if (value === null || value === undefined) {
      return value
    }

    if (value instanceof Date) {
      return value
    }

    if (typeof value === 'string' && value.match(/^[0-9a-fA-F]{24}$/)) {
      return value
    }

    return value
  }

  /**
   * Add a where condition
   */
  where(field: string, value: QueryValue): this
  where(field: string, operator: QueryOperator, value: QueryValue): this
  where(field: string, operatorOrValue: QueryOperator | QueryValue, value?: QueryValue): this {
    if (value === undefined) {
      this.filters = {
        ...this.filters,
        [field]: this.serializeValue(operatorOrValue as QueryValue, field),
      }
    } else {
      const operator = operatorOrValue as QueryOperator
      const mongoOperator = this.mapOperatorToMongo(operator)

      let serializedValue = this.serializeValue(value!, field)

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
   * Where in condition
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
   * Where not in condition
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
   * Where between condition
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
   * Where null condition
   */
  whereNull(field: string): this {
    this.filters = {
      ...this.filters,
      [field]: null,
    }
    return this
  }

  /**
   * Where not null condition
   */
  whereNotNull(field: string): this {
    this.filters = {
      ...this.filters,
      [field]: { $ne: null },
    }
    return this
  }

  /**
   * Clone the where conditions builder
   */
  clone(): WhereConditionsBuilder {
    const cloned = new WhereConditionsBuilder()
    cloned.setFilters({ ...this.filters })
    cloned.setOrConditions([...this.orConditions])
    return cloned
  }
}
