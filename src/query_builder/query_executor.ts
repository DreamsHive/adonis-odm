import { Collection, Document, FindOptions, Sort, WithId, ClientSession } from 'mongodb'
import { ModelConstructor, PaginatedResult, PaginationMeta } from '../types/index.js'
import {
  ModelNotFoundException,
  DatabaseOperationException,
  HookExecutionException,
  RelationshipException,
} from '../exceptions/index.js'
import { BaseModel } from '../base_model/base_model.js'
import type { MongoTransactionClient } from '../transaction_client.js'

/**
 * QueryExecutor - Handles query execution and result processing
 *
 * This class encapsulates all the logic for executing MongoDB queries
 * and processing the results into proper model instances.
 */
export class QueryExecutor<T extends Document = Document, TModel extends BaseModel = BaseModel> {
  constructor(
    private collection: Collection<T>,
    private modelConstructor: ModelConstructor,
    private transactionClient?: MongoTransactionClient
  ) {}

  /**
   * Get the session for transaction operations
   */
  private getSession(): ClientSession | undefined {
    return this.transactionClient?.getSession()
  }

  /**
   * Execute query and return first result
   */
  async first(
    finalFilters: any,
    selectFields?: Record<string, 0 | 1>,
    sortOptions?: Record<string, 1 | -1>,
    loadRelations?: Map<string, (query: any) => void>,
    embedRelations?: Map<string, (query: any) => void>
  ): Promise<TModel | null> {
    try {
      const { executeHooks } = await import('../base_model/hooks_executor.js')
      const modelClass = this.modelConstructor as typeof BaseModel & { new (...args: any[]): any }

      // Execute beforeFind hook (for single record queries)
      try {
        if (!(await executeHooks(this, 'beforeFind', modelClass))) {
          return null // Operation aborted by hook
        }
      } catch (error) {
        throw new HookExecutionException('beforeFind', modelClass.name, error as Error)
      }

      // Execute beforeFetch hook
      try {
        if (!(await executeHooks(this, 'beforeFetch', modelClass))) {
          return null // Operation aborted by hook
        }
      } catch (error) {
        throw new HookExecutionException('beforeFetch', modelClass.name, error as Error)
      }

      const options: FindOptions<T> = {}

      if (selectFields) {
        options.projection = selectFields
      }

      if (sortOptions && Object.keys(sortOptions).length > 0) {
        options.sort = sortOptions as Sort
      }

      // Add session for transaction support
      const session = this.getSession()
      if (session) {
        options.session = session
      }

      let result: WithId<T> | null
      try {
        result = await this.collection.findOne(finalFilters, options)
      } catch (error) {
        throw new DatabaseOperationException(`findOne on ${modelClass.name}`, error as Error)
      }

      if (!result) return null

      const deserializedResult = this.deserializeDocument(result)

      // Create a proper model instance
      const model = new this.modelConstructor()
      model.hydrateFromDocument(deserializedResult)
      Object.assign(model, deserializedResult)
      Object.setPrototypeOf(model, this.modelConstructor.prototype)

      // Associate model with transaction if present
      if (this.transactionClient) {
        model.useTransaction(this.transactionClient)
      }

      // Load relations if specified (eager loading like Lucid's preload)
      if (loadRelations && loadRelations.size > 0) {
        try {
          await this.loadReferencedDocuments([model], loadRelations)
        } catch (error) {
          throw new RelationshipException(
            'referenced relationships',
            modelClass.name,
            error as Error
          )
        }
      }

      // Process embedded relations if specified
      if (embedRelations && embedRelations.size > 0) {
        try {
          await this.processEmbeddedDocuments([model], embedRelations)
        } catch (error) {
          throw new RelationshipException('embedded relationships', modelClass.name, error as Error)
        }
      }

      // Execute afterFind hook
      try {
        await executeHooks(model, 'afterFind', modelClass)
      } catch (error) {
        throw new HookExecutionException('afterFind', modelClass.name, error as Error)
      }

      // Execute afterFetch hook with array containing single model
      try {
        await executeHooks([model], 'afterFetch', modelClass)
      } catch (error) {
        throw new HookExecutionException('afterFetch', modelClass.name, error as Error)
      }

      return model as TModel
    } catch (error) {
      // Re-throw our custom exceptions as-is, wrap others
      if (
        error instanceof DatabaseOperationException ||
        error instanceof HookExecutionException ||
        error instanceof RelationshipException
      ) {
        throw error
      }
      throw new DatabaseOperationException(`first on ${this.modelConstructor.name}`, error as Error)
    }
  }

