import 'reflect-metadata'
import type { ApplicationService } from '@adonisjs/core/types'
import { MongoDatabaseManager } from '../src/database_manager.js'
import { BaseModel } from '../src/base_model/base_model.js'
import { ModelQueryBuilder } from '../src/query_builder/model_query_builder.js'
import { PersistenceManager } from '../src/base_model/persistence_manager.js'
import { SeederManager } from '../src/seeders/seeder_manager.js'
import { OdmConfig } from '../src/types/index.js'

declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    'mongodb.manager': MongoDatabaseManager
    'mongodb': MongoDatabaseManager
    'odm.seeder': SeederManager
  }
}

/**
 * MongoDB ODM Service Provider for AdonisJS
 */
export default class MongodbProvider {
  protected app: ApplicationService

  constructor(app: ApplicationService) {
    this.app = app
  }

  private manager?: MongoDatabaseManager

  /**
   * Register bindings to the container
   */
  register() {
    // Create the database manager instance
    const config = this.app.config.get<OdmConfig>('odm')

    if (!config) {
      throw new Error(
        'ODM configuration not found. Please ensure config/odm.ts is properly configured.'
      )
    }

    if (!config.connections) {
      throw new Error('ODM connections not configured. Please check your config/odm.ts file.')
    }

    this.manager = new MongoDatabaseManager(config)

    // Store it in the container
    this.app.container.bind('mongodb.manager', () => this.manager!)
    this.app.container.bind('mongodb', () => this.manager!)

    // Also register the class itself for the service pattern
    this.app.container.bind(MongoDatabaseManager, () => this.manager!)

    // Register SeederManager as a singleton
    this.app.container.singleton('odm.seeder', () => {
      return new SeederManager(config, this.manager!)
    })

    // Also register the class itself for the service pattern
    this.app.container.bind(SeederManager, () => {
      return this.app.container.make('odm.seeder')
    })
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

    // Extend PersistenceManager with database functionality

    // Override the performInsert method in PersistenceManager
    PersistenceManager.prototype.performInsert = async function (session?: any) {
      const model = this.model
      const constructor = model.constructor as typeof BaseModel
      const collectionName = constructor.getCollectionName()
      const connectionName = constructor.getConnection()

      const collection = manager.collection(collectionName, connectionName)
      const document = model.toDocument()

      // Remove _id if it's undefined to let MongoDB generate it
      if (!document._id) {
        delete document._id
      }

      // Use session if provided (for transactions)
      const options = session ? { session } : {}
      const result = await collection.insertOne(document as any, options)
      model._id = result.insertedId
    }

    // Override the performUpdate method in PersistenceManager
    PersistenceManager.prototype.performUpdate = async function (session?: any) {
      const model = this.model
      if (!model._id) {
        throw new Error('Cannot update model without an ID')
      }

      const constructor = model.constructor as typeof BaseModel
      const collectionName = constructor.getCollectionName()
      const connectionName = constructor.getConnection()

      const collection = manager.collection(collectionName, connectionName)
      const updates = model.getDirtyAttributes()

      if (Object.keys(updates).length === 0) {
        return // Nothing to update
      }

      // Use session if provided (for transactions)
      const options = session ? { session } : {}
      await collection.updateOne({ _id: model._id as any }, { $set: updates }, options)
    }
  }
}
