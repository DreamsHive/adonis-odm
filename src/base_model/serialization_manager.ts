import { DateTime } from 'luxon'
import { WithId, Document, Decimal128 } from 'mongodb'
import type { BaseModel } from './base_model.js'

/**
 * SerializationManager - Handles model serialization and deserialization
 *
 * This class encapsulates all the logic for converting models to/from
 * different formats like JSON, MongoDB documents, etc.
 */
export class SerializationManager {
  constructor(private model: BaseModel) {}

  /**
   * Convert model to MongoDB document format
   */
  toDocument(): Record<string, any> {
    const metadata = (this.model.constructor as typeof BaseModel).getMetadata()
    const document: Record<string, any> = {}

    // Get all column metadata
    for (const [key, columnOptions] of metadata.columns) {
      // Skip reference fields (virtual properties) and computed properties
      if (columnOptions.isReference || columnOptions.isComputed) {
        continue
      }

      const value = this.getAttributeValue(key)
      if (value !== undefined) {
        // Apply naming strategy to convert property name to database column name
        const dbColumnName = (this.model.constructor as typeof BaseModel).namingStrategy.columnName(
          this.model.constructor as typeof BaseModel,
          key
        )

        // Serialize the value for database storage
        const serializedValue = this.serializeValue(value, key)
        document[dbColumnName] = serializedValue
      }
    }

    // Handle _id field specially
    if (this.model._id !== undefined) {
      document._id = this.model._id
    }

    return document
  }

  /**
   * Convert model to JSON format
   */
  toJSON(): Record<string, unknown> {
    const metadata = (this.model.constructor as typeof BaseModel).getMetadata()
    const json: Record<string, unknown> = {}

    // Get all column metadata
    for (const [key] of metadata.columns) {
      const value = this.getAttributeValue(key)

      if (value !== undefined) {
        // Apply naming strategy to convert property name to JSON key
        const jsonKey = (this.model.constructor as typeof BaseModel).namingStrategy.serializedName(
          this.model.constructor as typeof BaseModel,
          key
        )

        // Serialize the value for JSON
        const serializedValue = this.serializeValueForJSON(value, key)
        json[jsonKey] = serializedValue
      }
    }

    // Handle _id field specially - convert to string for JSON
    if (this.model._id !== undefined) {
      json._id = this.model._id.toString()
    }

    return json
  }

  /**
   * Hydrate model from MongoDB document
   */
  hydrateFromDocument(document: WithId<Document>): void {
    const metadata = (this.model.constructor as typeof BaseModel).getMetadata()

    // Set the _id field
    if (document._id) {
      this.model._id = document._id
    }

    // Process each column
    for (const [key, columnOptions] of metadata.columns) {
      // Skip reference fields (virtual properties) and computed properties during hydration
      if (columnOptions.isReference || columnOptions.isComputed) {
        continue
      }

      // Apply naming strategy to get database column name
      const dbColumnName = (this.model.constructor as typeof BaseModel).namingStrategy.columnName(
        this.model.constructor as typeof BaseModel,
        key
      )

      const value = document[dbColumnName]
      if (value !== undefined) {
        let processedValue = value

        // Apply deserialize function if available
        if (columnOptions.deserialize) {
          processedValue = columnOptions.deserialize(value)
        }

        // Set the value using the private key for columns with metadata
        const privateKey = `_${key}`
        ;(this.model as any)[privateKey] = processedValue
      }
    }

    // Mark as persisted and not dirty
    this.model.$isPersisted = true
    this.model.$isLocal = false
    this.model.$dirty = {}

    // Sync original values
    this.syncOriginal()
  }

  /**
   * Get attribute value (similar to AttributeManager but for internal use)
   */
  private getAttributeValue(key: string): any {
    const metadata = (this.model.constructor as typeof BaseModel).getMetadata()
    const columnOptions = metadata.columns.get(key)

    // If this is a column with metadata (and not a reference), use the property getter
    if (columnOptions && !columnOptions.isReference) {
      return (this.model as any)[key]
    }

    // For properties without metadata or reference fields, access directly
    return (this.model as any)[key]
  }

  /**
   * Serialize value for MongoDB storage
   */
  private serializeValue(value: any, key: string): any {
    const metadata = (this.model.constructor as typeof BaseModel).getMetadata()
    const columnOptions = metadata.columns.get(key)

    // Apply serialize function if available
    if (columnOptions?.serialize) {
      return columnOptions.serialize(value)
    }

    // Handle DateTime objects
    if (value instanceof DateTime) {
      return value.toJSDate()
    }

    // Handle Date objects
    if (value instanceof Date) {
      return value
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.map((item) => this.serializeValue(item, key))
    }

    // Handle objects (but not null)
    if (value && typeof value === 'object') {
      // If it's a model instance, convert to document
      if (value.toDocument && typeof value.toDocument === 'function') {
        return value.toDocument()
      }

      // For plain objects, serialize recursively
      const serialized: any = {}
      for (const [objKey, objValue] of Object.entries(value)) {
        serialized[objKey] = this.serializeValue(objValue, key)
      }
      return serialized
    }

    return value
  }

  /**
   * Serialize value for JSON output
   */
  private serializeValueForJSON(value: any, key: string): any {
    const metadata = (this.model.constructor as typeof BaseModel).getMetadata()
    const columnOptions = metadata.columns.get(key)

    // Apply serialize function if available
    if (columnOptions?.serialize) {
      const serialized = columnOptions.serialize(value)
      // Further process the serialized value for JSON
      return this.processValueForJSON(serialized)
    }

    return this.processValueForJSON(value)
  }

  /**
   * Process value for JSON output
   */
  private processValueForJSON(value: any): any {
    // Handle DateTime objects
    if (value instanceof DateTime) {
      return value.toISO()
    }

    // Handle Date objects
    if (value instanceof Date) {
      return value.toISOString()
    }

    // Handle MongoDB Decimal128 objects
    if (value instanceof Decimal128) {
      return Number.parseFloat(value.toString())
    }

    // Handle MongoDB decimal objects (BSON format)
    if (value && typeof value === 'object' && value.$numberDecimal) {
      return Number.parseFloat(value.$numberDecimal)
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.map((item) => this.processValueForJSON(item))
    }

    // Handle objects (but not null)
    if (value && typeof value === 'object') {
      // If it's a model instance, convert to JSON
      if (value.toJSON && typeof value.toJSON === 'function') {
        return value.toJSON()
      }

      // For plain objects, process recursively
      const processed: any = {}
      for (const [objKey, objValue] of Object.entries(value)) {
        processed[objKey] = this.processValueForJSON(objValue)
      }
      return processed
    }

    return value
  }

  /**
   * Sync original values with current values
   */
  private syncOriginal(): void {
    this.model.$original = {}
    const metadata = (this.model.constructor as typeof BaseModel).getMetadata()

    for (const [key] of metadata.columns) {
      const value = this.getAttributeValue(key)
      if (value !== undefined) {
        this.model.$original[key] = value
      }
    }
  }
}