  /**
   * Execute query and return first result or throw exception
   */
  async firstOrFail(
    finalFilters: any,
    selectFields?: Record<string, 0 | 1>,
    sortOptions?: Record<string, 1 | -1>,
    loadRelations?: Map<string, (query: any) => void>,
    embedRelations?: Map<string, (query: any) => void>
  ): Promise<TModel> {
    const result = await this.first(
      finalFilters,
      selectFields,
      sortOptions,
      loadRelations,
      embedRelations
    )
    if (!result) {
      throw new ModelNotFoundException(this.modelConstructor.name)
    }
    return result
  }

  /**
   * Execute query and return all results
   */
  async fetch(
    finalFilters: any,
    selectFields?: Record<string, 0 | 1>,
    sortOptions?: Record<string, 1 | -1>,
    limitValue?: number,
    skipValue?: number,
    distinctField?: string,
    groupByFields?: string[],
    havingConditions?: any,
    loadRelations?: Map<string, (query: any) => void>,
    embedRelations?: Map<string, (query: any) => void>
  ): Promise<TModel[]> {
    const { executeHooks } = await import('../base_model/hooks_executor.js')
    const modelClass = this.modelConstructor as typeof BaseModel & { new (...args: any[]): any }

    // Execute beforeFetch hook
    if (!(await executeHooks(this, 'beforeFetch', modelClass))) {
      return [] // Operation aborted by hook
    }

    // Handle distinct queries
    if (distinctField) {
      const session = this.getSession()
      const distinctOptions = session ? { session } : {}
      const distinctValues = await this.collection.distinct(
        distinctField,
        finalFilters,
        distinctOptions
      )
      return distinctValues.map((value) => ({
        [distinctField]: value,
      })) as unknown as TModel[]
    }

    // Handle group by queries (using aggregation)
    if (groupByFields && groupByFields.length > 0) {
      const aggregationResults = await this.executeAggregation(
        finalFilters,
        groupByFields,
        havingConditions,
        selectFields,
        sortOptions,
        skipValue,
        limitValue
      )
      return this.serializeResults(aggregationResults) as unknown as TModel[]
    }

    const options: FindOptions<T> = {}

    if (selectFields) {
      options.projection = selectFields
    }

    if (sortOptions && Object.keys(sortOptions).length > 0) {
      options.sort = sortOptions as Sort
    }

    if (limitValue !== undefined) {
      options.limit = limitValue
    }

    if (skipValue !== undefined) {
      options.skip = skipValue
    }

    // Add session for transaction support
    const session = this.getSession()
    if (session) {
      options.session = session
    }

    const cursor = this.collection.find(finalFilters, options)
    const results = await cursor.toArray()

    const deserializedResults = results.map((doc) => this.deserializeDocument(doc))

    // Create proper model instances
    const modelInstances = deserializedResults.map((doc) => {
      const model = new this.modelConstructor()
      model.hydrateFromDocument(doc)
      Object.assign(model, doc)
      Object.setPrototypeOf(model, this.modelConstructor.prototype)
      return model
    })

    // Associate models with transaction if present
    if (this.transactionClient) {
      modelInstances.forEach((model) => {
        model.useTransaction(this.transactionClient!)
      })
    }

    // Load relations if specified (eager loading like Lucid's preload)
    if (loadRelations && loadRelations.size > 0) {
      await this.loadReferencedDocuments(modelInstances, loadRelations)
    }

    // Process embedded relations if specified
    if (embedRelations && embedRelations.size > 0) {
      await this.processEmbeddedDocuments(modelInstances, embedRelations)
    }

    // Execute afterFetch hook
    await executeHooks(modelInstances, 'afterFetch', modelClass)

    return modelInstances as unknown as TModel[]
  }

