# Technical Specification Document: Database Transactions for MongoDB ODM

## 1. Introduction

This document details the technical design for implementing database transaction support in the AdonisJS MongoDB ODM, based on the [TRANSACTIONS_PRD.md](./TRANSACTIONS_PRD.md). It covers architectural changes, API contracts, and integration points within the existing ODM.

## 2. System Architecture

### 2.1. `MongoDatabaseManager` Enhancements

- The `MongoDatabaseManager` (src/database_manager.ts) will be the entry point for initiating transactions.
- New method: `transaction(callbackOrOptions?, options?): Promise<any | MongoTransactionClient>`
  - If a `callback` function is provided, it signifies a managed transaction.
    - The manager will start a MongoDB session and a transaction.
    - It will pass a `MongoTransactionClient` instance to the callback.
    - It will handle `commit` on successful callback execution or `rollback` on error.
    - It will return the callback's return value.
  - If no `callback` is provided, it signifies a manual transaction.
    - The manager will start a MongoDB session and transaction.
    - It will return a `Promise<MongoTransactionClient>`.
  - `options` (optional `TransactionOptions`): MongoDB native transaction options like `readConcern`, `writeConcern`.

### 2.2. `MongoTransactionClient`

- This new class/interface will represent an active transaction.
- It will hold a MongoDB `ClientSession` object.
- **API:**
  - `commit(): Promise<void>`: Commits the transaction.
  - `rollback(): Promise<void>`: Aborts the transaction.
  - `collection<T extends Document = Document>(name: string): Collection<T>`: Returns a `Collection` instance that will operate within this transaction's session.
  - `query<T extends BaseModel = BaseModel>(modelConstructor: ModelConstructor): ModelQueryBuilder<Document, T>`: Returns a `ModelQueryBuilder` pre-configured with this transaction client.
  - `getSession(): ClientSession`: Returns the underlying MongoDB `ClientSession`.
  - Potentially `transaction(options?): Promise<MongoTransactionClient>` for nested transactions/savepoints if feasible and makes sense with MongoDB's session model.

### 2.3. `BaseModel` Enhancements

- New public property: `public $trx?: MongoTransactionClient`
  - Stores the transaction client if the model instance is associated with one.
- New public method: `useTransaction(trx: MongoTransactionClient): this`
  - Assigns the provided `trx` to `this.$trx`.
- Modification to `save()`, `delete()`:
  - These methods will check if `this.$trx` exists. If so, they will use the session from `this.$trx.getSession()` for database operations.
  - `performInsert()` and `performUpdate()` will need to accept an optional `ClientSession` argument.
- Static methods (`create`, `updateOrCreate`, `find`, `findOrFail`, `findBy`, `findByOrFail`, `first`, `firstOrFail`, `all`) will be updated:
  - They will accept an optional `options: { client?: MongoTransactionClient }` argument.
  - If `options.client` is provided, the operation (and any new model instances created) will be associated with that transaction.

### 2.4. `ModelQueryBuilder` Enhancements

- New internal property: `private transactionClient?: MongoTransactionClient`.
- New public method: `useTransaction(trx: MongoTransactionClient): this`
  - Assigns `trx` to `this.transactionClient`.
- Constructor modification: `constructor(collection, modelConstructor, client?: MongoTransactionClient)`
  - If `client` is passed (e.g., from `Model.query({ client: trx })`), it sets `this.transactionClient`.
- All database operation methods (`first`, `fetch`, `update`, `delete`, etc.) will be modified:
  - They will check if `this.transactionClient` exists.
  - If it does, they will use `this.transactionClient.getSession()` when performing MongoDB operations (e.g., `collection.find(filters, { session: trxSession })`).
  - When hydrating models from query results (e.g., in `first()`, `fetch()`), if `this.transactionClient` is set, the new model instances should also be associated with this transaction (i.e., `model.useTransaction(this.transactionClient)` should be called internally).
- `loadReferencedDocuments` will need to propagate the transaction client to sub-queries for related models.

### 2.5. Relationship Handling

- When a model operation involving relationships occurs (e.g., `user.related('profile').create()`), if `user.$trx` is set, the transaction should be implicitly passed to the relationship operation.
- This means the `createHasOneProxy`, `createHasManyProxy`, `createBelongsToProxy` in `src/relationships/relationship_proxies.ts` might need to be aware of the parent model's transaction state or the methods they call (`create`, `save` on related model) should correctly pick up the transaction if `client` option is passed. The simplest approach is that `user.related('profile')` would return a query builder or a mechanism that is already transaction-aware if `user` is.

## 3. Detailed Design

### 3.1. `MongoDatabaseManager` (`src/database_manager.ts`)

