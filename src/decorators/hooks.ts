import { BaseModel } from '../base_model/base_model.js'

/**
 * Create a hook decorator for a specific hook type
 */
function createHookDecorator(hookType: string) {
  return function (target: any, propertyKey: string, _descriptor: PropertyDescriptor) {
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

/**
 * Hook decorators for model lifecycle events
 */
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
