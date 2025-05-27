# Technical Specification Document: Model Hooks for MongoDB ODM

## 1. Introduction

This document details the technical design for implementing model lifecycle hooks in the AdonisJS MongoDB ODM. It builds upon the requirements specified in the [HOOKS_PRD.md](./HOOKS_PRD.md) and outlines the proposed architecture, data structures, and implementation details.

## 2. System Architecture

### 2.1. Hook Decorators

- A set of decorators (`@beforeSave`, `@afterSave`, `@beforeCreate`, etc.) will be created in `src/decorators/hooks.ts` (or a similar location).
- These decorators will register the decorated static method along with its associated hook type into the model's metadata.
- The model metadata (currently stored in `BaseModel.MODEL_METADATA`) will be extended to store an array or map of registered hooks.

  ```typescript
  // Example in src/types/index.ts or model_metadata.ts
  export interface ModelMetadata {
    // ... existing metadata
    hooks: Map<string, string[]> // Key: hook type (e.g., 'beforeCreate'), Value: array of static method names
  }
  ```

### 2.2. Hook Invocation Mechanism

- The `BaseModel` and `ModelQueryBuilder` classes will be modified to invoke registered hooks at the appropriate lifecycle stages.
- A helper function, say `executeHooks(target: BaseModel | ModelQueryBuilder<any, any>, hookType: string, modelClass: typeof BaseModel, ...args: any[])`, will be responsible for retrieving and executing hooks from the model's metadata.
  - The `target` parameter will be the actual, specifically typed model instance or a `ModelQueryBuilder` instance generic over the specific model type.
- This function will handle both synchronous and asynchronous hook methods, ensuring `await` is used for promises.
- It will iterate through all registered hooks for a given type and execute them sequentially.

### 2.3. Integration Points

**BaseModel Methods:**

- `save()`: Invoke `beforeSave`. If it's a new model, invoke `beforeCreate`. After successful DB operation, invoke `afterSave` and `afterCreate` (if new) or `afterUpdate` (if existing).
- `delete()`: Invoke `beforeDelete` before DB operation and `afterDelete` after successful DB operation.
- Static `create()`: Internally, this will instantiate a model and call `save()`, so hooks will be triggered via the `save()` method flow.
- Static `updateOrCreate()`: Will need careful integration to trigger `beforeUpdate/afterUpdate` or `beforeCreate/afterCreate` and `beforeSave/afterSave` appropriately based on whether an update or create occurs.

**ModelQueryBuilder Methods:**

- `first()` (and its variants like `findOrFail`): Invoke `beforeFetch` with the query builder before executing the query. Invoke `afterFetch` with the array of models (or empty/single model array) after retrieval. For `find` operations (e.g., `Model.find()`), `beforeFind` and `afterFind` will also be triggered.
- `all()` / `fetch()`: Invoke `beforeFetch` with the query builder. Invoke `afterFetch` with the array of models after retrieval.
- `paginate()`: Invoke `beforeFetch` with the query builder. Invoke `afterFetch` with the array of models for the current page.

  _Note for `find` vs `fetch` hooks:_ `beforeFind`/`afterFind` are specific to operations that target a single record by a unique identifier (like `Model.find(id)`). `beforeFetch`/`afterFetch` are for operations that can return multiple records or a single record based on broader query criteria.

## 3. Detailed Design

### 3.1. Hook Decorators (`src/decorators/hooks.ts`)

```typescript
import { BaseModel } from '../base_model/base_model.js' // Adjust path
// No direct import of MODEL_METADATA needed here if getMetadata() is robust

function createHookDecorator(hookType: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    // target is the static side of the class (the constructor function)
    const modelClass = target as typeof BaseModel
    const metadata = modelClass.getMetadata()

    if (!metadata.hooks) {
      metadata.hooks = new Map<string, string[]>()
    }

    const hooksForType = metadata.hooks.get(hookType) || []
    if (!hooksForType.includes(propertyKey)) {
      // Avoid duplicate registration
      hooksForType.push(propertyKey)
    }
    metadata.hooks.set(hookType, hooksForType)
  }
}

export const beforeSave = () => createHookDecorator('beforeSave')
export const afterSave = () => createHookDecorator('afterSave')
export const beforeCreate = () => createHookDecorator('beforeCreate')
export const afterCreate = () => createHookDecorator('afterCreate')
export const beforeUpdate = () => createHookDecorator('beforeUpdate')
export const afterUpdate = () => createHookDecorator('afterUpdate')
export const beforeDelete = () => createHookDecorator('beforeDelete')
export const afterDelete = () => createHookDecorator('afterDelete')
export const beforeFind = () => createHookDecorator('beforeFind')
export const afterFind = () => createHookDecorator('afterFind')
export const beforeFetch = () => createHookDecorator('beforeFetch')
export const afterFetch = () => createHookDecorator('afterFetch')
```

