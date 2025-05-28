import { BaseModel } from '../base_model/base_model.js'
import { ObjectId } from 'mongodb'
import { DatabaseOperationException, RelationshipException } from '../exceptions/index.js'

/**
 * Utility functions for handling nested documents efficiently
 */
export class NestedDocumentHelpers {
  /**
   * Bulk load referenced documents for multiple models
   * This helps avoid N+1 query problems
   */
  static async bulkLoadReferences<T extends BaseModel, R extends BaseModel>(
    models: T[],
    referenceField: string,
    ReferenceModel: typeof BaseModel & (new (...args: any[]) => R),
    targetField?: string
  ): Promise<void> {
    try {
      // Extract all reference IDs
      const referenceIds = models
        .map((model) => (model as any)[referenceField])
        .filter((id) => id !== null && id !== undefined) as (ObjectId | string)[]

      if (referenceIds.length === 0) return

      // Load all referenced documents in a single query
      let referencedDocs: R[]
      try {
        referencedDocs = await (ReferenceModel as any)
          .query()
          .where('_id', 'in', referenceIds)
          .all()
      } catch (error) {
        throw new DatabaseOperationException(
          `bulk load references for ${ReferenceModel.name}`,
          error as Error
        )
      }

      // Create a map for quick lookup
      const referencedMap = new Map<string, R>()
      referencedDocs.forEach((doc: R) => {
        referencedMap.set(doc._id!.toString(), doc)
      })

      // Assign referenced documents to models
      const field = targetField || referenceField.replace(/Id$/, '')
      models.forEach((model) => {
        const refId = (model as any)[referenceField]
        if (refId) {
          const referencedDoc = referencedMap.get(refId.toString())
          if (referencedDoc) {
            ;(model as any)[field] = referencedDoc
          }
        }
      })
    } catch (error) {
      // Re-throw DatabaseOperationException as-is, wrap others
      if (error instanceof DatabaseOperationException) {
        throw error
      }
      throw new RelationshipException(
        `bulk load ${referenceField}`,
        models[0]?.constructor.name || 'Unknown',
        error as Error
      )
    }
  }

  /**
   * Paginate with selective reference loading
   * Only load references for the current page, not all data
   */
  static async paginateWithReferences<T extends BaseModel, R extends BaseModel>(
    ModelClass: typeof BaseModel & (new (...args: any[]) => T),
    page: number,
    perPage: number,
    referenceField: string,
    ReferenceModel: typeof BaseModel & (new (...args: any[]) => R),
    targetField?: string,
    conditions?: any[]
  ) {
    // Build query with conditions
    let query = (ModelClass as any).query()

    if (conditions) {
      conditions.forEach((condition) => {
        if (condition.operator && condition.value !== undefined) {
          query = query.where(condition.field, condition.operator, condition.value)
        }
      })
    }

    // Get paginated results
    const paginatedResult = await query.paginate(page, perPage)

    // Bulk load references for the current page only
    await this.bulkLoadReferences(paginatedResult.data, referenceField, ReferenceModel, targetField)

    return paginatedResult
  }

  /**
   * Create document with nested data
   * Handles both embedded and referenced approaches
   */
  static async createWithNested<T extends BaseModel>(
    ModelClass: typeof BaseModel & (new (...args: any[]) => T),
    data: any,
    nestedConfig?: {
      field: string
      isEmbedded: boolean
      NestedModel?: typeof BaseModel
      referenceField?: string
    }
  ): Promise<T> {
    if (!nestedConfig) {
      return await (ModelClass as any).create(data)
    }

    const { field, isEmbedded, NestedModel, referenceField } = nestedConfig
    const nestedData = data[field]
    delete data[field]

    if (isEmbedded) {
      // For embedded documents, include nested data directly
      data[field] = nestedData
      return await (ModelClass as any).create(data)
    } else {
      // For referenced documents, create nested document first
      if (!NestedModel || !nestedData) {
        return await (ModelClass as any).create(data)
      }

      const nestedDoc = await (NestedModel as any).create(nestedData)
      data[referenceField || field + 'Id'] = nestedDoc._id

      const mainDoc = await (ModelClass as any).create(data)
      ;(mainDoc as any)[field] = nestedDoc

      return mainDoc
    }
  }

