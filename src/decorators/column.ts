import { DateTime } from 'luxon'
import { ColumnOptions, DateColumnOptions, ModelMetadata } from '../types/index.js'

/**
 * Symbol to store model metadata
 */
export const MODEL_METADATA = Symbol('MODEL_METADATA')

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
 * Column decorator for basic fields
 */
export function column(options: ColumnOptions = {}) {
  return function (target: any, propertyKey: string) {
    const metadata = getMetadata(target)
    metadata.columns.set(propertyKey, options)

    if (options.isPrimary) {
      metadata.primaryKey = propertyKey
    }
  }
}

/**
 * Embedded document decorator
 */
column.embedded = function (options: ColumnOptions = {}) {
  return function (target: any, propertyKey: string) {
    const metadata = getMetadata(target)
    metadata.columns.set(propertyKey, { ...options, isEmbedded: true })
  }
}

/**
 * Reference decorator for document references
 */
column.reference = function (
  options: ColumnOptions & { model?: string; localKey?: string; foreignKey?: string } = {}
) {
  return function (target: any, propertyKey: string) {
    const metadata = getMetadata(target)
    metadata.columns.set(propertyKey, {
      ...options,
      isReference: true,
      localKey: options.localKey || propertyKey + 'Id',
      foreignKey: options.foreignKey || '_id',
    })
  }
}

/**
 * Date column decorator with auto-create and auto-update functionality
 */
column.date = function (
  options: Omit<DateColumnOptions, 'serialize' | 'deserialize'> & {
    serialize?: (value: DateTime) => any
  } = {}
) {
  const dateOptions: DateColumnOptions = {
    ...options,
    serialize: (value: DateTime | Date | string) => {
      if (!value) return value

      if (value instanceof DateTime) {
        return options.serialize ? options.serialize(value) : value.toJSDate()
      }

      if (value instanceof Date) {
        return value
      }

      if (typeof value === 'string') {
        return DateTime.fromISO(value).toJSDate()
      }

      return value
    },
    deserialize: (value: Date | string) => {
      if (!value) return value

      if (value instanceof Date) {
        return DateTime.fromJSDate(value)
      }

      if (typeof value === 'string') {
        return DateTime.fromISO(value)
      }

      return value
    },
  }

  return function (target: any, propertyKey: string) {
    const metadata = getMetadata(target)
    metadata.columns.set(propertyKey, dateOptions)

    if (dateOptions.isPrimary) {
      metadata.primaryKey = propertyKey
    }
  }
}

/**
 * DateTime column decorator with auto-create and auto-update functionality
 */
column.dateTime = function (options: Omit<DateColumnOptions, 'serialize' | 'deserialize'> = {}) {
  return column.date(options)
}
