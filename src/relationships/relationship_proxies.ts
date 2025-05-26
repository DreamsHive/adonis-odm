/**
 * SEAMLESS RELATIONSHIP PROXIES - LIKE ADONISJS LUCID!
 *
 * This module implements advanced JavaScript Proxy patterns to achieve seamless
 * property access for relationships, exactly like AdonisJS Lucid.
 *
 * Key Features:
 * - Direct property access: user.profile.firstName
 * - Array access for HasMany: user.posts[0].title
 * - Transparent method forwarding
 * - Zero developer overhead
 * - Full TypeScript IntelliSense support
 */

import type { BaseModel } from '../base_model/base_model.js'
import type { HasOne, HasMany, BelongsTo } from '../types/relationships.js'

/**
 * SEAMLESS HASONE PROXY
 *
 * Creates a proxy that transparently forwards property access to the related model
 * when loaded, providing seamless access like: user.profile.firstName
 */
export function createHasOneProxy<T extends typeof BaseModel>(
  relatedModel: () => T,
  options: {
    foreignKey?: string
    localKey?: string
  } = {}
): HasOne<T> {
  let related: InstanceType<T> | null = null
  let isLoaded = false

  const proxy = new Proxy({} as HasOne<T>, {
    get(target: any, prop: string | symbol, receiver: any): any {
      // Handle relationship-specific methods first
      if (prop === 'related') {
        return related
      }

      if (prop === 'load') {
        return async (): Promise<InstanceType<T> | null> => {
          // TODO: Implement actual loading logic
          isLoaded = true
          return related
        }
      }

      if (prop === 'create') {
        return async (attributes: Partial<InstanceType<T>>): Promise<InstanceType<T>> => {
          // TODO: Implement create logic
          const RelatedModelClass = relatedModel()
          const instance = new RelatedModelClass() as InstanceType<T>
          Object.assign(instance, attributes)
          related = instance
          return instance
        }
      }

      if (prop === 'save') {
        return async (model: InstanceType<T>): Promise<InstanceType<T>> => {
          // TODO: Implement save logic
          related = model
          return model
        }
      }

      if (prop === 'isLoaded') {
        return isLoaded
      }

      if (prop === 'query') {
        return () => {
          // TODO: Return a query builder for the related model
          const RelatedModelClass = relatedModel()
          return (RelatedModelClass as any).query()
        }
      }

      // Handle special symbols and methods
      if (typeof prop === 'symbol') {
        return Reflect.get(target, prop, receiver)
      }

      // Handle inspection methods
      if (prop === 'toString' || prop === 'valueOf' || prop === 'inspect') {
        return () => `[HasOne Relationship: ${related ? 'loaded' : 'not loaded'}]`
      }

      // SEAMLESS PROPERTY FORWARDING - THE MAGIC!
      // If the relationship is loaded, forward property access to the related model
      if (related && prop in related) {
        const value = (related as any)[prop]

        // If it's a function, bind it to the related model
        if (typeof value === 'function') {
          return value.bind(related)
        }

        return value
      }

      // If not loaded, return undefined (like AdonisJS Lucid)
      return undefined
    },

    set(target: any, prop: string | symbol, value: any): boolean {
      // Allow setting the related model
      if (prop === 'related') {
        related = value
        isLoaded = value !== null && value !== undefined // Mark as loaded when related data is set
        return true
      }

      // Forward property setting to the related model if loaded
      if (related && typeof prop === 'string') {
        ;(related as any)[prop] = value
        return true
      }

      return false
    },

    has(target: any, prop: string | symbol): boolean {
      // Check relationship methods first
      if (
        prop === 'related' ||
        prop === 'load' ||
        prop === 'create' ||
        prop === 'save' ||
        prop === 'isLoaded' ||
        prop === 'query'
      ) {
        return true
      }

      // Check if property exists on related model
      if (related) {
        return prop in related
      }

      return false
    },

    ownKeys(target: any): ArrayLike<string | symbol> {
      const keys = ['related', 'load', 'create', 'save', 'isLoaded', 'query']

      if (related) {
        keys.push(...Object.keys(related))
      }

      return keys
    },

    getOwnPropertyDescriptor(target: any, prop: string | symbol) {
      if (
        prop === 'related' ||
        prop === 'load' ||
        prop === 'create' ||
        prop === 'save' ||
        prop === 'isLoaded' ||
        prop === 'query'
      ) {
        return { enumerable: true, configurable: true }
      }

      if (related && prop in related) {
        return Object.getOwnPropertyDescriptor(related, prop)
      }

      return undefined
    },
  })

  return proxy
}

