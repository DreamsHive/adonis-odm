import { ApplicationService } from '@adonisjs/core/types'
import { MongoDatabaseManager } from '../src/database_manager.js'
import { BaseModel } from '../src/base_model/base_model.js'
import { ModelQueryBuilder } from '../src/query_builder/model_query_builder.js'
import { MongoConfig } from '../src/types/index.js'

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
    const config = this.app.config.get<MongoConfig>('mongo')
    this.manager = new MongoDatabaseManager(config)

    // Store it in the container using bind with any type
    ;(this.app.container as any).bind('mongodb.manager', () => this.manager)
    ;(this.app.container as any).bind('mongodb', () => this.manager)
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
    if (this.app.getEnvironment() !== 'test' && this.manager) {
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
    BaseModel.query = function (this: typeof BaseModel) {
      const collectionName = this.getCollectionName()
      const connectionName = this.getConnection()

      const collection = manager.collection(collectionName, connectionName)
      return new ModelQueryBuilder(collection, this as any)
    }

    // Override the performInsert method
    BaseModel.prototype['performInsert'] = async function (this: BaseModel) {
      const constructor = this.constructor as typeof BaseModel
      const collectionName = constructor.getCollectionName()
      const connectionName = constructor.getConnection()

      const collection = manager.collection(collectionName, connectionName)
      const document = this.toDocument()

      // Remove _id if it's undefined to let MongoDB generate it
      if (!document._id) {
        delete document._id
      }

      const result = await collection.insertOne(document as any)
      this._id = result.insertedId
    }

    // Override the performUpdate method
    BaseModel.prototype['performUpdate'] = async function (this: BaseModel) {
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

      await collection.updateOne({ _id: this._id as any }, { $set: updates })
    }
  }
}
