import { SortDirection } from '../types/index.js'

/**
 * QueryUtilities - Utility methods for query building and processing
 *
 * This class contains utility methods for sorting, pagination, selection,
 * and other query building helpers.
 */
export class QueryUtilities {
  private sortOptions: Record<string, 1 | -1> = {}
  private limitValue?: number
  private skipValue?: number
  private selectFields?: Record<string, 0 | 1>
  private distinctField?: string
  private groupByFields: string[] = []
  private havingConditions: any = {}

  /**
   * Get current sort options
   */
  getSortOptions(): Record<string, 1 | -1> {
    return this.sortOptions
  }

  /**
   * Get current limit value
   */
  getLimitValue(): number | undefined {
    return this.limitValue
  }

  /**
   * Get current skip value
   */
  getSkipValue(): number | undefined {
    return this.skipValue
  }

  /**
   * Get current select fields
   */
  getSelectFields(): Record<string, 0 | 1> | undefined {
    return this.selectFields
  }

  /**
   * Get current distinct field
   */
  getDistinctField(): string | undefined {
    return this.distinctField
  }

  /**
   * Get current group by fields
   */
  getGroupByFields(): string[] {
    return this.groupByFields
  }

  /**
   * Get current having conditions
   */
  getHavingConditions(): any {
    return this.havingConditions
  }

  /**
   * Set sort options (used for cloning)
   */
  setSortOptions(options: Record<string, 1 | -1>): void {
    this.sortOptions = { ...options }
  }

  /**
   * Set limit value (used for cloning)
   */
  setLimitValue(limit?: number): void {
    this.limitValue = limit
  }

  /**
   * Set skip value (used for cloning)
   */
  setSkipValue(skip?: number): void {
    this.skipValue = skip
  }

  /**
   * Set select fields (used for cloning)
   */
  setSelectFields(fields?: Record<string, 0 | 1>): void {
    this.selectFields = fields ? { ...fields } : undefined
  }

  /**
   * Set distinct field (used for cloning)
   */
  setDistinctField(field?: string): void {
    this.distinctField = field
  }

  /**
   * Set group by fields (used for cloning)
   */
  setGroupByFields(fields: string[]): void {
    this.groupByFields = [...fields]
  }

  /**
   * Set having conditions (used for cloning)
   */
  setHavingConditions(conditions: any): void {
    this.havingConditions = { ...conditions }
  }

  /**
   * Add a distinct field
   */
  distinct(field: string): this {
    this.distinctField = field
    return this
  }

  /**
   * Add group by fields
   */
  groupBy(...fields: string[]): this {
    this.groupByFields.push(...fields)
    return this
  }

  /**
   * Add having condition
   */
  having(field: string, operatorOrValue: any, value?: any): this {
    if (value === undefined) {
      this.havingConditions[field] = operatorOrValue
    } else {
      this.havingConditions[field] = { [operatorOrValue]: value }
    }
    return this
  }

  /**
   * Add order by clause
   */
  orderBy(field: string, direction: SortDirection = 'asc'): this {
    this.sortOptions[field] = direction === 'asc' ? 1 : -1
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
   * Set skip
   */
  skip(count: number): this {
    this.skipValue = count
    return this
  }

  /**
   * Alias for skip
   */
  offset(count: number): this {
    return this.skip(count)
  }

  /**
   * Set pagination
   */
  forPage(page: number, perPage: number): this {
    this.skipValue = (page - 1) * perPage
    this.limitValue = perPage
    return this
  }

  /**
   * Set select fields
   */
  select(fields: string[] | Record<string, 0 | 1>): this {
    if (Array.isArray(fields)) {
      // Convert array to projection object
      this.selectFields = {}
      fields.forEach((field) => {
        this.selectFields![field] = 1
      })
    } else {
      this.selectFields = { ...fields }
    }
    return this
  }

  /**
   * Clone the query utilities
   */
  clone(): QueryUtilities {
    const cloned = new QueryUtilities()
    cloned.setSortOptions(this.sortOptions)
    cloned.setLimitValue(this.limitValue)
    cloned.setSkipValue(this.skipValue)
    cloned.setSelectFields(this.selectFields)
    cloned.setDistinctField(this.distinctField)
    cloned.setGroupByFields(this.groupByFields)
    cloned.setHavingConditions(this.havingConditions)
    return cloned
  }
}
