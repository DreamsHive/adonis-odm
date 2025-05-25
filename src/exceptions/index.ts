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
 * Exception thrown when configuration is invalid
 */
export class ConfigurationException extends MongoOdmException {
  constructor(message: string) {
    super(`Configuration error: ${message}`)
  }
}