### 3.2. Hook Execution Logic (`src/base_model/hooks_executor.ts` or similar)

```typescript
import { BaseModel } from './base_model.js' // Adjust path
import { ModelQueryBuilder } from '../query_builder/model_query_builder.js' // Adjust path

export async function executeHooks<M extends BaseModel, Q extends ModelQueryBuilder<any, M>>(
  target: M | Q, // Target is the specific model instance or its query builder
  hookType: string,
  // modelClass is used to access the static hook methods and metadata
  modelClass: typeof BaseModel & { new (...args: any[]): M },
  ...args: any[]
): Promise<boolean> {
  // Returns false if a before hook aborted the operation
  const metadata = modelClass.getMetadata()
  const hookMethodNames = metadata.hooks?.get(hookType) || []

  for (const methodName of hookMethodNames) {
    const hookFn = (modelClass as any)[methodName] as Function // Type assertion for static method
    if (typeof hookFn === 'function') {
      let result
      // The hook functions are defined by the user to accept specifically typed arguments.
      // The `executeHooks` function ensures the correct instance is passed.
      if (target instanceof ModelQueryBuilder) {
        result = hookFn.call(modelClass, target as Q, ...args)
      } else {
        result = hookFn.call(modelClass, target as M, ...args)
      }

      if (result instanceof Promise) {
        result = await result
      }

      if (hookType.startsWith('before') && result === false) {
        // Log or indicate which hook aborted, if necessary for debugging
        console.warn(
          `Hook ${methodName} on ${modelClass.name} for ${hookType} returned false, aborting operation.`
        )
        return false // Operation aborted by hook
      }
    }
  }
  return true // Operation can proceed
}
```

### 3.3. Modifying `BaseModel.save()`

```typescript
// In src/base_model/base_model.ts
// Inside the save() method

const modelClass = this.constructor as typeof BaseModel & { new (...args: any[]): this }

if (!(await executeHooks(this, 'beforeSave', modelClass))) {
  this.$isPersisted = this.$isLocal // Reset state if aborted
  return this
}

const isNew = !this.$isPersisted
if (isNew) {
  if (!(await executeHooks(this, 'beforeCreate', modelClass))) {
    this.$isPersisted = this.$isLocal // Reset state if aborted
    return this
  }
}
// ... (performInsert or performUpdate call)
// Assume performInsert/performUpdate returns a boolean indicating success
const dbOperationSuccessful = await (isNew ? this.performInsert() : this.performUpdate())

if (dbOperationSuccessful) {
  this.$isPersisted = true
  this.$isLocal = false
  this.$dirty = {} // Clear dirty attributes after successful save
  this.syncOriginal() // Update original values

  await executeHooks(this, 'afterSave', modelClass)
  if (isNew) {
    await executeHooks(this, 'afterCreate', modelClass)
  } else {
    // For updates, ensure we pass the correct context if afterUpdate needs it (e.g., changed fields)
    await executeHooks(this, 'afterUpdate', modelClass)
  }
} else {
  // If DB operation failed, we might not want to run after* hooks,
  // or have specific error hooks. For now, just don't run them.
  // Revert optimistic state changes if necessary, though performInsert/Update should handle this.
  this.$isPersisted = this.$isLocal
}
return this
// ...
```

### 3.4. Modifying `ModelQueryBuilder` (Example for `first()`)

