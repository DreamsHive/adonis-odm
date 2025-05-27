import type { BaseModel } from '../base_model/base_model.js'

/**
 * Extract the instance type from a model class
 */
type ModelInstance<T extends typeof BaseModel> = InstanceType<T>

/**
 * Advanced query builder for embedded documents with full type safety
 *
 * Supports:
 * - Complex filtering and searching
 * - Pagination for large datasets
 * - Multiple sorting criteria
 * - Performance optimizations
 * - Aggregation operations
 * - All methods from ModelQueryBuilder for consistency
 */
export class EmbeddedQueryBuilder<T extends typeof BaseModel> {
  private items: Array<ModelInstance<T>>
  private filters: Array<(item: ModelInstance<T>) => boolean> = []
  private orFilters: Array<(item: ModelInstance<T>) => boolean> = []
  private sortOptions: Array<{ field: keyof ModelInstance<T>; direction: 'asc' | 'desc' }> = []
  private limitValue?: number
  private skipValue?: number
  private selectFields?: Array<keyof ModelInstance<T>>
  private searchTerm?: string
  private searchFields?: Array<keyof ModelInstance<T>>

  constructor(items: Array<ModelInstance<T>>) {
    this.items = items
  }

  /**
   * Filter embedded documents by field value with type safety
   */
  where<K extends keyof ModelInstance<T>>(
    field: K,
    operator: '=' | '!=' | '>' | '>=' | '<' | '<=' | 'like' | 'in' | 'not in' | '==' | '<>',
    value: ModelInstance<T>[K]
  ): this
  where<K extends keyof ModelInstance<T>>(field: K, value: ModelInstance<T>[K]): this
  where<K extends keyof ModelInstance<T>>(
    field: K,
    operatorOrValue:
      | '='
      | '!='
      | '>'
      | '>='
      | '<'
      | '<='
      | 'like'
      | 'in'
      | 'not in'
      | '=='
      | '<>'
      | ModelInstance<T>[K],
    value?: ModelInstance<T>[K]
  ): this {
    let operator: string
    let actualValue: ModelInstance<T>[K]

    if (arguments.length === 2) {
      // where(field, value) - equals comparison
      operator = '='
      actualValue = operatorOrValue as ModelInstance<T>[K]
    } else {
      // where(field, operator, value) - operator comparison
      operator = operatorOrValue as string
      actualValue = value!
    }

    this.filters.push((item: ModelInstance<T>) => {
      const fieldValue = item[field]

      switch (operator) {
        case '=':
        case '==':
          return fieldValue === actualValue
        case '!=':
        case '<>':
          return fieldValue !== actualValue
        case '>':
          return actualValue !== undefined && actualValue !== null && fieldValue > actualValue
        case '>=':
          return actualValue !== undefined && actualValue !== null && fieldValue >= actualValue
        case '<':
          return actualValue !== undefined && actualValue !== null && fieldValue < actualValue
        case '<=':
          return actualValue !== undefined && actualValue !== null && fieldValue <= actualValue
        case 'like':
          return (
            typeof fieldValue === 'string' &&
            typeof actualValue === 'string' &&
            fieldValue.includes(actualValue)
          )
        case 'in':
          return Array.isArray(actualValue) && actualValue.includes(fieldValue)
        case 'not in':
          return Array.isArray(actualValue) && !actualValue.includes(fieldValue)
        default:
          return fieldValue === actualValue
      }
    })

    return this
  }

  /**
   * Alias for where method
   */
  andWhere<K extends keyof ModelInstance<T>>(
    field: K,
    operator: '=' | '!=' | '>' | '>=' | '<' | '<=' | 'like' | 'in' | 'not in' | '==' | '<>',
    value: ModelInstance<T>[K]
  ): this
  andWhere<K extends keyof ModelInstance<T>>(field: K, value: ModelInstance<T>[K]): this
  andWhere<K extends keyof ModelInstance<T>>(
    field: K,
    operatorOrValue:
      | '='
      | '!='
      | '>'
      | '>='
      | '<'
      | '<='
      | 'like'
      | 'in'
      | 'not in'
      | '=='
      | '<>'
      | ModelInstance<T>[K],
    value?: ModelInstance<T>[K]
  ): this {
    if (arguments.length === 2) {
      return this.where(field, operatorOrValue as ModelInstance<T>[K])
    } else {
      return this.where(
        field,
        operatorOrValue as
          | '='
          | '!='
          | '>'
          | '>='
          | '<'
          | '<='
          | 'like'
          | 'in'
          | 'not in'
          | '=='
          | '<>',
        value!
      )
    }
  }

