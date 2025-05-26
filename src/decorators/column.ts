import { DateTime } from 'luxon'
import type { ColumnOptions, DateColumnOptions, ModelMetadata } from '../types/index.js'
import {
  createHasOneProxy,
  createHasManyProxy,
  createBelongsToProxy,
} from '../relationships/relationship_proxies.js'
import { MODEL_METADATA } from '../base_model/base_model.js'

/**
 * Get or create metadata for a model
 */
function getMetadata(target: any): ModelMetadata {
  if (!target.constructor[MODEL_METADATA]) {
    target.constructor[MODEL_METADATA] = {
      columns: new Map(),
      primaryKey: undefined,
      tableName: undefined,
    }
  }
  return target.constructor[MODEL_METADATA]
}

/**
 * Base column decorator
 */
export function column(options: ColumnOptions = {}) {
  return function (target: any, propertyKey: string) {
    const metadata = getMetadata(target)
    metadata.columns.set(propertyKey, options)

    if (options.isPrimary) {
      metadata.primaryKey = propertyKey
    }

    // Create property descriptor to track changes
    const privateKey = `_${propertyKey}`
    Object.defineProperty(target, propertyKey, {
      get: function () {
        return this[privateKey]
      },
      set: function (value: any) {
        const oldValue = this[privateKey]

        // Apply deserialization if needed
        if (options.deserialize) {
          value = options.deserialize(value)
        }

        this[privateKey] = value

        // Track dirty attributes if the model is persisted and value changed
        if (this.$isPersisted && oldValue !== value) {
          this.$dirty[propertyKey] = value
        }
      },
      configurable: true,
      enumerable: true,
    })
  }
}

/**
 * Date column decorator
 */
column.date = function (options: DateColumnOptions = {}) {
  return function (target: any, propertyKey: string) {
    const metadata = getMetadata(target)
    const columnOptions: ColumnOptions = {
      ...options,
      serialize: options.serialize || ((value: DateTime) => value?.toJSDate()),
      deserialize:
        options.deserialize || ((value: Date) => (value ? DateTime.fromJSDate(value) : value)),
    }
    metadata.columns.set(propertyKey, columnOptions)

    if (options.isPrimary) {
      metadata.primaryKey = propertyKey
    }

    // Create property descriptor to track changes
    const privateKey = `_${propertyKey}`
    Object.defineProperty(target, propertyKey, {
      get: function () {
        return this[privateKey]
      },
      set: function (value: any) {
        const oldValue = this[privateKey]

        // Apply deserialization if needed
        if (columnOptions.deserialize) {
          value = columnOptions.deserialize(value)
        }

        this[privateKey] = value

        // Track dirty attributes if the model is persisted and value changed
        if (this.$isPersisted && oldValue !== value) {
          this.$dirty[propertyKey] = value
        }
      },
      configurable: true,
      enumerable: true,
    })
  }
}

/**
 * DateTime column decorator
 */
column.dateTime = function (options: DateColumnOptions = {}) {
  return function (target: any, propertyKey: string) {
    const metadata = getMetadata(target)
    const columnOptions: ColumnOptions = {
      ...options,
      serialize: options.serialize || ((value: DateTime) => value?.toJSDate()),
      deserialize:
        options.deserialize ||
        ((value: any) => {
          // If it's already a DateTime, return as-is
          if (value && typeof value === 'object' && value.constructor.name === 'DateTime') {
            return value
          }
          // If it's a Date, convert to DateTime
          if (value instanceof Date) {
            return DateTime.fromJSDate(value)
          }
          // Otherwise return as-is (including null/undefined)
          return value
        }),
    }
    metadata.columns.set(propertyKey, columnOptions)

    if (options.isPrimary) {
      metadata.primaryKey = propertyKey
    }

    // Create property descriptor to track changes
    const privateKey = `_${propertyKey}`
    Object.defineProperty(target, propertyKey, {
      get: function () {
        return this[privateKey]
      },
      set: function (value: any) {
        const oldValue = this[privateKey]

        // Apply deserialization if needed
        if (columnOptions.deserialize) {
          value = columnOptions.deserialize(value)
        }

        this[privateKey] = value

        // Track dirty attributes if the model is persisted and value changed
        if (this.$isPersisted && oldValue !== value) {
          this.$dirty[propertyKey] = value
        }
      },
      configurable: true,
      enumerable: true,
    })
  }
}

/**
 * Embedded document decorator
 */