  /**
   * Execute aggregation pipeline for group by queries
   */
  private async executeAggregation(
    finalFilters: any,
    groupByFields: string[],
    havingConditions?: any,
    selectFields?: Record<string, 0 | 1>,
    sortOptions?: Record<string, 1 | -1>,
    skipValue?: number,
    limitValue?: number
  ): Promise<WithId<T>[]> {
    const pipeline: any[] = []

    // Match stage (equivalent to WHERE)
    if (Object.keys(finalFilters).length > 0) {
      pipeline.push({ $match: finalFilters })
    }

    // Group stage
    const groupStage: any = {
      _id: {},
    }

    // Add group by fields to _id
    groupByFields.forEach((field) => {
      groupStage._id[field] = `$${field}`
    })

    // Add selected fields or count
    if (selectFields) {
      Object.keys(selectFields).forEach((field) => {
        if (selectFields[field] === 1 && !groupByFields.includes(field)) {
          groupStage[field] = { $first: `$${field}` }
        }
      })
    } else {
      groupStage.count = { $sum: 1 }
    }

    pipeline.push({ $group: groupStage })

    // Having stage (equivalent to HAVING)
    if (havingConditions && Object.keys(havingConditions).length > 0) {
      pipeline.push({ $match: havingConditions })
    }

    // Sort stage
    if (sortOptions && Object.keys(sortOptions).length > 0) {
      pipeline.push({ $sort: sortOptions })
    }

    // Skip stage
    if (skipValue !== undefined) {
      pipeline.push({ $skip: skipValue })
    }

    // Limit stage
    if (limitValue !== undefined) {
      pipeline.push({ $limit: limitValue })
    }

    const results = await this.collection.aggregate(pipeline).toArray()
    return results.map((doc) => this.deserializeDocument(doc as WithId<T>))
  }

  /**
   * Execute query and return paginated results
   */
  async paginate(
    page: number,
    perPage: number,
    finalFilters: any,
    selectFields?: Record<string, 0 | 1>,
    sortOptions?: Record<string, 1 | -1>,
    loadRelations?: Map<string, (query: any) => void>
  ): Promise<PaginatedResult<TModel>> {
    const skip = (page - 1) * perPage
    const total = await this.collection.countDocuments(finalFilters)

    const options: FindOptions<T> = {
      skip,
      limit: perPage,
    }

    if (selectFields) {
      options.projection = selectFields
    }

    if (sortOptions && Object.keys(sortOptions).length > 0) {
      options.sort = sortOptions as Sort
    }

    const cursor = this.collection.find(finalFilters, options)
    const results = await cursor.toArray()
    const deserializedResults = results.map((doc) => this.deserializeDocument(doc))

    // Load relations if specified (eager loading like Lucid's preload)
    if (loadRelations && loadRelations.size > 0) {
      await this.loadReferencedDocuments(deserializedResults, loadRelations)
    }

    const data = this.serializeResults(deserializedResults) as unknown as TModel[]

    const lastPage = Math.ceil(total / perPage)
    const baseUrl = '' // This would be configured based on the application

    const meta: PaginationMeta = {
      total,
      perPage,
      currentPage: page,
      lastPage,
      firstPage: 1,
      firstPageUrl: `${baseUrl}?page=1`,
      lastPageUrl: `${baseUrl}?page=${lastPage}`,
      nextPageUrl: page < lastPage ? `${baseUrl}?page=${page + 1}` : null,
      previousPageUrl: page > 1 ? `${baseUrl}?page=${page - 1}` : null,
    }

    return { data, meta }
  }