  /**
   * Add an OR where condition
   */
  orWhere<K extends keyof ModelInstance<T>>(
    field: K,
    operator: '=' | '!=' | '>' | '>=' | '<' | '<=' | 'like' | 'in' | 'not in' | '==' | '<>',
    value: ModelInstance<T>[K]
  ): this
  orWhere<K extends keyof ModelInstance<T>>(field: K, value: ModelInstance<T>[K]): this
  orWhere<K extends keyof ModelInstance<T>>(
    field: K,
    operatorOrValue:
      | '='
      | '!='
      | '>'
      | '>='
      | '<'
      | '<='
      | 'like'
      | 'in'
      | 'not in'
      | '=='
      | '<>'
      | ModelInstance<T>[K],
    value?: ModelInstance<T>[K]
  ): this {
    let operator: string
    let actualValue: ModelInstance<T>[K]

    if (arguments.length === 2) {
      // orWhere(field, value) - equals comparison
      operator = '='
      actualValue = operatorOrValue as ModelInstance<T>[K]
    } else {
      // orWhere(field, operator, value)
      operator = operatorOrValue as string
      actualValue = value!
    }

    this.orFilters.push((item: ModelInstance<T>) => {
      const fieldValue = item[field]

      switch (operator) {
        case '=':
        case '==':
          return fieldValue === actualValue
        case '!=':
        case '<>':
          return fieldValue !== actualValue
        case '>':
          return actualValue !== undefined && actualValue !== null && fieldValue > actualValue
        case '>=':
          return actualValue !== undefined && actualValue !== null && fieldValue >= actualValue
        case '<':
          return actualValue !== undefined && actualValue !== null && fieldValue < actualValue
        case '<=':
          return actualValue !== undefined && actualValue !== null && fieldValue <= actualValue
        case 'like':
          return (
            typeof fieldValue === 'string' &&
            typeof actualValue === 'string' &&
            fieldValue.includes(actualValue)
          )
        case 'in':
          return Array.isArray(actualValue) && actualValue.includes(fieldValue)
        case 'not in':
          return Array.isArray(actualValue) && !actualValue.includes(fieldValue)
        default:
          return fieldValue === actualValue
      }
    })

    return this
  }

  /**
   * Add a where not condition
   */
  whereNot<K extends keyof ModelInstance<T>>(
    field: K,
    operator: '=' | '!=' | '>' | '>=' | '<' | '<=' | 'like' | 'in' | 'not in' | '==' | '<>',
    value: ModelInstance<T>[K]
  ): this
  whereNot<K extends keyof ModelInstance<T>>(field: K, value: ModelInstance<T>[K]): this
  whereNot<K extends keyof ModelInstance<T>>(
    field: K,
    operatorOrValue:
      | '='
      | '!='
      | '>'
      | '>='
      | '<'
      | '<='
      | 'like'
      | 'in'
      | 'not in'
      | '=='
      | '<>'
      | ModelInstance<T>[K],
    value?: ModelInstance<T>[K]
  ): this {
    let operator: string
    let actualValue: ModelInstance<T>[K]

    if (arguments.length === 2) {
      // whereNot(field, value) - not equals comparison
      operator = '!='
      actualValue = operatorOrValue as ModelInstance<T>[K]
    } else {
      // whereNot(field, operator, value)
      operator = operatorOrValue as string
      actualValue = value!
    }

    this.filters.push((item: ModelInstance<T>) => {
      const fieldValue = item[field]

      switch (operator) {
        case '=':
        case '==':
          return fieldValue !== actualValue
        case '!=':
        case '<>':
          return fieldValue === actualValue
        case '>':
          return actualValue === undefined || actualValue === null || fieldValue <= actualValue
        case '>=':
          return actualValue === undefined || actualValue === null || fieldValue < actualValue
        case '<':
          return actualValue === undefined || actualValue === null || fieldValue >= actualValue
        case '<=':
          return actualValue === undefined || actualValue === null || fieldValue > actualValue
        case 'like':
          return !(
            typeof fieldValue === 'string' &&
            typeof actualValue === 'string' &&
            fieldValue.includes(actualValue)
          )
        case 'in':
          return !(Array.isArray(actualValue) && actualValue.includes(fieldValue))
        case 'not in':
          return Array.isArray(actualValue) && actualValue.includes(fieldValue)
        default:
          return fieldValue !== actualValue
      }
    })

    return this
  }