```typescript
// In src/query_builder/model_query_builder.ts
// Inside the first() method

const modelClassCtor = this.modelConstructor as typeof BaseModel & { new (...args: any[]): TModel }

// Distinguish if this `first()` call is acting like a `find` or a general `fetch`
// This might need a more robust way to determine, perhaps based on how query was built.
// For simplicity, let's assume a flag `isSpecificFindOperation` can be set if `Model.find` was the entry point.
let isSpecificFindOperation = false // This flag needs proper setting logic based on entry point

if (!(await executeHooks(this, 'beforeFetch', modelClassCtor))) {
  return null
}
if (isSpecificFindOperation) {
  if (!(await executeHooks(this, 'beforeFind', modelClassCtor))) {
    return null
  }
}

// const result = await this.collection.findOne(this.getFinalFilters(), options);
// The above line should use the potentially modified `this.getFinalFilters()` from hooks
const finalFilters = this.getFinalFilters() // Get filters after beforeFetch/beforeFind potentially modified them
const result = await this.collection.findOne(finalFilters, options)

let modelInstance: TModel | null = null
if (result) {
  modelInstance = new modelClassCtor()
  modelInstance.hydrateFromDocument(result as any)
  // Further hydration/setup
  modelInstance.$isPersisted = true
  modelInstance.$isLocal = false
  modelInstance.syncOriginal()
}

if (isSpecificFindOperation) {
  await executeHooks(modelInstance, 'afterFind', modelClassCtor)
}
// afterFetch receives an array of models. For first(), it's an array with one or zero elements.
const modelsArrayForAfterFetch = modelInstance ? [modelInstance] : []
await executeHooks(modelsArrayForAfterFetch, 'afterFetch', modelClassCtor)

return modelInstance
// ...
```

## 4. Data Structures

- **`BaseModel[MODEL_METADATA].hooks`**: `Map<string, string[]>`
  - Key: Hook type (e.g., `beforeCreate`, `afterSave`).
  - Value: Array of static method names registered for that hook type.

## 5. API Definitions

The public API will consist of the new hook decorators:

- `@beforeSave()`
- `@afterSave()`
- `@beforeCreate()`
- `@afterCreate()`
- `@beforeUpdate()`
- `@afterUpdate()`
- `@beforeDelete()`
- `@afterDelete()`
- `@beforeFind()`
- `@afterFind()`
- `@beforeFetch()`
- `@afterFetch()`

These decorators will be used on static methods within model classes, as shown in the PRD.

## 6. Error Handling and Edge Cases

- **Hook Errors**: If a hook function throws an error, the `executeHooks` function will let the error propagate. The calling method (e.g., `save()`, `first()`) should catch this and handle it appropriately (e.g., abort the operation, rollback transaction if applicable).
- **Asynchronous Hooks**: The `executeHooks` function must correctly `await` promises returned by hook methods.
- **Order of Execution**: Hooks of the same type are executed in the order they are defined in the class. This is handled by the order in `metadata.hooks.get(hookType)!`.
- **Modifying Query in `beforeFind`/`beforeFetch`**: Hooks will receive the query builder instance and can modify it. The subsequent database operation will use the modified query.
- **Aborting Operations**: `before*` hooks can abort the operation by returning `false` (this behavior needs to be consistent with Lucid). The `executeHooks` function will return `false` in such cases, and the calling method must check this return value.

## 7. Testing Strategy

Unit tests should cover:

- Each hook type is correctly registered by its decorator.
- Each hook type is executed at the correct point in the lifecycle.
- Correct arguments (model instance or query builder) are passed to hook functions.
- Synchronous and asynchronous hooks are handled correctly.
- Data modification within `before*` hooks is reflected in the database operation.
- Query modification within `beforeFind`/`beforeFetch` hooks affects the query results.
- Operations are aborted if a `before*` hook returns `false` or throws an error.
- Multiple hooks of the same type are executed in order.
- Hooks work correctly with all relevant `BaseModel` and `ModelQueryBuilder` methods.

## 8. Open Questions / Design Decisions

1.  **Return value for aborting `before*` hooks**: Confirm if returning `false` is the standard way to abort, or if only throwing an error should abort (align with Lucid conventions if possible).
    _Initial thought: Follow Lucid, where throwing an error aborts. Explicit `return false` might also be an option if Lucid supports it for certain hooks._
2.  **Transaction Handling with Hooks**: How deeply should hook execution be integrated with transactions? If a hook fails during an operation that initiated a transaction, should the `executeHooks` utility or the calling method be responsible for rollback?
    _Initial thought: The calling method (e.g., `save`) should manage the transaction and rollback if `executeHooks` indicates failure (either by returning `false` or propagating an error)._
3.  **Clarity between `Find` and `Fetch` hooks**: Ensure the distinction and invocation logic for `before/afterFind` vs `before/afterFetch` are very clear and cover all relevant query methods (e.g. `Model.all()`, `Model.find()`, `query.first()`, `query.all()`).
    _TSD reflects: `Find` for specific lookups like `Model.find(id)`, `Fetch` for broader queries. `first()` might trigger both if it is used like a `find`._ This needs careful implementation in the query builder.

This technical specification provides a foundational plan. Further refinements may be necessary during implementation.