/**
 * SEAMLESS HASMANY PROXY
 *
 * Creates a proxy that provides array-like access and seamless property forwarding
 * for HasMany relationships, like: user.posts[0].title
 */
export function createHasManyProxy<T extends typeof BaseModel>(
  relatedModel: () => T,
  options: {
    foreignKey?: string
    localKey?: string
  } = {}
): HasMany<T> {
  let relatedArray: InstanceType<T>[] = []
  let isLoaded = false

  const proxy = new Proxy([] as any, {
    get(target: any, prop: string | symbol, receiver: any): any {
      // Handle relationship-specific methods first
      if (prop === 'related') {
        return relatedArray
      }

      if (prop === 'load') {
        return async (): Promise<InstanceType<T>[]> => {
          // TODO: Implement actual loading logic
          isLoaded = true
          return relatedArray
        }
      }

      if (prop === 'create') {
        return async (attributes: Partial<InstanceType<T>>): Promise<InstanceType<T>> => {
          // TODO: Implement create logic
          const RelatedModelClass = relatedModel()
          const instance = new RelatedModelClass() as InstanceType<T>
          Object.assign(instance, attributes)
          relatedArray.push(instance)
          return instance
        }
      }

      if (prop === 'createMany') {
        return async (attributesArray: Partial<InstanceType<T>>[]): Promise<InstanceType<T>[]> => {
          // TODO: Implement createMany logic
          const RelatedModelClass = relatedModel()
          const instances = attributesArray.map((attributes) => {
            const instance = new RelatedModelClass() as InstanceType<T>
            Object.assign(instance, attributes)
            return instance
          })
          relatedArray.push(...instances)
          return instances
        }
      }

      if (prop === 'saveMany') {
        return async (models: InstanceType<T>[]): Promise<InstanceType<T>[]> => {
          // TODO: Implement saveMany logic
          relatedArray.push(...models)
          return models
        }
      }

      if (prop === 'isLoaded') {
        return isLoaded
      }

      if (prop === 'query') {
        return () => {
          // TODO: Return a query builder for the related model
          const RelatedModelClass = relatedModel()
          return (RelatedModelClass as any).query()
        }
      }

      if (prop === 'save') {
        return async (model: InstanceType<T>): Promise<InstanceType<T>> => {
          // TODO: Implement save logic for single model
          relatedArray.push(model)
          return model
        }
      }

      // Handle array properties and methods
      if (prop === 'length') {
        return relatedArray.length
      }

      if (prop === 'forEach') {
        return (callback: (item: InstanceType<T>, index: number) => void) => {
          relatedArray.forEach(callback)
        }
      }

      if (prop === 'map') {
        return <U>(callback: (item: InstanceType<T>, index: number) => U): U[] => {
          return relatedArray.map(callback)
        }
      }

      if (prop === 'filter') {
        return (callback: (item: InstanceType<T>, index: number) => boolean): InstanceType<T>[] => {
          return relatedArray.filter(callback)
        }
      }

      // Handle array index access
      if (typeof prop === 'string' && /^\d+$/.test(prop)) {
        const index = Number.parseInt(prop, 10)
        return relatedArray[index]
      }

      // Handle special symbols and methods
      if (typeof prop === 'symbol') {
        if (prop === Symbol.iterator) {
          return function* () {
            for (const item of relatedArray) {
              yield item
            }
          }
        }
        return Reflect.get(relatedArray, prop, receiver)
      }

      // Handle inspection methods
      if (prop === 'toString' || prop === 'valueOf' || prop === 'inspect') {
        return () => `[HasMany Relationship: ${relatedArray.length} items]`
      }

      // Forward other array methods to the related array
      if (prop in Array.prototype) {
        const value = (relatedArray as any)[prop]
        if (typeof value === 'function') {
          return value.bind(relatedArray)
        }
        return value
      }

      return undefined
    },

    set(target: any, prop: string | symbol, value: any): boolean {
      // Allow setting the related array
      if (prop === 'related') {
        relatedArray = value || []
        isLoaded = value !== null && value !== undefined
        return true
      }

      // Handle array index setting
      if (typeof prop === 'string' && /^\d+$/.test(prop)) {
        const index = Number.parseInt(prop, 10)
        relatedArray[index] = value
        return true
      }

      // Handle length setting
      if (prop === 'length') {
        relatedArray.length = value
        return true
      }

      return false
    },

    has(target: any, prop: string | symbol): boolean {
      // Check relationship methods first
      if (
        prop === 'related' ||
        prop === 'load' ||
        prop === 'create' ||
        prop === 'createMany' ||
        prop === 'saveMany' ||
        prop === 'isLoaded' ||
        prop === 'query' ||
        prop === 'save'
      ) {
        return true
      }

      // Check array properties
      if (prop === 'length' || prop === 'forEach' || prop === 'map' || prop === 'filter') {
        return true
      }

      // Check array index
      if (typeof prop === 'string' && /^\d+$/.test(prop)) {
        const index = Number.parseInt(prop, 10)
        return index >= 0 && index < relatedArray.length
      }

      // Check array methods
      if (prop in Array.prototype) {
        return true
      }

      return false
    },

    ownKeys(target: any): ArrayLike<string | symbol> {
      const keys = [
        'related',
        'load',
        'create',
        'createMany',
        'saveMany',
        'isLoaded',
        'query',
        'save',
        'length',
        'forEach',
        'map',
        'filter',
      ]

      // Add array indices
      for (let i = 0; i < relatedArray.length; i++) {
        keys.push(i.toString())
      }

      return keys
    },

    getOwnPropertyDescriptor(target: any, prop: string | symbol) {
      if (typeof prop === 'string' && /^\d+$/.test(prop)) {
        const index = Number.parseInt(prop, 10)
        if (index >= 0 && index < relatedArray.length) {
          return { enumerable: true, configurable: true, writable: true }
        }
      }

      if (prop === 'length') {
        return { enumerable: false, configurable: false, writable: true }
      }

      return { enumerable: true, configurable: true }
    },
  })

  return proxy as HasMany<T>
}

