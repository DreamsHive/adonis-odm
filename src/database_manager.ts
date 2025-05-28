import {
  MongoClient,
  Db,
  Collection,
  Document,
  TransactionOptions as MongoTransactionOptions,
} from 'mongodb'
import { OdmConfig, MongoConnectionConfig, DatabaseManager } from './types/index.js'
import {
  ConnectionException,
  ConfigurationException,
  TransactionException,
} from './exceptions/index.js'
import { MongoTransactionClient, ConcreteMongoTransactionClient } from './transaction_client.js'

/**
 * MongoDB Database Manager
 */
export class MongoDatabaseManager implements DatabaseManager {
  private clients: Map<string, MongoClient> = new Map()
  private databases: Map<string, Db> = new Map()
  private config: OdmConfig

  constructor(config: OdmConfig) {
    this.config = config
  }

  /**
   * Get a MongoDB client connection
   */
  connection(name?: string): MongoClient {
    const connectionName = name || this.config.connection

    if (!this.clients.has(connectionName)) {
      throw new ConnectionException(connectionName, new Error('Connection not established'))
    }

    return this.clients.get(connectionName)!
  }

  /**
   * Get a database instance
   */
  db(name?: string): Db {
    const connectionName = name || this.config.connection

    if (!this.databases.has(connectionName)) {
      throw new ConnectionException(connectionName, new Error('Database not available'))
    }

    return this.databases.get(connectionName)!
  }

  /**
   * Get a collection instance
   */
  collection<T extends Document = Document>(name: string, connectionName?: string): Collection<T> {
    const database = this.db(connectionName)
    return database.collection<T>(name)
  }

  /**
   * Connect to all configured MongoDB instances
   */
  async connect(): Promise<void> {
    const connectionPromises = Object.entries(this.config.connections).map(
      async ([name, config]) => {
        try {
          const client = await this.createConnection(config)
          this.clients.set(name, client)

          // Get database name from URL or config
          const dbName = this.extractDatabaseName(config)
          const database = client.db(dbName)
          this.databases.set(name, database)
        } catch (error) {
          throw new ConnectionException(name, error as Error)
        }
      }
    )

    await Promise.all(connectionPromises)
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    const closePromises = Array.from(this.clients.values()).map((client) => client.close())
    await Promise.all(closePromises)

    this.clients.clear()
    this.databases.clear()
  }

  /**
   * Create a MongoDB client connection
   */
  private async createConnection(config: MongoConnectionConfig): Promise<MongoClient> {
    let uri: string

    if (config.connection.url) {
      uri = config.connection.url
    } else {
      // Build URI from individual components
      const host = config.connection.host || 'localhost'
      const port = config.connection.port || 27017
      const database = config.connection.database || 'test'
      const username = config.connection.username
      const password = config.connection.password

      // Build authentication part of URI
      let authString = ''
      if (username && password) {
        // Encode username and password to handle special characters
        const encodedUsername = encodeURIComponent(username)
        const encodedPassword = encodeURIComponent(password)
        authString = `${encodedUsername}:${encodedPassword}@`
      } else if (username) {
        // Username without password
        const encodedUsername = encodeURIComponent(username)
        authString = `${encodedUsername}@`
      }

      uri = `mongodb://${authString}${host}:${port}/${database}`
    }

    const options = {
      ...config.connection.options,
    }

    // Apply driver-specific options
    if (config.useNewUrlParser !== undefined) {
      // Note: useNewUrlParser is deprecated in newer MongoDB drivers
      // but we'll include it for compatibility
    }

    if (config.useUnifiedTopology !== undefined) {
      // Note: useUnifiedTopology is deprecated in newer MongoDB drivers
      // but we'll include it for compatibility
    }

    const client = new MongoClient(uri, options)
    await client.connect()

    // Test the connection
    await client.db().admin().ping()

    return client
  }

  /**
   * Extract database name from connection configuration
   */
  private extractDatabaseName(config: MongoConnectionConfig): string {
    if (config.connection.database) {
      return config.connection.database
    }

    if (config.connection.url) {
      // Extract database name from URL
      const url = new URL(
        config.connection.url.replace('mongodb://', 'http://').replace('mongodb+srv://', 'https://')
      )
      const pathname = url.pathname.replace('/', '')
      if (pathname) {
        return pathname
      }
    }

    // Default database name
    return 'test'
  }

  /**
   * Get connection configuration
   */
  getConnectionConfig(name?: string): MongoConnectionConfig {
    const connectionName = name || this.config.connection
    const config = this.config.connections[connectionName]

    if (!config) {
      throw new ConfigurationException(`Connection "${connectionName}" not found in configuration`)
    }

    return config
  }

  /**
   * Check if a connection exists
   */
  hasConnection(name: string): boolean {
    return this.clients.has(name)
  }

  /**
   * Get all connection names
   */
  getConnectionNames(): string[] {
    return Object.keys(this.config.connections)
  }

  /**
   * Start a transaction - Manual transaction
   */
  public async transaction(options?: MongoTransactionOptions): Promise<MongoTransactionClient>
  /**
   * Start a transaction - Managed transaction
   */
  public async transaction<TResult = any>(
    callback: (trx: MongoTransactionClient) => Promise<TResult>,
    options?: MongoTransactionOptions
  ): Promise<TResult>
  /**
   * Start a transaction - Implementation
   */
  public async transaction<TResult = any>(
    callbackOrOptions?:
      | ((trx: MongoTransactionClient) => Promise<TResult>)
      | MongoTransactionOptions,
    options?: MongoTransactionOptions
  ): Promise<TResult | MongoTransactionClient> {
    try {
      const actualOptions = typeof callbackOrOptions === 'function' ? options : callbackOrOptions
      const connectionName = this.config.connection // Get default connection

      let mongoClient: MongoClient
      try {
        mongoClient = this.connection(connectionName)
      } catch (error) {
        throw new TransactionException('get connection', error as Error)
      }

      let session
      try {
        session = mongoClient.startSession()
      } catch (error) {
        throw new TransactionException('start session', error as Error)
      }

      const trxClient = new ConcreteMongoTransactionClient(session, this, connectionName)

      if (typeof callbackOrOptions === 'function') {
        const callback = callbackOrOptions
        try {
          // Use MongoDB driver's withTransaction which handles retries for transient errors
          return await session.withTransaction(async () => {
            return callback(trxClient)
          }, actualOptions)
        } catch (error) {
          // Rollback is handled by withTransaction on error
          throw new TransactionException('execute transaction callback', error as Error)
        } finally {
          try {
            session.endSession()
          } catch (error) {
            // Log but don't throw session cleanup errors
            console.warn('Failed to end transaction session:', error)
          }
        }
      } else {
        // Manual transaction: Start it, but user must commit/rollback
        try {
          session.startTransaction(actualOptions)
          return trxClient
        } catch (error) {
          try {
            session.endSession()
          } catch (cleanupError) {
            // Log but don't throw session cleanup errors
            console.warn('Failed to end transaction session after start error:', cleanupError)
          }
          throw new TransactionException('start manual transaction', error as Error)
        }
      }
    } catch (error) {
      // Re-throw TransactionException as-is, wrap others
      if (error instanceof TransactionException) {
        throw error
      }
      throw new TransactionException('transaction operation', error as Error)
    }
  }
}
