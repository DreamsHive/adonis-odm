import type { BaseModel } from './base_model.js'

/**
 * Global model registry for relationship loading
 */
export class ModelRegistry {
  private static models: Map<string, typeof BaseModel> = new Map()

  static register(modelClass: typeof BaseModel): void {
    this.models.set(modelClass.name, modelClass)
  }

  static get(modelName: string): typeof BaseModel | undefined {
    return this.models.get(modelName)
  }

  static has(modelName: string): boolean {
    return this.models.has(modelName)
  }

  static clear(): void {
    this.models.clear()
  }

  static getAll(): Map<string, typeof BaseModel> {
    return new Map(this.models)
  }
}
