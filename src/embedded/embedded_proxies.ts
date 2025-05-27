import type { BaseModel } from '../base_model/base_model.js'
import { EmbeddedQueryBuilder } from './embedded_query_builder.js'
import { EmbeddedModelInstance } from './embedded_model_instance.js'

/**
 * Proxy for single embedded documents with full CRUD capabilities
 * Returns an EmbeddedModelInstance that behaves exactly like a regular model
 */
export class EmbeddedSingleProxy<T extends typeof BaseModel> {
  private _value: any = null
  private _parent: BaseModel
  private _fieldName: string
  private _modelClass: T

  constructor(parent: BaseModel, fieldName: string, modelClass: T, initialValue?: any) {
    this._parent = parent
    this._fieldName = fieldName
    this._modelClass = modelClass

    if (initialValue) {
      this.setValue(initialValue)
    }
  }

  /**
   * Set the embedded value
   */
  setValue(value: any): void {
    if (value === null || value === undefined) {
      this._value = null
    } else {
      // Create an EmbeddedModelInstance that behaves like a full model
      this._value = new EmbeddedModelInstance(
        this._modelClass,
        this._parent,
        this._fieldName,
        value,
        false // not an array item
      )
    }
    this.markParentDirty()
  }

  /**
   * Get the embedded value
   */
  getValue(): any {
    return this._value
  }

  /**
   * Create a new embedded instance
   */
  create(attributes: Partial<InstanceType<T>>): any {
    const instance = new EmbeddedModelInstance(
      this._modelClass,
      this._parent,
      this._fieldName,
      attributes,
      false // not an array item
    )
    this._value = instance
    this.markParentDirty()
    return instance
  }

  /**
   * Clear the embedded value
   */
  clear(): void {
    this._value = null
    this.markParentDirty()
  }

  /**
   * Mark parent model as dirty
   */
  private markParentDirty(): void {
    this._parent.setAttribute(this._fieldName, this._value)
  }

  /**
   * Serialize for database storage
   */
  toDocument(): any {
    if (!this._value) return null
    return this._value.toDocument ? this._value.toDocument() : this._value
  }
}

/**
 * Proxy for multiple embedded documents with full CRUD capabilities
 * Returns an array where each item is an EmbeddedModelInstance
 */
export class EmbeddedManyProxy<T extends typeof BaseModel> extends Array {
  private _parent: BaseModel
  private _fieldName: string
  private _modelClass: T

  constructor(parent: BaseModel, fieldName: string, modelClass: T, initialValue?: any[]) {
    super()

    this._parent = parent
    this._fieldName = fieldName
    this._modelClass = modelClass

    // Set up the prototype chain properly - this is crucial for maintaining methods
    Object.setPrototypeOf(this, EmbeddedManyProxy.prototype)

    // Ensure the constructor property is correct
    Object.defineProperty(this, 'constructor', {
      value: EmbeddedManyProxy,
      writable: true,
      configurable: true,
    })

    if (initialValue && Array.isArray(initialValue)) {
      this.setItems(initialValue)
    }
  }

  /**
   * Set the items array
   */
  setItems(items: any[]): void {
    // Clear existing items
    this.length = 0

    // Add new items as EmbeddedModelInstances
    items.forEach((item, index) => {
      const embeddedInstance = new EmbeddedModelInstance(
        this._modelClass,
        this._parent,
        this._fieldName,
        item,
        true, // is array item
        index
      )
      // Use Array.prototype.push to avoid triggering our overridden push
      Array.prototype.push.call(this, embeddedInstance)
    })

    // Ensure prototype chain is maintained after modifications
    Object.setPrototypeOf(this, EmbeddedManyProxy.prototype)

    this.markParentDirty()
  }

  /**
   * Query the embedded documents
   */
  query(): EmbeddedQueryBuilder<T> {
    return new EmbeddedQueryBuilder(Array.from(this))
  }

  /**
   * Create a new embedded document
   */
  create(attributes: Partial<InstanceType<T>>): any {
    const instance = new EmbeddedModelInstance(
      this._modelClass,
      this._parent,
      this._fieldName,
      attributes,
      true, // is array item
      this.length
    )
    this.push(instance)
    this.markParentDirty()
    return instance
  }

  /**
   * Create multiple embedded documents
   */
  createMany(attributesArray: Partial<InstanceType<T>>[]): any[] {
    const instances = attributesArray.map((attributes, index) => {
      return new EmbeddedModelInstance(
        this._modelClass,
        this._parent,
        this._fieldName,
        attributes,
        true, // is array item
        this.length + index
      )
    })
    this.push(...instances)
    this.markParentDirty()
    return instances
  }

  /**
   * Remove an embedded document
   */
  remove(item: any): boolean {
    const index = this.indexOf(item)
    if (index > -1) {
      this.splice(index, 1)
      this.updateArrayIndices()
      this.markParentDirty()
      return true
    }
    return false
  }

  /**
   * Remove embedded documents by condition
   */
  removeWhere(callback: (item: any) => boolean): number {
    const initialLength = this.length

    // Filter out items that match the condition
    for (let i = this.length - 1; i >= 0; i--) {
      if (callback(this[i])) {
        this.splice(i, 1)
      }
    }

    const removedCount = initialLength - this.length

    if (removedCount > 0) {
      this.updateArrayIndices()
      this.markParentDirty()
    }

    return removedCount
  }

  /**
   * Override push to maintain array indices
   */
  push(...items: any[]): number {
    const result = super.push(...items)
    this.updateArrayIndices()
    this.markParentDirty()
    return result
  }

  /**
   * Override pop to maintain array indices
   */
  pop(): any {
    const result = super.pop()
    this.updateArrayIndices()
    this.markParentDirty()
    return result
  }

  /**
   * Override splice to maintain array indices
   */
  splice(start: number, deleteCount?: number, ...items: any[]): any[] {
    const result = super.splice(start, deleteCount ?? 0, ...items)
    this.updateArrayIndices()
    this.markParentDirty()
    return result
  }

  /**
   * Update array indices for all items
   */
  private updateArrayIndices(): void {
    for (let i = 0; i < this.length; i++) {
      if (this[i] && typeof this[i] === 'object' && '_arrayIndex' in this[i]) {
        ;(this[i] as any)._arrayIndex = i
      }
    }
  }

  /**
   * Mark parent model as dirty
   */
  private markParentDirty(): void {
    // Don't call setAttribute as it might interfere with the proxy
    // Instead, directly mark the field as dirty if the parent is persisted
    if (this._parent.$isPersisted) {
      this._parent.$dirty[this._fieldName] = this
    }
  }

  /**
   * Serialize for database storage
   */
  toDocument(): any[] {
    return this.map((item) => (item && item.toDocument ? item.toDocument() : item))
  }
}