```typescript
// ... existing imports
import { ClientSession, TransactionOptions as MongoTransactionOptions } from 'mongodb'
import { MongoTransactionClient, ConcreteMongoTransactionClient } from './transaction_client' // New file

export interface TransactionOptions extends MongoTransactionOptions {}

export class MongoDatabaseManager {
  // ... existing properties and methods

  public async transaction(options?: TransactionOptions): Promise<MongoTransactionClient>
  public async transaction<TResult = any>(
    callback: (trx: MongoTransactionClient) => Promise<TResult>,
    options?: TransactionOptions
  ): Promise<TResult>
  public async transaction<TResult = any>(
    callbackOrOptions?: ((trx: MongoTransactionClient) => Promise<TResult>) | TransactionOptions,
    options?: TransactionOptions
  ): Promise<TResult | MongoTransactionClient> {
    const actualOptions = typeof callbackOrOptions === 'function' ? options : callbackOrOptions
    const connectionName = this.config.connection // Get default connection
    const mongoClient = this.connection(connectionName)
    const session = mongoClient.startSession()

    const trxClient = new ConcreteMongoTransactionClient(session, this, connectionName)

    if (typeof callbackOrOptions === 'function') {
      const callback = callbackOrOptions
      try {
        await session.withTransaction(async (sessionWithAttempt) => {
          // Note: MongoDB driver's withTransaction might retry. Ensure trxClient uses the current sessionWithAttempt.
          // For simplicity, we might need to manage commit/abort explicitly if ConcreteMongoTransactionClient
          // is not designed to handle retries by the driver's withTransaction.
          // Let's assume for now we pass the session to the callback and manage it manually inside this block
          // if the driver's `withTransaction` is too opaque or doesn't fit well.

          // Alternative: Explicit start, commit, abort if `withTransaction` is problematic
          // session.startTransaction(actualOptions);
          // const result = await callback(trxClientWithSession); // trxClient must use this session
          // await session.commitTransaction();
          // return result;

          // Using driver's withTransaction which handles retries for transient errors
          const result = await callback(trxClient) // trxClient needs to use the session passed by withTransaction
          // Commit is handled by withTransaction if callback doesn't throw
          return result
        }, actualOptions)
        // If withTransaction callback returns a value, it should be returned here.
        // This needs to be verified with the driver's API for withTransaction
        // For now, assume callback returns Promise<TResult> and withTransaction returns Promise<void>
        // So we might need to execute the callback, get result, then driver handles commit/abort.

        // Re-evaluating: The driver's `withTransaction` handles commit/abort and returns the callback result.
        return await session.withTransaction(async () => {
          return callback(trxClient)
        }, actualOptions)
      } catch (error) {
        // Rollback is handled by withTransaction on error
        // console.error('Transaction failed:', error);
        throw error
      } finally {
        session.endSession()
      }
    } else {
      // Manual transaction: Start it, but user must commit/rollback
      session.startTransaction(actualOptions)
      return trxClient
    }
  }
}
```

### 3.2. `MongoTransactionClient` (`src/transaction_client.ts` - New File)

```typescript
import {
  Collection,
  Db,
  Document,
  ClientSession,
  TransactionOptions as MongoTransactionOptions,
  MongoClient,
} from 'mongodb'
import { BaseModel } from './base_model/base_model.js'
import { ModelQueryBuilder } from './query_builder/model_query_builder.js'
import { ModelConstructor } from './types/index.js'
import type { MongoDatabaseManager } from './database_manager'

export interface MongoTransactionClient {
  commit(): Promise<void>
  rollback(): Promise<void>
  collection<T extends Document = Document>(name: string): Collection<T>
  query<T extends BaseModel = BaseModel>(
    modelConstructor: ModelConstructor<T>
  ): ModelQueryBuilder<Document, T>
  getSession(): ClientSession
  // manager: MongoDatabaseManager; // To access underlying db/connection with transaction
}

export class ConcreteMongoTransactionClient implements MongoTransactionClient {
  constructor(
    private session: ClientSession,
    private manager: MongoDatabaseManager, // To get underlying Db or Collection with session
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
    // The collection needs to be aware of the session for its operations
    // The MongoDB driver's collection methods (find, insertOne, etc.) accept a session option.
    // We need to wrap this or ensure ModelQueryBuilder passes it.
    // For direct collection access, it's harder to enforce session usage automatically.
    // This might return a regular collection, and operations on it must explicitly pass the session.
    // OR, this returns a session-aware wrapper around Collection.
    // For simplicity, let's assume ModelQueryBuilder handles session passing.
    return dbInstance.collection<T>(name)
  }

  query<T extends BaseModel = BaseModel>(
    modelConstructor: ModelConstructor<T>
  ): ModelQueryBuilder<Document, T> {
    const collectionName = modelConstructor.getCollectionName()
    const collectionInstance = this.collection(collectionName)
    return new ModelQueryBuilder<Document, T>(collectionInstance, modelConstructor, this)
  }

  getSession(): ClientSession {
    return this.session
  }
}
```