/**
 * SEAMLESS BELONGSTO PROXY
 *
 * Creates a proxy that transparently forwards property access to the related model
 * when loaded, providing seamless access like: post.user.name
 */
export function createBelongsToProxy<T extends typeof BaseModel>(
  relatedModel: () => T,
  options: {
    foreignKey?: string
    localKey?: string
  } = {}
): BelongsTo<T> {
  let relatedInstance: InstanceType<T> | null = null
  let isLoaded = false

  const proxy = new Proxy({} as BelongsTo<T>, {
    get(target: any, prop: string | symbol, receiver: any): any {
      // Handle relationship-specific methods first
      if (prop === 'related') {
        return relatedInstance
      }

      if (prop === 'load') {
        return async (): Promise<InstanceType<T> | null> => {
          // TODO: Implement actual loading logic
          isLoaded = true
          return relatedInstance
        }
      }

      if (prop === 'associate') {
        return async (model: InstanceType<T>): Promise<InstanceType<T>> => {
          // TODO: Implement associate logic
          relatedInstance = model
          return model
        }
      }

      if (prop === 'dissociate') {
        return async (): Promise<void> => {
          // TODO: Implement dissociate logic
          relatedInstance = null
        }
      }

      if (prop === 'isLoaded') {
        return isLoaded
      }

      if (prop === 'query') {
        return () => {
          // TODO: Return a query builder for the related model
          const RelatedModelClass = relatedModel()
          return (RelatedModelClass as any).query()
        }
      }

      // Handle special symbols and methods
      if (typeof prop === 'symbol') {
        return Reflect.get(target, prop, receiver)
      }

      // Handle inspection methods
      if (prop === 'toString' || prop === 'valueOf' || prop === 'inspect') {
        return () => `[BelongsTo Relationship: ${relatedInstance ? 'loaded' : 'not loaded'}]`
      }

      // SEAMLESS PROPERTY FORWARDING - THE MAGIC!
      // If the relationship is loaded, forward property access to the related model
      if (relatedInstance && prop in relatedInstance) {
        const value = (relatedInstance as any)[prop]

        // If it's a function, bind it to the related model
        if (typeof value === 'function') {
          return value.bind(relatedInstance)
        }

        return value
      }

      // If not loaded, return undefined (like AdonisJS Lucid)
      return undefined
    },

    set(target: any, prop: string | symbol, value: any): boolean {
      // Allow setting the related model
      if (prop === 'related') {
        relatedInstance = value
        isLoaded = value !== null && value !== undefined
        return true
      }

      // Forward property setting to the related model if loaded
      if (relatedInstance && typeof prop === 'string') {
        ;(relatedInstance as any)[prop] = value
        return true
      }

      return false
    },

    has(target: any, prop: string | symbol): boolean {
      // Check relationship methods first
      if (
        prop === 'related' ||
        prop === 'load' ||
        prop === 'associate' ||
        prop === 'dissociate' ||
        prop === 'isLoaded' ||
        prop === 'query'
      ) {
        return true
      }

      // Check if property exists on related model
      if (relatedInstance) {
        return prop in relatedInstance
      }

      return false
    },

    ownKeys(target: any): ArrayLike<string | symbol> {
      const keys = ['related', 'load', 'associate', 'dissociate', 'isLoaded', 'query']

      if (relatedInstance) {
        keys.push(...Object.keys(relatedInstance))
      }

      return keys
    },

    getOwnPropertyDescriptor(target: any, prop: string | symbol) {
      if (
        prop === 'related' ||
        prop === 'load' ||
        prop === 'associate' ||
        prop === 'dissociate' ||
        prop === 'isLoaded' ||
        prop === 'query'
      ) {
        return { enumerable: true, configurable: true }
      }

      if (relatedInstance && prop in relatedInstance) {
        return Object.getOwnPropertyDescriptor(relatedInstance, prop)
      }

      return undefined
    },
  })

  return proxy
}

/**
 * PROXY FACTORY FUNCTIONS
 *
 * These functions create the appropriate proxy based on relationship type
 */

/**
 * Create a relationship proxy based on metadata
 */
export function createRelationshipProxy(
  type: 'hasOne' | 'hasMany' | 'belongsTo',
  relatedModel: () => typeof BaseModel,
  options: {
    foreignKey?: string
    localKey?: string
  } = {}
): HasOne<any> | HasMany<any> | BelongsTo<any> {
  switch (type) {
    case 'hasOne':
      return createHasOneProxy(relatedModel, options)
    case 'hasMany':
      return createHasManyProxy(relatedModel, options)
    case 'belongsTo':
      return createBelongsToProxy(relatedModel, options)
    default:
      throw new Error(`Unknown relationship type: ${type}`)
  }
}

/**
 * SEAMLESS TYPE SAFETY EXPORTS
 */