  /**
   * Count documents matching the query
   */
  async count(finalFilters: any): Promise<number> {
    return this.collection.countDocuments(finalFilters)
  }

  /**
   * Get array of IDs for matching documents
   */
  async ids(finalFilters: any): Promise<any[]> {
    const options: FindOptions<T> = {
      projection: { _id: 1 },
    }

    // Add session for transaction support
    const session = this.getSession()
    if (session) {
      options.session = session
    }

    const cursor = this.collection.find(finalFilters, options)
    const results = await cursor.toArray()

    return results.map((doc) => doc._id)
  }

  /**
   * Update documents matching the query
   */
  async update(finalFilters: any, updateData: Record<string, any>): Promise<number> {
    // Serialize the update data
    const serializedData: any = {}
    for (const [key, value] of Object.entries(updateData)) {
      serializedData[key] = this.serializeValue(value, key)
    }

    // Add updatedAt timestamp if not explicitly provided
    if (!serializedData.updatedAt) {
      serializedData.updatedAt = new Date()
    }

    // Add session for transaction support
    const session = this.getSession()
    const options = session ? { session } : {}

    const result = await this.collection.updateMany(
      finalFilters,
      {
        $set: serializedData,
      },
      options
    )
    return result.modifiedCount || 0
  }

  /**
   * Delete documents matching the query
   */
  async delete(finalFilters: any): Promise<number> {
    // Add session for transaction support
    const session = this.getSession()
    const options = session ? { session } : {}

    const result = await this.collection.deleteMany(finalFilters, options)
    return result.deletedCount || 0
  }

  /**
   * Deserialize document from MongoDB
   */
  private deserializeDocument(doc: WithId<T>): WithId<T> {
    // This would apply any deserialize functions from column metadata
    // For now, just return the document as-is
    return doc
  }

  /**
   * Serialize value for MongoDB
   */
  private serializeValue(value: any, _key: string): any {
    // This would apply any serialize functions from column metadata
    // For now, just return the value as-is
    return value
  }

  /**
   * Serialize a single result for API response
   */
  private serializeResult(result: WithId<T>): Record<string, unknown> {
    // Always create a proper model instance
    const model = new this.modelConstructor()
    model.hydrateFromDocument(result)

    // Copy all properties from the result to the model
    Object.assign(model, result)

    // Ensure the model has the correct prototype
    Object.setPrototypeOf(model, this.modelConstructor.prototype)

    // Now call toJSON on the properly constructed model instance
    return model.toJSON()
  }

  /**
   * Serialize multiple results for API response
   */
  private serializeResults(results: WithId<T>[]): Record<string, unknown>[] {
    return results.map((result) => this.serializeResult(result))
  }

  /**
   * Load referenced documents for the given results (eager loading like Lucid's preload)
   * This implements the same functionality as AdonisJS Lucid's preload method
   *
   * FULL IMPLEMENTATION: Prevents N+1 query problems with bulk loading
   */
  private async loadReferencedDocuments(
    results: WithId<T>[],
    loadRelations: Map<string, (query: any) => void>
  ): Promise<void> {
    if (results.length === 0) {
      return
    }

    // For each relationship to load
    for (const [relationName, callback] of loadRelations) {
      // Get the model metadata to find relationship information
      const metadata = this.modelConstructor.getMetadata()
      const relationColumn = metadata.columns.get(relationName)

      if (!relationColumn) {
        continue // Skip if column doesn't exist
      }

      // Handle embedded documents
      if (relationColumn.isEmbedded) {
        await this.loadEmbeddedDocuments(results, relationName, relationColumn, callback)
        continue
      }

      // Handle referenced documents
      if (!relationColumn.isReference) {
        continue // Skip if not a relationship
      }

      // If the model name is still "deferred", we need to trigger lazy resolution
      // by accessing the relationship property on a model instance
      if (relationColumn.model === 'deferred') {
        const tempInstance = new this.modelConstructor()
        // Access the relationship property to trigger lazy resolution
        // This triggers lazy resolution and updates relationColumn.model
        void (tempInstance as any)[relationName]
      }

      // Determine relationship type and load accordingly
      if (relationColumn.isBelongsTo) {
        await this.loadBelongsToRelationship(results, relationName, relationColumn, callback)
      } else if (relationColumn.isArray) {
        await this.loadHasManyRelationship(results, relationName, relationColumn, callback)
      } else {
        await this.loadHasOneRelationship(results, relationName, relationColumn, callback)
      }
    }
  }

