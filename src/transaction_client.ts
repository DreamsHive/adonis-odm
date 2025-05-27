import {
  Collection,
  Db,
  Document,
  ClientSession,
  TransactionOptions as MongoTransactionOptions,
} from 'mongodb'
import { BaseModel } from './base_model/base_model.js'
import { ModelQueryBuilder } from './query_builder/model_query_builder.js'
import { ModelConstructor } from './types/index.js'
import type { MongoDatabaseManager } from './database_manager.js'

export interface MongoTransactionClient {
  commit(): Promise<void>
  rollback(): Promise<void>
  collection<T extends Document = Document>(name: string): Collection<T>
  query<T extends BaseModel = BaseModel>(
    modelConstructor: ModelConstructor
  ): ModelQueryBuilder<Document, T>
  getSession(): ClientSession
}

export class ConcreteMongoTransactionClient implements MongoTransactionClient {
  constructor(
    private session: ClientSession,
    private manager: MongoDatabaseManager,
    private connectionName: string
  ) {}

  async commit(): Promise<void> {
    await this.session.commitTransaction()
    this.session.endSession()
  }

  async rollback(): Promise<void> {
    await this.session.abortTransaction()
    this.session.endSession()
  }

  collection<T extends Document = Document>(name: string): Collection<T> {
    // Get the Db instance for the connection, then get collection
    const dbInstance = this.manager.db(this.connectionName)
    return dbInstance.collection<T>(name)
  }

  query<T extends BaseModel = BaseModel>(
    modelConstructor: ModelConstructor
  ): ModelQueryBuilder<Document, T> {
    const collectionName = modelConstructor.getCollectionName()
    const collectionInstance = this.collection(collectionName)
    return new ModelQueryBuilder<Document, T>(collectionInstance, modelConstructor, this)
  }

  getSession(): ClientSession {
    return this.session
  }
}
