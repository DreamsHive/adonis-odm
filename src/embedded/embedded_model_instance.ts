import type { BaseModel } from '../base_model/base_model.js'

/**
 * Enhanced embedded model instance that behaves like a full model
 * Provides CRUD operations that automatically sync with the parent document
 */
export class EmbeddedModelInstance<T extends typeof BaseModel> {
  private _modelClass: T
  private _parent: BaseModel
  private _fieldName: string
  private _isArrayItem: boolean
  private _arrayIndex?: number
  private _instance: InstanceType<T>

  constructor(
    modelClass: T,
    parent: BaseModel,
    fieldName: string,
    data: any,
    isArrayItem: boolean = false,
    arrayIndex?: number
  ) {
    this._modelClass = modelClass
    this._parent = parent
    this._fieldName = fieldName
    this._isArrayItem = isArrayItem
    this._arrayIndex = arrayIndex

    // Create the actual model instance and hydrate it properly with naming strategy
    this._instance = new modelClass() as InstanceType<T>
    if (data) {
      this._instance.hydrateFromDocument(data)
    }

    // Override the instance's save method to prevent it from trying to save itself
    // This is crucial for embedded documents that don't have their own _id
    this._instance.save = async () => {
      console.log('⚠️ Embedded instance save() called - redirecting to parent save')
      return this.save()
    }

    // Create a proxy that forwards all operations to the instance
    // but intercepts save/delete operations
    return new Proxy(this._instance, {
      get: (target, prop, receiver) => {
        // Intercept CRUD operations
        if (prop === 'save') {
          return this.save.bind(this)
        }
        if (prop === 'delete') {
          return this.delete.bind(this)
        }
        if (prop === 'refresh') {
          return this.refresh.bind(this)
        }
        if (prop === 'fill') {
          return this.fill.bind(this)
        }

        // Forward all other operations to the actual instance
        const value = Reflect.get(target, prop, receiver)

        // If it's a function, bind it to the target
        if (typeof value === 'function') {
          return value.bind(target)
        }

        return value
      },
      set: (target, prop, value, receiver) => {
        // Set the value on the actual instance
        const result = Reflect.set(target, prop, value, receiver)

        // Mark the parent as dirty when any property changes
        this.markParentDirty()

        return result
      },
    }) as any
  }

  /**
   * Save the embedded document (updates the parent document)
   */
  async save(): Promise<InstanceType<T>> {
    // Execute beforeSave hooks on the embedded instance
    const { executeHooks } = await import('../base_model/hooks_executor.js')

    if (!(await executeHooks(this._instance, 'beforeSave', this._modelClass))) {
      return this._instance
    }

    // Mark parent as dirty and save the parent document
    this.markParentDirty()
    await this._parent.save()

    // Execute afterSave hooks on the embedded instance
    await executeHooks(this._instance, 'afterSave', this._modelClass)

    return this._instance
  }

  /**
   * Delete the embedded document (removes it from parent and saves)
   */
  async delete(): Promise<boolean> {
    // Execute beforeDelete hooks on the embedded instance
    const { executeHooks } = await import('../base_model/hooks_executor.js')

    if (!(await executeHooks(this._instance, 'beforeDelete', this._modelClass))) {
      return false
    }

    if (this._isArrayItem) {
      // Remove from array
      const parentArray = (this._parent as any)[this._fieldName]
      if (Array.isArray(parentArray) && this._arrayIndex !== undefined) {
        parentArray.splice(this._arrayIndex, 1)

        // Update array indices for remaining items
        for (let i = this._arrayIndex; i < parentArray.length; i++) {
          if (
            parentArray[i] &&
            typeof parentArray[i] === 'object' &&
            '_arrayIndex' in parentArray[i]
          ) {
            ;(parentArray[i] as any)._arrayIndex = i
          }
        }
      }
    } else {
      // Set single embedded to null
      ;(this._parent as any)[this._fieldName] = null
    }

    // Save the parent document
    await this._parent.save()

    // Execute afterDelete hooks on the embedded instance
    await executeHooks(this._instance, 'afterDelete', this._modelClass)

    return true
  }

  /**
   * Refresh the embedded document (reloads parent and gets fresh data)
   */
  async refresh(): Promise<InstanceType<T>> {
    // Refresh the parent document by reloading it from database
    const ParentClass = this._parent.constructor as typeof BaseModel
    const parentId = (this._parent as any)._id

    if (parentId) {
      const freshParent = await ParentClass.find(parentId)
      if (freshParent) {
        // Update parent with fresh data
        Object.assign(this._parent, freshParent)
        this._parent.syncOriginal()
      }
    }

    // Get the fresh embedded data
    let freshData: any
    if (this._isArrayItem) {
      const parentArray = (this._parent as any)[this._fieldName]
      freshData =
        Array.isArray(parentArray) && this._arrayIndex !== undefined
          ? parentArray[this._arrayIndex]
          : null
    } else {
      freshData = (this._parent as any)[this._fieldName]
    }

    if (freshData) {
      // Update the instance with fresh data
      Object.assign(this._instance, freshData)
    }

    return this._instance
  }

  /**
   * Fill the embedded document with new data
   */
  fill(data: Partial<InstanceType<T>>): InstanceType<T> {
    // Use the model's fill method if available
    if (typeof (this._instance as any).fill === 'function') {
      ;(this._instance as any).fill(data)
    } else {
      // Fallback: manually assign properties
      Object.assign(this._instance, data)
    }

    this.markParentDirty()
    return this._instance
  }

  /**
   * Mark the parent document as dirty
   */
  private markParentDirty(): void {
    if (this._isArrayItem) {
      // For array items, mark the entire array as dirty
      const parentArray = (this._parent as any)[this._fieldName]
      this._parent.setAttribute(this._fieldName, parentArray)
    } else {
      // For single embedded, mark the field as dirty
      this._parent.setAttribute(this._fieldName, this._instance)
    }
  }
}