  /**
   * Load BelongsTo relationships in bulk (prevents N+1 queries)
   */
  private async loadBelongsToRelationship(
    results: WithId<T>[],
    relationName: string,
    relationColumn: any,
    callback?: (query: any) => void
  ): Promise<void> {
    // 1. Collect all foreign keys from the results
    const foreignKeys = results
      .map((result) => (result as any)[relationColumn.localKey])
      .filter((key) => key !== null && key !== undefined)

    if (foreignKeys.length === 0) return

    // 2. Get the related model class
    const RelatedModel = this.getRelatedModelClass(relationColumn.model!)

    // 3. Query all related documents in a single query
    // Apply naming strategy to convert field name to database column name
    const dbFieldName = RelatedModel.namingStrategy.columnName(
      RelatedModel,
      relationColumn.foreignKey
    )

    let relatedQuery = RelatedModel.query().whereIn(dbFieldName, foreignKeys)
    if (this.transactionClient) {
      relatedQuery = relatedQuery.useTransaction(this.transactionClient)
    }

    // 4. Apply callback constraints if provided
    if (callback && typeof callback === 'function') {
      callback(relatedQuery)
    }

    const relatedDocuments = await relatedQuery.all()

    // 5. Create a map for quick lookup
    const relatedMap = new Map<string, any>()
    relatedDocuments.forEach((doc: any) => {
      const key = (doc as any)[dbFieldName]
      relatedMap.set(key?.toString(), doc)
    })

    // 6. Map related documents back to their parent models
    for (const result of results) {
      // Convert result to a proper model instance if it isn't already
      if (!((result as any) instanceof BaseModel)) {
        const model = new this.modelConstructor()
        model.hydrateFromDocument(result)
        Object.setPrototypeOf(result, model.constructor.prototype)
        Object.assign(result, model)
      }

      const foreignKey = (result as any)[relationColumn.localKey]
      if (foreignKey) {
        const relatedDoc = relatedMap.get(foreignKey.toString())
        if (relatedDoc) {
          // Access the relationship proxy to initialize it, then set the data
          const relationshipProxy = (result as any)[relationName]
          if (relationshipProxy) {
            relationshipProxy.related = relatedDoc
            // Note: isLoaded is read-only, it's managed internally by the proxy
          }
        }
      }
    }
  }