  /**
   * Alias for whereNot method
   */
  andWhereNot<K extends keyof ModelInstance<T>>(
    field: K,
    operator: '=' | '!=' | '>' | '>=' | '<' | '<=' | 'like' | 'in' | 'not in' | any,
    value?: ModelInstance<T>[K]
  ): this
  andWhereNot<K extends keyof ModelInstance<T>>(field: K, value: ModelInstance<T>[K]): this
  andWhereNot<K extends keyof ModelInstance<T>>(
    field: K,
    operatorOrValue:
      | '='
      | '!='
      | '>'
      | '>='
      | '<'
      | '<='
      | 'like'
      | 'in'
      | 'not in'
      | any
      | ModelInstance<T>[K],
    value?: ModelInstance<T>[K]
  ): this {
    return this.whereNot(field, operatorOrValue as any, value!)
  }

  /**
   * Add an OR where not condition
   */
  orWhereNot<K extends keyof ModelInstance<T>>(
    field: K,
    operator: '=' | '!=' | '>' | '>=' | '<' | '<=' | 'like' | 'in' | 'not in' | any,
    value?: ModelInstance<T>[K]
  ): this
  orWhereNot<K extends keyof ModelInstance<T>>(field: K, value: ModelInstance<T>[K]): this
  orWhereNot<K extends keyof ModelInstance<T>>(
    field: K,
    operatorOrValue:
      | '='
      | '!='
      | '>'
      | '>='
      | '<'
      | '<='
      | 'like'
      | 'in'
      | 'not in'
      | any
      | ModelInstance<T>[K],
    value?: ModelInstance<T>[K]
  ): this {
    let operator = operatorOrValue
    if (arguments.length === 2) {
      // orWhereNot(field, value) - not equals comparison
      value = operatorOrValue as ModelInstance<T>[K]
      operator = '!='
    }

    this.orFilters.push((item: ModelInstance<T>) => {
      const fieldValue = item[field]

      switch (operator) {
        case '=':
        case '==':
          return fieldValue !== value
        case '!=':
        case '<>':
          return fieldValue === value
        case '>':
          return value === undefined || value === null || fieldValue <= value
        case '>=':
          return value === undefined || value === null || fieldValue < value
        case '<':
          return value === undefined || value === null || fieldValue >= value
        case '<=':
          return value === undefined || value === null || fieldValue > value
        case 'like':
          return !(
            typeof fieldValue === 'string' &&
            typeof value === 'string' &&
            fieldValue.includes(value)
          )
        case 'in':
          if (!Array.isArray(value) || fieldValue === undefined) return true
          return !value.includes(fieldValue)
        case 'not in':
          if (!Array.isArray(value) || fieldValue === undefined) return false
          return value.includes(fieldValue)
        default:
          return fieldValue !== value
      }
    })

    return this
  }

  /**
   * Add a where like condition (case-sensitive)
   */
  whereLike<K extends keyof ModelInstance<T>>(field: K, value: string): this {
    this.filters.push((item: ModelInstance<T>) => {
      const fieldValue = item[field]
      if (typeof fieldValue !== 'string') return false
      const pattern = value.replace(/%/g, '.*')
      const regex = new RegExp(pattern)
      return regex.test(fieldValue)
    })
    return this
  }

  /**
   * Add a where ilike condition (case-insensitive)
   */
  whereILike<K extends keyof ModelInstance<T>>(field: K, value: string): this {
    this.filters.push((item: ModelInstance<T>) => {
      const fieldValue = item[field]
      if (typeof fieldValue !== 'string') return false
      const pattern = value.replace(/%/g, '.*')
      const regex = new RegExp(pattern, 'i')
      return regex.test(fieldValue)
    })
    return this
  }

  /**
   * Add a where in condition
   */
  whereIn<K extends keyof ModelInstance<T>>(field: K, values: ModelInstance<T>[K][]): this {
    this.filters.push((item: ModelInstance<T>) => {
      const fieldValue = item[field]
      return values.includes(fieldValue as ModelInstance<T>[K])
    })
    return this
  }

  /**
   * Add an OR where in condition
   */
  orWhereIn<K extends keyof ModelInstance<T>>(field: K, values: ModelInstance<T>[K][]): this {
    this.orFilters.push((item: ModelInstance<T>) => {
      const fieldValue = item[field]
      return values.includes(fieldValue)
    })
    return this
  }