  /**
   * Update document with nested data
   */
  static async updateWithNested<T extends BaseModel>(
    model: T,
    data: any,
    nestedConfig?: {
      field: string
      isEmbedded: boolean
      NestedModel?: typeof BaseModel
      referenceField?: string
    }
  ): Promise<T> {
    if (!nestedConfig) {
      model.merge(data)
      await model.save()
      return model
    }

    const { field, isEmbedded, NestedModel, referenceField } = nestedConfig
    const nestedData = data[field]
    delete data[field]

    // Update main document data
    if (Object.keys(data).length > 0) {
      model.merge(data)
    }

    if (nestedData) {
      if (isEmbedded) {
        // For embedded documents, update nested data directly
        const currentNested = (model as any)[field] || {}
        ;(model as any)[field] = { ...currentNested, ...nestedData }
      } else {
        // For referenced documents, update the referenced document
        const refId = (model as any)[referenceField || field + 'Id']
        if (refId && NestedModel) {
          const nestedDoc = await (NestedModel as any).find(refId)
          if (nestedDoc) {
            nestedDoc.merge(nestedData)
            await nestedDoc.save()
            ;(model as any)[field] = nestedDoc
          }
        }
      }
    }

    await model.save()
    return model
  }

  /**
   * Query with nested conditions
   * Handles different approaches for embedded vs referenced documents
   */
  static async queryWithNestedConditions<T extends BaseModel>(
    ModelClass: typeof BaseModel & (new (...args: any[]) => T),
    nestedConditions: Array<{
      field: string
      operator: string
      value: any
      isEmbedded: boolean
      NestedModel?: typeof BaseModel
      referenceField?: string
    }>,
    mainConditions?: any[],
    options?: {
      page?: number
      perPage?: number
      orderBy?: { field: string; direction: 'asc' | 'desc' }
    }
  ) {
    const embeddedConditions = nestedConditions.filter((c) => c.isEmbedded)
    const referencedConditions = nestedConditions.filter((c) => !c.isEmbedded)

    let query = (ModelClass as any).query()

    // Apply main conditions
    if (mainConditions) {
      mainConditions.forEach((condition) => {
        query = query.where(condition.field, condition.operator, condition.value)
      })
    }

    // Apply embedded conditions directly
    embeddedConditions.forEach((condition) => {
      query = query.where(condition.field, condition.operator, condition.value)
    })

    // Handle referenced conditions
    if (referencedConditions.length > 0) {
      const referenceIds: (ObjectId | string)[] = []

      for (const condition of referencedConditions) {
        if (condition.NestedModel) {
          const nestedDocs = await (condition.NestedModel as any)
            .query()
            .where(condition.field, condition.operator, condition.value)
            .all()

          const ids = nestedDocs.map((doc: any) => doc._id)
          referenceIds.push(...ids)
        }
      }

      if (referenceIds.length > 0) {
        const referenceField = referencedConditions[0].referenceField || 'profileId'
        query = query.where(referenceField, 'in', referenceIds)
      }
    }

    // Apply ordering
    if (options?.orderBy) {
      query = query.orderBy(options.orderBy.field, options.orderBy.direction)
    }

    // Apply pagination
    if (options?.page && options?.perPage) {
      return await query.paginate(options.page, options.perPage)
    }

    return await query.all()
  }

  /**
   * Aggregate nested document statistics
   */
  static async aggregateNestedStats<T extends BaseModel>(
    ModelClass: typeof BaseModel & (new (...args: any[]) => T),
    nestedField: string,
    isEmbedded: boolean,
    NestedModel?: typeof BaseModel
  ) {
    if (isEmbedded) {
      // For embedded documents, use MongoDB aggregation
      // This would require access to the raw MongoDB collection
      // Implementation depends on your database manager setup
      return {
        totalWithNested: 0,
        totalWithoutNested: 0,
        // Add more statistics as needed
      }
    } else {
      // For referenced documents, use separate queries
      const totalUsers = await (ModelClass as any).query().count()
      const usersWithNested = await (ModelClass as any)
        .query()
        .where(nestedField + 'Id', 'exists', true)
        .count()

      return {
        totalWithNested: usersWithNested,
        totalWithoutNested: totalUsers - usersWithNested,
        totalNested: NestedModel ? await (NestedModel as any).query().count() : 0,
      }
    }
  }
}
