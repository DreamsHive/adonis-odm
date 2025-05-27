# Product Requirements Document: Database Transactions for MongoDB ODM

## 1. Introduction

This document outlines the requirements for implementing database transaction support in the AdonisJS MongoDB ODM. This feature will allow developers to perform multiple database operations as a single atomic unit, ensuring data consistency and integrity, similar to the transaction functionality in AdonisJS Lucid ORM.

## 2. Goals

- Provide a familiar and intuitive API for database transactions, consistent with AdonisJS Lucid.
- Enable atomic execution of multiple create, update, and delete operations.
- Ensure that if any operation within a transaction fails, all preceding operations in that transaction are rolled back.
- Support both managed (callback-based) and manual transaction control (explicit commit/rollback).
- Allow model instances and query builders to be associated with a transaction.
- Provide clear error handling and propagation for transaction failures.
- Ensure type-safety and provide robust Intellisense for developers using transactions.

## 3. Target Users

- Developers using the AdonisJS MongoDB ODM who need to perform multiple related database operations atomically.
- Developers familiar with AdonisJS Lucid ORM transactions who expect a similar, seamless experience.

## 4. Requirements

### 4.1. Transaction Initiation

- **Managed Transactions:**
  - Method: `MongoDatabaseManager.transaction(async (trx: MongoTransactionClient) => { ...operations... }, options?: TransactionOptions)`
  - The `trx` object passed to the callback will be a transaction-specific client.
  - Operations performed using this `trx` client (or models/queries associated with it) will be part of the transaction.
  - The transaction should automatically commit if the callback completes successfully.
  - The transaction should automatically roll back if the callback throws an error.
  - The `transaction` method should be ables to return a value from the callback.
- **Manual Transactions:**
  - Method: `MongoDatabaseManager.transaction(options?: TransactionOptions)` returns `Promise<MongoTransactionClient>`
  - The returned `trx` object will be a transaction-specific client.
  - Developer explicitly calls `trx.commit()` or `trx.rollback()`.

### 4.2. Transaction Client (`MongoTransactionClient`)

- The `MongoTransactionClient` will be an instance that mirrors the API of the regular `MongoClient` or `Db` from the `MongoDatabaseManager` but ensures all operations are part of the ongoing transaction.
- It should provide methods to get a transaction-specific `Collection` instance.
- It should have `commit()` and `rollback()` methods (for manual transactions).
- It should potentially allow starting nested transactions (savepoints if MongoDB sessions support them, or emulate if necessary).

### 4.3. Integrating with Models and Query Builders

- **Model Instance:**
  - `model.useTransaction(trx: MongoTransactionClient)`: Associates a model instance with a transaction. Subsequent `save()`, `delete()` operations on this instance will use the transaction.
  - `model.$trx`: Property to access the transaction client associated with the model instance.
  - Static `create()`, `updateOrCreate()`, etc., methods on the model should accept an optional `{ client: trx }` option.
  - `Model.find(id, { client: trx })`, `Model.findOrFail(id, { client: trx })`, etc.
- **Query Builder:**
  - `Model.query({ client: trx })`: Starts a query builder associated with the transaction.
  - `queryBuilder.useTransaction(trx: MongoTransactionClient)`: Associates an existing query builder instance with a transaction.
  - All operations (`first`, `all`, `update`, `delete`, `save` via model methods called from query results) derived from a transaction-aware query builder must use that transaction.
- **Relationship Operations:**
  - If a parent model instance is associated with a transaction, related operations (e.g., `user.related('profile').create(...)`) should implicitly use the same transaction.

### 4.4. Type Safety and Intellisense

- The `MongoTransactionClient` type should provide strong typing for all its methods.
- Callbacks in managed transactions should correctly infer the type of the `trx` argument.
- Options for `useTransaction` and `{ client: trx }` should be clearly typed.
- Intellisense should guide developers on available transaction methods and options.

### 4.5. Error Handling

- Errors within a managed transaction callback should lead to an automatic rollback and propagate the error.
- Errors during `commit()` or `rollback()` on a manual transaction should be thrown.
- If an operation within a transaction fails (e.g., a unique constraint violation during an insert), the transaction should become uncommittable, and subsequent attempts to commit should fail or the entire transaction should be rolled back by the driver/ODM.

### 4.6. Transaction Options

- The `TransactionOptions` object (passed to `db.transaction()`) should allow specifying MongoDB-specific transaction options, such as:
  - `readConcern`
  - `writeConcern`
  - `readPreference` (if applicable and respected by MongoDB transactions)
- This aligns with Lucid's ability to pass `isolationLevel`.

### 4.7. API Design (Examples)

#### Managed Transaction:

```typescript
import db from '#services/mongodb_service' // Assuming a service similar to Lucid's db
import User from '#models/user'
import Profile from '#models/profile'

const newUser = await db.transaction(async (trx) => {
  const user = new User()
  user.email = 'test@example.com'
  user.useTransaction(trx) // Associate model with transaction
  await user.save()

  // Create related profile, implicitly uses user's transaction
  const profile = await user.related('profile').create({
    firstName: 'Test',
    lastName: 'User',
  })
  // If we pass {client: trx} to create, it will also use the transaction
  // const profile = await Profile.create({ userId: user._id, firstName: 'Test'}, { client: trx });

  return user // Value returned from the transaction
})
console.log(newUser.$isPersisted) // true
```

#### Manual Transaction:

```typescript
import db from '#services/mongodb_service'
import User from '#models/user'

const trx = await db.transaction()
try {
  const user = await User.create({ email: 'manual@example.com' }, { client: trx })

  // Perform another operation
  await User.query({ client: trx }).where('_id', user._id).update({ age: 30 })

  await trx.commit()
  console.log('Transaction committed')
} catch (error) {
  await trx.rollback()
  console.error('Transaction rolled back', error)
}
```

### 4.8. Hooks Integration

- Model lifecycle hooks (`beforeSave`, `afterSave`, etc.) should execute correctly within the context of a transaction.
- If a `before*` hook aborts an operation (e.g., by returning `false` or throwing an error), the transaction should be handled appropriately (e.g., rollback for managed transactions, or allow manual rollback).
- Hooks should have access to `model.$trx` if the model is part of a transaction.

## 5. Non-Goals

- Distributed transactions across different MongoDB clusters or other database systems (focus is on single MongoDB replica set/sharded cluster transactions).
- Automatic retry mechanisms for transient transaction errors (e.g., transient network issues, write conflicts that MongoDB might ask to retry). This can be a future enhancement.

## 6. Future Considerations

- Support for global transactions that can be implicitly used by all queries unless specified otherwise (less common in Node.js due to its single-threaded nature but worth considering).
- More sophisticated savepoint management if MongoDB driver offers more granular control beyond basic nested transaction semantics.
- Transaction events (e.g., `beforeCommit`, `afterCommit`, `beforeRollback`, `afterRollback`).

## 7. Success Metrics

- Developers can reliably perform atomic operations using the transaction API.
- The API is intuitive and consistent with AdonisJS Lucid, reducing the learning curve.
- Transactions correctly roll back on errors, maintaining data integrity.
- Type safety and Intellisense significantly improve developer experience and reduce runtime errors.
- Minimal performance overhead compared to non-transactional operations for simple cases (acknowledging that transactions inherently have some overhead).
- Comprehensive test coverage for various transaction scenarios, including concurrent operations (if feasible in a test environment).