  /**
   * Add a where not in condition
   */
  whereNotIn<K extends keyof ModelInstance<T>>(field: K, values: ModelInstance<T>[K][]): this {
    this.filters.push((item: ModelInstance<T>) => {
      const fieldValue = item[field]
      return !values.includes(fieldValue)
    })
    return this
  }

  /**
   * Add an OR where not in condition
   */
  orWhereNotIn<K extends keyof ModelInstance<T>>(field: K, values: ModelInstance<T>[K][]): this {
    this.orFilters.push((item: ModelInstance<T>) => {
      const fieldValue = item[field]
      return !values.includes(fieldValue)
    })
    return this
  }

  /**
   * Add a where between condition
   */
  whereBetween<K extends keyof ModelInstance<T>>(
    field: K,
    range: [ModelInstance<T>[K], ModelInstance<T>[K]]
  ): this {
    this.filters.push((item: ModelInstance<T>) => {
      const fieldValue = item[field]
      return fieldValue >= range[0] && fieldValue <= range[1]
    })
    return this
  }

  /**
   * Add an OR where between condition
   */
  orWhereBetween<K extends keyof ModelInstance<T>>(
    field: K,
    range: [ModelInstance<T>[K], ModelInstance<T>[K]]
  ): this {
    this.orFilters.push((item: ModelInstance<T>) => {
      const fieldValue = item[field]
      return fieldValue >= range[0] && fieldValue <= range[1]
    })
    return this
  }

  /**
   * Add a where not between condition
   */
  whereNotBetween<K extends keyof ModelInstance<T>>(
    field: K,
    range: [ModelInstance<T>[K], ModelInstance<T>[K]]
  ): this {
    this.filters.push((item: ModelInstance<T>) => {
      const fieldValue = item[field]
      return fieldValue < range[0] || fieldValue > range[1]
    })
    return this
  }

  /**
   * Add an OR where not between condition
   */
  orWhereNotBetween<K extends keyof ModelInstance<T>>(
    field: K,
    range: [ModelInstance<T>[K], ModelInstance<T>[K]]
  ): this {
    this.orFilters.push((item: ModelInstance<T>) => {
      const fieldValue = item[field]
      return fieldValue < range[0] || fieldValue > range[1]
    })
    return this
  }

  /**
   * Filter embedded documents where field is not null
   */
  whereNotNull<K extends keyof ModelInstance<T>>(field: K): this {
    this.filters.push((item: ModelInstance<T>) => {
      const fieldValue = item[field]
      return fieldValue !== null && fieldValue !== undefined
    })
    return this
  }

  /**
   * Add an OR where not null condition
   */
  orWhereNotNull<K extends keyof ModelInstance<T>>(field: K): this {
    this.orFilters.push((item: ModelInstance<T>) => {
      const fieldValue = item[field]
      return fieldValue !== null && fieldValue !== undefined
    })
    return this
  }

  /**
   * Filter embedded documents where field is null
   */
  whereNull<K extends keyof ModelInstance<T>>(field: K): this {
    this.filters.push((item: ModelInstance<T>) => {
      const fieldValue = item[field]
      return fieldValue === null || fieldValue === undefined
    })
    return this
  }

  /**
   * Add an OR where null condition
   */
  orWhereNull<K extends keyof ModelInstance<T>>(field: K): this {
    this.orFilters.push((item: ModelInstance<T>) => {
      const fieldValue = item[field]
      return fieldValue === null || fieldValue === undefined
    })
    return this
  }

  /**
   * Add a where exists condition
   */
  whereExists<K extends keyof ModelInstance<T>>(field: K): this {
    this.filters.push((item: ModelInstance<T>) => {
      return field in item
    })
    return this
  }

  /**
   * Add an OR where exists condition
   */
  orWhereExists<K extends keyof ModelInstance<T>>(field: K): this {
    this.orFilters.push((item: ModelInstance<T>) => {
      return field in item
    })
    return this
  }

  /**
   * Add a where not exists condition
   */
  whereNotExists<K extends keyof ModelInstance<T>>(field: K): this {
    this.filters.push((item: ModelInstance<T>) => {
      return !(field in item)
    })
    return this
  }

  /**
   * Add an OR where not exists condition
   */
  orWhereNotExists<K extends keyof ModelInstance<T>>(field: K): this {
    this.orFilters.push((item: ModelInstance<T>) => {
      return !(field in item)
    })
    return this
  }

