/**
 * Base exception for MongoDB ODM
 */
export class MongoOdmException extends Error {
  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
  }
}

/**
 * Exception thrown when a model is not found
 */
export class ModelNotFoundException extends MongoOdmException {
  constructor(model: string, identifier?: any) {
    const message = identifier
      ? `${model} with identifier "${identifier}" not found`
      : `${model} not found`
    super(message)
  }
}

/**
 * Exception thrown when connection fails
 */
export class ConnectionException extends MongoOdmException {
  constructor(connectionName: string, originalError?: Error) {
    const message = `Failed to connect to MongoDB connection "${connectionName}"`
    super(originalError ? `${message}: ${originalError.message}` : message)
  }
}

/**
 * Exception thrown when database operations fail
 */
export class DatabaseOperationException extends MongoOdmException {
  constructor(operation: string, originalError?: Error) {
    const message = `Database operation "${operation}" failed`
    super(originalError ? `${message}: ${originalError.message}` : message)
  }
}

/**
 * Exception thrown when validation fails
 */
export class ValidationException extends MongoOdmException {
  constructor(field: string, value: any, rule: string) {
    super(`Validation failed for field "${field}" with value "${value}": ${rule}`)
  }
}

/**
 * Exception thrown when transaction operations fail
 */
export class TransactionException extends MongoOdmException {
  constructor(operation: string, originalError?: Error) {
    const message = `Transaction operation "${operation}" failed`
    super(originalError ? `${message}: ${originalError.message}` : message)
  }
}

/**
 * Exception thrown when hook execution fails
 */
export class HookExecutionException extends MongoOdmException {
  constructor(hookName: string, modelName: string, originalError?: Error) {
    const message = `Hook "${hookName}" failed for model "${modelName}"`
    super(originalError ? `${message}: ${originalError.message}` : message)
  }
}

/**
 * Exception thrown when relationship loading fails
 */
export class RelationshipException extends MongoOdmException {
  constructor(relationshipName: string, modelName: string, originalError?: Error) {
    const message = `Failed to load relationship "${relationshipName}" for model "${modelName}"`
    super(originalError ? `${message}: ${originalError.message}` : message)
  }
}

/**
 * Exception thrown when configuration is invalid
 */
export class ConfigurationException extends MongoOdmException {
  constructor(message: string) {
    super(`Configuration error: ${message}`)
  }
}
