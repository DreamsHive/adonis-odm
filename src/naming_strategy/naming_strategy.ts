/**
 * Naming strategy interface following AdonisJS Lucid conventions
 */
export interface NamingStrategyContract {
  /**
   * Convert property name to database column name
   */
  columnName(model: any, propertyName: string): string

  /**
   * Convert property name to serialized name for JSON output
   */
  serializedName(model: any, propertyName: string): string

  /**
   * Convert model name to collection/table name
   */
  tableName(model: any): string

  /**
   * Generate foreign key name for relationships
   */
  relationForeignKey(relation: string, model: any, relatedModel: any): string

  /**
   * Generate local key name for relationships
   */
  relationLocalKey(relation: string, model: any, relatedModel: any): string

  /**
   * Generate pivot table name for many-to-many relationships
   */
  relationPivotTable(relation: 'manyToMany', model: any, relatedModel: any): string

  /**
   * Generate pivot foreign key name for many-to-many relationships
   */
  relationPivotForeignKey(relation: 'manyToMany', model: any): string

  /**
   * Generate pagination meta keys
   */
  paginationMetaKeys(): Record<string, string>
}

/**
 * String helper functions for naming conversions
 */
export class StringHelper {
  /**
   * Convert camelCase to snake_case
   */
  static snakeCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '')
  }

  /**
   * Convert snake_case to camelCase
   */
  static camelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
  }

  /**
   * Convert string to singular form (basic implementation)
   */
  static singular(str: string): string {
    if (str.endsWith('ies')) {
      return str.slice(0, -3) + 'y'
    } else if (str.endsWith('es')) {
      return str.slice(0, -2)
    } else if (str.endsWith('s')) {
      return str.slice(0, -1)
    }
    return str
  }

  /**
   * Convert string to plural form (basic implementation)
   */
  static plural(str: string): string {
    if (str.endsWith('y')) {
      return str.slice(0, -1) + 'ies'
    } else if (
      str.endsWith('s') ||
      str.endsWith('sh') ||
      str.endsWith('ch') ||
      str.endsWith('x') ||
      str.endsWith('z')
    ) {
      return str + 'es'
    } else {
      return str + 's'
    }
  }
}

/**
 * Default naming strategy following AdonisJS Lucid conventions
 * This strategy converts camelCase properties to snake_case for serialization
 */
export class CamelCaseNamingStrategy implements NamingStrategyContract {
  /**
   * Convert property name to database column name
   * By default, converts camelCase to snake_case
   */
  columnName(model: any, propertyName: string): string {
    return StringHelper.snakeCase(propertyName)
  }

  /**
   * Convert property name to serialized name for JSON output
   * By default, converts camelCase to snake_case
   */
  serializedName(model: any, propertyName: string): string {
    return StringHelper.snakeCase(propertyName)
  }

  /**
   * Convert model name to collection/table name
   * Converts to singular snake_case
   */
  tableName(model: any): string {
    const modelName = model.name || model.constructor.name
    return StringHelper.singular(StringHelper.snakeCase(modelName))
  }

  /**
   * Generate foreign key name for relationships
   */
  relationForeignKey(relation: string, model: any, relatedModel: any): string {
    if (relation === 'belongsTo') {
      const modelName = relatedModel.name || relatedModel.constructor.name
      const primaryKey = relatedModel.primaryKey || '_id'
      return StringHelper.camelCase(`${modelName}_${primaryKey}`)
    }

    const modelName = model.name || model.constructor.name
    const primaryKey = model.primaryKey || '_id'
    return StringHelper.camelCase(`${modelName}_${primaryKey}`)
  }

  /**
   * Generate local key name for relationships
   */
  relationLocalKey(relation: string, model: any, relatedModel: any): string {
    if (relation === 'belongsTo') {
      return relatedModel.primaryKey || '_id'
    }

    return model.primaryKey || '_id'
  }

