import { DateTime } from 'luxon'
import type { BaseModel } from './base_model.js'
import { DateColumnOptions } from '../types/index.js'
import { DatabaseOperationException, HookExecutionException } from '../exceptions/index.js'

/**
 * PersistenceManager - Handles database persistence operations
 *
 * This class encapsulates all the logic for saving, deleting, inserting,
 * and updating models in the database.
 */
export class PersistenceManager {
  constructor(public model: BaseModel) {}

  /**
   * Save the model to the database
   */
  async save(): Promise<BaseModel> {
    try {
      const { executeHooks } = await import('./hooks_executor.js')
      const modelClass = this.model.constructor as typeof BaseModel & { new (...args: any[]): any }

      // Execute beforeSave hook
      try {
        if (!(await executeHooks(this.model, 'beforeSave', modelClass))) {
          return this.model // Operation aborted by hook
        }
      } catch (error) {
        throw new HookExecutionException('beforeSave', modelClass.name, error as Error)
      }

      const isNew = !this.model.$isPersisted

      if (isNew) {
        // Execute beforeCreate hook for new models
        try {
          if (!(await executeHooks(this.model, 'beforeCreate', modelClass))) {
            return this.model // Operation aborted by hook
          }
        } catch (error) {
          throw new HookExecutionException('beforeCreate', modelClass.name, error as Error)
        }
      } else {
        // Execute beforeUpdate hook for existing models
        try {
          if (!(await executeHooks(this.model, 'beforeUpdate', modelClass))) {
            return this.model // Operation aborted by hook
          }
        } catch (error) {
          throw new HookExecutionException('beforeUpdate', modelClass.name, error as Error)
        }
      }

      this.applyTimestamps()

      let dbOperationSuccessful = false
      try {
        if (isNew) {
          await this.performInsert()
        } else {
          await this.performUpdate()
        }
        dbOperationSuccessful = true
      } catch (error) {
        // If DB operation failed, don't run after hooks
        const operation = isNew ? 'insert' : 'update'
        throw new DatabaseOperationException(`${operation} on ${modelClass.name}`, error as Error)
      }

      if (dbOperationSuccessful) {
        this.syncOriginal()
        this.model.$dirty = {}
        this.model.$isPersisted = true
        this.model.$isLocal = false

        // Execute afterSave hook
        try {
          await executeHooks(this.model, 'afterSave', modelClass)
        } catch (error) {
          throw new HookExecutionException('afterSave', modelClass.name, error as Error)
        }

        if (isNew) {
          // Execute afterCreate hook for new models
          try {
            await executeHooks(this.model, 'afterCreate', modelClass)
          } catch (error) {
            throw new HookExecutionException('afterCreate', modelClass.name, error as Error)
          }
        } else {
          // Execute afterUpdate hook for existing models
          try {
            await executeHooks(this.model, 'afterUpdate', modelClass)
          } catch (error) {
            throw new HookExecutionException('afterUpdate', modelClass.name, error as Error)
          }
        }
      }

      return this.model
    } catch (error) {
      // Re-throw our custom exceptions as-is, wrap others
      if (error instanceof DatabaseOperationException || error instanceof HookExecutionException) {
        throw error
      }
      const modelClass = this.model.constructor as typeof BaseModel
      throw new DatabaseOperationException(`save on ${modelClass.name}`, error as Error)
    }
  }

  /**
   * Delete the model from the database
   */
  async delete(): Promise<boolean> {
    try {
      if (!this.model.$isPersisted || !this.model._id) {
        return false
      }

      const { executeHooks } = await import('./hooks_executor.js')
      const modelClass = this.model.constructor as typeof BaseModel & { new (...args: any[]): any }

      // Execute beforeDelete hook
      try {
        if (!(await executeHooks(this.model, 'beforeDelete', modelClass))) {
          return false // Operation aborted by hook
        }
      } catch (error) {
        throw new HookExecutionException('beforeDelete', modelClass.name, error as Error)
      }

      let result: number
      try {
        const queryOptions = this.model.$trx ? { client: this.model.$trx } : undefined
        result = await (this.model.constructor as typeof BaseModel as any)
          .query(queryOptions)
          .where('_id', this.model._id)
          .delete()
      } catch (error) {
        throw new DatabaseOperationException(`delete on ${modelClass.name}`, error as Error)
      }

      if (result > 0) {
        this.model.$isPersisted = false
        this.model.$isLocal = true

        // Execute afterDelete hook
        try {
          await executeHooks(this.model, 'afterDelete', modelClass)
        } catch (error) {
          throw new HookExecutionException('afterDelete', modelClass.name, error as Error)
        }

        return true
      }

      return false
    } catch (error) {
      // Re-throw our custom exceptions as-is, wrap others
      if (error instanceof DatabaseOperationException || error instanceof HookExecutionException) {
        throw error
      }
      const modelClass = this.model.constructor as typeof BaseModel
      throw new DatabaseOperationException(`delete on ${modelClass.name}`, error as Error)
    }
  }

  /**
   * Apply automatic timestamps
   */
  private applyTimestamps(): void {
    const metadata = (this.model.constructor as typeof BaseModel).getMetadata()
    const now = DateTime.now()

    for (const [key, options] of metadata.columns) {
      const dateOptions = options as DateColumnOptions

      if (dateOptions.autoCreate && !this.model.$isPersisted) {
        this.model.setAttribute(key, now)
      }

      if (dateOptions.autoUpdate) {
        this.model.setAttribute(key, now)
      }
    }
  }

  /**
   * Perform database insert
   */
  async performInsert(): Promise<void> {
    const document = this.model.toDocument()

    // Remove _id if it's undefined to let MongoDB generate it
    if (!document._id) {
      delete document._id
    }

    // This would use the actual database connection
    // For now, we'll simulate the operation
    throw new Error('Database insert not implemented. Please register the MongoDB ODM provider.')
  }

  /**
   * Perform database update
   */
  async performUpdate(): Promise<void> {
    if (!this.model._id) {
      throw new Error('Cannot update model without an ID')
    }

    const updates = this.model.getDirtyAttributes()

    if (Object.keys(updates).length === 0) {
      return // Nothing to update
    }

    // This would use the actual database connection
    // For now, we'll simulate the operation
    throw new Error('Database update not implemented. Please register the MongoDB ODM provider.')
  }

  /**
   * Sync the original values with current values
   */
  private syncOriginal(): void {
    this.model.$original = { ...this.model.toDocument() }
    this.model.$dirty = {}
  }
}
