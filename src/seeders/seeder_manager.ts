import { readdir, stat } from 'node:fs/promises'
import { join, resolve, extname, basename } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { MongoDatabaseManager } from '../database_manager.js'
import type { OdmConfig, SeederConfig, SeederMetadata } from '../types/index.js'
import { getSeederConfig } from '../config/odm_config.js'
import { BaseSeeder } from './base_seeder.js'

/**
 * Options for running seeders
 */
export interface SeederRunOptions {
  /** Specific files to run */
  files?: string[]

  /** Connection name to use */
  connection?: string

  /** Environment to check against */
  environment?: string

  /** Whether to run in interactive mode */
  interactive?: boolean
}

/**
 * Internal interface for seeder files with metadata
 */
interface SeederFileWithMetadata {
  /** File path */
  filePath: string

  /** Seeder class name */
  className: string

  /** Seeder metadata */
  metadata: SeederMetadata
}

/**
 * Seeder execution result
 */
export interface SeederResult {
  /** Name of the seeder */
  name: string

  /** File path of the seeder */
  filePath: string

  /** Whether the seeder was executed */
  executed: boolean

  /** Execution time in milliseconds */
  executionTime?: number

  /** Error if execution failed */
  error?: Error

  /** Reason for skipping (if not executed) */
  skipReason?: string
}

/**
 * Seeder Manager
 *
 * Manages the discovery, loading, and execution of database seeders.
 * Provides functionality to run seeders individually or in batches,
 * with support for environment filtering and connection-specific execution.
 */
export class SeederManager {
  private client: MongoDatabaseManager
  private seederConfig: Required<SeederConfig>
  private config: OdmConfig

  constructor(config: OdmConfig, client: MongoDatabaseManager) {
    this.config = config
    this.client = client
    this.seederConfig = getSeederConfig(config)
  }

  /**
   * Run seeders based on the provided options
   *
   * @param options - Options for running seeders
   * @returns Array of seeder execution results
   */
  async run(options: SeederRunOptions = {}): Promise<SeederResult[]> {
    const environment = options.environment || process.env.NODE_ENV || 'development'
    const connection = options.connection || this.seederConfig.defaultConnection

    // Validate connection if specified
    if (options.connection) {
      await this.validateConnection(options.connection)
    }

    let seederFiles: string[]

    if (options.files && options.files.length > 0) {
      // Run specific files
      seederFiles = options.files
    } else {
      // Discover all seeder files
      seederFiles = await this.getSeederFiles()
    }

    const results: SeederResult[] = []

    for (const filePath of seederFiles) {
      const result = await this.runFile(filePath, connection, environment)
      results.push(result)
    }

    return results
  }

  /**
   * Run a specific seeder file
   *
   * @param filePath - Path to the seeder file
   * @param connection - Connection name to use
   * @param environment - Environment to check against
   * @returns Seeder execution result
   */
  async runFile(
    filePath: string,
    connection?: string,
    environment?: string
  ): Promise<SeederResult> {
    const seederName = this.getSeederNameFromPath(filePath)
    const actualConnection = connection || this.seederConfig.defaultConnection
    const actualEnvironment = environment || process.env.NODE_ENV || 'development'

    const result: SeederResult = {
      name: seederName,
      filePath,
      executed: false,
    }

    try {
      // Validate connection before proceeding
      await this.validateConnection(actualConnection)

      // Load the seeder class
      const SeederClass = await this.loadSeeder(filePath)

      // Check environment restrictions
      if (!this.shouldRunInEnvironment(SeederClass, actualEnvironment)) {
        const seederEnvironments = (SeederClass as any).environment
        result.skipReason = `Environment restriction: seeder only runs in [${seederEnvironments?.join(', ')}], current: ${actualEnvironment}`
        return result
      }

      // Verify connection is available before creating seeder instance
      await this.verifyConnectionAvailability(actualConnection)

      // Create seeder instance
      const seeder = new SeederClass(this.client, actualConnection)

      // Execute the seeder
      const startTime = Date.now()
      await seeder.run()
      const endTime = Date.now()

      result.executed = true
      result.executionTime = endTime - startTime
    } catch (error) {
      // Enhance error message with connection context
      const enhancedError = this.enhanceConnectionError(error, actualConnection)
      result.error =
        enhancedError instanceof Error ? enhancedError : new Error(String(enhancedError))
    }

    return result
  }