  /**
   * Sort embedded documents with type safety
   */
  orderBy<K extends keyof ModelInstance<T>>(field: K, direction: 'asc' | 'desc' = 'asc'): this {
    this.sortOptions.push({ field, direction })
    return this
  }

  /**
   * Limit the number of results
   */
  limit(count: number): this {
    this.limitValue = count
    return this
  }

  /**
   * Skip a number of results
   */
  skip(count: number): this {
    this.skipValue = count
    return this
  }

  /**
   * Alias for skip - for pagination compatibility
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
   * Select specific fields to return (for performance with large objects)
   */
  select(...fields: Array<keyof ModelInstance<T>>): this {
    this.selectFields = fields
    return this
  }

  /**
   * Search across multiple fields with a single term
   */
  search(term: string, fields?: Array<keyof ModelInstance<T>>): this {
    this.searchTerm = term
    if (fields) {
      this.searchFields = fields
    }
    return this
  }

  /**
   * Add multiple where conditions with AND logic
   */
  whereAll(
    conditions: Array<{
      field: keyof ModelInstance<T>
      operator: '=' | '==' | '!=' | '<>' | '>' | '>=' | '<' | '<=' | 'like' | 'in' | 'not in'
      value: any
    }>
  ): this {
    conditions.forEach(({ field, operator, value }) => {
      this.where(field, operator, value)
    })
    return this
  }

  /**
   * Add multiple where conditions with OR logic
   */
  whereAny(
    conditions: Array<{
      field: keyof ModelInstance<T>
      operator: '=' | '==' | '!=' | '<>' | '>' | '>=' | '<' | '<=' | 'like' | 'in' | 'not in'
      value: any
    }>
  ): this {
    this.orFilters.push((item: ModelInstance<T>) => {
      return conditions.some(({ field, operator, value }) => {
        const fieldValue = item[field]

        switch (operator) {
          case '=':
          case '==':
            return fieldValue === value
          case '!=':
          case '<>':
            return fieldValue !== value
          case '>':
            return value !== undefined && value !== null && fieldValue > value
          case '>=':
            return value !== undefined && value !== null && fieldValue >= value
          case '<':
            return value !== undefined && value !== null && fieldValue < value
          case '<=':
            return value !== undefined && value !== null && fieldValue <= value
          case 'like':
            return (
              typeof fieldValue === 'string' &&
              typeof value === 'string' &&
              fieldValue.toLowerCase().includes(value.toLowerCase())
            )
          case 'in':
            return Array.isArray(value) && value.includes(fieldValue)
          case 'not in':
            return Array.isArray(value) && !value.includes(fieldValue)
          default:
            return fieldValue === value
        }
      })
    })
    return this
  }

  /**
   * Filter by date range
   */
  whereDateBetween<K extends keyof ModelInstance<T>>(
    field: K,
    startDate: Date | string,
    endDate: Date | string
  ): this {
    this.filters.push((item: ModelInstance<T>) => {
      const fieldValue = item[field]
      if (!fieldValue) return false

      const itemDate = fieldValue instanceof Date ? fieldValue : new Date(fieldValue as string)
      const start = startDate instanceof Date ? startDate : new Date(startDate)
      const end = endDate instanceof Date ? endDate : new Date(endDate)

      return itemDate >= start && itemDate <= end
    })
    return this
  }

  /**
   * Filter by array contains
   */
  whereArrayContains<K extends keyof ModelInstance<T>>(field: K, value: any): this {
    this.filters.push((item: ModelInstance<T>) => {
      const fieldValue = item[field]
      return Array.isArray(fieldValue) && fieldValue.includes(value)
    })
    return this
  }