  /**
   * Load HasOne relationships in bulk (prevents N+1 queries)
   */
  private async loadHasOneRelationship(
    results: WithId<T>[],
    relationName: string,
    relationColumn: any,
    callback?: (query: any) => void
  ): Promise<void> {
    // 1. Collect all local keys from the results
    const localKeys = results
      .map((result) => (result as any)[relationColumn.localKey])
      .filter((key) => key !== null && key !== undefined)

    if (localKeys.length === 0) {
      return
    }

    // 2. Get the related model class
    const RelatedModel = this.getRelatedModelClass(relationColumn.model!)

    // 3. Query all related documents in a single query
    // Apply naming strategy to convert field name to database column name
    const dbFieldName = RelatedModel.namingStrategy.columnName(
      RelatedModel,
      relationColumn.foreignKey
    )

    let relatedQuery = RelatedModel.query().whereIn(dbFieldName, localKeys)
    if (this.transactionClient) {
      relatedQuery = relatedQuery.useTransaction(this.transactionClient)
    }

    // 4. Apply callback constraints if provided
    if (callback && typeof callback === 'function') {
      callback(relatedQuery)
    }

    const relatedDocuments = await relatedQuery.all()

    // 5. Create a map for quick lookup
    const relatedMap = new Map<string, any>()
    relatedDocuments.forEach((doc: any) => {
      const key = (doc as any)[dbFieldName]
      relatedMap.set(key?.toString(), doc)
    })

    // 6. Map related documents back to their parent models
    for (const result of results) {
      // Convert result to a proper model instance if it isn't already
      if (!((result as any) instanceof BaseModel)) {
        const model = new this.modelConstructor()
        model.hydrateFromDocument(result)
        Object.setPrototypeOf(result, model.constructor.prototype)
        Object.assign(result, model)
      }

      const localKey = (result as any)[relationColumn.localKey]

      if (localKey) {
        const relatedDoc = relatedMap.get(localKey.toString())

        if (relatedDoc) {
          // Access the relationship proxy to initialize it, then set the data
          const relationshipProxy = (result as any)[relationName]

          if (relationshipProxy) {
            relationshipProxy.related = relatedDoc
          }
        }
      }
    }
  }

  /**
   * Load HasMany relationships in bulk (prevents N+1 queries)
   */
  private async loadHasManyRelationship(
    results: WithId<T>[],
    relationName: string,
    relationColumn: any,
    callback?: (query: any) => void
  ): Promise<void> {
    // 1. Collect all local keys from the results
    const localKeys = results
      .map((result) => (result as any)[relationColumn.localKey])
      .filter((key) => key !== null && key !== undefined)

    if (localKeys.length === 0) return

    // 2. Get the related model class
    const RelatedModel = this.getRelatedModelClass(relationColumn.model!)

    // 3. Query all related documents in a single query
    // Apply naming strategy to convert field name to database column name
    const dbFieldName = RelatedModel.namingStrategy.columnName(
      RelatedModel,
      relationColumn.foreignKey
    )

    let relatedQuery = RelatedModel.query().whereIn(dbFieldName, localKeys)
    if (this.transactionClient) {
      relatedQuery = relatedQuery.useTransaction(this.transactionClient)
    }

    // 4. Apply callback constraints if provided
    if (callback && typeof callback === 'function') {
      callback(relatedQuery)
    }

    const relatedDocuments = await relatedQuery.all()

    // 5. Group related documents by foreign key
    const relatedGroups = new Map<string, any[]>()
    relatedDocuments.forEach((doc: any) => {
      const key = (doc as any)[dbFieldName]?.toString()
      if (key) {
        if (!relatedGroups.has(key)) {
          relatedGroups.set(key, [])
        }
        relatedGroups.get(key)!.push(doc)
      }
    })

    // 6. Map related documents back to their parent models
    for (const result of results) {
      // Convert result to a proper model instance if it isn't already
      if (!((result as any) instanceof BaseModel)) {
        const model = new this.modelConstructor()
        model.hydrateFromDocument(result)
        Object.setPrototypeOf(result, model.constructor.prototype)
        Object.assign(result, model)
      }

      const localKey = (result as any)[relationColumn.localKey]
      if (localKey) {
        const relatedDocs = relatedGroups.get(localKey.toString()) || []

        // Access the relationship proxy to initialize it, then set the data
        const relationshipProxy = (result as any)[relationName]
        if (relationshipProxy) {
          relationshipProxy.related = relatedDocs
          // Note: isLoaded is read-only, it's managed internally by the proxy
          // Update the array proxy
          relationshipProxy.length = 0
          relationshipProxy.push(...relatedDocs)
        }
      }
    }
  }

