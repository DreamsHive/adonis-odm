import type { BaseModel } from '../base_model/base_model.js'
import type { ModelQueryBuilder } from '../query_builder/model_query_builder.js'
import type { HasOne, HasMany, BelongsTo } from '../types/relationships.js'

/**
 * Base relationship proxy class
 */
abstract class BaseRelationshipProxy {
  protected _isLoaded: boolean = false
  protected _related: any = null

  constructor(
    protected parentModel: BaseModel,
    protected relationshipName: string,
    protected RelatedModel: typeof BaseModel,
    protected localKey: string,
    protected foreignKey: string
  ) {}

  get isLoaded(): boolean {
    return this._isLoaded
  }

  /**
   * Get a query builder for the related model
   */
  query(): ModelQueryBuilder<any> {
    return this.RelatedModel.query()
  }
}

/**
 * HasOne relationship proxy
 * Allows direct property access like Lucid ORM
 */
export class HasOneProxy extends BaseRelationshipProxy implements HasOne<any> {
  /**
   * Create a new related model instance
   */
  async create(attributes: Record<string, any>): Promise<any> {
    const parentId = (this.parentModel as any)[this.localKey]
    if (!parentId) {
      throw new Error(`Parent model must be persisted before creating related model`)
    }

    const relatedInstance = await this.RelatedModel.create({
      ...attributes,
      [this.foreignKey]: parentId,
    })

    this._related = relatedInstance
    this._isLoaded = true

    return relatedInstance
  }

  /**
   * Save an existing related model instance
   */
  async save(instance: any): Promise<any> {
    const parentId = (this.parentModel as any)[this.localKey]
    if (!parentId) {
      throw new Error(`Parent model must be persisted before saving related model`)
    }

    ;(instance as any)[this.foreignKey] = parentId
    await instance.save()

    this._related = instance
    this._isLoaded = true

    return instance
  }

  /**
   * Delete the related model instance
   */
  async delete(): Promise<boolean> {
    if (!this._related) {
      await this.load()
    }

    if (this._related) {
      const deleted = await this._related.delete()
      if (deleted) {
        this._related = null
        this._isLoaded = true
      }
      return deleted
    }

    return false
  }

  /**
   * Load the related model instance
   */
  async load(): Promise<any> {
    const parentId = (this.parentModel as any)[this.localKey]
    if (!parentId) {
      this._related = null
      this._isLoaded = true
      return null
    }

    const related = await this.RelatedModel.query().where(this.foreignKey, parentId).first()

    this._related = related
    this._isLoaded = true

    return related
  }

  // Proxy property access to the related model
  get(target: any, prop: string | symbol): any {
    // Handle relationship methods
    if (prop in this) {
      return (this as any)[prop]
    }

    // Handle related model properties
    if (this._related && prop in this._related) {
      return this._related[prop]
    }

    return undefined
  }

  has(target: any, prop: string | symbol): boolean {
    return prop in this || (this._related && prop in this._related)
  }
}

/**
 * HasMany relationship proxy
 * Acts as an array with additional relationship methods
 */
export class HasManyProxy extends Array implements HasMany<any> {
  protected _isLoaded: boolean = false
  protected _related: any[] = []

  constructor(
    protected parentModel: BaseModel,
    protected relationshipName: string,
    protected RelatedModel: typeof BaseModel,
    protected localKey: string,
    protected foreignKey: string
  ) {
    super()

    // Make this array-like
    Object.setPrototypeOf(this, HasManyProxy.prototype)
  }

  get isLoaded(): boolean {
    return this._isLoaded
  }

  /**
   * Create a new related model instance
   */
  async create(attributes: Record<string, any>): Promise<any> {
    const parentId = (this.parentModel as any)[this.localKey]
    if (!parentId) {
      throw new Error(`Parent model must be persisted before creating related model`)
    }

    const relatedInstance = await this.RelatedModel.create({
      ...attributes,
      [this.foreignKey]: parentId,
    })

    this._related.push(relatedInstance)
    this.push(relatedInstance)
    this._isLoaded = true

    return relatedInstance
  }

  /**
   * Create multiple related model instances
   */
  async createMany(attributesArray: Record<string, any>[]): Promise<any[]> {
    const parentId = (this.parentModel as any)[this.localKey]
    if (!parentId) {
      throw new Error(`Parent model must be persisted before creating related models`)
    }

    const instances = await this.RelatedModel.createMany(
      attributesArray.map((attrs) => ({
        ...attrs,
        [this.foreignKey]: parentId,
      }))
    )

    this._related.push(...instances)
    this.push(...instances)
    this._isLoaded = true

    return instances
  }

