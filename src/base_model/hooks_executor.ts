import { BaseModel } from './base_model.js'
import { ModelQueryBuilder } from '../query_builder/model_query_builder.js'

/**
 * Execute hooks for a given hook type
 * Returns false if a before hook aborted the operation
 */
export async function executeHooks<M extends BaseModel, Q extends ModelQueryBuilder<any, M>>(
  target: M | Q, // Target is the specific model instance or its query builder
  hookType: string,
  // modelClass is used to access the static hook methods and metadata
  modelClass: typeof BaseModel & { new (...args: any[]): M },
  ...args: any[]
): Promise<boolean> {
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
        return false // Operation aborted by hook
      }
    }
  }
  return true // Operation can proceed
}