column.embedded = function (options: ColumnOptions = {}) {
  return function (target: any, propertyKey: string) {
    const metadata = getMetadata(target)
    const columnOptions: ColumnOptions = {
      ...options,
      isEmbedded: true,
    }
    metadata.columns.set(propertyKey, columnOptions)

    // Create property descriptor to track changes
    const privateKey = `_${propertyKey}`
    Object.defineProperty(target, propertyKey, {
      get: function () {
        return this[privateKey]
      },
      set: function (value: any) {
        const oldValue = this[privateKey]

        // Apply deserialization if needed
        if (columnOptions.deserialize) {
          value = columnOptions.deserialize(value)
        }

        this[privateKey] = value

        // Track dirty attributes if the model is persisted and value changed
        if (this.$isPersisted && oldValue !== value) {
          this.$dirty[propertyKey] = value
        }
      },
      configurable: true,
      enumerable: true,
    })
  }
}

/**
 * Lucid-style relationship decorators
 */

/**
 * HasOne relationship decorator
 * Similar to Lucid's @hasOne decorator
 */
export function hasOne(
  relatedModel: () => typeof import('../base_model/base_model.js').BaseModel,
  options: {
    localKey?: string
    foreignKey?: string
  } = {}
) {
  return function (target: any, propertyKey: string) {
    const metadata = getMetadata(target)

    // Get the related model
    const RelatedModel = relatedModel()
    const relatedMetadata = RelatedModel.getMetadata()

    const columnOptions: ColumnOptions = {
      isReference: true,
      model: RelatedModel.name,
      localKey: options.localKey || metadata.primaryKey || 'id', // Default to this model's primary key
      foreignKey: options.foreignKey || `${target.constructor.name.toLowerCase()}Id`, // Default foreign key
    }

    metadata.columns.set(propertyKey, columnOptions)

    // Create a property descriptor that initializes the relationship proxy
    Object.defineProperty(target, propertyKey, {
      get: function () {
        // Check if the proxy is already initialized
        const proxyKey = `_${propertyKey}_proxy`
        if (!this[proxyKey]) {
          this[proxyKey] = createHasOneProxy(
            this,
            propertyKey,
            RelatedModel,
            columnOptions.localKey!,
            columnOptions.foreignKey!
          )
        }
        return this[proxyKey]
      },
      configurable: true,
      enumerable: true,
    })
  }
}

/**
 * HasMany relationship decorator
 * Similar to Lucid's @hasMany decorator
 */
export function hasMany(
  relatedModel: () => typeof import('../base_model/base_model.js').BaseModel,
  options: {
    localKey?: string
    foreignKey?: string
  } = {}
) {
  return function (target: any, propertyKey: string) {
    const metadata = getMetadata(target)

    // Get the related model
    const RelatedModel = relatedModel()

    const columnOptions: ColumnOptions = {
      isReference: true,
      model: RelatedModel.name,
      localKey: options.localKey || metadata.primaryKey || 'id', // Default to this model's primary key
      foreignKey: options.foreignKey || `${target.constructor.name.toLowerCase()}Id`, // Default foreign key
      isArray: true, // Indicates this is a one-to-many relationship
    }

    metadata.columns.set(propertyKey, columnOptions)

    // Create a property descriptor that initializes the relationship proxy
    Object.defineProperty(target, propertyKey, {
      get: function () {
        // Check if the proxy is already initialized
        const proxyKey = `_${propertyKey}_proxy`
        if (!this[proxyKey]) {
          this[proxyKey] = createHasManyProxy(
            this,
            propertyKey,
            RelatedModel,
            columnOptions.localKey!,
            columnOptions.foreignKey!
          )
        }
        return this[proxyKey]
      },
      configurable: true,
      enumerable: true,
    })
  }
}

/**
 * BelongsTo relationship decorator
 * Similar to Lucid's @belongsTo decorator
 */
export function belongsTo(
  relatedModel: () => typeof import('../base_model/base_model.js').BaseModel,
  options: {
    localKey?: string
    foreignKey?: string
  } = {}
) {
  return function (target: any, propertyKey: string) {
    const metadata = getMetadata(target)

    // Get the related model
    const RelatedModel = relatedModel()
    const relatedMetadata = RelatedModel.getMetadata()

    const columnOptions: ColumnOptions = {
      isReference: true,
      model: RelatedModel.name,
      localKey: options.localKey || `${RelatedModel.name.toLowerCase()}Id`, // Foreign key on this model
      foreignKey: options.foreignKey || relatedMetadata.primaryKey || 'id', // Primary key on related model
      isBelongsTo: true, // Indicates this is a belongs-to relationship
    }

    metadata.columns.set(propertyKey, columnOptions)

    // Create a property descriptor that initializes the relationship proxy
    Object.defineProperty(target, propertyKey, {
      get: function () {
        // Check if the proxy is already initialized
        const proxyKey = `_${propertyKey}_proxy`
        if (!this[proxyKey]) {
          this[proxyKey] = createBelongsToProxy(
            this,
            propertyKey,
            RelatedModel,
            columnOptions.localKey!,
            columnOptions.foreignKey!
          )
        }
        return this[proxyKey]
      },
      configurable: true,
      enumerable: true,
    })
  }
}
