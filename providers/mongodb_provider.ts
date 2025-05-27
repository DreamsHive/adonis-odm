import { ApplicationService } from '@adonisjs/core/types'
import { MongoDatabaseManager } from '../src/database_manager.js'
import { BaseModel } from '../src/base_model/base_model.js'
import { ModelQueryBuilder } from '../src/query_builder/model_query_builder.js'
import { MongoConfig } from '../src/types/index.js'

declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    'mongodb.manager': MongoDatabaseManager
    'mongodb': MongoDatabaseManager
  }
}

/**
 * MongoDB ODM Service Provider for AdonisJS
 */
export default class MongodbProvider {
  private manager?: MongoDatabaseManager

  constructor(protected app: ApplicationService) {}

  /**
   * Register bindings to the container
   */
  register() {
    // Create the database manager instance
    const config = this.app.config.get<MongoConfig>('mongodb')

    if (!config) {
      throw new Error(
        'MongoDB configuration not found. Please ensure config/mongodb.ts is properly configured.'
      )
    }

    if (!config.connections) {
      throw new Error(
        'MongoDB connections not configured. Please check your config/mongodb.ts file.'
      )
    }

    this.manager = new MongoDatabaseManager(config)

    // Store it in the container
    this.app.container.bind('mongodb.manager', () => this.manager!)
    this.app.container.bind('mongodb', () => this.manager!)
  }

  /**
   * Boot the provider
   */
  async boot() {
    // Extend BaseModel with database functionality
    this.extendBaseModel()
  }

  /**
   * Start the provider
   */
  async start() {
    // Connect to MongoDB when the application starts
    if (this.manager) {
      await this.manager.connect()
    }
  }

  /**
   * Ready hook
   */
  async ready() {
    // Provider is ready
  }

  /**
   * Shutdown hook
   */
  async shutdown() {
    // Close all MongoDB connections
    if (this.manager) {
      await this.manager.close()
    }
  }

  /**
   * Extend BaseModel with database functionality
   */
  private extendBaseModel() {
    const manager = this.manager!

    // Override the static query method to use the actual database connection
    BaseModel.query = function <T extends BaseModel = BaseModel>(
      this: typeof BaseModel & (new (...args: any[]) => T),
      options?: any
    ) {
      const collectionName = this.getCollectionName()
      const connectionName = this.getConnection()

      const collection = manager.collection(collectionName, connectionName)
      const queryBuilder = new ModelQueryBuilder(collection, this as any)

      // If transaction client is provided, associate it with the query builder
      if (options?.client) {
        queryBuilder.useTransaction(options.client)
      }

      return queryBuilder as any
    }

    // Override the performInsert method
    BaseModel.prototype['performInsert'] = async function (this: BaseModel, session?: any) {
      const constructor = this.constructor as typeof BaseModel
      const collectionName = constructor.getCollectionName()
      const connectionName = constructor.getConnection()

      const collection = manager.collection(collectionName, connectionName)
      const document = this.toDocument()

      // Remove _id if it's undefined to let MongoDB generate it
      if (!document._id) {
        delete document._id
      }

      // Use session if provided (for transactions)
      const options = session ? { session } : {}
      const result = await collection.insertOne(document as any, options)
      this._id = result.insertedId
    }

    // Override the performUpdate method
    BaseModel.prototype['performUpdate'] = async function (this: BaseModel, session?: any) {
      if (!this._id) {
        throw new Error('Cannot update model without an ID')
      }

      const constructor = this.constructor as typeof BaseModel
      const collectionName = constructor.getCollectionName()
      const connectionName = constructor.getConnection()

      const collection = manager.collection(collectionName, connectionName)
      const updates = (this as any).getDirtyAttributes()

      if (Object.keys(updates).length === 0) {
        return // Nothing to update
      }

      // Use session if provided (for transactions)
      const options = session ? { session } : {}
      await collection.updateOne({ _id: this._id as any }, { $set: updates }, options)
    }
  }
}
