import type { BaseModel } from './base_model.js'

/**
 * AttributeManager - Handles attribute getting, setting, and management
 *
 * This class encapsulates all the logic for managing model attributes,
 * including getting, setting, filling, and merging attributes.
 */
export class AttributeManager {
  constructor(private model: BaseModel) {}

  /**
   * Fill model with attributes
   */
  fill(attributes: Record<string, any>): BaseModel {
    for (const [key, value] of Object.entries(attributes)) {
      const metadata = (this.model.constructor as typeof BaseModel).getMetadata()
      const columnOptions = metadata.columns.get(key)

      // Skip reference fields (virtual properties) and computed properties
      if (columnOptions?.isReference || columnOptions?.isComputed) {
        continue
      }

      let processedValue = value
      if (columnOptions?.deserialize) {
        processedValue = columnOptions.deserialize(value)
      }

      // If this is a column with a property descriptor, use the private key
      if (columnOptions && !columnOptions.isReference && !columnOptions.isComputed) {
        const privateKey = `_${key}`
        ;(this.model as any)[privateKey] = processedValue
      } else {
        ;(this.model as any)[key] = processedValue
      }
    }
    return this.model
  }

  /**
   * Merge new attributes into the model
   */
  merge(attributes: Record<string, any>): BaseModel {
    for (const [key, value] of Object.entries(attributes)) {
      const metadata = (this.model.constructor as typeof BaseModel).getMetadata()
      const columnOptions = metadata.columns.get(key)

      // Skip reference fields (virtual properties) and computed properties
      if (columnOptions?.isReference || columnOptions?.isComputed) {
        continue
      }

      if (this.getAttribute(key) !== value) {
        this.setAttribute(key, value)
        // setAttribute already handles dirty tracking, but we need to ensure it's set
        if (this.model.$isPersisted) {
          this.model.$dirty[key] = value
        }
      }
    }
    return this.model
  }

  /**
   * Get an attribute value
   */
  getAttribute(key: string): any {
    const metadata = (this.model.constructor as typeof BaseModel).getMetadata()
    const columnOptions = metadata.columns.get(key)

    // If this is a column with metadata (and not a reference), use the property getter
    // which will access the private key through the property descriptor
    if (columnOptions && !columnOptions.isReference) {
      return (this.model as any)[key]
    }

    // For properties without metadata or reference fields, access directly
    return (this.model as any)[key]
  }

  /**
   * Set an attribute value
   */
  setAttribute(key: string, value: any): void {
    const metadata = (this.model.constructor as typeof BaseModel).getMetadata()
    const columnOptions = metadata.columns.get(key)

    // Skip setting reference fields (virtual properties) and computed properties - they have getters only
    if (columnOptions?.isReference || columnOptions?.isComputed) {
      return
    }

    if (columnOptions?.deserialize) {
      value = columnOptions.deserialize(value)
    }

    // If this is a column with a property descriptor, use the private key
    if (columnOptions) {
      const privateKey = `_${key}`
      const oldValue = (this.model as any)[privateKey]
      ;(this.model as any)[privateKey] = value

      // Track dirty attributes if the model is persisted and value changed
      if (this.model.$isPersisted && oldValue !== value) {
        this.model.$dirty[key] = value
      }
    } else {
      // For properties without column metadata, check if it's a getter-only property
      const descriptor =
        Object.getOwnPropertyDescriptor(this.model, key) ||
        Object.getOwnPropertyDescriptor(Object.getPrototypeOf(this.model), key)

      if (descriptor && descriptor.get && !descriptor.set) {
        // This is a getter-only property, skip setting it
        return
      }

      // Set directly for properties without metadata
      const oldValue = (this.model as any)[key]
      ;(this.model as any)[key] = value

      // Track dirty attributes if the model is persisted and value changed
      if (this.model.$isPersisted && oldValue !== value) {
        this.model.$dirty[key] = value
      }
    }
  }

  /**
   * Get dirty attributes
   */
  getDirtyAttributes(): Record<string, any> {
    return { ...this.model.$dirty }
  }

  /**
   * Sync original values with current values
   */
  syncOriginal(): void {
    this.model.$original = { ...this.model.toDocument() }
    this.model.$dirty = {}
  }
}