### 3.3. `BaseModel` (`src/base_model/base_model.ts`)

```typescript
// ... existing imports
import type { MongoTransactionClient } from '../transaction_client' // Adjust path
import type { ClientSession } from 'mongodb'

export class BaseModel {
  // ... existing properties
  public $trx?: MongoTransactionClient

  // ... constructor ...

  public useTransaction(trx: MongoTransactionClient): this {
    this.$trx = trx
    return this
  }

  protected async performInsert(session?: ClientSession): Promise<void> {
    const document = this.toDocument()
    if (!document._id) delete document._id

    const collection = (this.constructor as typeof BaseModel).getCollection() // Assume getCollection() gives DB collection
    const options = session ? { session } : {}
    const result = await collection.insertOne(document, options)
    this._id = result.insertedId
  }

  protected async performUpdate(session?: ClientSession): Promise<void> {
    if (!this._id) throw new Error('Cannot update model without an ID')
    const updates = this.getDirtyAttributes()
    if (Object.keys(updates).length === 0) return

    const collection = (this.constructor as typeof BaseModel).getCollection()
    const options = session ? { session } : {}
    await collection.updateOne({ _id: this._id }, { $set: updates }, options)
  }

  async save(): Promise<this> {
    // ... (hooks execution logic) ...
    const session = this.$trx?.getSession()

    // ... existing logic for isNew, applyTimestamps ...
    if (isNew) {
      await this.performInsert(session)
    } else {
      await this.performUpdate(session)
    }
    // ... (rest of save logic, hooks execution) ...
    return this
  }

  async delete(): Promise<boolean> {
    // ... (check $isPersisted, _id, beforeDelete hook) ...
    const session = this.$trx?.getSession()
    const collection = (this.constructor as typeof BaseModel).getCollection()
    const options = session ? { session } : {}
    const result = await collection.deleteOne({ _id: this._id }, options)

    // ... (update $isPersisted, afterDelete hook) ...
    return result.deletedCount > 0
  }

  // Example for a static method
  static async find<T extends BaseModel = BaseModel>(
    this: ModelConstructor<T> & typeof BaseModel,
    id: string | ObjectId,
    options?: { client?: MongoTransactionClient }
  ): Promise<T | null> {
    let query = (this as any).query()
    if (options?.client) {
      query = query.useTransaction(options.client)
    }
    return await query.where('_id', id).first()
  }

  // Similar changes for create, createMany, updateOrCreate, findOrFail, etc.
  static async create<T extends BaseModel>(
    this: new (...args: any[]) => T,
    attributes: CreateAttributes<T>,
    options?: { client?: MongoTransactionClient }
  ): Promise<T> {
    const instance = new this(attributes)
    if (options?.client) {
      instance.useTransaction(options.client)
    }
    await instance.save()
    return instance
  }
}
```

### 3.4. `ModelQueryBuilder` (`src/query_builder/model_query_builder.ts`)