  /**
   * Get all seeder files from configured paths
   *
   * @returns Array of seeder file paths ordered by execution order and dependencies
   */
  async getSeederFiles(): Promise<string[]> {
    const seederFiles: string[] = []

    for (const searchPath of this.seederConfig.paths) {
      const resolvedPath = resolve(searchPath)

      try {
        const files = await this.discoverSeederFiles(resolvedPath)
        seederFiles.push(...files)
      } catch (error) {
        // Path doesn't exist or is not accessible, skip it
        continue
      }
    }

    // Get ordered seeders based on order and dependencies
    return await this.getOrderedSeeders(seederFiles)
  }

  /**
   * Load a seeder class from a file path
   *
   * @param filePath - Path to the seeder file
   * @returns The seeder class constructor
   */
  private async loadSeeder(
    filePath: string
  ): Promise<new (client: MongoDatabaseManager, connection?: string) => BaseSeeder> {
    const resolvedPath = resolve(filePath)
    const fileUrl = pathToFileURL(resolvedPath).href

    try {
      const module = await import(fileUrl)
      const SeederClass = module.default || module[Object.keys(module)[0]]

      if (!SeederClass || typeof SeederClass !== 'function') {
        throw new Error(`No valid seeder class found in ${filePath}`)
      }

      // Verify it extends BaseSeeder
      if (!(SeederClass.prototype instanceof BaseSeeder) && SeederClass !== BaseSeeder) {
        throw new Error(`Seeder class in ${filePath} must extend BaseSeeder`)
      }

      return SeederClass as new (client: MongoDatabaseManager, connection?: string) => BaseSeeder
    } catch (error) {
      throw new Error(
        `Failed to load seeder from ${filePath}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Check if a seeder should run in the current environment
   *
   * @param SeederClass - The seeder class
   * @param environment - Current environment
   * @returns True if the seeder should run
   */
  private shouldRunInEnvironment(
    SeederClass: new (client: MongoDatabaseManager, connection?: string) => BaseSeeder,
    environment: string
  ): boolean {
    return (SeederClass as any).shouldRun(environment)
  }

  /**
   * Discover seeder files in a directory recursively
   *
   * @param dirPath - Directory path to search
   * @returns Array of seeder file paths
   */
  private async discoverSeederFiles(dirPath: string): Promise<string[]> {
    const files: string[] = []

    try {
      const entries = await readdir(dirPath)

      for (const entry of entries) {
        const fullPath = join(dirPath, entry)
        const stats = await stat(fullPath)

        if (stats.isDirectory()) {
          // Recursively search subdirectories
          const subFiles = await this.discoverSeederFiles(fullPath)
          files.push(...subFiles)
        } else if (stats.isFile() && this.isSeederFile(fullPath)) {
          files.push(fullPath)
        }
      }
    } catch (error) {
      // Directory doesn't exist or is not accessible
      throw error
    }

    return files
  }

  /**
   * Check if a file is a valid seeder file
   *
   * @param filePath - File path to check
   * @returns True if the file is a seeder file
   */
  private isSeederFile(filePath: string): boolean {
    const ext = extname(filePath)
    const validExtensions = ['.ts', '.js', '.mts', '.mjs']

    // Must have a valid extension
    if (!validExtensions.includes(ext)) {
      return false
    }

    // Skip test files and other non-seeder files
    const fileName = basename(filePath).toLowerCase()
    const skipPatterns = ['.test.', '.spec.', '.d.ts']

    // Allow main seeder files (index.ts, main.ts)
    if (this.isMainSeederFile(filePath)) {
      return true
    }

    return !skipPatterns.some((pattern) => fileName.includes(pattern))
  }

  /**
   * Extract seeder name from file path
   *
   * @param filePath - File path
   * @returns Seeder name
   */
  private getSeederNameFromPath(filePath: string): string {
    const fileName = basename(filePath, extname(filePath))

    // Convert from snake_case or kebab-case to PascalCase
    return fileName
      .split(/[-_]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join('')
  }

  /**
   * Validate that a connection name exists in the configuration
   *
   * @param connectionName - Name of the connection to validate
   * @throws Error if connection is not found
   */
  private async validateConnection(connectionName: string): Promise<void> {
    const availableConnections = Object.keys(this.config.connections || {})

    if (!availableConnections.includes(connectionName)) {
      throw new Error(
        `Invalid connection "${connectionName}". Available connections: [${availableConnections.join(', ')}]`
      )
    }
  }

  /**
   * Verify that a connection is available and established
   *
   * @param connectionName - Name of the connection to verify
   * @throws Error if connection is not available
   */
  private async verifyConnectionAvailability(connectionName: string): Promise<void> {
    try {
      // Check if the connection exists in the database manager
      if (!this.client.hasConnection(connectionName)) {
        throw new Error(`Connection "${connectionName}" is not established`)
      }

      // Try to get the connection to ensure it's working
      const connection = this.client.connection(connectionName)

      // Perform a simple ping to verify the connection is alive
      await connection.db().admin().ping()
    } catch (error) {
      throw new Error(
        `Connection "${connectionName}" is not available: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Enhance error messages with connection context
   *
   * @param error - Original error
   * @param connectionName - Connection name being used
   * @returns Enhanced error with connection context
   */
  private enhanceConnectionError(error: unknown, connectionName: string): Error {
    const originalMessage = error instanceof Error ? error.message : String(error)

    // Check if error is connection-related
    if (
      originalMessage.toLowerCase().includes('connection') ||
      originalMessage.toLowerCase().includes('connect') ||
      originalMessage.toLowerCase().includes('network') ||
      originalMessage.toLowerCase().includes('timeout')
    ) {
      return new Error(`Connection error on "${connectionName}": ${originalMessage}`)
    }

    // For other errors, just add connection context
    return new Error(`Error on connection "${connectionName}": ${originalMessage}`)
  }

  /**
   * Get all available connection names
   *
   * @returns Array of connection names
   */
  getAvailableConnections(): string[] {
    return Object.keys(this.config.connections || {})
  }

  /**
   * Check if a connection name is valid
   *
   * @param connectionName - Connection name to check
   * @returns True if connection exists in configuration
   */
  isValidConnection(connectionName: string): boolean {
    return Object.keys(this.config.connections || {}).includes(connectionName)
  }

  /**
   * Get seeder configuration
   *
   * @returns Current seeder configuration
   */
  getConfig(): Required<SeederConfig> {
    return { ...this.seederConfig }
  }

  /**
   * Get ordered seeders based on execution order and dependencies
   *
   * @param files - Array of seeder file paths
   * @returns Array of ordered seeder file paths
   */
  private async getOrderedSeeders(files: string[]): Promise<string[]> {
    if (files.length === 0) {
      return []
    }

    // Load metadata for all seeders
    const seedersWithMetadata: SeederFileWithMetadata[] = []

    for (const filePath of files) {
      const metadata = await this.getSeederMetadata(filePath)
      const className = this.getSeederNameFromPath(filePath)

      seedersWithMetadata.push({
        filePath,
        className,
        metadata,
      })
    }

    // Resolve dependency order using topological sort
    return this.resolveDependencyOrder(seedersWithMetadata)
  }

  /**
   * Get metadata from a seeder class
   *
   * @param filePath - Path to the seeder file
   * @returns Seeder metadata
   */
  private async getSeederMetadata(filePath: string): Promise<SeederMetadata> {
    try {
      const SeederClass = await this.loadSeeder(filePath)
      const isMainSeeder = this.isMainSeederFile(filePath)

      return {
        order: (SeederClass as any).order ?? (isMainSeeder ? 0 : 999),
        dependencies: (SeederClass as any).dependencies ?? [],
        isMainSeeder,
      }
    } catch (error) {
      // Only catch loading errors (syntax, import errors, etc.)
      // Let validation errors bubble up
      if (this.isLoadingError(error)) {
        const isMainSeeder = this.isMainSeederFile(filePath)
        return {
          order: isMainSeeder ? 0 : 999,
          dependencies: [],
          isMainSeeder,
        }
      }

      // Re-throw validation errors
      throw error
    }
  }

  /**
   * Check if an error is a loading error (syntax, import, etc.) vs validation error
   *
   * @param error - The error to check
   * @returns True if this is a loading error that should be handled gracefully
   */
  private isLoadingError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false
    }

    const message = error.message.toLowerCase()

    // Common loading error patterns
    return (
      message.includes('syntax') ||
      message.includes('import') ||
      message.includes('module') ||
      message.includes('cannot find') ||
      message.includes('failed to load seeder') ||
      message.includes('no valid seeder class') ||
      message.includes('must extend baseseeder')
    )
  }

  /**
   * Check if a file is a main seeder (index.ts or main.ts)
   *
   * @param filePath - Path to the seeder file
   * @returns True if this is a main seeder file
   */
  private isMainSeederFile(filePath: string): boolean {
    const fileName = basename(filePath, extname(filePath)).toLowerCase()
    return fileName === 'index' || fileName === 'main'
  }

  /**
   * Resolve dependency order using topological sorting
   *
   * @param seeders - Array of seeders with metadata
   * @returns Array of ordered seeder file paths
   */
  private resolveDependencyOrder(seeders: SeederFileWithMetadata[]): string[] {
    // Create a map of class names to seeders for quick lookup
    const seederMap = new Map<string, SeederFileWithMetadata>()
    seeders.forEach((seeder) => {
      seederMap.set(seeder.className, seeder)
    })

    // Validate dependencies
    this.validateDependencies(seeders, seederMap)

    // Use global topological sort instead of order groups
    // This ensures dependencies are respected across all order levels
    return this.globalTopologicalSort(seeders, seederMap)
  }

  /**
   * Validate seeder dependencies
   *
   * @param seeders - Array of seeders with metadata
   * @param seederMap - Map of class names to seeders
   */
  private validateDependencies(
    seeders: SeederFileWithMetadata[],
    seederMap: Map<string, SeederFileWithMetadata>
  ): void {
    for (const seeder of seeders) {
      const dependencies = seeder.metadata.dependencies ?? []

      for (const dependency of dependencies) {
        if (!seederMap.has(dependency)) {
          throw new Error(
            `Seeder "${seeder.className}" depends on "${dependency}" which was not found`
          )
        }
      }
    }

    // Check for circular dependencies
    this.detectCircularDependencies(seeders, seederMap)
  }

  /**
   * Detect circular dependencies in seeders
   *
   * @param seeders - Array of seeders with metadata
   * @param seederMap - Map of class names to seeders
   */
  private detectCircularDependencies(
    seeders: SeederFileWithMetadata[],
    seederMap: Map<string, SeederFileWithMetadata>
  ): void {
    const visited = new Set<string>()
    const recursionStack = new Set<string>()

    const hasCycle = (className: string): boolean => {
      if (recursionStack.has(className)) {
        return true
      }
      if (visited.has(className)) {
        return false
      }

      visited.add(className)
      recursionStack.add(className)

      const seeder = seederMap.get(className)
      if (seeder) {
        const dependencies = seeder.metadata.dependencies ?? []
        for (const dependency of dependencies) {
          if (hasCycle(dependency)) {
            return true
          }
        }
      }

      recursionStack.delete(className)
      return false
    }

    for (const seeder of seeders) {
      if (hasCycle(seeder.className)) {
        throw new Error(`Circular dependency detected involving seeder "${seeder.className}"`)
      }
    }
  }

  /**
   * Perform global topological sort considering both order and dependencies
   *
   * @param seeders - Array of all seeders to sort
   * @param seederMap - Map of all seeders for dependency lookup
   * @returns Array of ordered seeder file paths
   */
  private globalTopologicalSort(
    seeders: SeederFileWithMetadata[],
    seederMap: Map<string, SeederFileWithMetadata>
  ): string[] {
    const result: string[] = []
    const visited = new Set<string>()
    const tempMark = new Set<string>()

    const visit = (className: string): void => {
      if (tempMark.has(className)) {
        throw new Error(`Circular dependency detected involving "${className}"`)
      }
      if (visited.has(className)) {
        return
      }

      const seeder = seederMap.get(className)
      if (!seeder) {
        return
      }

      tempMark.add(className)

      // Visit dependencies first
      const dependencies = seeder.metadata.dependencies ?? []
      for (const dependency of dependencies) {
        visit(dependency)
      }

      tempMark.delete(className)
      visited.add(className)
      result.push(seeder.filePath)
    }

    // Sort seeders by order first, then by name for consistent ordering
    const sortedSeeders = [...seeders].sort((a, b) => {
      const orderA = a.metadata.order ?? 999
      const orderB = b.metadata.order ?? 999

      if (orderA !== orderB) {
        return orderA - orderB
      }

      // If same order, sort by class name for consistency
      return a.className.localeCompare(b.className)
    })

    // Visit all seeders in sorted order
    for (const seeder of sortedSeeders) {
      visit(seeder.className)
    }

    return result
  }
}