  /**
   * Filter by regex pattern
   */
  whereRegex<K extends keyof ModelInstance<T>>(
    field: K,
    pattern: RegExp | string,
    flags?: string
  ): this {
    this.filters.push((item: ModelInstance<T>) => {
      const fieldValue = item[field]
      if (typeof fieldValue !== 'string') return false

      const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern, flags)
      return regex.test(fieldValue)
    })
    return this
  }

  /**
   * Execute the query and return filtered results
   */
  get(): Array<ModelInstance<T>> {
    let results = [...this.items]

    // Apply search filter if specified
    if (this.searchTerm) {
      const searchLower = this.searchTerm.toLowerCase()
      results = results.filter((item) => {
        const fieldsToSearch =
          this.searchFields || (Object.keys(item) as Array<keyof ModelInstance<T>>)

        return fieldsToSearch.some((field) => {
          const value = item[field]
          if (typeof value === 'string') {
            return value.toLowerCase().includes(searchLower)
          }
          if (typeof value === 'number') {
            return value.toString().includes(this.searchTerm!)
          }
          return false
        })
      })
    }

    // Apply AND filters
    for (const filter of this.filters) {
      results = results.filter(filter)
    }

    // Apply OR filters (if any item passes any OR filter, include it)
    if (this.orFilters.length > 0) {
      results = results.filter((item) => {
        return this.orFilters.some((orFilter) => orFilter(item))
      })
    }

    // Apply sorting
    for (const { field, direction } of this.sortOptions) {
      results.sort((a, b) => {
        const aValue = a[field]
        const bValue = b[field]

        if (aValue < bValue) return direction === 'asc' ? -1 : 1
        if (aValue > bValue) return direction === 'asc' ? 1 : -1
        return 0
      })
    }

    // Apply skip
    if (this.skipValue) {
      results = results.slice(this.skipValue)
    }

    // Apply limit
    if (this.limitValue) {
      results = results.slice(0, this.limitValue)
    }

    // Apply field selection if specified
    if (this.selectFields) {
      results = results.map((item) => {
        const selected = {} as ModelInstance<T>
        this.selectFields!.forEach((field) => {
          ;(selected as any)[field] = item[field]
        })
        return selected
      })
    }

    return results
  }

  /**
   * Get the first result
   */
  first(): ModelInstance<T> | null {
    const results = this.get()
    return results.length > 0 ? results[0] : null
  }

  /**
   * Get the count of results
   */
  count(): number {
    return this.get().length
  }

  /**
   * Check if any results exist
   */
  exists(): boolean {
    return this.count() > 0
  }

  /**
   * Get paginated results with metadata
   */
  paginate(
    page: number,
    perPage: number
  ): {
    data: Array<ModelInstance<T>>
    pagination: {
      currentPage: number
      perPage: number
      total: number
      totalPages: number
      hasNextPage: boolean
      hasPrevPage: boolean
    }
  } {
    // Get total count before pagination
    const total = this.count()
    const totalPages = Math.ceil(total / perPage)

    // Apply pagination
    const data = this.forPage(page, perPage).get()

    return {
      data,
      pagination: {
        currentPage: page,
        perPage,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    }
  }

  /**
   * Get distinct values for a field
   */
  distinct<K extends keyof ModelInstance<T>>(field: K): Array<ModelInstance<T>[K]> {
    const values = this.get().map((item) => item[field])
    return [...new Set(values)]
  }

  /**
   * Group results by a field value
   */
  groupBy<K extends keyof ModelInstance<T>>(
    field: K
  ): Map<ModelInstance<T>[K], Array<ModelInstance<T>>> {
    const results = this.get()
    const groups = new Map<ModelInstance<T>[K], Array<ModelInstance<T>>>()

    results.forEach((item) => {
      const key = item[field]
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(item)
    })

    return groups
  }

  /**
   * Get aggregated statistics for numeric fields
   */
  aggregate<K extends keyof ModelInstance<T>>(
    field: K
  ): {
    count: number
    sum: number
    avg: number
    min: number
    max: number
  } | null {
    const allValues = this.get().map((item) => item[field])
    const numericValues = allValues.filter((value) => typeof value === 'number') as number[]

    if (numericValues.length === 0) {
      return null
    }

    const sum = numericValues.reduce((acc, val) => acc + val, 0)
    const count = numericValues.length
    const avg = sum / count
    const min = Math.min(...numericValues)
    const max = Math.max(...numericValues)

    return { count, sum, avg, min, max }
  }

  /**
   * Execute a custom callback on the results
   */
  tap(callback: (results: Array<ModelInstance<T>>) => void): this {
    callback(this.get())
    return this
  }

  /**
   * Clone the query builder for reuse
   */
  clone(): EmbeddedQueryBuilder<T> {
    const cloned = new EmbeddedQueryBuilder<T>(this.items)
    cloned.filters = [...this.filters]
    cloned.orFilters = [...this.orFilters]
    cloned.sortOptions = [...this.sortOptions]
    cloned.limitValue = this.limitValue
    cloned.skipValue = this.skipValue
    cloned.selectFields = this.selectFields ? [...this.selectFields] : undefined
    cloned.searchTerm = this.searchTerm
    cloned.searchFields = this.searchFields ? [...this.searchFields] : undefined
    return cloned
  }
}
