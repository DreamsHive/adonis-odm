import {
  MongoClient,
  Db,
  Collection,
  Document,
  TransactionOptions as MongoTransactionOptions,
} from 'mongodb'
import { MongoConfig, MongoConnectionConfig, DatabaseManager } from './types/index.js'
import { ConnectionException, ConfigurationException } from './exceptions/index.js'
import { MongoTransactionClient, ConcreteMongoTransactionClient } from './transaction_client.js'

/**
 * MongoDB Database Manager
 */
export class MongoDatabaseManager implements DatabaseManager {
  private clients: Map<string, MongoClient> = new Map()
  private databases: Map<string, Db> = new Map()
  private config: MongoConfig

  constructor(config: MongoConfig) {
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

          console.log(`MongoDB connection "${name}" established`)
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

      uri = `mongodb://${host}:${port}/${database}`
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
    const actualOptions = typeof callbackOrOptions === 'function' ? options : callbackOrOptions
    const connectionName = this.config.connection // Get default connection
    const mongoClient = this.connection(connectionName)
    const session = mongoClient.startSession()

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
        throw error
      } finally {
        session.endSession()
      }
    } else {
      // Manual transaction: Start it, but user must commit/rollback
      session.startTransaction(actualOptions)
      return trxClient
    }
  }
}
