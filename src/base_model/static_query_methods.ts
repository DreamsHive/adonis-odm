import { ObjectId, Document } from 'mongodb'
import { ModelQueryBuilder } from '../query_builder/model_query_builder.js'
import { ModelNotFoundException, DatabaseOperationException } from '../exceptions/index.js'
import { ModelOperationOptions } from '../types/index.js'
import type { CreateAttributes } from '../types/embedded.js'
import type { BaseModel } from './base_model.js'

/**
 * StaticQueryMethods - Handles all static query methods for BaseModel
 *
 * This class encapsulates all the static methods for querying and creating
 * model instances like find, create, all, etc.
 */
export class StaticQueryMethods {
  /**
   * Create a new query builder instance with type-safe relationship loading
   */
  static query<T extends BaseModel = BaseModel>(
    _modelClass: typeof BaseModel & (new (...args: any[]) => T),
    _options?: ModelOperationOptions
  ): ModelQueryBuilder<Document, T> {
    // This would be injected by the service provider
    // For now, we'll throw an error to indicate it needs to be set up
    throw new Error('Database connection not configured. Please register the MongoDB ODM provider.')
  }

  /**
   * Find a document by its ID
   */
  static async find<T extends BaseModel = BaseModel>(
    modelClass: typeof BaseModel & (new (...args: any[]) => T),
    id: string | ObjectId,
    options?: ModelOperationOptions
  ): Promise<T | null> {
    try {
      // Use the query builder which already has hooks integrated
      return await (modelClass as any).query(options).where('_id', id).first()
    } catch (error) {
      throw new DatabaseOperationException(
        `find by ID "${id}" on ${modelClass.name}`,
        error as Error
      )
    }
  }

  /**
   * Find a document by its ID or throw an exception
   */
  static async findOrFail<T extends BaseModel>(
    modelClass: typeof BaseModel & (new (...args: any[]) => T),
    id: string | ObjectId,
    options?: ModelOperationOptions
  ): Promise<T> {
    try {
      const result = await this.find(modelClass, id, options)
      if (!result) {
        throw new ModelNotFoundException(modelClass.name, id)
      }
      return result
    } catch (error) {
      // Re-throw ModelNotFoundException as-is, wrap others
      if (error instanceof ModelNotFoundException) {
        throw error
      }
      throw new DatabaseOperationException(
        `findOrFail by ID "${id}" on ${modelClass.name}`,
        error as Error
      )
    }
  }

  /**
   * Find a document by a specific field
   */
  static async findBy<T extends BaseModel>(
    modelClass: typeof BaseModel & (new (...args: any[]) => T),
    field: string,
    value: any
  ): Promise<T | null> {
    try {
      // Use the query builder which already has hooks integrated
      return await (modelClass as any).query().where(field, value).first()
    } catch (error) {
      throw new DatabaseOperationException(
        `findBy ${field}="${value}" on ${modelClass.name}`,
        error as Error
      )
    }
  }

  /**
   * Find a document by a specific field or throw an exception
   */
  static async findByOrFail<T extends BaseModel>(
    modelClass: typeof BaseModel & (new (...args: any[]) => T),
    field: string,
    value: any
  ): Promise<T> {
    try {
      const result = await this.findBy(modelClass, field, value)
      if (!result) {
        throw new ModelNotFoundException(modelClass.name, `${field}=${value}`)
      }
      return result
    } catch (error) {
      // Re-throw ModelNotFoundException as-is, wrap others
      if (error instanceof ModelNotFoundException) {
        throw error
      }
      throw new DatabaseOperationException(
        `findByOrFail ${field}="${value}" on ${modelClass.name}`,
        error as Error
      )
    }
  }

  /**
   * Get the first document
   */
  static async first<T extends BaseModel>(
    modelClass: typeof BaseModel & (new (...args: any[]) => T)
  ): Promise<T | null> {
    try {
      // Use the query builder which already has hooks integrated
      return await (modelClass as any).query().first()
    } catch (error) {
      throw new DatabaseOperationException(`first on ${modelClass.name}`, error as Error)
    }
  }

