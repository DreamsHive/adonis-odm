import { DateTime } from 'luxon'
import type { ColumnOptions, DateColumnOptions, ModelMetadata } from '../types/index.js'
import {
  createHasOneProxy,
  createHasManyProxy,
  createBelongsToProxy,
} from '../relationships/relationship_proxies.js'
import { MODEL_METADATA } from '../base_model/base_model.js'

// Export hook decorators
export {
  beforeSave,
  afterSave,
  beforeCreate,
  afterCreate,
  beforeUpdate,
  afterUpdate,
  beforeDelete,
  afterDelete,
  beforeFind,
  afterFind,
  beforeFetch,
  afterFetch,
} from './hooks.js'

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

        // Track dirty attributes if value changed
        if (oldValue !== value) {
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
      serialize:
        options.serialize ||
        ((value: DateTime) => {
          if (value && typeof value === 'object' && value.constructor.name === 'DateTime') {
            return value.toJSDate()
          }
          return value
        }),
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

        // Track dirty attributes if value changed
        if (oldValue !== value) {
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
      serialize:
        options.serialize ||
        ((value: DateTime) => {
          if (value && typeof value === 'object' && value.constructor.name === 'DateTime') {
            return value.toJSDate()
          }
          return value
        }),
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

        // Track dirty attributes if value changed
        if (oldValue !== value) {
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

        // Track dirty attributes if value changed
        if (oldValue !== value) {
          this.$dirty[propertyKey] = value
        }
      },
      configurable: true,
      enumerable: true,
    })
  }
}

/**
 * Brand type to mark computed properties at the type level
 */
declare const ComputedBrand: unique symbol
export type ComputedProperty<T = any> = T & { readonly [ComputedBrand]: true }

/**
 * Computed property decorator - marks properties as computed (getter-only)
 * Similar to AdonisJS Lucid's @computed decorator
 * These properties are excluded from create/update operations but included in serialization
 */
export function computed(options: { serializeAs?: string | null } = {}) {
  return function (target: any, propertyKey: string, descriptor?: PropertyDescriptor) {
    const metadata = getMetadata(target)
    const columnOptions: ColumnOptions = {
      isComputed: true,
      serializeAs: options.serializeAs,
    }
    metadata.columns.set(propertyKey, columnOptions)

    // Enhance the descriptor to brand the return type for TypeScript
    if (descriptor && descriptor.get) {
      const originalGetter = descriptor.get
      descriptor.get = function (this: any) {
        const result = originalGetter.call(this)
        // Brand the result as ComputedProperty for TypeScript type checking
        return result as ComputedProperty
      }
      return descriptor
    }

    return descriptor
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

    // Defer model resolution to avoid circular dependency issues
    const columnOptions: ColumnOptions = {
      isReference: true,
      model: 'deferred', // Will be resolved later
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
          // Resolve the model lazily when first accessed
          const RelatedModel = relatedModel()

          // Update the column options with the actual model name
          columnOptions.model = RelatedModel.name

          this[proxyKey] = createHasOneProxy(relatedModel, {
            localKey: columnOptions.localKey!,
            foreignKey: columnOptions.foreignKey!,
          })
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

    // Defer model resolution to avoid circular dependency issues
    const columnOptions: ColumnOptions = {
      isReference: true,
      model: 'deferred', // Will be resolved later
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
          // Resolve the model lazily when first accessed
          const RelatedModel = relatedModel()

          // Update the column options with the actual model name
          columnOptions.model = RelatedModel.name

          this[proxyKey] = createHasManyProxy(relatedModel, {
            localKey: columnOptions.localKey!,
            foreignKey: columnOptions.foreignKey!,
          })
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

    // Defer model resolution to avoid circular dependency issues
    const columnOptions: ColumnOptions = {
      isReference: true,
      model: 'deferred', // Will be resolved later
      localKey: options.localKey, // Will be set later when model is resolved
      foreignKey: options.foreignKey, // Will be set later when model is resolved
      isBelongsTo: true, // Indicates this is a belongs-to relationship
    }

    metadata.columns.set(propertyKey, columnOptions)

    // Create a property descriptor that initializes the relationship proxy
    Object.defineProperty(target, propertyKey, {
      get: function () {
        // Check if the proxy is already initialized
        const proxyKey = `_${propertyKey}_proxy`
        if (!this[proxyKey]) {
          // Resolve the model lazily when first accessed
          const RelatedModel = relatedModel()
          const relatedMetadata = RelatedModel.getMetadata()

          // Update the column options with the actual model info
          columnOptions.model = RelatedModel.name
          columnOptions.localKey = columnOptions.localKey || `${RelatedModel.name.toLowerCase()}Id`
          columnOptions.foreignKey = columnOptions.foreignKey || relatedMetadata.primaryKey || 'id'

          this[proxyKey] = createBelongsToProxy(relatedModel, {
            localKey: columnOptions.localKey!,
            foreignKey: columnOptions.foreignKey!,
          })
        }
        return this[proxyKey]
      },
      configurable: true,
      enumerable: true,
    })
  }
}