```typescript
// ... existing imports
import type { MongoTransactionClient } from '../transaction_client' // Adjust path
import type { ClientSession } from 'mongodb'

export class ModelQueryBuilder<
  T extends Document = Document,
  TModel extends BaseModel = BaseModel,
> {
  // ... existing properties
  private transactionClient?: MongoTransactionClient

  constructor(
    private collection: Collection<T>,
    private modelConstructor: ModelConstructor<TModel>,
    transactionClient?: MongoTransactionClient // Added parameter
  ) {
    if (transactionClient) {
      this.transactionClient = transactionClient
    }
  }

  public useTransaction(trx: MongoTransactionClient): this {
    this.transactionClient = trx
    return this
  }

  private getSession(): ClientSession | undefined {
    return this.transactionClient?.getSession()
  }

  async first(): Promise<TModel | null> {
    // ... (hooks execution) ...
    const mongoOptions: FindOptions<T> = { session: this.getSession() }
    if (this.selectFields) mongoOptions.projection = this.selectFields
    if (Object.keys(this.sortOptions).length > 0) mongoOptions.sort = this.sortOptions as Sort

    const result = await this.collection.findOne(this.getFinalFilters(), mongoOptions)
    // ... (hydration, loadRelations, afterFind/afterFetch hooks) ...
    if (model && this.transactionClient) {
      model.useTransaction(this.transactionClient) // Associate transaction with loaded model
    }
    return model as TModel
  }

  async fetch(): Promise<TModel[]> {
    // ... (hooks execution, distinct/aggregation handling) ...
    const mongoOptions: FindOptions<T> = { session: this.getSession() }
    // ... (set projection, sort, limit, skip on mongoOptions) ...

    const cursor = this.collection.find(this.getFinalFilters(), mongoOptions)
    const results = await cursor.toArray()
    // ... (deserialization, model instantiation) ...
    modelInstances.forEach((model) => {
      if (this.transactionClient) {
        model.useTransaction(this.transactionClient)
      }
    })
    // ... (loadRelations, afterFetch hook) ...
    return modelInstances as TModel[]
  }

  async update(updateData: Record<string, any>): Promise<number> {
    // ... (serialize updateData, add updatedAt) ...
    const mongoOptions = { session: this.getSession() }
    const result = await this.collection.updateMany(
      this.getFinalFilters(),
      { $set: serializedData },
      mongoOptions
    )
    return result.modifiedCount || 0
  }

  async delete(): Promise<number> {
    const mongoOptions = { session: this.getSession() }
    const result = await this.collection.deleteMany(this.getFinalFilters(), mongoOptions)
    return result.deletedCount || 0
  }

  // loadReferencedDocuments needs to pass the transactionClient to sub-queries
  private async loadBelongsToRelationship(
    // ... params ...
    callback?: (query: ModelQueryBuilder<any, any>) => void
  ): Promise<void> {
    // ...
    let relatedQuery = RelatedModel.query()
    if (this.transactionClient) {
      relatedQuery = relatedQuery.useTransaction(this.transactionClient)
    }
    relatedQuery = relatedQuery.whereIn(dbFieldName, foreignKeys)
    if (callback) callback(relatedQuery)
    // ...
  }
  // Similar changes for loadHasOneRelationship and loadHasManyRelationship

  clone(): ModelQueryBuilder<T, TModel> {
    const cloned = new ModelQueryBuilder<T, TModel>(
      this.collection,
      this.modelConstructor,
      this.transactionClient
    )
    // ... copy other properties ...
    return cloned
  }
}
```

### 3.5 Type Definitions (`src/types/index.ts`)

```typescript
// ... existing types ...
import type { MongoTransactionClient } from '../transaction_client' // Adjust path
import type { ClientSession, TransactionOptions as MongoLibTransactionOptions } from 'mongodb'

export interface ModelOperationOptions {
  client?: MongoTransactionClient
}

// For MongoDatabaseManager.transaction options
export interface TransactionOptions extends MongoLibTransactionOptions {}

// ModelConstructor might need to reflect the new options param
export interface ModelConstructor<T extends BaseModel = BaseModel> {
  new (...args: any[]): T
  getMetadata(): ModelMetadata
  getCollectionName(): string
  getConnection(): string
  getCollection(): Collection // Helper to get underlying collection

  query(options?: ModelOperationOptions): ModelQueryBuilder<Document, T>
  create(attributes: any, options?: ModelOperationOptions): Promise<T>
  // ... other static methods with options ...
}
```

## 4. Error Handling and Edge Cases

- **Session Management**: `ClientSession` must be correctly passed to all MongoDB operations involved in the transaction. It must be ended appropriately (`session.endSession()`) after commit/rollback or by the `MongoDatabaseManager` in managed transactions.
- **Concurrent Operations**: While MongoDB transactions are ACID, consider the implications if developers try to use the same `MongoTransactionClient` for concurrent async operations outside of a single `await` chain. MongoDB sessions are not designed for concurrent use within the same session by multiple operations simultaneously.
- **Hook Failures**: If a `before*` hook throws an error or returns `false` within a managed transaction, the `MongoDatabaseManager` should catch this and trigger a rollback. For manual transactions, the error should propagate, and the user is responsible for rollback.
- **TransactionAlreadyCommitted/Aborted**: The `MongoTransactionClient` should handle or prevent operations if `commit()` or `rollback()` has already been called. The underlying MongoDB driver usually throws errors in such cases.

## 5. Testing Strategy

- Unit tests for `MongoDatabaseManager.transaction` (managed and manual modes).
- Unit tests for `MongoTransactionClient` (commit, rollback, collection, query).
- Integration tests for `BaseModel` methods (`save`, `delete`, static methods) with and without transactions.
- Integration tests for `ModelQueryBuilder` operations (`first`, `fetch`, `update`, `delete`) with and without transactions.
- Tests for relationship operations within transactions.
- Tests for hook execution within transactions (including abortion scenarios).
- Tests for error handling and rollback behavior.
- Tests for passing transaction options (e.g., readConcern, writeConcern).

This TSD provides a blueprint. Specific implementation details, especially around session propagation and the exact API of `MongoTransactionClient`, might evolve during development.
