# Product Requirements Document: Model Hooks for MongoDB ODM

## 1. Introduction

This document outlines the requirements for implementing model lifecycle hooks in the AdonisJS MongoDB ODM. This feature will allow developers to execute custom logic at various stages of a model's lifecycle, similar to the hooks functionality available in AdonisJS Lucid ORM.

## 2. Goals

- Provide a familiar and intuitive way for developers to tap into model lifecycle events.
- Enable custom logic execution before or after specific database operations (create, save, update, delete, find, fetch).
- Maintain API consistency with AdonisJS Lucid ORM hooks.
- Ensure hooks are executed reliably and in the correct order.
- Support both synchronous and asynchronous hook functions.
- Allow hooks to be defined as static methods on the model.

## 3. Target Users

- Developers using the AdonisJS MongoDB ODM who need to perform actions during model lifecycle events (e.g., data validation, data manipulation, logging, event emission).
- Developers familiar with AdonisJS Lucid ORM hooks who expect similar functionality.

## 4. Requirements

### 4.1. Supported Hooks

The ODM should support the following hooks, mirroring AdonisJS Lucid ORM:

**Static Hooks (defined as static methods on the model):**
The `Model` type in the signatures below refers to an instance of the specific model class where the hook is defined (e.g., `User` instance for a hook on the `User` model). The `ModelQueryBuilder` will be typed to the specific model (e.g., `ModelQueryBuilder<User>`).

- `beforeSave(model: Model)`: Executed before a model instance is saved (created or updated).
- `afterSave(model: Model)`: Executed after a model instance is saved.
- `beforeCreate(model: Model)`: Executed before a new model instance is created (persisted for the first time).
- `afterCreate(model: Model)`: Executed after a new model instance is created.
- `beforeUpdate(model: Model)`: Executed before an existing model instance is updated.
- `afterUpdate(model: Model)`: Executed after an existing model instance is updated.
- `beforeDelete(model: Model)`: Executed before a model instance is deleted.
- `afterDelete(model: Model)`: Executed after a model instance is deleted.
- `beforeFind(query: ModelQueryBuilder<Model>)`: Executed before a `find` operation (e.g., `Model.find()`, `Model.findOrFail()`, `Model.findBy()`). The hook receives the query builder instance, typed to the specific model.
- `afterFind(model: Model | null)`: Executed after a `find` operation. Receives the found model instance (typed to the specific model) or `null`.
- `beforeFetch(query: ModelQueryBuilder<Model>)`: Executed before a `fetch` operation (e.g., `Model.all()`, `query.all()`, `query.first()`). The hook receives the query builder instance, typed to the specific model.
- `afterFetch(models: Model[])`: Executed after a `fetch` operation. Receives an array of found model instances (typed to the specific model). For `query.first()`, this will be an array with one element or an empty array.

### 4.2. Hook Definition

- Hooks should be defined as static methods on the model class, decorated with corresponding hook decorators (e.g., `@beforeCreate()`, `@afterSave()`).
- Decorators should be imported from the ODM package.
- Hook methods should accept the specifically typed model instance or model-specific query builder as their first argument, as specified in section 4.1. This ensures full type safety and intellisense within the hook body.

### 4.3. Hook Execution

- Hooks should be executed automatically by the ODM during the respective lifecycle events.
- `before*` hooks should be executed before the main database operation.
- `after*` hooks should be executed after the main database operation has completed successfully.
- If a `before*` hook throws an error or returns `false` (for hooks that support it, TBD if any for MongoDB), the operation should be aborted.
- Hooks should support both synchronous and asynchronous (returning a `Promise`) functions. The ODM must `await` asynchronous hooks.
- Multiple hooks of the same type on a model should be executed in the order they are defined.

### 4.4. Data Modification in Hooks

- `beforeSave`, `beforeCreate`, `beforeUpdate` hooks should be able to modify the model instance before it's persisted.
- `beforeFind`, `beforeFetch` hooks should be able to modify the query builder instance (e.g., add a `where` clause).

### 4.5. Error Handling

- If a hook throws an error, the main operation should fail, and the error should be propagated.
- For operations within a transaction, if a hook fails, the transaction should be rolled back (if the ODM manages the transaction for the operation).

### 4.6. API Design

- The API for defining and using hooks should closely match the AdonisJS Lucid ORM hooks API to ensure a consistent developer experience.
- Developers will benefit from full intellisense and type-checking for model properties and query builder methods within their hook implementations.
- Example:

  ```typescript
  import { BaseModel, column, beforeCreate, afterSave } from '@your-namespace/mongodb-odm' // Adjust import path
  import { ModelQueryBuilder } from '@your-namespace/mongodb-odm' // Adjust import path for ModelQueryBuilder if needed

  export default class User extends BaseModel {
    @column()
    public email: string

    @column()
    public status: string

    @column()
    public credits: number

    @beforeCreate()
    public static setDefaultValues(user: User) {
      // user is specifically typed as User
      if (!user.status) {
        user.status = 'pending'
      }
      if (user.credits === undefined) {
        user.credits = 0 // Access specific User properties with intellisense
      }
    }

    @afterSave()
    public static logSave(user: User) {
      // user is specifically typed as User
      console.log(`User ${user.email} with status ${user.status} saved.`)
    }

    @beforeFetch()
    public static onlyActiveUsers(query: ModelQueryBuilder<User>) {
      // query is ModelQueryBuilder<User>
      query.where('status', 'active') // Use query builder methods with intellisense
    }
  }
  ```

## 5. Non-Goals

- Instance-level hooks (hooks defined as methods on the model instance rather than static methods). The initial implementation will focus on static hooks to align with Lucid.
- Global hooks (hooks that apply to all models).
- Event system for hooks (e.g., emitting events that can be listened to externally). Hooks will be direct method calls.

## 6. Future Considerations

- Instance-level hooks.
- More granular hooks if specific MongoDB operations warrant them.
- Possibility of disabling hooks for certain operations.

## 7. Success Metrics

- Developers can successfully implement and use all supported hooks.
- The API is intuitive and consistent with AdonisJS Lucid ORM.
- Hooks execute reliably and in the correct order.
- No significant performance degradation due to hook execution.
- Comprehensive test coverage for all hook types and scenarios.