  /**
   * Generate pivot table name for many-to-many relationships
   */
  relationPivotTable(relation: 'manyToMany', model: any, relatedModel: any): string {
    const modelName = model.name || model.constructor.name
    const relatedModelName = relatedModel.name || relatedModel.constructor.name

    return StringHelper.snakeCase([relatedModelName, modelName].sort().join('_'))
  }

  /**
   * Generate pivot foreign key name for many-to-many relationships
   */
  relationPivotForeignKey(relation: 'manyToMany', model: any): string {
    const modelName = model.name || model.constructor.name
    const primaryKey = model.primaryKey || '_id'
    return StringHelper.snakeCase(`${modelName}_${primaryKey}`)
  }

  /**
   * Generate pagination meta keys
   */
  paginationMetaKeys(): Record<string, string> {
    return {
      total: 'total',
      perPage: 'per_page',
      currentPage: 'current_page',
      lastPage: 'last_page',
      firstPage: 'first_page',
      firstPageUrl: 'first_page_url',
      lastPageUrl: 'last_page_url',
      nextPageUrl: 'next_page_url',
      previousPageUrl: 'previous_page_url',
    }
  }
}

/**
 * Snake case naming strategy that keeps everything in snake_case
 */
export class SnakeCaseNamingStrategy implements NamingStrategyContract {
  /**
   * Convert property name to database column name
   * Keeps snake_case as-is
   */
  columnName(model: any, propertyName: string): string {
    return StringHelper.snakeCase(propertyName)
  }

  /**
   * Convert property name to serialized name for JSON output
   * Keeps snake_case as-is
   */
  serializedName(model: any, propertyName: string): string {
    return StringHelper.snakeCase(propertyName)
  }

  /**
   * Convert model name to collection/table name
   */
  tableName(model: any): string {
    const modelName = model.name || model.constructor.name
    return StringHelper.plural(StringHelper.snakeCase(modelName))
  }

  /**
   * Generate foreign key name for relationships
   */
  relationForeignKey(relation: string, model: any, relatedModel: any): string {
    if (relation === 'belongsTo') {
      const modelName = relatedModel.name || relatedModel.constructor.name
      const primaryKey = relatedModel.primaryKey || '_id'
      return StringHelper.snakeCase(`${modelName}_${primaryKey}`)
    }

    const modelName = model.name || model.constructor.name
    const primaryKey = model.primaryKey || '_id'
    return StringHelper.snakeCase(`${modelName}_${primaryKey}`)
  }

  /**
   * Generate local key name for relationships
   */
  relationLocalKey(relation: string, model: any, relatedModel: any): string {
    if (relation === 'belongsTo') {
      return relatedModel.primaryKey || '_id'
    }

    return model.primaryKey || '_id'
  }

  /**
   * Generate pivot table name for many-to-many relationships
   */
  relationPivotTable(relation: 'manyToMany', model: any, relatedModel: any): string {
    const modelName = model.name || model.constructor.name
    const relatedModelName = relatedModel.name || relatedModel.constructor.name

    return StringHelper.snakeCase([relatedModelName, modelName].sort().join('_'))
  }

  /**
   * Generate pivot foreign key name for many-to-many relationships
   */
  relationPivotForeignKey(relation: 'manyToMany', model: any): string {
    const modelName = model.name || model.constructor.name
    const primaryKey = model.primaryKey || '_id'
    return StringHelper.snakeCase(`${modelName}_${primaryKey}`)
  }

  /**
   * Generate pagination meta keys
   */
  paginationMetaKeys(): Record<string, string> {
    return {
      total: 'total',
      perPage: 'per_page',
      currentPage: 'current_page',
      lastPage: 'last_page',
      firstPage: 'first_page',
      firstPageUrl: 'first_page_url',
      lastPageUrl: 'last_page_url',
      nextPageUrl: 'next_page_url',
      previousPageUrl: 'previous_page_url',
    }
  }
}