  /**
   * Load embedded documents with query capabilities
   * For embedded documents, we apply the callback constraints to filter the embedded data
   */
  private async loadEmbeddedDocuments(
    results: WithId<T>[],
    relationName: string,
    _relationColumn: any,
    callback?: (query: any) => void
  ): Promise<void> {
    // For embedded documents, we need to apply the callback constraints
    // to filter the embedded data if it's an array (many type)

    for (const result of results) {
      // Convert result to a proper model instance if it isn't already
      if (!((result as any) instanceof BaseModel)) {
        const model = new this.modelConstructor()
        model.hydrateFromDocument(result)
        Object.setPrototypeOf(result, model.constructor.prototype)
        Object.assign(result, model)
      }

      // Access the embedded property to ensure it's initialized
      const embeddedData = (result as any)[relationName]

      // If it's an embedded many type and has query capabilities, apply callback
      if (embeddedData && typeof embeddedData.query === 'function' && callback) {
        // Create a query builder for the embedded data
        const embeddedQuery = embeddedData.query()

        // Apply the callback constraints
        callback(embeddedQuery)

        // Execute the query to filter the embedded data
        const filteredData = embeddedQuery.get()

        // Update the embedded data with filtered results
        // Note: This doesn't modify the original data, just provides filtered access
        // In a real implementation, you might want to cache this or handle it differently
        embeddedData._filteredResults = filteredData
      }
    }
  }

  /**
   * Process embedded documents with query capabilities
   * This method applies the embed() callback constraints to filter embedded documents
   */
  private async processEmbeddedDocuments(
    results: WithId<T>[],
    embedRelations: Map<string, (query: any) => void>
  ): Promise<void> {
    if (results.length === 0) {
      return
    }

    // For each embedded relationship to process
    for (const [relationName, callback] of embedRelations) {
      // Get the model metadata to find embedded relationship information
      const metadata = this.modelConstructor.getMetadata()
      const relationColumn = metadata.columns.get(relationName)

      if (!relationColumn || !relationColumn.isEmbedded) {
        continue // Skip if not an embedded relationship
      }

      // Process each result
      for (const result of results) {
        // Convert result to a proper model instance if it isn't already
        if (!((result as any) instanceof BaseModel)) {
          const model = new this.modelConstructor()
          model.hydrateFromDocument(result)
          Object.setPrototypeOf(result, model.constructor.prototype)
          Object.assign(result, model)
        }

        // Access the embedded property to ensure it's initialized
        const embeddedData = (result as any)[relationName]

        // Apply callback constraints for embedded many types (arrays)
        if (embeddedData && typeof embeddedData.query === 'function' && callback) {
          // Create a query builder for the embedded data
          const embeddedQuery = embeddedData.query()

          // Apply the callback constraints
          callback(embeddedQuery)

          // Execute the query to get filtered results
          const filteredData = embeddedQuery.get()

          // Replace the embedded data with filtered results
          // This modifies the actual embedded array to show only filtered items
          if (Array.isArray(embeddedData)) {
            // Clear the existing array and add filtered items
            embeddedData.length = 0
            embeddedData.push(...filteredData)
          }
        }

        // For single embedded documents, we could apply validation or transformation
        // but typically single embedded documents don't need query filtering
        else if (embeddedData && relationColumn.embeddedType === 'single') {
          // For single embedded documents, we could create a temporary query builder
          // and apply the callback for validation purposes, but this is less common
          console.log(
            `⚠️ Embed callback applied to single embedded document '${relationName}' - this is unusual`
          )
        }
      }
    }
  }

  /**
   * Get the related model class by name
   * Uses the global model registry for relationship loading
   */
  private getRelatedModelClass(modelName: string): any {
    const ModelClass = BaseModel.getModelClass(modelName)
    if (!ModelClass) {
      throw new Error(
        `Model "${modelName}" not found in registry. ` +
          'Make sure the model is imported and instantiated at least once, ' +
          'or manually register it using ModelClass.register().'
      )
    }

    return ModelClass
  }
}