  /**
   * Save an existing related model instance
   */
  async save(instance: any): Promise<any> {
    const parentId = (this.parentModel as any)[this.localKey]
    if (!parentId) {
      throw new Error(`Parent model must be persisted before saving related model`)
    }

    ;(instance as any)[this.foreignKey] = parentId
    await instance.save()

    if (!this._related.includes(instance)) {
      this._related.push(instance)
      this.push(instance)
    }
    this._isLoaded = true

    return instance
  }

  /**
   * Save multiple existing related model instances
   */
  async saveMany(instances: any[]): Promise<any[]> {
    const parentId = (this.parentModel as any)[this.localKey]
    if (!parentId) {
      throw new Error(`Parent model must be persisted before saving related models`)
    }

    for (const instance of instances) {
      ;(instance as any)[this.foreignKey] = parentId
      await instance.save()

      if (!this._related.includes(instance)) {
        this._related.push(instance)
        this.push(instance)
      }
    }
    this._isLoaded = true

    return instances
  }

  /**
   * Load the related model instances
   */
  async load(): Promise<any[]> {
    const parentId = (this.parentModel as any)[this.localKey]
    if (!parentId) {
      this._related = []
      this.length = 0
      this._isLoaded = true
      return []
    }

    const related = await this.RelatedModel.query().where(this.foreignKey, parentId).all()

    this._related = related
    this.length = 0
    this.push(...related)
    this._isLoaded = true

    return related
  }

  /**
   * Get a query builder for the related model
   */
  query(): ModelQueryBuilder<any> {
    const parentId = (this.parentModel as any)[this.localKey]
    return this.RelatedModel.query().where(this.foreignKey, parentId)
  }
}

/**
 * BelongsTo relationship proxy
 * Allows direct property access like Lucid ORM
 */
export class BelongsToProxy extends BaseRelationshipProxy implements BelongsTo<any> {
  /**
   * Associate this model with a related model instance
   */
  async associate(instance: any): Promise<void> {
    const relatedId = (instance as any)[this.foreignKey]
    if (!relatedId) {
      throw new Error(`Related model must be persisted before association`)
    }

    ;(this.parentModel as any)[this.localKey] = relatedId
    await this.parentModel.save()

    this._related = instance
    this._isLoaded = true
  }

  /**
   * Dissociate this model from the related model
   */
  async dissociate(): Promise<void> {
    ;(this.parentModel as any)[this.localKey] = null
    await this.parentModel.save()

    this._related = null
    this._isLoaded = true
  }

  /**
   * Load the related model instance
   */
  async load(): Promise<any> {
    const relatedId = (this.parentModel as any)[this.localKey]
    if (!relatedId) {
      this._related = null
      this._isLoaded = true
      return null
    }

    const related = await this.RelatedModel.query().where(this.foreignKey, relatedId).first()

    this._related = related
    this._isLoaded = true

    return related
  }

  // Proxy property access to the related model
  get(target: any, prop: string | symbol): any {
    // Handle relationship methods
    if (prop in this) {
      return (this as any)[prop]
    }

    // Handle related model properties
    if (this._related && prop in this._related) {
      return this._related[prop]
    }

    return undefined
  }

  has(target: any, prop: string | symbol): boolean {
    return prop in this || (this._related && prop in this._related)
  }
}

/**
 * Create a HasOne relationship proxy
 */
export function createHasOneProxy<T extends typeof BaseModel>(
  parentModel: BaseModel,
  relationshipName: string,
  RelatedModel: T,
  localKey: string,
  foreignKey: string
): HasOne<T> {
  const proxy = new HasOneProxy(parentModel, relationshipName, RelatedModel, localKey, foreignKey)

  return new Proxy(proxy, {
    get(target, prop) {
      return target.get(target, prop)
    },
    has(target, prop) {
      return target.has(target, prop)
    },
  }) as unknown as HasOne<T>
}

/**
 * Create a HasMany relationship proxy
 */
export function createHasManyProxy<T extends typeof BaseModel>(
  parentModel: BaseModel,
  relationshipName: string,
  RelatedModel: T,
  localKey: string,
  foreignKey: string
): HasMany<T> {
  return new HasManyProxy(
    parentModel,
    relationshipName,
    RelatedModel,
    localKey,
    foreignKey
  ) as HasMany<T>
}

/**
 * Create a BelongsTo relationship proxy
 */
export function createBelongsToProxy<T extends typeof BaseModel>(
  parentModel: BaseModel,
  relationshipName: string,
  RelatedModel: T,
  localKey: string,
  foreignKey: string
): BelongsTo<T> {
  const proxy = new BelongsToProxy(
    parentModel,
    relationshipName,
    RelatedModel,
    localKey,
    foreignKey
  )

  return new Proxy(proxy, {
    get(target, prop) {
      return target.get(target, prop)
    },
    has(target, prop) {
      return target.has(target, prop)
    },
  }) as unknown as BelongsTo<T>
}