  /**
   * Get the first document or throw an exception
   */
  static async firstOrFail<T extends BaseModel>(
    modelClass: typeof BaseModel & (new (...args: any[]) => T)
  ): Promise<T> {
    try {
      const result = await this.first(modelClass)
      if (!result) {
        throw new ModelNotFoundException(modelClass.name)
      }
      return result
    } catch (error) {
      // Re-throw ModelNotFoundException as-is, wrap others
      if (error instanceof ModelNotFoundException) {
        throw error
      }
      throw new DatabaseOperationException(`firstOrFail on ${modelClass.name}`, error as Error)
    }
  }

  /**
   * Get all documents
   */
  static async all<T extends BaseModel>(
    modelClass: typeof BaseModel & (new (...args: any[]) => T)
  ): Promise<T[]> {
    try {
      // Use the query builder which already has hooks integrated
      return await (modelClass as any).query().all()
    } catch (error) {
      throw new DatabaseOperationException(`all on ${modelClass.name}`, error as Error)
    }
  }

  /**
   * Create a new document
   */
  static async create<T extends BaseModel>(
    modelClass: new (...args: any[]) => T,
    attributes: CreateAttributes<T>,
    options?: ModelOperationOptions
  ): Promise<T> {
    try {
      const instance = new modelClass(attributes)
      if (options?.client) {
        instance.useTransaction(options.client)
      }
      await instance.save()
      return instance
    } catch (error) {
      throw new DatabaseOperationException(`create on ${modelClass.name}`, error as Error)
    }
  }

  /**
   * Create multiple documents
   */
  static async createMany<T extends BaseModel>(
    modelClass: new (...args: any[]) => T,
    attributesArray: CreateAttributes<T>[]
  ): Promise<T[]> {
    try {
      const instances = attributesArray.map((attributes) => new modelClass(attributes))
      const savedInstances: T[] = []

      // For now, save them one by one. In a real implementation, we'd use insertMany
      for (const [index, instance] of instances.entries()) {
        try {
          await instance.save()
          savedInstances.push(instance)
        } catch (error) {
          // If one fails, we should provide context about which one failed
          throw new DatabaseOperationException(
            `createMany on ${modelClass.name} (failed at index ${index})`,
            error as Error
          )
        }
      }

      return savedInstances
    } catch (error) {
      // Re-throw DatabaseOperationException as-is, wrap others
      if (error instanceof DatabaseOperationException) {
        throw error
      }
      throw new DatabaseOperationException(`createMany on ${modelClass.name}`, error as Error)
    }
  }

  /**
   * Update or create a document
   */
  static async updateOrCreate<T extends BaseModel>(
    modelClass: new (...args: any[]) => T,
    searchPayload: CreateAttributes<T>,
    persistencePayload: CreateAttributes<T>
  ): Promise<T> {
    try {
      let query = (modelClass as any).query()

      // Add search conditions
      for (const [field, value] of Object.entries(searchPayload)) {
        query = query.where(field, value)
      }

      const result = await query.first()

      if (result) {
        // Update existing
        try {
          const instance = new modelClass()
          instance.hydrateFromDocument(result)
          instance.merge(persistencePayload)
          await instance.save()
          return instance
        } catch (error) {
          throw new DatabaseOperationException(
            `updateOrCreate (update) on ${modelClass.name}`,
            error as Error
          )
        }
      } else {
        // Create new
        try {
          return this.create(modelClass, { ...searchPayload, ...persistencePayload })
        } catch (error) {
          throw new DatabaseOperationException(
            `updateOrCreate (create) on ${modelClass.name}`,
            error as Error
          )
        }
      }
    } catch (error) {
      // Re-throw DatabaseOperationException as-is, wrap others
      if (error instanceof DatabaseOperationException) {
        throw error
      }
      throw new DatabaseOperationException(`updateOrCreate on ${modelClass.name}`, error as Error)
    }
  }
}
